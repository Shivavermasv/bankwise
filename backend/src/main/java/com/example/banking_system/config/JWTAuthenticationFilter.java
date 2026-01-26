package com.example.banking_system.config;

import com.example.banking_system.service.OtpService;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.Role;
import com.example.banking_system.repository.AccountRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Getter;
import lombok.Setter;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class JWTAuthenticationFilter extends org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter {

    private final AuthenticationManager authenticationManager;

    private final AccountRepository accountRepository;

    private final OtpService userService;

    public JWTAuthenticationFilter(AuthenticationManager authenticationManager, AccountRepository accountRepository, OtpService userService) {
        this.authenticationManager = authenticationManager;
        this.accountRepository = accountRepository;
        this.userService = userService;
    }

    @Override
    public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response) throws AuthenticationException {
        try {
            LoginRequest creds = new ObjectMapper().readValue(request.getInputStream(), LoginRequest.class);
            return authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            creds.getUsername(),
                            creds.getPassword()
                    )
            );
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    protected void successfulAuthentication(HttpServletRequest req, HttpServletResponse res,
                                            FilterChain chain, Authentication auth) throws IOException {
        User user = (User) ((UserDetails) auth.getPrincipal());
        String email = user.getEmail();

        // Developers skip OTP verification
        if (user.getRole() == Role.DEVELOPER) {
            sendJwtResponse(res, user);
            return;
        }

        if (userService.isOtpAlreadyVerified(email)) {
            sendJwtResponse(res, user);
        } else {
            String otp = userService.generateAndStoreOtp(email);
            userService.sendOtp(email, otp);
            res.setStatus(HttpServletResponse.SC_ACCEPTED);
            new ObjectMapper().writeValue(res.getOutputStream(), Map.of(
                    "message", "OTP sent to your registered email.",
                    "email", email
            ));
        }
    }

    private void sendJwtResponse(HttpServletResponse res, User user) throws IOException {
        String token = userService.generateToken(user.getEmail());
        res.addHeader(SecurityConstants.HEADER_STRING, SecurityConstants.TOKEN_PREFIX + "Bearer " + token);

        Map<String, Object> body = buildLoginResponse(user, token);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        new ObjectMapper().writeValue(res.getOutputStream(), body);
    }

    private Map<String, Object> buildLoginResponse(User user, String token) {
        var base = new HashMap<String, Object>();
        base.put("token", token);
        base.put("username", user.getName());
        base.put("email", user.getEmail());
        base.put("role", user.getRole());

        // Add profile photo if available
        if (user.getProfilePhoto() != null && user.getProfilePhoto().length > 0) {
            base.put("profilePhoto", java.util.Base64.getEncoder().encodeToString(user.getProfilePhoto()));
            base.put("profilePhotoContentType", user.getProfilePhotoContentType());
        }

        if (user.getRole() == Role.USER || user.getRole() == Role.CUSTOMER) {
            Account acc = accountRepository.findAccountByUser(user).orElseThrow();
            base.put("accountNumber", acc.getAccountNumber());
            base.put("verificationStatus", acc.getVerificationStatus());
            base.put("balance", acc.getBalance());
        }
        return base;
    }

    @Getter @Setter
    static class LoginRequest {
        private String username;
        private String password;
    }

}




