# BankWise Documentation

## Overview
BankWise is a modular monolith banking system with a Spring Boot backend and a React (Vite) frontend. It supports authentication, KYC, deposits, transfers, loan management, and real‑time notifications.

## Detailed Architecture
For a deeper breakdown of structure, design decisions, and design patterns (what/why/how), see:
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Architecture
- **Backend**: Java 17, Spring Boot 3, modular monolith by feature package.
- **Frontend**: React + Vite + Tailwind, role‑based routing and shared API utilities.
- **Real‑time**: WebSocket/STOMP notifications.
- **Security**: OAuth2 Resource Server with JWT (HMAC HS512).

## User Roles & Permissions

### Role Hierarchy
| Role | Description | Access Level |
|------|-------------|--------------|
| `USER` | Standard bank user | Personal account operations |
| `CUSTOMER` | Customer (frontend alias) | Same as USER - personal account operations |
| `ADMIN` | System administrator | Full system access, user management |
| `MANAGER` | Operations manager | Loan approvals, deposit processing |

### Role-Based Endpoint Access
| Endpoint Category | USER/CUSTOMER | MANAGER | ADMIN |
|-------------------|---------------|---------|-------|
| Personal Account | ✅ | ✅ | ✅ |
| KYC Submission | ✅ | ❌ | ❌ |
| Deposit Requests | ✅ | ❌ | ❌ |
| Transfers | ✅ | ❌ | ❌ |
| Loan Application | ✅ | ❌ | ❌ |
| View Own Loans | ✅ | ✅ | ✅ |
| Support Tickets | ✅ | ✅ | ✅ |
| Deposit Approvals | ❌ | ✅ | ✅ |
| Loan Approvals | ❌ | ✅ | ✅ |
| Account Status | ❌ | ❌ | ✅ |
| User Management | ❌ | ❌ | ✅ |
| Audit Logs | ❌ | ✅ | ✅ |

> **Note**: `USER` and `CUSTOMER` roles have identical permissions. The `CUSTOMER` role exists for frontend compatibility.

## Recent Optimizations

### Async Processing & Event-Driven Architecture
- **Thread Pools**: Dedicated executors for tasks, emails, notifications, and heavy operations
- **Event System**: API calls return immediately; notifications sent asynchronously after transaction commit
- **Events**: `TransferCompletedEvent`, `LoanApplicationEvent`, `LoanStatusChangedEvent`, `DepositProcessedEvent`, `AccountStatusChangedEvent`
- **Pattern**: `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` ensures data integrity

### Retry & Resilience
- **Email Service**: Auto-retry with exponential backoff (1s → 2s → 4s) for failed emails
- **Recovery Methods**: Graceful handling when all retries fail
- **Spring Retry**: `@Retryable` annotations for transient failures

### File-Based Logging
- **Main Log**: `logs/bankwise.log` - All application logs
- **Error Log**: `logs/bankwise-errors.log` - Errors only
- **Audit Log**: `logs/bankwise-audit.log` - Business actions
- **Security Log**: `logs/bankwise-security.log` - Auth events
- **Performance Log**: `logs/bankwise-performance.log` - Slow operations

### Database Optimizations
- **Indexes**: Added on frequently queried columns (account_number, status, timestamps)
- **Lazy Loading**: Relationships use `FetchType.LAZY` to avoid N+1 queries
- **JOIN FETCH**: Optimized queries for transaction history

### Service Layer Best Practices
- **Constructor Injection**: All services use `@RequiredArgsConstructor` for immutable dependencies
- **Single Responsibility**: Each service handles a specific domain concern
- **Transaction Management**: `@Transactional` annotations for data consistency

## Backend Modules (Feature Packages)
- **auth**: authentication, JWT generation, user lookup, security config, STOMP auth.
- **account**: account profile, deposits.
- **transaction**: transfers and transaction history.
- **loan**: loan requests and approval flow.
- **notification**: notifications, WebSocket endpoints.
- **admin**: admin dashboard and management endpoints.
- **config**: shared config (CORS, async, Swagger, etc.) inside feature packages as needed.
- **audit**: audit trail recording and retrieval.
- **controller**: new feature controllers (beneficiaries, cards, scheduled payments, transaction PIN, analytics, EMI).
- **service**: business logic services including EMI auto-debit scheduler.
- **entity**: JPA entities including new Beneficiary, Card, ScheduledPayment.
- **enums**: CardType, CardStatus, PaymentFrequency, ScheduledPaymentStatus, LoanStatus, TransactionType.

