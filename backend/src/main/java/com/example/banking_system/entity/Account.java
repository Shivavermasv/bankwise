package com.example.banking_system.entity;

import com.example.banking_system.Genrator.CustomIdGenerator;
import com.example.banking_system.enums.AccountType;
import com.example.banking_system.enums.VerificationStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;


@Setter
@Getter
@Entity
@Table(
    name = "account",
    indexes = {
        @Index(name = "idx_account_number", columnList = "account_number", unique = true),
        @Index(name = "idx_account_status", columnList = "verificationStatus"),
        @Index(name = "idx_account_user", columnList = "user_id"),
        @Index(name = "idx_account_status_user", columnList = "verificationStatus, user_id")
    }
)
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @Column(name = "account_number", columnDefinition = "varchar(64)")
    private String accountNumber;

    @PrePersist
    protected void onCreate() {
        accountNumber = generate12DigitNumber();
        createdAt = LocalDateTime.now();
    }
    private String generate12DigitNumber() {
        return CustomIdGenerator.generate().toString();
    }

    // Default balance set to 5000
    private BigDecimal balance = BigDecimal.valueOf(5000);

    @Enumerated(EnumType.STRING)
    private VerificationStatus verificationStatus = VerificationStatus.PENDING;


    // Default interestType set to 1
    private double interestRate;

    @Enumerated(EnumType.STRING)
    private AccountType accountType;

    // Overdraft Protection
    private Boolean overdraftEnabled = false;
    private BigDecimal overdraftLimit = BigDecimal.ZERO;
    private BigDecimal overdraftUsed = BigDecimal.ZERO;
    private Double overdraftInterestRate = 18.0; // Annual interest rate for overdraft
    
    // Minimum balance requirement
    private BigDecimal minimumBalance = BigDecimal.valueOf(1000);

    // Additional comments for interestType
    // 1 -> 8% / per month(amount > 5,000)
    // 2 -> 12% / per month(amount > 30k)
    // 3 -> 12% / per 3 month (amount > 20,000)

    @ManyToOne(cascade = CascadeType.PERSIST)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    public void setSuspended() {
        this.verificationStatus = VerificationStatus.SUSPENDED;
    }

    /**
     * Get available balance including overdraft
     */
    public BigDecimal getAvailableBalance() {
        if (overdraftEnabled && overdraftLimit != null) {
            return balance.add(overdraftLimit).subtract(overdraftUsed != null ? overdraftUsed : BigDecimal.ZERO);
        }
        return balance;
    }

    /**
     * Check if a withdrawal/transfer can be made
     */
    public boolean canWithdraw(BigDecimal amount) {
        return getAvailableBalance().compareTo(amount) >= 0;
    }

    /**
     * Process a withdrawal, using overdraft if needed
     */
    public void withdraw(BigDecimal amount) {
        if (balance.compareTo(amount) >= 0) {
            // Sufficient balance, no overdraft needed
            balance = balance.subtract(amount);
        } else if (overdraftEnabled && canWithdraw(amount)) {
            // Need to use overdraft
            BigDecimal shortfall = amount.subtract(balance);
            balance = BigDecimal.ZERO;
            overdraftUsed = (overdraftUsed != null ? overdraftUsed : BigDecimal.ZERO).add(shortfall);
        } else {
            throw new IllegalStateException("Insufficient funds");
        }
    }

    /**
     * Process a deposit, repaying overdraft first
     */
    public void deposit(BigDecimal amount) {
        if (overdraftUsed != null && overdraftUsed.compareTo(BigDecimal.ZERO) > 0) {
            // First repay overdraft
            if (amount.compareTo(overdraftUsed) >= 0) {
                amount = amount.subtract(overdraftUsed);
                overdraftUsed = BigDecimal.ZERO;
            } else {
                overdraftUsed = overdraftUsed.subtract(amount);
                amount = BigDecimal.ZERO;
            }
        }
        balance = balance.add(amount);
    }
}




