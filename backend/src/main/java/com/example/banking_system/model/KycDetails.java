package com.example.banking_system.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class KycDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name="account_id", nullable = false, unique = true)
    private Account account;

    private String aadharNumber;
    private String panNumber;
    private String address;

    @Lob
    @Column(name = "kyc_pdf")
    private byte[] kycPdf;

    private LocalDateTime uploadedAt;
}
