package com.example.banking_system.controller;

import com.example.banking_system.dto.LoanRequestDto;
import com.example.banking_system.enums.LoanStatus;
import com.example.banking_system.exception.ResourceNotFoundException;
import com.example.banking_system.service.LoanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/loan")
@RequiredArgsConstructor
public class LoanController {

    private final LoanService loanService;
    // This controller will handle loan-related requests
    // You can add methods to handle loan requests, approvals, etc.
    // - Submit a loan request
    // - Approve a loan request
    // - Reject a loan request
    // - Get loan details by account number or status

    @PostMapping("/apply")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Object> applyForLoan(@RequestBody LoanRequestDto loanRequestDto) throws ResourceNotFoundException {
        // This method will handle loan application requests
        // You can call the LoanService to process the request
        return ResponseEntity.ok(loanService.applyForLoan(loanRequestDto));
    }

    @PostMapping("/status")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Object> updateLoanStatus(Long loanId, String status, String adminRemark) throws ResourceNotFoundException {
        // This method will handle updating the status of a loan request
        // You can call the LoanService to process the update
        LoanStatus loanStatus;
        try{
            loanStatus = LoanStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid loan status provided");
        }

        return ResponseEntity.ok(loanService.updateLoanStatus(loanId, loanStatus, adminRemark));
    }
}
