package com.example.banking_system.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Service for handling idempotent operations in banking transactions.
 * Prevents duplicate processing of critical operations like transfers, EMI payments, and deposits.
 * Uses Redis with 24-hour TTL to track operation IDs.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IdempotencyService {

    private final RedisTemplate<String, String> redisTemplate;

    private static final String IDEMPOTENCY_KEY_PREFIX = "idempotency::";
    private static final String RESULT_KEY_PREFIX = "idempotency:result::";
    private static final long IDEMPOTENCY_TTL_HOURS = 24;

    /**
     * Check if an operation with the given idempotency key has already been processed.
     * If it exists, return the cached result.
     *
     * @param idempotencyKey Unique identifier for the operation
     * @return Cached result if exists, null otherwise
     */
    public String getResult(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isEmpty()) {
            return null;
        }
        String resultKey = RESULT_KEY_PREFIX + idempotencyKey;
        String cachedResult = redisTemplate.opsForValue().get(resultKey);
        if (cachedResult != null) {
            log.info("Idempotency HIT: Returning cached result for key: {}", idempotencyKey);
        }
        return cachedResult;
    }

    /**
     * Record that an operation with the given idempotency key is being processed.
     * Returns false if another thread is already processing it.
     *
     * @param idempotencyKey Unique identifier for the operation
     * @return true if successfully acquired the lock, false if already being processed
     */
    public boolean acquireIdempotencyLock(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isEmpty()) {
            return true; // No idempotency key, proceed
        }
        String lockKey = IDEMPOTENCY_KEY_PREFIX + idempotencyKey;
        Boolean acquired = redisTemplate.opsForValue().setIfAbsent(lockKey, "processing", 5, TimeUnit.MINUTES);
        if (Boolean.TRUE.equals(acquired)) {
            log.debug("Idempotency LOCK acquired for key: {}", idempotencyKey);
            return true;
        }
        log.warn("Idempotency LOCK already held for key: {}", idempotencyKey);
        return false;
    }

    /**
     * Store the result of an operation for future retrieval in case of duplicate requests.
     *
     * @param idempotencyKey Unique identifier for the operation
     * @param result The result to cache as JSON string
     */
    public void storeResult(String idempotencyKey, String result) {
        if (idempotencyKey == null || idempotencyKey.isEmpty()) {
            return;
        }
        String resultKey = RESULT_KEY_PREFIX + idempotencyKey;
        redisTemplate.opsForValue().set(resultKey, result, IDEMPOTENCY_TTL_HOURS, TimeUnit.HOURS);
        // Release the lock after storing result
        String lockKey = IDEMPOTENCY_KEY_PREFIX + idempotencyKey;
        redisTemplate.delete(lockKey);
        log.info("Idempotency RESULT stored and lock released for key: {}", idempotencyKey);
    }

    /**
     * Release the idempotency lock without storing a result (for error cases).
     *
     * @param idempotencyKey Unique identifier for the operation
     */
    public void releaseLock(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isEmpty()) {
            return;
        }
        String lockKey = IDEMPOTENCY_KEY_PREFIX + idempotencyKey;
        redisTemplate.delete(lockKey);
        log.debug("Idempotency LOCK released for key: {}", idempotencyKey);
    }

    /**
     * Generate a new idempotency key. Can be used by clients that don't provide one.
     *
     * @return A new UUID-based idempotency key
     */
    public String generateKey() {
        return UUID.randomUUID().toString();
    }

    /**
     * Check if a key exists and is currently being processed.
     *
     * @param idempotencyKey The idempotency key to check
     * @return true if the operation is being processed, false otherwise
     */
    public boolean isProcessing(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isEmpty()) {
            return false;
        }
        String lockKey = IDEMPOTENCY_KEY_PREFIX + idempotencyKey;
        return Boolean.TRUE.equals(redisTemplate.hasKey(lockKey));
    }
}
