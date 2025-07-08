package com.example.banking_system.config;

import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.Role;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.service.OtpService;
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

//    @Override
//    protected void successfulAuthentication(HttpServletRequest request, HttpServletResponse response, FilterChain chain, Authentication authResult) throws IOException, ServletException {
//        UserDetails userDetails = (UserDetails) authResult.getPrincipal();
//
//        User user = (User) userDetails;
//
//
//        String otp = userService.generateAndStoreOtp(user.getEmail());
//        userService.sendOtp(user.getEmail(), otp);
//
//        List<String> roles = userDetails.getAuthorities()
//                .stream()
//                .map(GrantedAuthority::getAuthority)
//                .collect(Collectors.toList());
//
//        String token = Jwts.builder()
//                .setSubject(userDetails.getUsername())
//                .claim("roles", roles)
//                .setExpiration(new Date(System.currentTimeMillis() + SecurityConstants.EXPIRATION_TIME))
//                .signWith(SignatureAlgorithm.HS512, SecurityConstants.SECRET.getBytes(StandardCharsets.UTF_8))
//                .compact();
//
//        response.addHeader(SecurityConstants.HEADER_STRING, SecurityConstants.TOKEN_PREFIX + token);
//
//        if(user.getRole().equals(Role.USER)){
//            Account account = accountRepository.findAccountByUser(user)
//                    .orElseThrow(()->new UsernameNotFoundException("User not found"));
//            response.setContentType("application/json");
//            new ObjectMapper().writeValue(response.getOutputStream(),
//                    LoginResponseUserDto.builder()
//                    .username(user.getName())
//                            .AccountNumber(account.getAccountNumber())
//                            .email(user.getEmail())
//                            .role(user.getRole())
//                            .verificationStatus(account.getVerificationStatus())
//                            .balance(account.getBalance())
//                            .build()
//                    );
//        }
//        else{
//            response.setContentType("application/json");
//            new ObjectMapper().writeValue(response.getOutputStream(),
//                    LoginResponseAdminManagerDto.builder()
//                            .email(user.getEmail())
//                    .username(user.getName())
//                            .role(user.getRole())
//                            .build()
//                    );
//        }
//    }
//
//    // DTO for login credentials
//    @Setter
//    @Getter
//    public static class LoginRequest {
//        // Getters and Setters
//        private String username;
//        private String password;
//
//    }

    @Override
    protected void successfulAuthentication(HttpServletRequest req, HttpServletResponse res,
                                            FilterChain chain, Authentication auth) throws IOException {
        User user = (User) ((UserDetails) auth.getPrincipal());
        String email = user.getEmail();

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
        String token = "Bearer "+userService.generateToken(user.getEmail());
        res.addHeader(SecurityConstants.HEADER_STRING, SecurityConstants.TOKEN_PREFIX + token);

        Map<String, Object> body = buildLoginResponse(user);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        new ObjectMapper().writeValue(res.getOutputStream(), body);
    }

    private Map<String, Object> buildLoginResponse(User user) {
        var base = new HashMap<String, Object>();
        base.put("token", null); // already set in header
        base.put("username", user.getName());
        base.put("email", user.getEmail());
        base.put("role", user.getRole());

        if (user.getRole() == Role.USER) {
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
