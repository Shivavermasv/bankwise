package com.example.banking_system.service;

import com.example.banking_system.dto.LoanRequestDto;
import com.example.banking_system.dto.LoanResponseDto;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.LoanRequest;
import com.example.banking_system.entity.Transaction;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.LoanStatus;
import com.example.banking_system.enums.TransactionStatus;
import com.example.banking_system.enums.TransactionType;
import com.example.banking_system.enums.VerificationStatus;
import com.example.banking_system.event.LoanApplicationEvent;
import com.example.banking_system.event.LoanStatusChangedEvent;
import com.example.banking_system.exception.*;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.LoanRepo;
import com.example.banking_system.repository.TransactionRepository;
import com.example.banking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class LoanService {

    private final LoanRepo loanRepo;
    private final AccountRepository accountRepo;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final AuditService auditService;
    private final ApplicationEventPublisher eventPublisher;
    private final CachedDataService cachedDataService;

    @Value("${bankwise.loan.min-amount:1000}")
    private BigDecimal minLoanAmount;

    @Value("${bankwise.loan.max-amount:500000}")
    private BigDecimal maxLoanAmount;

    public LoanResponseDto applyForLoan(LoanRequestDto dto) throws ResourceNotFoundException {
        log.info("Applying for loan accountNumber={} amount={} tenure={}", dto.getAccountNumber(), dto.getAmount(), dto.getTenureInMonths());
        Account account = cachedDataService.getAccountByNumber(dto.getAccountNumber());

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentEmail = auth != null ? auth.getName() : null;
        if (account.getUser() == null || !account.getUser().getEmail().equalsIgnoreCase(currentEmail)) {
            auditService.record("LOAN_APPLY", "ACCOUNT", dto.getAccountNumber(), "DENIED", "Ownership validation failed");
            throw new UnauthorizedAccountAccessException("You are not authorized to apply for a loan on this account");
        }
        if (account.getVerificationStatus() != VerificationStatus.VERIFIED) {
            auditService.record("LOAN_APPLY", "ACCOUNT", dto.getAccountNumber(), "DENIED", "Account not verified");
            throw new AccountStatusException("Account must be verified to apply for a loan");
        }
        if (dto.getAmount() == null || dto.getAmount().compareTo(minLoanAmount) < 0) {
            throw new BusinessRuleViolationException("Loan amount below minimum limit");
        }
        if (dto.getAmount().compareTo(maxLoanAmount) > 0) {
            throw new BusinessRuleViolationException("Loan amount exceeds maximum limit");
        }
        boolean hasActive = loanRepo.existsByBankAccount_AccountNumberAndStatusIn(
                dto.getAccountNumber(), List.of(LoanStatus.PENDING, LoanStatus.APPROVED)
        );
        if (hasActive) {
            throw new BusinessRuleViolationException("Active or pending loan already exists for this account");
        }

        LoanRequest loan = LoanRequest.builder()
                .bankAccount(account)
                .amount(dto.getAmount())
                .tenureInMonths(dto.getTenureInMonths())
                .interestRate(dto.getInterestRate())
                .status(LoanStatus.PENDING)
                .reason(dto.getReason())
                .requestDate(LocalDate.now())
                .build();

        loanRepo.save(loan);
        auditService.record("LOAN_APPLY", "LOAN", String.valueOf(loan.getId()), "PENDING",
                "amount=" + dto.getAmount() + " tenure=" + dto.getTenureInMonths());

        // Publish event - notifications will be sent asynchronously AFTER transaction commits
        eventPublisher.publishEvent(new LoanApplicationEvent(
                this,
                loan.getId(),
                dto.getAccountNumber(),
                dto.getAmount(),
                account.getUser().getEmail()
        ));

        return mapToDto(loan);
    }

    private LoanResponseDto mapToDto(LoanRequest loan) {
        // Handle null values from database
        double interestRate = loan.getInterestRate() != null ? loan.getInterestRate() : 0.0;
        int tenureInMonths = loan.getTenureInMonths() != null ? loan.getTenureInMonths() : 0;
        int emisPaid = loan.getEmisPaid() != null ? loan.getEmisPaid() : 0;
        int totalEmis = tenureInMonths;

        BigDecimal emiAmount = calculateMonthlyEmi(loan.getAmount(), interestRate, tenureInMonths);
        BigDecimal totalAmountPaid = emiAmount.multiply(BigDecimal.valueOf(emisPaid));
        BigDecimal totalPayable = emiAmount.multiply(BigDecimal.valueOf(totalEmis));
        BigDecimal totalOutstanding = emiAmount.multiply(BigDecimal.valueOf(Math.max(0, totalEmis - emisPaid)));

        double paidPercentage = totalEmis > 0 ? (emisPaid * 100.0) / totalEmis : 0;

        String paymentStatus;
        if (loan.getStatus() == LoanStatus.CLOSED || emisPaid >= totalEmis) {
            paymentStatus = "FULLY_PAID";
        } else if (emisPaid > 0) {
            paymentStatus = "IN_PROGRESS";
        } else {
            paymentStatus = "NOT_STARTED";
        }

        return LoanResponseDto.builder()
                .id(loan.getId())
                .accountNumber(loan.getBankAccount().getAccountNumber())
                .amount(loan.getAmount())
                .tenureInMonths(tenureInMonths)
                .interestRate(interestRate)
                .status(loan.getStatus())
                .requestDate(loan.getRequestDate())
                .approvalDate(loan.getApprovalDate())
                .maturityDate(loan.getMaturityDate())
                .reason(loan.getReason())
                .adminRemark(loan.getAdminRemark())
                .emisPaid(emisPaid)
                .totalEmis(totalEmis)
                .emiAmount(emiAmount)
                .totalAmountPaid(totalAmountPaid)
                .totalOutstanding(totalOutstanding)
                .paidPercentage(Math.round(paidPercentage * 100.0) / 100.0)
                .paymentStatus(paymentStatus)
                .build();
    }

    public String updateLoanStatus(Long loanId, LoanStatus status, String adminRemark) throws ResourceNotFoundException {
        log.info("Updating loan status loanId={} status={}", loanId, status);
        LoanRequest loan = loanRepo.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan request not found"));

        LoanStatus currentStatus = loan.getStatus();
        if (currentStatus == status) {
            return "Loan already " + status.name().toLowerCase();
        }

        loan.setStatus(status);
        loan.setAdminRemark(adminRemark);
        if (status == LoanStatus.APPROVED) {
            loan.setApprovalDate(LocalDate.now());
            loan.setMaturityDate(LocalDate.now().plusMonths(loan.getTenureInMonths()));

            Account account = loan.getBankAccount();
            if (account != null) {
                account.setBalance(account.getBalance().add(loan.getAmount()));
                accountRepo.save(account);

                Transaction disbursement = Transaction.builder()
                        .destinationAccount(account)
                        .amount(loan.getAmount())
                        .type(TransactionType.LOAN_DISBURSEMENT)
                        .timestamp(LocalDate.now().atStartOfDay())
                        .status(TransactionStatus.SUCCESS)
                        .build();
                transactionRepository.save(disbursement);
                auditService.record("LOAN_DISBURSE", "ACCOUNT", account.getAccountNumber(), "SUCCESS",
                        "loanId=" + loanId + " amount=" + loan.getAmount());
            }
        }

        String userEmail = loan.getBankAccount().getUser().getEmail();
        loanRepo.save(loan);
        auditService.record("LOAN_STATUS_UPDATE", "LOAN", String.valueOf(loanId), status.name(), adminRemark);

        // Publish event - notifications will be sent asynchronously AFTER transaction commits
        eventPublisher.publishEvent(new LoanStatusChangedEvent(
                this,
                loanId,
                loan.getBankAccount().getAccountNumber(),
                status.name(),
                adminRemark,
                userEmail
        ));

        return "Loan status updated successfully";
    }

    public List<LoanResponseDto> getLoansByStatus(LoanStatus status) {
        return loanRepo.findByStatus(status).stream().map(this::mapToDto).toList();
    }

    public List<LoanResponseDto> getLoansByAccount(String accountNumber) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentEmail = auth != null ? auth.getName() : null;
        Account account = cachedDataService.getAccountByNumber(accountNumber);
        return loanRepo.findByBankAccount_AccountNumber(accountNumber).stream().map(this::mapToDto).toList();
    }

    public LoanResponseDto getActiveLoan(String accountNumber) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentEmail = auth != null ? auth.getName() : null;
        Account account = cachedDataService.getAccountByNumber(accountNumber);
        return loanRepo.findByBankAccount_AccountNumberAndStatus(accountNumber, LoanStatus.APPROVED)
                .map(this::mapToDto)
                .orElse(null);
    }

    @Transactional
    public String repayLoan(Long loanId, BigDecimal amount) throws ResourceNotFoundException {
        log.info("Processing loan repayment loanId={} amount={}", loanId, amount);
        LoanRequest loan = loanRepo.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan request not found"));

        // Verify ownership
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentEmail = auth != null ? auth.getName() : null;
        Account account = loan.getBankAccount();
        if (account.getUser() == null || !account.getUser().getEmail().equalsIgnoreCase(currentEmail)) {
            throw new UnauthorizedAccountAccessException("You are not authorized to repay this loan");
        }

        if (loan.getStatus() != LoanStatus.APPROVED) {
            throw new BusinessRuleViolationException("Can only repay approved loans");
        }

        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleViolationException("Repayment amount must be positive");
        }

        double interestRate = loan.getInterestRate() != null ? loan.getInterestRate() : 0.0;
        int tenureInMonths = loan.getTenureInMonths() != null ? loan.getTenureInMonths() : 0;
        BigDecimal emi = calculateMonthlyEmi(loan.getAmount(), interestRate, tenureInMonths);

        if (account.getBalance().compareTo(amount) < 0) {
            throw new BusinessRuleViolationException("Insufficient balance for repayment");
        }

        // Deduct from account
        account.setBalance(account.getBalance().subtract(amount));

        // Create repayment transaction
        Transaction repayment = Transaction.builder()
                .sourceAccount(account)
                .amount(amount.negate())
                .type(TransactionType.LOAN_PAYMENT)
                .timestamp(LocalDate.now().atStartOfDay())
                .status(TransactionStatus.SUCCESS)
                .build();
        transactionRepository.save(repayment);

        // Check if amount covers at least one EMI
        int emisCovered = amount.divide(emi, 0, RoundingMode.DOWN).intValue();
        if (emisCovered > 0) {
            loan.setEmisPaid(loan.getEmisPaid() + emisCovered);
            loan.setMissedEmis(0); // Reset missed EMIs on successful payment
        }

        // Check if loan is fully repaid
        if (loan.getEmisPaid() >= loan.getTenureInMonths()) {
            loan.setStatus(LoanStatus.CLOSED);

            // Increase credit score for completing loan repayment
            User user = account.getUser();
            int newCreditScore = Math.min(900, user.getCreditScore() + 25); // Max 900
            user.setCreditScore(newCreditScore);
            userRepository.save(user);

            auditService.record("LOAN_CLOSED", "LOAN", String.valueOf(loan.getId()), "CLOSED",
                    "Loan fully repaid via manual payment. Credit score: " + newCreditScore);
            notificationService.sendNotification(currentEmail,
                    "🎉 Congratulations! Your loan #" + loanId + " has been fully repaid! Your credit score is now " + newCreditScore);
            emailService.sendEmail(currentEmail, "Loan Fully Repaid",
                    "Your loan (ID: " + loanId + ") has been fully repaid. Your credit score is now " + newCreditScore + ". Thank you for banking with us!");
        } else {
            // Small credit score boost for on-time payment
            User user = account.getUser();
            int newCreditScore = Math.min(900, user.getCreditScore() + 2);
            user.setCreditScore(newCreditScore);
            userRepository.save(user);

            notificationService.sendNotification(currentEmail,
                    "💰 Payment of ₹" + amount + " received for loan #" + loanId + ". EMIs paid: " + loan.getEmisPaid() + "/" + loan.getTenureInMonths());
        }

        accountRepo.save(account);
        loanRepo.save(loan);

        auditService.record("LOAN_REPAYMENT", "LOAN", String.valueOf(loanId), "SUCCESS",
                "amount=" + amount + " emisPaid=" + loan.getEmisPaid());

        return "Repayment of ₹" + amount + " successful. EMIs paid: " + loan.getEmisPaid() + "/" + loan.getTenureInMonths();
    }

    public Map<String, Object> getEmiDetails(Long loanId) throws ResourceNotFoundException {
        LoanRequest loan = loanRepo.findByIdWithAccountAndUser(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found"));

        // Verify ownership
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentEmail = auth != null ? auth.getName() : null;
        if (loan.getBankAccount().getUser() == null ||
                !loan.getBankAccount().getUser().getEmail().equalsIgnoreCase(currentEmail)) {
            throw new UnauthorizedAccountAccessException("You are not authorized to view this loan");
        }

        double loanInterestRate = loan.getInterestRate() != null ? loan.getInterestRate() : 0.0;
        int loanTenure = loan.getTenureInMonths() != null ? loan.getTenureInMonths() : 0;
        int loanEmisPaid = loan.getEmisPaid() != null ? loan.getEmisPaid() : 0;

        BigDecimal emi = calculateMonthlyEmi(loan.getAmount(), loanInterestRate, loanTenure);
        int remainingEmis = Math.max(0, loanTenure - loanEmisPaid);
        BigDecimal totalOutstanding = emi.multiply(BigDecimal.valueOf(remainingEmis));

        // Calculate next EMI date (1st of next month from approval)
        LocalDate nextEmiDate = loan.getApprovalDate() != null
                ? loan.getApprovalDate().plusMonths(loanEmisPaid + 1).withDayOfMonth(1)
                : LocalDate.now().plusMonths(1).withDayOfMonth(1);

        return Map.of(
                "loanId", loan.getId(),
                "emiAmount", emi,
                "emisPaid", loanEmisPaid,
                "totalEmis", loanTenure,
                "remainingEmis", remainingEmis,
                "totalOutstanding", totalOutstanding,
                "nextEmiDate", nextEmiDate,
                "status", loan.getStatus()
        );
    }

    // Scheduled task to send EMI reminders 3 days before due date
    @Scheduled(cron = "0 0 9 * * *") // Every day at 9 AM
    public void sendEmiReminders() {
        log.info("Checking for upcoming EMI due dates");
        LocalDate reminderDate = LocalDate.now().plusDays(3);
        int targetDay = 1; // EMI due on 1st of each month

        if (reminderDate.getDayOfMonth() == targetDay) {
            for (LoanRequest loan : loanRepo.findAllByStatus(LoanStatus.APPROVED)) {
                String userEmail = loan.getBankAccount().getUser().getEmail();
                double loanRate = loan.getInterestRate() != null ? loan.getInterestRate() : 0.0;
                int loanMonths = loan.getTenureInMonths() != null ? loan.getTenureInMonths() : 0;
                BigDecimal emi = calculateMonthlyEmi(loan.getAmount(), loanRate, loanMonths);

                notificationService.sendNotification(userEmail,
                        "⏰ EMI Reminder: Your EMI of ₹" + emi + " for loan #" + loan.getId() +
                                " is due in 3 days. Please ensure sufficient balance.");

                emailService.sendEmail(userEmail, "EMI Due Reminder",
                        "Dear Customer,\n\nThis is a reminder that your EMI of ₹" + emi +
                                " for loan #" + loan.getId() + " is due on the 1st of this month.\n\n" +
                                "Please ensure you have sufficient balance in your account.\n\n" +
                                "Regards,\nBankwise Team");
            }
        }
    }

    @Scheduled(cron = "0 0 2 1 * *") // Every 1st day of the month at 2:00 AM
    @Transactional
    public void processMonthlyLoanRepayments() {
        log.info("Processing monthly loan repayments");
        LocalDate today = LocalDate.now();

        for (LoanRequest loan : loanRepo.findAllByStatus(LoanStatus.APPROVED)) {

            Account account = loan.getBankAccount();
            String userEmail = account.getUser().getEmail();

            double loanRate = loan.getInterestRate() != null ? loan.getInterestRate() : 0.0;
            int loanMonths = loan.getTenureInMonths() != null ? loan.getTenureInMonths() : 0;
            int paidEmis = loan.getEmisPaid() != null ? loan.getEmisPaid() : 0;

            BigDecimal emi = calculateMonthlyEmi(loan.getAmount(), loanRate, loanMonths);

            BigDecimal balance = account.getBalance();
            if (balance.compareTo(emi) >= 0) {
                // Deduct EMI
                account.setBalance(balance.subtract(emi));

                // Create EMI transaction
                Transaction transaction = Transaction.builder()
                        .sourceAccount(account)
                        .amount(emi.negate())
                        .type(TransactionType.LOAN_PAYMENT)
                        .timestamp(LocalDate.now().atStartOfDay())
                        .status(TransactionStatus.SUCCESS)
                        .build();

                transactionRepository.save(transaction);
                loan.incrementEmisPaid();

                if ((paidEmis + 1) >= loanMonths) {
                    loan.setStatus(LoanStatus.CLOSED);

                    auditService.recordSystem("LOAN_CLOSED", "LOAN", String.valueOf(loan.getId()), "CLOSED",
                            "All EMIs paid");

                    emailService.sendEmail(userEmail,
                            "🎉 Loan Fully Repaid",
                            "Congratulations! You have successfully repaid your loan (ID: " + loan.getId() + ").");

                    notificationService.sendNotification(userEmail,
                            "Your loan (ID: " + loan.getId() + ") has been fully repaid. ✅");
                } else {
                    notificationService.sendNotification(userEmail,
                            "Your EMI of ₹" + emi + " has been deducted for loan #" + loan.getId());
                }

            } else {
                // Apply penalty
                log.warn("EMI payment failed loanId={} accountNumber={}", loan.getId(), account.getAccountNumber());
                BigDecimal penalty = BigDecimal.valueOf(500);
                account.setBalance(account.getBalance().subtract(penalty));

                Transaction penaltyTx = Transaction.builder()
                        .sourceAccount(account)
                        .amount(penalty.negate())
                        .type(TransactionType.LOAN_PENALTY)
                        .timestamp(LocalDate.now().atStartOfDay())
                        .status(TransactionStatus.SUCCESS)
                        .build();

                transactionRepository.save(penaltyTx);
                loan.incrementMissedEmis();

                emailService.sendEmail(userEmail,
                        "⚠️ EMI Payment Failed",
                        "Your EMI of ₹" + emi + " for loan #" + loan.getId() + " could not be deducted. ₹500 penalty applied.");

                notificationService.sendNotification(userEmail,
                        "EMI payment failed for loan #" + loan.getId() + ". ₹500 penalty applied.");

                if (loan.getMissedEmis() >= 3) {
                    account.setSuspended();
                    auditService.recordSystem("ACCOUNT_SUSPEND", "ACCOUNT", account.getAccountNumber(), "SUSPENDED",
                            "3 consecutive missed EMIs");
                    notificationService.sendNotification(userEmail,
                            "⚠️ Your account has been suspended due to repeated EMI failures.");
                    emailService.sendEmail(userEmail,
                            "Account Suspended",
                            "Your account has been suspended due to 3 failed EMI payments. Please clear dues to reactivate.");
                }
            }

            accountRepo.save(account);
            loanRepo.save(loan);
        }
    }

    private BigDecimal calculateMonthlyEmi(BigDecimal principal, double annualRate, int tenureInMonths) {
        if (principal == null || tenureInMonths <= 0) {
            return BigDecimal.ZERO;
        }
        double r = annualRate / 12 / 100; // monthly rate
        if (r <= 0) {
            return principal.divide(BigDecimal.valueOf(tenureInMonths), 2, RoundingMode.HALF_UP);
        }
        double emi = (principal.doubleValue() * r * Math.pow(1 + r, tenureInMonths)) /
                (Math.pow(1 + r, tenureInMonths) - 1);
        return BigDecimal.valueOf(emi).setScale(2, RoundingMode.HALF_UP);
    }

}




