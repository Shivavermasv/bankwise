package com.example.banking_system.repository;

import com.example.banking_system.entity.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    List<SupportTicket> findByUserEmailOrderByCreatedAtDesc(String userEmail);
    
    // For excluding resolved/closed tickets from user view
    List<SupportTicket> findByUserEmailAndStatusNotInOrderByCreatedAtDesc(String userEmail, List<String> excludedStatuses);
    
    // For developer dashboard
    List<SupportTicket> findAllByOrderByCreatedAtDesc();
    List<SupportTicket> findByStatusOrderByCreatedAtDesc(String status);

    long deleteByAccountNumber(String accountNumber);
}




