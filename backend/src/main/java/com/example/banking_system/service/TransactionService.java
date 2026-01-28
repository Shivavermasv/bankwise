package com.example.banking_system.service;

import com.example.banking_system.dto.TransactionResponseDto;
import com.example.banking_system.dto.TransferRequestDto;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.Transaction;
import com.example.banking_system.enums.TransactionStatus;
import com.example.banking_system.enums.TransactionType;
import com.example.banking_system.enums.VerificationStatus;
import com.example.banking_system.event.TransferCompletedEvent;
import com.example.banking_system.exception.AccountStatusException;
import com.example.banking_system.exception.BusinessRuleViolationException;
import com.example.banking_system.exception.InsufficientFundsException;
import com.example.banking_system.exception.UnauthorizedAccountAccessException;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.TransactionRepository;
import com.itextpdf.text.*;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@Slf4j
public class TransactionService {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private AuditService auditService;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Value("${bankwise.transfer.min-amount:1}")
    private BigDecimal minTransferAmount;

    @Value("${bankwise.transfer.max-amount:50000}")
    private BigDecimal maxTransferAmount;

    @Value("${bankwise.transfer.daily-limit:100000}")
    private BigDecimal dailyTransferLimit;

    @Autowired
    private CachedDataService cachedDataService;

    @Transactional
    public String processTransaction(TransferRequestDto transferRequestDto) {
        log.info("Processing transfer from={} to={} amount={}", transferRequestDto.getFromAccount(), transferRequestDto.getToAccount(), transferRequestDto.getAmount());
        if (transferRequestDto.getAmount() == null) {
            throw new BusinessRuleViolationException("Transfer amount is required");
        }
        if (transferRequestDto.getAmount().compareTo(minTransferAmount) < 0) {
            throw new BusinessRuleViolationException("Transfer amount below minimum limit");
        }
        if (transferRequestDto.getAmount().compareTo(maxTransferAmount) > 0) {
            throw new BusinessRuleViolationException("Transfer amount exceeds per-transaction limit");
        }
        // Prevent self-transfer
        if (transferRequestDto.getFromAccount() != null && 
            transferRequestDto.getFromAccount().equals(transferRequestDto.getToAccount())) {
            throw new BusinessRuleViolationException("Cannot transfer to your own account");
        }
        Account fromAccount = cachedDataService.getAccountByNumber(transferRequestDto.getFromAccount());
        Account toAccount = cachedDataService.getAccountByNumber(transferRequestDto.getToAccount());

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentEmail = auth != null ? auth.getName() : null;
        if (fromAccount.getUser() == null || !fromAccount.getUser().getEmail().equalsIgnoreCase(currentEmail)) {
            auditService.record("TRANSFER", "ACCOUNT", transferRequestDto.getFromAccount(), "DENIED", "Ownership validation failed");
            throw new UnauthorizedAccountAccessException("You are not authorized to transfer from this account");
        }

        if (fromAccount.getVerificationStatus() == VerificationStatus.SUSPENDED || fromAccount.getVerificationStatus() == VerificationStatus.DISABLED) {
            auditService.record("TRANSFER", "ACCOUNT", transferRequestDto.getFromAccount(), "DENIED", "Account is suspended or disabled");
            throw new AccountStatusException("Account is suspended or disabled");
        }
        if (fromAccount.getVerificationStatus() != VerificationStatus.VERIFIED) {
            auditService.record("TRANSFER", "ACCOUNT", transferRequestDto.getFromAccount(), "DENIED", "Account not verified");
            throw new AccountStatusException("Account is not verified");
        }
        if (!toAccount.getVerificationStatus().equals(VerificationStatus.VERIFIED)) {
            auditService.record("TRANSFER", "ACCOUNT", transferRequestDto.getToAccount(), "DENIED", "Destination account not verified");
            return "Destination Account has not been verified";
        }

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        BigDecimal todayTotal = transactionRepository.sumDailyTransfers(fromAccount.getAccountNumber(), startOfDay, endOfDay);
        if (todayTotal.add(transferRequestDto.getAmount()).compareTo(dailyTransferLimit) > 0) {
            auditService.record("TRANSFER", "ACCOUNT", fromAccount.getAccountNumber(), "DENIED", "Daily limit exceeded");
            throw new BusinessRuleViolationException("Daily transfer limit exceeded");
        }
        TransactionStatus transactionStatus;
        if (fromAccount.getBalance().compareTo(transferRequestDto.getAmount()) >= 0) {
            fromAccount.setBalance(fromAccount.getBalance().subtract(transferRequestDto.getAmount()));
            toAccount.setBalance(toAccount.getBalance().add(transferRequestDto.getAmount()));
            accountRepository.save(fromAccount);
            accountRepository.save(toAccount);
            transactionStatus = TransactionStatus.SUCCESS;
            // Publish event - notifications will be sent asynchronously AFTER transaction commits
            eventPublisher.publishEvent(new TransferCompletedEvent(
                this,
                fromAccount.getAccountNumber(),
                toAccount.getAccountNumber(),
                transferRequestDto.getAmount(),
                fromAccount.getUser().getEmail(),
                toAccount.getUser().getEmail(),
                true
            ));
        } else {
            transactionStatus = TransactionStatus.FAILED;
        }
        Transaction transaction = Transaction.builder()
                .destinationAccount(toAccount)
                .sourceAccount(fromAccount)
                .amount(transferRequestDto.getAmount())
                .status(transactionStatus)
                .type(TransactionType.TRANSFER)
                .timestamp(LocalDateTime.now())
                .build();
        transactionRepository.save(transaction);
        if (transactionStatus == TransactionStatus.SUCCESS) {
            auditService.record("TRANSFER", "TRANSACTION", String.valueOf(transaction.getId()), "SUCCESS",
                    "from=" + fromAccount.getAccountNumber() + " to=" + toAccount.getAccountNumber() + " amount=" + transferRequestDto.getAmount());
        } else {
            auditService.record("TRANSFER", "TRANSACTION", String.valueOf(transaction.getId()), "FAILED",
                    "Insufficient balance or failed validation");
            throw new InsufficientFundsException("Insufficient balance for transfer");
        }
        log.info("Transfer completed status={} from={} to={}", transactionStatus, fromAccount.getAccountNumber(), toAccount.getAccountNumber());
        return transactionStatus.toString();
    }

