package com.example.banking_system.controller;

import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.Card;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.CardStatus;
import com.example.banking_system.enums.CardType;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.UserRepository;
import com.example.banking_system.service.CardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cards")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('USER', 'CUSTOMER')")
public class CardController {

    private final CardService cardService;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;

    @GetMapping
    public ResponseEntity<List<Card>> getUserCards(Authentication auth) {
        String email = auth.getName();
        return ResponseEntity.ok(cardService.getUserCards(email));
    }

    @GetMapping("/active")
    public ResponseEntity<List<Card>> getActiveCards(Authentication auth) {
        String email = auth.getName();
        return ResponseEntity.ok(cardService.getActiveCards(email));
    }

    @GetMapping("/{cardId}")
    public ResponseEntity<?> getCardDetails(
            Authentication auth,
            @PathVariable Long cardId,
            @RequestParam(defaultValue = "false") boolean showSensitive) {
        try {
            String email = auth.getName();
            Map<String, Object> details = cardService.getCardDetails(email, cardId, showSensitive);
            return ResponseEntity.ok(details);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/issue/debit")
    public ResponseEntity<?> issueDebitCard(
            Authentication auth,
            @RequestBody IssueCardRequest request) {
        try {
            String email = auth.getName();
            Account account = getAccountForUser(request.accountId(), email);
            
            Card card = cardService.issueDebitCard(email, account.getAccountNumber());
            return ResponseEntity.ok(card);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/issue/credit")
    public ResponseEntity<?> issueCreditCard(
            Authentication auth,
            @RequestBody IssueCreditCardRequest request) {
        try {
            String email = auth.getName();
            Account account = getAccountForUser(request.accountId(), email);
            
            Card card = cardService.issueCreditCard(email, account.getAccountNumber(), request.requestedLimit());
            return ResponseEntity.ok(card);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{cardId}/block")
    public ResponseEntity<?> blockCard(
            Authentication auth,
            @PathVariable Long cardId) {
        try {
            String email = auth.getName();
            Card card = cardService.updateCardStatus(email, cardId, CardStatus.BLOCKED);
            return ResponseEntity.ok(Map.of(
                "message", "Card blocked successfully",
                "card", card
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{cardId}/unblock")
    public ResponseEntity<?> unblockCard(
            Authentication auth,
            @PathVariable Long cardId) {
        try {
            String email = auth.getName();
            Card card = cardService.updateCardStatus(email, cardId, CardStatus.ACTIVE);
            return ResponseEntity.ok(Map.of(
                "message", "Card activated successfully",
                "card", card
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{cardId}/settings")
    public ResponseEntity<?> updateCardSettings(
            Authentication auth,
            @PathVariable Long cardId,
            @RequestBody CardSettingsRequest request) {
        try {
            String email = auth.getName();
            
            Map<String, Object> settings = new HashMap<>();
            if (request.internationalEnabled() != null) {
                settings.put("internationalTransactionsEnabled", request.internationalEnabled());
            }
            if (request.onlineEnabled() != null) {
                settings.put("onlineTransactionsEnabled", request.onlineEnabled());
            }
            if (request.contactlessEnabled() != null) {
                settings.put("contactlessEnabled", request.contactlessEnabled());
            }
            if (request.dailyLimit() != null) {
                settings.put("dailyLimit", request.dailyLimit());
            }
            
            Card card = cardService.updateCardSettings(email, cardId, settings);
            return ResponseEntity.ok(Map.of(
                "message", "Card settings updated successfully",
                "card", card
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{cardId}/masked")
    public ResponseEntity<?> getMaskedCardNumber(
            Authentication auth,
            @PathVariable Long cardId) {
        try {
            String email = auth.getName();
            Map<String, Object> details = cardService.getCardDetails(email, cardId, false);
            return ResponseEntity.ok(Map.of(
                "maskedNumber", details.get("cardNumber"),
                "cardType", details.get("cardType"),
                "status", details.get("status")
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private Account getAccountForUser(Long accountId, String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        Account account = accountRepository.findById(accountId)
            .orElseThrow(() -> new RuntimeException("Account not found"));
        
        if (!account.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied to this account");
        }
        
        return account;
    }

    public record IssueCardRequest(Long accountId) {}
    public record IssueCreditCardRequest(Long accountId, BigDecimal requestedLimit) {}
    public record CardSettingsRequest(
        Boolean internationalEnabled,
        Boolean onlineEnabled,
        Boolean contactlessEnabled,
        BigDecimal dailyLimit
    ) {}
}
