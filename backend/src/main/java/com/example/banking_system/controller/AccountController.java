package com.example.banking_system.controller;

import com.example.banking_system.dto.DepositRequestDto;
import com.example.banking_system.dto.KycDetailsRequestDto;
import com.example.banking_system.entity.DepositRequest;
import com.example.banking_system.enums.Role;
import com.example.banking_system.enums.VerificationStatus;
import com.example.banking_system.service.AccountService;
import com.example.banking_system.service.DepositService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/account")
public class AccountController {

    @Autowired
    private AccountService accountService;

    @Autowired
    private DepositService depositService;

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
    @PatchMapping("/updateAccountStatus/{accountNumber}")
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

    @PutMapping("approveDeposit/{depositRequestId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Object> approveDepositRequest(@PathVariable Long depositRequestId){
        return ResponseEntity.ok(depositService.approveDepositRequest(depositRequestId));
    }

    @PutMapping("rejectDeposit/{depositRequestId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Object> rejectDepositRequest(@PathVariable Long depositRequestId){
        return ResponseEntity.ok(depositService.rejectDepositRequest(depositRequestId));
    }

    @PutMapping("depositRequests")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<List<DepositRequest>> getDepositRequestsByStatus
            (@RequestParam(required = false, defaultValue = "ALL") String status){
        return ResponseEntity.ok(depositService.getDepositRequestsByStatus(status));
    }

    @PreAuthorize("hasRole('USER')")
    @PostMapping("deposit")
    public ResponseEntity<Object> deposit(@ModelAttribute DepositRequestDto depositRequestDto){
        return ResponseEntity.ok(depositService.createDepositRequest(depositRequestDto));
    }




}
