package com.example.banking_system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class KycDetailsRequestDto {
    @NotBlank(message = "Account ID is required")
    private String accountId;

    @NotBlank(message = "Aadhar number is required")
    @Pattern(regexp = "^[0-9]{12}$", message = "Aadhar number must be 12 digits")
    private String aadharNumber;

    @NotBlank(message = "PAN number is required")
    @Pattern(regexp = "^[A-Z]{5}[0-9]{4}[A-Z]{1}$", message = "Invalid PAN format")
    private String panNumber;

    @NotBlank(message = "Address is required")
    @Size(min = 5, max = 200, message = "Address must be 5-200 characters")
    private String address;

    @NotNull(message = "Aadhar document is required")
    private MultipartFile aadharDocument;

    @NotNull(message = "PAN document is required")
    private MultipartFile panDocument;
}




