package com.example.banking_system.controller;

import com.example.banking_system.service.UserService;
import com.example.banking_system.service.OtpService;
import com.example.banking_system.dto.CreateRequestDto;
import com.example.banking_system.dto.LoginResponseUserDto;
import com.example.banking_system.dto.OtpRequest;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.Role;
import com.example.banking_system.exception.UnauthorizedAccountAccessException;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.UserRepository;
import com.example.banking_system.service.AuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import static org.apache.tomcat.websocket.Constants.UNAUTHORIZED;

@RestController
@RequestMapping("/api/")
@RequiredArgsConstructor
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);
    
    private final UserService userService;
    private final OtpService otpService;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    @PostMapping("/create")
    public ResponseEntity<Object> createUser(@Valid @RequestBody CreateRequestDto user) {
        return ResponseEntity.ok().body(userService.createUser(user));
    }

    @PreAuthorize("hasAnyRole('USER','CUSTOMER')")
    @GetMapping("/test")
    @CrossOrigin(origins = "http://localhost:8091")
    public String test() {
        return "CORS is configured!";
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody OtpRequest req) {
        if (!otpService.verifyOtp(req.getEmail(), req.getOtp())) {
            auditService.recordSystem("OTP_VERIFY", "USER", req.getEmail(), "FAILED", "Invalid or expired OTP");
            return ResponseEntity.status(UNAUTHORIZED).body("Invalid or expired OTP");
        }
        User user = userService.getUser(req.getEmail());
        String token = otpService.generateToken(req.getEmail());

        auditService.recordSystem("OTP_VERIFY", "USER", String.valueOf(user.getId()), "SUCCESS", "Login token issued");

        Map<String, Object> resp = new HashMap<>();
        resp.put("token", token);
        resp.put("username", user.getName());
        resp.put("email", user.getEmail());
        resp.put("role", user.getRole());

        // Add profile photo if available
        if (user.getProfilePhoto() != null && user.getProfilePhoto().length > 0) {
            resp.put("profilePhoto", Base64.getEncoder().encodeToString(user.getProfilePhoto()));
            resp.put("profilePhotoContentType", user.getProfilePhotoContentType());
        }

        // Always try to get account for any user type that has one
        try {
            Account acc = accountRepository.findAccountByUser(user).orElse(null);
            if (acc != null) {
                resp.put("accountNumber", acc.getAccountNumber());
                resp.put("verificationStatus", acc.getVerificationStatus());
                resp.put("balance", acc.getBalance());
            }
        } catch (Exception e) {
            // If account lookup fails, continue without account details
            log.warn("Could not retrieve account for user: {}", user.getEmail(), e);
        }
        
        return ResponseEntity.ok(resp);
    }

    @PreAuthorize("hasAnyRole('USER','CUSTOMER')")
    @GetMapping("/user/details/{accountNumber}")
    public ResponseEntity<LoginResponseUserDto> getUserDetailsByAccountNumber(@PathVariable String accountNumber) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new UnauthorizedAccountAccessException("Account not found"));
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentEmail = auth.getName();
        if (account.getUser() == null || !account.getUser().getEmail().equalsIgnoreCase(currentEmail)) {
            throw new UnauthorizedAccountAccessException("You are not authorized to access this account");
        }
        User user = account.getUser();
        LoginResponseUserDto dto = LoginResponseUserDto.builder()
                .username(user.getName())
                .email(user.getEmail())
                .AccountNumber(account.getAccountNumber())
                .role(user.getRole())
                .balance(account.getBalance())
                .verificationStatus(account.getVerificationStatus())
                .profilePhoto(user.getProfilePhoto() != null ? Base64.getEncoder().encodeToString(user.getProfilePhoto()) : null)
                .profilePhotoContentType(user.getProfilePhotoContentType())
                .build();
        return ResponseEntity.ok(dto);
    }

    @PreAuthorize("hasAnyRole('USER','CUSTOMER','ADMIN','MANAGER')")
    @GetMapping("/user/profile-photo/{email}")
    public ResponseEntity<?> getProfilePhoto(@PathVariable String email) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentEmail = auth.getName();
        
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || user.getProfilePhoto() == null) {
            return ResponseEntity.ok(Map.of("hasPhoto", false));
        }
        
        return ResponseEntity.ok(Map.of(
            "hasPhoto", true,
            "profilePhoto", Base64.getEncoder().encodeToString(user.getProfilePhoto()),
            "contentType", user.getProfilePhotoContentType()
        ));
    }

    @PreAuthorize("hasAnyRole('USER','CUSTOMER','ADMIN','MANAGER','DEVELOPER')")
    @PutMapping("/user/update-profile")
    public ResponseEntity<?> updateProfile(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String address,
            @RequestParam(required = false) MultipartFile profilePhoto) {
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentEmail = auth.getName();
        
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Update fields if provided
        if (name != null && !name.trim().isEmpty()) {
            user.setName(name.trim());
        }
        if (phone != null) {
            user.setPhone(phone.trim());
        }
        if (address != null) {
            user.setAddress(address.trim());
        }
        
        // Handle profile photo upload
        if (profilePhoto != null && !profilePhoto.isEmpty()) {
            try {
                // Validate file type
                String contentType = profilePhoto.getContentType();
                if (contentType == null || !contentType.startsWith("image/")) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Invalid file type. Only images are allowed."));
                }
                
                // Validate file size (max 5MB)
                if (profilePhoto.getSize() > 5 * 1024 * 1024) {
                    return ResponseEntity.badRequest().body(Map.of("message", "File size exceeds 5MB limit."));
                }
                
                user.setProfilePhoto(profilePhoto.getBytes());
                user.setProfilePhotoContentType(contentType);
            } catch (IOException e) {
                return ResponseEntity.badRequest().body(Map.of("message", "Failed to process profile photo."));
            }
        }
        
        userRepository.save(user);
        auditService.recordSystem("PROFILE_UPDATE", "USER", String.valueOf(user.getId()), "SUCCESS", "Profile updated");
        
        // Return updated user data
        Map<String, Object> response = new HashMap<>();
        response.put("name", user.getName());
        response.put("phone", user.getPhone());
        response.put("address", user.getAddress());
        response.put("email", user.getEmail());
        response.put("creditScore", user.getCreditScore());
        
        if (user.getProfilePhoto() != null) {
            response.put("profilePhoto", Base64.getEncoder().encodeToString(user.getProfilePhoto()));
            response.put("profilePhotoContentType", user.getProfilePhotoContentType());
        }
        
        return ResponseEntity.ok(response);
    }

}




