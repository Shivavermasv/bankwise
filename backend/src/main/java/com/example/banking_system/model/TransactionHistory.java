package com.example.banking_system.model;



import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
@Getter
@Setter
@Entity
public class TransactionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Foreign key reference to Account with cascade delete only
    @ManyToOne
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    private BigDecimal amount;
    private String transactionType; // e.g., "credit" or "debit"
    private LocalDateTime transactionDate;
    private String description; // Optional description for the transaction

}
