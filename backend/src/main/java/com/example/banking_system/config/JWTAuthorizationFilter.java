package com.example.banking_system.config;


import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;

public class JWTAuthorizationFilter extends BasicAuthenticationFilter {

    public JWTAuthorizationFilter(AuthenticationManager authenticationManager) {
        super(authenticationManager);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws IOException, ServletException {
        String header = request.getHeader(SecurityConstants.HEADER_STRING);
        System.out.println("entered" + header);
        if (header != null && !header.startsWith(SecurityConstants.TOKEN_PREFIX)) {
            System.out.println("entered");
            chain.doFilter(request, response);
            return;
        }

        UsernamePasswordAuthenticationToken authentication = getAuthentication(request);
        SecurityContextHolder.getContext().setAuthentication(authentication);
        chain.doFilter(request, response);
    }

    private UsernamePasswordAuthenticationToken getAuthentication(HttpServletRequest request) {
        String token = request.getHeader(SecurityConstants.HEADER_STRING);
        System.out.println("Authorization Header: " + token);

        if (token != null) {
            try {
                // Strip the token prefix (e.g., "Bearer ")
                String tokenWithoutPrefix = token.replace(SecurityConstants.TOKEN_PREFIX, "");
                System.out.println("Token without prefix: " + tokenWithoutPrefix);

                // Parse the claims from the token
                String user = null;
                try {
                    user = Jwts.parser()
                            .setSigningKey(SecurityConstants.SECRET.getBytes(StandardCharsets.UTF_8))  // Use the same secret
                            .parseClaimsJws(token.replace(SecurityConstants.TOKEN_PREFIX, ""))
                            .getBody()
                            .getSubject();

                    System.out.println("Parsed User: " + user);
                } catch (JwtException e) {
                    System.out.println("JWT parsing error: " + e.getMessage());
                }


                // If a user was found in the claims, return the authentication token
                if (user != null) {
                    return new UsernamePasswordAuthenticationToken(user, null, new ArrayList<>());
                }
            } catch (Exception e) {
                // Log the exception for better debugging
                System.out.println("JWT parsing/validation error: " + e.getMessage());
                e.printStackTrace();
            }
        }

        return null;
    }

}
