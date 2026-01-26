# BankWise Backend

Spring Boot 3.3.2 backend for BankWise banking system. Provides secure REST APIs, WebSocket notifications, and comprehensive banking operations.

## Tech Stack

- **Java 17** with Spring Boot 3.3.2
- **Spring Security** with JWT authentication
- **Spring Data JPA** with PostgreSQL
- **WebSocket/STOMP** for real-time notifications
- **Spring Cache** for performance optimization
- **HikariCP** for connection pooling
- **JavaMailSender** for OTP and notifications

## Features

### Authentication & Security
- JWT token-based authentication
- OTP verification via email
- Role-based access control (USER, CUSTOMER, ADMIN, MANAGER, DEVELOPER)
- Rate limiting (120 requests/min per IP)
- Request deduplication

### Banking Operations
- Account creation with KYC verification
- Deposit requests with admin approval
- Secure fund transfers with validation
- Transaction history with audit trails
- Loan management with EMI calculation
- Credit score tracking (700 default, ±2-25 on payments)

### Performance Optimizations
- Response compression (GZIP)
- HTTP/2 support
- Connection pool tuning (HikariCP)
- In-memory caching (Spring Cache)
- Async processing for emails/notifications
- JPA batch operations

## Configuration

### Environment Variables

```properties
# Database (PostgreSQL/Neon)
DB_URL=jdbc:postgresql://localhost:5432/bankwise
DB_USERNAME=postgres
DB_PASSWORD=postgres

# Email (Gmail SMTP)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# JWT Secret
JWT_SECRET=your-secure-secret-key

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173
WEBSOCKET_ALLOWED_ORIGINS=http://localhost:5173
```

### application.properties Highlights

```properties
# Performance
server.compression.enabled=true
server.http2.enabled=true
spring.jpa.properties.hibernate.jdbc.batch_size=25
spring.datasource.hikari.maximum-pool-size=10

# Banking Limits
bankwise.transfer.max-amount=50000
bankwise.transfer.daily-limit=100000
bankwise.loan.max-amount=500000
```

## API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/create` | Register new user |
| POST | `/api/verify-otp` | Verify OTP and get token |
| GET | `/api/system/ping` | Health check for keep-alive |
| GET | `/api/system/health` | Detailed health status |

### User (Authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/details/{accountNumber}` | Get user details |
| PUT | `/api/user/update-profile` | Update profile |
| POST | `/api/transaction/transfer` | Transfer funds |
| GET | `/api/transaction/transactions` | Transaction history |
| POST | `/api/loan/apply` | Apply for loan |
| GET | `/api/loan/my-loans` | Get user's loans |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin-dashboard/analytics` | Dashboard analytics |
| PUT | `/api/account/depositAction` | Approve/reject deposits |
| PUT | `/api/account/verify/{accountNumber}` | Verify account |
| PUT | `/api/loan/{loanId}/approve` | Approve loan |

### Developer
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/analytics` | System metrics |
| GET | `/api/system/support-tickets` | All support tickets |
| GET | `/api/system/logs/recent` | Recent request logs |

## Project Structure

```
src/main/java/com/example/banking_system/
├── config/           # Configuration classes
│   ├── AsyncConfig.java
│   ├── CacheConfig.java
│   ├── RateLimitFilter.java
│   ├── SecurityConfig.java
│   └── WebSocketConfig.java
├── controller/       # REST controllers
├── dto/              # Data transfer objects
├── entity/           # JPA entities
├── enums/            # Enumerations (Role, Status, etc.)
├── exception/        # Custom exceptions
├── repository/       # JPA repositories
└── service/          # Business logic
```

## Running Locally

```bash
# With Maven wrapper
./mvnw spring-boot:run

# With environment file
cp .env.example .env
# Edit .env with your settings
./mvnw spring-boot:run
```

## Docker Deployment

```bash
# Build image
docker build -t bankwise-backend .

# Run container
docker run -p 8091:8091 \
  -e DB_URL=your-db-url \
  -e DB_USERNAME=user \
  -e DB_PASSWORD=pass \
  -e MAIL_USERNAME=email \
  -e MAIL_PASSWORD=pass \
  -e JWT_SECRET=secret \
  bankwise-backend
```

## Testing

```bash
# Run all tests
./mvnw test

# Run with coverage
./mvnw test jacoco:report
```

## Health Monitoring

The `/api/system/ping` endpoint is public and can be used with external monitoring services (UptimeRobot, cron-job.org) to prevent Render free tier from sleeping.

## Logging

Logs are written to:
- `logs/bankwise.log` - Application logs
- `logs/bankwise-errors.log` - Error logs only
- `logs/bankwise-audit.log` - Audit trail logs

Log rotation: 10MB per file, 30 days retention, 500MB total cap.
