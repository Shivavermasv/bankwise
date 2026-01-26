package com.example.banking_system.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransferRecipientDto {
    private String name;
    private String phone;
    private String accountNumber;
    private String bank;
    private String profilePhoto; // base64 encoded
    private String profilePhotoContentType;
}




