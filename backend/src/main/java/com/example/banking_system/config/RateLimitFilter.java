package com.example.banking_system.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate limiting filter to prevent API abuse and ensure fair usage.
 * Also helps protect against rapid duplicate requests.
 */
@Component
@Order(1)
@Slf4j
public class RateLimitFilter implements Filter {

    // Track requests per IP per minute
    private final ConcurrentHashMap<String, RateLimitBucket> rateLimits = new ConcurrentHashMap<>();
    
    // Track recent request hashes to prevent duplicates
    private final ConcurrentHashMap<String, Long> recentRequests = new ConcurrentHashMap<>();

    private static final int MAX_REQUESTS_PER_MINUTE = 120;
    private static final long DUPLICATE_WINDOW_MS = 500; // 500ms window for duplicate detection
    private static final long CLEANUP_INTERVAL_MS = 60000;
    
    private long lastCleanup = System.currentTimeMillis();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        String path = httpRequest.getRequestURI();
        
        // Skip rate limiting for static resources and health checks
        if (isExcluded(path)) {
            chain.doFilter(request, response);
            return;
        }

        String clientIP = getClientIP(httpRequest);
        String requestKey = generateRequestKey(httpRequest);
        
        // Cleanup old entries periodically
        cleanupIfNeeded();
        
        // Check for rapid duplicate requests (same user, same endpoint, same params)
        if (isDuplicateRequest(requestKey)) {
            log.warn("Duplicate request detected from {}: {}", clientIP, path);
            httpResponse.setStatus(429);
            httpResponse.setContentType("application/json");
            httpResponse.getWriter().write("{\"error\":\"Too many requests. Please wait.\",\"retryAfter\":1}");
            return;
        }
        
        // Rate limiting check
        RateLimitBucket bucket = rateLimits.computeIfAbsent(clientIP, k -> new RateLimitBucket());
        
        if (!bucket.tryConsume()) {
            log.warn("Rate limit exceeded for IP: {}", clientIP);
            httpResponse.setStatus(429);
            httpResponse.setHeader("Retry-After", "60");
            httpResponse.setContentType("application/json");
            httpResponse.getWriter().write("{\"error\":\"Rate limit exceeded. Try again later.\",\"retryAfter\":60}");
            return;
        }
        
        // Record this request
        recentRequests.put(requestKey, System.currentTimeMillis());
        
        chain.doFilter(request, response);
    }

    private boolean isExcluded(String path) {
        return path.startsWith("/api/system/ping") ||
               path.startsWith("/api/system/health") ||
               path.startsWith("/actuator") ||
               path.startsWith("/ws") ||
               path.contains("/swagger") ||
               path.contains("/api-docs") ||
               path.endsWith(".js") ||
               path.endsWith(".css") ||
               path.endsWith(".ico");
    }

    private String getClientIP(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String generateRequestKey(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        String user = auth != null ? auth.hashCode() + "" : getClientIP(request);
        return user + ":" + request.getMethod() + ":" + request.getRequestURI() + 
               ":" + (request.getQueryString() != null ? request.getQueryString() : "");
    }

    private boolean isDuplicateRequest(String requestKey) {
        Long lastRequestTime = recentRequests.get(requestKey);
        if (lastRequestTime == null) {
            return false;
        }
        return (System.currentTimeMillis() - lastRequestTime) < DUPLICATE_WINDOW_MS;
    }

    private void cleanupIfNeeded() {
        long now = System.currentTimeMillis();
        if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
            return;
        }
        lastCleanup = now;
        
        // Clean up old rate limit buckets
        rateLimits.entrySet().removeIf(entry -> entry.getValue().isExpired());
        
        // Clean up old request hashes
        recentRequests.entrySet().removeIf(entry -> 
            (now - entry.getValue()) > DUPLICATE_WINDOW_MS * 2);
    }

    private static class RateLimitBucket {
        private final AtomicInteger tokens = new AtomicInteger(MAX_REQUESTS_PER_MINUTE);
        private long lastRefill = System.currentTimeMillis();
        private static final long REFILL_INTERVAL_MS = 60000;

        public synchronized boolean tryConsume() {
            refillIfNeeded();
            if (tokens.get() > 0) {
                tokens.decrementAndGet();
                return true;
            }
            return false;
        }

        private void refillIfNeeded() {
            long now = System.currentTimeMillis();
            if (now - lastRefill >= REFILL_INTERVAL_MS) {
                tokens.set(MAX_REQUESTS_PER_MINUTE);
                lastRefill = now;
            }
        }

        public boolean isExpired() {
            return System.currentTimeMillis() - lastRefill > REFILL_INTERVAL_MS * 5;
        }
    }
}
