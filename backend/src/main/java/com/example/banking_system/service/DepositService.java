package com.example.banking_system.service;

import com.example.banking_system.dto.DepositRequestDto;
import com.example.banking_system.dto.DepositResponseDto;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.DepositRequest;
import com.example.banking_system.entity.Transaction;
import com.example.banking_system.enums.DepositStatus;
import com.example.banking_system.enums.TransactionStatus;
import com.example.banking_system.enums.TransactionType;
import com.example.banking_system.enums.VerificationStatus;
import com.example.banking_system.event.DepositProcessedEvent;
import com.example.banking_system.exception.AccountStatusException;
import com.example.banking_system.exception.DepositRequestNotFoundException;
import com.example.banking_system.exception.InvalidDepositActionException;
import com.example.banking_system.exception.UnauthorizedAccountAccessException;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.DepositRepository;
import com.example.banking_system.repository.TransactionRepository;
import com.example.banking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class DepositService {
    private final AccountRepository accountRepository;
    private final DepositRepository depositRepository;
    private final TransactionRepository transactionRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final ApplicationEventPublisher eventPublisher;
    private final CachedDataService cachedDataService;

    public String createDepositRequest(DepositRequestDto depositRequestDto) {
        log.info("Creating deposit request accountNumber={} amount={}", depositRequestDto.getAccountNumber(), depositRequestDto.getAmount());
        Account account = cachedDataService.getAccountByNumber(depositRequestDto.getAccountNumber());
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentEmail = auth != null ? auth.getName() : null;
        if (account.getUser() == null || !account.getUser().getEmail().equalsIgnoreCase(currentEmail)) {
            auditService.record("DEPOSIT_REQUEST", "ACCOUNT", depositRequestDto.getAccountNumber(), "DENIED", "Ownership validation failed");
            throw new UnauthorizedAccountAccessException("You are not authorized to create a deposit request for this account");
        }
        if (account.getVerificationStatus() != VerificationStatus.VERIFIED) {
            auditService.record("DEPOSIT_REQUEST", "ACCOUNT", depositRequestDto.getAccountNumber(), "DENIED", "Account not verified");
            throw new AccountStatusException("Account must be verified to create deposit requests");
        }
        DepositRequest depositRequest = DepositRequest.builder()
                .account(account)
                .amount(depositRequestDto.getAmount())
                .refferenceNumber(depositRequestDto.getRefferenceNumber())
                .status(DepositStatus.PENDING)
                .depositDate(LocalDateTime.now())
                .build();
        depositRepository.save(depositRequest);
        auditService.record("DEPOSIT_REQUEST", "DEPOSIT_REQUEST", String.valueOf(depositRequest.getId()), "PENDING",
            "amount=" + depositRequestDto.getAmount());
        
        // Publish event - notifications will be sent asynchronously AFTER transaction commits
        eventPublisher.publishEvent(new DepositProcessedEvent(
            this,
            depositRequest.getId(),
            depositRequestDto.getAccountNumber(),
            BigDecimal.valueOf(depositRequestDto.getAmount()),
            "PENDING",
            account.getUser().getEmail()
        ));
        
        return "DepositRequest created";
    }

    @Transactional
    public String handleDepositAction(Long depositRequestId, String actionRaw) {
        log.info("Handling deposit action id={} action={}", depositRequestId, actionRaw);
        String action = actionRaw == null ? "" : actionRaw.trim().toLowerCase(Locale.ENGLISH);
        return switch (action) {
            case "approve" -> approveInternal(depositRequestId);
            case "reject" -> rejectInternal(depositRequestId);
            default -> throw new InvalidDepositActionException("Invalid action. Use 'approve' or 'reject'.");
        };
    }

    private String approveInternal(Long depositRequestId) {
        DepositRequest request = depositRepository.findById(depositRequestId)
                .orElseThrow(() -> new DepositRequestNotFoundException("Deposit request not found"));
        log.info("Approving deposit request id={} status={}", depositRequestId, request.getStatus());
        if (request.getStatus() == DepositStatus.DEPOSITED) {
            return "Already approved"; // idempotent
        }
        if (request.getStatus() == DepositStatus.REJECTED) {
            throw new InvalidDepositActionException("Cannot approve a rejected request");
        }
        if (request.getStatus() != DepositStatus.PENDING) {
            throw new InvalidDepositActionException("Unsupported state transition");
        }
        try {
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
            depositRepository.save(request); // optimistic lock via @Version
                auditService.record("DEPOSIT_APPROVE", "DEPOSIT_REQUEST", String.valueOf(request.getId()), "SUCCESS",
                    "amount=" + request.getAmount());
            
            // Publish event - notifications will be sent asynchronously AFTER transaction commits
            eventPublisher.publishEvent(new DepositProcessedEvent(
                this,
                request.getId(),
                account.getAccountNumber(),
                BigDecimal.valueOf(request.getAmount()),
                "APPROVED",
                account.getUser().getEmail()
            ));
            
            return "Approved";
        } catch (OptimisticLockingFailureException e) {
            throw new InvalidDepositActionException("Concurrent modification detected. Retry the operation.");
        }
    }

    private String rejectInternal(Long depositRequestId) {
        DepositRequest request = depositRepository.findById(depositRequestId)
                .orElseThrow(() -> new DepositRequestNotFoundException("Deposit request not found"));
        log.info("Rejecting deposit request id={} status={}", depositRequestId, request.getStatus());
        if (request.getStatus() == DepositStatus.REJECTED) {
            return "Already rejected"; // idempotent
        }
        if (request.getStatus() == DepositStatus.DEPOSITED) {
            throw new InvalidDepositActionException("Cannot reject an already approved request");
        }
        if (request.getStatus() != DepositStatus.PENDING) {
            throw new InvalidDepositActionException("Unsupported state transition");
        }
        request.setStatus(DepositStatus.REJECTED);
        depositRepository.save(request);
        auditService.record("DEPOSIT_REJECT", "DEPOSIT_REQUEST", String.valueOf(request.getId()), "REJECTED",
            "amount=" + request.getAmount());
        
        // Publish event - notifications will be sent asynchronously AFTER transaction commits
        eventPublisher.publishEvent(new DepositProcessedEvent(
            this,
            request.getId(),
            request.getAccount().getAccountNumber(),
            BigDecimal.valueOf(request.getAmount()),
            "REJECTED",
            request.getAccount().getUser().getEmail()
        ));
        
        return "Rejected";
    }


    public List<DepositResponseDto> getDepositRequestsByStatus(String status) {
        List<DepositRequest> depositRequests;
        if ("ALL".equalsIgnoreCase(status)) {
            depositRequests = depositRepository.findAll();
        } else {
            DepositStatus statusEnum;
            try {
                statusEnum = DepositStatus.valueOf(status.toUpperCase(Locale.ENGLISH));
            } catch (IllegalArgumentException e) {
                throw new InvalidDepositActionException("Invalid deposit status");
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




