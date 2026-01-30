package com.example.banking_system.controller;

import com.example.banking_system.dto.PasswordResetConfirmDto;
import com.example.banking_system.dto.PasswordResetRequestDto;
import com.example.banking_system.entity.User;
import com.example.banking_system.repository.UserRepository;
import com.example.banking_system.service.AuditService;
import com.example.banking_system.service.OtpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/password")
@RequiredArgsConstructor
@Slf4j
public class PasswordResetController {

    private final UserRepository userRepository;
    private final OtpService otpService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    /**
     * Request password reset - sends OTP to email if account exists
     */
    @PostMapping("/reset-request")
    public ResponseEntity<Map<String, Object>> requestPasswordReset(
            @Valid @RequestBody PasswordResetRequestDto request) {
        
        String email = request.getEmail().toLowerCase().trim();
        log.info("Password reset requested for email: {}", email);
        
        Optional<User> userOpt = userRepository.findByEmail(email);
        
        if (userOpt.isEmpty()) {
            // Don't reveal if account exists for security
            // But return a helpful message
            log.warn("Password reset requested for non-existent email: {}", email);
            return ResponseEntity.ok(Map.of(
                "success", false,
                "errorCode", "ACCOUNT_NOT_FOUND",
                "message", "No account found with this email address. Please check the email or create a new account."
            ));
        }
        
        // Generate and send OTP
        String otp = otpService.generateAndStoreOtp(email);
        otpService.sendPasswordResetOtp(email, otp);
        
        auditService.recordSystem("PASSWORD_RESET_REQUEST", "USER", 
            String.valueOf(userOpt.get().getId()), "SUCCESS", "OTP sent to email");
        
        // Mask email for display
        String maskedEmail = maskEmail(email);
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Password reset OTP has been sent to your email.",
            "maskedEmail", maskedEmail
        ));
    }

    /**
     * Confirm password reset with OTP and new password
     */
    @PostMapping("/reset-confirm")
    public ResponseEntity<Map<String, Object>> confirmPasswordReset(
            @Valid @RequestBody PasswordResetConfirmDto request) {
        
        String email = request.getEmail().toLowerCase().trim();
        log.info("Password reset confirmation for email: {}", email);
        
        // Verify OTP
        if (!otpService.verifyOtp(email, request.getOtp())) {
            log.warn("Invalid OTP for password reset: {}", email);
            auditService.recordSystem("PASSWORD_RESET_CONFIRM", "USER", email, "FAILED", "Invalid OTP");
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "errorCode", "INVALID_OTP",
                "message", "Invalid or expired OTP. Please request a new one."
            ));
        }
        
        // Find user
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "errorCode", "ACCOUNT_NOT_FOUND",
                "message", "Account not found."
            ));
        }
        
        User user = userOpt.get();
        
        // Update password
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        
        log.info("Password reset successful for user: {}", email);
        auditService.recordSystem("PASSWORD_RESET_CONFIRM", "USER", 
            String.valueOf(user.getId()), "SUCCESS", "Password updated");
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Password has been reset successfully. You can now login with your new password."
        ));
    }

    /**
     * Resend OTP for password reset
     */
    @PostMapping("/resend-otp")
    public ResponseEntity<Map<String, Object>> resendOtp(
            @Valid @RequestBody PasswordResetRequestDto request) {
        
        String email = request.getEmail().toLowerCase().trim();
        
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                "success", false,
                "errorCode", "ACCOUNT_NOT_FOUND",
                "message", "No account found with this email address."
            ));
        }
        
        // Generate and send new OTP
        String otp = otpService.generateAndStoreOtp(email);
        otpService.sendPasswordResetOtp(email, otp);
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "New OTP has been sent to your email."
        ));
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        
        String[] parts = email.split("@");
        String localPart = parts[0];
        String domain = parts[1];
        
        String maskedLocal;
        if (localPart.length() <= 2) {
            maskedLocal = localPart.charAt(0) + "***";
        } else {
            maskedLocal = localPart.substring(0, 2) + "***" + localPart.charAt(localPart.length() - 1);
        }
        
        String[] domainParts = domain.split("\\.");
        String maskedDomain = domainParts[0].charAt(0) + "***." + domainParts[domainParts.length - 1];
        
        return maskedLocal + "@" + maskedDomain;
    }
}
