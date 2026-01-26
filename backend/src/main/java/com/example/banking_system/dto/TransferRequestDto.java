package com.example.banking_system.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TransferRequestDto {
    @NotBlank(message = "From account is required")
    @Size(min = 6, max = 20, message = "From account length is invalid")
    private String fromAccount;

    @NotBlank(message = "To account is required")
    @Size(min = 6, max = 20, message = "To account length is invalid")
    private String toAccount;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    private BigDecimal amount;
}




