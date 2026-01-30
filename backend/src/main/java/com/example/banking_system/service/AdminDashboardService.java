package com.example.banking_system.service;

import com.example.banking_system.enums.DepositStatus;
import com.example.banking_system.enums.LoanStatus;
import com.example.banking_system.enums.Role;
import com.example.banking_system.enums.VerificationStatus;
import com.example.banking_system.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {
    private final UserRepository userRepository;
    private final LoanRepo loanRepo;
    private final AccountRepository accountRepository;
    private final DepositRepository depositRepository;
    private final TransactionRepository transactionRepository;

    @Cacheable(value = "adminDashboard")
    public Map<String, Object> getAnalytics() {
        Map<String, Object> analytics = new HashMap<>();
        analytics.put("totalUsers", userRepository.count());
        
        // Count users with role USER or CUSTOMER (bank account holders)
        long userRoleCount = userRepository.countByRole(Role.USER);
        long customerRoleCount = userRepository.countByRole(Role.CUSTOMER);
        analytics.put("activeUsers", userRoleCount + customerRoleCount);
        
        // Total accounts should be the actual account count, not user count
        analytics.put("totalAccounts", accountRepository.count());
        analytics.put("verifiedAccounts", accountRepository.countByVerificationStatus(VerificationStatus.VERIFIED));
        analytics.put("pendingAccounts", accountRepository.countByVerificationStatus(VerificationStatus.PENDING));
        analytics.put("suspendedAccounts", accountRepository.countByVerificationStatus(VerificationStatus.SUSPENDED));

        analytics.put("totalLoans", loanRepo.count());
        analytics.put("activeLoans", loanRepo.countByStatus(LoanStatus.APPROVED));
        analytics.put("pendingLoans", loanRepo.countByStatus(LoanStatus.PENDING));
        analytics.put("rejectedLoans", loanRepo.countByStatus(LoanStatus.REJECTED));

        analytics.put("totalDepositRequests", depositRepository.count());
        analytics.put("pendingDeposits", depositRepository.countByStatus(DepositStatus.PENDING));
        analytics.put("approvedDeposits", depositRepository.countByStatus(DepositStatus.DEPOSITED));
        analytics.put("rejectedDeposits", depositRepository.countByStatus(DepositStatus.REJECTED));
        analytics.put("totalApprovedDepositAmount", depositRepository.totalApprovedDepositAmount());

        BigDecimal totalTxVolume = transactionRepository.totalSuccessfulTransactionVolume();
        analytics.put("totalSuccessfulTransactionVolume", totalTxVolume);
        analytics.put("generatedAt", Instant.now().toString());
        return analytics;
    }

    public Map<String, Object> getRealtimeSnapshot() {
        return getAnalytics();
    }
}




