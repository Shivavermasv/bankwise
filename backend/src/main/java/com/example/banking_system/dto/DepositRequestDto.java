package com.example.banking_system.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DepositRequestDto {
    @NotBlank(message = "Account number is required")
    @Size(min = 6, max = 20, message = "Account number length is invalid")
    private String accountNumber;
    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    private Double amount;

    @NotBlank(message = "Reference number is required")
    @Size(min = 4, max = 30, message = "Reference number length is invalid")
    private String refferenceNumber;
}




