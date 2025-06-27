package com.example.banking_system.entity;

import com.example.banking_system.enums.DepositStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepositRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "account_id", nullable = false)
    private Account  account;

    private Double amount;

    private String refferenceNumber;

    @Enumerated(EnumType.STRING)
    private DepositStatus status;

    private LocalDateTime depositDate = LocalDateTime.now();
}
