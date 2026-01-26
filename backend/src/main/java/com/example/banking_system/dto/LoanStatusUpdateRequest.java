package com.example.banking_system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class LoanStatusUpdateRequest {
    @NotNull(message = "Loan ID is required")
    private Long loanId;

    @NotBlank(message = "Status is required")
    private String status;

    private String adminRemark;
}




