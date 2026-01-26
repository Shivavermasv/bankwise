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
@Table(
    name = "deposit_request",
    indexes = {
        @Index(name = "idx_deposit_account", columnList = "account_id"),
        @Index(name = "idx_deposit_status", columnList = "status"),
        @Index(name = "idx_deposit_date", columnList = "depositDate"),
        @Index(name = "idx_deposit_reference", columnList = "refferenceNumber")
    }
)
public class DepositRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    private Double amount;

    private String refferenceNumber;

    @Enumerated(EnumType.STRING)
    private DepositStatus status;

    private LocalDateTime depositDate = LocalDateTime.now();

    @Version
    private Long version; // Optimistic locking to avoid double-processing
}




