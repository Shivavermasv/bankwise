package com.example.banking_system.repository;

import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long>, JpaSpecificationExecutor<Account> {

    Account findById(long id);
    // Find an account by its balance
    Optional<Account> findByBalance(BigDecimal balance);

    Optional<Account> findByAccountNumber(String accountNumber);
    
    /**
     * Find account with user eagerly fetched (for authorization checks).
     */
    @Query("SELECT a FROM Account a LEFT JOIN FETCH a.user WHERE a.accountNumber = :accountNumber")
    Optional<Account> findByAccountNumberWithUser(@Param("accountNumber") String accountNumber);
    
    /**
     * Find account by account number with pessimistic write lock for transfers.
     * This prevents concurrent modifications during balance updates.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Account a WHERE a.accountNumber = :accountNumber")
    Optional<Account> findByAccountNumberForUpdate(@Param("accountNumber") String accountNumber);
    
    Optional<Account> findAccountByUser(User user);
    // Find accounts with a balance greater than or equal to a specified amount
    List<Account> findByBalanceGreaterThanEqual(BigDecimal balance);

    // Find accounts with a balance less than or equal to a specified amount
    List<Account> findByBalanceLessThanEqual(BigDecimal balance);

    // Custom query to find an account by a part of its balance or initial balance
    @Query("SELECT a FROM Account a WHERE a.balance >= :minBalance AND a.balance <= :maxBalance")
    List<Account> findAccountsByBalanceRange(
        @Param("minBalance") BigDecimal minBalance,
        @Param("maxBalance") BigDecimal maxBalance
    );
    
    // Custom query to check if a balance is less than the minimum allowed
    @Query("SELECT a FROM Account a WHERE a.balance < :amount")
    List<Account> findAccountsWithBalanceLessThan(@Param("amount") BigDecimal amount);

    // Custom query to find accounts where balance is between two values
    @Query("SELECT a FROM Account a WHERE a.balance BETWEEN :start AND :end")
    List<Account> findAccountsWithBalanceBetween(
        @Param("start") BigDecimal start,
        @Param("end") BigDecimal end
    );

    @Query(
            "SELECT a FROM Account a JOIN a.user u " +
                    "WHERE (:status IS NULL OR a.verificationStatus = :status) " +
                    "AND (:q IS NULL OR " +
                    "CAST(a.accountNumber AS string) LIKE CONCAT('%', CAST(:q AS string), '%') OR " +
                    "LOWER(u.email) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')) OR " +
                    "LOWER(u.name) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))" +
                    ")"
    )
    List<Account> searchAccounts(
            @Param("status") VerificationStatus status,
            @Param("q") String q
    );

        @Query("SELECT a FROM Account a JOIN a.user u " +
            "WHERE a.verificationStatus = :status " +
            "AND (a.accountNumber LIKE CONCAT('%', :q, '%') OR u.phone LIKE CONCAT('%', :q, '%'))")
        Page<Account> searchRecipientsByAccountOrPhone(
            @Param("status") VerificationStatus status,
            @Param("q") String q,
            Pageable pageable
        );

        @Query("SELECT a FROM Account a JOIN a.user u " +
            "WHERE a.verificationStatus = :status " +
            "AND LOWER(u.name) LIKE LOWER(CONCAT('%', :q, '%'))")
        Page<Account> searchRecipientsByName(
            @Param("status") VerificationStatus status,
            @Param("q") String q,
            Pageable pageable
        );



    long countByVerificationStatus(VerificationStatus status);
}




