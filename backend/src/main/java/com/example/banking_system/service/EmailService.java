package com.example.banking_system.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Email service with retry capability and async execution.
 * Emails are sent asynchronously to avoid blocking API responses.
 * Failed emails are retried up to 3 times with exponential backoff.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    /**
     * Send a simple text email asynchronously with retry support.
     * Retries 3 times with exponential backoff (1s, 2s, 4s) on failure.
     */
    @Async("emailExecutor")
    @Retryable(
        retryFor = {MailException.class, MessagingException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public void sendEmail(String to, String subject, String text) {
        log.debug("Attempting to send email to={} subject={}", to, subject);
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        mailSender.send(message);
        log.info("Email sent successfully to={} subject={}", to, subject);
    }

    /**
     * Recovery method called when all retry attempts fail for sendEmail.
     */
    @Recover
    public void recoverSendEmail(MailException e, String to, String subject, String text) {
        log.error("All retry attempts failed for email to={} subject={} error={}", to, subject, e.getMessage());
        // Could log to a dead-letter queue or database for manual retry later
    }

    /**
     * Send an email with PDF attachment asynchronously with retry support.
     */
    @Async("emailExecutor")
    @Retryable(
        retryFor = {MailException.class, MessagingException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public void sendTransactionHistoryPdf(String to, byte[] pdfBytes) {
        try {
            log.debug("Attempting to send transaction PDF to={}", to);
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true);
            helper.setTo(to);
            helper.setSubject("Monthly Transaction Statement");
            helper.setText("Please find attached your monthly transaction statement.");
            helper.addAttachment("transaction-history.pdf", new ByteArrayResource(pdfBytes));
            mailSender.send(mimeMessage);
            log.info("Transaction PDF sent successfully to={}", to);
        } catch (MessagingException e) {
            log.warn("Failed to send transaction PDF to={}, will retry", to, e);
            throw new RuntimeException("Failed to send email with attachment", e);
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
        retryFor = {MailException.class, MessagingException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public void sendHtmlEmail(String to, String subject, String htmlContent) {
        try {
            log.debug("Attempting to send HTML email to={} subject={}", to, subject);
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);
            log.info("HTML email sent successfully to={} subject={}", to, subject);
        } catch (MessagingException e) {
            log.warn("Failed to send HTML email to={}, will retry", to, e);
            throw new RuntimeException("Failed to send HTML email", e);
        }
    }

    /**
     * Recovery method for HTML email failures.
     */
    @Recover
    public void recoverSendHtmlEmail(RuntimeException e, String to, String subject, String htmlContent) {
        log.error("All retry attempts failed for HTML email to={} subject={} error={}", to, subject, e.getMessage());
    }
}




