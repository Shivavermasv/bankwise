package com.example.banking_system.repository;

import com.example.banking_system.entity.DepositRequest;
import com.example.banking_system.enums.DepositStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DepositRepository extends JpaRepository<DepositRequest,Long> {

    @Query("SELECT d from DepositRequest d WHERE d.status= :status")
    List<DepositRequest> findByStatus(@Param("status") DepositStatus status);

}
