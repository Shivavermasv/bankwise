package com.example.banking_system.repository;

import com.example.banking_system.entity.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    List<SupportTicket> findByUserEmailOrderByCreatedAtDesc(String userEmail);

    long deleteByAccountNumber(String accountNumber);
}




