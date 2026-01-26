package com.example.banking_system.dto;

import com.example.banking_system.enums.Role;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Data
@Getter
@Setter
public class CreateRequestDto {
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 80, message = "Name must be 2-80 characters")
    private String userName;
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;
    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be 6-100 characters")
    private String password;
    @NotNull(message = "Date of birth is required")
    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;
    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[0-9+\\-]{8,15}$", message = "Invalid phone number")
    private String phoneNumber;
    @NotBlank(message = "Address is required")
    @Size(min = 5, max = 200, message = "Address must be 5-200 characters")
    private String address;

    @NotNull(message = "Role is required")
    @Enumerated(value = EnumType.STRING)
    private Role role;

    private String accountType;

    // Optional profile photo as base64 string
    private String profilePhoto;
    private String profilePhotoContentType;

    // Admin registration code (required for ADMIN role)
    private String adminCode;
}




