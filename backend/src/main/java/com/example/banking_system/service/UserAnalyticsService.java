package com.example.banking_system.service;

import com.example.banking_system.entity.*;
import com.example.banking_system.enums.LoanStatus;
import com.example.banking_system.enums.TransactionType;
import com.example.banking_system.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for generating user-specific financial analytics.
 * Provides spending patterns, loan analytics, and financial health indicators.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class UserAnalyticsService {

    private final TransactionRepository transactionRepository;
    private final LoanRepo loanRepository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    /**
     * Get comprehensive user analytics
     */
    public Map<String, Object> getUserAnalytics(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Account account = accountRepository.findAccountByUser(user)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        Map<String, Object> analytics = new LinkedHashMap<>();

        // Basic account info
        analytics.put("accountInfo", getAccountInfo(account, user));

        // Spending analytics (last 30 days and 6 months)
        analytics.put("spending", getSpendingAnalytics(account));

        // Income analytics
        analytics.put("income", getIncomeAnalytics(account));

        // Loan analytics
        analytics.put("loans", getLoanAnalytics(user));

        // Monthly trends (last 6 months)
        analytics.put("monthlyTrends", getMonthlyTrends(account));

        // Financial health score
        analytics.put("financialHealth", calculateFinancialHealth(account, user));

        // Upcoming obligations
        analytics.put("upcomingObligations", getUpcomingObligations(user));

        return analytics;
    }

    /**
     * Get account summary info
     */
    private Map<String, Object> getAccountInfo(Account account, User user) {
        return Map.of(
            "accountNumber", account.getAccountNumber(),
            "balance", account.getBalance(),
            "availableBalance", account.getAvailableBalance(),
            "accountType", account.getAccountType(),
            "creditScore", user.getCreditScore() != null ? user.getCreditScore() : 700,
            "overdraftEnabled", account.getOverdraftEnabled() != null && account.getOverdraftEnabled(),
            "overdraftUsed", account.getOverdraftUsed() != null ? account.getOverdraftUsed() : BigDecimal.ZERO,
            "interestRate", account.getInterestRate()
        );
    }

    /**
     * Get spending analytics
     */
    private Map<String, Object> getSpendingAnalytics(Account account) {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        LocalDateTime sixMonthsAgo = LocalDateTime.now().minusMonths(6);

        // Get outgoing transactions (debits)
        List<Transaction> last30DaysDebits = transactionRepository.findByFromAccountAndTimestampAfter(
                account.getAccountNumber(), thirtyDaysAgo);
        List<Transaction> last6MonthsDebits = transactionRepository.findByFromAccountAndTimestampAfter(
                account.getAccountNumber(), sixMonthsAgo);

        BigDecimal totalSpent30Days = last30DaysDebits.stream()
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSpent6Months = last6MonthsDebits.stream()
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal avgMonthlySpending = last6MonthsDebits.isEmpty() ? BigDecimal.ZERO :
                totalSpent6Months.divide(BigDecimal.valueOf(6), 2, RoundingMode.HALF_UP);

        // Category breakdown (based on description keywords)
        Map<String, BigDecimal> categoryBreakdown = categorizeTransactions(last30DaysDebits);

        // Daily spending for last 30 days
        Map<String, BigDecimal> dailySpending = last30DaysDebits.stream()
                .collect(Collectors.groupingBy(
                    t -> t.getTimestamp().toLocalDate().toString(),
                    Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)
                ));

        return Map.of(
            "last30Days", totalSpent30Days,
            "last6Months", totalSpent6Months,
            "averageMonthly", avgMonthlySpending,
            "transactionCount30Days", last30DaysDebits.size(),
            "categoryBreakdown", categoryBreakdown,
            "dailySpending", dailySpending,
            "largestTransaction", last30DaysDebits.stream()
                    .max(Comparator.comparing(Transaction::getAmount))
                    .map(Transaction::getAmount)
                    .orElse(BigDecimal.ZERO)
        );
    }

    /**
     * Get income analytics
     */
    private Map<String, Object> getIncomeAnalytics(Account account) {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        LocalDateTime sixMonthsAgo = LocalDateTime.now().minusMonths(6);

        // Get incoming transactions (credits)
        List<Transaction> last30DaysCredits = transactionRepository.findByToAccountAndTimestampAfter(
                account.getAccountNumber(), thirtyDaysAgo);
        List<Transaction> last6MonthsCredits = transactionRepository.findByToAccountAndTimestampAfter(
                account.getAccountNumber(), sixMonthsAgo);

        BigDecimal totalIncome30Days = last30DaysCredits.stream()
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalIncome6Months = last6MonthsCredits.stream()
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal avgMonthlyIncome = last6MonthsCredits.isEmpty() ? BigDecimal.ZERO :
                totalIncome6Months.divide(BigDecimal.valueOf(6), 2, RoundingMode.HALF_UP);

        return Map.of(
            "last30Days", totalIncome30Days,
            "last6Months", totalIncome6Months,
            "averageMonthly", avgMonthlyIncome,
            "transactionCount30Days", last30DaysCredits.size()
        );
    }

    /**
     * Get loan analytics
     */
    private Map<String, Object> getLoanAnalytics(User user) {
        List<LoanRequest> allLoans = loanRepository.findByUser(user);
        List<LoanRequest> activeLoans = allLoans.stream()
                .filter(l -> l.getStatus() == LoanStatus.APPROVED || l.getStatus() == LoanStatus.ACTIVE)
                .toList();

        // Calculate total debt from remaining principal
        BigDecimal totalDebt = activeLoans.stream()
                .map(LoanRequest::getRemainingPrincipal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calculate total monthly EMI obligation
        BigDecimal totalEmiDue = activeLoans.stream()
                .map(LoanRequest::getEmiAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calculate total repaid (EMIs paid * EMI amount)
        BigDecimal totalRepaid = allLoans.stream()
                .filter(l -> l.getEmiAmount() != null)
                .map(l -> l.getEmiAmount().multiply(BigDecimal.valueOf(l.getEmisPaid())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calculate approximate interest paid
        BigDecimal totalInterestPaid = allLoans.stream()
                .filter(l -> l.getAmount() != null && l.getRemainingPrincipal() != null && l.getEmiAmount() != null)
                .map(l -> {
                    BigDecimal principalPaid = l.getAmount().subtract(
                        l.getRemainingPrincipal() != null ? l.getRemainingPrincipal() : l.getAmount());
                    BigDecimal totalPaid = l.getEmiAmount().multiply(BigDecimal.valueOf(l.getEmisPaid()));
                    return totalPaid.subtract(principalPaid).max(BigDecimal.ZERO);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Upcoming EMIs
        List<Map<String, Object>> upcomingEmis = activeLoans.stream()
                .filter(l -> l.getNextEmiDate() != null && l.getEmiAmount() != null)
                .map(l -> Map.<String, Object>of(
                    "loanId", l.getId(),
                    "amount", l.getEmiAmount(),
                    "dueDate", l.getNextEmiDate().toString(),
                    "daysUntilDue", ChronoUnit.DAYS.between(LocalDate.now(), l.getNextEmiDate())
                ))
                .sorted(Comparator.comparing(m -> (Long) m.get("daysUntilDue")))
                .toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalLoans", allLoans.size());
        result.put("activeLoans", activeLoans.size());
        result.put("totalOutstanding", totalDebt);
        result.put("monthlyEmiObligation", totalEmiDue);
        result.put("totalRepaid", totalRepaid);
        result.put("totalInterestPaid", totalInterestPaid);
        result.put("upcomingEmis", upcomingEmis);
        result.put("nextEmiAmount", upcomingEmis.isEmpty() ? BigDecimal.ZERO : upcomingEmis.get(0).get("amount"));
        result.put("loansCompleted", allLoans.stream().filter(l -> l.getStatus() == LoanStatus.CLOSED || l.getStatus() == LoanStatus.FULLY_PAID).count());
        return result;
    }

    /**
     * Get monthly trends for last 6 months
     */
    private List<Map<String, Object>> getMonthlyTrends(Account account) {
        List<Map<String, Object>> trends = new ArrayList<>();

        for (int i = 5; i >= 0; i--) {
            LocalDateTime monthStart = LocalDateTime.now().minusMonths(i).withDayOfMonth(1).withHour(0).withMinute(0);
            LocalDateTime monthEnd = monthStart.plusMonths(1);

            List<Transaction> monthDebits = transactionRepository.findByFromAccountAndTimestampBetween(
                    account.getAccountNumber(), monthStart, monthEnd);
            List<Transaction> monthCredits = transactionRepository.findByToAccountAndTimestampBetween(
                    account.getAccountNumber(), monthStart, monthEnd);

            BigDecimal spent = monthDebits.stream()
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal received = monthCredits.stream()
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            trends.add(Map.of(
                "month", monthStart.getMonth().toString().substring(0, 3) + " " + monthStart.getYear(),
                "spending", spent,
                "income", received,
                "netFlow", received.subtract(spent),
                "transactionCount", monthDebits.size() + monthCredits.size()
            ));
        }

        return trends;
    }

    /**
     * Calculate financial health score (0-100)
     */
    private Map<String, Object> calculateFinancialHealth(Account account, User user) {
        int score = 0;
        List<String> insights = new ArrayList<>();
        List<String> recommendations = new ArrayList<>();

        // Credit score component (max 30 points)
        int creditScore = user.getCreditScore() != null ? user.getCreditScore() : 700;
        int creditComponent = (creditScore - 300) * 30 / 550; // 300-850 range to 0-30
        score += Math.max(0, Math.min(30, creditComponent));

        if (creditScore >= 750) {
            insights.add("Excellent credit score");
        } else if (creditScore < 650) {
            insights.add("Credit score needs improvement");
            recommendations.add("Pay EMIs on time to improve credit score");
        }

        // Balance component (max 25 points)
        BigDecimal balance = account.getBalance();
        BigDecimal minBalance = account.getMinimumBalance() != null ? account.getMinimumBalance() : BigDecimal.valueOf(1000);
        if (balance.compareTo(minBalance.multiply(BigDecimal.valueOf(10))) >= 0) {
            score += 25;
            insights.add("Healthy savings buffer");
        } else if (balance.compareTo(minBalance.multiply(BigDecimal.valueOf(3))) >= 0) {
            score += 15;
        } else if (balance.compareTo(minBalance) >= 0) {
            score += 5;
            recommendations.add("Build emergency fund of at least 3 months expenses");
        } else {
            insights.add("Balance below minimum requirement");
            recommendations.add("Increase savings to meet minimum balance");
        }

        // Debt-to-income ratio component (max 25 points)
        List<LoanRequest> activeLoans = loanRepository.findByUserAndStatusIn(user, 
                List.of(LoanStatus.APPROVED, LoanStatus.ACTIVE));
        BigDecimal monthlyEmi = activeLoans.stream()
                .map(LoanRequest::getEmiAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Estimate monthly income from credits
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        BigDecimal monthlyIncome = transactionRepository.findByToAccountAndTimestampAfter(
                        account.getAccountNumber(), thirtyDaysAgo).stream()
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (monthlyIncome.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal dtiRatio = monthlyEmi.divide(monthlyIncome, 2, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            if (dtiRatio.compareTo(BigDecimal.valueOf(30)) <= 0) {
                score += 25;
                insights.add("Low debt-to-income ratio");
            } else if (dtiRatio.compareTo(BigDecimal.valueOf(50)) <= 0) {
                score += 15;
            } else {
                score += 5;
                insights.add("High debt burden");
                recommendations.add("Consider debt consolidation or increasing income");
            }
        } else {
            score += 10; // Default if no income data
        }

        // Overdraft usage component (max 20 points)
        if (account.getOverdraftEnabled() != null && account.getOverdraftEnabled()) {
            BigDecimal overdraftUsed = account.getOverdraftUsed() != null ? account.getOverdraftUsed() : BigDecimal.ZERO;
            BigDecimal overdraftLimit = account.getOverdraftLimit() != null ? account.getOverdraftLimit() : BigDecimal.ONE;
            BigDecimal overdraftUtilization = overdraftUsed.divide(overdraftLimit, 2, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));

            if (overdraftUtilization.compareTo(BigDecimal.ZERO) == 0) {
                score += 20;
                insights.add("No overdraft usage");
            } else if (overdraftUtilization.compareTo(BigDecimal.valueOf(25)) <= 0) {
                score += 15;
            } else if (overdraftUtilization.compareTo(BigDecimal.valueOf(50)) <= 0) {
                score += 10;
                recommendations.add("Reduce overdraft dependency");
            } else {
                score += 5;
                insights.add("High overdraft utilization");
                recommendations.add("Prioritize paying off overdraft balance");
            }
        } else {
            score += 20; // Full points if overdraft not enabled
        }

        String healthStatus;
        if (score >= 80) healthStatus = "EXCELLENT";
        else if (score >= 60) healthStatus = "GOOD";
        else if (score >= 40) healthStatus = "FAIR";
        else healthStatus = "NEEDS_ATTENTION";

        return Map.of(
            "score", score,
            "status", healthStatus,
            "insights", insights,
            "recommendations", recommendations,
            "creditScore", creditScore,
            "lastUpdated", LocalDateTime.now().toString()
        );
    }

    /**
     * Get upcoming financial obligations
     */
    private Map<String, Object> getUpcomingObligations(User user) {
        List<LoanRequest> activeLoans = loanRepository.findByUserAndStatusIn(user, 
                List.of(LoanStatus.APPROVED, LoanStatus.ACTIVE));

        List<Map<String, Object>> upcomingPayments = new ArrayList<>();

        // Add loan EMIs
        for (LoanRequest loan : activeLoans) {
            if (loan.getNextEmiDate() != null && loan.getEmiAmount() != null) {
                long daysUntil = ChronoUnit.DAYS.between(LocalDate.now(), loan.getNextEmiDate());
                if (daysUntil >= 0 && daysUntil <= 30) {
                    upcomingPayments.add(Map.of(
                        "type", "LOAN_EMI",
                        "description", "Loan EMI - #" + loan.getId(),
                        "amount", loan.getEmiAmount(),
                        "dueDate", loan.getNextEmiDate().toString(),
                        "daysUntilDue", daysUntil,
                        "priority", daysUntil <= 7 ? "HIGH" : "MEDIUM"
                    ));
                }
            }
        }

        // Sort by due date
        upcomingPayments.sort(Comparator.comparing(m -> (Long) m.get("daysUntilDue")));

        BigDecimal totalDueNext7Days = upcomingPayments.stream()
                .filter(m -> (Long) m.get("daysUntilDue") <= 7)
                .map(m -> (BigDecimal) m.get("amount"))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalDueNext30Days = upcomingPayments.stream()
                .map(m -> (BigDecimal) m.get("amount"))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return Map.of(
            "payments", upcomingPayments,
            "totalDueNext7Days", totalDueNext7Days,
            "totalDueNext30Days", totalDueNext30Days,
            "count", upcomingPayments.size()
        );
    }

    /**
     * Categorize transactions based on transaction type
     */
    private Map<String, BigDecimal> categorizeTransactions(List<Transaction> transactions) {
        Map<String, BigDecimal> categories = new HashMap<>();
        
        for (Transaction t : transactions) {
            String category;
            TransactionType type = t.getType();
            
            if (type == TransactionType.LOAN_PAYMENT || type == TransactionType.LOAN_REPAYMENT) {
                category = "Loan Repayment";
            } else if (type == TransactionType.BILL_PAYMENT) {
                category = "Bills & Utilities";
            } else if (type == TransactionType.TRANSFER || type == TransactionType.SCHEDULED_PAYMENT) {
                category = "Transfers";
            } else if (type == TransactionType.WITHDRAW) {
                category = "Withdrawals";
            } else if (type == TransactionType.DEPOSIT) {
                category = "Deposits";
            } else {
                category = "Other";
            }
            
            categories.merge(category, t.getAmount(), BigDecimal::add);
        }
        
        return categories;
    }
}
