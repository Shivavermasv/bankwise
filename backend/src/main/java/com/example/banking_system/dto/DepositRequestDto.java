package com.example.banking_system.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DepositRequestDto {
    private String accountNumber;
    private Double amount;
    private String refferenceNumber;
}
