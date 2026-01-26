package com.example.banking_system.controller;

import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.ScheduledPayment;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.PaymentFrequency;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.UserRepository;
import com.example.banking_system.service.ScheduledPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/scheduled-payments")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('USER', 'CUSTOMER')")
public class ScheduledPaymentController {

    private final ScheduledPaymentService scheduledPaymentService;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;

    @GetMapping
    public ResponseEntity<List<ScheduledPayment>> getUserScheduledPayments(Authentication auth) {
        String email = auth.getName();
        return ResponseEntity.ok(scheduledPaymentService.getScheduledPayments(email));
    }

    @GetMapping("/active")
    public ResponseEntity<List<ScheduledPayment>> getActiveScheduledPayments(Authentication auth) {
        String email = auth.getName();
        return ResponseEntity.ok(scheduledPaymentService.getActivePayments(email));
    }

    @PostMapping("/transfer")
    public ResponseEntity<?> scheduleTransfer(
            Authentication auth,
            @RequestBody ScheduleTransferRequest request) {
        try {
            String email = auth.getName();
            Account fromAccount = getAccountForUser(request.fromAccountId(), email);
            
            ScheduledPayment payment = scheduledPaymentService.scheduleTransfer(
                email,
                fromAccount.getAccountNumber(),
                request.toAccountNumber(),
                request.beneficiaryName(),
                request.amount(),
                request.description(),
                request.frequency(),
                request.startDate(),
                request.endDate(),
                request.maxExecutions()
            );
            
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/bill")
    public ResponseEntity<?> scheduleBillPayment(
            Authentication auth,
            @RequestBody ScheduleBillRequest request) {
        try {
            String email = auth.getName();
            Account fromAccount = getAccountForUser(request.fromAccountId(), email);
            
            ScheduledPayment payment = scheduledPaymentService.scheduleBillPayment(
                email,
                fromAccount.getAccountNumber(),
                request.billerName(),
                request.billerCategory(),
                request.billerId(),
                request.consumerNumber(),
                request.amount(),
                request.frequency(),
                request.startDate(),
                request.endDate()
            );
            
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<?> pausePayment(
            Authentication auth,
            @PathVariable Long id) {
        try {
            String email = auth.getName();
            ScheduledPayment payment = scheduledPaymentService.pausePayment(email, id);
            return ResponseEntity.ok(Map.of(
                "message", "Scheduled payment paused",
                "payment", payment
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/resume")
    public ResponseEntity<?> resumePayment(
            Authentication auth,
            @PathVariable Long id) {
        try {
            String email = auth.getName();
            ScheduledPayment payment = scheduledPaymentService.resumePayment(email, id);
            return ResponseEntity.ok(Map.of(
                "message", "Scheduled payment resumed",
                "payment", payment
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelPayment(
            Authentication auth,
            @PathVariable Long id) {
        try {
            String email = auth.getName();
            scheduledPaymentService.cancelPayment(email, id);
            return ResponseEntity.ok(Map.of("message", "Scheduled payment cancelled"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/summary")
    public ResponseEntity<?> getUpcomingSummary(Authentication auth) {
        try {
            String email = auth.getName();
            Map<String, Object> summary = scheduledPaymentService.getUpcomingSummary(email);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private Account getAccountForUser(Long accountId, String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        Account account = accountRepository.findById(accountId)
            .orElseThrow(() -> new RuntimeException("Account not found"));
        
        if (!account.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied to this account");
        }
        
        return account;
    }

    public record ScheduleTransferRequest(
        Long fromAccountId,
        String toAccountNumber,
        String beneficiaryName,
        BigDecimal amount,
        PaymentFrequency frequency,
        LocalDate startDate,
        LocalDate endDate,
        String description,
        Integer maxExecutions
    ) {}

    public record ScheduleBillRequest(
        Long fromAccountId,
        String billerName,
        String billerCategory,
        String billerId,
        String consumerNumber,
        BigDecimal amount,
        PaymentFrequency frequency,
        LocalDate startDate,
        LocalDate endDate
    ) {}
}
