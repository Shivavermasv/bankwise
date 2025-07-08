package com.example.banking_system.controller;

import com.example.banking_system.dto.CreateRequestDto;
import com.example.banking_system.dto.OtpRequest;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.Role;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.service.OtpService;
import com.example.banking_system.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

import static org.apache.tomcat.websocket.Constants.UNAUTHORIZED;

@RestController
@RequestMapping("/api/")
@RequiredArgsConstructor
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private OtpService otpService;

    private final AccountRepository accountRepository;



    @PostMapping("/create")
    public ResponseEntity<Object> createUser(@RequestBody CreateRequestDto user) {
        return ResponseEntity.ok().body(userService.createUser(user));
    }

    @PreAuthorize("hasRole('USER')")
    @GetMapping("/test")
    @CrossOrigin(origins = "http://localhost:8091")
    public String test() {
        return "CORS is configured!";
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody OtpRequest req) {
        if (!otpService.verifyOtp(req.getEmail(), req.getOtp())) {
            return ResponseEntity.status(UNAUTHORIZED).body("Invalid or expired OTP");
        }
        User user = userService.getUser(req.getEmail());
        String token = otpService.generateToken(req.getEmail());

        Map<String, Object> resp = new HashMap<>();
        resp.put("token", token);
        resp.put("username", user.getName());
        resp.put("email", user.getEmail());
        resp.put("role", user.getRole());
        if (user.getRole() == Role.USER) {
            Account acc = accountRepository.findAccountByUser(user).orElseThrow();
            resp.put("accountNumber", acc.getAccountNumber());
            resp.put("verificationStatus", acc.getVerificationStatus());
            resp.put("balance", acc.getBalance());
        }
        return ResponseEntity.ok(resp);
    }


}
