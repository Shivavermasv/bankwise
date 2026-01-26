package com.example.banking_system.service;

import com.example.banking_system.dto.AdminAccountDto;
import com.example.banking_system.dto.KycDetailsAdminDto;
import com.example.banking_system.dto.KycDocumentData;
import com.example.banking_system.dto.KycDetailsRequestDto;
import com.example.banking_system.dto.TransferRecipientDto;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.KycDetails;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.Role;
import com.example.banking_system.enums.VerificationStatus;
import com.example.banking_system.exception.AccountNotFoundException;
import com.example.banking_system.exception.AccountStatusException;
import com.example.banking_system.exception.KycProcessingException;
import com.example.banking_system.exception.ResourceNotFoundException;
import com.example.banking_system.service.AuditService;
import com.example.banking_system.service.NotificationService;
import com.example.banking_system.service.EmailService;
import com.example.banking_system.repository.AuditLogRepository;
import com.example.banking_system.repository.DepositRepository;
import com.example.banking_system.repository.LoanRepo;
import com.example.banking_system.repository.NotificationRepository;
import com.example.banking_system.repository.TransactionRepository;
import com.example.banking_system.repository.SupportTicketRepository;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.KycDetailsRepository;
import com.example.banking_system.repository.UserRepository;
import com.lowagie.text.Document;
import com.lowagie.text.Image;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@Service
@Slf4j
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final KycDetailsRepository kycDetailsRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final DepositRepository depositRepository;
    private final LoanRepo loanRepo;
    private final TransactionRepository transactionRepository;
    private final NotificationRepository notificationRepository;
    private final SupportTicketRepository supportTicketRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditService auditService;
    private final UserRepository userRepository;

    public byte[] generatePdfAndSaveKycDetails(KycDetailsRequestDto kycDetailsRequestDto) {
        try {
            log.info("Processing KYC for accountId={}", kycDetailsRequestDto.getAccountId());
            Account account = accountRepository.findByAccountNumber(kycDetailsRequestDto.getAccountId())
                    .orElseThrow(() -> new KycProcessingException("Account not found"));

            if (kycDetailsRequestDto.getAadharNumber() == null ||
                    kycDetailsRequestDto.getPanNumber() == null ||
                    kycDetailsRequestDto.getAddress() == null) {
                throw new KycProcessingException("Incomplete KYC details provided.");
            }

                KycDetails kycDetails = kycDetailsRepository.findByAccount_AccountNumber(kycDetailsRequestDto.getAccountId())
                    .orElseGet(KycDetails::new);
                kycDetails.setAccount(account);
                kycDetails.setAadharNumber(kycDetailsRequestDto.getAadharNumber());
                kycDetails.setPanNumber(kycDetailsRequestDto.getPanNumber());
                kycDetails.setAddress(kycDetailsRequestDto.getAddress());
                kycDetails.setUploadedAt(LocalDateTime.now());

            byte[] pdf;
            try {
                pdf = generatePdf(kycDetailsRequestDto);
            } catch (Exception e) {
                throw new KycProcessingException("Failed to generate KYC PDF", e);
            }

            kycDetails.setKycPdf(pdf);
            try {
                if (kycDetailsRequestDto.getAadharDocument() != null && !kycDetailsRequestDto.getAadharDocument().isEmpty()) {
                    byte[] aadharBytes = kycDetailsRequestDto.getAadharDocument().getBytes();
                    kycDetails.setAadharDocument(aadharBytes);
                    kycDetails.setAadharContentType(kycDetailsRequestDto.getAadharDocument().getContentType());
                    log.info("Aadhaar document received size={} contentType={}",
                            aadharBytes.length, kycDetailsRequestDto.getAadharDocument().getContentType());
                } else {
                    log.warn("Aadhaar document missing or empty for accountId={}", kycDetailsRequestDto.getAccountId());
                }
                if (kycDetailsRequestDto.getPanDocument() != null && !kycDetailsRequestDto.getPanDocument().isEmpty()) {
                    byte[] panBytes = kycDetailsRequestDto.getPanDocument().getBytes();
                    kycDetails.setPanDocument(panBytes);
                    kycDetails.setPanContentType(kycDetailsRequestDto.getPanDocument().getContentType());
                    log.info("PAN document received size={} contentType={}",
                            panBytes.length, kycDetailsRequestDto.getPanDocument().getContentType());
                } else {
                    log.warn("PAN document missing or empty for accountId={}", kycDetailsRequestDto.getAccountId());
                }
            } catch (Exception e) {
                throw new KycProcessingException("Failed to read KYC documents", e);
            }

            try {
                kycDetailsRepository.save(kycDetails);
            } catch (Exception e) {
                throw new KycProcessingException("Database error while saving KYC", e);
            }

            try {
                notificationService.sendNotification(account.getUser().getEmail(),
                        "Your KYC details have been successfully uploaded and are under review.");
                for (User user : userRepository.findByRole(Role.ADMIN)) {
                    notificationService.sendNotification(user.getEmail(),
                            "A new KYC request has been submitted for account: " + kycDetailsRequestDto.getAccountId());
                }
            } catch (Exception e) {
                throw new KycProcessingException("Failed to send KYC notifications", e);
            }

            auditService.record("KYC_SUBMIT", "ACCOUNT", kycDetailsRequestDto.getAccountId(), "PENDING",
                    "KYC submitted");

            return pdf;

        } catch (KycProcessingException e) {
            log.warn("KYC processing failed: {}", e.getMessage());
            throw e; // Let GlobalExceptionHandler handle it
        } catch (Exception e) {
            log.error("Unexpected error during KYC processing", e);
            throw new KycProcessingException("Unexpected error during KYC processing", e);
        }
    }

    private byte[] generatePdf(KycDetailsRequestDto kycDetailsRequestDto) throws Exception{
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        Document  document = new Document();
        PdfWriter.getInstance(document, byteArrayOutputStream);
        document.open();

        document.add(new Paragraph("Account Kyc Details"));
        document.add(new Paragraph("----------------------------------------------------"));
        document.add(new Paragraph("Account Number: "+ kycDetailsRequestDto.getAccountId()));
        document.add(new Paragraph("Account Pan Number: "+ kycDetailsRequestDto.getPanNumber()));
        document.add(new Paragraph("Account Address: "+ kycDetailsRequestDto.getAddress()));
        document.add(new Paragraph("\nAttached Documents:"));

        MultipartFile aadhar = kycDetailsRequestDto.getAadharDocument();
        MultipartFile pan = kycDetailsRequestDto.getPanDocument();
        if(!aadhar.isEmpty() && Objects.requireNonNull(aadhar.getContentType()).startsWith("image")){
            Image image = Image.getInstance(aadhar.getBytes());
            image.scaleToFit(400, 400);
            document.add(new Paragraph("\nAadhar Document:"));
            document.add(image);
        }
        if(!pan.isEmpty() && Objects.requireNonNull(pan.getContentType()).startsWith("image")){
            Image image = Image.getInstance(pan.getBytes());
            image.scaleToFit(400, 400);
            document.add(new Paragraph("\nPAN Document:"));
            document.add(image);
        }
        document.close();
        return byteArrayOutputStream.toByteArray();
    }

    @Transactional
    public boolean updateAccountStatus(String accountNumber, VerificationStatus verificationStatus) {
        log.info("Updating account status accountNumber={} status={}", accountNumber, verificationStatus);
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with number: " + accountNumber));
        VerificationStatus current = account.getVerificationStatus();
        if (current == VerificationStatus.DISABLED && verificationStatus != VerificationStatus.DISABLED) {
            throw new AccountStatusException("Disabled accounts cannot be reactivated");
        }
        if (current == verificationStatus) {
            return true; // idempotent
        }
        // Allow basic transitions only
        if (current == VerificationStatus.PENDING && !(verificationStatus == VerificationStatus.VERIFIED || verificationStatus == VerificationStatus.REJECTED)) {
            throw new AccountStatusException("Invalid status transition from PENDING");
        }
        if (current == VerificationStatus.VERIFIED && !(verificationStatus == VerificationStatus.SUSPENDED || verificationStatus == VerificationStatus.DISABLED)) {
            throw new AccountStatusException("Invalid status transition from VERIFIED");
        }
        if (current == VerificationStatus.SUSPENDED && !(verificationStatus == VerificationStatus.VERIFIED || verificationStatus == VerificationStatus.DISABLED)) {
            throw new AccountStatusException("Invalid status transition from SUSPENDED");
        }
        if (verificationStatus == VerificationStatus.DISABLED) {
            String userEmail = account.getUser() != null ? account.getUser().getEmail() : null;
            String userName = account.getUser() != null ? account.getUser().getName() : "Customer";
            String subject = "Account Disabled and Data Removed";
            String body = "Hello " + userName + ",\n\n" +
                    "Your account " + accountNumber + " has been disabled by admin. " +
                    "As requested by policy, all data tied to this account has been removed.\n\n" +
                    "If you believe this is a mistake, please contact support.\n\n" +
                    "- Bankwise Support";
            if (userEmail != null) {
                emailService.sendEmail(userEmail, subject, body);
            }

            // Delete account-related data
            kycDetailsRepository.deleteByAccount_AccountNumber(accountNumber);
            depositRepository.deleteByAccount_AccountNumber(accountNumber);
            loanRepo.deleteByBankAccount_AccountNumber(accountNumber);
            transactionRepository.deleteBySourceAccount_AccountNumber(accountNumber);
            transactionRepository.deleteByDestinationAccount_AccountNumber(accountNumber);
            supportTicketRepository.deleteByAccountNumber(accountNumber);
            if (userEmail != null) {
                notificationRepository.deleteByUser_Email(userEmail);
            }
            auditLogRepository.deleteByTargetTypeAndTargetId("ACCOUNT", accountNumber);

            // Finally delete the account
            accountRepository.delete(account);

            auditService.recordSystem("ACCOUNT_DELETE", "ACCOUNT", accountNumber, "DELETED",
                    "Account disabled and data removed");
            return true;
        }

        account.setVerificationStatus(verificationStatus);
        accountRepository.save(account);

        try {
            notificationService.sendNotification(account.getUser().getEmail(),
                    "Your KYC verification status has been updated to: " + verificationStatus);
        } catch (Exception e) {
            log.error("Failed to send notification for account status update", e);
            throw new RuntimeException("Failed to send notification", e);
        }

        auditService.record("ACCOUNT_STATUS_UPDATE", "ACCOUNT", accountNumber, verificationStatus.name(),
                "from=" + current + " to=" + verificationStatus);

        return true;
    }

    public boolean changeAccountInterestRate(String accountNumber, double newInterestRate) throws Exception {
        log.info("Updating interest rate accountNumber={} newInterestRate={}", accountNumber, newInterestRate);
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new RuntimeException("Account not found"));
        account.setInterestRate(newInterestRate);
        accountRepository.save(account);
        auditService.record("ACCOUNT_INTEREST_UPDATE", "ACCOUNT", accountNumber, "SUCCESS",
            "rate=" + newInterestRate);
        notificationService.sendNotification(account.getUser().getEmail(),
                "The interest rate for your account has been updated to: " + newInterestRate);
        return true;
    }

    public List<AdminAccountDto> listAccountsForAdmin(String status, String q) {
        VerificationStatus verificationStatus = null;
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            verificationStatus = VerificationStatus.valueOf(status.toUpperCase());
        }
        String query = (q == null || q.isBlank()) ? null : q.trim();

        return accountRepository.searchAccounts(verificationStatus, query)
                .stream()
                .map(account -> new AdminAccountDto(
                        account.getId(),
                        account.getAccountNumber(),
                        account.getBalance(),
                        account.getVerificationStatus(),
                        account.getAccountType(),
                        account.getInterestRate(),
                        account.getUser() != null ? account.getUser().getId() : null,
                        account.getUser() != null ? account.getUser().getName() : null,
                        account.getUser() != null ? account.getUser().getEmail() : null,
                        account.getUser() != null ? account.getUser().getPhone() : null,
                        account.getUser() != null ? account.getUser().getRole() : null
                ))
                .toList();
    }

    public KycDetailsAdminDto getKycDetailsForAdmin(String accountNumber) throws ResourceNotFoundException {
        Account account = accountRepository.findByAccountNumber(accountNumber)
            .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        Optional<KycDetailsAdminDto> kycOpt = kycDetailsRepository.findAdminDtoByAccountNumber(accountNumber);
        if (kycOpt.isEmpty()) {
            throw new ResourceNotFoundException("KYC details not found for account");
        }
        return kycOpt.get();
    }

    @Transactional(readOnly = true)
    public byte[] getKycPdfForAdmin(String accountNumber) throws ResourceNotFoundException {
        Optional<KycDetails> kycOpt = kycDetailsRepository.findByAccount_AccountNumber(accountNumber);
        if (kycOpt.isEmpty()) {
            throw new ResourceNotFoundException("KYC details not found for account");
        }
        byte[] pdf = kycOpt.get().getKycPdf();
        if (pdf == null || pdf.length == 0) {
            throw new ResourceNotFoundException("KYC PDF not available");
        }
        return pdf;
    }

    @Transactional(readOnly = true)
    public KycDocumentData getKycDocumentForAdmin(String accountNumber, String type) throws ResourceNotFoundException {
        Optional<KycDetails> kycOpt = kycDetailsRepository.findByAccount_AccountNumber(accountNumber);
        if (kycOpt.isEmpty()) {
            throw new ResourceNotFoundException("KYC details not found for account");
        }
        KycDetails kyc = kycOpt.get();
        if ("aadhar".equalsIgnoreCase(type)) {
            byte[] data = kyc.getAadharDocument();
            if (data == null || data.length == 0) {
                throw new ResourceNotFoundException("Aadhaar document not available");
            }
            return new KycDocumentData(data, kyc.getAadharContentType(), "aadhar");
        }
        if ("pan".equalsIgnoreCase(type)) {
            byte[] data = kyc.getPanDocument();
            if (data == null || data.length == 0) {
                throw new ResourceNotFoundException("PAN document not available");
            }
            return new KycDocumentData(data, kyc.getPanContentType(), "pan");
        }
        throw new ResourceNotFoundException("Unknown document type");
    }

    public List<TransferRecipientDto> searchRecipients(String query) {
        String q = query == null ? "" : query.trim();
        if (q.isEmpty()) {
            return List.of();
        }
        Pageable pageable = PageRequest.of(0, 8);
        boolean isNumeric = Pattern.matches("\\d+", q);
        List<Account> accounts;
        if (isNumeric) {
            accounts = accountRepository
                    .searchRecipientsByAccountOrPhone(VerificationStatus.VERIFIED, q, pageable)
                    .getContent();
        } else {
            accounts = accountRepository
                    .searchRecipientsByName(VerificationStatus.VERIFIED, q, pageable)
                    .getContent();
        }
        return accounts.stream()
                .map(acc -> {
                    var builder = TransferRecipientDto.builder()
                        .name(acc.getUser() != null ? acc.getUser().getName() : "-")
                        .phone(acc.getUser() != null ? acc.getUser().getPhone() : "-")
                        .accountNumber(acc.getAccountNumber())
                        .bank("Bankwise");
                    
                    // Add profile photo if available
                    if (acc.getUser() != null && acc.getUser().getProfilePhoto() != null) {
                        builder.profilePhoto(java.util.Base64.getEncoder().encodeToString(acc.getUser().getProfilePhoto()));
                        builder.profilePhotoContentType(acc.getUser().getProfilePhotoContentType());
                    }
                    
                    return builder.build();
                })
                .toList();
    }

    @Scheduled(cron = "0 0 1 1 * ?")
    @Transactional// Runs at 1 AM on the first day of every month
    public void applyMonthlyInterest() {
        log.info("Applying monthly interest to verified accounts");
        for (Account account : accountRepository.findAll()) {
            if (account.getVerificationStatus() == VerificationStatus.VERIFIED) {
                BigDecimal interest = account.getBalance().multiply(BigDecimal.valueOf(account.getInterestRate()));
                account.setBalance(account.getBalance().add(interest));
                accountRepository.save(account);
                notificationService.sendNotification(account.getUser().getEmail(),
                        "Your monthly interest of " + interest + " has been credited to your account.");
            }
        }
    }
}




