package com.example.banking_system.repository;

import com.example.banking_system.entity.TransactionHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionHistoryRepository extends JpaRepository<TransactionHistory, String> {
    // Fetch transaction history by account ID


    @Override
    void deleteById(String s);
}

