package com.example.banking_system.dto;

import com.example.banking_system.enums.TransactionStatus;
import com.example.banking_system.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TransactionResponseDto {
    private String fromAccount;
    private String toAccount;
    private BigDecimal amount;
    private LocalDateTime timestamp;
    private TransactionStatus status;
    private TransactionType type;
}




