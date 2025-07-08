package com.example.banking_system.controller;

import com.example.banking_system.dto.DepositRequestDto;
import com.example.banking_system.dto.KycDetailsRequestDto;
import com.example.banking_system.enums.VerificationStatus;
import com.example.banking_system.service.AccountService;
import com.example.banking_system.service.DepositService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;
    private final DepositService depositService;

    @PreAuthorize("hasRole('USER')")
    @PostMapping("/submit")
    public ResponseEntity<byte[]> submitKyc(@ModelAttribute KycDetailsRequestDto kycDetailsRequestDto){
        byte[] pdf = accountService.generatePdfAndSaveKycDetails(kycDetailsRequestDto);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=kyc.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PatchMapping("/updateAccountStatus/{accountNumber}")
    public ResponseEntity<Object> updateAccountStatus
            (@PathVariable String accountNumber, @RequestBody Map<String, String> request) {
        String status = request.get("status").toUpperCase();
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
    public ResponseEntity<Object> getDepositRequestsByStatus
            (@RequestParam(required = false, defaultValue = "ALL") String status) throws Exception {
        return ResponseEntity.ok(depositService.getDepositRequestsByStatus(status));
    }

    @PreAuthorize("hasRole('USER')")
    @PostMapping("deposit")
    public ResponseEntity<Object> deposit(@ModelAttribute DepositRequestDto depositRequestDto){
        return ResponseEntity.ok(depositService.createDepositRequest(depositRequestDto));
    }

    @GetMapping("interestRate")
    @PreAuthorize("hasRoles('ADMIN', 'MANAGER')")
    public ResponseEntity<Object> modifyInterestRate(
            @RequestParam String accountNumber, @RequestParam double newInterestRate) throws Exception {
        return ResponseEntity.ok(accountService.changeAccountInterestRate(accountNumber, newInterestRate));
    }

}
