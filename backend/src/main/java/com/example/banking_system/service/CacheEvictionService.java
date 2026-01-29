package com.example.banking_system.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;

/**
 * Service for granular cache eviction strategy.
 * Instead of caching entire analytics/dashboard, this service evicts specific cache keys
 * based on field changes, ensuring fresh data without full cache invalidation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CacheEvictionService {

    private final RedisTemplate<String, Object> redisTemplate;

    private static final String CACHE_PREFIX = "bankwise::";
    private static final String USER_ANALYTICS_PREFIX = "userAnalytics::";
    private static final String ACCOUNT_PREFIX = "accountByNumber::";
    private static final String BALANCE_PREFIX = "accountBalances::";
    private static final String ADMIN_DASHBOARD_KEY = "adminDashboard";
    private static final String ADMIN_ACCOUNTS_PREFIX = "accountListForAdmin::";

    /**
     * Evict analytics cache for a specific user when their financial data changes.
     * Called after transactions, deposits, loans, EMI payments.
     *
     * @param userEmail The user's email address
     */
    public void evictUserAnalyticsCache(String userEmail) {
        if (userEmail == null || userEmail.isEmpty()) {
            return;
        }
        String key = CACHE_PREFIX + USER_ANALYTICS_PREFIX + userEmail;
        redisTemplate.delete(key);
        log.debug("Evicted user analytics cache for: {}", userEmail);
    }

    /**
     * Evict account-specific caches when account is modified.
     * Removes both account object and balance caches.
     *
     * @param accountNumber The account number
     */
    public void evictAccountCache(String accountNumber) {
        if (accountNumber == null || accountNumber.isEmpty()) {
            return;
        }
        String accountKey = CACHE_PREFIX + ACCOUNT_PREFIX + accountNumber;
        String balanceKey = CACHE_PREFIX + BALANCE_PREFIX + accountNumber;
        redisTemplate.delete(accountKey);
        redisTemplate.delete(balanceKey);
        log.debug("Evicted account cache for: {}", accountNumber);
    }

    /**
     * Evict admin dashboard cache when system-wide metrics change.
     * Called after significant transactions, loan approvals, deposit processing.
     */
    public void evictAdminDashboardCache() {
        String key = CACHE_PREFIX + ADMIN_DASHBOARD_KEY;
        redisTemplate.delete(key);
        log.debug("Evicted admin dashboard cache");
    }

    /**
     * Evict admin account list cache when accounts are modified or created.
     *
     * @param adminEmail Optional: if provided, evicts user-specific admin view
     */
    public void evictAdminAccountListCache(String adminEmail) {
        if (adminEmail != null && !adminEmail.isEmpty()) {
            String key = CACHE_PREFIX + ADMIN_ACCOUNTS_PREFIX + adminEmail;
            redisTemplate.delete(key);
            log.debug("Evicted admin account list cache for: {}", adminEmail);
        } else {
            // Evict all admin account list caches
            Set<String> keys = redisTemplate.keys(CACHE_PREFIX + ADMIN_ACCOUNTS_PREFIX + "*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
                log.debug("Evicted all admin account list caches (count: {})", keys.size());
            }
        }
    }

    /**
     * Evict all related caches for a user after critical operations.
     * Use this for transfers, large transactions, loan updates.
     *
     * @param userEmail The user's email
     * @param accountNumbers Account numbers to evict
     */
    public void evictUserAllCaches(String userEmail, String... accountNumbers) {
        evictUserAnalyticsCache(userEmail);
        for (String accountNumber : accountNumbers) {
            evictAccountCache(accountNumber);
        }
        evictAdminDashboardCache(); // Dashboard may show this user's transactions
        log.debug("Evicted all caches for user: {}", userEmail);
    }

    /**
     * Perform a selective cache eviction based on operation type.
     * This is more efficient than evicting everything.
     *
     * @param operationType Type of operation (TRANSFER, DEPOSIT, EMI, LOAN_APPROVAL, etc.)
     * @param userEmail The affected user's email
     * @param accountNumbers The affected account numbers
     */
    public void evictByOperationType(String operationType, String userEmail, String... accountNumbers) {
        switch (operationType.toUpperCase()) {
            case "TRANSFER":
                // Evict both accounts involved
                for (String accNum : accountNumbers) {
                    evictAccountCache(accNum);
                }
                evictUserAnalyticsCache(userEmail);
                evictAdminDashboardCache();
                break;

            case "DEPOSIT":
            case "EMI":
                // Evict user analytics and specific account
                evictUserAnalyticsCache(userEmail);
                if (accountNumbers.length > 0) {
                    evictAccountCache(accountNumbers[0]);
                }
                evictAdminDashboardCache();
                break;

            case "LOAN_APPROVAL":
            case "LOAN_REJECTION":
                evictUserAnalyticsCache(userEmail);
                evictAdminDashboardCache();
                break;

            case "ACCOUNT_UPDATE":
                for (String accNum : accountNumbers) {
                    evictAccountCache(accNum);
                }
                break;

            case "FULL":
            default:
                // Nuclear option - clear all user and admin caches
                evictUserAllCaches(userEmail, accountNumbers);
                evictAdminAccountListCache(null);
                break;
        }
        log.info("Evicted caches for operation: {} user: {}", operationType, userEmail);
    }

    /**
     * Get total number of cache keys in Redis (for monitoring).
     *
     * @return Number of bankwise cache keys
     */
    public long getCacheKeyCount() {
        Set<String> keys = redisTemplate.keys(CACHE_PREFIX + "*");
        return keys != null ? keys.size() : 0;
    }

    /**
     * Clear all bankwise caches (use with caution).
     */
    public void clearAllBankwiseCaches() {
        Set<String> keys = redisTemplate.keys(CACHE_PREFIX + "*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
            log.warn("Cleared all bankwise caches (count: {})", keys.size());
        }
    }
}
