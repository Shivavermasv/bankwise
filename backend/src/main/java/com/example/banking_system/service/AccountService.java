package com.example.banking_system.service;

import com.example.banking_system.dto.KycDetailsRequestDto;
import com.example.banking_system.enums.VerificationStatus;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.KycDetails;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.KycDetailsRepository;
import com.lowagie.text.Document;
import com.lowagie.text.Image;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.Objects;

@Service
public class AccountService {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private KycDetailsRepository kycDetailsRepository;

    public byte[] generatePdfAndSaveKycDetails(KycDetailsRequestDto kycDetailsRequestDto) throws Exception{
        Account account = accountRepository.findByAccountNumber(kycDetailsRequestDto.getAccountId())
                .orElseThrow(()->new RuntimeException("Account not found"));

        KycDetails kycDetails = new KycDetails();
        kycDetails.setAccount(account);
        kycDetails.setAadharNumber(kycDetailsRequestDto.getAadharNumber());
        kycDetails.setPanNumber(kycDetailsRequestDto.getPanNumber());
        kycDetails.setAddress(kycDetailsRequestDto.getAddress());
        kycDetails.setUploadedAt(LocalDateTime.now());

        byte[] pdf = generatePdf(kycDetailsRequestDto);
        kycDetails.setKycPdf(pdf);

        kycDetailsRepository.save(kycDetails);

        return pdf;
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

    public boolean updateAccountStatus(String accountNumber, VerificationStatus verificationStatus) throws Exception{
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(()->new RuntimeException("Account not found"));
        account.setVerificationStatus(verificationStatus);
        accountRepository.save(account);
        return true;
    }
}
