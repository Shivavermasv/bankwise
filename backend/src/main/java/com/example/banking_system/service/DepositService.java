package com.example.banking_system.service;

import com.example.banking_system.dto.DepositRequestDto;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.DepositRequest;
import com.example.banking_system.enums.DepositStatus;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.DepositRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class DepositService {
    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private DepositRepository depositRepository;

    public String createDepositRequest(DepositRequestDto depositRequestDto) {
        Account account = accountRepository.findByAccountNumber(depositRequestDto.getAccountNumber())
                .orElseThrow(()-> new RuntimeException("Account not found"));
        DepositRequest  depositRequest = DepositRequest.builder()
                .account(account)
                .amount(depositRequestDto.getAmount())
                .refferenceNumber(depositRequestDto.getRefferenceNumber())
                .status(DepositStatus.PENDING)
                .build();
        depositRepository.save(depositRequest);

        return "DepositRequest created";
    }

    public String approveDepositRequest(Long depositRequestId)  {
        DepositRequest request = depositRepository.findById(depositRequestId)
                .orElseThrow(()-> new RuntimeException("Deposit request not found"));

        if(request.getStatus().equals(DepositStatus.PENDING)){
            Account account = request.getAccount();
            account.setBalance(account.getBalance().add(BigDecimal.valueOf(request.getAmount())));
            request.setStatus(DepositStatus.DEPOSITED);
            depositRepository.save(request);
        } else if (request.getStatus().equals(DepositStatus.REJECTED)) {
            throw new RuntimeException("Deposit request has been rejected");
        } else{
            throw new RuntimeException("Deposit request already approved");
        }
        return "Approved";
    }

    public String rejectDepositRequest(Long depositRequestId)  {
        DepositRequest request = depositRepository.findById(depositRequestId)
                .orElseThrow(()-> new RuntimeException("Deposit request not found"));

        if(request.getStatus().equals(DepositStatus.PENDING)){
            request.setStatus(DepositStatus.REJECTED);
            depositRepository.save(request);
        } else if (request.getStatus().equals(DepositStatus.REJECTED)) {
            throw new RuntimeException("Deposit request has already been rejected");
        } else{
            throw new RuntimeException("Deposit request already approved");
        }
        return "Rejected";
    }

    public List<DepositRequest> getDepositRequestsByStatus(String status) {
        if(status.equals("ALL")){
            return depositRepository.findAll();
        }
        DepositStatus statusEnum;
        try{
            statusEnum = DepositStatus.valueOf(status);
        }
        catch (IllegalArgumentException e){
            throw new RuntimeException("Invalid deposit status");
        }
        return depositRepository.findByStatus(statusEnum);
    }
}
