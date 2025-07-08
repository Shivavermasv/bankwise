package com.example.banking_system.service;


import com.example.banking_system.dto.LoanRequestDto;
import com.example.banking_system.dto.LoanResponseDto;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.LoanRequest;
import com.example.banking_system.entity.Transaction;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.LoanStatus;
import com.example.banking_system.enums.Role;
import com.example.banking_system.enums.TransactionStatus;
import com.example.banking_system.enums.TransactionType;
import com.example.banking_system.exception.ResourceNotFoundException;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.LoanRepo;
import com.example.banking_system.repository.TransactionRepository;
import com.example.banking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class LoanService {

    private final LoanRepo loanRepo;
    private final AccountRepository accountRepo;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;

    public LoanResponseDto applyForLoan(LoanRequestDto dto) throws ResourceNotFoundException {
        Account account = accountRepo.findByAccountNumber(dto.getAccountNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found"));

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
        for(User user : userRepository.findByRole(Role.MANAGER)){
            notificationService.sendNotification(user.getEmail(),
                    "A new loan request has been created for account: " + dto.getAccountNumber());
            emailService.sendEmail(user.getEmail(),
                    "New Loan Request",
                    "A new loan request has been created for account: " + dto.getAccountNumber());
        }
        return mapToDto(loan);
    }

    private LoanResponseDto mapToDto(LoanRequest loan) {
        return LoanResponseDto.builder()
                .id(loan.getId())
                .accountNumber(loan.getBankAccount().getAccountNumber())
                .amount(loan.getAmount())
                .tenureInMonths(loan.getTenureInMonths())
                .interestRate(loan.getInterestRate())
                .status(loan.getStatus())
                .requestDate(loan.getRequestDate())
                .approvalDate(loan.getApprovalDate())
                .maturityDate(loan.getMaturityDate())
                .reason(loan.getReason())
                .adminRemark(loan.getAdminRemark())
                .build();
    }

    public String updateLoanStatus(Long loanId, LoanStatus status, String adminRemark) throws ResourceNotFoundException {
        LoanRequest loan = loanRepo.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan request not found"));

        loan.setStatus(status);
        loan.setAdminRemark(adminRemark);
        if (status == LoanStatus.APPROVED) {
            loan.setApprovalDate(LocalDate.now());
            loan.setMaturityDate(LocalDate.now().plusMonths(loan.getTenureInMonths()));
        }

        String userEmail = loan.getBankAccount().getUser().getEmail();
        String text = "Your loan request with ID " + loanId + " has been " + status.name().toLowerCase() + ". " + adminRemark;
        notificationService.sendNotification(userEmail,
                text);
        emailService.sendEmail(userEmail,
                "Loan Request Update",
                text);
        loanRepo.save(loan);
        return "Loan status updated successfully";
    }

    @Scheduled(cron = "0 0 2 1 * *") // Every 1st day of the month at 2:00 AM
    @Transactional
    public void processMonthlyLoanRepayments() {
        LocalDate today = LocalDate.now();

        for (LoanRequest loan : loanRepo.findAllByStatus(LoanStatus.APPROVED)) {

            Account account = loan.getBankAccount();
            String userEmail = account.getUser().getEmail();

            BigDecimal emi = calculateMonthlyEmi(
                    loan.getAmount(),
                    loan.getInterestRate(),
                    loan.getTenureInMonths()
            );

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

                if (loan.getEmisPaid() >= loan.getTenureInMonths()) {
                    loan.setStatus(LoanStatus.CLOSED);

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
        double r = annualRate / 12 / 100; // monthly rate
        double emi = (principal.doubleValue() * r * Math.pow(1 + r, tenureInMonths)) /
                (Math.pow(1 + r, tenureInMonths) - 1);
        return BigDecimal.valueOf(emi).setScale(2, RoundingMode.HALF_UP);
    }


}
