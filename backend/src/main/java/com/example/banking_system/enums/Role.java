package com.example.banking_system.enums;

import org.springframework.security.core.GrantedAuthority;

public enum Role implements GrantedAuthority {
    USER,
    CUSTOMER,
    ADMIN,
    MANAGER,
    DEVELOPER;  // Developer role - can login without OTP, access system analytics

    @Override
    public String getAuthority() {
        return name();
    }
}




