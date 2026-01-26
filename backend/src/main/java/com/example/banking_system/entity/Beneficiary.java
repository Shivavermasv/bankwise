package com.example.banking_system.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Beneficiary entity for managing saved transfer recipients.
 * Users can save frequently used recipients for quick transfers.
 */
@Entity
@Table(name = "beneficiaries",
    indexes = {
        @Index(name = "idx_beneficiary_user", columnList = "user_id"),
        @Index(name = "idx_beneficiary_account", columnList = "beneficiary_account_number")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_beneficiary", columnNames = {"user_id", "beneficiary_account_number"})
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Beneficiary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "beneficiary_account_number", nullable = false)
    private String beneficiaryAccountNumber;

    @Column(nullable = false)
    private String beneficiaryName;

    private String nickname; // Optional friendly name

    private String bankName; // For external transfers (future)

    private String ifscCode; // For external transfers (future)

    @Builder.Default
    private Boolean isActive = true;

    @Builder.Default
    private Boolean isFavorite = false;

    private LocalDateTime lastUsedAt;

    @Builder.Default
    private Integer transferCount = 0;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void incrementTransferCount() {
        this.transferCount++;
        this.lastUsedAt = LocalDateTime.now();
    }
}
