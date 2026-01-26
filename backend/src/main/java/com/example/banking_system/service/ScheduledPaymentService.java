package com.example.banking_system.service;

import com.example.banking_system.dto.TransferRequestDto;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.ScheduledPayment;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.PaymentFrequency;
import com.example.banking_system.enums.ScheduledPaymentStatus;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.ScheduledPaymentRepository;
import com.example.banking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class ScheduledPaymentService {

    private final ScheduledPaymentRepository scheduledPaymentRepository;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransactionService transactionService;
    private final NotificationService notificationService;
    private final EmailService emailService;

    /**
     * Get all scheduled payments for a user
     */
    public List<ScheduledPayment> getScheduledPayments(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return scheduledPaymentRepository.findByUserOrderByNextExecutionDateAsc(user);
    }

    /**
     * Get active scheduled payments
     */
    public List<ScheduledPayment> getActivePayments(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return scheduledPaymentRepository.findByUserAndStatusOrderByNextExecutionDateAsc(user, ScheduledPaymentStatus.ACTIVE);
    }

    /**
     * Schedule a transfer
     */
    @Transactional
    public ScheduledPayment scheduleTransfer(String userEmail, String fromAccountNumber,
                                              String toAccountNumber, String beneficiaryName,
                                              BigDecimal amount, String description,
                                              PaymentFrequency frequency, LocalDate startDate,
                                              LocalDate endDate, Integer maxExecutions) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Account fromAccount = accountRepository.findByAccountNumber(fromAccountNumber)
                .orElseThrow(() -> new RuntimeException("From account not found"));

        if (!fromAccount.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Account does not belong to user");
        }

        // Validate to account exists
        accountRepository.findByAccountNumber(toAccountNumber)
                .orElseThrow(() -> new RuntimeException("Recipient account not found"));

        ScheduledPayment payment = ScheduledPayment.builder()
                .user(user)
                .fromAccount(fromAccount)
                .toAccountNumber(toAccountNumber)
                .beneficiaryName(beneficiaryName)
                .amount(amount)
                .description(description)
                .frequency(frequency)
                .startDate(startDate)
                .endDate(endDate)
                .nextExecutionDate(startDate)
                .maxExecutions(maxExecutions)
                .status(ScheduledPaymentStatus.ACTIVE)
                .build();

        log.info("Scheduled transfer of {} to {} for user {}", amount, toAccountNumber, userEmail);
        return scheduledPaymentRepository.save(payment);
    }

    /**
     * Schedule a bill payment
     */
    @Transactional
    public ScheduledPayment scheduleBillPayment(String userEmail, String fromAccountNumber,
                                                 String billerName, String billerCategory,
                                                 String billerId, String consumerNumber,
                                                 BigDecimal amount, PaymentFrequency frequency,
                                                 LocalDate startDate, LocalDate endDate) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Account fromAccount = accountRepository.findByAccountNumber(fromAccountNumber)
                .orElseThrow(() -> new RuntimeException("From account not found"));

        if (!fromAccount.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Account does not belong to user");
        }

        ScheduledPayment payment = ScheduledPayment.builder()
                .user(user)
                .fromAccount(fromAccount)
                .billerName(billerName)
                .billerCategory(billerCategory)
                .billerId(billerId)
                .consumerNumber(consumerNumber)
                .amount(amount)
                .description("Bill payment - " + billerName)
                .frequency(frequency)
                .startDate(startDate)
                .endDate(endDate)
                .nextExecutionDate(startDate)
                .status(ScheduledPaymentStatus.ACTIVE)
                .build();

        log.info("Scheduled bill payment of {} to {} for user {}", amount, billerName, userEmail);
        return scheduledPaymentRepository.save(payment);
    }

    /**
     * Pause a scheduled payment
     */
    @Transactional
    public ScheduledPayment pausePayment(String userEmail, Long paymentId) {
        ScheduledPayment payment = getAndValidatePayment(userEmail, paymentId);
        payment.setStatus(ScheduledPaymentStatus.PAUSED);
        return scheduledPaymentRepository.save(payment);
    }

    /**
     * Resume a paused payment
     */
    @Transactional
    public ScheduledPayment resumePayment(String userEmail, Long paymentId) {
        ScheduledPayment payment = getAndValidatePayment(userEmail, paymentId);
        if (payment.getStatus() != ScheduledPaymentStatus.PAUSED) {
            throw new RuntimeException("Payment is not paused");
        }
        payment.setStatus(ScheduledPaymentStatus.ACTIVE);
        return scheduledPaymentRepository.save(payment);
    }

    /**
     * Cancel a scheduled payment
     */
    @Transactional
    public void cancelPayment(String userEmail, Long paymentId) {
        ScheduledPayment payment = getAndValidatePayment(userEmail, paymentId);
        payment.setStatus(ScheduledPaymentStatus.CANCELLED);
        scheduledPaymentRepository.save(payment);
        log.info("Cancelled scheduled payment {} for user {}", paymentId, userEmail);
    }

    /**
     * Get upcoming payments summary
     */
    public Map<String, Object> getUpcomingSummary(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        LocalDate today = LocalDate.now();
        LocalDate nextWeek = today.plusWeeks(1);
        LocalDate nextMonth = today.plusMonths(1);

        BigDecimal weeklyTotal = scheduledPaymentRepository.sumUpcomingPayments(user, today, nextWeek);
        BigDecimal monthlyTotal = scheduledPaymentRepository.sumUpcomingPayments(user, today, nextMonth);
        long activeCount = scheduledPaymentRepository.countByUserAndStatus(user, ScheduledPaymentStatus.ACTIVE);

        return Map.of(
            "activePayments", activeCount,
            "upcomingThisWeek", weeklyTotal != null ? weeklyTotal : BigDecimal.ZERO,
            "upcomingThisMonth", monthlyTotal != null ? monthlyTotal : BigDecimal.ZERO
        );
    }

    /**
     * Execute scheduled payments (called by scheduler)
     */
    @Scheduled(cron = "0 0 6 * * *") // Run at 6 AM every day
    @Transactional
    public void executeScheduledPayments() {
        log.info("Starting scheduled payment execution");
        List<ScheduledPayment> duePayments = scheduledPaymentRepository.findPaymentsDueForExecution(LocalDate.now());

        for (ScheduledPayment payment : duePayments) {
            try {
                executePayment(payment);
            } catch (Exception e) {
                log.error("Failed to execute scheduled payment {}: {}", payment.getId(), e.getMessage());
                payment.recordFailure(e.getMessage());
                scheduledPaymentRepository.save(payment);

                if (payment.getNotifyOnFailure()) {
                    notifyPaymentFailure(payment, e.getMessage());
                }
            }
        }
        log.info("Completed scheduled payment execution. Processed {} payments", duePayments.size());
    }

    private void executePayment(ScheduledPayment payment) {
        Account fromAccount = payment.getFromAccount();

        // Check balance
        if (!fromAccount.canWithdraw(payment.getAmount())) {
            throw new RuntimeException("Insufficient funds");
        }

        if (payment.getToAccountNumber() != null) {
            // Transfer payment
            TransferRequestDto transferRequest = new TransferRequestDto(
                fromAccount.getAccountNumber(),
                payment.getToAccountNumber(),
                payment.getAmount()
            );
            transactionService.processTransaction(transferRequest);
        } else if (payment.getBillerName() != null) {
            // Bill payment (simulated - deduct from account)
            fromAccount.withdraw(payment.getAmount());
            accountRepository.save(fromAccount);
            log.info("Processed bill payment of {} to {}", payment.getAmount(), payment.getBillerName());
        }

        payment.recordExecution();
        scheduledPaymentRepository.save(payment);

        if (payment.getNotifyOnExecution()) {
            notifyPaymentSuccess(payment);
        }
    }

    private ScheduledPayment getAndValidatePayment(String userEmail, Long paymentId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ScheduledPayment payment = scheduledPaymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Scheduled payment not found"));

        if (!payment.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        return payment;
    }

    private void notifyPaymentSuccess(ScheduledPayment payment) {
        String message = String.format("Scheduled payment of ₹%s to %s executed successfully",
                payment.getAmount(),
                payment.getToAccountNumber() != null ? payment.getBeneficiaryName() : payment.getBillerName());
        notificationService.sendNotification(payment.getUser().getEmail(), message);
    }

    private void notifyPaymentFailure(ScheduledPayment payment, String reason) {
        String message = String.format("Scheduled payment of ₹%s failed: %s", payment.getAmount(), reason);
        notificationService.sendNotification(payment.getUser().getEmail(), message);
        
        // Also send email
        try {
            emailService.sendEmail(
                payment.getUser().getEmail(),
                "Scheduled Payment Failed - BankWise",
                String.format("Dear %s,\n\nYour scheduled payment of ₹%s to %s has failed.\n\nReason: %s\n\nPlease check your account balance and try again.\n\nRegards,\nBankWise Team",
                    payment.getUser().getName(),
                    payment.getAmount(),
                    payment.getToAccountNumber() != null ? payment.getBeneficiaryName() : payment.getBillerName(),
                    reason)
            );
        } catch (Exception e) {
            log.error("Failed to send payment failure email: {}", e.getMessage());
        }
    }
}
