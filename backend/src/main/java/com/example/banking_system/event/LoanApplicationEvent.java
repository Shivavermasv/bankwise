package com.example.banking_system.event;

import lombok.Getter;
import java.math.BigDecimal;

/**
 * Event published when a new loan application is submitted.
 */
@Getter
public class LoanApplicationEvent extends BankingEvent {
    
    private final Long loanId;
    private final String accountNumber;
    private final BigDecimal amount;
    private final String userEmail;

    public LoanApplicationEvent(Object source, Long loanId, String accountNumber, 
                                 BigDecimal amount, String userEmail) {
        super(source, "LOAN_APPLICATION", String.valueOf(loanId));
        this.loanId = loanId;
        this.accountNumber = accountNumber;
        this.amount = amount;
        this.userEmail = userEmail;
    }
}




