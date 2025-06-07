package com.example.banking_system.service;

import com.example.banking_system.model.Client;
import com.example.banking_system.model.TransactionHistory;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.ClientRepository;
import com.example.banking_system.repository.TransactionHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class TransactionHistoryService {
    @Autowired
    private ClientRepository clientRepository;
    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private final TransactionHistoryRepository transactionHistoryRepository;

    public TransactionHistoryService(TransactionHistoryRepository transactionHistoryRepository) {
        this.transactionHistoryRepository = transactionHistoryRepository;
    }

    public List<TransactionHistory> getTransactionHistoryByAccountId() {
        return transactionHistoryRepository.findByAccountId(getLoggedInUser().getAccount().getId());
    }
    public Client getLoggedInUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        System.out.println(authentication.getPrincipal() + " " + authentication.getPrincipal().getClass());
        if (authentication.getPrincipal() != null) {
            return clientRepository.findByNameContaining((String) authentication.getPrincipal()).get();
        }
        return null;
    }
}

