package com.example.banking_system.controller;

import com.example.banking_system.dto.KycDetailsRequestDto;
import com.example.banking_system.enums.Role;
import com.example.banking_system.enums.VerificationStatus;
import com.example.banking_system.service.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping("/api/account")
public class AccountController {

    @Autowired
    private AccountService accountService;

    @PostMapping("/submit")
    public ResponseEntity<byte[]> submitKyc(@ModelAttribute KycDetailsRequestDto kycDetailsRequestDto)
            throws Exception{
        byte[] pdf = accountService.generatePdfAndSaveKycDetails(kycDetailsRequestDto);
        if(pdf == null){
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=kyc.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PatchMapping("/updateStatus/{accountNumber}")
    public ResponseEntity<Object> updateAccountStatus
            (@PathVariable String accountNumber, @RequestBody Map<String, String> request) throws Exception {
        String status = request.get("status");
        try {
            VerificationStatus.valueOf(status);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Verification Status Not Found");
        }
        VerificationStatus vstatus = VerificationStatus.valueOf(status);
        return ResponseEntity.ok(accountService.updateAccountStatus(accountNumber, vstatus));
    }
}