## Request Validation
DTOs are annotated with bean validation (Jakarta Validation). Invalid input returns structured validation errors.

## Audit Trails
- **What is recorded**: login/OTP verification, user creation, KYC submission, account status changes, transfers, deposit approvals/rejections, and loan lifecycle events.
- **Storage**: `AuditLog` entity (action, actor, target, status, details, timestamp).
- **Admin access**: `GET /api/audit` (optional filters by `actorEmail`, `action`, `targetType`).

## Limits and Rules
Configured in [backend/src/main/resources/application.properties](backend/src/main/resources/application.properties):
- `bankwise.transfer.min-amount`
- `bankwise.transfer.max-amount`
- `bankwise.transfer.daily-limit`
- `bankwise.loan.min-amount`
- `bankwise.loan.max-amount`

Enforced rules:
- Transfers require **verified** accounts and ownership checks.
- Daily transfer limits are enforced per source account.
- Loan requests require **verified** accounts and block multiple active/pending loans.

## Account Lifecycle
Account lifecycle uses `VerificationStatus`:
- `PENDING` → `VERIFIED` or `REJECTED`
- `VERIFIED` → `SUSPENDED` or `DISABLED`
- `SUSPENDED` → `VERIFIED` or `DISABLED`
- `DISABLED` is terminal (cannot be reactivated)

Admin endpoint: `PATCH /api/account/updateAccountStatus/{accountNumber}`.

## WebSocket Authentication
The frontend sends the `Authorization: Bearer <token>` header in the STOMP CONNECT frame. The backend interceptor validates the token and associates the user with the session.

## Security Notes
- Ownership checks are enforced for transfers, loan access, and deposit requests.
- Suspended/disabled accounts are blocked from transactional actions.
- OAuth2 Resource Server validates JWT tokens (HS512).

## Feature Flows (Backend)
### Authentication
1. `POST /api/create` — register user.
2. `POST /api/verify-otp` — verify OTP and receive JWT token.
3. JWT is used as `Authorization: Bearer <token>`.

### KYC Submission
1. `POST /api/account/submit` with form-data (Aadhar/PAN + address).
2. KYC is stored and marked `PENDING`.
3. Admin updates status via `PATCH /api/account/updateAccountStatus/{accountNumber}`.

### Deposits
1. `POST /api/account/deposit` creates a deposit request (user‑owned + verified account only).
2. Admin/Manager approves or rejects via `PUT /api/account/depositAction?action=approve|reject`.

### Transfers
1. `POST /api/transaction/transfer` transfers funds.
2. Rules enforced: ownership, verified status, per‑transaction limits, daily limits.

### Loans
1. `POST /api/loan/apply` creates a loan request (verified account only).
2. Admin/Manager uses `POST /api/loan/approve/{loanId}` or `POST /api/loan/reject/{loanId}`.
3. User can view history via `GET /api/loan/my/{accountNumber}`.
4. Monthly EMI processing is scheduled and closes loans when fully repaid.

### Notifications
1. `GET /api/notification/notifications?userEmail=` fetches pending notifications.
2. `PATCH /api/notification/notifications/{id}/seen` marks as read.
3. WebSocket `/topic/notifications/{email}` pushes real‑time updates.

### Beneficiary Management
1. `GET /api/beneficiaries` — list all saved beneficiaries.
2. `GET /api/beneficiaries/favorites` — list favorite beneficiaries.
3. `GET /api/beneficiaries/search?query=` — search by name or account number.
4. `POST /api/beneficiaries` — add new beneficiary (accountNumber, nickname).
5. `PUT /api/beneficiaries/{id}` — update beneficiary (nickname, isFavorite).
6. `DELETE /api/beneficiaries/{id}` — remove beneficiary.
7. `POST /api/beneficiaries/record-transfer` — record transfer to update last transfer date.

