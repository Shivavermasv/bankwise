package com.example.banking_system.service;

import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.User;
import com.example.banking_system.exception.AccountNotFoundException;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@Slf4j
@RequiredArgsConstructor
public class CachedDataService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;

    public User getUserByEmail(String email) {
        log.debug("Cache MISS: Loading user by email: {}", email);
        return userRepository.findByEmail(email).orElseThrow(()-> new RuntimeException("User Not Found"));
    }

    /**
     * Get account by number with caching.
     * WARNING: The cached entity may have detached user reference.
     * For authorization checks, use getAccountByNumberForAuth() instead.
     */
    @Cacheable(value = "accountByNumber", key = "#accountNumber", unless = "#result == null")
    public Account getAccountByNumber(String accountNumber) {
        log.debug("Cache MISS: Loading account: {}", accountNumber);
        // Use query that eagerly fetches user to avoid lazy loading issues with cached entities
        return accountRepository.findByAccountNumberWithUser(accountNumber)
            .orElseThrow(() -> new AccountNotFoundException("Account not found with number: " + accountNumber));
    }

    /**
     * Get account by number with fresh database fetch (bypasses cache).
     * Use this for authorization checks where user relationship is critical.
     */
    public Account getAccountByNumberForAuth(String accountNumber) {
        log.debug("Loading account for auth (no cache): {}", accountNumber);
        return accountRepository.findByAccountNumberWithUser(accountNumber)
            .orElseThrow(() -> new AccountNotFoundException("Account not found with number: " + accountNumber));
    }

    @Cacheable(value = "accountBalances", key = "#accountNumber")
    public BigDecimal getAccountBalance(String accountNumber) {
        log.debug("Cache MISS: Loading balance for: {}", accountNumber);
        return accountRepository.findByAccountNumber(accountNumber)
                .map(Account::getBalance)
                .orElse(BigDecimal.ZERO);
    }

    @CacheEvict(value = {"accountByNumber", "accountBalances"}, key = "#accountNumber")
    public void evictAccountCache(String accountNumber) {
        log.debug("Evicting account cache for: {}", accountNumber);
    }

    @CacheEvict(value = "userByEmail", key = "#email")
    public void evictUserCache(String email) {
        log.debug("Evicting user cache for: {}", email);
    }
}
