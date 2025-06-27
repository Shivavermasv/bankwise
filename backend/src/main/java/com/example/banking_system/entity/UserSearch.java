package com.example.banking_system.entity;

import lombok.Getter;

@Getter
public class UserSearch {
    private final String clientName;
    private final String clientPhone;
    private final String accountNumber;
    public UserSearch(String clientName, String accountNumber, String clientPhone) {
        this.clientName = clientName;
        this.accountNumber = accountNumber;
        this.clientPhone = clientPhone;
    }
}
