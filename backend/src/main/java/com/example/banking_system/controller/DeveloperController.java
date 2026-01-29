package com.example.banking_system.controller;

import com.example.banking_system.entity.SupportTicket;
import com.example.banking_system.repository.SupportTicketRepository;
import com.example.banking_system.service.OtpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Developer-only endpoints for system monitoring, logs, and ticket management.
 * Accessible with DEVELOPER role or valid dev password.
 */
@RestController
@RequestMapping("/api/developer")
@RequiredArgsConstructor
@Slf4j
public class DeveloperController {

    private final SupportTicketRepository ticketRepository;
    private final OtpService otpService;

    @Value("${LOGS_PATH:logs}/bankwise")
    private String logsPath;

    @Value("${bankwise.dev.password:}")
    private String devPassword;

    // ===== DEVELOPER LOGIN (PUBLIC ENDPOINT) =====

    /**
     * Login with developer password only - no email/password required
     */
    @PostMapping("/login")
    public ResponseEntity<?> developerLogin(@RequestBody Map<String, String> body) {
        String password = body.get("devPassword");
        
        log.info("=== Developer Login Attempt ===");
        log.info("Password received: {}", password != null ? "yes (length=" + password.length() + ")" : "null");
        log.info("Configured devPassword: {}", devPassword != null && !devPassword.isBlank() ? "yes (length=" + devPassword.length() + ")" : "NOT SET or blank");
        
        if (password == null || password.isBlank()) {
            log.warn("Login failed: no password provided");
            return ResponseEntity.badRequest().body(Map.of("error", "Developer password is required"));
        }
        
        if (devPassword == null || devPassword.isBlank()) {
            log.warn("Login failed: devPassword not configured on server");
            return ResponseEntity.status(503).body(Map.of("error", "Developer login is not configured"));
        }
        
        boolean matches = devPassword.equals(password);
        log.info("Password comparison result: {}", matches);
        
        if (!matches) {
            log.warn("Login failed: password mismatch");
            // Debug: show first 3 chars to help diagnose
            log.debug("Expected starts with: {}, Got starts with: {}", 
                devPassword.substring(0, Math.min(3, devPassword.length())),
                password.substring(0, Math.min(3, password.length())));
            return ResponseEntity.status(401).body(Map.of("error", "Invalid developer password"));
        }
        
        log.info("Developer login successful!");
        
        // Generate a developer token (no database lookup needed)
        String token = otpService.generateDeveloperToken();
        
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("username", "Developer");
        response.put("email", "developer@bankwise.internal");
        response.put("role", "DEVELOPER");
        response.put("message", "Developer login successful");
        
        return ResponseEntity.ok(response);
    }

    // ===== SUPPORT TICKET MANAGEMENT =====

