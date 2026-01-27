package com.example.banking_system.repository;

import com.example.banking_system.entity.LoanRequest;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.LoanStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Collection;
import java.util.Optional;

@Repository
public interface LoanRepo extends JpaRepository<LoanRequest, Long> {

    @Query("SELECT l FROM LoanRequest l JOIN FETCH l.bankAccount a JOIN FETCH a.user WHERE l.id = :loanId")
    Optional<LoanRequest> findByIdWithAccountAndUser(Long loanId);

    // Custom query methods can be added here if needed,
    // For example, to find loans by status or account number


    @Query("SELECT l FROM LoanRequest l JOIN FETCH l.bankAccount a JOIN FETCH a.user WHERE l.status = :status")
    List<LoanRequest> findByStatus(LoanStatus status);

    @Query("SELECT l FROM LoanRequest l JOIN FETCH l.bankAccount a JOIN FETCH a.user WHERE l.bankAccount.accountNumber = :accountNumber")
    List<LoanRequest> findByBankAccount_AccountNumber(String accountNumber);

    boolean existsByBankAccount_AccountNumberAndStatusIn(String accountNumber, Collection<LoanStatus> statuses);



    @Query("SELECT l FROM LoanRequest l JOIN FETCH l.bankAccount a JOIN FETCH a.user WHERE l.status = :loanStatus")
    List<LoanRequest> findAllByStatus(LoanStatus loanStatus);



    @Query("SELECT l FROM LoanRequest l JOIN FETCH l.bankAccount a JOIN FETCH a.user WHERE l.bankAccount.accountNumber = :accountNumber AND l.status = :status")
    Optional<LoanRequest> findByBankAccount_AccountNumberAndStatus(String accountNumber, LoanStatus status);

    long deleteByBankAccount_AccountNumber(String accountNumber);

    long countByStatus(LoanStatus status);

    // User-based queries for analytics via bankAccount relationship
    @Query("SELECT l FROM LoanRequest l WHERE l.bankAccount.user = ?1")
    List<LoanRequest> findByUser(User user);

    @Query("SELECT l FROM LoanRequest l WHERE l.bankAccount.user = ?1 AND l.status IN ?2")
    List<LoanRequest> findByUserAndStatusIn(User user, Collection<LoanStatus> statuses);

    @Query("SELECT l FROM LoanRequest l WHERE l.bankAccount.user = ?1 AND l.status IN ('APPROVED', 'ACTIVE') ORDER BY l.nextEmiDate ASC")
    List<LoanRequest> findActiveLoansWithUpcomingEmis(User user);

    // For EMI auto-debit scheduler
    @Query("SELECT l FROM LoanRequest l WHERE l.status IN ('APPROVED', 'ACTIVE') AND l.nextEmiDate <= ?1")
    List<LoanRequest> findLoansWithEmiDueOnOrBefore(LocalDate date);

    @Query("SELECT l FROM LoanRequest l WHERE l.status IN ('APPROVED', 'ACTIVE') AND l.nextEmiDate = ?1")
    List<LoanRequest> findLoansWithEmiDueOn(LocalDate date);
}




