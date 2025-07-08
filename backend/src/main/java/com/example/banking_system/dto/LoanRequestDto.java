package com.example.banking_system.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoanRequestDto {
    private String accountNumber;
    private BigDecimal amount;
    private int tenureInMonths;
    private double interestRate;
    private String reason;
}