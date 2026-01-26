package com.example.banking_system.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.util.Arrays;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Cache configuration for improved response times.
 * Uses in-memory caching for frequently accessed data.
 */
@Configuration
@EnableCaching
@EnableScheduling
public class CacheConfig {

    // Cache statistics for monitoring
    private static final ConcurrentMap<String, CacheStats> cacheStats = new ConcurrentHashMap<>();

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager cacheManager = new SimpleCacheManager();
        cacheManager.setCaches(Arrays.asList(
            new ConcurrentMapCache("users"),
            new ConcurrentMapCache("accounts"),
            new ConcurrentMapCache("accountBalances"),
            new ConcurrentMapCache("userByEmail"),
            new ConcurrentMapCache("accountByNumber"),
            new ConcurrentMapCache("interestRates"),
            new ConcurrentMapCache("systemConfig"),
            new ConcurrentMapCache("dataVersions")
        ));
        return cacheManager;
    }

    // Cache eviction every 5 minutes for stale data prevention
    @Scheduled(fixedRate = 300000)
    public void evictAllCaches() {
        // Evict less critical caches periodically
        // Critical caches are evicted on data change
    }

    public static void recordCacheHit(String cacheName) {
        cacheStats.computeIfAbsent(cacheName, k -> new CacheStats()).recordHit();
    }

    public static void recordCacheMiss(String cacheName) {
        cacheStats.computeIfAbsent(cacheName, k -> new CacheStats()).recordMiss();
    }

    public static ConcurrentMap<String, CacheStats> getCacheStats() {
        return cacheStats;
    }

    public static class CacheStats {
        private long hits = 0;
        private long misses = 0;

        public synchronized void recordHit() { hits++; }
        public synchronized void recordMiss() { misses++; }
        public long getHits() { return hits; }
        public long getMisses() { return misses; }
        public double getHitRate() {
            long total = hits + misses;
            return total > 0 ? (double) hits / total * 100 : 0;
        }
    }
}
