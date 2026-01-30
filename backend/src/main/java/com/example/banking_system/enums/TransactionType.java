package com.example.banking_system.enums;

public enum TransactionType {
    DEPOSIT,
    TRANSFER,
    WITHDRAW,
    LOAN_PAYMENT,
    LOAN_PENALTY,
    LOAN_DISBURSEMENT,
    LOAN_REPAYMENT,      // EMI payment
    LOAN_REVERSAL,       // Loan reversal when status changes from APPROVED to REJECTED/PENDING
    SCHEDULED_PAYMENT,   // Auto-scheduled payment
    BILL_PAYMENT         // Bill payment
}




