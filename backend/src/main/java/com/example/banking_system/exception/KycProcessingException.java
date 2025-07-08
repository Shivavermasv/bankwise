package com.example.banking_system.exception;

public class KycProcessingException extends RuntimeException {
    public KycProcessingException(String message) {
        super(message);
    }

    public KycProcessingException(String message, Throwable cause) {
      super(message, cause);
    }
}
