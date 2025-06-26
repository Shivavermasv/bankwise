package com.example.banking_system.controller;

import com.example.banking_system.dto.KycDetailsRequestDto;
import com.example.banking_system.service.KycDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/account")
public class AccountController {

    @Autowired
    private KycDetailsService kycDetailsService;

    @PostMapping("/submit")
    public ResponseEntity<byte[]> submitKyc(@ModelAttribute KycDetailsRequestDto kycDetailsRequestDto)
            throws Exception{
        byte[] pdf = kycDetailsService.generatePdfAndSaveKycDetails(kycDetailsRequestDto);
        if(pdf == null){
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=kyc.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
