package com.example.banking_system.dto;

import com.example.banking_system.enums.DepositStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class DepositResponseDto {
    private Long requestId;
    private Double amount;
    private String accountNumber;
    private String referenceNumber;
    private DepositStatus status;
    private LocalDateTime depositTime;
}