    /**
     * Get all support tickets (for developer view)
     */
    @GetMapping("/tickets")
    public ResponseEntity<List<Map<String, Object>>> getAllTickets(
            @RequestParam(required = false) String status) {
        
        List<SupportTicket> tickets;
        if (status != null && !status.isEmpty()) {
            tickets = ticketRepository.findByStatusOrderByCreatedAtDesc(status);
        } else {
            tickets = ticketRepository.findAllByOrderByCreatedAtDesc();
        }
        
        List<Map<String, Object>> result = tickets.stream()
                .map(this::ticketToMap)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    /**
     * Get ticket by ID
     */
    @GetMapping("/tickets/{id}")
    public ResponseEntity<?> getTicket(@PathVariable Long id) {
        return ticketRepository.findById(id)
                .map(t -> ResponseEntity.ok(ticketToMap(t)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Update ticket status (resolve, close, reopen)
     */
    @PutMapping("/tickets/{id}/status")
    public ResponseEntity<?> updateTicketStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        
        String newStatus = body.get("status");
        String resolution = body.get("resolution");
        
        if (newStatus == null || newStatus.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Status is required"));
        }
        
        // Validate status
        List<String> validStatuses = List.of("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED");
        if (!validStatuses.contains(newStatus.toUpperCase())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid status. Must be: " + validStatuses));
        }
        
        return ticketRepository.findById(id)
                .map(ticket -> {
                    ticket.setStatus(newStatus.toUpperCase());
                    if (resolution != null && !resolution.isBlank()) {
                        // Append resolution to description
                        String existing = ticket.getDescription() != null ? ticket.getDescription() : "";
                        ticket.setDescription(existing + "\n\n--- Developer Resolution ---\n" + resolution);
                    }
                    ticketRepository.save(ticket);
                    log.info("Ticket {} status updated to {} by developer", id, newStatus);
                    return ResponseEntity.ok(Map.of(
                            "success", true,
                            "message", "Ticket status updated to " + newStatus,
                            "ticket", ticketToMap(ticket)
                    ));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Batch resolve tickets
     */
    @PostMapping("/tickets/batch-resolve")
    public ResponseEntity<?> batchResolveTickets(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Long> ids = (List<Long>) body.get("ids");
        String resolution = (String) body.get("resolution");
        
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No ticket IDs provided"));
        }
        
        int resolved = 0;
        for (Long id : ids) {
            Optional<SupportTicket> opt = ticketRepository.findById(id);
            if (opt.isPresent()) {
                SupportTicket ticket = opt.get();
                ticket.setStatus("RESOLVED");
                if (resolution != null && !resolution.isBlank()) {
                    String existing = ticket.getDescription() != null ? ticket.getDescription() : "";
                    ticket.setDescription(existing + "\n\n--- Developer Resolution ---\n" + resolution);
                }
                ticketRepository.save(ticket);
                resolved++;
            }
        }
        
        log.info("Batch resolved {} tickets", resolved);
        return ResponseEntity.ok(Map.of("resolved", resolved, "total", ids.size()));
    }

    // ===== LOGS ACCESS =====

    /**
     * Get list of available log files
     */
    @GetMapping("/logs")
    public ResponseEntity<?> listLogFiles() {
        try {
            Path logDir = Paths.get(logsPath);
            if (!Files.exists(logDir)) {
                return ResponseEntity.ok(Map.of(
                        "available", false,
                        "message", "Log directory not found: " + logsPath,
                        "files", List.of()
                ));
            }
            
            List<Map<String, Object>> files = new ArrayList<>();
            try (Stream<Path> stream = Files.list(logDir)) {
                stream.filter(p -> p.toString().endsWith(".log"))
                        .forEach(p -> {
                            try {
                                files.add(Map.of(
                                        "name", p.getFileName().toString(),
                                        "size", Files.size(p),
                                        "lastModified", Files.getLastModifiedTime(p).toString()
                                ));
                            } catch (IOException e) {
                                log.warn("Could not read file info: {}", p, e);
                            }
                        });
            }
            
            return ResponseEntity.ok(Map.of(
                    "available", true,
                    "path", logsPath,
                    "files", files
            ));
        } catch (IOException e) {
            log.error("Error listing log files", e);
            return ResponseEntity.ok(Map.of(
                    "available", false,
                    "error", e.getMessage(),
                    "files", List.of()
            ));
        }
    }

    /**
     * Read log file content (last N lines)
     */
    @GetMapping("/logs/{filename}")
    public ResponseEntity<?> readLogFile(
            @PathVariable String filename,
            @RequestParam(defaultValue = "500") int lines) {
        
        // Security: prevent path traversal
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid filename"));
        }
        
        Path logFile = Paths.get(logsPath, filename);
        if (!Files.exists(logFile)) {
            return ResponseEntity.notFound().build();
        }
        
        try {
            List<String> allLines = Files.readAllLines(logFile);
            int start = Math.max(0, allLines.size() - lines);
            List<String> lastLines = allLines.subList(start, allLines.size());
            
            return ResponseEntity.ok(Map.of(
                    "filename", filename,
                    "totalLines", allLines.size(),
                    "returnedLines", lastLines.size(),
                    "content", String.join("\n", lastLines)
            ));
        } catch (IOException e) {
            log.error("Error reading log file: {}", filename, e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== API ENDPOINTS INFO (for Swagger-like testing) =====

    /**
     * Get list of all available API endpoints with their methods and roles
     */
    @GetMapping("/api-endpoints")
    public ResponseEntity<?> getApiEndpoints() {
        // Return a comprehensive list of API endpoints for testing
        List<Map<String, Object>> endpoints = new ArrayList<>();
        
        // Auth endpoints
        endpoints.add(apiEndpoint("POST", "/api/login", "Login", List.of("PUBLIC"), 
                Map.of("username", "string", "password", "string", "devPassword", "string (optional)")));
        endpoints.add(apiEndpoint("POST", "/api/create", "Register User", List.of("PUBLIC"),
                Map.of("name", "string", "email", "string", "password", "string", "phone", "string")));
        endpoints.add(apiEndpoint("POST", "/api/verify-otp", "Verify OTP", List.of("PUBLIC"),
                Map.of("email", "string", "otp", "string")));
        
        // User endpoints
        endpoints.add(apiEndpoint("GET", "/api/user/details/{accountNumber}", "Get User Details", List.of("USER", "CUSTOMER"), null));
        endpoints.add(apiEndpoint("PUT", "/api/user/update-profile", "Update Profile", List.of("USER", "CUSTOMER", "ADMIN", "DEVELOPER"), 
                Map.of("name", "string", "phone", "string", "address", "string")));
        
        // Account endpoints
        endpoints.add(apiEndpoint("GET", "/api/account/{accountNumber}", "Get Account", List.of("USER", "CUSTOMER"), null));
        endpoints.add(apiEndpoint("POST", "/api/account/transfer", "Transfer Money", List.of("USER", "CUSTOMER"),
                Map.of("fromAccountNumber", "string", "toAccountNumber", "string", "amount", "number", "remarks", "string")));
        endpoints.add(apiEndpoint("POST", "/api/account/deposit/request", "Request Deposit", List.of("USER", "CUSTOMER"),
                Map.of("accountNumber", "string", "amount", "number", "referenceNumber", "string")));
        
        // Transaction endpoints
        endpoints.add(apiEndpoint("GET", "/api/transaction/{accountNumber}", "Get Transactions", List.of("USER", "CUSTOMER"), null));
        endpoints.add(apiEndpoint("GET", "/api/transaction/recent/{accountNumber}", "Get Recent Transactions", List.of("USER", "CUSTOMER"), null));
        
        // Loan endpoints
        endpoints.add(apiEndpoint("POST", "/api/loan/apply", "Apply for Loan", List.of("USER", "CUSTOMER"),
                Map.of("amount", "number", "tenure", "number", "purpose", "string")));
        endpoints.add(apiEndpoint("GET", "/api/loan/user", "Get User Loans", List.of("USER", "CUSTOMER"), null));
        endpoints.add(apiEndpoint("POST", "/api/loan/emi/pay", "Pay EMI", List.of("USER", "CUSTOMER"),
                Map.of("loanId", "number")));
        
        // Beneficiary endpoints
        endpoints.add(apiEndpoint("GET", "/api/beneficiaries", "Get Beneficiaries", List.of("USER", "CUSTOMER"), null));
        endpoints.add(apiEndpoint("POST", "/api/beneficiaries", "Add Beneficiary", List.of("USER", "CUSTOMER"),
                Map.of("accountNumber", "string", "nickname", "string")));
        
        // Card endpoints
        endpoints.add(apiEndpoint("GET", "/api/cards/user", "Get User Cards", List.of("USER", "CUSTOMER"), null));
        endpoints.add(apiEndpoint("POST", "/api/cards/issue", "Issue Card", List.of("USER", "CUSTOMER"),
                Map.of("accountId", "number", "cardType", "string")));
        
        // Scheduled Payment endpoints
        endpoints.add(apiEndpoint("GET", "/api/schedule-payments", "Get Scheduled Payments", List.of("USER", "CUSTOMER"), null));
        endpoints.add(apiEndpoint("POST", "/api/schedule-payments/transfer", "Schedule Payment", List.of("USER", "CUSTOMER"),
                Map.of("fromAccountId", "number", "toAccountNumber", "string", "amount", "number", "frequency", "string")));
        
        // Notification endpoints
        endpoints.add(apiEndpoint("GET", "/api/notifications/unseen", "Get Unseen Notifications", List.of("USER", "CUSTOMER", "ADMIN"), null));
        endpoints.add(apiEndpoint("POST", "/api/notifications/mark-seen", "Mark Notifications Seen", List.of("USER", "CUSTOMER", "ADMIN"), null));
        
        // Support endpoints
        endpoints.add(apiEndpoint("POST", "/api/support/tickets", "Create Ticket", List.of("USER", "CUSTOMER", "ADMIN"),
                Map.of("category", "string", "subject", "string", "description", "string", "priority", "string")));
        endpoints.add(apiEndpoint("GET", "/api/support/tickets/my", "Get My Tickets", List.of("USER", "CUSTOMER", "ADMIN"), null));
        
        // Admin endpoints
        endpoints.add(apiEndpoint("GET", "/api/admin-dashboard/data", "Get Dashboard Data", List.of("ADMIN"), null));
        endpoints.add(apiEndpoint("GET", "/api/account/admin/accounts", "Get All Accounts", List.of("ADMIN"), null));
        endpoints.add(apiEndpoint("PUT", "/api/account/updateAccountStatus/{accountNumber}", "Update Account Status", List.of("ADMIN"),
                Map.of("status", "string (VERIFIED|PENDING|SUSPENDED)")));
        endpoints.add(apiEndpoint("POST", "/api/loan/status", "Update Loan Status", List.of("ADMIN"),
                Map.of("loanId", "number", "status", "string", "adminRemark", "string")));
        endpoints.add(apiEndpoint("POST", "/api/account/deposit/approve", "Approve Deposit", List.of("ADMIN"),
                Map.of("requestId", "number")));
        endpoints.add(apiEndpoint("POST", "/api/account/deposit/reject", "Reject Deposit", List.of("ADMIN"),
                Map.of("requestId", "number", "reason", "string")));
        
        // Developer/System endpoints
        endpoints.add(apiEndpoint("GET", "/api/system/analytics", "Get System Analytics", List.of("DEVELOPER", "ADMIN"), null));
        endpoints.add(apiEndpoint("GET", "/api/system/health", "Health Check", List.of("PUBLIC"), null));
        endpoints.add(apiEndpoint("GET", "/api/developer/tickets", "Get All Tickets (Dev)", List.of("DEVELOPER"), null));
        endpoints.add(apiEndpoint("PUT", "/api/developer/tickets/{id}/status", "Update Ticket Status", List.of("DEVELOPER"),
                Map.of("status", "string", "resolution", "string")));
        endpoints.add(apiEndpoint("GET", "/api/developer/logs", "List Log Files", List.of("DEVELOPER"), null));
        endpoints.add(apiEndpoint("GET", "/api/developer/logs/{filename}", "Read Log File", List.of("DEVELOPER"), null));
        
        return ResponseEntity.ok(Map.of(
                "totalEndpoints", endpoints.size(),
                "generatedAt", LocalDateTime.now(),
                "endpoints", endpoints
        ));
    }

    private Map<String, Object> apiEndpoint(String method, String path, String description, 
                                            List<String> roles, Map<String, String> body) {
        Map<String, Object> ep = new LinkedHashMap<>();
        ep.put("method", method);
        ep.put("path", path);
        ep.put("description", description);
        ep.put("roles", roles);
        if (body != null) {
            ep.put("requestBody", body);
        }
        return ep;
    }

    private Map<String, Object> ticketToMap(SupportTicket ticket) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", ticket.getId());
        map.put("userEmail", ticket.getUserEmail());
        map.put("userName", ticket.getUserName());
        map.put("accountNumber", ticket.getAccountNumber());
        map.put("category", ticket.getCategory());
        map.put("subject", ticket.getSubject());
        map.put("description", ticket.getDescription());
        map.put("priority", ticket.getPriority());
        map.put("status", ticket.getStatus());
        map.put("createdAt", ticket.getCreatedAt());
        return map;
    }
}
