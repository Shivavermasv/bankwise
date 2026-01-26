package com.example.banking_system.controller;

import com.example.banking_system.config.CacheConfig;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.Role;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.DepositRepository;
import com.example.banking_system.repository.LoanRepo;
import com.example.banking_system.repository.NotificationRepository;
import com.example.banking_system.repository.SupportTicketRepository;
import com.example.banking_system.repository.TransactionRepository;
import com.example.banking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.RuntimeMXBean;
import java.lang.management.ThreadMXBean;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
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

    // In-memory metrics tracking (lightweight - no external dependencies)
    private static final Map<String, AtomicLong> requestCounts = new ConcurrentHashMap<>();
    private static final Map<String, AtomicLong> totalResponseTimes = new ConcurrentHashMap<>();
    private static final LocalDateTime startupTime = LocalDateTime.now();
    private static final AtomicLong totalRequests = new AtomicLong(0);
    private static final AtomicLong totalErrors = new AtomicLong(0);

    // Public method to record request metrics (called by RequestTimingFilter)
    public static void recordRequest(String endpoint, long responseTimeMs, boolean isError) {
        totalRequests.incrementAndGet();
        if (isError) {
            totalErrors.incrementAndGet();
        }
        requestCounts.computeIfAbsent(endpoint, k -> new AtomicLong(0)).incrementAndGet();
        totalResponseTimes.computeIfAbsent(endpoint, k -> new AtomicLong(0)).addAndGet(responseTimeMs);
    }

    @GetMapping("/analytics")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getSystemAnalytics(Authentication auth) {
        log.info("System analytics requested by: {}", auth.getName());
        
        Map<String, Object> analytics = new LinkedHashMap<>();
        
        // System uptime
        RuntimeMXBean runtime = ManagementFactory.getRuntimeMXBean();
        long uptimeMs = runtime.getUptime();
        Duration uptime = Duration.ofMillis(uptimeMs);
        analytics.put("uptime", Map.of(
            "days", uptime.toDays(),
            "hours", uptime.toHours() % 24,
            "minutes", uptime.toMinutes() % 60,
            "formatted", String.format("%dd %dh %dm", uptime.toDays(), uptime.toHours() % 24, uptime.toMinutes() % 60)
        ));
        analytics.put("startedAt", startupTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        
        // Memory usage
        MemoryMXBean memory = ManagementFactory.getMemoryMXBean();
        long heapUsed = memory.getHeapMemoryUsage().getUsed() / (1024 * 1024);
        long heapMax = memory.getHeapMemoryUsage().getMax() / (1024 * 1024);
        analytics.put("memory", Map.of(
            "usedMB", heapUsed,
            "maxMB", heapMax,
            "percentage", heapMax > 0 ? (heapUsed * 100) / heapMax : 0
        ));
        
        // Request statistics
        long total = totalRequests.get();
        long errors = totalErrors.get();
        analytics.put("requests", Map.of(
            "total", total,
            "errors", errors,
            "successRate", total > 0 ? ((total - errors) * 100.0) / total : 100.0
        ));
        
        // Response time analysis
        Map<String, Map<String, Object>> endpointMetrics = new LinkedHashMap<>();
        requestCounts.forEach((endpoint, count) -> {
            long countVal = count.get();
            long totalTime = totalResponseTimes.getOrDefault(endpoint, new AtomicLong(0)).get();
            double avgTime = countVal > 0 ? (double) totalTime / countVal : 0;
            endpointMetrics.put(endpoint, Map.of(
                "count", countVal,
                "avgResponseTimeMs", Math.round(avgTime * 100.0) / 100.0
            ));
        });
        analytics.put("endpoints", endpointMetrics);
        
        // Database statistics
        analytics.put("database", Map.of(
            "users", userRepository.count(),
            "accounts", accountRepository.count(),
            "transactions", transactionRepository.count(),
            "loans", loanRepo.count(),
            "deposits", depositRepository.count(),
            "notifications", notificationRepository.count(),
            "supportTickets", supportTicketRepository.count()
        ));
        
        // Thread statistics
        ThreadMXBean threadMX = ManagementFactory.getThreadMXBean();
        analytics.put("threads", Map.of(
            "active", threadMX.getThreadCount(),
            "peak", threadMX.getPeakThreadCount(),
            "daemon", threadMX.getDaemonThreadCount()
        ));
        
        // Cache statistics
        Map<String, Object> cacheStats = new LinkedHashMap<>();
        CacheConfig.getCacheStats().forEach((cacheName, stats) -> {
            cacheStats.put(cacheName, Map.of(
                "hits", stats.getHits(),
                "misses", stats.getMisses(),
                "hitRate", String.format("%.1f%%", stats.getHitRate())
            ));
        });
        analytics.put("cache", cacheStats);
        
        // JVM info
        analytics.put("jvm", Map.of(
            "version", System.getProperty("java.version"),
            "vendor", System.getProperty("java.vendor"),
            "availableProcessors", Runtime.getRuntime().availableProcessors()
        ));
        
        return ResponseEntity.ok(analytics);
    }

    @GetMapping("/support-tickets")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    public ResponseEntity<?> getSupportTickets(Authentication auth) {
        log.info("Support tickets requested by: {}", auth.getName());
        return ResponseEntity.ok(supportTicketRepository.findAll());
    }

    @GetMapping("/logs/recent")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Map<String, Object>> getRecentLogs() {
        // Return last N request metrics as pseudo-logs
        List<Map<String, Object>> recentRequests = new ArrayList<>();
        requestCounts.forEach((endpoint, count) -> {
            long countVal = count.get();
            long totalTime = totalResponseTimes.getOrDefault(endpoint, new AtomicLong(0)).get();
            recentRequests.add(Map.of(
                "endpoint", endpoint,
                "totalRequests", countVal,
                "totalTimeMs", totalTime,
                "avgTimeMs", countVal > 0 ? totalTime / countVal : 0
            ));
        });
        
        // Sort by request count descending
        recentRequests.sort((a, b) -> Long.compare(
            (Long) b.get("totalRequests"), 
            (Long) a.get("totalRequests")
        ));
        
        return ResponseEntity.ok(Map.of(
            "logs", recentRequests.subList(0, Math.min(20, recentRequests.size())),
            "totalEndpoints", recentRequests.size(),
            "generatedAt", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        ));
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
            "uptime", Duration.ofMillis(ManagementFactory.getRuntimeMXBean().getUptime()).toString()
        ));
    }

    /**
     * Lightweight ping endpoint for keep-alive purposes.
     * Can be called by external services (UptimeRobot, cron-job.org, etc.)
     * to prevent Render free tier from spinning down.
     */
    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("pong");
    }
}
