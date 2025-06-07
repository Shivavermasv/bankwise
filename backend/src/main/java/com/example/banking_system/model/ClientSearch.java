package com.example.banking_system.model;

import lombok.Getter;
import lombok.Setter;

@Getter
public class ClientSearch {
    private final String clientName;
    private final String clientPhone;
    private final String accountNumber;
    public ClientSearch(String clientName, String accountNumber, String clientPhone) {
        this.clientName = clientName;
        this.accountNumber = accountNumber;
        this.clientPhone = clientPhone;
    }
}
