package com.example.banking_system.Genrator;



import java.io.Serializable;
import java.util.Random;

public class CustomIdGenerator{

    public Serializable generate() {
        // Generate a random 12-digit number
        Random random = new Random();
        long randomNumber = (long) (random.nextDouble() * 1_000_000_000_000L); // 12 digits

        // Ensure it is exactly 12 digits by padding with zeros if needed
        return String.format("%012d", randomNumber);
    }
}
