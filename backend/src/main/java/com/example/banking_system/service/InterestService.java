package com.example.banking_system.service;

import com.example.banking_system.model.TransactionHistory;
import com.example.banking_system.repository.TransactionHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import com.example.banking_system.model.Account;
import com.example.banking_system.repository.AccountRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class InterestService {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionHistoryRepository transactionHistoryRepository;

    @Transactional(isolation = Isolation.READ_COMMITTED) // Reduced isolation level
    @Scheduled(fixedRate = 600000) // Runs every 10 minutes
    public void applyInterest() {
        List<Account> accounts = accountRepository.findAll();
        for (Account account : accounts) {
            BigDecimal interest = BigDecimal.ZERO;
            BigDecimal balance = account.getBalance();

            switch (account.getInterestType()) {
                case 1:
                    if (balance.compareTo(BigDecimal.valueOf(5000)) > 0) {
                        interest = balance.multiply(BigDecimal.valueOf(0.08));
                    }
                    break;
                case 2:
                    if (balance.compareTo(BigDecimal.valueOf(30000)) > 0) {
                        interest = balance.multiply(BigDecimal.valueOf(0.12));
                    }
                    break;
                case 3:
                    if (balance.compareTo(BigDecimal.valueOf(20000)) > 0) {
                        interest = balance.multiply(BigDecimal.valueOf(0.12)).divide(BigDecimal.valueOf(3), BigDecimal.ROUND_HALF_UP);
                    }
                    break;
                default:
                    break;
            }

            if (interest.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal newBalance = balance.add(interest);
                BigDecimal maxBalance = balance.multiply(BigDecimal.valueOf(2.07));
                if (newBalance.compareTo(maxBalance) <= 0) {
                    account.setBalance(newBalance);
                } else {
                    account.setBalance(maxBalance);
                }
                accountRepository.save(account);

                TransactionHistory transaction = new TransactionHistory();
                transaction.setAccount(account);
                transaction.setAmount(interest);
                transaction.setTransactionType("credit");
                transaction.setTransactionDate(LocalDateTime.now());
                transaction.setDescription("Interest applied to account " + account.getId());
                transactionHistoryRepository.save(transaction);
            }
        }
    }
}
