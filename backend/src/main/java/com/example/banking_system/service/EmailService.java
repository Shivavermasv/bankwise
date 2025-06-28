package com.example.banking_system.service;

import jakarta.mail.internet.MimeMessage;
import jakarta.mail.util.ByteArrayDataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {
    private final JavaMailSender mailSender;

    public void sendTransactionHistoryPdf(String toEmail, byte[] pdfBytes) throws Exception{
        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper mimeMessageHelper = new MimeMessageHelper(mimeMessage, true);
        mimeMessageHelper.setTo(toEmail);
        mimeMessageHelper.setSubject("Your Monthly Transaction History");
        mimeMessageHelper.setText("Please find attached your transaction history PDF for this month");

        mimeMessageHelper.addAttachment("TransactionHistory.Pdf",
                new ByteArrayDataSource(pdfBytes,"application/pdf"));
        mailSender.send(mimeMessage);
    }
}
