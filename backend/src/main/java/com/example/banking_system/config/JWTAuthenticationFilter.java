package com.example.banking_system.config;

import com.example.banking_system.model.User;
import com.example.banking_system.repository.UserRepository;
import com.example.banking_system.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.ArrayList;
import java.util.Base64;
public class JWTAuthenticationFilter extends UsernamePasswordAuthenticationFilter {
    Authentication auth;

    private final AuthenticationManager authenticationManager;

    public JWTAuthenticationFilter(AuthenticationManager authenticationManager, UserDetailsService userDetailsService) {
        this.authenticationManager = authenticationManager;
    }
    @Bean
    public UserDetailsService userDetailsService() {
        return new UserDetailsService() {
            @Autowired
            private UserRepository userRepository;

            @Override
            public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
                User User = (User) userRepository.findByEmail(username);
                return new org.springframework.security.core.userdetails.User(
                        User.getEmail(),
                        User.getPassword(),
                        new ArrayList<>() // Add authorities/roles if necessary
                );
            }
        };
    }


    @Override
    public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response) throws AuthenticationException {
        try {
            UserCredentials creds = new ObjectMapper().readValue(request.getInputStream(), UserCredentials.class);
            return authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            creds.getUsername(),
                            creds.getPassword(),
                            new ArrayList<>()
                    )
            );
        } catch (IOException e) {
            throw new RuntimeException("Failed to parse authentication request", e);
        }
    }

    @Override
    protected void successfulAuthentication(HttpServletRequest request, HttpServletResponse response, FilterChain chain, Authentication authResult) throws IOException, ServletException {
        UserDetails userDetails = (UserDetails) authResult.getPrincipal();
        String encodedSecret = Base64.getEncoder().encodeToString(SecurityConstants.SECRET.getBytes());
        System.out.println("Encoded Secret: " + encodedSecret);

        // JWT Creation
        String token = Jwts.builder()
                .setSubject(userDetails.getUsername())
                .setExpiration(new Date(System.currentTimeMillis() + SecurityConstants.EXPIRATION_TIME))
                .signWith(SignatureAlgorithm.HS512, SecurityConstants.SECRET.getBytes(StandardCharsets.UTF_8))  // Use UTF-8 encoding
                .compact();

        System.out.println("Generated Token: " + token);


        // Add the token to the response header
        response.addHeader(SecurityConstants.HEADER_STRING, SecurityConstants.TOKEN_PREFIX + token);
    }
}
