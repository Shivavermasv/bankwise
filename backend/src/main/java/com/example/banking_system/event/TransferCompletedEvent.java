package com.example.banking_system.event;

import lombok.Getter;
import java.math.BigDecimal;

/**
 * Event published when a transfer is completed.
 * Listeners can send notifications, emails, update analytics, etc.
 */
@Getter
public class TransferCompletedEvent extends BankingEvent {
    
    private final String fromAccount;
    private final String toAccount;
    private final BigDecimal amount;
    private final String fromUserEmail;
    private final String toUserEmail;
    private final boolean success;

    public TransferCompletedEvent(Object source, String fromAccount, String toAccount, 
                                   BigDecimal amount, String fromUserEmail, String toUserEmail, boolean success) {
        super(source, "TRANSFER_COMPLETED", fromAccount);
        this.fromAccount = fromAccount;
        this.toAccount = toAccount;
        this.amount = amount;
        this.fromUserEmail = fromUserEmail;
        this.toUserEmail = toUserEmail;
        this.success = success;
    }
}




