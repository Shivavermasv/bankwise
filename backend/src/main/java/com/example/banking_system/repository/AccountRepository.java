package com.example.banking_system.repository;

import com.example.banking_system.model.Account;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {

    Account findById(long id);
    // Find an account by its balance
    Optional<Account> findByBalance(BigDecimal balance);

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
}
