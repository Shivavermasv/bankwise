package com.example.banking_system.config;

import com.example.banking_system.controller.SystemAnalyticsController;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Slf4j
public class RequestTimingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        long start = System.nanoTime();
        try {
            filterChain.doFilter(request, response);
        } finally {
            long elapsedMs = (System.nanoTime() - start) / 1_000_000;
            response.addHeader("X-Response-Time", elapsedMs + "ms");
            
            // Record metrics for system analytics
            String endpoint = normalizeEndpoint(request.getRequestURI());
            boolean isError = response.getStatus() >= 400;
            SystemAnalyticsController.recordRequest(endpoint, elapsedMs, isError);
            
            log.info("REQ {} {} -> {} ({} ms)", request.getMethod(), request.getRequestURI(), response.getStatus(), elapsedMs);
        }
    }

    // Normalize endpoints to group similar paths (e.g., /api/user/123 -> /api/user/{id})
    private String normalizeEndpoint(String uri) {
        if (uri == null) return "unknown";
        // Replace numeric path segments with {id}
        return uri.replaceAll("/\\d+", "/{id}")
                  .replaceAll("/[a-f0-9-]{36}", "/{uuid}"); // UUIDs
    }
}




