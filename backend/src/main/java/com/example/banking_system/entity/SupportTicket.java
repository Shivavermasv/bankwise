package com.example.banking_system.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
public class SupportTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userEmail;
    private String userName;
    private String accountNumber;

    private String category;
    private String subject;

    @Column(length = 4000)
    private String description;

    private String priority;
    private String status;

    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        if (status == null) {
            status = "OPEN";
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}




