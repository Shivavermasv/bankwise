package com.example.banking_system.dto;

import com.example.banking_system.enums.Role;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Data;
import lombok.Getter;
import lombok.NonNull;
import lombok.Setter;

import java.time.LocalDate;

@Data
@Getter
@Setter
public class CreateRequestDto {
    @NonNull
    private String userName;
    @NonNull
    private String email;
    @NonNull
    private String password;
    @NonNull
    private LocalDate dateOfBirth;
    @NonNull
    private String phoneNumber;
    @NonNull
    private String address;

    @NonNull
    @Enumerated(value = EnumType.STRING)
    private Role role;

    private String accountType;
}
