package com.example.banking_system.repository;

import com.example.banking_system.entity.LoanRequest;
import com.example.banking_system.enums.LoanStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanRepo extends JpaRepository<LoanRequest, Long> {

    // Custom query methods can be added here if needed,
    // For example, to find loans by status or account number
     List<LoanRequest> findByStatus(LoanStatus status);
     List<LoanRequest> findByBankAccount_AccountNumber(String accountNumber);

    List<LoanRequest> findAllByStatus(LoanStatus loanStatus);
}
