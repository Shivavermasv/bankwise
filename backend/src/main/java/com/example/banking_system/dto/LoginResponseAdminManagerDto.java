package com.example.banking_system.dto;

import com.example.banking_system.enums.Role;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.*;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponseAdminManagerDto {
    private String username;
    private String email;

    @Enumerated(EnumType.STRING)
    private Role role;
}
