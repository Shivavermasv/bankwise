package com.example.banking_system.service;

import com.example.banking_system.config.SecurityConstants;
import com.example.banking_system.entity.User;
import com.example.banking_system.repository.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final UserRepository userRepository;
    private final EmailService emailService;


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
        emailService.sendEmail(email, "OTP for Authentication", "Your OTP is: " + otp);
        System.out.println("OTP for " + email + " is " + otp); // For dev/testing
    }

    public boolean verifyOtp(String email, String userOtp) {
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

}
