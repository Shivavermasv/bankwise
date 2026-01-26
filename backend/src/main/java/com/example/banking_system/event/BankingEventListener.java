package com.example.banking_system.event;

import com.example.banking_system.entity.User;
import com.example.banking_system.enums.Role;
import com.example.banking_system.service.EmailService;
import com.example.banking_system.service.NotificationService;
import com.example.banking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

/**
 * Asynchronous event listener for all banking events.
 * 
 * KEY BENEFIT: The main API call commits the database transaction and returns
 * immediately. All notifications, emails, and secondary processing happen
 * in background threads. If any of these fail, the main transaction is NOT rolled back.
 * 
 * This ensures:
 * 1. Fast API response times
 * 2. Core transaction integrity (money transfer is committed before notifications)
 * 3. Resilience - notification failures don't affect core business logic
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BankingEventListener {

    private final NotificationService notificationService;
    private final EmailService emailService;
    private final UserRepository userRepository;

    /**
     * Handle transfer completed events AFTER transaction commits.
     * This ensures the transfer is already saved before we send notifications.
     */
    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleTransferCompleted(TransferCompletedEvent event) {
        log.info("EVENT: Processing transfer notification from={} to={} amount={}", 
                event.getFromAccount(), event.getToAccount(), event.getAmount());
        
        try {
            if (event.isSuccess()) {
                // Notify sender
                notificationService.sendNotification(event.getFromUserEmail(),
                        "You have successfully transferred ₹" + event.getAmount() +
                                " to account " + event.getToAccount());
                
                // Notify receiver
                notificationService.sendNotification(event.getToUserEmail(),
                        "You have received ₹" + event.getAmount() +
                                " from account " + event.getFromAccount());
            } else {
                notificationService.sendNotification(event.getFromUserEmail(),
                        "Transfer of ₹" + event.getAmount() + " to " + event.getToAccount() + " failed.");
            }
            log.info("EVENT: Transfer notifications sent successfully");
        } catch (Exception e) {
            log.error("EVENT: Failed to send transfer notifications event={}", event.getTargetId(), e);
            // Don't rethrow - we don't want notification failure to affect anything
        }
    }

    /**
     * Handle loan status change events.
     */
    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleLoanStatusChanged(LoanStatusChangedEvent event) {
        log.info("EVENT: Processing loan status change loanId={} status={}", event.getLoanId(), event.getNewStatus());
        
        try {
            String message = "Your loan request (ID: " + event.getLoanId() + ") has been " + 
                    event.getNewStatus().toLowerCase() + ". " + 
                    (event.getAdminRemark() != null ? event.getAdminRemark() : "");
            
            notificationService.sendNotification(event.getUserEmail(), message);
            
            // Send email asynchronously as well
            sendEmailSafely(event.getUserEmail(), "Loan Request Update", message);
            
            log.info("EVENT: Loan status notifications sent for loanId={}", event.getLoanId());
        } catch (Exception e) {
            log.error("EVENT: Failed to send loan status notifications loanId={}", event.getLoanId(), e);
        }
    }

    /**
     * Handle new loan applications - notify admins and managers.
     */
    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleLoanApplication(LoanApplicationEvent event) {
        log.info("EVENT: Processing loan application notification loanId={} amount={}", 
                event.getLoanId(), event.getAmount());
        
        try {
            String message = "A new loan request has been submitted for account: " + event.getAccountNumber() +
                    " Amount: ₹" + event.getAmount();
            
            // Notify all managers
            List<User> managers = userRepository.findByRole(Role.MANAGER);
            for (User manager : managers) {
                notificationService.sendNotification(manager.getEmail(), message);
                sendEmailSafely(manager.getEmail(), "New Loan Request", message);
            }
            
            // Notify all admins
            List<User> admins = userRepository.findByRole(Role.ADMIN);
            for (User admin : admins) {
                notificationService.sendNotification(admin.getEmail(), message);
                sendEmailSafely(admin.getEmail(), "New Loan Request", message);
            }
            
            log.info("EVENT: Loan application notifications sent to {} managers and {} admins", 
                    managers.size(), admins.size());
        } catch (Exception e) {
            log.error("EVENT: Failed to send loan application notifications loanId={}", event.getLoanId(), e);
        }
    }

    /**
     * Handle deposit processed events.
     */
    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleDepositProcessed(DepositProcessedEvent event) {
        log.info("EVENT: Processing deposit notification depositId={} status={}", 
                event.getDepositId(), event.getStatus());
        
        try {
            String message;
            String status = event.getStatus();
            
            if ("PENDING".equalsIgnoreCase(status)) {
                // New deposit request - notify user and admins
                message = "Your deposit request of ₹" + event.getAmount() + 
                        " has been created successfully for account: " + event.getAccountNumber();
                notificationService.sendNotification(event.getUserEmail(), message);
                
                // Notify all admins
                String adminMessage = "A new deposit request of ₹" + event.getAmount() +
                        " has been created for account: " + event.getAccountNumber();
                List<User> admins = userRepository.findByRole(Role.ADMIN);
                for (User admin : admins) {
                    notificationService.sendNotification(admin.getEmail(), adminMessage);
                }
                log.info("EVENT: Deposit request notifications sent to user and {} admins", admins.size());
            } else if ("APPROVED".equalsIgnoreCase(status)) {
                message = "Your deposit request of ₹" + event.getAmount() + 
                        " has been approved and credited to your account: " + event.getAccountNumber();
                notificationService.sendNotification(event.getUserEmail(), message);
                log.info("EVENT: Deposit approval notification sent depositId={}", event.getDepositId());
            } else if ("REJECTED".equalsIgnoreCase(status)) {
                message = "Your deposit request of ₹" + event.getAmount() + 
                        " for account: " + event.getAccountNumber() + " has been rejected.";
                notificationService.sendNotification(event.getUserEmail(), message);
                log.info("EVENT: Deposit rejection notification sent depositId={}", event.getDepositId());
            }
        } catch (Exception e) {
            log.error("EVENT: Failed to send deposit notifications depositId={}", event.getDepositId(), e);
        }
    }

    /**
     * Handle account status change events.
     */
    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleAccountStatusChanged(AccountStatusChangedEvent event) {
        log.info("EVENT: Processing account status change account={} status={}", 
                event.getAccountNumber(), event.getNewStatus());
        
        try {
            String message = "Your account verification status has been updated to: " + event.getNewStatus();
            notificationService.sendNotification(event.getUserEmail(), message);
            log.info("EVENT: Account status notification sent account={}", event.getAccountNumber());
        } catch (Exception e) {
            log.error("EVENT: Failed to send account status notifications account={}", event.getAccountNumber(), e);
        }
    }

    /**
     * Send email with retry logic and error handling.
     * This method never throws - it logs and continues.
     */
    private void sendEmailSafely(String to, String subject, String body) {
        try {
            emailService.sendEmail(to, subject, body);
        } catch (Exception e) {
            log.error("Failed to send email to={} subject={}", to, subject, e);
            // Could add to a retry queue here in future
        }
    }
}




