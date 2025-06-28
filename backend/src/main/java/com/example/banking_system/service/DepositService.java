package com.example.banking_system.service;

import com.example.banking_system.dto.DepositRequestDto;
import com.example.banking_system.dto.DepositResponseDto;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.DepositRequest;
import com.example.banking_system.entity.Transaction;
import com.example.banking_system.enums.DepositStatus;
import com.example.banking_system.enums.TransactionStatus;
import com.example.banking_system.enums.TransactionType;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.DepositRepository;
import com.example.banking_system.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DepositService {
    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private DepositRepository depositRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    public String createDepositRequest(DepositRequestDto depositRequestDto) {
        Account account = accountRepository.findByAccountNumber(depositRequestDto.getAccountNumber())
                .orElseThrow(()-> new RuntimeException("Account not found"));
        DepositRequest  depositRequest = DepositRequest.builder()
                .account(account)
                .amount(depositRequestDto.getAmount())
                .refferenceNumber(depositRequestDto.getRefferenceNumber())
                .status(DepositStatus.PENDING)
                .depositDate(LocalDateTime.now())
                .build();
        depositRepository.save(depositRequest);

        return "DepositRequest created";
    }

    @Transactional
    public String approveDepositRequest(Long depositRequestId)  {
        DepositRequest request = depositRepository.findById(depositRequestId)
                .orElseThrow(()-> new RuntimeException("Deposit request not found"));

        if(request.getStatus().equals(DepositStatus.PENDING)){
            Account account = request.getAccount();
            account.setBalance(account.getBalance().add(BigDecimal.valueOf(request.getAmount())));
            request.setStatus(DepositStatus.DEPOSITED);
            Transaction transaction = Transaction.builder()
                            .destinationAccount(account)
                                    .type(TransactionType.DEPOSIT)
                                            .sourceAccount(account)
                                                    .status(TransactionStatus.SUCCESS)
                                                            .timestamp(LocalDateTime.now())
                    .amount(BigDecimal.valueOf(request.getAmount())).build();
            transactionRepository.save(transaction);
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

    public List<DepositResponseDto> getDepositRequestsByStatus(String status) throws Exception{
        List<DepositRequest> depositRequests;
        if(status.equals("ALL")){
            depositRequests = depositRepository.findAll();
        }
        else{
            DepositStatus statusEnum;
            try{
                statusEnum = DepositStatus.valueOf(status);
            }
            catch (IllegalArgumentException e){
                throw new RuntimeException("Invalid deposit status");
            }
            depositRequests = depositRepository.findByStatus(statusEnum);
        }
        return depositRequests.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    private DepositResponseDto mapToDto(DepositRequest depositRequest) {
        return DepositResponseDto.builder()
                .requestId(depositRequest.getId())
                .amount(depositRequest.getAmount())
                .depositTime(depositRequest.getDepositDate())
                .accountNumber(depositRequest.getAccount().getAccountNumber())
                .referenceNumber(depositRequest.getRefferenceNumber())
                .status(depositRequest.getStatus())
                .build();
    }
}
