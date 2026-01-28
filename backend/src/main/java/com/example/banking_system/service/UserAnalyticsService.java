package com.example.banking_system.service;

import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.LoanRequest;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.LoanStatus;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.LoanRepo;
import com.example.banking_system.repository.TransactionRepository;
import com.example.banking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Service for generating user-specific financial analytics.
 * Provides spending patterns, loan analytics, and financial health indicators.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserAnalyticsService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final LoanRepo loanRepository;
    private final TransactionRepository transactionRepository;
    private final CachedDataService cachedDataService;

    /**
     * Cached user analytics snapshot
     * TTL should be controlled at cache-provider level (Redis/Caffeine)
     */
    public Map<String, Object> getUserAnalytics(String userEmail) {

        User user = cachedDataService.getUserByEmail(userEmail);

        Account account = accountRepository.findAccountByUser(user)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        String accNo = account.getAccountNumber();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime last30Days = now.minusDays(30);
        LocalDateTime last6Months = now.minusMonths(6);

        Map<String, Object> result = new LinkedHashMap<>();

        /* ---------------- ACCOUNT INFO ---------------- */
        result.put("accountInfo", Map.of(
                "accountNumber", accNo,
                "balance", account.getBalance(),
                "accountType", account.getAccountType(),
                "interestRate", account.getInterestRate(),
                "creditScore", user.getCreditScore() != null ? user.getCreditScore() : 700
        ));

        /* ---------------- SPENDING ---------------- */
        BigDecimal spent30 = transactionRepository.sumDebitsAfter(accNo, last30Days);
        BigDecimal spent6 = transactionRepository.sumDebitsAfter(accNo, last6Months);

        result.put("spending", Map.of(
                "last30Days", spent30,
                "last6Months", spent6,
                "averageMonthly", spent6.divide(BigDecimal.valueOf(6), 2, RoundingMode.HALF_UP),
                "transactionCount30Days",
                transactionRepository.countTransactionsAfter(accNo, last30Days)
        ));

        /* ---------------- INCOME ---------------- */
        BigDecimal income30 = transactionRepository.sumCreditsAfter(accNo, last30Days);
        BigDecimal income6 = transactionRepository.sumCreditsAfter(accNo, last6Months);

        result.put("income", Map.of(
                "last30Days", income30,
                "last6Months", income6,
                "averageMonthly", income6.divide(BigDecimal.valueOf(6), 2, RoundingMode.HALF_UP)
        ));

        /* ---------------- LOANS ---------------- */
        List<LoanRequest> activeLoans =
                loanRepository.findByUserAndStatusIn(
                        user, List.of(LoanStatus.APPROVED, LoanStatus.ACTIVE));

        BigDecimal totalDebt = activeLoans.stream()
                .map(LoanRequest::getRemainingPrincipal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalEmi = activeLoans.stream()
                .map(LoanRequest::getEmiAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        result.put("loans", Map.of(
                "activeLoans", activeLoans.size(),
                "totalOutstanding", totalDebt,
                "monthlyEmi", totalEmi
        ));

        /* ---------------- MONTHLY TRENDS (SINGLE QUERY) ---------------- */
        List<Object[]> monthlyRaw =
                transactionRepository.monthlySummary(accNo, last6Months);

        List<Map<String, Object>> trends = monthlyRaw.stream()
                .map(row -> Map.<String, Object>of(
                        "month", row[0],
                        "spending", row[1],
                        "income", row[2],
                        "netFlow", ((BigDecimal) row[2]).subtract((BigDecimal) row[1])
                ))
                .toList();

        result.put("monthlyTrends", trends);

        /* ---------------- FINANCIAL HEALTH (NO EXTRA QUERIES) ---------------- */
        int score = 0;

        if (user.getCreditScore() != null && user.getCreditScore() >= 750) score += 30;
        if (account.getBalance().compareTo(BigDecimal.valueOf(10000)) >= 0) score += 25;

        if (income30.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal dti = totalEmi
                    .divide(income30, 2, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            if (dti.compareTo(BigDecimal.valueOf(30)) <= 0) score += 25;
            else if (dti.compareTo(BigDecimal.valueOf(50)) <= 0) score += 15;
        }

        score += 20; // overdraft-safe default

        result.put("financialHealth", Map.of(
                "score", score,
                "status", score >= 80 ? "EXCELLENT" :
                        score >= 60 ? "GOOD" :
                                score >= 40 ? "FAIR" : "NEEDS_ATTENTION"
        ));

        result.put("generatedAt", now.toString());

        return result;
    }
}

