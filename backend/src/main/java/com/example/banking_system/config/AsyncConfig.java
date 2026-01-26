package com.example.banking_system.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.lang.reflect.Method;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Async Configuration for thread parallelization.
 * This enables background processing so API calls respond immediately
 * while heavy operations (email, notifications, PDF generation) run in background.
 */
@Configuration
@Slf4j
public class AsyncConfig implements AsyncConfigurer {

    /**
     * Main executor for general async tasks like notifications and emails.
     * Configured with proper thread pool sizing and rejection handling.
     */
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        
        // Core pool size - threads always kept alive
        executor.setCorePoolSize(4);
        
        // Max pool size - maximum threads when queue is full
        executor.setMaxPoolSize(10);
        
        // Queue capacity - pending tasks before creating new threads
        executor.setQueueCapacity(100);
        
        // Thread naming for debugging
        executor.setThreadNamePrefix("Async-Task-");
        
        // Keep alive time for excess threads
        executor.setKeepAliveSeconds(60);
        
        // Wait for tasks to complete on shutdown
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        
        // Rejection policy - log and run in caller thread as fallback
        executor.setRejectedExecutionHandler(new RejectedExecutionHandler() {
            @Override
            public void rejectedExecution(Runnable r, ThreadPoolExecutor executor) {
                log.warn("Task rejected from async executor, running in caller thread");
                if (!executor.isShutdown()) {
                    r.run();
                }
            }
        });
        
        executor.initialize();
        log.info("Async Task Executor initialized: corePoolSize={}, maxPoolSize={}, queueCapacity={}", 
                executor.getCorePoolSize(), executor.getMaxPoolSize(), executor.getQueueCapacity());
        return executor;
    }

    /**
     * Dedicated executor for email operations with higher queue capacity.
     * Email sending can be slow, so we allow more tasks to queue.
     */
    @Bean(name = "emailExecutor")
    public Executor emailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("Email-Task-");
        executor.setKeepAliveSeconds(120);
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(120);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    /**
     * Dedicated executor for notification operations.
     */
    @Bean(name = "notificationExecutor")
    public Executor notificationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(150);
        executor.setThreadNamePrefix("Notification-Task-");
        executor.setKeepAliveSeconds(60);
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    /**
     * Executor for heavy operations like PDF generation and batch processing.
     */
    @Bean(name = "heavyTaskExecutor")
    public Executor heavyTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("Heavy-Task-");
        executor.setKeepAliveSeconds(300);
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(300);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        executor.initialize();
        return executor;
    }

    @Override
    public Executor getAsyncExecutor() {
        return taskExecutor();
    }

    /**
     * Global exception handler for async tasks.
     * Logs errors that occur in background threads.
     */
    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return new AsyncUncaughtExceptionHandler() {
            @Override
            public void handleUncaughtException(Throwable ex, Method method, Object... params) {
                log.error("ASYNC ERROR in method={} params={}", method.getName(), params, ex);
            }
        };
    }
}




