package com.example.banking_system.controller;

import com.example.banking_system.service.AdminDashboardService;
import com.example.banking_system.service.CacheEvictionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin-dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;
    private final CacheEvictionService cacheEvictionService;

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        return ResponseEntity.ok(adminDashboardService.getAnalytics());
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @GetMapping("/analytics/realtime")
    public ResponseEntity<Map<String, Object>> getRealtimeAnalytics() {
        return ResponseEntity.ok(adminDashboardService.getRealtimeSnapshot());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/cache/clear")
    public ResponseEntity<Map<String, String>> clearAllCaches() {
        cacheEvictionService.clearAllBankwiseCaches();
        return ResponseEntity.ok(Map.of("message", "All caches cleared successfully"));
    }
}




