package com.example.banking_system.service;

import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.Card;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.CardStatus;
import com.example.banking_system.enums.CardType;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.CardRepository;
import com.example.banking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class CardService {

    private final CardRepository cardRepository;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Get all cards for a user
     */
    public List<Card> getUserCards(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return cardRepository.findByUserOrderByCreatedAtDesc(user);
    }

    /**
     * Get active cards
     */
    public List<Card> getActiveCards(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return cardRepository.findActiveCardsByUser(user);
    }

    /**
     * Issue a new debit card
     */
    @Transactional
    public Card issueDebitCard(String userEmail, String accountNumber) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        if (!account.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Account does not belong to user");
        }

        // Check if user already has a debit card for this account
        if (cardRepository.existsByUserAndCardType(user, CardType.DEBIT)) {
            throw new RuntimeException("User already has a debit card");
        }

        Card card = Card.builder()
                .user(user)
                .account(account)
                .cardNumber(generateCardNumber())
                .cvv(generateCVV())
                .expiryDate(LocalDate.now().plusYears(5))
                .cardHolderName(user.getName().toUpperCase())
                .cardType(CardType.DEBIT)
                .status(CardStatus.ACTIVE)
                .dailyLimit(BigDecimal.valueOf(50000))
                .build();

        log.info("Issuing debit card for user {}", userEmail);
        return cardRepository.save(card);
    }

    /**
     * Issue a credit card (requires credit score check)
     */
    @Transactional
    public Card issueCreditCard(String userEmail, String accountNumber, BigDecimal requestedLimit) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        if (!account.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Account does not belong to user");
        }

        // Check credit score
        int creditScore = user.getCreditScore() != null ? user.getCreditScore() : 700;
        if (creditScore < 650) {
            throw new RuntimeException("Credit score too low for credit card. Minimum required: 650");
        }

        // Check if user already has a credit card
        if (cardRepository.findByUserAndCardType(user, CardType.CREDIT).isPresent()) {
            throw new RuntimeException("User already has a credit card");
        }

        // Calculate credit limit based on credit score
        BigDecimal maxLimit = calculateCreditLimit(creditScore);
        BigDecimal approvedLimit = requestedLimit.min(maxLimit);

        Card card = Card.builder()
                .user(user)
                .account(account)
                .cardNumber(generateCardNumber())
                .cvv(generateCVV())
                .expiryDate(LocalDate.now().plusYears(3))
                .cardHolderName(user.getName().toUpperCase())
                .cardType(CardType.CREDIT)
                .status(CardStatus.ACTIVE)
                .creditLimit(approvedLimit)
                .availableCredit(approvedLimit)
                .outstandingBalance(BigDecimal.ZERO)
                .dailyLimit(BigDecimal.valueOf(100000))
                .build();

        log.info("Issuing credit card with limit {} for user {}", approvedLimit, userEmail);
        return cardRepository.save(card);
    }

    /**
     * Block/Unblock card
     */
    @Transactional
    public Card updateCardStatus(String userEmail, Long cardId, CardStatus status) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));

        if (!card.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Card does not belong to user");
        }

        card.setStatus(status);
        log.info("Updated card {} status to {} for user {}", cardId, status, userEmail);
        return cardRepository.save(card);
    }

    /**
     * Update card settings
     */
    @Transactional
    public Card updateCardSettings(String userEmail, Long cardId, Map<String, Object> settings) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));

        if (!card.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Card does not belong to user");
        }

        if (settings.containsKey("onlineTransactionsEnabled")) {
            card.setOnlineTransactionsEnabled((Boolean) settings.get("onlineTransactionsEnabled"));
        }
        if (settings.containsKey("internationalTransactionsEnabled")) {
            card.setInternationalTransactionsEnabled((Boolean) settings.get("internationalTransactionsEnabled"));
        }
        if (settings.containsKey("contactlessEnabled")) {
            card.setContactlessEnabled((Boolean) settings.get("contactlessEnabled"));
        }
        if (settings.containsKey("dailyLimit")) {
            card.setDailyLimit(new BigDecimal(settings.get("dailyLimit").toString()));
        }

        return cardRepository.save(card);
    }

    /**
     * Get card details (with CVV for authenticated user)
     */
    public Map<String, Object> getCardDetails(String userEmail, Long cardId, boolean showSensitive) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));

        if (!card.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Card does not belong to user");
        }

        Map<String, Object> details = new java.util.HashMap<>();
        details.put("id", card.getId());
        details.put("cardNumber", showSensitive ? card.getCardNumber() : card.getMaskedCardNumber());
        details.put("cvv", showSensitive ? card.getCvv() : "***");
        details.put("expiryDate", card.getExpiryDate().toString());
        details.put("cardHolderName", card.getCardHolderName());
        details.put("cardType", card.getCardType());
        details.put("status", card.getStatus());
        details.put("dailyLimit", card.getDailyLimit());
        details.put("dailyUsed", card.getDailyUsed());
        details.put("onlineTransactionsEnabled", card.getOnlineTransactionsEnabled());
        details.put("internationalTransactionsEnabled", card.getInternationalTransactionsEnabled());
        details.put("contactlessEnabled", card.getContactlessEnabled());

        if (card.getCardType() == CardType.CREDIT) {
            details.put("creditLimit", card.getCreditLimit());
            details.put("availableCredit", card.getAvailableCredit());
            details.put("outstandingBalance", card.getOutstandingBalance());
        }

        return details;
    }

    // Helper methods
    private String generateCardNumber() {
        StringBuilder sb = new StringBuilder();
        // Start with 4 (Visa-like) for debit, 5 (Mastercard-like) for credit
        sb.append("4");
        for (int i = 0; i < 15; i++) {
            sb.append(secureRandom.nextInt(10));
        }
        // Ensure uniqueness
        String cardNumber = sb.toString();
        while (cardRepository.existsByCardNumber(cardNumber)) {
            sb = new StringBuilder("4");
            for (int i = 0; i < 15; i++) {
                sb.append(secureRandom.nextInt(10));
            }
            cardNumber = sb.toString();
        }
        return cardNumber;
    }

    private String generateCVV() {
        return String.format("%03d", secureRandom.nextInt(1000));
    }

    private BigDecimal calculateCreditLimit(int creditScore) {
        if (creditScore >= 800) return BigDecimal.valueOf(500000);
        if (creditScore >= 750) return BigDecimal.valueOf(300000);
        if (creditScore >= 700) return BigDecimal.valueOf(150000);
        if (creditScore >= 650) return BigDecimal.valueOf(75000);
        return BigDecimal.valueOf(25000);
    }
}
