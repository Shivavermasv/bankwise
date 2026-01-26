package com.example.banking_system.service;

import com.example.banking_system.entity.User;
import com.example.banking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service for managing transaction PINs.
 * PINs are 4-digit codes used for secure transfer authorization.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class TransactionPinService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;
    private final EmailService emailService;
    private final AuditService auditService;

    // Track failed PIN attempts (in production, use Redis)
    private final ConcurrentHashMap<String, Integer> failedAttempts = new ConcurrentHashMap<>();
    private static final int MAX_FAILED_ATTEMPTS = 3;
    private static final int PIN_LOCKOUT_MINUTES = 30;

    /**
     * Check if user has a transaction PIN set
     */
    public boolean hasPinSet(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getTransactionPin() != null;
    }

    /**
     * Set a new transaction PIN
     */
    @Transactional
    public Map<String, Object> setPin(String userEmail, String pin) {
        validatePinFormat(pin);

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getTransactionPin() != null) {
            throw new RuntimeException("PIN already set. Use reset PIN if you forgot it.");
        }

        user.setTransactionPin(passwordEncoder.encode(pin));
        userRepository.save(user);

        auditService.recordSystem("PIN_SET", "USER", String.valueOf(user.getId()), "SUCCESS", "Transaction PIN set");
        log.info("Transaction PIN set for user {}", userEmail);

        return Map.of("success", true, "message", "Transaction PIN set successfully");
    }

    /**
     * Verify transaction PIN
     */
    public Map<String, Object> verifyPin(String userEmail, String pin) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getTransactionPin() == null) {
            return Map.of("valid", false, "hasPinSet", false, "message", "No PIN set");
        }

        // Check if locked out
        if (isLockedOut(userEmail)) {
            return Map.of(
                "valid", false,
                "locked", true,
                "message", "Too many failed attempts. Please try again later or reset your PIN."
            );
        }

        boolean valid = passwordEncoder.matches(pin, user.getTransactionPin());

        if (valid) {
            failedAttempts.remove(userEmail);
            auditService.recordSystem("PIN_VERIFY", "USER", String.valueOf(user.getId()), "SUCCESS", "PIN verified");
            return Map.of("valid", true, "message", "PIN verified");
        } else {
            int attempts = failedAttempts.merge(userEmail, 1, Integer::sum);
            int remaining = MAX_FAILED_ATTEMPTS - attempts;
            
            auditService.recordSystem("PIN_VERIFY", "USER", String.valueOf(user.getId()), "FAILED", 
                "Invalid PIN. Attempts: " + attempts);

            if (remaining <= 0) {
                return Map.of(
                    "valid", false,
                    "locked", true,
                    "message", "Too many failed attempts. PIN locked for " + PIN_LOCKOUT_MINUTES + " minutes."
                );
            }

            return Map.of(
                "valid", false,
                "attemptsRemaining", remaining,
                "message", "Invalid PIN. " + remaining + " attempts remaining."
            );
        }
    }

    /**
     * Change transaction PIN (requires current PIN)
     */
    @Transactional
    public Map<String, Object> changePin(String userEmail, String currentPin, String newPin) {
        validatePinFormat(newPin);

        Map<String, Object> verifyResult = verifyPin(userEmail, currentPin);
        if (!(Boolean) verifyResult.get("valid")) {
            return verifyResult;
        }

        User user = userRepository.findByEmail(userEmail).orElseThrow();
        user.setTransactionPin(passwordEncoder.encode(newPin));
        userRepository.save(user);

        auditService.recordSystem("PIN_CHANGE", "USER", String.valueOf(user.getId()), "SUCCESS", "Transaction PIN changed");
        log.info("Transaction PIN changed for user {}", userEmail);

        return Map.of("success", true, "message", "Transaction PIN changed successfully");
    }

    /**
     * Initiate PIN reset (sends OTP to email)
     */
    @Transactional
    public Map<String, Object> initiatePinReset(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Generate reset token
        String resetToken = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        user.setPinResetToken(resetToken);
        user.setPinResetTokenExpiry(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);

        // Send OTP via email
        String otp = otpService.generateAndStoreOtp(userEmail);
        otpService.sendOtp(userEmail, otp);

        auditService.recordSystem("PIN_RESET_INIT", "USER", String.valueOf(user.getId()), "SUCCESS", "PIN reset initiated");
        log.info("PIN reset initiated for user {}", userEmail);

        return Map.of(
            "success", true,
            "message", "OTP sent to your email. Please verify to reset PIN."
        );
    }

    /**
     * Complete PIN reset (verify OTP and set new PIN)
     */
    @Transactional
    public Map<String, Object> completePinReset(String userEmail, String otp, String newPin) {
        validatePinFormat(newPin);

        // Verify OTP
        if (!otpService.verifyOtp(userEmail, otp)) {
            return Map.of("success", false, "message", "Invalid or expired OTP");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check reset token validity
        if (user.getPinResetTokenExpiry() == null || 
            user.getPinResetTokenExpiry().isBefore(LocalDateTime.now())) {
            return Map.of("success", false, "message", "Reset session expired. Please start again.");
        }

        // Set new PIN
        user.setTransactionPin(passwordEncoder.encode(newPin));
        user.setPinResetToken(null);
        user.setPinResetTokenExpiry(null);
        userRepository.save(user);

        // Clear lockout
        failedAttempts.remove(userEmail);

        auditService.recordSystem("PIN_RESET", "USER", String.valueOf(user.getId()), "SUCCESS", "Transaction PIN reset");
        log.info("Transaction PIN reset for user {}", userEmail);

        // Send confirmation email
        try {
            emailService.sendEmail(
                userEmail,
                "Transaction PIN Reset - BankWise",
                String.format("Dear %s,\n\nYour transaction PIN has been successfully reset.\n\nIf you did not perform this action, please contact support immediately.\n\nRegards,\nBankWise Team",
                    user.getName())
            );
        } catch (Exception e) {
            log.error("Failed to send PIN reset confirmation email: {}", e.getMessage());
        }

        return Map.of("success", true, "message", "Transaction PIN reset successfully");
    }

    /**
     * Validate PIN format (4 digits)
     */
    private void validatePinFormat(String pin) {
        if (pin == null || !pin.matches("^\\d{4}$")) {
            throw new IllegalArgumentException("PIN must be exactly 4 digits");
        }
        // Check for simple patterns
        if (pin.matches("^(\\d)\\1{3}$")) { // Same digit repeated (1111, 2222, etc.)
            throw new IllegalArgumentException("PIN cannot be all same digits");
        }
        if (pin.equals("1234") || pin.equals("4321") || pin.equals("0000")) {
            throw new IllegalArgumentException("PIN is too simple. Choose a stronger PIN.");
        }
    }

    /**
     * Check if user is locked out due to failed attempts
     */
    private boolean isLockedOut(String userEmail) {
        Integer attempts = failedAttempts.get(userEmail);
        return attempts != null && attempts >= MAX_FAILED_ATTEMPTS;
    }

    /**
     * Clear lockout (admin function)
     */
    public void clearLockout(String userEmail) {
        failedAttempts.remove(userEmail);
        log.info("PIN lockout cleared for user {}", userEmail);
    }
}
