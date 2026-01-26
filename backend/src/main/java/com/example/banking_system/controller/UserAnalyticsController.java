package com.example.banking_system.controller;

import com.example.banking_system.service.UserAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('USER', 'CUSTOMER')")
public class UserAnalyticsController {

    private final UserAnalyticsService userAnalyticsService;

    /**
     * Get comprehensive user analytics including spending, income, loans, and financial health.
     */
    @GetMapping
    public ResponseEntity<?> getUserAnalytics(Authentication auth) {
        try {
            String email = auth.getName();
            Map<String, Object> analytics = userAnalyticsService.getUserAnalytics(email);
            return ResponseEntity.ok(analytics);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get spending analytics only.
     */
    @GetMapping("/spending")
    public ResponseEntity<?> getSpendingAnalytics(Authentication auth) {
        try {
            String email = auth.getName();
            Map<String, Object> analytics = userAnalyticsService.getUserAnalytics(email);
            return ResponseEntity.ok(Map.of("spending", analytics.get("spending")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get income analytics only.
     */
    @GetMapping("/income")
    public ResponseEntity<?> getIncomeAnalytics(Authentication auth) {
        try {
            String email = auth.getName();
            Map<String, Object> analytics = userAnalyticsService.getUserAnalytics(email);
            return ResponseEntity.ok(Map.of("income", analytics.get("income")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get loan analytics only.
     */
    @GetMapping("/loans")
    public ResponseEntity<?> getLoanAnalytics(Authentication auth) {
        try {
            String email = auth.getName();
            Map<String, Object> analytics = userAnalyticsService.getUserAnalytics(email);
            return ResponseEntity.ok(Map.of("loans", analytics.get("loans")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get financial health score and insights.
     */
    @GetMapping("/health")
    public ResponseEntity<?> getFinancialHealth(Authentication auth) {
        try {
            String email = auth.getName();
            Map<String, Object> analytics = userAnalyticsService.getUserAnalytics(email);
            return ResponseEntity.ok(Map.of("financialHealth", analytics.get("financialHealth")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get monthly trends for charts.
     */
    @GetMapping("/trends")
    public ResponseEntity<?> getMonthlyTrends(Authentication auth) {
        try {
            String email = auth.getName();
            Map<String, Object> analytics = userAnalyticsService.getUserAnalytics(email);
            return ResponseEntity.ok(Map.of("monthlyTrends", analytics.get("monthlyTrends")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get upcoming financial obligations (EMIs, scheduled payments).
     */
    @GetMapping("/upcoming")
    public ResponseEntity<?> getUpcomingObligations(Authentication auth) {
        try {
            String email = auth.getName();
            Map<String, Object> analytics = userAnalyticsService.getUserAnalytics(email);
            return ResponseEntity.ok(Map.of("upcomingObligations", analytics.get("upcomingObligations")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get account summary information.
     */
    @GetMapping("/account-summary")
    public ResponseEntity<?> getAccountSummary(Authentication auth) {
        try {
            String email = auth.getName();
            Map<String, Object> analytics = userAnalyticsService.getUserAnalytics(email);
            return ResponseEntity.ok(Map.of("account", analytics.get("account")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get dashboard summary with key metrics.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboardSummary(Authentication auth) {
        try {
            String email = auth.getName();
            Map<String, Object> fullAnalytics = userAnalyticsService.getUserAnalytics(email);
            
            // Extract key metrics for dashboard
            @SuppressWarnings("unchecked")
            Map<String, Object> account = (Map<String, Object>) fullAnalytics.get("account");
            @SuppressWarnings("unchecked")
            Map<String, Object> spending = (Map<String, Object>) fullAnalytics.get("spending");
            @SuppressWarnings("unchecked")
            Map<String, Object> income = (Map<String, Object>) fullAnalytics.get("income");
            @SuppressWarnings("unchecked")
            Map<String, Object> loans = (Map<String, Object>) fullAnalytics.get("loans");
            @SuppressWarnings("unchecked")
            Map<String, Object> health = (Map<String, Object>) fullAnalytics.get("financialHealth");
            
            java.util.Map<String, Object> dashboard = new java.util.HashMap<>();
            dashboard.put("balance", account != null ? account.get("balance") : 0);
            dashboard.put("creditScore", account != null ? account.get("creditScore") : 0);
            dashboard.put("healthScore", health != null ? health.get("score") : 0);
            dashboard.put("healthCategory", health != null ? health.get("category") : "UNKNOWN");
            dashboard.put("monthlySpending", spending != null ? spending.get("thirtyDayTotal") : 0);
            dashboard.put("monthlyIncome", income != null ? income.get("thirtyDayTotal") : 0);
            dashboard.put("totalDebt", loans != null ? loans.get("totalOutstanding") : 0);
            dashboard.put("upcomingEmi", loans != null ? loans.get("nextEmiAmount") : 0);
            dashboard.put("insights", health != null ? health.get("recommendations") : new java.util.ArrayList<>());
            
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get debts summary (total debts, outstanding loans).
     */
    @GetMapping("/debts")
    public ResponseEntity<?> getDebtsSummary(Authentication auth) {
        try {
            String email = auth.getName();
            Map<String, Object> analytics = userAnalyticsService.getUserAnalytics(email);
            @SuppressWarnings("unchecked")
            Map<String, Object> loans = (Map<String, Object>) analytics.get("loans");
            
            java.util.Map<String, Object> debts = new java.util.HashMap<>();
            debts.put("totalOutstanding", loans != null ? loans.get("totalOutstanding") : 0);
            debts.put("activeLoans", loans != null ? loans.get("activeLoans") : 0);
            debts.put("monthlyEmiTotal", loans != null ? loans.get("monthlyEmiTotal") : 0);
            debts.put("overdueAmount", loans != null ? loans.getOrDefault("overdueAmount", 0) : 0);
            
            return ResponseEntity.ok(debts);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
