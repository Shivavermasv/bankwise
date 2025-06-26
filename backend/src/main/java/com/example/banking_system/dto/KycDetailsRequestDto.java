package com.example.banking_system.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class KycDetailsRequestDto {
    private String accountId;
    private String aadharNumber;
    private String panNumber;
    private String address;
    private MultipartFile aadharDocument;
    private MultipartFile panDocument;
}
