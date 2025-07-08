package com.example.banking_system.service;

import com.example.banking_system.dto.TransactionResponseDto;
import com.example.banking_system.dto.TransferRequestDto;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.Transaction;
import com.example.banking_system.enums.TransactionStatus;
import com.example.banking_system.enums.TransactionType;
import com.example.banking_system.enums.VerificationStatus;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.TransactionRepository;
import com.itextpdf.text.BaseColor;
import com.itextpdf.text.Chunk;
import com.itextpdf.text.Document;
import com.itextpdf.text.DocumentException;
import com.itextpdf.text.Element;
import com.itextpdf.text.Font;
import com.itextpdf.text.FontFactory;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class TransactionService {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private EmailService emailService;

    @Transactional
    public String processTransaction(TransferRequestDto transferRequestDto) {
        Account fromAccount = accountRepository
                .findByAccountNumber(transferRequestDto.getFromAccount())
                .orElseThrow(() -> new RuntimeException("From account not found"));
        Account toAccount = accountRepository
                .findByAccountNumber(transferRequestDto.getToAccount())
                .orElseThrow(() -> new RuntimeException("To account not found"));
        if (!toAccount.getVerificationStatus().equals(VerificationStatus.VERIFIED)) {
            return "Destination Account has not been verified";
        }
        TransactionStatus transactionStatus;
        if (fromAccount.getBalance().compareTo(transferRequestDto.getAmount()) >= 0) {
            fromAccount.setBalance(fromAccount.getBalance().subtract(transferRequestDto.getAmount()));
            toAccount.setBalance(toAccount.getBalance().add(transferRequestDto.getAmount()));
            accountRepository.save(fromAccount);
            accountRepository.save(toAccount);
            transactionStatus = TransactionStatus.SUCCESS;
            notificationService.sendNotification(fromAccount.getUser().getEmail(),
                    "You have successfully transferred " + transferRequestDto.getAmount() +
                            " to account " + toAccount.getAccountNumber());
            notificationService.sendNotification(toAccount.getUser().getEmail(),
                    "You have received " + transferRequestDto.getAmount() +
                            " from account " + fromAccount.getAccountNumber());
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
        return transactionStatus.toString();
    }

    public List<TransactionResponseDto> getTransaction(String accountNumber, int page, int pageSize,
                                                       LocalDate startDate, LocalDate endDate) {
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
        transactionResponseDto.setToAccount(transaction.getDestinationAccount().getAccountNumber());
        transactionResponseDto.setType(transaction.getType());
        if (transaction.getType().equals(TransactionType.DEPOSIT) || transaction.getType().equals(TransactionType.WITHDRAW)) {
            transactionResponseDto.setFromAccount("SYSTEM");
        } else {
            transactionResponseDto.setFromAccount(transaction.getSourceAccount().getAccountNumber());
        }
        // If you have a description field, set it here:
        // transactionResponseDto.setDescription(transaction.getDescription());
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

        // Use a thread pool for parallel processing
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
                    System.out.println("Error while sending transaction pdf to " +
                            (account.getUser() != null ? account.getUser().getEmail() : "null") +
                            ": " + e.getMessage());
                }
            });
        }

        // Shutdown and wait for all tasks to finish
        executor.shutdown();
        boolean finished = executor.awaitTermination(30, TimeUnit.MINUTES);
        if (!finished) {
            System.err.println("Not all transaction reports finished sending in time.");
        }
    }

    private byte[] generateTransactionPdf(List<TransactionResponseDto> transactionResponseDtos,
                                          Account account, LocalDate startDate, LocalDate endDate) {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 54, 36); // Margins

        try {
            PdfWriter.getInstance(document, outputStream);
            document.open();

            // Add document info
            document.addAuthor(account.getAccountNumber());
            document.addCreationDate();
            document.addTitle("Monthly Transactions");

            // Title Section
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Paragraph title = new Paragraph("Monthly Transactions Statement", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            document.add(Chunk.NEWLINE);

            // Account & Period Info
            Font infoFont = FontFactory.getFont(FontFactory.HELVETICA, 12);
            document.add(new Paragraph("Account Number: " + account.getAccountNumber(), infoFont));
            document.add(new Paragraph("Period: " + startDate + " - " + endDate, infoFont));
            document.add(Chunk.NEWLINE);

            // Table Setup
            PdfPTable table = new PdfPTable(6); // 6 columns (removed Description for generic DTO)
            table.setWidthPercentage(100);
            table.setSpacingBefore(10f);
            table.setSpacingAfter(10f);

            // Set column widths (optional, but helps)
            float[] columnWidths = {2f, 2f, 1.5f, 1.5f, 2f, 2f};
            table.setWidths(columnWidths);

            // Table Header
            Font headFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            String[] headers = {"From", "To", "Amount", "Type", "Status", "Timestamp"};
            for (String header : headers) {
                PdfPCell hcell = new PdfPCell(new Paragraph(header, headFont));
                hcell.setHorizontalAlignment(Element.ALIGN_CENTER);
                hcell.setBackgroundColor(BaseColor.LIGHT_GRAY);
                table.addCell(hcell);
            }

            // Table Content
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