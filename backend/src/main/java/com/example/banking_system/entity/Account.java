package com.example.banking_system.entity;

import java.math.BigDecimal;

import com.example.banking_system.Genrator.CustomIdGenerator;
import com.example.banking_system.enums.AccountType;
import com.example.banking_system.enums.VerificationStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;


@Setter
@Getter
@Entity
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private String accountNumber;

    @PrePersist
    protected void onCreate() {
        accountNumber = generate12DigitNumber();
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

    // Additional comments for interestType
    // 1 -> 8% / per month(amount > 5,000)
    // 2 -> 12% / per month(amount > 30k)
    // 3 -> 12% / per 3 month (amount > 20,000)

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

}
