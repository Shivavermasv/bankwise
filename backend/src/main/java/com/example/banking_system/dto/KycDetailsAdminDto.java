package com.example.banking_system.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KycDetailsAdminDto {
    private String accountNumber;
    private String aadharNumber;
    private String panNumber;
    private String address;
    private boolean hasPdf;
    private boolean hasAadhar;
    private boolean hasPan;
    private LocalDateTime uploadedAt;
}




