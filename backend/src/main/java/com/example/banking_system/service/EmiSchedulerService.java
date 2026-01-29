package com.example.banking_system.service;

import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.LoanRequest;
import com.example.banking_system.entity.Transaction;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.LoanStatus;
import com.example.banking_system.enums.TransactionType;
import com.example.banking_system.repository.LoanRepo;
import com.example.banking_system.repository.TransactionRepository;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Service for handling automatic EMI deductions for loans.
 * Runs daily to process due EMIs and update credit scores.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmiSchedulerService {

    private final LoanRepo loanRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final IdempotencyService idempotencyService;
    private final CacheEvictionService cacheEvictionService;

    // Credit score adjustments
    private static final int EARLY_PAYMENT_BONUS = 2;      // +2 for early payment
    private static final int ON_TIME_PAYMENT_BONUS = 1;    // +1 for on-time payment
    private static final int LATE_PAYMENT_PENALTY = -5;    // -5 for late payment (up to 7 days)
    private static final int MISSED_PAYMENT_PENALTY = -10; // -10 for missed payment (>7 days)
    private static final int GRACE_PERIOD_DAYS = 3;        // Grace period before penalty
    private static final int LATE_THRESHOLD_DAYS = 7;      // Days after which it's considered missed

    /**
     * Scheduled job that runs every day at 6:00 AM to process EMI payments.
     * Also sends reminders for upcoming EMIs.
     */
    @Scheduled(cron = "0 0 6 * * ?")
    @Transactional
    public void processScheduledEmis() {
        log.info("Starting scheduled EMI processing at {}", LocalDateTime.now());
        
        LocalDate today = LocalDate.now();
        
        // Send reminders for EMIs due in 3 days
        sendUpcomingEmiReminders(today.plusDays(3));
        
        // Process EMIs due today
        processEmisDueOn(today);
        
        // Process overdue EMIs (with late penalties)
        processOverdueEmis(today);
        
        log.info("Completed scheduled EMI processing");
    }

    /**
     * Process EMIs that are due on a specific date.
     */
    @Transactional
    public void processEmisDueOn(LocalDate dueDate) {
        List<LoanRequest> dueLoanList = loanRepository.findLoansWithEmiDueOn(dueDate);
        log.info("Found {} loans with EMI due on {}", dueLoanList.size(), dueDate);
        
        for (LoanRequest loan : dueLoanList) {
            if (!Boolean.TRUE.equals(loan.getAutoDebitEnabled())) {
                log.debug("Auto-debit disabled for loan {}, skipping", loan.getId());
                continue;
            }
            
            processEmiPayment(loan, dueDate);
        }
    }

    /**
     * Process a single EMI payment for a loan with idempotency to prevent duplicate deductions.
     */
    @Transactional
    public EmiPaymentResult processEmiPayment(LoanRequest loan, LocalDate dueDate) {
        // Generate idempotency key: emi::loanId::dueDate to ensure only one deduction per loan per date
        String idempotencyKey = "emi::" + loan.getId() + "::" + dueDate;
        
        // Check if this EMI payment was already processed
        String cachedResult = idempotencyService.getResult(idempotencyKey);
        if (cachedResult != null) {
            log.info("Idempotent EMI payment detected for loan {} on {}, returning cached result", 
                     loan.getId(), dueDate);
            try {
                return new com.fasterxml.jackson.databind.ObjectMapper().readValue(cachedResult, EmiPaymentResult.class);
            } catch (Exception e) {
                log.warn("Failed to deserialize cached EMI result", e);
            }
        }
        
        // Acquire lock to ensure only one thread processes this EMI
        boolean locked = idempotencyService.acquireIdempotencyLock(idempotencyKey);
        if (!locked) {
            log.warn("Could not acquire lock for EMI payment: {}, skipping", idempotencyKey);
            return new EmiPaymentResult(false, "EMI payment already in progress");
        }
        
        try {
            Account account = loan.getBankAccount();
            User user = account.getUser();
            BigDecimal emiAmount = loan.getEmiAmount();
            
            if (emiAmount == null || emiAmount.compareTo(BigDecimal.ZERO) <= 0) {
                log.warn("Invalid EMI amount for loan {}", loan.getId());
                return new EmiPaymentResult(false, "Invalid EMI amount");
            }

            // Check if sufficient balance (including overdraft)
            BigDecimal availableBalance = getAvailableBalance(account);
            
            LocalDate today = LocalDate.now();
            boolean isEarlyPayment = dueDate.isAfter(today);
            boolean isOnTime = dueDate.equals(today) || (dueDate.isBefore(today) && 
                               dueDate.plusDays(GRACE_PERIOD_DAYS).isAfter(today));
            boolean isLate = dueDate.plusDays(GRACE_PERIOD_DAYS).isBefore(today) || 
                             dueDate.plusDays(GRACE_PERIOD_DAYS).equals(today);
            boolean isMissed = dueDate.plusDays(LATE_THRESHOLD_DAYS).isBefore(today);

            EmiPaymentResult result;
            if (availableBalance.compareTo(emiAmount) >= 0) {
                // Sufficient balance - process payment
                result = processSuccessfulEmiPayment(loan, account, user, emiAmount, isEarlyPayment, isOnTime);
            } else {
                // Insufficient balance - handle failure
                result = handleInsufficientBalance(loan, account, user, emiAmount, availableBalance, isLate, isMissed);
            }
            
            // Cache the result for 24 hours to ensure idempotency
            // storeResult() also releases the lock
            boolean resultStored = false;
            try {
                String resultJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(result);
                idempotencyService.storeResult(idempotencyKey, resultJson);
                resultStored = true;
            } catch (Exception e) {
                log.warn("Failed to serialize EMI result for caching", e);
            }
            
            // Evict EMI cache to refresh dashboard
            cacheEvictionService.evictByOperationType("EMI", user.getEmail(), account.getAccountNumber());
            
            // Release lock if result was not stored (storeResult handles its own lock release)
            if (!resultStored) {
                idempotencyService.releaseLock(idempotencyKey);
            }
            
            return result;
        } catch (Exception e) {
            log.error("Error processing EMI payment for loan {} on {}: {}", loan.getId(), dueDate, e.getMessage());
            idempotencyService.releaseLock(idempotencyKey);
            throw e;
        }
    }

    /**
     * Process a successful EMI payment.
     */
    private EmiPaymentResult processSuccessfulEmiPayment(LoanRequest loan, Account account, 
            User user, BigDecimal emiAmount, boolean isEarlyPayment, boolean isOnTime) {
        
        // Deduct from account
        deductFromAccount(account, emiAmount);
        
        // Update loan status
        loan.incrementEmisPaid();
        loan.setLastEmiPaidDate(LocalDate.now());
        loan.setRemainingPrincipal(loan.getRemainingPrincipal().subtract(
            calculatePrincipalPortion(loan, emiAmount)));
        loan.calculateNextEmiDate();
        
        // Check if loan is fully paid
        if (loan.isFullyPaid()) {
            loan.setStatus(LoanStatus.FULLY_PAID);
            log.info("Loan {} fully paid", loan.getId());
        }
        
        // Update credit score
        int creditScoreChange;
        String paymentType;
        if (isEarlyPayment) {
            creditScoreChange = EARLY_PAYMENT_BONUS;
            paymentType = "early";
        } else if (isOnTime) {
            creditScoreChange = ON_TIME_PAYMENT_BONUS;
            paymentType = "on-time";
        } else {
            creditScoreChange = 0;
            paymentType = "late (within grace period)";
        }
        
        updateCreditScore(user, creditScoreChange);
        
        // Create transaction record
        createEmiTransaction(account, emiAmount, loan.getId(), true);
        
        // Save entities
        loanRepository.save(loan);
        accountRepository.save(account);
        
        // Send confirmation email
        sendEmiPaymentConfirmation(user, loan, emiAmount, paymentType);
        
        log.info("EMI payment successful for loan {}, user {}, amount {}, type: {}", 
                 loan.getId(), user.getEmail(), emiAmount, paymentType);
        
        return new EmiPaymentResult(true, "EMI payment successful (" + paymentType + ")");
    }

    /**
     * Handle insufficient balance scenario.
     */
    private EmiPaymentResult handleInsufficientBalance(LoanRequest loan, Account account, 
            User user, BigDecimal emiAmount, BigDecimal availableBalance, boolean isLate, boolean isMissed) {
        
        if (isMissed) {
            // Missed payment - apply penalty
            loan.incrementMissedEmis();
            updateCreditScore(user, MISSED_PAYMENT_PENALTY);
            loanRepository.save(loan);
            
            sendMissedEmiNotification(user, loan, emiAmount);
            log.warn("EMI payment missed for loan {}, user {}", loan.getId(), user.getEmail());
            
            return new EmiPaymentResult(false, "EMI payment missed - credit score reduced by " + 
                                        Math.abs(MISSED_PAYMENT_PENALTY));
        } else if (isLate) {
            // Late payment - apply smaller penalty
            updateCreditScore(user, LATE_PAYMENT_PENALTY);
            
            sendInsufficientBalanceWarning(user, loan, emiAmount, availableBalance);
            log.warn("Insufficient balance for EMI, loan {}, available: {}, required: {}", 
                     loan.getId(), availableBalance, emiAmount);
            
            return new EmiPaymentResult(false, "Insufficient balance - credit score reduced by " + 
                                        Math.abs(LATE_PAYMENT_PENALTY));
        } else {
            // Still within grace period - just send warning
            sendInsufficientBalanceWarning(user, loan, emiAmount, availableBalance);
            log.info("Insufficient balance for EMI (within grace period), loan {}", loan.getId());
            
            return new EmiPaymentResult(false, "Insufficient balance - within grace period");
        }
    }

    /**
     * Process overdue EMIs that haven't been paid.
     */
    @Transactional
    public void processOverdueEmis(LocalDate today) {
        // Find loans with EMI due more than grace period days ago
        LocalDate overdueDate = today.minusDays(GRACE_PERIOD_DAYS);
        List<LoanRequest> overdueLoans = loanRepository.findLoansWithEmiDueOnOrBefore(overdueDate);
        
        for (LoanRequest loan : overdueLoans) {
            if (!Boolean.TRUE.equals(loan.getAutoDebitEnabled())) {
                continue;
            }
            
            // Only process if EMI hasn't been paid this month
            if (loan.getLastEmiPaidDate() != null && 
                loan.getLastEmiPaidDate().getMonth() == today.getMonth()) {
                continue;
            }
            
            // Try to process the overdue payment
            processEmiPayment(loan, loan.getNextEmiDate());
        }
    }

    /**
     * Send reminders for upcoming EMIs.
     */
    public void sendUpcomingEmiReminders(LocalDate reminderDate) {
        List<LoanRequest> upcomingLoans = loanRepository.findLoansWithEmiDueOn(reminderDate);
        
        for (LoanRequest loan : upcomingLoans) {
            User user = loan.getBankAccount().getUser();
            Account account = loan.getBankAccount();
            BigDecimal availableBalance = getAvailableBalance(account);
            
            String subject = "EMI Payment Reminder - Due in 3 Days";
            String message = String.format(
                "Dear %s,\n\n" +
                "This is a reminder that your EMI payment of ₹%.2f for Loan #%d is due on %s.\n\n" +
                "Current Account Balance: ₹%.2f\n" +
                "EMI Amount Due: ₹%.2f\n" +
                "Remaining EMIs: %d\n\n" +
                "%s\n\n" +
                "Please ensure sufficient balance in your account for auto-debit.\n\n" +
                "Thank you,\nBankwise Team",
                user.getName(),
                loan.getEmiAmount().doubleValue(),
                loan.getId(),
                reminderDate,
                availableBalance.doubleValue(),
                loan.getEmiAmount().doubleValue(),
                loan.getRemainingEmis(),
                availableBalance.compareTo(loan.getEmiAmount()) < 0 
                    ? "⚠️ WARNING: Your current balance is insufficient for the EMI payment!"
                    : "✓ Your account has sufficient balance for the EMI payment."
            );
            
            emailService.sendEmail(user.getEmail(), subject, message);
            log.debug("Sent EMI reminder to {} for loan {}", user.getEmail(), loan.getId());
        }
    }

    /**
     * Calculate available balance including overdraft.
     */
    private BigDecimal getAvailableBalance(Account account) {
        BigDecimal balance = account.getBalance();
        if (Boolean.TRUE.equals(account.getOverdraftEnabled())) {
            BigDecimal availableOverdraft = account.getOverdraftLimit()
                .subtract(account.getOverdraftUsed());
            return balance.add(availableOverdraft);
        }
        return balance;
    }

    /**
     * Deduct amount from account, using overdraft if necessary.
     */
    private void deductFromAccount(Account account, BigDecimal amount) {
        BigDecimal balance = account.getBalance();
        
        if (balance.compareTo(amount) >= 0) {
            // Sufficient balance
            account.setBalance(balance.subtract(amount));
        } else if (Boolean.TRUE.equals(account.getOverdraftEnabled())) {
            // Use overdraft
            BigDecimal shortfall = amount.subtract(balance);
            account.setBalance(BigDecimal.ZERO);
            account.setOverdraftUsed(account.getOverdraftUsed().add(shortfall));
        } else {
            throw new RuntimeException("Insufficient balance and overdraft not enabled");
        }
    }

    /**
     * Calculate the principal portion of EMI payment.
     * Principal = EMI - Interest (Interest = Outstanding Principal * Monthly Rate)
     */
    private BigDecimal calculatePrincipalPortion(LoanRequest loan, BigDecimal emiAmount) {
        Double interestRate = loan.getInterestRate();
        double monthlyRate = (interestRate != null ? interestRate : 0.0) / 12 / 100;
        BigDecimal interest = loan.getRemainingPrincipal()
            .multiply(BigDecimal.valueOf(monthlyRate));
        return emiAmount.subtract(interest).max(BigDecimal.ZERO);
    }

    /**
     * Update user's credit score with bounds checking.
     */
    private void updateCreditScore(User user, int change) {
        int currentScore = user.getCreditScore() != null ? user.getCreditScore() : 650;
        int newScore = Math.min(850, Math.max(300, currentScore + change)); // Keep between 300-850
        user.setCreditScore(newScore);
        userRepository.save(user);
        log.info("Updated credit score for user {}: {} -> {} (change: {})", 
                 user.getEmail(), currentScore, newScore, change);
    }

    /**
     * Create a transaction record for EMI payment.
     */
    private void createEmiTransaction(Account account, BigDecimal amount, Long loanId, boolean success) {
        Transaction transaction = Transaction.builder()
            .sourceAccount(account)
            .type(TransactionType.LOAN_REPAYMENT)
            .amount(amount)
            .timestamp(LocalDateTime.now())
            .build();
        
        transactionRepository.save(transaction);
    }

    /**
     * Send EMI payment confirmation email.
     */
    private void sendEmiPaymentConfirmation(User user, LoanRequest loan, BigDecimal amount, String paymentType) {
        String subject = "EMI Payment Successful - Loan #" + loan.getId();
        String message = String.format(
            "Dear %s,\n\n" +
            "Your EMI payment has been successfully processed.\n\n" +
            "Payment Details:\n" +
            "- Loan ID: #%d\n" +
            "- EMI Amount: ₹%.2f\n" +
            "- Payment Type: %s\n" +
            "- EMIs Paid: %d/%d\n" +
            "- Remaining EMIs: %d\n" +
            "- Remaining Principal: ₹%.2f\n" +
            "- Next EMI Date: %s\n\n" +
            "%s\n\n" +
            "Thank you for your timely payment!\n\n" +
            "Best regards,\nBankwise Team",
            user.getName(),
            loan.getId(),
            amount.doubleValue(),
            paymentType,
            loan.getEmisPaid(),
            loan.getTotalEmis(),
            loan.getRemainingEmis(),
            loan.getRemainingPrincipal().doubleValue(),
            loan.getNextEmiDate() != null ? loan.getNextEmiDate().toString() : "N/A",
            loan.isFullyPaid() 
                ? "🎉 Congratulations! Your loan has been fully paid off!" 
                : "Keep up the good payment record to improve your credit score!"
        );
        
        emailService.sendEmail(user.getEmail(), subject, message);
    }

    /**
     * Send insufficient balance warning email.
     */
    private void sendInsufficientBalanceWarning(User user, LoanRequest loan, 
            BigDecimal required, BigDecimal available) {
        String subject = "⚠️ Urgent: Insufficient Balance for EMI - Loan #" + loan.getId();
        String message = String.format(
            "Dear %s,\n\n" +
            "IMPORTANT: Your account has insufficient balance for the scheduled EMI payment.\n\n" +
            "EMI Details:\n" +
            "- Loan ID: #%d\n" +
            "- EMI Amount Due: ₹%.2f\n" +
            "- Available Balance: ₹%.2f\n" +
            "- Shortfall: ₹%.2f\n" +
            "- Due Date: %s\n\n" +
            "⚠️ Warning: Failure to pay EMI on time may result in:\n" +
            "- Late payment penalties\n" +
            "- Reduction in your credit score (up to -%d points)\n" +
            "- Additional interest charges\n\n" +
            "Please deposit sufficient funds immediately to avoid penalties.\n\n" +
            "Best regards,\nBankwise Team",
            user.getName(),
            loan.getId(),
            required.doubleValue(),
            available.doubleValue(),
            required.subtract(available).doubleValue(),
            loan.getNextEmiDate(),
            Math.abs(LATE_PAYMENT_PENALTY)
        );
        
        emailService.sendEmail(user.getEmail(), subject, message);
    }

    /**
     * Send missed EMI notification email.
     */
    private void sendMissedEmiNotification(User user, LoanRequest loan, BigDecimal amount) {
        String subject = "❌ EMI Payment Missed - Loan #" + loan.getId();
        String message = String.format(
            "Dear %s,\n\n" +
            "Unfortunately, your EMI payment for Loan #%d has been marked as missed.\n\n" +
            "Payment Details:\n" +
            "- EMI Amount: ₹%.2f\n" +
            "- Due Date: %s\n" +
            "- Missed EMIs (Total): %d\n\n" +
            "Impact:\n" +
            "- Your credit score has been reduced by %d points\n" +
            "- Additional late fees may apply\n" +
            "- This may affect your future loan eligibility\n\n" +
            "Please make the payment as soon as possible to minimize further impact.\n\n" +
            "If you are facing financial difficulties, please contact our support team " +
            "to discuss restructuring options.\n\n" +
            "Best regards,\nBankwise Team",
            user.getName(),
            loan.getId(),
            amount.doubleValue(),
            loan.getNextEmiDate(),
            loan.getMissedEmis(),
            Math.abs(MISSED_PAYMENT_PENALTY)
        );
        
        emailService.sendEmail(user.getEmail(), subject, message);
    }

    /**
     * Manually trigger EMI payment for a specific loan.
     * This can be used by users to pay EMI early.
     */
    @Transactional
    public EmiPaymentResult payEmiManually(Long loanId) {
        LoanRequest loan = loanRepository.findById(loanId)
            .orElseThrow(() -> new RuntimeException("Loan not found"));
        
        if (loan.isFullyPaid()) {
            return new EmiPaymentResult(false, "Loan is already fully paid");
        }
        
        if (loan.getStatus() != LoanStatus.APPROVED) {
            return new EmiPaymentResult(false, "Loan is not in approved status");
        }
        
        return processEmiPayment(loan, loan.getNextEmiDate());
    }

    /**
     * Enable or disable auto-debit for a loan.
     */
    @Transactional
    public void toggleAutoDebit(Long loanId, boolean enabled) {
        LoanRequest loan = loanRepository.findById(loanId)
            .orElseThrow(() -> new RuntimeException("Loan not found"));
        
        loan.setAutoDebitEnabled(enabled);
        loanRepository.save(loan);
        
        User user = loan.getBankAccount().getUser();
        String subject = "Auto-Debit " + (enabled ? "Enabled" : "Disabled") + " - Loan #" + loanId;
        String message = String.format(
            "Dear %s,\n\n" +
            "Auto-debit for Loan #%d has been %s.\n\n" +
            "%s\n\n" +
            "Best regards,\nBankwise Team",
            user.getName(),
            loanId,
            enabled ? "enabled" : "disabled",
            enabled 
                ? "Your EMI payments will be automatically deducted from your account on the due date."
                : "Please ensure you make manual EMI payments on time to avoid penalties."
        );
        
        emailService.sendEmail(user.getEmail(), subject, message);
    }

    /**
     * Get EMI schedule for a loan.
     */
    public List<EmiScheduleItem> getEmiSchedule(Long loanId) {
        LoanRequest loan = loanRepository.findById(loanId)
            .orElseThrow(() -> new RuntimeException("Loan not found"));
        
        // Validate loan has required data for schedule generation
        if (loan.getEmiAmount() == null) {
            throw new RuntimeException("EMI amount not calculated for this loan. Loan may not be approved yet.");
        }
        if (loan.getAmount() == null) {
            throw new RuntimeException("Loan amount is not set");
        }
        if (loan.getTotalEmis() == null || loan.getTotalEmis() <= 0) {
            throw new RuntimeException("Invalid loan tenure");
        }
        
        return generateEmiSchedule(loan);
    }

    /**
     * Generate EMI schedule breakdown.
     */
    private List<EmiScheduleItem> generateEmiSchedule(LoanRequest loan) {
        java.util.List<EmiScheduleItem> schedule = new java.util.ArrayList<>();
        
        BigDecimal remainingPrincipal = loan.getAmount();
        Double interestRate = loan.getInterestRate();
        double monthlyRate = (interestRate != null ? interestRate : 0.0) / 12 / 100;
        BigDecimal emiAmount = loan.getEmiAmount();
        LocalDate emiDate = loan.getApprovalDate() != null 
            ? loan.getApprovalDate().plusMonths(1) 
            : LocalDate.now().plusMonths(1);
        
        int dayOfMonth = loan.getEmiDayOfMonth() != null ? loan.getEmiDayOfMonth() : 1;
        Integer totalEmis = loan.getTotalEmis();
        int total = totalEmis != null ? totalEmis : 0;
        Integer emisPaid = loan.getEmisPaid();
        int paid = emisPaid != null ? emisPaid : 0;
        
        for (int i = 1; i <= total; i++) {
            BigDecimal interest = remainingPrincipal.multiply(BigDecimal.valueOf(monthlyRate))
                .setScale(2, java.math.RoundingMode.HALF_UP);
            BigDecimal principal = emiAmount.subtract(interest);
            remainingPrincipal = remainingPrincipal.subtract(principal).max(BigDecimal.ZERO);
            
            boolean isPaid = i <= paid;
            
            schedule.add(new EmiScheduleItem(
                i,
                emiDate,
                emiAmount,
                principal,
                interest,
                remainingPrincipal,
                isPaid
            ));
            
            // Calculate next EMI date
            LocalDate nextMonth = emiDate.plusMonths(1);
            int maxDay = nextMonth.lengthOfMonth();
            emiDate = nextMonth.withDayOfMonth(Math.min(dayOfMonth, maxDay));
        }
        
        return schedule;
    }

    /**
     * Result of EMI payment processing.
     */
    public record EmiPaymentResult(boolean success, String message) {}

    /**
     * Individual EMI schedule item.
     */
    public record EmiScheduleItem(
        int emiNumber,
        LocalDate dueDate,
        BigDecimal emiAmount,
        BigDecimal principalComponent,
        BigDecimal interestComponent,
        BigDecimal remainingPrincipal,
        boolean isPaid
    ) {}
}
