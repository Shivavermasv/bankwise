package com.example.banking_system.model;

import java.math.BigDecimal;
import java.util.Random;
import java.util.UUID;

import com.example.banking_system.Genrator.CustomIdGenerator;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.GenericGenerator;
import org.springframework.data.annotation.Version;


@Setter
@Getter
@Entity
public class Account {

    private String accountHolderName;
    @Id
    private String id;

    @PrePersist
    protected void onCreate() {
        id = generate12DigitNumber();
    }
    private String generate12DigitNumber() {
        Random random = new Random();
        long number = 100000000000L + (long)(random.nextDouble() * 899999999999L);
        return String.valueOf(number);
    }

    // Default balance set to 5000
    private BigDecimal balance = BigDecimal.valueOf(5000);

    @Version
    private Long version; // For optimistic locking

    // Default interestType set to 1
    private Integer interestType = 1;

    // Additional comments for interestType
    // 1 -> 8% / per month(amount > 5,000)
    // 2 -> 12% / per month(amount > 30k)
    // 3 -> 12% / per 3 month (amount > 20,000)
}