### Card Management
1. `GET /api/cards` — list all user cards.
2. `GET /api/cards/active` — list active cards only.
3. `GET /api/cards/{id}?showSensitive=` — get card details (optionally reveal full number/CVV).
4. `POST /api/cards/issue/debit` — request new debit card.
5. `POST /api/cards/issue/credit` — request new credit card with limit.
6. `POST /api/cards/{id}/block` — block a card.
7. `POST /api/cards/{id}/unblock` — unblock a card.
8. `PUT /api/cards/{id}/settings` — update card settings (international, online, contactless, dailyLimit).

### Scheduled Payments
1. `GET /api/scheduled-payments` — list all scheduled payments.
2. `GET /api/scheduled-payments/active` — list active scheduled payments.
3. `GET /api/scheduled-payments/upcoming?days=` — list payments due within N days.
4. `POST /api/scheduled-payments` — create new scheduled payment.
5. `PUT /api/scheduled-payments/{id}` — update scheduled payment.
6. `POST /api/scheduled-payments/{id}/pause` — pause a scheduled payment.
7. `POST /api/scheduled-payments/{id}/resume` — resume a paused payment.
8. `POST /api/scheduled-payments/{id}/cancel` — cancel a scheduled payment.

### Transaction PIN
1. `GET /api/transaction-pin/status` — check if user has PIN set up.
2. `POST /api/transaction-pin/setup` — set up new 4-digit PIN.
3. `POST /api/transaction-pin/verify` — verify PIN for transactions.
4. `POST /api/transaction-pin/forgot` — initiate forgot PIN flow (sends OTP).
5. `POST /api/transaction-pin/reset` — reset PIN with OTP verification.
6. `POST /api/transaction-pin/change` — change PIN (requires current PIN).

### User Analytics
1. `GET /api/analytics/dashboard` — get dashboard summary (balance, spending, income, credit score).
2. `GET /api/analytics/spending?months=` — get spending breakdown by category and monthly trends.
3. `GET /api/analytics/loans` — get loan analytics (active loans, repayment history).
4. `GET /api/analytics/debts` — get debt summary and debt-to-income ratio.
5. `GET /api/analytics/monthly-summary?year=&month=` — get specific month's income vs expense.

### EMI Management
1. `GET /api/emi/schedule/{loanId}` — get EMI schedule for a loan.
2. `POST /api/emi/pay/{loanId}` — pay EMI manually (early payment).
3. `POST /api/emi/auto-debit/{loanId}?enabled=` — toggle auto-debit for a loan.
4. `GET /api/emi/details/{loanId}` — get detailed EMI information.
5. `GET /api/emi/loans` — get all loans with EMI information.
6. `PUT /api/emi/emi-day/{loanId}?dayOfMonth=` — change EMI day preference (1-28).

### EMI Auto-Debit Scheduler
- Runs daily at 6:00 AM via `EmiSchedulerService`.
- Processes all due EMIs automatically from linked bank accounts.
- Sends reminder notifications 3 days before EMI due date.
- Updates credit score based on payment behavior:
  - +2 points for early payment (>3 days before due)
  - +1 point for on-time payment
  - -5 points for late payment (within 7 days)
  - -10 points for missed payment (>7 days overdue)

### Audit Logs
`GET /api/audit` for recent logs (admin/manager). Optional filters: `actorEmail`, `action`, `targetType`.

## Environment Configuration

### Backend (.env)
Required environment variables:
| Variable | Description | Example |
|----------|-------------|---------|
| `DB_URL` | PostgreSQL JDBC URL | `jdbc:postgresql://localhost:5432/bankwise` |
| `DB_USERNAME` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `your_password` |
| `JWT_SECRET` | JWT signing key (min 64 chars) | `your_64_char_secret...` |
| `MAIL_USERNAME` | Gmail address for SMTP | `app@gmail.com` |
| `MAIL_PASSWORD` | Gmail app password | `xxxx xxxx xxxx xxxx` |
| `SERVER_PORT` | Backend port (optional) | `8091` |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | `http://localhost:5173` |

### Frontend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:8091` |
| `VITE_WS_URL` | WebSocket URL | `ws://localhost:8091/ws` |
| `VITE_APP_NAME` | App display name | `BankWise` |

## Running Locally
### Backend
1. Configure PostgreSQL.
2. From `backend/`:
   - `./mvnw spring-boot:run`

### Frontend
1. From `frontend/frontend/`:
   - `npm install`
   - `npm run dev`

