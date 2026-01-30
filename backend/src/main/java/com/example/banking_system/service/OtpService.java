package com.example.banking_system.service;

import com.example.banking_system.config.SecurityConstants;
import com.example.banking_system.entity.User;
import com.example.banking_system.repository.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final UserRepository userRepository;
    private final EmailService emailService;

    @org.springframework.beans.factory.annotation.Value("${bankwise.dev.skip-otp:false}")
    private boolean skipOtp;


    private final Map<String, String> otpMap = new ConcurrentHashMap<>();
    private final Set<String> verifiedUsers = Collections.synchronizedSet(new HashSet<>());

    public User getUser(String userName) {
        return userRepository.findByEmail(userName)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + userName));
    }


    public String generateAndStoreOtp(String email) {
        String otp = RandomStringUtils.randomNumeric(6);
        otpMap.put(email, otp);
        return otp;
    }

    public void sendOtp(String email, String otp) {
        if (skipOtp) {
            log.info("Dev mode: Skipping OTP email for email={}", email);
            return;
        }
        emailService.sendEmail(email, "OTP for Authentication", "Your OTP is: " + otp);
        log.info("OTP sent to email={}", email);
    }

    /**
     * Send OTP specifically for password reset
     */
    public void sendPasswordResetOtp(String email, String otp) {
        if (skipOtp) {
            log.info("Dev mode: Skipping password reset OTP email for email={}", email);
            return;
        }
        String subject = "Password Reset - Bankwise";
        String body = String.format(
            "Hello,\n\n" +
            "You have requested to reset your password for your Bankwise account.\n\n" +
            "Your verification code is: %s\n\n" +
            "This code will expire in 10 minutes.\n\n" +
            "If you did not request this password reset, please ignore this email or contact support.\n\n" +
            "Best regards,\n" +
            "The Bankwise Team",
            otp
        );
        emailService.sendEmail(email, subject, body);
        log.info("Password reset OTP sent to email={}", email);
    }

    public boolean verifyOtp(String email, String userOtp) {
        // Dev mode: skip OTP verification
        if (skipOtp) {
            log.info("Dev mode: OTP verification skipped for email={}", email);
            otpMap.remove(email);
            verifiedUsers.add(email);
            return true;
        }
        String stored = otpMap.get(email);
        if (stored != null && stored.equals(userOtp)) {
            otpMap.remove(email);
            verifiedUsers.add(email);
            return true;
        }
        return false;
    }

    public boolean isOtpAlreadyVerified(String email) {
        return verifiedUsers.contains(email);
    }

    public String generateToken(String email) {
        User user = getUser(email);
        List<String> roles = List.of("ROLE_" + user.getRole().name());
        return Jwts.builder()
                .setSubject(email)
                .claim("roles", roles)
                .setExpiration(new Date(System.currentTimeMillis() + SecurityConstants.EXPIRATION_TIME))
                .signWith(SignatureAlgorithm.HS512, SecurityConstants.SECRET.getBytes(StandardCharsets.UTF_8))
                .compact();
    }

    /**
     * Generate a developer token without database lookup.
     * Used for developer-only login that bypasses user authentication.
     */
    public String generateDeveloperToken() {
        List<String> roles = List.of("ROLE_DEVELOPER", "ROLE_ADMIN", "ROLE_USER");
        return Jwts.builder()
                .setSubject("developer@bankwise.internal")
                .claim("roles", roles)
                .setExpiration(new Date(System.currentTimeMillis() + SecurityConstants.EXPIRATION_TIME))
                .signWith(SignatureAlgorithm.HS512, SecurityConstants.SECRET.getBytes(StandardCharsets.UTF_8))
                .compact();
    }

}




