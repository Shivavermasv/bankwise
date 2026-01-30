package com.example.banking_system.controller;

import com.example.banking_system.entity.LoanRequest;
import com.example.banking_system.entity.User;
import com.example.banking_system.repository.LoanRepo;
import com.example.banking_system.repository.UserRepository;
import com.example.banking_system.service.EmiSchedulerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/emi")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('USER', 'CUSTOMER')")
public class EmiController {

    private final EmiSchedulerService emiSchedulerService;
    private final LoanRepo loanRepository;
    private final UserRepository userRepository;

    /**
     * Get EMI schedule for a specific loan.
     */
    @GetMapping("/schedule/{loanId}")
    public ResponseEntity<?> getEmiSchedule(
            Authentication auth,
            @PathVariable Long loanId) {
        log.info("Getting EMI schedule for loanId={}", loanId);
        try {
            User user = getCurrentUser(auth);
            log.debug("User found: {}", user.getEmail());
            verifyLoanOwnership(loanId, user);
            log.debug("Loan ownership verified");
            
            List<EmiSchedulerService.EmiScheduleItem> schedule = 
                emiSchedulerService.getEmiSchedule(loanId);
            
            log.info("EMI schedule generated with {} items", schedule.size());
            return ResponseEntity.ok(Map.of(
                "loanId", loanId,
                "schedule", schedule
            ));
        } catch (Exception e) {
            log.error("Failed to get EMI schedule for loanId={}: {}", loanId, e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Pay EMI manually (early payment).
     */
    @PostMapping("/pay/{loanId}")
    public ResponseEntity<?> payEmiManually(
            Authentication auth,
            @PathVariable Long loanId) {
        log.info("Manual EMI payment requested for loanId={}", loanId);
        try {
            User user = getCurrentUser(auth);
            log.debug("User: {}", user.getEmail());
            verifyLoanOwnership(loanId, user);
            log.debug("Loan ownership verified");
            
            EmiSchedulerService.EmiPaymentResult result = 
                emiSchedulerService.payEmiManually(loanId);
            
            log.info("EMI payment result for loanId={}: success={}, message={}", 
                loanId, result.success(), result.message());
            
            if (result.success()) {
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", result.message()
                ));
            } else {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", result.message()
                ));
            }
        } catch (Exception e) {
            log.error("Failed to process EMI payment for loanId={}: {}", loanId, e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Toggle auto-debit for a loan.
     */
    @PostMapping("/auto-debit/{loanId}")
    public ResponseEntity<?> toggleAutoDebit(
            Authentication auth,
            @PathVariable Long loanId,
            @RequestParam boolean enabled) {
        try {
            User user = getCurrentUser(auth);
            verifyLoanOwnership(loanId, user);
            
            emiSchedulerService.toggleAutoDebit(loanId, enabled);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Auto-debit " + (enabled ? "enabled" : "disabled") + " successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Get loan EMI details.
     */
    @GetMapping("/details/{loanId}")
    public ResponseEntity<?> getEmiDetails(
            Authentication auth,
            @PathVariable Long loanId) {
        try {
            User user = getCurrentUser(auth);
            verifyLoanOwnership(loanId, user);
            
            LoanRequest loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new RuntimeException("Loan not found"));
            
            Map<String, Object> details = new HashMap<>();
            details.put("loanId", loan.getId());
            details.put("principalAmount", loan.getAmount());
            details.put("emiAmount", loan.getEmiAmount());
            details.put("interestRate", loan.getInterestRate());
            details.put("tenure", loan.getTenureInMonths());
            details.put("totalEmis", loan.getTotalEmis());
            details.put("emisPaid", loan.getEmisPaid());
            details.put("remainingEmis", loan.getRemainingEmis());
            details.put("remainingPrincipal", loan.getRemainingPrincipal());
            details.put("nextEmiDate", loan.getNextEmiDate());
            details.put("autoDebitEnabled", loan.getAutoDebitEnabled());
            details.put("missedEmis", loan.getMissedEmis());
            details.put("isFullyPaid", loan.isFullyPaid());
            details.put("status", loan.getStatus());
            
            return ResponseEntity.ok(details);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get all active loans with EMI information for the user.
     */
    @GetMapping("/loans")
    public ResponseEntity<?> getUserLoansWithEmi(Authentication auth) {
        try {
            User user = getCurrentUser(auth);
            List<LoanRequest> loans = loanRepository.findByUser(user);
            
            List<Map<String, Object>> loanDetails = loans.stream()
                .filter(loan -> loan.getStatus().name().equals("APPROVED"))
                .map(loan -> {
                    Map<String, Object> loanMap = new HashMap<>();
                    loanMap.put("loanId", loan.getId());
                    loanMap.put("principalAmount", loan.getAmount());
                    loanMap.put("emiAmount", loan.getEmiAmount() != null ? loan.getEmiAmount() : 0);
                    loanMap.put("totalEmis", loan.getTotalEmis() != null ? loan.getTotalEmis() : loan.getTenureInMonths());
                    loanMap.put("emisPaid", loan.getEmisPaid() != null ? loan.getEmisPaid() : 0);
                    loanMap.put("remainingEmis", loan.getRemainingEmis());
                    loanMap.put("nextEmiDate", loan.getNextEmiDate() != null ? loan.getNextEmiDate().toString() : null);
                    loanMap.put("autoDebitEnabled", Boolean.TRUE.equals(loan.getAutoDebitEnabled()));
                    loanMap.put("isFullyPaid", loan.isFullyPaid());
                    return loanMap;
                })
                .toList();
            
            return ResponseEntity.ok(Map.of(
                "loans", loanDetails,
                "totalLoans", loanDetails.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Update EMI day of month preference.
     */
    @PutMapping("/emi-day/{loanId}")
    public ResponseEntity<?> updateEmiDay(
            Authentication auth,
            @PathVariable Long loanId,
            @RequestParam int dayOfMonth) {
        try {
            User user = getCurrentUser(auth);
            verifyLoanOwnership(loanId, user);
            
            if (dayOfMonth < 1 || dayOfMonth > 28) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "EMI day must be between 1 and 28"
                ));
            }
            
            LoanRequest loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new RuntimeException("Loan not found"));
            
            loan.setEmiDayOfMonth(dayOfMonth);
            loan.calculateNextEmiDate();
            loanRepository.save(loan);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "EMI day updated to " + dayOfMonth,
                "nextEmiDate", loan.getNextEmiDate()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private User getCurrentUser(Authentication auth) {
        String email = auth.getName();
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private void verifyLoanOwnership(Long loanId, User user) {
        // Use query that eagerly fetches account and user to avoid lazy loading issues
        LoanRequest loan = loanRepository.findByIdWithAccountAndUser(loanId)
            .orElseThrow(() -> new RuntimeException("Loan not found"));
        
        if (loan.getBankAccount() == null || loan.getBankAccount().getUser() == null) {
            throw new RuntimeException("Loan account data not found");
        }
        
        if (!loan.getBankAccount().getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied to this loan");
        }
    }
}
