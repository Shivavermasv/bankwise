package com.example.banking_system.controller;

import com.example.banking_system.dto.LoanRequestDto;
import com.example.banking_system.dto.LoanResponseDto;
import com.example.banking_system.dto.LoanStatusUpdateRequest;
import com.example.banking_system.enums.LoanStatus;
import com.example.banking_system.exception.ResourceNotFoundException;
import com.example.banking_system.service.LoanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/loan")
@RequiredArgsConstructor
public class LoanController {

    private final LoanService loanService;

    @PostMapping("/apply")
    @PreAuthorize("hasAnyRole('USER','CUSTOMER')")
    public ResponseEntity<Object> applyForLoan(@Valid @RequestBody LoanRequestDto loanRequestDto,
                                               @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) throws ResourceNotFoundException {
        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            return ResponseEntity.ok(loanService.applyForLoanWithIdempotency(loanRequestDto, idempotencyKey));
        }
        return ResponseEntity.ok(loanService.applyForLoan(loanRequestDto));
    }

    @PostMapping("/status")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Object> updateLoanStatus(@Valid @RequestBody LoanStatusUpdateRequest request) throws ResourceNotFoundException {
        LoanStatus loanStatus;
        try{
            loanStatus = LoanStatus.valueOf(request.getStatus().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid loan status provided");
        }

        return ResponseEntity.ok(loanService.updateLoanStatus(request.getLoanId(), loanStatus, request.getAdminRemark()));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<List<LoanResponseDto>> getPendingLoans() {
        return ResponseEntity.ok(loanService.getLoansByStatus(LoanStatus.PENDING));
    }

    @GetMapping("/my/{accountNumber}")
    @PreAuthorize("hasAnyRole('USER','CUSTOMER')")
    public ResponseEntity<List<LoanResponseDto>> getMyLoans(@PathVariable String accountNumber) {
        return ResponseEntity.ok(loanService.getLoansByAccount(accountNumber));
    }

    @GetMapping("/active/{accountNumber}")
    @PreAuthorize("hasAnyRole('USER','CUSTOMER')")
    public ResponseEntity<LoanResponseDto> getActiveLoan(@PathVariable String accountNumber) {
        return ResponseEntity.ok(loanService.getActiveLoan(accountNumber));
    }

    @PostMapping("/repay/{loanId}")
    @PreAuthorize("hasAnyRole('USER','CUSTOMER')")
    public ResponseEntity<Object> repayLoan(@PathVariable Long loanId, @RequestParam BigDecimal amount) throws ResourceNotFoundException {
        return ResponseEntity.ok(loanService.repayLoan(loanId, amount));
    }

    @GetMapping("/emi-details/{loanId}")
    @PreAuthorize("hasAnyRole('USER','CUSTOMER')")
    public ResponseEntity<Map<String, Object>> getEmiDetails(@PathVariable Long loanId) throws ResourceNotFoundException {
        return ResponseEntity.ok(loanService.getEmiDetails(loanId));
    }

    @PostMapping("/approve/{loanId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Object> approveLoan(@PathVariable Long loanId) throws ResourceNotFoundException {
        return ResponseEntity.ok(loanService.updateLoanStatus(loanId, LoanStatus.APPROVED, "Approved"));
    }

    @PostMapping("/reject/{loanId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Object> rejectLoan(@PathVariable Long loanId) throws ResourceNotFoundException {
        return ResponseEntity.ok(loanService.updateLoanStatus(loanId, LoanStatus.REJECTED, "Rejected"));
    }
}




