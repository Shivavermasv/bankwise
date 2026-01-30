package com.example.banking_system.exception;

import lombok.Getter;

@Getter
public class RegistrationException extends RuntimeException {
    
    private final String errorCode;
    
    public RegistrationException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
    
    // Common error codes
    public static final String DUPLICATE_EMAIL = "DUPLICATE_EMAIL";
    public static final String DUPLICATE_PHONE = "DUPLICATE_PHONE";
    public static final String INVALID_ADMIN_CODE = "INVALID_ADMIN_CODE";
    public static final String ACCOUNT_TYPE_REQUIRED = "ACCOUNT_TYPE_REQUIRED";
    public static final String INVALID_ACCOUNT_TYPE = "INVALID_ACCOUNT_TYPE";
    public static final String PHOTO_TOO_LARGE = "PHOTO_TOO_LARGE";
}
