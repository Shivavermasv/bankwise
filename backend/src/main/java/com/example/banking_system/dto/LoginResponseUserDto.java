package com.example.banking_system.dto;

import com.example.banking_system.enums.Role;
import com.example.banking_system.enums.VerificationStatus;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class LoginResponseUserDto {
    private String username;
    private String AccountNumber;

    @Enumerated(EnumType.STRING)
    private Role role;

    private BigDecimal balance;

    @Enumerated(EnumType.STRING)
    private VerificationStatus verificationStatus;
}
