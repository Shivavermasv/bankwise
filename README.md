# 💳 BankWise – Personal Banking System

**BankWise** is a secure, modular banking system built with **Spring Boot** and a **React** frontend. It supports KYC verification, deposits, transfers, loan management, and real‑time notifications with role‑based access control.

---

## ⚙️ Tech Stack

### Backend
- Java 17, Spring Boot 3.3.2
- Spring Security (OAuth2 Resource Server + JWT)
- Spring Data JPA (Hibernate) with Batch Processing
- PostgreSQL (Neon Cloud) / H2 for tests
- WebSockets (STOMP) for real-time updates
- JavaMailSender (OTP, PDF receipts)
- Spring Cache (In-memory caching)
- Async Processing (ThreadPoolTaskExecutor)
- Rate Limiting & Request Deduplication

### Frontend
- React 19 + Vite 7
- Tailwind CSS + Framer Motion animations
- Lottie animations for success/error states
- Smart API client with caching & retry logic
- WebSocket/STOMP client for notifications

---

## 📌 Features

### Core Banking
- Role‑based authentication (`USER`, `CUSTOMER`, `MANAGER`, `ADMIN`, `DEVELOPER`)
- KYC upload and admin approval flow
- Deposits with admin approval workflow
- Secure fund transfers with self-transfer prevention
- Transaction history with PDF export
- Loan request, EMI calculation, and repayment tracking

### Security & Performance
- JWT authentication with OTP verification
- Credit score system (700 default, ±2-25 on payments)
- Rate limiting (120 requests/min per IP)
- Request deduplication (prevents duplicate submissions)
- Response compression (70-80% payload reduction)
- HTTP/2 support for faster connections
- Connection pool optimization (HikariCP)

### Real-time Features
- WebSocket notifications for transactions
- Live balance updates
- Admin alerts for pending approvals

### Admin Dashboard
- Analytics with charts and metrics
- Account verification management
- Loan approval workflow
- Deposit request processing
- Interest rate configuration
- Service health monitoring

### Developer Dashboard
- System uptime and memory metrics
- API endpoint performance tracking
- Database statistics
- Cache hit/miss rates
- Request/response analytics

---

## 📚 Documentation

See [DOCUMENTATION.md](DOCUMENTATION.md) for architecture, security, and module details.

---

## 🧰 Run Locally

### Backend
1. Copy `.env.example` to `.env` and configure:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Update `.env` with your database, email, and JWT settings
3. Start PostgreSQL (or use Neon cloud database)
4. From [backend/](backend):
   ```bash
   ./mvnw spring-boot:run
   ```

### Frontend
1. Copy `.env.example` to `.env`:
   ```bash
   cp frontend/frontend/.env.example frontend/frontend/.env
   ```
2. Update `VITE_API_BASE_URL` if backend is not on localhost:8091
3. From [frontend/frontend/](frontend/frontend):
   ```bash
   npm install
   npm run dev
   ```

---

## 🚀 Production Deployment

### Backend (Docker on Render)
1. Set environment variables in Render dashboard:
   - `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` (Neon PostgreSQL)
   - `MAIL_USERNAME`, `MAIL_PASSWORD` (Gmail SMTP)
   - `JWT_SECRET` (secure random string)
   - `CORS_ALLOWED_ORIGINS` (your frontend URL)
2. Deploy using the included `Dockerfile`
3. Set up external ping service (UptimeRobot) to hit `/api/system/ping` every 10 min

### Frontend (Netlify)
1. Update `.env.production` with your Render backend URL
2. Build: `npm run build`
3. Deploy `dist/` folder to Netlify
4. The `_redirects` file handles SPA routing

---

## ⚡ Performance Optimizations

| Optimization | Description |
|--------------|-------------|
| Response Compression | GZIP compression for JSON (70-80% reduction) |
| HTTP/2 | Multiplexed connections |
| Connection Pool | HikariCP with 2-10 connections |
| Spring Caching | In-memory cache for users, accounts, balances |
| Async Processing | Background threads for emails, notifications |
| Rate Limiting | 120 req/min per IP |
| Request Deduplication | Prevents duplicate in-flight requests |
| Frontend Caching | 30-second cache with auto-invalidation |
| Retry Logic | 2 retries with exponential backoff |

---

## ✅ Tests

- Backend: `./mvnw clean test`
- Frontend: `npm run build`

---

## 📂 Project Structure

```
BankWise/
├── backend/
│   ├── src/main/java/com/example/banking_system/
│   │   ├── account/      # Account & deposit management
│   │   ├── admin/        # Admin dashboard & analytics
│   │   ├── audit/        # Audit trail logging
│   │   ├── auth/         # JWT authentication & security
│   │   ├── config/       # Async, CORS, WebSocket config
│   │   ├── event/        # Event-driven architecture
│   │   ├── loan/         # Loan management
│   │   ├── notification/ # Email & WebSocket notifications
│   │   ├── support/      # Support tickets
│   │   └── transaction/  # Transfer & transaction history
│   └── .env.example
├── frontend/
│   └── frontend/
│       ├── src/
│       │   ├── Components/
│       │   ├── hooks/
│       │   ├── services/
│       │   └── utils/
│       ├── .env.example
│       └── .env.production
├── DOCUMENTATION.md
└── README.md
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
