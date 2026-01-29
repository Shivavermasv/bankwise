package com.example.banking_system.controller;

import com.example.banking_system.service.TransactionService;
import com.example.banking_system.dto.TransferRequestDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.security.auth.login.AccountNotFoundException;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/transaction")
@Slf4j
public class TransactionController {

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Process a transfer with idempotency support.
     * Send 'Idempotency-Key' header to prevent duplicate transfers on retry.
     * 
     * @param transferRequestDto The transfer request
     * @param idempotencyKey Optional: Unique key for idempotency (UUID recommended)
     * @return Transfer result or cached result if duplicate
     */
    @PostMapping("/transfer")
    @PreAuthorize("hasAnyRole('USER','CUSTOMER')")
    public ResponseEntity<Object> transfer(
            @Valid @RequestBody TransferRequestDto transferRequestDto,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey) 
            throws AccountNotFoundException {
        
        log.info("Processing transfer with idempotencyKey: {}", idempotencyKey);
        
        try {
            Map<String, Object> result = transactionService.processTransactionWithIdempotencyAndBalance(transferRequestDto, idempotencyKey);
            String transactionStatus = (String) result.get("status");
            Map<String, Object> response = new HashMap<>();
            
            // Check if the transaction actually succeeded
            if ("SUCCESS".equals(transactionStatus)) {
                response.put("status", "SUCCESS");
                response.put("data", transactionStatus);
                response.put("newBalance", result.get("newBalance"));
                if (idempotencyKey != null) {
                    response.put("idempotent", true);
                }
                return ResponseEntity.ok(response);
            } else {
                // Transaction returned non-success status
                response.put("status", "FAILED");
                response.put("error", transactionStatus);
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            log.error("Transfer failed: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "FAILED");
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/transaction")
    @PreAuthorize("hasAnyRole('USER','CUSTOMER')")
    public ResponseEntity<Object> getLastTransaction(
            @RequestParam String accountNumber,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(transactionService.getTransaction(accountNumber, page, size, startDate, endDate));
    }

    @GetMapping("/pdf")
    public ResponseEntity<Object> sendTransactionEmail(){
        try{
            transactionService.sendMonthlyTransactionReport();
        }
        catch (Exception e){
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
        return ResponseEntity.ok().build();
    }

}




