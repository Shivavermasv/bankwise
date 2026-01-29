package com.example.banking_system.repository;

import com.example.banking_system.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    @Query("""
                SELECT t FROM Transaction t
                LEFT JOIN FETCH t.sourceAccount sa
                LEFT JOIN FETCH t.destinationAccount da
                WHERE (sa.accountNumber = :accountNumber OR da.accountNumber = :accountNumber)
                AND t.timestamp BETWEEN :startDate AND :endDate
                ORDER BY t.timestamp DESC
            """)
    Page<Transaction> findByAccountAndDateRange(
            @Param("accountNumber") String accountNumber,
            @Param("startDate") LocalDateTime start,
            @Param("endDate") LocalDateTime end,
            Pageable pageable
    );

    @Query("""
                SELECT COALESCE(SUM(t.amount), 0)
                FROM Transaction t
                WHERE t.status = com.example.banking_system.enums.TransactionStatus.SUCCESS
            """)
    BigDecimal totalSuccessfulTransactionVolume();

    void deleteBySourceAccount_AccountNumber(String accountNumber);

    void deleteByDestinationAccount_AccountNumber(String accountNumber);

    @Query("""
                SELECT COALESCE(SUM(t.amount), 0)
                FROM Transaction t
                WHERE t.sourceAccount.accountNumber = :accountNumber
                AND t.type = com.example.banking_system.enums.TransactionType.TRANSFER
                AND t.status = com.example.banking_system.enums.TransactionStatus.SUCCESS
                AND t.timestamp BETWEEN :startDate AND :endDate
            """)
    BigDecimal sumDailyTransfers(
            @Param("accountNumber") String accountNumber,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("""
                SELECT COUNT(t)
                FROM Transaction t
                WHERE t.status = :status
            """)
    long countByStatus(
            @Param("status") com.example.banking_system.enums.TransactionStatus status
    );

    @Query("""
                SELECT t FROM Transaction t
                LEFT JOIN FETCH t.sourceAccount
                LEFT JOIN FETCH t.destinationAccount
                WHERE t.timestamp >= :since
                ORDER BY t.timestamp DESC
            """)
    Page<Transaction> findRecentTransactions(
            @Param("since") LocalDateTime since,
            Pageable pageable
    );

    @Query("""
                SELECT t FROM Transaction t
                WHERE t.sourceAccount.accountNumber = :accountNumber
                AND t.timestamp >= :since
                ORDER BY t.timestamp DESC
            """)
    List<Transaction> findByFromAccountAndTimestampAfter(
            @Param("accountNumber") String accountNumber,
            @Param("since") LocalDateTime since
    );

    @Query("""
                SELECT t FROM Transaction t
                WHERE t.destinationAccount.accountNumber = :accountNumber
                AND t.timestamp >= :since
                ORDER BY t.timestamp DESC
            """)
    List<Transaction> findByToAccountAndTimestampAfter(
            @Param("accountNumber") String accountNumber,
            @Param("since") LocalDateTime since
    );

    @Query("""
                SELECT t FROM Transaction t
                WHERE t.sourceAccount.accountNumber = :accountNumber
                AND t.timestamp BETWEEN :startDate AND :endDate
                ORDER BY t.timestamp DESC
            """)
    List<Transaction> findByFromAccountAndTimestampBetween(
            @Param("accountNumber") String accountNumber,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("""
                SELECT t FROM Transaction t
                WHERE t.destinationAccount.accountNumber = :accountNumber
                AND t.timestamp BETWEEN :startDate AND :endDate
                ORDER BY t.timestamp DESC
            """)
    List<Transaction> findByToAccountAndTimestampBetween(
            @Param("accountNumber") String accountNumber,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("""
                SELECT
                  FUNCTION('to_char', t.timestamp, 'YYYY-MM'),
                  SUM(CASE WHEN t.sourceAccount.accountNumber = :acc THEN t.amount ELSE 0 END),
                  SUM(CASE WHEN t.destinationAccount.accountNumber = :acc THEN t.amount ELSE 0 END)
                FROM Transaction t
                WHERE t.timestamp >= :from
                GROUP BY FUNCTION('to_char', t.timestamp, 'YYYY-MM')
                ORDER BY FUNCTION('to_char', t.timestamp, 'YYYY-MM')
            """)
    List<Object[]> monthlySummary(
            @Param("acc") String acc,
            @Param("from") LocalDateTime from
    );

    @Query("""
                SELECT COALESCE(SUM(t.amount), 0)
                FROM Transaction t
                WHERE t.sourceAccount.accountNumber = :acc
                AND t.timestamp >= :from
                AND t.status = com.example.banking_system.enums.TransactionStatus.SUCCESS
            """)
    BigDecimal sumDebitsAfter(
            @Param("acc") String acc,
            @Param("from") LocalDateTime from
    );

    @Query("""
                SELECT COALESCE(SUM(t.amount), 0)
                FROM Transaction t
                WHERE t.destinationAccount.accountNumber = :acc
                AND t.timestamp >= :from
                AND t.status = com.example.banking_system.enums.TransactionStatus.SUCCESS
            """)
    BigDecimal sumCreditsAfter(
            @Param("acc") String acc,
            @Param("from") LocalDateTime from
    );

    @Query("""
                SELECT COUNT(t)
                FROM Transaction t
                WHERE (
                    t.sourceAccount.accountNumber = :acc
                    OR t.destinationAccount.accountNumber = :acc
                )
                AND t.timestamp >= :from
            """)
    long countTransactionsAfter(
            @Param("acc") String acc,
            @Param("from") LocalDateTime from
    );
}





