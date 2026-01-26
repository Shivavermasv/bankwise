package com.example.banking_system.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Security constants for JWT authentication.
 * JWT_SECRET should be externalized via environment variable for production.
 */
@Component
public class SecurityConstants {
    
    // Fallback for development - MUST be overridden in production via JWT_SECRET env var
    private static final String DEFAULT_SECRET = "bankwise_super_secret_key_change_me_please_64_chars_min_1234567890";
    
    // Static reference updated by Spring on startup
    public static String SECRET = DEFAULT_SECRET;
    
    public static final long EXPIRATION_TIME = 864_000_000; // 10 days
    public static final String TOKEN_PREFIX = "Bearer ";
    public static final String HEADER_STRING = "Authorization";
    
    @Value("${JWT_SECRET:#{null}}")
    public void setSecret(String secret) {
        if (secret != null && !secret.isBlank() && secret.length() >= 64) {
            SECRET = secret;
        }
    }
}




