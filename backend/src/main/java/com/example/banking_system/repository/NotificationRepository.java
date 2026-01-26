package com.example.banking_system.repository;

import com.example.banking_system.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;


public interface NotificationRepository extends JpaRepository<Notification, Long> {


    List<Notification> findByUser_EmailAndSeenFalse(String email);

    long deleteByUser_Email(String email);

    long countBySeenFalse();
}