    public List<TransactionResponseDto> getTransaction(String accountNumber, int page, int pageSize,
                                                       LocalDate startDate, LocalDate endDate) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentEmail = auth != null ? auth.getName() : null;
        Account account = cachedDataService.getAccountByNumber(accountNumber);
        if (account.getUser() == null || !account.getUser().getEmail().equalsIgnoreCase(currentEmail)) {
            throw new UnauthorizedAccountAccessException("You are not authorized to access this account");
        }
        Pageable pageable = PageRequest.of(page, pageSize);
        LocalDateTime start = (startDate != null) ? startDate.atStartOfDay() :
                LocalDate.of(2000, 1, 1).atStartOfDay();
        LocalDateTime end = (endDate != null) ? endDate.atTime(LocalTime.MAX) :
                LocalDateTime.now();
        Page<Transaction> transactionPage = transactionRepository.findByAccountAndDateRange(
                accountNumber, start, end, pageable
        );
        return transactionPage.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public TransactionResponseDto mapToDto(Transaction transaction) {
        TransactionResponseDto transactionResponseDto = new TransactionResponseDto();
        transactionResponseDto.setAmount(transaction.getAmount());
        transactionResponseDto.setStatus(transaction.getStatus());
        transactionResponseDto.setTimestamp(transaction.getTimestamp());
        transactionResponseDto.setType(transaction.getType());
        
        // Handle destination account (may be null for some transaction types)
        if (transaction.getDestinationAccount() != null) {
            transactionResponseDto.setToAccount(transaction.getDestinationAccount().getAccountNumber());
        } else {
            transactionResponseDto.setToAccount("SYSTEM");
        }
        
        // Handle source account based on transaction type
        TransactionType type = transaction.getType();
        if (type == TransactionType.DEPOSIT
                || type == TransactionType.WITHDRAW
                || type == TransactionType.LOAN_DISBURSEMENT) {
            transactionResponseDto.setFromAccount("SYSTEM");
        } else if (type == TransactionType.LOAN_PAYMENT || type == TransactionType.LOAN_PENALTY) {
            // For loan repayments, source is the user's account (set by repayLoan)
            if (transaction.getSourceAccount() != null) {
                transactionResponseDto.setFromAccount(transaction.getSourceAccount().getAccountNumber());
            } else {
                transactionResponseDto.setFromAccount("USER");
            }
            transactionResponseDto.setToAccount("LOAN_ACCOUNT");
        } else {
            transactionResponseDto.setFromAccount(transaction.getSourceAccount() != null 
                ? transaction.getSourceAccount().getAccountNumber() 
                : "UNKNOWN");
        }
        return transactionResponseDto;
    }

