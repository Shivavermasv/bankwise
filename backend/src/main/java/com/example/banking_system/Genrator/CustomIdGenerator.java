package com.example.banking_system.Genrator;

import java.io.Serializable;
import java.util.Random;

/**
 * Custom ID generator for creating unique 12-digit account numbers.
 */
public class CustomIdGenerator {

    private static final Random random = new Random();

    /**
     * Generate a random 12-digit account number.
     * @return A 12-digit string representation of the account number
     */
    public static Serializable generate() {
        long randomNumber = (long) (random.nextDouble() * 1_000_000_000_000L);
        return String.format("%012d", randomNumber);
    }
}
