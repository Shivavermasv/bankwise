package com.example.banking_system.controller;

import com.example.banking_system.entity.Beneficiary;
import com.example.banking_system.service.BeneficiaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/beneficiaries")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('USER', 'CUSTOMER')")
public class BeneficiaryController {

    private final BeneficiaryService beneficiaryService;

    @GetMapping
    public ResponseEntity<List<Beneficiary>> getAllBeneficiaries(Authentication auth) {
        String email = auth.getName();
        return ResponseEntity.ok(beneficiaryService.getBeneficiaries(email));
    }

    @GetMapping("/favorites")
    public ResponseEntity<List<Beneficiary>> getFavoriteBeneficiaries(Authentication auth) {
        String email = auth.getName();
        return ResponseEntity.ok(beneficiaryService.getFavoriteBeneficiaries(email));
    }

    @GetMapping("/search")
    public ResponseEntity<List<Beneficiary>> searchBeneficiaries(
            Authentication auth,
            @RequestParam String query) {
        String email = auth.getName();
        return ResponseEntity.ok(beneficiaryService.searchBeneficiaries(email, query));
    }

    @PostMapping
    public ResponseEntity<?> addBeneficiary(
            Authentication auth,
            @RequestBody BeneficiaryRequest request) {
        try {
            String email = auth.getName();
            log.info("Adding beneficiary: accountNumber={}, nickname={} for user={}", 
                request.accountNumber(), request.nickname(), email);
            Beneficiary beneficiary = beneficiaryService.addBeneficiary(
                email,
                request.accountNumber(),
                request.nickname()
            );
            return ResponseEntity.ok(beneficiary);
        } catch (Exception e) {
            log.error("Failed to add beneficiary: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateBeneficiary(
            Authentication auth,
            @PathVariable Long id,
            @RequestBody BeneficiaryUpdateRequest request) {
        try {
            String email = auth.getName();
            Beneficiary beneficiary = beneficiaryService.updateBeneficiary(
                email, id, request.nickname(), request.isFavorite()
            );
            return ResponseEntity.ok(beneficiary);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/favorite")
    public ResponseEntity<?> toggleFavorite(
            Authentication auth,
            @PathVariable Long id,
            @RequestParam boolean favorite) {
        try {
            String email = auth.getName();
            Beneficiary beneficiary = beneficiaryService.updateBeneficiary(email, id, null, favorite);
            return ResponseEntity.ok(beneficiary);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBeneficiary(
            Authentication auth,
            @PathVariable Long id) {
        try {
            String email = auth.getName();
            beneficiaryService.deleteBeneficiary(email, id);
            return ResponseEntity.ok(Map.of("message", "Beneficiary deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/record-transfer")
    public ResponseEntity<?> recordTransfer(
            Authentication auth,
            @RequestBody RecordTransferRequest request) {
        try {
            String email = auth.getName();
            beneficiaryService.recordTransfer(email, request.accountNumber());
            return ResponseEntity.ok(Map.of("message", "Transfer recorded"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    public record BeneficiaryRequest(String accountNumber, String nickname) {}
    public record BeneficiaryUpdateRequest(String nickname, Boolean isFavorite) {}
    public record RecordTransferRequest(String accountNumber) {}
}
