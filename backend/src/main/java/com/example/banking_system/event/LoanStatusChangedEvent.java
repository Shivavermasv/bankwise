package com.example.banking_system.event;

import lombok.Getter;

/**
 * Event published when a loan status changes.
 */
@Getter
public class LoanStatusChangedEvent extends BankingEvent {
    
    private final Long loanId;
    private final String accountNumber;
    private final String newStatus;
    private final String adminRemark;
    private final String userEmail;

    public LoanStatusChangedEvent(Object source, Long loanId, String accountNumber, 
                                   String newStatus, String adminRemark, String userEmail) {
        super(source, "LOAN_STATUS_CHANGED", String.valueOf(loanId));
        this.loanId = loanId;
        this.accountNumber = accountNumber;
        this.newStatus = newStatus;
        this.adminRemark = adminRemark;
        this.userEmail = userEmail;
    }
}




