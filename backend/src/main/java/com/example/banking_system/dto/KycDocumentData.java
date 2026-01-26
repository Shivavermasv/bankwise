package com.example.banking_system.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class KycDocumentData {
    private byte[] data;
    private String contentType;
    private String filename;
}




