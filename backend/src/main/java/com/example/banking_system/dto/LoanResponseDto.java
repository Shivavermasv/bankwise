package com.example.banking_system.dto;


import com.example.banking_system.enums.LoanStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoanResponseDto {
    private Long id;
    private String accountNumber;
    private BigDecimal amount;
    private int tenureInMonths;
    private double interestRate;
    private LoanStatus status;
    private LocalDate requestDate;
    private LocalDate approvalDate;
    private LocalDate maturityDate;
    private String reason;
    private String adminRemark;
}

