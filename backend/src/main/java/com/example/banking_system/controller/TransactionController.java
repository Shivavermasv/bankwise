package com.example.banking_system.controller;

import com.example.banking_system.dto.TransferRequestDto;
import com.example.banking_system.service.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.security.auth.login.AccountNotFoundException;
import java.time.LocalDate;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/transaction")
public class TransactionController {

    @Autowired
    private  TransactionService transactionService;

    @PostMapping("/transfer")
    public ResponseEntity<Object> transfer(@RequestBody TransferRequestDto transferRequestDto) throws AccountNotFoundException {
        return ResponseEntity.ok(transactionService.processTransaction(transferRequestDto));
    }

    @GetMapping("/transaction")
    @PreAuthorize("hasRole('USER')")
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
