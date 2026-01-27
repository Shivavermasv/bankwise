package com.example.banking_system.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import sendinblue.ApiClient;
import sendinblue.ApiException;
import sendinblue.Configuration;
import sendinblue.auth.ApiKeyAuth;
import sibApi.TransactionalEmailsApi;
import sibModel.CreateSmtpEmail;
import sibModel.SendSmtpEmail;
import sibModel.SendSmtpEmailAttachment;
import sibModel.SendSmtpEmailSender;
import sibModel.SendSmtpEmailTo;

import jakarta.annotation.PostConstruct;
import java.util.Base64;
import java.util.Collections;
import java.util.List;

/**
 * Email service using Brevo (Sendinblue) API.
 * Brevo offers 300 free transactional emails per day.
 * Works on cloud platforms like Render where SMTP is blocked.
 */
@Service
@Slf4j
public class EmailService {

    @Value("${brevo.api.key:}")
    private String brevoApiKey;

    @Value("${brevo.sender.email:noreply@bankwise.com}")
    private String senderEmail;

    @Value("${brevo.sender.name:BankWise}")
    private String senderName;

    private TransactionalEmailsApi emailApi;
    private boolean isConfigured = false;

    @PostConstruct
    public void init() {
        if (brevoApiKey != null && !brevoApiKey.isBlank()) {
            ApiClient defaultClient = Configuration.getDefaultApiClient();
            ApiKeyAuth apiKey = (ApiKeyAuth) defaultClient.getAuthentication("api-key");
            apiKey.setApiKey(brevoApiKey);
            emailApi = new TransactionalEmailsApi();
            isConfigured = true;
            log.info("Brevo email service initialized successfully");
        } else {
            log.warn("Brevo API key not configured - emails will be logged only");
        }
    }

    /**
     * Send a simple text email asynchronously with retry support.
     * Retries 3 times with exponential backoff (1s, 2s, 4s) on failure.
     */
    @Async("emailExecutor")
    @Retryable(
        retryFor = {ApiException.class, RuntimeException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public void sendEmail(String to, String subject, String text) {
        log.debug("Attempting to send email to={} subject={}", to, subject);
        
        if (!isConfigured) {
            log.info("[EMAIL LOG] To: {} | Subject: {} | Body: {}", to, subject, text);
            return;
        }

        try {
            SendSmtpEmail email = new SendSmtpEmail();
            email.setSender(createSender());
            email.setTo(createRecipients(to));
            email.setSubject(subject);
            email.setTextContent(text);

            CreateSmtpEmail result = emailApi.sendTransacEmail(email);
            log.info("Email sent successfully to={} subject={} messageId={}", to, subject, result.getMessageId());
        } catch (ApiException e) {
            log.warn("Failed to send email to={} subject={} error={}", to, subject, e.getMessage());
            throw new RuntimeException("Failed to send email via Brevo", e);
        }
    }

    /**
     * Recovery method called when all retry attempts fail for sendEmail.
     */
    @Recover
    public void recoverSendEmail(RuntimeException e, String to, String subject, String text) {
        log.error("All retry attempts failed for email to={} subject={} error={}", to, subject, e.getMessage());
        // Log the email content so it's not lost
        log.info("[FAILED EMAIL] To: {} | Subject: {} | Body: {}", to, subject, text);
    }

    /**
     * Send an email with PDF attachment asynchronously with retry support.
     */
    @Async("emailExecutor")
    @Retryable(
        retryFor = {ApiException.class, RuntimeException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public void sendTransactionHistoryPdf(String to, byte[] pdfBytes) {
        log.debug("Attempting to send transaction PDF to={}", to);
        
        if (!isConfigured) {
            log.info("[EMAIL LOG] PDF attachment to: {} | Size: {} bytes", to, pdfBytes.length);
            return;
        }

        try {
            SendSmtpEmail email = new SendSmtpEmail();
            email.setSender(createSender());
            email.setTo(createRecipients(to));
            email.setSubject("Monthly Transaction Statement");
            email.setTextContent("Please find attached your monthly transaction statement.");


            // Add PDF attachment (Base64 encoded)
            SendSmtpEmailAttachment attachment = new SendSmtpEmailAttachment();
            attachment.setName("transaction-history.pdf");
            attachment.setContent(Base64.getEncoder().encodeToString(pdfBytes).getBytes());
            email.setAttachment(Collections.singletonList(attachment));

            CreateSmtpEmail result = emailApi.sendTransacEmail(email);
            log.info("Transaction PDF sent successfully to={} messageId={}", to, result.getMessageId());
        } catch (ApiException e) {
            log.warn("Failed to send transaction PDF to={} error={}", to, e.getMessage());
            throw new RuntimeException("Failed to send email with attachment via Brevo", e);
        }
    }

    /**
     * Recovery method for PDF email failures.
     */
    @Recover
    public void recoverSendPdf(RuntimeException e, String to, byte[] pdfBytes) {
        log.error("All retry attempts failed for PDF email to={} error={}", to, e.getMessage());
    }

    /**
     * Send HTML email asynchronously with retry support.
     */
    @Async("emailExecutor")
    @Retryable(
        retryFor = {ApiException.class, RuntimeException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public void sendHtmlEmail(String to, String subject, String htmlContent) {
        log.debug("Attempting to send HTML email to={} subject={}", to, subject);
        
        if (!isConfigured) {
            log.info("[EMAIL LOG] HTML to: {} | Subject: {} | Content length: {} chars", to, subject, htmlContent.length());
            return;
        }

        try {
            SendSmtpEmail email = new SendSmtpEmail();
            email.setSender(createSender());
            email.setTo(createRecipients(to));
            email.setSubject(subject);
            email.setHtmlContent(htmlContent);

            CreateSmtpEmail result = emailApi.sendTransacEmail(email);
            log.info("HTML email sent successfully to={} subject={} messageId={}", to, subject, result.getMessageId());
        } catch (ApiException e) {
            log.warn("Failed to send HTML email to={} subject={} error={}", to, subject, e.getMessage());
            throw new RuntimeException("Failed to send HTML email via Brevo", e);
        }
    }

    /**
     * Recovery method for HTML email failures.
     */
    @Recover
    public void recoverSendHtmlEmail(RuntimeException e, String to, String subject, String htmlContent) {
        log.error("All retry attempts failed for HTML email to={} subject={} error={}", to, subject, e.getMessage());
        log.info("[FAILED EMAIL] HTML to: {} | Subject: {}", to, subject);
    }

    private SendSmtpEmailSender createSender() {
        SendSmtpEmailSender sender = new SendSmtpEmailSender();
        sender.setEmail(senderEmail);
        sender.setName(senderName);
        return sender;
    }

    private List<SendSmtpEmailTo> createRecipients(String to) {
        SendSmtpEmailTo recipient = new SendSmtpEmailTo();
        recipient.setEmail(to);
        return Collections.singletonList(recipient);
    }
}




