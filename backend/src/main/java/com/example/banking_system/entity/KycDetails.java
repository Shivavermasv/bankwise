package com.example.banking_system.entity;

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
    @Basic(fetch = FetchType.LAZY)
    @Column(name = "kyc_pdf")
    private byte[] kycPdf;

    @Lob
    @Basic(fetch = FetchType.LAZY)
    @Column(name = "aadhar_document")
    private byte[] aadharDocument;

    @Column(name = "aadhar_content_type")
    private String aadharContentType;

    @Lob
    @Basic(fetch = FetchType.LAZY)
    @Column(name = "pan_document")
    private byte[] panDocument;

    @Column(name = "pan_content_type")
    private String panContentType;

    private LocalDateTime uploadedAt;
}




