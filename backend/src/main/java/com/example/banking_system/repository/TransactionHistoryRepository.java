package com.example.banking_system.repository;

import com.example.banking_system.model.TransactionHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TransactionHistoryRepository extends JpaRepository<TransactionHistory, String> {
    // Fetch transaction history by account ID
    List<TransactionHistory> findByAccountId(String accountId);

    @Override
    void deleteById(String s);
}

