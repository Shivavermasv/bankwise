package com.example.banking_system.service;

import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.User;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * Cached data access service for frequently accessed data.
 * Reduces database calls for hot paths like user lookups and balance checks.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CachedDataService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;

    /**
     * Get user by email with caching.
     * Cache key: email
     */
    @Cacheable(value = "userByEmail", key = "#email", unless = "#result == null")
    public Optional<User> getUserByEmail(String email) {
        log.debug("Cache MISS: Loading user by email: {}", email);
        return userRepository.findByEmail(email);
    }

    /**
     * Get account by account number with caching.
     */
    @Cacheable(value = "accountByNumber", key = "#accountNumber", unless = "#result == null")
    public Optional<Account> getAccountByNumber(String accountNumber) {
        log.debug("Cache MISS: Loading account: {}", accountNumber);
        return accountRepository.findByAccountNumber(accountNumber);
    }

    /**
     * Get account balance - frequently accessed, short cache.
     */
    @Cacheable(value = "accountBalances", key = "#accountNumber")
    public BigDecimal getAccountBalance(String accountNumber) {
        log.debug("Cache MISS: Loading balance for: {}", accountNumber);
        return accountRepository.findByAccountNumber(accountNumber)
                .map(Account::getBalance)
                .orElse(BigDecimal.ZERO);
    }

    /**
     * Evict user cache when user data changes.
     */
    @CacheEvict(value = "userByEmail", key = "#email")
    public void evictUserCache(String email) {
        log.debug("Evicting user cache for: {}", email);
    }

    /**
     * Evict account cache when account data changes.
     */
    @CacheEvict(value = {"accountByNumber", "accountBalances"}, key = "#accountNumber")
    public void evictAccountCache(String accountNumber) {
        log.debug("Evicting account cache for: {}", accountNumber);
    }

    /**
     * Evict all account-related caches.
     */
    @CacheEvict(value = {"accountByNumber", "accountBalances", "accounts"}, allEntries = true)
    public void evictAllAccountCaches() {
        log.debug("Evicting all account caches");
    }

    /**
     * Evict all user caches.
     */
    @CacheEvict(value = {"userByEmail", "users"}, allEntries = true)
    public void evictAllUserCaches() {
        log.debug("Evicting all user caches");
    }
}
