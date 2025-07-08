package com.example.banking_system.entity;

import com.example.banking_system.enums.LoanStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoanRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account bankAccount;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private int tenureInMonths;

    @Column(nullable = false)
    private double interestRate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoanStatus status;

    private String reason;

    private String adminRemark;

    private LocalDate requestDate;

    private LocalDate approvalDate;

    private LocalDate maturityDate;

    @Column(name = "emis_paid")
    private int emisPaid;

    @Column(name = "missed_emis")
    private int missedEmis;

    public void incrementEmisPaid() {
        this.emisPaid += 1;
    }

    public void incrementMissedEmis() {
        this.missedEmis += 1;
    }
}
