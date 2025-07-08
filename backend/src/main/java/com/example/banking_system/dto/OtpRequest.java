package com.example.banking_system.dto;

import lombok.Data;

@Data
public class OtpRequest {
    private String email;
    private String otp;
}
