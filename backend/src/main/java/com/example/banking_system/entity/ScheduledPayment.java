package com.example.banking_system.entity;

import com.example.banking_system.enums.ScheduledPaymentStatus;
import com.example.banking_system.enums.PaymentFrequency;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Scheduled payment entity for recurring and future-dated payments.
 * Supports one-time scheduled payments and recurring payments (weekly, monthly, etc.)
 */
@Entity
@Table(name = "scheduled_payments",
    indexes = {
        @Index(name = "idx_scheduled_user", columnList = "user_id"),
        @Index(name = "idx_scheduled_next_date", columnList = "next_execution_date"),
        @Index(name = "idx_scheduled_status", columnList = "status")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduledPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_account_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "user", "transactions"})
    private Account fromAccount;

    // For transfers to other accounts
    private String toAccountNumber;
    private String beneficiaryName;

    // For bill payments
    private String billerName;
    private String billerCategory; // ELECTRICITY, WATER, GAS, INTERNET, PHONE, etc.
    private String billerId;
    private String consumerNumber; // Customer ID with the biller

    @Column(nullable = false)
    private BigDecimal amount;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentFrequency frequency; // ONE_TIME, WEEKLY, MONTHLY, QUARTERLY, YEARLY

    @Column(nullable = false)
    private LocalDate startDate;

    private LocalDate endDate; // Null for indefinite recurring payments

    private LocalDate nextExecutionDate;

    private LocalDate lastExecutionDate;

    @Builder.Default
    private Integer executionCount = 0;

    private Integer maxExecutions; // Null for indefinite

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ScheduledPaymentStatus status = ScheduledPaymentStatus.ACTIVE;

    private String failureReason;

    @Builder.Default
    private Integer failureCount = 0;

    @Builder.Default
    private Boolean notifyOnExecution = true;

    @Builder.Default
    private Boolean notifyOnFailure = true;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (nextExecutionDate == null) {
            nextExecutionDate = startDate;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Calculate next execution date based on frequency
     */
    public void calculateNextExecutionDate() {
        if (frequency == PaymentFrequency.ONE_TIME) {
            this.status = ScheduledPaymentStatus.COMPLETED;
            return;
        }

        LocalDate next = this.nextExecutionDate;
        switch (frequency) {
            case DAILY -> next = next.plusDays(1);
            case WEEKLY -> next = next.plusWeeks(1);
            case BIWEEKLY -> next = next.plusWeeks(2);
            case MONTHLY -> next = next.plusMonths(1);
            case QUARTERLY -> next = next.plusMonths(3);
            case YEARLY -> next = next.plusYears(1);
            default -> {} // ONE_TIME handled above
        }

        // Check if we've reached the end date or max executions
        if (endDate != null && next.isAfter(endDate)) {
            this.status = ScheduledPaymentStatus.COMPLETED;
        } else if (maxExecutions != null && executionCount >= maxExecutions) {
            this.status = ScheduledPaymentStatus.COMPLETED;
        } else {
            this.nextExecutionDate = next;
        }
    }

    /**
     * Record successful execution
     */
    public void recordExecution() {
        this.lastExecutionDate = LocalDate.now();
        this.executionCount++;
        this.failureCount = 0;
        calculateNextExecutionDate();
    }

    /**
     * Record failed execution
     */
    public void recordFailure(String reason) {
        this.failureReason = reason;
        this.failureCount++;
        if (this.failureCount >= 3) {
            this.status = ScheduledPaymentStatus.FAILED;
        }
    }
}
