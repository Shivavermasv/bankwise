package com.example.banking_system.controller;

import com.example.banking_system.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.RuntimeMXBean;
import java.lang.management.ThreadMXBean;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api/system")
@RequiredArgsConstructor
@Slf4j
public class SystemAnalyticsController {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final LoanRepo loanRepo;
    private final DepositRepository depositRepository;
    private final NotificationRepository notificationRepository;
    private final SupportTicketRepository supportTicketRepository;
    private final RedisConnectionFactory redisConnectionFactory;

    /* ---------------- Runtime Metrics ---------------- */

    private static final Map<String, AtomicLong> requestCounts = new ConcurrentHashMap<>();
    private static final Map<String, AtomicLong> totalResponseTimes = new ConcurrentHashMap<>();
    private static final AtomicLong totalRequests = new AtomicLong();
    private static final AtomicLong totalErrors = new AtomicLong();
    private static final LocalDateTime startupTime = LocalDateTime.now();

    public static void recordRequest(String endpoint, long timeMs, boolean error) {
        totalRequests.incrementAndGet();
        if (error) totalErrors.incrementAndGet();

        requestCounts.computeIfAbsent(endpoint, k -> new AtomicLong()).incrementAndGet();
        totalResponseTimes.computeIfAbsent(endpoint, k -> new AtomicLong()).addAndGet(timeMs);
    }

    /* ---------------- Analytics ---------------- */

    @GetMapping("/analytics")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> analytics(Authentication auth) {

        RuntimeMXBean runtime = ManagementFactory.getRuntimeMXBean();
        MemoryMXBean memory = ManagementFactory.getMemoryMXBean();
        ThreadMXBean threads = ManagementFactory.getThreadMXBean();

        long heapUsed = memory.getHeapMemoryUsage().getUsed() / 1024 / 1024;
        long heapMax = memory.getHeapMemoryUsage().getMax() / 1024 / 1024;

        Map<String, Object> result = new LinkedHashMap<>();

        result.put("uptime", Map.of(
                "startedAt", startupTime,
                "uptimeMs", runtime.getUptime()
        ));

        result.put("memory", Map.of(
                "usedMB", heapUsed,
                "maxMB", heapMax,
                "usagePercent", heapMax > 0 ? (heapUsed * 100) / heapMax : 0
        ));

        result.put("threads", Map.of(
                "active", threads.getThreadCount(),
                "daemon", threads.getDaemonThreadCount(),
                "peak", threads.getPeakThreadCount()
        ));

        result.put("requests", Map.of(
                "total", totalRequests.get(),
                "errors", totalErrors.get(),
                "successRate",
                totalRequests.get() == 0 ? 100 :
                        ((totalRequests.get() - totalErrors.get()) * 100.0) / totalRequests.get()
        ));

        /* Endpoint metrics */
        Map<String, Object> endpoints = new HashMap<>();
        requestCounts.forEach((ep, count) -> {
            long totalTime = totalResponseTimes.get(ep).get();
            endpoints.put(ep, Map.of(
                    "count", count.get(),
                    "avgMs", count.get() == 0 ? 0 : totalTime / count.get()
            ));
        });
        result.put("endpoints", endpoints);

        /* Database */
        result.put("database", Map.of(
                "users", userRepository.count(),
                "accounts", accountRepository.count(),
                "transactions", transactionRepository.count(),
                "loans", loanRepo.count(),
                "deposits", depositRepository.count(),
                "notifications", notificationRepository.count(),
                "supportTickets", supportTicketRepository.count()
        ));

        /* Redis health */
        result.put("redis", redisHealth());

        result.put("jvm", Map.of(
                "javaVersion", System.getProperty("java.version"),
                "processors", Runtime.getRuntime().availableProcessors()
        ));

        return ResponseEntity.ok(result);
    }

    /* ---------------- Redis Health ---------------- */

    private Map<String, Object> redisHealth() {
        try (var connection = redisConnectionFactory.getConnection()) {
            String pong = connection.ping();
            return Map.of(
                    "status", "UP",
                    "ping", pong
            );
        } catch (Exception e) {
            return Map.of(
                    "status", "DOWN",
                    "error", e.getMessage()
            );
        }
    }

    /* ---------------- Health & Ping ---------------- */

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "time", LocalDateTime.now()
        ));
    }

    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("pong");
    }
}
