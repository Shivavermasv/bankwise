package com.example.banking_system.entity;

import com.example.banking_system.enums.CardType;
import com.example.banking_system.enums.CardStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Card entity for virtual debit/credit cards.
 * Each user can have one debit card linked to their account
 * and optionally a credit card with a credit limit.
 */
@Entity
@Table(name = "cards",
    indexes = {
        @Index(name = "idx_card_user", columnList = "user_id"),
        @Index(name = "idx_card_number", columnList = "card_number", unique = true),
        @Index(name = "idx_card_account", columnList = "account_id")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Card {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(name = "card_number", unique = true, nullable = false, length = 16)
    private String cardNumber;

    @Column(nullable = false, length = 3)
    private String cvv;

    @Column(nullable = false)
    private LocalDate expiryDate;

    @Column(nullable = false)
    private String cardHolderName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CardType cardType; // DEBIT or CREDIT

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CardStatus status = CardStatus.ACTIVE;

    // For credit cards only
    private BigDecimal creditLimit;
    private BigDecimal availableCredit;
    private BigDecimal outstandingBalance;

    // Daily transaction limits
    @Builder.Default
    private BigDecimal dailyLimit = BigDecimal.valueOf(50000);
    
    @Builder.Default
    private BigDecimal dailyUsed = BigDecimal.ZERO;

    private LocalDate lastResetDate;

    // Card settings
    @Builder.Default
    private Boolean onlineTransactionsEnabled = true;
    
    @Builder.Default
    private Boolean internationalTransactionsEnabled = false;
    
    @Builder.Default
    private Boolean contactlessEnabled = true;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        lastResetDate = LocalDate.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Generate a masked card number for display (e.g., **** **** **** 1234)
     */
    public String getMaskedCardNumber() {
        if (cardNumber == null || cardNumber.length() < 4) return "****";
        return "**** **** **** " + cardNumber.substring(cardNumber.length() - 4);
    }

    /**
     * Reset daily usage (called by scheduled job)
     */
    public void resetDailyUsage() {
        this.dailyUsed = BigDecimal.ZERO;
        this.lastResetDate = LocalDate.now();
    }

    /**
     * Check if transaction is within daily limit
     */
    public boolean canTransact(BigDecimal amount) {
        // Reset if new day
        if (lastResetDate == null || !lastResetDate.equals(LocalDate.now())) {
            resetDailyUsage();
        }
        return dailyUsed.add(amount).compareTo(dailyLimit) <= 0;
    }

    /**
     * Record a transaction against daily limit
     */
    public void recordTransaction(BigDecimal amount) {
        if (lastResetDate == null || !lastResetDate.equals(LocalDate.now())) {
            resetDailyUsage();
        }
        this.dailyUsed = this.dailyUsed.add(amount);
    }
}
