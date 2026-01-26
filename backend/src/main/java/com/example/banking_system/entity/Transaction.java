package com.example.banking_system.entity;

import com.example.banking_system.enums.TransactionStatus;
import com.example.banking_system.enums.TransactionType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(
    name = "transaction",
    indexes = {
        @Index(name = "idx_txn_source_account", columnList = "source_account_id"),
        @Index(name = "idx_txn_dest_account", columnList = "destination_account_id"),
        @Index(name = "idx_txn_timestamp", columnList = "timestamp"),
        @Index(name = "idx_txn_status", columnList = "status"),
        @Index(name = "idx_txn_type", columnList = "type"),
        @Index(name = "idx_txn_source_timestamp", columnList = "source_account_id, timestamp"),
        @Index(name = "idx_txn_dest_timestamp", columnList = "destination_account_id, timestamp")
    }
)
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_account_id")
    private Account sourceAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_account_id")
    private Account destinationAccount;

    private BigDecimal amount;

    private LocalDateTime timestamp;

    @Enumerated(EnumType.STRING)
    private TransactionType type;

    @Enumerated(EnumType.STRING)
    private TransactionStatus status;
}




