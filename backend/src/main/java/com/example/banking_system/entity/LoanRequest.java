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
@Table(
    name = "loan_request",
    indexes = {
        @Index(name = "idx_loan_account", columnList = "account_id"),
        @Index(name = "idx_loan_status", columnList = "status"),
        @Index(name = "idx_loan_account_status", columnList = "account_id, status"),
        @Index(name = "idx_loan_request_date", columnList = "requestDate"),
        @Index(name = "idx_loan_maturity_date", columnList = "maturityDate")
    }
)
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
    private Integer tenureInMonths = 0;

    @Column(nullable = false)
    private Double interestRate = 0.0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoanStatus status;

    private String reason;

    private String adminRemark;

    private LocalDate requestDate;

    private LocalDate approvalDate;

    private LocalDate maturityDate;

    @Column(name = "emis_paid")
    private Integer emisPaid = 0;

    @Column(name = "missed_emis")
    private Integer missedEmis = 0;

    // EMI auto-debit fields
    @Column(precision = 19, scale = 2)
    private BigDecimal emiAmount;

    @Column(name = "next_emi_date")
    private LocalDate nextEmiDate;

    @Column(name = "total_emis")
    private Integer totalEmis = 0;

    @Column(name = "remaining_principal", precision = 19, scale = 2)
    private BigDecimal remainingPrincipal;

    @Column(name = "auto_debit_enabled")
    private Boolean autoDebitEnabled = true;

    @Column(name = "last_emi_paid_date")
    private LocalDate lastEmiPaidDate;

    @Column(name = "emi_day_of_month")
    private Integer emiDayOfMonth = 1; // Day of month when EMI is due

    public void incrementEmisPaid() {
        this.emisPaid = (this.emisPaid == null ? 0 : this.emisPaid) + 1;
    }

    public void incrementMissedEmis() {
        this.missedEmis = (this.missedEmis == null ? 0 : this.missedEmis) + 1;
    }

    public void calculateAndSetEmiAmount() {
        // EMI = [P x R x (1+R)^N]/[(1+R)^N-1]
        double monthlyRate = (this.interestRate != null ? this.interestRate : 0.0) / 12 / 100;
        double principal = this.amount.doubleValue();
        int n = this.tenureInMonths != null ? this.tenureInMonths : 0;
        
        if (monthlyRate == 0 || n == 0) {
            this.emiAmount = n > 0 ? BigDecimal.valueOf(principal / n) : BigDecimal.ZERO;
        } else {
            double emi = principal * monthlyRate * Math.pow(1 + monthlyRate, n) / (Math.pow(1 + monthlyRate, n) - 1);
            this.emiAmount = BigDecimal.valueOf(emi).setScale(2, java.math.RoundingMode.HALF_UP);
        }
        this.totalEmis = n;
        this.remainingPrincipal = this.amount;
    }

    public void calculateNextEmiDate() {
        if (this.approvalDate == null) return;
        
        LocalDate baseDate = this.lastEmiPaidDate != null ? this.lastEmiPaidDate : this.approvalDate;
        int dayOfMonth = this.emiDayOfMonth != null ? this.emiDayOfMonth : 1;
        
        // Calculate next EMI date based on the day of month
        LocalDate nextMonth = baseDate.plusMonths(1);
        int maxDay = nextMonth.lengthOfMonth();
        this.nextEmiDate = nextMonth.withDayOfMonth(Math.min(dayOfMonth, maxDay));
    }

    public boolean isFullyPaid() {
        int paid = this.emisPaid != null ? this.emisPaid : 0;
        // Use totalEmis if set, otherwise fall back to tenureInMonths
        int total = this.totalEmis != null && this.totalEmis > 0 
            ? this.totalEmis 
            : (this.tenureInMonths != null ? this.tenureInMonths : 0);
        // Only mark as fully paid if there are actually EMIs to pay and all are paid
        return total > 0 && paid >= total;
    }

    public int getRemainingEmis() {
        int paid = this.emisPaid != null ? this.emisPaid : 0;
        // Use totalEmis if set, otherwise fall back to tenureInMonths
        int total = this.totalEmis != null && this.totalEmis > 0 
            ? this.totalEmis 
            : (this.tenureInMonths != null ? this.tenureInMonths : 0);
        return Math.max(0, total - paid);
    }
}




