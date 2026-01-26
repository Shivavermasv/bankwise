package com.example.banking_system.event;

import lombok.Getter;

/**
 * Event published when KYC/Account status changes.
 */
@Getter
public class AccountStatusChangedEvent extends BankingEvent {
    
    private final String accountNumber;
    private final String userEmail;
    private final String userName;
    private final String newStatus;
    private final String previousStatus;

    public AccountStatusChangedEvent(Object source, String accountNumber, String userEmail, 
                                      String userName, String newStatus, String previousStatus) {
        super(source, "ACCOUNT_STATUS_CHANGED", accountNumber);
        this.accountNumber = accountNumber;
        this.userEmail = userEmail;
        this.userName = userName;
        this.newStatus = newStatus;
        this.previousStatus = previousStatus;
    }
}