## Tests
- Backend: `./mvnw clean test`
- Frontend: `npm run build`

## Notable Endpoints (High‑Level)
- **Auth**: login/register/OTP
- **Account**: profile, deposit request
- **Transactions**: transfer, history
- **Loans**: request, pending list, approve/reject, status update, user loan history
- **Notifications**: list, mark seen
- **Audit**: list audit logs (admin/manager)
- **Beneficiaries**: save/search/manage frequently-used recipients
- **Cards**: issue debit/credit cards, block/unblock, settings management
- **Scheduled Payments**: create/manage recurring payments
- **Transaction PIN**: setup/verify/reset 4-digit secure PIN
- **User Analytics**: spending trends, loan analytics, debt analysis
- **EMI**: schedule viewing, manual payments, auto-debit toggle

## Logging
Backend uses SLF4J for service‑level logging and error reporting.

## Frontend Services Layer
API calls are centralized under [frontend/frontend/src/services](frontend/frontend/src/services) and wrap the shared API client.
- `accounts`: KYC submit, deposits, interest rate, account status
- `transactions`: transfers, history, PDF
- `loans`: apply, pending list, approve/reject, status update
- `notifications`: list/mark seen
- `admin`: analytics
- `auth`: registration
- `bankingApi` (in `src/utils/`): beneficiaries, cards, scheduled payments, transaction PIN, user analytics, EMI

## Frontend Components (New Features - January 2026)
| Component | Description |
|-----------|-------------|
| `BeneficiaryManagement` | Manage saved recipients with favorites, search, and recent transfers |
| `CardManagement` | Virtual card UI with realistic design, block/unblock, and card settings |
| `TransactionPinModal` | 4-digit PIN input with visual feedback, setup/verify/change/forgot flows |
| `ScheduledPayments` | Create and manage recurring payments with pause/resume functionality |
| `UserAnalyticsDashboard` | Spending charts, loan analytics, debt breakdown with insights |
| `EmiManagement` | EMI schedule table, manual payments, auto-debit toggle, EMI day settings |

## Frontend Flows
- **Auth**: Register → OTP verify → token stored in session storage.
- **User Home**: KYC upload, deposit request, recent transactions, notifications.
- **Admin Home**: analytics, deposit approvals, account status changes, loan status updates.
- **Notifications**: shared WebSocket hook updates UI and toasts.
- **Beneficiaries**: Add/edit/delete recipients, mark favorites, quick selection during transfers.
- **Cards**: View virtual cards, toggle block/unblock, configure international/online/contactless settings.
- **Scheduled Payments**: Create recurring payments, view upcoming payments, pause/resume/cancel.
- **Transaction PIN**: 4-digit PIN entry with auto-focus, OTP-based reset flow.
- **Analytics**: Dashboard overview, spending by category charts, loan repayment progress, debt-to-income ratio.
- **EMI Management**: View EMI schedule, pay EMI early, enable/disable auto-debit, change EMI day.

## New Entities (January 2026)

| Entity | Description | Key Fields |
|--------|-------------|------------|
| `Beneficiary` | Saved transfer recipients | accountNumber, nickname, isFavorite, lastTransferDate |
| `Card` | Debit/Credit card | cardNumber, cvv, expiryDate, cardType, status, settings |
| `ScheduledPayment` | Recurring payment schedule | amount, frequency, startDate, endDate, status |

## Modified Entities

| Entity | Changes |
|--------|---------|
| `LoanRequest` | Added EMI tracking: emiAmount, nextEmiDate, totalEmis, remainingPrincipal, autoDebitEnabled, emiDayOfMonth, missedEmis |
| `User` | Added transactionPin, pinAttempts, pinLockedUntil for secure PIN management |

## New Enums

| Enum | Values |
|------|--------|
| `CardType` | DEBIT, CREDIT |
| `CardStatus` | ACTIVE, BLOCKED, EXPIRED, CANCELLED |
| `PaymentFrequency` | DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY |
| `ScheduledPaymentStatus` | ACTIVE, PAUSED, CANCELLED, COMPLETED |

## Modified Enums

| Enum | Added Values |
|------|--------------|
| `LoanStatus` | ACTIVE, FULLY_PAID |
| `TransactionType` | LOAN_REPAYMENT, SCHEDULED_PAYMENT, BILL_PAYMENT |
