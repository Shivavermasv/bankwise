# 🎯 BankWise Backend - Complete Interview Preparation Guide

> **Last Updated:** February 2, 2026  
> **Project:** BankWise - Online Banking System  
> **Tech Stack:** Spring Boot 3.3.2, Java 17, PostgreSQL, Redis, WebSocket

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Design Patterns](#2-architecture--design-patterns)
3. [Spring Boot Core Concepts](#3-spring-boot-core-concepts)
4. [Security Implementation](#4-security-implementation)
5. [Database & JPA/Hibernate](#5-database--jpahibernate)
6. [Caching Strategy with Redis](#6-caching-strategy-with-redis)
7. [Async Processing & Event-Driven Architecture](#7-async-processing--event-driven-architecture)
8. [WebSocket Real-Time Notifications](#8-websocket-real-time-notifications)
9. [Transaction Management](#9-transaction-management)
10. [API Design & RESTful Services](#10-api-design--restful-services)
11. [Exception Handling](#11-exception-handling)
12. [Scheduled Tasks & Background Jobs](#12-scheduled-tasks--background-jobs)
13. [Idempotency & Concurrency Control](#13-idempotency--concurrency-control)
14. [Email Service Integration](#14-email-service-integration)
15. [Audit Logging](#15-audit-logging)
16. [Performance Optimizations](#16-performance-optimizations)
17. [Testing Strategy](#17-testing-strategy)
18. [Deployment & DevOps](#18-deployment--devops)
19. [Key Interview Questions & Answers](#19-key-interview-questions--answers)

---

## 1. Project Overview

### What is BankWise?

BankWise is a **full-featured online banking system** that provides:

- **User Management:** Registration, authentication, profile management
- **Account Management:** Savings/Current accounts, KYC verification
- **Transactions:** Fund transfers, deposits, withdrawals
- **Loans:** Application, approval, EMI auto-debit, credit scoring
- **Virtual Cards:** Debit/Credit cards with limits management
- **Notifications:** Real-time WebSocket + Email notifications
- **Admin Dashboard:** Account verification, analytics, audit logs
- **Scheduled Payments:** Recurring payments and bill payments

### Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    BANKWISE BACKEND                          │
├─────────────────────────────────────────────────────────────┤
│  Framework:     Spring Boot 3.3.2                           │
│  Language:      Java 17 (LTS)                               │
│  Database:      PostgreSQL (Production) / H2 (Testing)      │
│  Cache:         Redis (with Lettuce client)                 │
│  Security:      Spring Security + JWT (jjwt 0.9.1)          │
│  API Docs:      SpringDoc OpenAPI 2.5.0 (Swagger)           │
│  Email:         Brevo (Sendinblue) API                      │
│  PDF:           iText 5.5.13 + OpenPDF 1.3.29               │
│  Build:         Maven                                        │
│  Server:        Embedded Tomcat (HTTP/2 enabled)            │
└─────────────────────────────────────────────────────────────┘
```

### Package Structure

```
com.example.banking_system/
├── BankingSystemApplication.java    # Main entry point
├── config/                          # Security, Cache, Async, WebSocket configs
├── controller/                      # REST API endpoints (18 controllers)
├── dto/                             # Data Transfer Objects (21 DTOs)
├── entity/                          # JPA Entities (12 entities)
├── enums/                           # Enumerations (11 enums)
├── event/                           # Event-driven architecture
├── exception/                       # Custom exceptions + Global handler
├── Genrator/                        # Custom ID generation
├── repository/                      # Spring Data JPA repositories
└── service/                         # Business logic layer (21 services)
```

---

## 2. Architecture & Design Patterns

### 2.1 Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│         (Controllers - REST APIs, WebSocket)                 │
├─────────────────────────────────────────────────────────────┤
│                    SERVICE LAYER                             │
│         (Business Logic, Transaction Management)             │
├─────────────────────────────────────────────────────────────┤
│                    REPOSITORY LAYER                          │
│         (Data Access, Spring Data JPA)                       │
├─────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                      │
│         (Database, Redis Cache, Email API)                   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Design Patterns Used

| Pattern | Implementation | Purpose |
|---------|---------------|---------|
| **Repository Pattern** | Spring Data JPA Repositories | Data access abstraction |
| **DTO Pattern** | Request/Response DTOs | Decouple entities from API |
| **Builder Pattern** | Lombok @Builder | Object creation |
| **Singleton** | Spring Beans (@Service, @Component) | Single instance per context |
| **Observer/Pub-Sub** | ApplicationEventPublisher | Event-driven notifications |
| **Filter Chain** | Security Filters | Request interception |
| **Template Method** | Spring's JdbcTemplate, RedisTemplate | Database/cache operations |
| **Strategy** | Multiple executors for async tasks | Different thread pools |

### 2.3 Main Application Entry Point

```java
@SpringBootApplication
@ComponentScan(
    basePackages = "com.example.banking_system",
    excludeFilters = @ComponentScan.Filter(
        type = FilterType.REGEX, 
        pattern = "com\\.example\\.banking_system\\.legacy\\..*"
    )
)
@EnableScheduling      // For @Scheduled methods
@EnableAsync           // For @Async methods
@EnableRetry           // For @Retryable methods
@EnableCaching         // For @Cacheable methods
public class BankingSystemApplication {
    public static void main(String[] args) {
        // Load .env file for local development
        Dotenv dotenv = Dotenv.configure()
                .directory("./")
                .ignoreIfMissing()
                .load();
        
        dotenv.entries().forEach(entry -> 
            System.setProperty(entry.getKey(), entry.getValue())
        );
        
        SpringApplication.run(BankingSystemApplication.class, args);
    }
}
```

**Interview Explanation:**
> "The main class uses multiple annotations to enable Spring Boot's auto-configuration along with specific features like scheduling, async processing, retry mechanisms, and caching. I also integrate dotenv for environment variable management, making it easy to switch between development and production configurations."

---

## 3. Spring Boot Core Concepts

### 3.1 Dependency Injection (IoC)

Spring Boot uses **Inversion of Control (IoC)** container for dependency management.

**Types of Injection Used:**

```java
// 1. Constructor Injection (RECOMMENDED - used in this project)
@Service
@RequiredArgsConstructor  // Lombok generates constructor
public class TransactionService {
    private final AccountRepository accountRepository;
    private final NotificationService notificationService;
    // No need for @Autowired with final fields + @RequiredArgsConstructor
}

// 2. Field Injection (Used sparingly)
@Autowired
private EmailService emailService;

// 3. @Value Injection for properties
@Value("${bankwise.transfer.max-amount:50000}")
private BigDecimal maxTransferAmount;
```

**Why Constructor Injection is Preferred:**
1. **Immutability:** Fields can be `final`
2. **Testability:** Easy to mock in unit tests
3. **Explicit Dependencies:** Clear what a class needs
4. **Fail-Fast:** Fails at startup if dependencies missing

### 3.2 Spring Annotations Explained

| Annotation | Purpose | Example in Project |
|------------|---------|-------------------|
| `@SpringBootApplication` | Combines @Configuration, @EnableAutoConfiguration, @ComponentScan | Main class |
| `@RestController` | Combines @Controller + @ResponseBody | All controllers |
| `@Service` | Business logic layer component | UserService, LoanService |
| `@Repository` | Data access layer + exception translation | AccountRepository |
| `@Component` | Generic Spring-managed component | RateLimitFilter |
| `@Configuration` | Defines beans programmatically | SecurityConfig, CacheConfig |
| `@Bean` | Creates a managed bean | passwordEncoder(), cacheManager() |
| `@Transactional` | Transaction management | Service methods |
| `@Async` | Async method execution | Email sending |
| `@Scheduled` | Periodic task execution | EMI processing |
| `@Cacheable` | Method result caching | getAccountByNumber() |

### 3.3 Configuration Properties

```properties
# application.properties structure

# Database Configuration
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/bankwise}
spring.datasource.username=${DB_USERNAME:postgres}
spring.datasource.password=${DB_PASSWORD:postgres}

# JPA/Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect

# Connection Pool (HikariCP)
spring.datasource.hikari.maximum-pool-size=15
spring.datasource.hikari.minimum-idle=3

# Custom Application Properties
bankwise.transfer.min-amount=1
bankwise.transfer.max-amount=50000
bankwise.transfer.daily-limit=100000
bankwise.loan.min-amount=1000
bankwise.loan.max-amount=500000
```

**Interview Explanation:**
> "I use Spring's externalized configuration with environment variable fallbacks. The `${VAR:default}` syntax provides defaults for local development while allowing production values to be injected via environment variables. This follows the 12-factor app methodology."

---

## 4. Security Implementation

### 4.1 Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REQUEST FLOW                              │
├─────────────────────────────────────────────────────────────┤
│  Client Request                                              │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────┐                                         │
│  │ RateLimitFilter │ (Order 1) - Prevents API abuse          │
│  └────────┬────────┘                                         │
│           ▼                                                  │
│  ┌─────────────────────┐                                     │
│  │ RequestTimingFilter │ - Metrics & logging                 │
│  └────────┬────────────┘                                     │
│           ▼                                                  │
│  ┌────────────────────────┐                                  │
│  │ JWTAuthenticationFilter │ - Login (/api/login)            │
│  └────────┬───────────────┘                                  │
│           ▼                                                  │
│  ┌────────────────────────┐                                  │
│  │ JWTAuthorizationFilter │ - Token validation               │
│  └────────┬───────────────┘                                  │
│           ▼                                                  │
│  ┌──────────────┐                                            │
│  │  Controller  │                                            │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Security Configuration

```java
@Configuration
@EnableMethodSecurity  // Enables @PreAuthorize
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, 
            AuthenticationManager authManager) throws Exception {
        
        JWTAuthenticationFilter jwtAuthFilter = 
            new JWTAuthenticationFilter(authManager, accountRepository, 
                                        otpService, developerPassword);
        jwtAuthFilter.setFilterProcessesUrl("/api/login");
        
        http
            // 1. Disable CSRF (stateless JWT auth)
            .csrf(AbstractHttpConfigurer::disable)
            
            // 2. Configure CORS
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            
            // 3. Stateless session management
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // 4. Authorization rules
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/login",
                    "/api/auth/register",
                    "/api/create",
                    "/api/password/reset-request",
                    "/v3/api-docs/**",
                    "/swagger-ui/**",
                    "/ws/**"
                ).permitAll()
                .anyRequest().authenticated()
            )
            
            // 5. Add custom filters
            .addFilter(jwtAuthFilter)
            .addFilter(new JWTAuthorizationFilter(authManager));
        
        return http.build();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();  // 10 rounds by default
    }
    
    @Bean
    public DaoAuthenticationProvider daoAuthenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        provider.setHideUserNotFoundExceptions(false);  // Allow specific errors
        return provider;
    }
}
```

### 4.3 JWT Token Generation & Validation

```java
// Token Generation (OtpService.java)
public String generateToken(String email) {
    User user = getUser(email);
    List<String> roles = List.of("ROLE_" + user.getRole().name());
    
    return Jwts.builder()
        .setSubject(email)
        .claim("roles", roles)
        .setExpiration(new Date(System.currentTimeMillis() + 
            SecurityConstants.EXPIRATION_TIME))  // 10 days
        .signWith(SignatureAlgorithm.HS512, 
            SecurityConstants.SECRET.getBytes(StandardCharsets.UTF_8))
        .compact();
}

// Token Validation (JWTAuthorizationFilter.java)
private UsernamePasswordAuthenticationToken getAuthentication(
        HttpServletRequest request) {
    String token = request.getHeader("Authorization");
    
    if (token != null && token.startsWith("Bearer ")) {
        Claims claims = Jwts.parser()
            .setSigningKey(SecurityConstants.SECRET.getBytes(StandardCharsets.UTF_8))
            .parseClaimsJws(token.replace("Bearer ", ""))
            .getBody();
        
        String user = claims.getSubject();
        List<String> roles = claims.get("roles", List.class);
        
        List<GrantedAuthority> authorities = roles.stream()
            .map(role -> new SimpleGrantedAuthority(
                role.startsWith("ROLE_") ? role : "ROLE_" + role))
            .collect(Collectors.toList());
        
        return new UsernamePasswordAuthenticationToken(user, null, authorities);
    }
    return null;
}
```

### 4.4 Two-Factor Authentication (OTP)

```java
// Login Flow with OTP
@Override
protected void successfulAuthentication(HttpServletRequest req, 
        HttpServletResponse res, FilterChain chain, 
        Authentication auth) throws IOException {
    
    User user = (User) ((UserDetails) auth.getPrincipal());
    String email = user.getEmail();
    
    // Developers skip OTP
    if (user.getRole() == Role.DEVELOPER || isDevBypass) {
        sendJwtResponse(res, user);
        return;
    }
    
    // Check if OTP already verified in this session
    if (userService.isOtpAlreadyVerified(email)) {
        sendJwtResponse(res, user);
    } else {
        // Generate and send OTP
        String otp = userService.generateAndStoreOtp(email);
        userService.sendOtp(email, otp);
        
        res.setStatus(HttpServletResponse.SC_ACCEPTED);  // 202
        new ObjectMapper().writeValue(res.getOutputStream(), Map.of(
            "message", "OTP sent to your registered email.",
            "email", email
        ));
    }
}
```

### 4.5 Role-Based Access Control (RBAC)

```java
// Roles defined in enum
public enum Role implements GrantedAuthority {
    USER,       // Regular customer
    CUSTOMER,   // Same as USER
    ADMIN,      // Full system access
    MANAGER,    // Account approval, loan management
    DEVELOPER;  // System analytics, bypass OTP
    
    @Override
    public String getAuthority() {
        return name();
    }
}

// Method-level security
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
@PostMapping("/status")
public ResponseEntity<Object> updateLoanStatus(...) { }

@PreAuthorize("hasAnyRole('USER','CUSTOMER')")
@PostMapping("/transfer")
public ResponseEntity<Object> transfer(...) { }
```

**Interview Explanation:**
> "Security is implemented in layers. First, rate limiting prevents abuse. Then JWT authentication validates credentials and issues tokens. For sensitive operations, I implemented two-factor authentication via email OTP. Role-based access control at the method level ensures users can only access authorized endpoints."

---

## 5. Database & JPA/Hibernate

### 5.1 Entity Relationships

```
┌─────────────┐     1:1      ┌─────────────┐
│    User     │◄────────────►│   Account   │
└──────┬──────┘              └──────┬──────┘
       │                            │
       │ 1:N                        │ 1:N
       ▼                            ▼
┌─────────────┐              ┌─────────────┐
│Notification │              │ Transaction │
└─────────────┘              └─────────────┘
       
┌─────────────┐     1:N      ┌─────────────┐
│   Account   │◄────────────►│ LoanRequest │
└─────────────┘              └─────────────┘
       │
       │ 1:1
       ▼
┌─────────────┐
│ KycDetails  │
└─────────────┘
```

### 5.2 Entity Example: User

```java
@Setter
@Getter
@Entity(name = "users")  // Table name
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class User implements UserDetails {  // Spring Security integration
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private LocalDate dateOfBirth;
    
    @Column(unique = true, nullable = false)
    private String email;
    
    private String phone;
    private String password;
    
    @Enumerated(EnumType.STRING)  // Store as 'ADMIN' not '0'
    private Role role;
    
    private String address;
    
    @Basic(fetch = FetchType.LAZY)  // Don't load until needed
    @Column(columnDefinition = "BYTEA")
    private byte[] profilePhoto;
    
    @Builder.Default
    private Integer creditScore = 700;
    
    private String transactionPin;  // Hashed
    
    // Spring Security methods
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
    
    @Override
    public String getUsername() {
        return this.email;  // Email used as username
    }
    
    @Override
    public boolean isEnabled() {
        return true;
    }
}
```

### 5.3 Entity Example: Account with Business Logic

```java
@Entity
@Table(
    name = "account",
    indexes = {
        @Index(name = "idx_account_number", columnList = "account_number", unique = true),
        @Index(name = "idx_account_status", columnList = "verificationStatus"),
        @Index(name = "idx_account_user", columnList = "user_id")
    }
)
public class Account {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
    
    @Column(name = "account_number", columnDefinition = "varchar(64)")
    private String accountNumber;
    
    private BigDecimal balance = BigDecimal.valueOf(5000);  // Default
    
    @Enumerated(EnumType.STRING)
    private VerificationStatus verificationStatus = VerificationStatus.PENDING;
    
    @Enumerated(EnumType.STRING)
    private AccountType accountType;
    
    // Overdraft fields
    private Boolean overdraftEnabled = false;
    private BigDecimal overdraftLimit = BigDecimal.ZERO;
    private BigDecimal overdraftUsed = BigDecimal.ZERO;
    
    @ManyToOne(cascade = CascadeType.PERSIST, fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    @JsonIgnore  // Prevent circular serialization
    private User user;
    
    @Column(updatable = false)
    private LocalDateTime createdAt;
    
    // Auto-generate account number on persist
    @PrePersist
    protected void onCreate() {
        accountNumber = CustomIdGenerator.generate().toString();
        createdAt = LocalDateTime.now();
    }
    
    // Business method: Get available balance including overdraft
    public BigDecimal getAvailableBalance() {
        if (overdraftEnabled && overdraftLimit != null) {
            return balance.add(overdraftLimit)
                .subtract(overdraftUsed != null ? overdraftUsed : BigDecimal.ZERO);
        }
        return balance;
    }
    
    // Business method: Process withdrawal with overdraft
    public void withdraw(BigDecimal amount) {
        if (balance.compareTo(amount) >= 0) {
            balance = balance.subtract(amount);
        } else if (overdraftEnabled && canWithdraw(amount)) {
            BigDecimal shortfall = amount.subtract(balance);
            balance = BigDecimal.ZERO;
            overdraftUsed = overdraftUsed.add(shortfall);
        } else {
            throw new IllegalStateException("Insufficient funds");
        }
    }
}
```

### 5.4 Repository with Custom Queries

```java
public interface AccountRepository extends JpaRepository<Account, Long>, 
                                           JpaSpecificationExecutor<Account> {
    
    // Spring Data derived query
    Optional<Account> findByAccountNumber(String accountNumber);
    
    // Fetch with eager loading (avoids N+1 problem)
    @Query("SELECT a FROM Account a LEFT JOIN FETCH a.user " +
           "WHERE a.accountNumber = :accountNumber")
    Optional<Account> findByAccountNumberWithUser(@Param("accountNumber") String accountNumber);
    
    // Pessimistic locking for transfers
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Account a WHERE a.accountNumber = :accountNumber")
    Optional<Account> findByAccountNumberForUpdate(@Param("accountNumber") String accountNumber);
    
    // Complex search query
    @Query("SELECT a FROM Account a JOIN a.user u " +
           "WHERE (:status IS NULL OR a.verificationStatus = :status) " +
           "AND (:q IS NULL OR " +
           "CAST(a.accountNumber AS string) LIKE CONCAT('%', CAST(:q AS string), '%') OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))")
    List<Account> searchAccounts(
        @Param("status") VerificationStatus status,
        @Param("q") String q
    );
}
```

### 5.5 HikariCP Connection Pool Configuration

```properties
# Connection Pool Tuning
spring.datasource.hikari.minimum-idle=3           # Min connections kept alive
spring.datasource.hikari.maximum-pool-size=15     # Max connections
spring.datasource.hikari.idle-timeout=30000       # 30s before idle conn closed
spring.datasource.hikari.max-lifetime=1800000     # 30min max connection age
spring.datasource.hikari.connection-timeout=20000 # 20s to wait for connection
spring.datasource.hikari.leak-detection-threshold=60000  # Log if held >60s

# PostgreSQL specific
spring.datasource.hikari.data-source-properties.prepareThreshold=0  # Fixes cached plan errors
spring.datasource.hikari.auto-commit=false  # Manual commit control
```

**Interview Explanation:**
> "I use Spring Data JPA with PostgreSQL. The entities use proper annotations like `@Index` for query optimization. For concurrent operations like transfers, I use pessimistic locking to prevent race conditions. The connection pool is tuned with HikariCP for optimal performance."

---

## 6. Caching Strategy with Redis

### 6.1 Cache Configuration

```java
@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory factory) {
        
        // Configure ObjectMapper for proper serialization
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        
        // Enable type info for polymorphic types
        objectMapper.activateDefaultTyping(
            objectMapper.getPolymorphicTypeValidator(),
            ObjectMapper.DefaultTyping.NON_FINAL,
            JsonTypeInfo.As.PROPERTY
        );
        
        GenericJackson2JsonRedisSerializer serializer = 
            new GenericJackson2JsonRedisSerializer(objectMapper);
        
        // Default cache config
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .disableCachingNullValues()
            .serializeKeysWith(SerializationPair.fromSerializer(StringRedisSerializer.UTF_8))
            .serializeValuesWith(SerializationPair.fromSerializer(serializer))
            .prefixCacheNameWith("bankwise::")
            .entryTtl(Duration.ofMinutes(10));
        
        // Per-cache TTL configuration
        Map<String, RedisCacheConfiguration> configs = new HashMap<>();
        configs.put("userAnalytics", defaultConfig.entryTtl(Duration.ofMinutes(5)));
        configs.put("adminDashboard", defaultConfig.entryTtl(Duration.ofMinutes(2)));
        configs.put("accountByNumber", defaultConfig.entryTtl(Duration.ofMinutes(10)));
        configs.put("accountBalances", defaultConfig.entryTtl(Duration.ofSeconds(30)));
        configs.put("idempotency", defaultConfig.entryTtl(Duration.ofHours(24)));
        
        return RedisCacheManager.builder(factory)
            .cacheDefaults(defaultConfig)
            .withInitialCacheConfigurations(configs)
            .transactionAware()  // Respects Spring transactions
            .build();
    }
}
```

### 6.2 Cache Usage in Service

```java
@Service
public class CachedDataService {
    
    // Cacheable: Store result in cache
    @Cacheable(value = "accountByNumber", key = "#accountNumber", unless = "#result == null")
    public Account getAccountByNumber(String accountNumber) {
        log.debug("Cache MISS: Loading account: {}", accountNumber);
        return accountRepository.findByAccountNumberWithUser(accountNumber)
            .orElseThrow(() -> new AccountNotFoundException("Account not found"));
    }
    
    // Manual eviction when data changes
    @CacheEvict(value = {"accountByNumber", "accountBalances"}, key = "#accountNumber")
    public void evictAccountCache(String accountNumber) {
        log.debug("Evicting account cache for: {}", accountNumber);
    }
}
```

### 6.3 Granular Cache Eviction

```java
@Service
public class CacheEvictionService {
    
    private final RedisTemplate<String, Object> redisTemplate;
    
    public void evictByOperationType(String operationType, String userEmail, 
                                     String... accountNumbers) {
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
                evictUserAnalyticsCache(userEmail);
                if (accountNumbers.length > 0) {
                    evictAccountCache(accountNumbers[0]);
                }
                break;
        }
    }
}
```

**Interview Explanation:**
> "I implemented Redis caching with different TTLs based on data volatility. Account balances have a 30-second TTL since they change frequently, while user profiles can be cached longer. I use granular cache eviction to invalidate only affected data after operations, rather than clearing entire caches."

---

## 7. Async Processing & Event-Driven Architecture

### 7.1 Async Configuration

```java
@Configuration
public class AsyncConfig implements AsyncConfigurer {
    
    // Main executor for general async tasks
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);           // Always keep 4 threads
        executor.setMaxPoolSize(10);           // Scale up to 10
        executor.setQueueCapacity(100);        // Queue 100 tasks before rejection
        executor.setThreadNamePrefix("Async-Task-");
        executor.setKeepAliveSeconds(60);
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        
        // Fallback: run in caller thread if rejected
        executor.setRejectedExecutionHandler((r, exec) -> {
            log.warn("Task rejected, running in caller thread");
            if (!exec.isShutdown()) r.run();
        });
        
        executor.initialize();
        return executor;
    }
    
    // Dedicated executor for emails (higher queue capacity)
    @Bean(name = "emailExecutor")
    public Executor emailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(200);  // More queue for emails
        executor.setThreadNamePrefix("Email-Task-");
        executor.initialize();
        return executor;
    }
    
    // Executor for heavy tasks like PDF generation
    @Bean(name = "heavyTaskExecutor")
    public Executor heavyTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("Heavy-Task-");
        executor.initialize();
        return executor;
    }
    
    // Global async exception handler
    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (ex, method, params) -> 
            log.error("ASYNC ERROR in method={} params={}", method.getName(), params, ex);
    }
}
```

### 7.2 Event-Driven Pattern

```java
// Base event class
public abstract class BankingEvent extends ApplicationEvent {
    @Getter
    private final String eventType;
    @Getter
    private final String targetId;
    
    protected BankingEvent(Object source, String eventType, String targetId) {
        super(source);
        this.eventType = eventType;
        this.targetId = targetId;
    }
}

// Specific event
@Getter
public class TransferCompletedEvent extends BankingEvent {
    private final String fromAccount;
    private final String toAccount;
    private final BigDecimal amount;
    private final String fromUserEmail;
    private final String toUserEmail;
    private final boolean success;
    
    public TransferCompletedEvent(Object source, String fromAccount, String toAccount,
                                   BigDecimal amount, String fromUserEmail, 
                                   String toUserEmail, boolean success) {
        super(source, "TRANSFER_COMPLETED", fromAccount);
        this.fromAccount = fromAccount;
        this.toAccount = toAccount;
        this.amount = amount;
        this.fromUserEmail = fromUserEmail;
        this.toUserEmail = toUserEmail;
        this.success = success;
    }
}
```

### 7.3 Event Publishing & Listening

```java
// Publishing in Service
@Service
public class TransactionService {
    
    @Autowired
    private ApplicationEventPublisher eventPublisher;
    
    @Transactional
    public String processTransaction(TransferRequestDto dto) {
        // ... transfer logic ...
        
        if (transactionStatus == TransactionStatus.SUCCESS) {
            // Publish event WITHIN transaction
            // Listener will execute AFTER commit
            eventPublisher.publishEvent(new TransferCompletedEvent(
                this,
                fromAccount.getAccountNumber(),
                toAccount.getAccountNumber(),
                dto.getAmount(),
                fromAccount.getUser().getEmail(),
                toAccount.getUser().getEmail(),
                true
            ));
        }
        
        return transactionStatus.toString();
    }
}

// Listening in separate component
@Component
public class BankingEventListener {
    
    /**
     * CRITICAL: @TransactionalEventListener with AFTER_COMMIT
     * ensures the database transaction is committed before
     * we try to send notifications.
     */
    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleTransferCompleted(TransferCompletedEvent event) {
        log.info("EVENT: Processing transfer notification");
        
        try {
            if (event.isSuccess()) {
                notificationService.sendNotification(event.getFromUserEmail(),
                    "You have successfully transferred ₹" + event.getAmount());
                
                notificationService.sendNotification(event.getToUserEmail(),
                    "You have received ₹" + event.getAmount());
            }
        } catch (Exception e) {
            log.error("Failed to send notifications", e);
            // Don't rethrow - notification failure shouldn't affect transaction
        }
    }
}
```

**Interview Explanation:**
> "I use an event-driven architecture for decoupling core business logic from secondary operations. When a transfer completes, the service publishes an event. The listener, annotated with `@TransactionalEventListener(phase = AFTER_COMMIT)`, only executes after the database transaction commits. This ensures data consistency and fast API responses."

---

## 8. WebSocket Real-Time Notifications

### 8.1 WebSocket Configuration

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    private final StompAuthChannelInterceptor stompAuthInterceptor;
    private final WebSocketAuthInterceptor webSocketAuthInterceptor;
    
    @Value("${spring.websocket.allowed-origins}")
    private String allowedOrigins;
    
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Enable simple broker for topic subscriptions
        registry.enableSimpleBroker("/topic");
        // Prefix for messages FROM client TO server
        registry.setApplicationDestinationPrefixes("/app");
    }
    
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOrigins(allowedOrigins.split(","))
            .addInterceptors(webSocketAuthInterceptor);
    }
    
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // JWT validation for STOMP messages
        registration.interceptors(stompAuthInterceptor);
    }
}
```

### 8.2 WebSocket Authentication

```java
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {
    
    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            String token = extractToken(authHeader);
            
            if (token != null) {
                try {
                    Claims claims = Jwts.parser()
                        .setSigningKey(SecurityConstants.SECRET.getBytes())
                        .parseClaimsJws(token)
                        .getBody();
                    
                    String user = claims.getSubject();
                    List<String> roles = claims.get("roles", List.class);
                    
                    accessor.setUser(new UsernamePasswordAuthenticationToken(
                        user, null, buildAuthorities(roles)));
                } catch (Exception e) {
                    log.warn("WebSocket JWT validation failed");
                    return null;  // Reject connection
                }
            }
        }
        return message;
    }
}
```

### 8.3 Sending WebSocket Notifications

```java
@Service
public class NotificationService {
    
    private final SimpMessagingTemplate messagingTemplate;
    
    @Transactional
    public void sendNotification(String userEmail, String message) {
        // Save to database first
        Notification notification = new Notification();
        notification.setMessage(message);
        notification.setSeen(false);
        notification.setTimestamp(LocalDateTime.now());
        notification.setUser(user);
        
        Notification saved = notificationRepository.save(notification);
        notificationRepository.flush();  // Ensure DB commit
        
        // Send via WebSocket
        try {
            messagingTemplate.convertAndSend(
                "/topic/notifications/" + userEmail,
                mapToNotificationResponse(saved)
            );
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification", e);
            // Continue - DB notification is saved
        }
    }
}
```

**Interview Explanation:**
> "Real-time notifications use STOMP over WebSocket. JWT tokens are validated during the STOMP CONNECT handshake. Each user subscribes to their personal topic `/topic/notifications/{email}`. Notifications are persisted to the database first, ensuring they're not lost even if WebSocket delivery fails."

---

## 9. Transaction Management

### 9.1 @Transactional Deep Dive

```java
@Service
public class TransactionService {
    
    /**
     * Default: REQUIRED propagation, RuntimeException triggers rollback
     */
    @Transactional
    public String processTransaction(TransferRequestDto dto) {
        // All operations in one transaction
        // If ANY exception occurs, everything rolls back
    }
    
    /**
     * Read-only optimization: Uses read replicas, no dirty checking
     */
    @Transactional(readOnly = true)
    public List<TransactionResponseDto> getTransactions(String accountNumber) {
        return transactionRepository.findByAccount(accountNumber);
    }
    
    /**
     * Specific rollback rules
     */
    @Transactional(
        rollbackFor = {InsufficientFundsException.class, AccountStatusException.class},
        noRollbackFor = {NotificationException.class}
    )
    public String transferWithRollbackRules(...) { }
}
```

### 9.2 Pessimistic Locking for Transfers

```java
@Transactional
public String processTransaction(TransferRequestDto dto) {
    // CRITICAL: Order accounts by number to prevent deadlocks
    // If A->B and B->A happen simultaneously, both would deadlock
    // By ordering, both threads lock in same order
    String firstAccount = dto.getFromAccount().compareTo(dto.getToAccount()) < 0 
        ? dto.getFromAccount() : dto.getToAccount();
    String secondAccount = dto.getFromAccount().compareTo(dto.getToAccount()) < 0 
        ? dto.getToAccount() : dto.getFromAccount();
    
    // Pessimistic lock: SELECT ... FOR UPDATE
    Account firstLocked = accountRepository.findByAccountNumberForUpdate(firstAccount)
        .orElseThrow(() -> new BusinessRuleViolationException("Account not found"));
    Account secondLocked = accountRepository.findByAccountNumberForUpdate(secondAccount)
        .orElseThrow(() -> new BusinessRuleViolationException("Account not found"));
    
    // Now we have exclusive locks on both accounts
    // Safe to modify balances
}
```

### 9.3 Optimistic Locking

```java
@Entity
public class DepositRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // ... other fields ...
    
    @Version  // Optimistic locking
    private Long version;
}

// Usage: If two threads try to update same deposit simultaneously,
// one will get OptimisticLockException
```

**Interview Explanation:**
> "For concurrent transfers, I use pessimistic locking with ordered account acquisition to prevent deadlocks. For less critical operations like deposit processing, I use optimistic locking with `@Version` which is more performant but requires retry logic."

---

## 10. API Design & RESTful Services

### 10.1 Controller Structure

```java
@RestController
@RequestMapping("/api/loan")
@RequiredArgsConstructor
public class LoanController {
    
    private final LoanService loanService;
    
    // Create - POST
    @PostMapping("/apply")
    @PreAuthorize("hasAnyRole('USER','CUSTOMER')")
    public ResponseEntity<Object> applyForLoan(
            @Valid @RequestBody LoanRequestDto dto,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) 
            throws ResourceNotFoundException {
        
        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            return ResponseEntity.ok(
                loanService.applyForLoanWithIdempotency(dto, idempotencyKey));
        }
        return ResponseEntity.ok(loanService.applyForLoan(dto));
    }
    
    // Read - GET (list)
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<List<LoanResponseDto>> getAllLoans(
            @RequestParam(required = false) String status) {
        if (status != null && !"ALL".equalsIgnoreCase(status)) {
            LoanStatus loanStatus = LoanStatus.valueOf(status.toUpperCase());
            return ResponseEntity.ok(loanService.getLoansByStatus(loanStatus));
        }
        return ResponseEntity.ok(loanService.getAllLoans());
    }
    
    // Read - GET (single)
    @GetMapping("/{loanId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','USER','CUSTOMER')")
    public ResponseEntity<LoanResponseDto> getLoanById(@PathVariable Long loanId) 
            throws ResourceNotFoundException {
        return ResponseEntity.ok(loanService.getLoanById(loanId));
    }
    
    // Update - POST/PUT
    @PostMapping("/status")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Object> updateLoanStatus(
            @Valid @RequestBody LoanStatusUpdateRequest request) 
            throws ResourceNotFoundException {
        LoanStatus loanStatus = LoanStatus.valueOf(request.getStatus().toUpperCase());
        return ResponseEntity.ok(
            loanService.updateLoanStatus(request.getLoanId(), loanStatus, request.getAdminRemark()));
    }
}
```

### 10.2 DTO Validation

```java
@Data
@Builder
public class TransferRequestDto {
    
    @NotBlank(message = "Source account is required")
    private String fromAccount;
    
    @NotBlank(message = "Destination account is required")
    private String toAccount;
    
    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1.00", message = "Minimum transfer amount is ₹1")
    @DecimalMax(value = "50000.00", message = "Maximum transfer amount is ₹50,000")
    private BigDecimal amount;
    
    @Size(max = 200, message = "Description cannot exceed 200 characters")
    private String description;
}
```

### 10.3 API Documentation (OpenAPI)

```java
@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "Bankwise API",
        version = "1.0",
        description = """
            Comprehensive Banking System API
            
            ## Authentication
            Most endpoints require JWT authentication:
            1. Login via POST /api/login
            2. Complete OTP verification
            3. Use token: `Bearer <token>`
            
            ## Roles
            - **USER/CUSTOMER**: Regular bank customers
            - **ADMIN**: Full system access
            - **MANAGER**: Account approval
            - **DEVELOPER**: System monitoring
            """
    ),
    security = @SecurityRequirement(name = "bearerAuth")
)
@SecurityScheme(
    name = "bearerAuth",
    type = SecuritySchemeType.HTTP,
    bearerFormat = "JWT",
    scheme = "bearer"
)
public class OpenApiConfig { }
```

---

## 11. Exception Handling

### 11.1 Custom Exceptions

```java
// Business rule violation
public class BusinessRuleViolationException extends RuntimeException {
    public BusinessRuleViolationException(String message) {
        super(message);
    }
}

// With error codes
public class RegistrationException extends RuntimeException {
    public static final String DUPLICATE_EMAIL = "DUPLICATE_EMAIL";
    public static final String DUPLICATE_PHONE = "DUPLICATE_PHONE";
    public static final String INVALID_ADMIN_CODE = "INVALID_ADMIN_CODE";
    
    @Getter
    private final String errorCode;
    
    public RegistrationException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
```

### 11.2 Global Exception Handler

```java
@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    
    private ResponseEntity<ApiErrorResponse> build(HttpStatus status, 
            String message, HttpServletRequest request) {
        ApiErrorResponse error = ApiErrorResponse.builder()
            .message(message)
            .path(request.getRequestURI())
            .timestamp(LocalDateTime.now())
            .status(status.value())
            .build();
        return new ResponseEntity<>(error, status);
    }
    
    // Specific exception handlers
    @ExceptionHandler(BusinessRuleViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleBusinessRule(
            BusinessRuleViolationException ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(
            ResourceNotFoundException ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), request);
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.joining(", "));
        return build(HttpStatus.BAD_REQUEST, message, request);
    }
    
    // Catch-all
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleAll(
            Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception at {}", request.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, 
            "An unexpected error occurred", request);
    }
}
```

**Interview Explanation:**
> "I use a `@ControllerAdvice` global exception handler to centralize error handling. Each exception type maps to appropriate HTTP status codes. Validation errors are aggregated into readable messages. For registration, I use error codes so the frontend can display localized messages."

---

## 12. Scheduled Tasks & Background Jobs

### 12.1 EMI Scheduler

```java
@Service
@RequiredArgsConstructor
public class EmiSchedulerService {
    
    // Credit score adjustments
    private static final int EARLY_PAYMENT_BONUS = 2;
    private static final int ON_TIME_PAYMENT_BONUS = 1;
    private static final int LATE_PAYMENT_PENALTY = -5;
    private static final int MISSED_PAYMENT_PENALTY = -10;
    
    /**
     * Runs every day at 6:00 AM
     * Cron: second minute hour day month weekday
     */
    @Scheduled(cron = "0 0 6 * * ?")
    @Transactional
    public void processScheduledEmis() {
        log.info("Starting EMI processing at {}", LocalDateTime.now());
        
        LocalDate today = LocalDate.now();
        
        // Send reminders for EMIs due in 3 days
        sendUpcomingEmiReminders(today.plusDays(3));
        
        // Process EMIs due today
        processEmisDueOn(today);
        
        // Process overdue EMIs with penalties
        processOverdueEmis(today);
        
        log.info("Completed EMI processing");
    }
    
    @Transactional
    public void processEmisDueOn(LocalDate dueDate) {
        List<LoanRequest> dueLoans = loanRepository.findLoansWithEmiDueOn(dueDate);
        
        for (LoanRequest loan : dueLoans) {
            if (!Boolean.TRUE.equals(loan.getAutoDebitEnabled())) {
                continue;  // Skip if auto-debit disabled
            }
            processEmiPayment(loan, dueDate);
        }
    }
}
```

### 12.2 Monthly Statement Generation

```java
@Service
public class TransactionService {
    
    /**
     * Runs on 1st of every month at midnight
     */
    @Scheduled(cron = "0 0 0 1 * ?")
    @Async("heavyTaskExecutor")
    public void sendMonthlyTransactionReport() {
        log.info("Starting monthly statement generation");
        
        List<User> users = userRepository.findByRole(Role.USER);
        
        ExecutorService executor = Executors.newFixedThreadPool(5);
        
        for (User user : users) {
            executor.submit(() -> {
                try {
                    byte[] pdf = generatePdfReport(user);
                    emailService.sendTransactionHistoryPdf(user.getEmail(), pdf);
                } catch (Exception e) {
                    log.error("Failed to send statement to {}", user.getEmail(), e);
                }
            });
        }
        
        executor.shutdown();
        executor.awaitTermination(30, TimeUnit.MINUTES);
    }
}
```

---

## 13. Idempotency & Concurrency Control

### 13.1 Idempotency Service

```java
@Service
@RequiredArgsConstructor
public class IdempotencyService {
    
    private final RedisTemplate<String, String> redisTemplate;
    
    private static final String LOCK_PREFIX = "idempotency::";
    private static final String RESULT_PREFIX = "idempotency:result::";
    private static final long TTL_HOURS = 24;
    
    /**
     * Check if operation already completed
     */
    public String getResult(String idempotencyKey) {
        if (idempotencyKey == null) return null;
        return redisTemplate.opsForValue().get(RESULT_PREFIX + idempotencyKey);
    }
    
    /**
     * Acquire processing lock (5 minute TTL)
     */
    public boolean acquireIdempotencyLock(String idempotencyKey) {
        if (idempotencyKey == null) return true;
        
        Boolean acquired = redisTemplate.opsForValue()
            .setIfAbsent(LOCK_PREFIX + idempotencyKey, "processing", 
                         5, TimeUnit.MINUTES);
        return Boolean.TRUE.equals(acquired);
    }
    
    /**
     * Store result and release lock
     */
    public void storeResult(String idempotencyKey, String result) {
        if (idempotencyKey == null) return;
        
        // Store result for 24 hours
        redisTemplate.opsForValue().set(
            RESULT_PREFIX + idempotencyKey, result, TTL_HOURS, TimeUnit.HOURS);
        
        // Release lock
        redisTemplate.delete(LOCK_PREFIX + idempotencyKey);
    }
}
```

### 13.2 Using Idempotency in Transfers

```java
@Transactional
public String processTransactionWithIdempotency(
        TransferRequestDto dto, String idempotencyKey) {
    
    // Check for cached result
    String cachedResult = idempotencyService.getResult(idempotencyKey);
    if (cachedResult != null) {
        log.info("Returning cached result for key: {}", idempotencyKey);
        return cachedResult;
    }
    
    // Try to acquire lock
    if (!idempotencyService.acquireIdempotencyLock(idempotencyKey)) {
        // Another thread is processing
        Thread.sleep(1000);
        String result = idempotencyService.getResult(idempotencyKey);
        if (result != null) return result;
        
        throw new BusinessRuleViolationException("Operation already in progress");
    }
    
    try {
        String result = processTransaction(dto);
        idempotencyService.storeResult(idempotencyKey, result);
        return result;
    } catch (Exception e) {
        idempotencyService.releaseLock(idempotencyKey);
        throw e;
    }
}
```

**Interview Explanation:**
> "For critical operations like transfers and EMI payments, I use Redis-based idempotency. Each operation gets a unique key. Before processing, I check Redis for existing results. A distributed lock prevents concurrent processing of the same operation. Results are cached for 24 hours to handle retries."

---

## 14. Email Service Integration

### 14.1 Brevo (Sendinblue) Integration

```java
@Service
@Slf4j
public class EmailService {
    
    @Value("${brevo.api.key:}")
    private String brevoApiKey;
    
    private TransactionalEmailsApi emailApi;
    
    @PostConstruct
    public void init() {
        if (brevoApiKey != null && !brevoApiKey.isBlank()) {
            ApiClient client = Configuration.getDefaultApiClient();
            ApiKeyAuth apiKey = (ApiKeyAuth) client.getAuthentication("api-key");
            apiKey.setApiKey(brevoApiKey);
            emailApi = new TransactionalEmailsApi();
            log.info("Brevo email service initialized");
        } else {
            log.warn("Brevo API key not configured");
        }
    }
    
    @Async("emailExecutor")
    @Retryable(
        retryFor = {ApiException.class, RuntimeException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)  // 1s, 2s, 4s
    )
    public void sendEmail(String to, String subject, String text) {
        if (!isConfigured) {
            log.info("[EMAIL LOG] To: {} | Subject: {}", to, subject);
            return;
        }
        
        SendSmtpEmail email = new SendSmtpEmail();
        email.setSender(createSender());
        email.setTo(createRecipients(to));
        email.setSubject(subject);
        email.setTextContent(text);
        
        CreateSmtpEmail result = emailApi.sendTransacEmail(email);
        log.info("Email sent to={} messageId={}", to, result.getMessageId());
    }
    
    @Recover  // Called when all retries fail
    public void recoverSendEmail(RuntimeException e, String to, String subject, String text) {
        log.error("All email retries failed for {}", to);
        log.info("[FAILED EMAIL] To: {} | Subject: {}", to, subject);
    }
}
```

---

## 15. Audit Logging

### 15.1 Audit Service

```java
@Service
@RequiredArgsConstructor
public class AuditService {
    
    private final AuditLogRepository auditLogRepository;
    
    /**
     * Record action with current user context
     */
    public void record(String action, String targetType, String targetId, 
                       String status, String details) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String actorEmail = auth != null ? auth.getName() : "SYSTEM";
        String actorRole = auth != null && auth.getAuthorities() != null 
            ? auth.getAuthorities().iterator().next().getAuthority() 
            : "SYSTEM";
        
        AuditLog log = AuditLog.builder()
            .action(action)
            .actorEmail(actorEmail)
            .actorRole(actorRole)
            .targetType(targetType)
            .targetId(targetId)
            .status(status)
            .details(details)
            .build();
        
        auditLogRepository.save(log);
        log.info("AUDIT action={} actor={} target={}/{} status={}", 
            action, actorEmail, targetType, targetId, status);
    }
    
    /**
     * Record system actions (scheduled jobs, etc.)
     */
    public void recordSystem(String action, String targetType, String targetId, 
                             String status, String details) {
        AuditLog log = AuditLog.builder()
            .action(action)
            .actorEmail("SYSTEM")
            .actorRole("SYSTEM")
            .targetType(targetType)
            .targetId(targetId)
            .status(status)
            .details(details)
            .build();
        auditLogRepository.save(log);
    }
}
```

### 15.2 Audit Entity

```java
@Entity
@Getter @Setter
@Builder
public class AuditLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String action;       // TRANSFER, LOAN_APPLY, KYC_SUBMIT
    private String actorEmail;   // Who performed action
    private String actorRole;    // Their role
    private String targetType;   // ACCOUNT, LOAN, USER
    private String targetId;     // Entity ID
    private String status;       // SUCCESS, FAILED, DENIED
    
    @Column(length = 4000)
    private String details;      // Additional context
    
    private LocalDateTime createdAt;
    
    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
```

---

## 16. Performance Optimizations

### 16.1 Configuration Optimizations

```properties
# Response Compression (70-80% payload reduction)
server.compression.enabled=true
server.compression.mime-types=application/json,application/xml,text/html
server.compression.min-response-size=1024

# HTTP/2 (multiplexed connections)
server.http2.enabled=true

# Tomcat Tuning
server.tomcat.threads.max=200
server.tomcat.threads.min-spare=10
server.tomcat.max-connections=8192
server.tomcat.accept-count=100

# JPA/Hibernate Batch Processing
spring.jpa.properties.hibernate.jdbc.batch_size=25
spring.jpa.properties.hibernate.order_inserts=true
spring.jpa.properties.hibernate.order_updates=true
spring.jpa.open-in-view=false  # Prevent lazy loading in views

# Jackson JSON
spring.jackson.default-property-inclusion=non_null  # Skip null fields
```

### 16.2 Database Indexing

```java
@Entity
@Table(
    name = "transaction",
    indexes = {
        @Index(name = "idx_txn_source_account", columnList = "source_account_id"),
        @Index(name = "idx_txn_dest_account", columnList = "destination_account_id"),
        @Index(name = "idx_txn_timestamp", columnList = "timestamp"),
        @Index(name = "idx_txn_status", columnList = "status"),
        // Composite indexes for common queries
        @Index(name = "idx_txn_source_timestamp", columnList = "source_account_id, timestamp"),
        @Index(name = "idx_txn_dest_timestamp", columnList = "destination_account_id, timestamp")
    }
)
public class Transaction { }
```

### 16.3 Request Timing Filter

```java
@Component
public class RequestTimingFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
            HttpServletResponse response, FilterChain chain) 
            throws ServletException, IOException {
        
        long start = System.nanoTime();
        try {
            chain.doFilter(request, response);
        } finally {
            long elapsedMs = (System.nanoTime() - start) / 1_000_000;
            response.addHeader("X-Response-Time", elapsedMs + "ms");
            
            // Record metrics
            String endpoint = normalizeEndpoint(request.getRequestURI());
            boolean isError = response.getStatus() >= 400;
            SystemAnalyticsController.recordRequest(endpoint, elapsedMs, isError);
            
            log.info("REQ {} {} -> {} ({}ms)", 
                request.getMethod(), request.getRequestURI(), 
                response.getStatus(), elapsedMs);
        }
    }
}
```

---

## 17. Testing Strategy

### 17.1 Test Configuration

```properties
# application-test.properties
spring.datasource.url=jdbc:h2:mem:bankwise_test;MODE=PostgreSQL
spring.datasource.driver-class-name=org.h2.Driver
spring.jpa.hibernate.ddl-auto=create-drop
spring.mail.host=localhost
spring.mail.port=2525
```

### 17.2 Test Structure

```
src/test/java/
└── com/example/banking_system/
    ├── controller/          # Integration tests
    │   ├── TransactionControllerTest.java
    │   └── LoanControllerTest.java
    ├── service/             # Unit tests
    │   ├── TransactionServiceTest.java
    │   └── LoanServiceTest.java
    └── repository/          # Repository tests
        └── AccountRepositoryTest.java
```

---

## 18. Deployment & DevOps

### 18.1 Docker Configuration

```dockerfile
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY target/banking-system-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8091
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### 18.2 Render Deployment

```yaml
# render.yaml
services:
  - type: web
    name: bankwise-api
    env: docker
    plan: free
    healthCheckPath: /actuator/health
    envVars:
      - key: DB_URL
        fromDatabase:
          name: bankwise-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: bankwise-redis
          type: redis
          property: connectionString
```

---

## 19. Key Interview Questions & Answers

### Q1: Explain the authentication flow in your application.

**Answer:**
> "We use a two-factor authentication system with JWT:
> 1. User submits email/password to `/api/login`
> 2. `JWTAuthenticationFilter` validates credentials using `DaoAuthenticationProvider`
> 3. If valid, OTP is generated, stored in `ConcurrentHashMap`, and emailed via Brevo API
> 4. User submits OTP to `/api/verify-otp`
> 5. Upon verification, JWT token is generated with user roles embedded
> 6. Subsequent requests include `Authorization: Bearer <token>` header
> 7. `JWTAuthorizationFilter` validates token and sets `SecurityContext`
> 8. Method-level `@PreAuthorize` annotations enforce role-based access"

### Q2: How do you prevent duplicate transactions?

**Answer:**
> "I implemented idempotency using Redis:
> 1. Client sends `Idempotency-Key` header with a unique UUID
> 2. Before processing, I check Redis for existing results with that key
> 3. If found, return cached result immediately
> 4. If not, acquire a distributed lock (`SET NX` with 5-min TTL)
> 5. Process the transaction
> 6. Store result in Redis with 24-hour TTL
> 7. Release lock
> 
> This prevents duplicate transfers from network retries or double-clicks."

### Q3: Explain your caching strategy.

**Answer:**
> "I use Redis with a granular caching strategy:
> - **Account data**: 10-minute TTL (frequently accessed, relatively stable)
> - **Account balances**: 30-second TTL (changes frequently)
> - **Admin dashboard**: 2-minute TTL (aggregate data, expensive to compute)
> - **User analytics**: 5-minute TTL
> 
> Cache eviction is triggered by operation type:
> - Transfer: Evict both account caches + user analytics + dashboard
> - Deposit: Evict source account + analytics
> - Loan approval: Evict user analytics + dashboard
> 
> This ensures users see fresh data while reducing database load by ~70%."

### Q4: How do you handle concurrent access to accounts?

**Answer:**
> "For money transfers, I use pessimistic locking with deadlock prevention:
> 1. Sort account numbers alphabetically
> 2. Always lock in ascending order (prevents A→B and B→A deadlock)
> 3. Use `@Lock(LockModeType.PESSIMISTIC_WRITE)` which translates to `SELECT ... FOR UPDATE`
> 4. Both accounts are locked before any balance modification
> 5. Transaction commits atomically
> 
> For less critical operations like deposit processing, I use optimistic locking with `@Version` annotation."

### Q5: How does your event-driven architecture work?

**Answer:**
> "I use Spring's `ApplicationEventPublisher` with transactional event listeners:
> 1. Business operation (e.g., transfer) publishes event within `@Transactional` method
> 2. `@TransactionalEventListener(phase = AFTER_COMMIT)` ensures listener only fires after DB commit
> 3. Listener methods are `@Async` - they run in separate thread pool
> 4. This decouples core logic from notifications/emails
> 
> Benefits:
> - Fast API responses (notification is async)
> - Data consistency (listener waits for commit)
> - Resilience (notification failure doesn't rollback transfer)"

### Q6: Explain your exception handling approach.

**Answer:**
> "I use a centralized `@ControllerAdvice` with specific handlers:
> - `BusinessRuleViolationException` → 400 Bad Request
> - `ResourceNotFoundException` → 404 Not Found
> - `UnauthorizedAccountAccessException` → 403 Forbidden
> - `MethodArgumentNotValidException` → 400 with aggregated field errors
> - Generic `Exception` → 500 with logged stack trace
> 
> Each response follows a consistent `ApiErrorResponse` structure with timestamp, path, status, and message. For registration, I include error codes like `DUPLICATE_EMAIL` for frontend localization."

### Q7: How do you ensure scheduled jobs are reliable?

**Answer:**
> "EMI scheduler runs daily at 6 AM via `@Scheduled(cron = ...)`:
> 1. Uses idempotency keys (`emi::loanId::date`) to prevent duplicate deductions
> 2. Runs in transaction to ensure atomicity
> 3. Handles partial failures - continues processing remaining loans even if one fails
> 4. Sends notifications asynchronously via event system
> 5. Updates credit scores based on payment timing
> 
> For monthly statements, I use a thread pool (`heavyTaskExecutor`) with 30-minute timeout to handle all users in parallel."

### Q8: What performance optimizations have you implemented?

**Answer:**
> "Multiple layers of optimization:
> - **Database**: Proper indexing, batch inserts, `hibernate.order_inserts=true`
> - **Caching**: Redis with TTL-based eviction for hot data
> - **Connection Pool**: HikariCP tuned with 15 max connections, 3 min idle
> - **HTTP**: Compression enabled, HTTP/2 for multiplexing
> - **Async**: Separate thread pools for emails, notifications, heavy tasks
> - **Query Optimization**: `JOIN FETCH` to prevent N+1, `@Transactional(readOnly=true)` for reads
> - **JSON**: `spring.jackson.default-property-inclusion=non_null` reduces payload size"

### Q9: How would you scale this application?

**Answer:**
> "Current architecture supports horizontal scaling:
> 1. **Stateless**: JWT auth means no session affinity needed
> 2. **Shared State**: Redis handles caching and idempotency across instances
> 3. **Database**: PostgreSQL can scale with read replicas for read-heavy operations
> 4. **Load Balancing**: Health endpoint (`/actuator/health`) for load balancer checks
> 
> For further scaling:
> - Add Redis Cluster for cache failover
> - Database connection pooling with PgBouncer
> - Async job queue (RabbitMQ/SQS) for background processing
> - API gateway for rate limiting and routing"

### Q10: How do you handle sensitive data?

**Answer:**
> "Multiple security measures:
> - **Passwords**: BCrypt with 10 rounds (never stored in plain text)
> - **Transaction PIN**: Separately hashed for transfer authorization
> - **JWT Secret**: Externalized via environment variable, 64+ chars
> - **CORS**: Strict origin whitelist
> - **Input Validation**: `@Valid` annotations with size/pattern constraints
> - **SQL Injection**: JPA parameterized queries
> - **Logging**: Never log passwords or full card numbers
> - **HTTPS**: Enforced in production"

---

## 📝 Quick Reference Card

```
┌──────────────────────────────────────────────────────────────┐
│                    BANKWISE QUICK REFERENCE                   │
├──────────────────────────────────────────────────────────────┤
│  Framework:     Spring Boot 3.3.2 + Java 17                  │
│  Database:      PostgreSQL + HikariCP (15 connections)       │
│  Cache:         Redis (Lettuce) - 30s to 24h TTL             │
│  Auth:          JWT (HS512, 10-day expiry) + OTP             │
│  Async:         3 Thread Pools (4-10, 2-5, 2-4 threads)      │
│  Email:         Brevo API (300/day free) + @Retryable        │
│  WebSocket:     STOMP over WebSocket at /ws                  │
│  API Docs:      SpringDoc OpenAPI at /swagger-ui.html        │
├──────────────────────────────────────────────────────────────┤
│  Key Patterns:  Repository, DTO, Builder, Observer, Filter   │
│  Annotations:   @Transactional, @Async, @Cacheable, @Scheduled │
│  Locking:       Pessimistic (transfers), Optimistic (deposits)│
│  Events:        @TransactionalEventListener(AFTER_COMMIT)    │
└──────────────────────────────────────────────────────────────┘
```

---

## 20. Additional Service Details

### 20.1 Admin Dashboard Service (Analytics)

```java
@Service
@RequiredArgsConstructor
public class AdminDashboardService {
    
    @Cacheable(value = "adminDashboard")  // 2-minute TTL
    public Map<String, Object> getAnalytics() {
        Map<String, Object> analytics = new HashMap<>();
        
        // User Statistics
        analytics.put("totalUsers", userRepository.count());
        long userRoleCount = userRepository.countByRole(Role.USER);
        long customerRoleCount = userRepository.countByRole(Role.CUSTOMER);
        analytics.put("activeUsers", userRoleCount + customerRoleCount);
        
        // Account Statistics
        analytics.put("totalAccounts", accountRepository.count());
        analytics.put("verifiedAccounts", accountRepository
            .countByVerificationStatus(VerificationStatus.VERIFIED));
        analytics.put("pendingAccounts", accountRepository
            .countByVerificationStatus(VerificationStatus.PENDING));
        
        // Loan Statistics
        analytics.put("totalLoans", loanRepo.count());
        analytics.put("activeLoans", loanRepo.countByStatus(LoanStatus.APPROVED));
        analytics.put("pendingLoans", loanRepo.countByStatus(LoanStatus.PENDING));
        
        // Deposit Statistics
        analytics.put("pendingDeposits", depositRepository
            .countByStatus(DepositStatus.PENDING));
        analytics.put("totalApprovedDepositAmount", 
            depositRepository.totalApprovedDepositAmount());
        
        // Transaction Volume
        analytics.put("totalSuccessfulTransactionVolume", 
            transactionRepository.totalSuccessfulTransactionVolume());
        
        analytics.put("generatedAt", Instant.now().toString());
        return analytics;
    }
}
```

### 20.2 Deposit Service (with Optimistic Locking)

```java
@Service
public class DepositService {
    
    public String createDepositRequest(DepositRequestDto dto) {
        // Verify account ownership
        Account account = cachedDataService.getAccountByNumberForAuth(dto.getAccountNumber());
        
        // Authorization check
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!account.getUser().getEmail().equalsIgnoreCase(auth.getName())) {
            throw new UnauthorizedAccountAccessException("Not authorized");
        }
        
        // Account must be verified
        if (account.getVerificationStatus() != VerificationStatus.VERIFIED) {
            throw new AccountStatusException("Account must be verified");
        }
        
        // Create deposit request
        DepositRequest request = DepositRequest.builder()
            .account(account)
            .amount(dto.getAmount())
            .refferenceNumber(dto.getRefferenceNumber())
            .status(DepositStatus.PENDING)
            .build();
        
        depositRepository.save(request);
        
        // Publish event for notifications
        eventPublisher.publishEvent(new DepositProcessedEvent(...));
        
        return "DepositRequest created";
    }
    
    @Transactional
    public String handleDepositAction(Long id, String action) {
        return switch (action.toLowerCase()) {
            case "approve" -> approveDeposit(id);
            case "reject" -> rejectDeposit(id);
            default -> throw new InvalidDepositActionException("Invalid action");
        };
    }
    
    private String approveDeposit(Long id) {
        DepositRequest request = depositRepository.findById(id)
            .orElseThrow(() -> new DepositRequestNotFoundException("Not found"));
        
        // Idempotent check
        if (request.getStatus() == DepositStatus.DEPOSITED) {
            return "Already approved";
        }
        
        // @Version field handles optimistic locking
        // If two admins approve simultaneously, one will get OptimisticLockingFailureException
        Account account = request.getAccount();
        account.setBalance(account.getBalance().add(BigDecimal.valueOf(request.getAmount())));
        request.setStatus(DepositStatus.DEPOSITED);
        
        // Create transaction record
        Transaction transaction = Transaction.builder()
            .destinationAccount(account)
            .amount(BigDecimal.valueOf(request.getAmount()))
            .status(TransactionStatus.SUCCESS)
            .type(TransactionType.DEPOSIT)
            .timestamp(LocalDateTime.now())
            .build();
        
        transactionRepository.save(transaction);
        return "Deposit approved";
    }
}
```

### 20.3 Rate Limit Filter

```java
@Component
@Order(1)  // First filter in chain
public class RateLimitFilter implements Filter {
    
    // In-memory rate limiting (per IP)
    private final ConcurrentHashMap<String, RateLimitBucket> rateLimits = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> recentRequests = new ConcurrentHashMap<>();
    
    private static final int MAX_REQUESTS_PER_MINUTE = 120;
    private static final long DUPLICATE_WINDOW_MS = 500;
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) 
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        String path = httpRequest.getRequestURI();
        
        // Skip rate limiting for health checks, WebSocket, Swagger
        if (isExcluded(path)) {
            chain.doFilter(request, response);
            return;
        }
        
        String clientIP = getClientIP(httpRequest);
        String requestKey = generateRequestKey(httpRequest);
        
        // Check for duplicate requests within 500ms
        if (isDuplicateRequest(requestKey)) {
            sendRateLimitResponse((HttpServletResponse) response, 1);
            return;
        }
        
        // Rate limit check
        RateLimitBucket bucket = rateLimits.computeIfAbsent(clientIP, k -> new RateLimitBucket());
        if (!bucket.tryConsume()) {
            sendRateLimitResponse((HttpServletResponse) response, 60);
            return;
        }
        
        recentRequests.put(requestKey, System.currentTimeMillis());
        chain.doFilter(request, response);
    }
    
    private void sendRateLimitResponse(HttpServletResponse response, int retryAfter) throws IOException {
        response.setStatus(429);  // Too Many Requests
        response.setHeader("Retry-After", String.valueOf(retryAfter));
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"Rate limit exceeded\",\"retryAfter\":" + retryAfter + "}");
    }
}
```

---

## 21. Complete Entity List Summary

| Entity | Table Name | Key Fields | Relationships |
|--------|-----------|------------|---------------|
| `User` | `users` | id, email, password, role, creditScore | 1:1 Account, 1:N Notifications |
| `Account` | `account` | accountNumber, balance, verificationStatus | N:1 User, 1:N Transactions |
| `Transaction` | `transaction` | id, amount, type, status, timestamp | N:1 sourceAccount, N:1 destAccount |
| `LoanRequest` | `loan_request` | id, amount, status, emiAmount, nextEmiDate | N:1 Account |
| `DepositRequest` | `deposit_request` | id, amount, status, @Version | N:1 Account |
| `Notification` | `notification` | id, message, seen, timestamp | N:1 User |
| `KycDetails` | `kyc_details` | aadharNumber, panNumber, documents | 1:1 Account |
| `Card` | `cards` | cardNumber, cvv, expiryDate, type | N:1 User, N:1 Account |
| `Beneficiary` | `beneficiaries` | beneficiaryAccountNumber, nickname | N:1 User |
| `ScheduledPayment` | `scheduled_payments` | amount, frequency, nextExecutionDate | N:1 User, N:1 Account |
| `SupportTicket` | `support_ticket` | category, subject, status | - |
| `AuditLog` | `audit_log` | action, actorEmail, targetType, status | - |

---

## 22. All Controllers Summary

| Controller | Base Path | Purpose |
|------------|-----------|---------|
| `UserController` | `/api/` | Registration, OTP, profile |
| `AccountController` | `/api/account` | KYC, deposit, recipients |
| `TransactionController` | `/api/transaction` | Transfers, history |
| `LoanController` | `/api/loan` | Loan CRUD, EMI |
| `CardController` | `/api/cards` | Card management |
| `BeneficiaryController` | `/api/beneficiaries` | Saved recipients |
| `ScheduledPaymentController` | `/api/scheduled-payments` | Recurring payments |
| `NotificationController` | `/api/notifications` | Notifications |
| `SupportController` | `/api/support` | Support tickets |
| `AdminDashboardController` | `/api/admin-dashboard` | Analytics |
| `AuditController` | `/api/audit` | Audit logs |
| `DeveloperController` | `/api/developer` | Dev tools |
| `PasswordResetController` | `/api/password` | Password reset |
| `SystemAnalyticsController` | `/api/system` | System metrics |
| `DataVersionController` | `/api/data-version` | Cache versions |
| `EmiController` | `/api/emi` | EMI management |
| `TransactionPinController` | `/api/pin` | PIN management |
| `WebSocketController` | `/ws` | WebSocket STOMP |

---

## 23. Cheat Sheet - Spring Boot Annotations

```
┌────────────────────────────────────────────────────────────────┐
│                   SPRING BOOT ANNOTATIONS                       │
├────────────────────────────────────────────────────────────────┤
│ COMPONENT SCANNING                                              │
│   @SpringBootApplication  - Main class                          │
│   @Component             - Generic bean                         │
│   @Service               - Business logic                       │
│   @Repository            - Data access                          │
│   @Controller            - MVC controller                       │
│   @RestController        - REST API (+ @ResponseBody)           │
│   @Configuration         - Java config class                    │
├────────────────────────────────────────────────────────────────┤
│ DEPENDENCY INJECTION                                            │
│   @Autowired             - Auto-inject dependency               │
│   @Value("${prop}")      - Inject property value                │
│   @Bean                  - Define bean in @Configuration        │
│   @Qualifier             - Specify which bean                   │
├────────────────────────────────────────────────────────────────┤
│ WEB / REST                                                      │
│   @RequestMapping        - Base URL path                        │
│   @GetMapping            - HTTP GET                             │
│   @PostMapping           - HTTP POST                            │
│   @PutMapping            - HTTP PUT                             │
│   @DeleteMapping         - HTTP DELETE                          │
│   @PathVariable          - URL path parameter                   │
│   @RequestParam          - Query parameter                      │
│   @RequestBody           - JSON body                            │
│   @RequestHeader         - HTTP header                          │
│   @Valid                 - Trigger validation                   │
├────────────────────────────────────────────────────────────────┤
│ SECURITY                                                        │
│   @EnableMethodSecurity  - Enable @PreAuthorize                 │
│   @PreAuthorize          - Method-level security                │
│   @Secured               - Role-based access                    │
├────────────────────────────────────────────────────────────────┤
│ DATA / JPA                                                      │
│   @Entity                - JPA entity                           │
│   @Table                 - Table name, indexes                  │
│   @Id                    - Primary key                          │
│   @GeneratedValue        - Auto-generate ID                     │
│   @Column                - Column mapping                       │
│   @Enumerated            - Enum storage strategy                │
│   @ManyToOne/@OneToMany  - Relationships                        │
│   @JoinColumn            - Foreign key column                   │
│   @Transactional         - Transaction boundary                 │
│   @Query                 - Custom JPQL query                    │
│   @Lock                  - Pessimistic/Optimistic lock          │
│   @Version               - Optimistic lock version              │
├────────────────────────────────────────────────────────────────┤
│ CACHING                                                         │
│   @EnableCaching         - Enable caching                       │
│   @Cacheable             - Cache method result                  │
│   @CacheEvict            - Remove from cache                    │
│   @CachePut              - Update cache                         │
├────────────────────────────────────────────────────────────────┤
│ ASYNC / SCHEDULING                                              │
│   @EnableAsync           - Enable @Async                        │
│   @Async                 - Run in background thread             │
│   @EnableScheduling      - Enable @Scheduled                    │
│   @Scheduled             - Periodic execution                   │
├────────────────────────────────────────────────────────────────┤
│ RETRY                                                           │
│   @EnableRetry           - Enable @Retryable                    │
│   @Retryable             - Retry on exception                   │
│   @Recover               - Fallback after retries               │
├────────────────────────────────────────────────────────────────┤
│ EVENTS                                                          │
│   @EventListener         - Listen for events                    │
│   @TransactionalEventListener - Post-transaction events         │
├────────────────────────────────────────────────────────────────┤
│ LIFECYCLE                                                       │
│   @PostConstruct         - After bean creation                  │
│   @PreDestroy            - Before bean destruction              │
│   @PrePersist            - Before JPA insert                    │
│   @PreUpdate             - Before JPA update                    │
└────────────────────────────────────────────────────────────────┘
```

---

## 24. Common Interview Coding Patterns in This Project

### Pattern 1: Service with Caching + Idempotency

```java
public Result doOperation(Request request, String idempotencyKey) {
    // 1. Check cache for existing result
    String cached = idempotencyService.getResult(idempotencyKey);
    if (cached != null) return deserialize(cached);
    
    // 2. Acquire distributed lock
    if (!idempotencyService.acquireIdempotencyLock(idempotencyKey)) {
        throw new ConcurrentModificationException("Already processing");
    }
    
    try {
        // 3. Do actual work
        Result result = processActualOperation(request);
        
        // 4. Store result for future requests
        idempotencyService.storeResult(idempotencyKey, serialize(result));
        
        return result;
    } catch (Exception e) {
        // 5. Release lock on failure
        idempotencyService.releaseLock(idempotencyKey);
        throw e;
    }
}
```

### Pattern 2: Event-Driven Notification

```java
// In Service (Publisher)
@Transactional
public void doBusinessLogic() {
    // Business logic here...
    entityRepository.save(entity);
    
    // Publish event (still in transaction)
    eventPublisher.publishEvent(new BusinessEvent(this, entity));
}

// In Listener (Subscriber)
@Async("notificationExecutor")
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void handleEvent(BusinessEvent event) {
    // This runs AFTER transaction commits, in separate thread
    notificationService.sendNotification(event.getUserEmail(), "Message");
}
```

### Pattern 3: Authorization + Audit

```java
public Result protectedOperation(String accountNumber) {
    // 1. Get fresh data (no cache) for authorization
    Account account = getAccountForAuth(accountNumber);
    
    // 2. Get current user
    String currentUser = SecurityContextHolder.getContext()
        .getAuthentication().getName();
    
    // 3. Verify ownership
    if (!account.getUser().getEmail().equalsIgnoreCase(currentUser)) {
        auditService.record("OPERATION", "ACCOUNT", accountNumber, "DENIED", "Ownership failed");
        throw new UnauthorizedAccountAccessException("Not authorized");
    }
    
    // 4. Verify account status
    if (account.getVerificationStatus() != VerificationStatus.VERIFIED) {
        auditService.record("OPERATION", "ACCOUNT", accountNumber, "DENIED", "Not verified");
        throw new AccountStatusException("Account not verified");
    }
    
    // 5. Do operation
    Result result = doOperation(account);
    
    // 6. Audit success
    auditService.record("OPERATION", "ACCOUNT", accountNumber, "SUCCESS", "details");
    
    return result;
}
```

---

**Good luck with your interview! 🍀**

*This document covers the core backend concepts. For frontend or deployment questions, refer to the respective documentation.*
