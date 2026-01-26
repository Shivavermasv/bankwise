package com.example.banking_system.dto;

import com.example.banking_system.enums.AccountType;
import com.example.banking_system.enums.Role;
import com.example.banking_system.enums.VerificationStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AdminAccountDto {
    private Long accountId;
    private String accountNumber;
    private BigDecimal balance;
    private VerificationStatus verificationStatus;
    private AccountType accountType;
    private double interestRate;

    private Long userId;
    private String userName;
    private String userEmail;
    private String userPhone;
    private Role userRole;
}




