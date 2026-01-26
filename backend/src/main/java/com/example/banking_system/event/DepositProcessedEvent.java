package com.example.banking_system.event;

import lombok.Getter;
import java.math.BigDecimal;

/**
 * Event published when a deposit is processed.
 */
@Getter
public class DepositProcessedEvent extends BankingEvent {
    
    private final Long depositId;
    private final String accountNumber;
    private final BigDecimal amount;
    private final String status;
    private final String userEmail;

    public DepositProcessedEvent(Object source, Long depositId, String accountNumber, 
                                  BigDecimal amount, String status, String userEmail) {
        super(source, "DEPOSIT_PROCESSED", String.valueOf(depositId));
        this.depositId = depositId;
        this.accountNumber = accountNumber;
        this.amount = amount;
        this.status = status;
        this.userEmail = userEmail;
    }
    
    public boolean isApproved() {
        return "APPROVED".equalsIgnoreCase(status);
    }
}




