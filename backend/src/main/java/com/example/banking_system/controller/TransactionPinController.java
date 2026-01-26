package com.example.banking_system.controller;

import com.example.banking_system.service.TransactionPinService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/transaction-pin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('USER', 'CUSTOMER')")
public class TransactionPinController {

    private final TransactionPinService transactionPinService;

    @GetMapping("/status")
    public ResponseEntity<?> getPinStatus(Authentication auth) {
        String email = auth.getName();
        boolean hasPin = transactionPinService.hasPinSet(email);
        
        return ResponseEntity.ok(Map.of(
            "hasPinSet", hasPin,
            "message", hasPin ? "Transaction PIN is set" : "Transaction PIN not set"
        ));
    }

    @PostMapping("/set")
    public ResponseEntity<?> setPin(
            Authentication auth,
            @RequestBody SetPinRequest request) {
        try {
            String email = auth.getName();
            Map<String, Object> result = transactionPinService.setPin(email, request.pin());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyPin(
            Authentication auth,
            @RequestBody VerifyPinRequest request) {
        try {
            String email = auth.getName();
            Map<String, Object> result = transactionPinService.verifyPin(email, request.pin());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "valid", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/change")
    public ResponseEntity<?> changePin(
            Authentication auth,
            @RequestBody ChangePinRequest request) {
        try {
            String email = auth.getName();
            Map<String, Object> result = transactionPinService.changePin(email, request.currentPin(), request.newPin());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/forgot/initiate")
    public ResponseEntity<?> initiatePinReset(Authentication auth) {
        try {
            String email = auth.getName();
            Map<String, Object> result = transactionPinService.initiatePinReset(email);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/forgot/complete")
    public ResponseEntity<?> completePinReset(
            Authentication auth,
            @RequestBody ResetPinRequest request) {
        try {
            String email = auth.getName();
            Map<String, Object> result = transactionPinService.completePinReset(email, request.otp(), request.newPin());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    public record SetPinRequest(String pin) {}
    public record VerifyPinRequest(String pin) {}
    public record ChangePinRequest(String currentPin, String newPin) {}
    public record ResetPinRequest(String otp, String newPin) {}
}
