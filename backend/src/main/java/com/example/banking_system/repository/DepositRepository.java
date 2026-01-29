package com.example.banking_system.repository;

import com.example.banking_system.entity.DepositRequest;
import com.example.banking_system.enums.DepositStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DepositRepository extends JpaRepository<DepositRequest,Long> {

    @Query("SELECT d FROM DepositRequest d JOIN FETCH d.account WHERE d.status = :status")
    List<DepositRequest> findByStatus(@Param("status") DepositStatus status);

    @Query("SELECT d FROM DepositRequest d JOIN FETCH d.account")
    List<DepositRequest> findAllWithAccount();

    long countByStatus(DepositStatus status);

    @Query("select coalesce(sum(d.amount),0) from DepositRequest d where d.status = 'DEPOSITED'")
    Double totalApprovedDepositAmount();

    long deleteByAccount_AccountNumber(String accountNumber);
}




