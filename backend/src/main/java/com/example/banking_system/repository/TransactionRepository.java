package com.example.banking_system.repository;

import com.example.banking_system.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface TransactionRepository extends JpaRepository<Transaction,Long> {

    @Query("select t from Transaction t where (t.sourceAccount.accountNumber = :accountNumber) " +
            "and t.timestamp between :startDate and :endDate order by t.timestamp")
    Page<Transaction> findByAccountAndDateRange(
            @Param("accountNumber") String accountNumber,
            @Param("startDate") LocalDateTime start,
            @Param("endDate") LocalDateTime end,
            Pageable pageable
    );
}