    @Scheduled(cron = "0 10 0 1 * ?")
    public void sendMonthlyTransactionReport() throws Exception {
        LocalDate today = LocalDate.now();
        LocalDate firstDayLastMonth = today.minusMonths(1).withDayOfMonth(1);
        LocalDate lastDayLastMonth = today.plusMonths(1).withDayOfMonth(1);

        LocalDateTime startDate = firstDayLastMonth.atStartOfDay();
        LocalDateTime endDate = lastDayLastMonth.atTime(LocalTime.MAX);

        List<Account> accounts = accountRepository.findAll();

        int nThreads = Math.max(2, Runtime.getRuntime().availableProcessors() * 2);
        ExecutorService executor = Executors.newFixedThreadPool(nThreads);

        for (Account account : accounts) {
            executor.submit(() -> {
                try {
                    List<Transaction> transactions = transactionRepository.findByAccountAndDateRange(
                            account.getAccountNumber(), startDate, endDate, PageRequest.of(0, Integer.MAX_VALUE)
                    ).getContent();
                    if (!transactions.isEmpty() && account.getUser() != null) {
                        List<TransactionResponseDto> transactionResponseDtos = transactions.stream()
                                .map(this::mapToDto).toList();
                        byte[] pdf = generateTransactionPdf(transactionResponseDtos,
                                account, firstDayLastMonth, lastDayLastMonth);
                        emailService.sendTransactionHistoryPdf(account.getUser().getEmail(), pdf);
                    }
                } catch (Exception e) {
                    log.warn("Error sending transaction PDF to email={}",
                            (account.getUser() != null ? account.getUser().getEmail() : "null"), e);
                }
            });
        }

        executor.shutdown();
        boolean finished = executor.awaitTermination(30, TimeUnit.MINUTES);
        if (!finished) {
            log.warn("Not all transaction reports finished sending in time.");
        }
    }

    @Async
    private byte[] generateTransactionPdf(List<TransactionResponseDto> transactionResponseDtos,
                                          Account account, LocalDate startDate, LocalDate endDate) {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 54, 36);

        try {
            PdfWriter.getInstance(document, outputStream);
            document.open();

            document.addAuthor(account.getAccountNumber());
            document.addCreationDate();
            document.addTitle("Monthly Transactions");

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Paragraph title = new Paragraph("Monthly Transactions Statement", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            document.add(Chunk.NEWLINE);

            Font infoFont = FontFactory.getFont(FontFactory.HELVETICA, 12);
            document.add(new Paragraph("Account Number: " + account.getAccountNumber(), infoFont));
            document.add(new Paragraph("Period: " + startDate + " - " + endDate, infoFont));
            document.add(Chunk.NEWLINE);

            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setSpacingBefore(10f);
            table.setSpacingAfter(10f);

            float[] columnWidths = {2f, 2f, 1.5f, 1.5f, 2f, 2f};
            table.setWidths(columnWidths);

            Font headFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            String[] headers = {"From", "To", "Amount", "Type", "Status", "Timestamp"};
            for (String header : headers) {
                PdfPCell hcell = new PdfPCell(new Paragraph(header, headFont));
                hcell.setHorizontalAlignment(Element.ALIGN_CENTER);
                hcell.setBackgroundColor(BaseColor.LIGHT_GRAY);
                table.addCell(hcell);
            }

            Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 10);
            for (TransactionResponseDto dto : transactionResponseDtos) {
                table.addCell(new PdfPCell(new Paragraph(dto.getFromAccount(), cellFont)));
                table.addCell(new PdfPCell(new Paragraph(dto.getToAccount(), cellFont)));
                table.addCell(new PdfPCell(new Paragraph(String.valueOf(dto.getAmount()), cellFont)));
                table.addCell(new PdfPCell(new Paragraph(dto.getType().toString(), cellFont)));
                table.addCell(new PdfPCell(new Paragraph(dto.getStatus().toString(), cellFont)));
                table.addCell(new PdfPCell(new Paragraph(dto.getTimestamp().toString(), cellFont)));
            }

            document.add(table);

            document.close();
        } catch (DocumentException e) {
            e.printStackTrace();
        }
        return outputStream.toByteArray();
    }
}




