package com.example.banking_system.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.example.banking_system.repository.*;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lightweight data change tracking for optimistic frontend refresh.
 * Frontend can poll this endpoint to check if data has changed before
 * making expensive API calls.
 */
@RestController
@RequestMapping("/api/data")
@RequiredArgsConstructor
public class DataVersionController {

    private final TransactionRepository transactionRepository;
    private final NotificationRepository notificationRepository;
    private final DepositRepository depositRepository;
    private final LoanRepo loanRepo;

    // In-memory version tracking - incremented when data changes
    private static final Map<String, Long> dataVersions = new ConcurrentHashMap<>();
    private static final Map<String, LocalDateTime> lastUpdated = new ConcurrentHashMap<>();

    static {
        // Initialize versions
        dataVersions.put("transactions", 0L);
        dataVersions.put("notifications", 0L);
        dataVersions.put("deposits", 0L);
        dataVersions.put("loans", 0L);
        dataVersions.put("accounts", 0L);
    }

    /**
     * Public method to increment version when data changes
     */
    public static void incrementVersion(String dataType) {
        dataVersions.merge(dataType, 1L, Long::sum);
        lastUpdated.put(dataType, LocalDateTime.now());
    }

    /**
     * Check what data has changed since given versions.
     * Frontend sends its current versions, backend returns which have changed.
     */
    @GetMapping("/versions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getDataVersions(
            @RequestParam(required = false) Long transactionsV,
            @RequestParam(required = false) Long notificationsV,
            @RequestParam(required = false) Long depositsV,
            @RequestParam(required = false) Long loansV,
            @RequestParam(required = false) Long accountsV) {
        
        Map<String, Object> response = new ConcurrentHashMap<>();
        
        // Current versions
        response.put("versions", Map.of(
            "transactions", dataVersions.getOrDefault("transactions", 0L),
            "notifications", dataVersions.getOrDefault("notifications", 0L),
            "deposits", dataVersions.getOrDefault("deposits", 0L),
            "loans", dataVersions.getOrDefault("loans", 0L),
            "accounts", dataVersions.getOrDefault("accounts", 0L)
        ));
        
        // What has changed
        Map<String, Boolean> changed = new ConcurrentHashMap<>();
        if (transactionsV != null) changed.put("transactions", !transactionsV.equals(dataVersions.get("transactions")));
        if (notificationsV != null) changed.put("notifications", !notificationsV.equals(dataVersions.get("notifications")));
        if (depositsV != null) changed.put("deposits", !depositsV.equals(dataVersions.get("deposits")));
        if (loansV != null) changed.put("loans", !loansV.equals(dataVersions.get("loans")));
        if (accountsV != null) changed.put("accounts", !accountsV.equals(dataVersions.get("accounts")));
        
        response.put("changed", changed);
        response.put("hasChanges", changed.values().stream().anyMatch(v -> v));
        
        return ResponseEntity.ok(response);
    }

    /**
     * Lightweight counts-only endpoint for dashboard refresh
     */
    @GetMapping("/summary")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getDataSummary() {
        return ResponseEntity.ok(Map.of(
            "transactionCount", transactionRepository.count(),
            "unreadNotifications", notificationRepository.countBySeenFalse(),
            "pendingDeposits", depositRepository.countByStatus(com.example.banking_system.enums.DepositStatus.PENDING),
            "pendingLoans", loanRepo.countByStatus(com.example.banking_system.enums.LoanStatus.PENDING),
            "timestamp", System.currentTimeMillis()
        ));
    }
}
