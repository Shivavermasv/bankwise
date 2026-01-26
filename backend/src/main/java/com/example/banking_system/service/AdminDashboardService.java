package com.example.banking_system.service;

import com.example.banking_system.enums.DepositStatus;
import com.example.banking_system.enums.LoanStatus;
import com.example.banking_system.enums.Role;
import com.example.banking_system.enums.VerificationStatus;
import com.example.banking_system.repository.*;
import lombok.RequiredArgsConstructor;
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

    public Map<String, Object> getAnalytics() {
        Map<String, Object> analytics = new HashMap<>();
        analytics.put("totalUsers", userRepository.count());
        analytics.put("activeUsers", userRepository.findByRole(Role.USER).size());
        analytics.put("totalAccounts", accountRepository.count());
        analytics.put("verifiedAccounts", accountRepository.countByVerificationStatus(VerificationStatus.VERIFIED));
        analytics.put("pendingAccounts", accountRepository.countByVerificationStatus(VerificationStatus.PENDING));
        analytics.put("suspendedAccounts", accountRepository.countByVerificationStatus(VerificationStatus.SUSPENDED));

        analytics.put("totalLoans", loanRepo.count());
        analytics.put("activeLoans", loanRepo.findByStatus(LoanStatus.APPROVED).size());
        analytics.put("pendingLoans", loanRepo.findByStatus(LoanStatus.PENDING).size());
        analytics.put("rejectedLoans", loanRepo.findByStatus(LoanStatus.REJECTED).size());

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




