package com.example.banking_system.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
public class SupportTicketResponseDto {
    private Long id;
    private String userEmail;
    private String userName;
    private String accountNumber;
    private String category;
    private String subject;
    private String description;
    private String priority;
    private String status;
    private LocalDateTime createdAt;
}




