package com.example.banking_system.service;

import com.example.banking_system.model.User;
import com.example.banking_system.model.TransactionHistory;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.UserRepository;
import com.example.banking_system.repository.TransactionHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class TransactionHistoryService {
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private AccountRepository accountRepository;





    public List<TransactionHistory> getTransactionHistoryByAccountId() {
        //return transactionHistoryRepository.findByAccountId(getLoggedInUser().getAccount().getId());
        return null;
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

