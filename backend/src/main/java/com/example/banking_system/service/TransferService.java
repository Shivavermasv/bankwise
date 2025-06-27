package com.example.banking_system.service;

import com.example.banking_system.entity.User;
import com.example.banking_system.entity.TransactionHistory;
import com.example.banking_system.repository.UserRepository;
import com.example.banking_system.repository.TransactionHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import com.example.banking_system.exception.InsufficientFundsException;
import com.example.banking_system.entity.Account;
import com.example.banking_system.repository.AccountRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class TransferService {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionHistoryRepository transactionHistoryRepository;

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public void transferMoney(User to, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }

        User userDetails = getLoggedInUser();
        Account fromAccount = null;
        Account toAccount = null;

        if (fromAccount.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException("Insufficient balance");
        }

        // Deduct from sender's account
        fromAccount.setBalance(fromAccount.getBalance().subtract(amount));

        // Add to receiver's account
        toAccount.setBalance(toAccount.getBalance().add(amount));

        // Save the updated account balances
        accountRepository.save(fromAccount);
        accountRepository.save(toAccount);

        // Create and save TransactionHistory for sender
        TransactionHistory fromTransaction = new TransactionHistory();
        fromTransaction.setAccount(fromAccount); // Ensure the correct account is set
        fromTransaction.setAmount(amount.negate()); // Negative amount for debit
        fromTransaction.setTransactionType("debit");
        fromTransaction.setTransactionDate(LocalDateTime.now());
        fromTransaction.setDescription("Transfer to account " + toAccount.getId());
        transactionHistoryRepository.save(fromTransaction);

        // Create and save TransactionHistory for receiver
        TransactionHistory toTransaction = new TransactionHistory();
        toTransaction.setAccount(toAccount); // Ensure the correct account is set
        toTransaction.setAmount(amount); // Positive amount for credit
        toTransaction.setTransactionType("credit");
        toTransaction.setTransactionDate(LocalDateTime.now());
        toTransaction.setDescription("Transfer from account " + fromAccount.getId());
        transactionHistoryRepository.save(toTransaction);
    }


    public User getLoggedInUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        System.out.println(authentication.getPrincipal() + " " + authentication.getPrincipal().getClass());
        if (authentication.getPrincipal() != null) {
            return userRepository.findByNameContaining((String) authentication.getPrincipal()).get();
        }
        return null;
    }

}
