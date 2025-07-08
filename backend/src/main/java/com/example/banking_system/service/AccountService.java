package com.example.banking_system.service;

import com.example.banking_system.dto.KycDetailsRequestDto;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.KycDetails;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.Role;
import com.example.banking_system.enums.VerificationStatus;
import com.example.banking_system.exception.AccountNotFoundException;
import com.example.banking_system.exception.KycProcessingException;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.KycDetailsRepository;
import com.example.banking_system.repository.UserRepository;
import com.lowagie.text.Document;
import com.lowagie.text.Image;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

@Service
public class AccountService {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private KycDetailsRepository kycDetailsRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    public UserRepository userRepository;

    public byte[] generatePdfAndSaveKycDetails(KycDetailsRequestDto kycDetailsRequestDto) {
        try {
            Account account = accountRepository.findByAccountNumber(kycDetailsRequestDto.getAccountId())
                    .orElseThrow(() -> new KycProcessingException("Account not found"));

            if (kycDetailsRequestDto.getAadharNumber() == null ||
                    kycDetailsRequestDto.getPanNumber() == null ||
                    kycDetailsRequestDto.getAddress() == null) {
                throw new KycProcessingException("Incomplete KYC details provided.");
            }

            KycDetails kycDetails = new KycDetails();
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

            return pdf;

        } catch (KycProcessingException e) {
            // Optional: log here if needed
            throw e; // Let GlobalExceptionHandler handle it
        } catch (Exception e) {
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

    public boolean updateAccountStatus(String accountNumber, VerificationStatus verificationStatus) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with number: " + accountNumber));

        account.setVerificationStatus(verificationStatus);
        accountRepository.save(account);

        try {
            notificationService.sendNotification(account.getUser().getEmail(),
                    "Your KYC verification status has been updated to: " + verificationStatus);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send notification", e);
        }

        return true;
    }

    public boolean changeAccountInterestRate(String accountNumber, double newInterestRate) throws Exception {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new RuntimeException("Account not found"));
        account.setInterestRate(newInterestRate);
        accountRepository.save(account);
        notificationService.sendNotification(account.getUser().getEmail(),
                "The interest rate for your account has been updated to: " + newInterestRate);
        return true;
    }

    @Scheduled(cron = "0 0 1 1 * ?")
    @Transactional// Runs at 1 AM on the first day of every month
    public void applyMonthlyInterest() {
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
