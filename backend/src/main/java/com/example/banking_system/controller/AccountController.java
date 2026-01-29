package com.example.banking_system.controller;

import com.example.banking_system.service.AccountService;
import com.example.banking_system.service.DepositService;
import com.example.banking_system.dto.AdminAccountDto;
import com.example.banking_system.dto.DepositRequestDto;
import com.example.banking_system.dto.KycDetailsRequestDto;
import com.example.banking_system.dto.KycDetailsAdminDto;
import com.example.banking_system.exception.ResourceNotFoundException;
import com.example.banking_system.dto.TransferRecipientDto;
import com.example.banking_system.enums.VerificationStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaTypeFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
@Validated
public class AccountController {

    private final AccountService accountService;
    private final DepositService depositService;

    @PreAuthorize("hasAnyRole('USER','CUSTOMER')")
    @PostMapping("/submit")
    public ResponseEntity<byte[]> submitKyc(@Valid @ModelAttribute KycDetailsRequestDto kycDetailsRequestDto){
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

    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @GetMapping("/admin/accounts")
    public ResponseEntity<List<AdminAccountDto>> listAccounts(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q
    ) {
        return ResponseEntity.ok(accountService.listAccountsForAdmin(status, q));
    }

    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @GetMapping("/admin/kyc/{accountNumber}")
    public ResponseEntity<KycDetailsAdminDto> getKycDetails(@PathVariable String accountNumber) throws ResourceNotFoundException {
        return ResponseEntity.ok(accountService.getKycDetailsForAdmin(accountNumber));
    }

    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @GetMapping("/admin/kyc/{accountNumber}/pdf")
    public ResponseEntity<byte[]> getKycPdf(@PathVariable String accountNumber) throws ResourceNotFoundException {
        byte[] pdf = accountService.getKycPdfForAdmin(accountNumber);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=kyc.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @GetMapping("/admin/kyc/{accountNumber}/document/{type}")
    public ResponseEntity<byte[]> getKycDocument(
            @PathVariable String accountNumber,
            @PathVariable String type
    ) throws ResourceNotFoundException {
        var doc = accountService.getKycDocumentForAdmin(accountNumber, type);
        MediaType contentType = MediaType.APPLICATION_OCTET_STREAM;
        if (doc.getContentType() != null && !doc.getContentType().isBlank()) {
            contentType = MediaType.parseMediaType(doc.getContentType());
        } else {
            contentType = MediaTypeFactory.getMediaType(doc.getFilename()).orElse(MediaType.APPLICATION_OCTET_STREAM);
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=" + doc.getFilename())
                .contentType(contentType)
                .body(doc.getData());
    }

    @PreAuthorize("hasAnyRole('USER','CUSTOMER')")
    @GetMapping("/recipients/search")
    public ResponseEntity<List<TransferRecipientDto>> searchRecipients(@RequestParam String q) {
        return ResponseEntity.ok(accountService.searchRecipients(q));
    }

    @PutMapping("/depositAction")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Object> handleDepositAction(@RequestParam String action, @RequestParam Long depositRequestId) {
        return ResponseEntity.ok(depositService.handleDepositAction(depositRequestId, action));
    }

    @GetMapping("depositRequests")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Object> getDepositRequestsByStatus
            (@RequestParam(required = false, defaultValue = "ALL") String status) {
        return ResponseEntity.ok(depositService.getDepositRequestsByStatus(status));
    }

    @PreAuthorize("hasAnyRole('USER','CUSTOMER')")
    @PostMapping("deposit")
    public ResponseEntity<Object> deposit(@Valid @RequestBody DepositRequestDto depositRequestDto,
                                          @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey){
        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            return ResponseEntity.ok(depositService.createDepositRequestWithIdempotency(depositRequestDto, idempotencyKey));
        }
        return ResponseEntity.ok(depositService.createDepositRequest(depositRequestDto));
    }

    @GetMapping("interestRate")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Object> modifyInterestRate(
            @RequestParam String accountNumber, @RequestParam double newInterestRate) throws Exception {
        return ResponseEntity.ok(accountService.changeAccountInterestRate(accountNumber, newInterestRate));
    }

    @PatchMapping("interestRate")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Object> updateInterestRate(
            @RequestParam String accountNumber, @RequestParam double newInterestRate) throws Exception {
        return ResponseEntity.ok(accountService.changeAccountInterestRate(accountNumber, newInterestRate));
    }

}




