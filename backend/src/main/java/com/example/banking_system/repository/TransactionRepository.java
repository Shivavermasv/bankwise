package com.example.banking_system.repository;

import com.example.banking_system.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface TransactionRepository extends JpaRepository<Transaction,Long> {

    /**
     * Find transactions by account and date range with eager loading of related accounts.
     * Uses JOIN FETCH to avoid N+1 query issues.
     */
    @Query("SELECT t FROM Transaction t " +
           "LEFT JOIN FETCH t.sourceAccount sa " +
           "LEFT JOIN FETCH t.destinationAccount da " +
           "WHERE (sa.accountNumber = :accountNumber OR da.accountNumber = :accountNumber) " +
           "AND t.timestamp BETWEEN :startDate AND :endDate " +
           "ORDER BY t.timestamp DESC")
    Page<Transaction> findByAccountAndDateRange(
            @Param("accountNumber") String accountNumber,
            @Param("startDate") LocalDateTime start,
            @Param("endDate") LocalDateTime end,
            Pageable pageable
    );

    /**
     * Optimized aggregate query using database-level SUM.
     */
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.status = 'SUCCESS'")
    BigDecimal totalSuccessfulTransactionVolume();

    long deleteBySourceAccount_AccountNumber(String accountNumber);

    long deleteByDestinationAccount_AccountNumber(String accountNumber);

    /**
     * Optimized daily transfer sum query with indexed columns.
     */
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.sourceAccount.accountNumber = :accountNumber " +
           "AND t.type = com.example.banking_system.enums.TransactionType.TRANSFER " +
           "AND t.status = com.example.banking_system.enums.TransactionStatus.SUCCESS " +
           "AND t.timestamp BETWEEN :startDate AND :endDate")
    BigDecimal sumDailyTransfers(
        @Param("accountNumber") String accountNumber,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Count transactions by status for dashboard metrics.
     */
    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.status = :status")
    long countByStatus(@Param("status") com.example.banking_system.enums.TransactionStatus status);

    /**
     * Get recent transactions with eager loading for performance.
     */
    @Query("SELECT t FROM Transaction t " +
           "LEFT JOIN FETCH t.sourceAccount sa " +
           "LEFT JOIN FETCH t.destinationAccount da " +
           "WHERE t.timestamp >= :since " +
           "ORDER BY t.timestamp DESC")
    Page<Transaction> findRecentTransactions(
        @Param("since") LocalDateTime since,
        Pageable pageable
    );

    /**
     * Find outgoing transactions (debits) from an account after a date.
     */
    @Query("SELECT t FROM Transaction t WHERE t.sourceAccount.accountNumber = :accountNumber AND t.timestamp >= :since ORDER BY t.timestamp DESC")
    java.util.List<Transaction> findByFromAccountAndTimestampAfter(
        @Param("accountNumber") String accountNumber,
        @Param("since") LocalDateTime since
    );

    /**
     * Find incoming transactions (credits) to an account after a date.
     */
    @Query("SELECT t FROM Transaction t WHERE t.destinationAccount.accountNumber = :accountNumber AND t.timestamp >= :since ORDER BY t.timestamp DESC")
    java.util.List<Transaction> findByToAccountAndTimestampAfter(
        @Param("accountNumber") String accountNumber,
        @Param("since") LocalDateTime since
    );

    /**
     * Find outgoing transactions between dates.
     */
    @Query("SELECT t FROM Transaction t WHERE t.sourceAccount.accountNumber = :accountNumber AND t.timestamp BETWEEN :startDate AND :endDate ORDER BY t.timestamp DESC")
    java.util.List<Transaction> findByFromAccountAndTimestampBetween(
        @Param("accountNumber") String accountNumber,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Find incoming transactions between dates.
     */
    @Query("SELECT t FROM Transaction t WHERE t.destinationAccount.accountNumber = :accountNumber AND t.timestamp BETWEEN :startDate AND :endDate ORDER BY t.timestamp DESC")
    java.util.List<Transaction> findByToAccountAndTimestampBetween(
        @Param("accountNumber") String accountNumber,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
}




