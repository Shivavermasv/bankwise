# BankWise Architecture, Design & Patterns

This document explains the current structure and design of BankWise (backend + frontend) with **what / why / how** for the main architectural choices.

## 1) System Overview

**What**: BankWise is a **modular monolith**:
- A single deployable backend (Spring Boot) with feature modules (auth, account, transaction, loan, notification, audit, support, admin).
- A separate SPA frontend (React/Vite) that consumes REST APIs and subscribes to WebSocket/STOMP topics.

**Why**:
- A modular monolith keeps deployment/simple debugging easier than microservices, while still enabling “microservice-like” separation by package.

**How**:
- Backend feature packages live under `com.example.banking_system.<feature>`.
- Shared “horizontal” packages exist for common primitives (entities, DTOs, exceptions, repositories).

## 2) Backend (Spring Boot) Architecture

### 2.1 Package and Module Layout

**What**:
- Feature packages:
  - `auth/`: login, OTP, token creation/validation, method security, STOMP auth
  - `account/`: KYC, deposit requests, account profile/lifecycle
  - `transaction/`: transfers + history
  - `loan/`: loan request + approval + scheduled processing
  - `notification/`: notification persistence + WebSocket broker config
  - `audit/`: audit log persistence and querying
  - `support/`: support tickets (create/list)
  - `admin/`: admin analytics + admin management endpoints
  - `controller/`: REST controllers for new features (beneficiaries, cards, scheduled payments, PIN, analytics, EMI)
  - `service/`: business logic services including EMI scheduler
- Shared packages:
  - `entity/`: JPA entities (User, Account, Transaction, Loan, Beneficiary, Card, ScheduledPayment, etc.)
  - `repository/`: Spring Data repositories
  - `dto/`: request/response DTOs
  - `exception/`: domain exceptions + global handler
  - `config/`: cross-cutting filters/config
  - `enums/`: CardType, CardStatus, PaymentFrequency, ScheduledPaymentStatus, LoanStatus, TransactionType

**Why**:
- Feature grouping reduces coupling and makes it easier to evolve modules independently.
- Shared packages avoid duplication for cross-cutting data models and error envelopes.

**How**:
- Controllers are primarily inside feature packages (some legacy `controller/` and `service/` folders may be empty).

### 2.2 Layering (Controller → Service → Repository)

**What**:
- **Controller layer**: maps HTTP/WebSocket requests to use-cases.
- **Service layer**: holds business rules (limits, eligibility, lifecycle transitions).
- **Repository layer**: persists/fetches entities via Spring Data JPA.

**Why**:
- Keeps business rules testable and reusable.
- Avoids “fat controllers” and duplicated persistence logic.

**How**:
- REST endpoints accept DTOs (`@RequestBody`, `@Valid`) and delegate to services.
- Services depend on repositories via dependency injection.

### 2.3 Security Architecture (JWT + Spring Security)

**What**:
- Stateless security with Spring Security.
- JWT tokens signed with **HS512**.
- Method-level authorization via `@EnableMethodSecurity` and `@PreAuthorize`.

**Why**:
- Stateless JWT fits SPA clients and simplifies horizontal scaling.
- Method security gives fine-grained protection close to the business endpoint.

**How**:
- Login flow:
  1. User registers (`/api/create`).
  2. OTP verification (`/api/verify-otp`) issues a JWT.
  3. Subsequent API calls use `Authorization: Bearer <token>`.
- Token validation:
  - The app uses Spring’s OAuth2 Resource Server JWT support to validate incoming Bearer tokens.
  - Roles are placed in the `roles` claim and mapped to authorities.

### 2.4 Persistence & Domain Model

**What**:
- Uses Spring Data JPA (Hibernate) with PostgreSQL.
- Entities represent core banking concepts: User, Account, Transaction, Loan, Notification, AuditLog, SupportTicket, etc.

**Why**:
- JPA provides rapid CRUD + query composition and aligns well with domain modeling.

**How**:
- Repositories extend `JpaRepository`.
- Custom JPQL queries are used where needed (search/filter endpoints).
- Schema evolution currently relies on `spring.jpa.hibernate.ddl-auto=update`.

### 2.5 Real-time Notifications (WebSocket/STOMP)

**What**:
- WebSocket endpoint (default `/ws`) with a simple broker (`/topic`) and app destinations (`/app`).

**Why**:
- Allows instant UI updates (notifications, status changes) without polling.

**How**:
- Broker config enables subscribe destinations like `/topic/notifications/<email>`.
- Authentication is enforced in two places:
  - A handshake interceptor validates a token passed as a query param.
  - A STOMP channel interceptor validates the token from STOMP CONNECT headers.

### 2.6 Cross-cutting Concerns

**What**:
- Centralized error mapping via a `@ControllerAdvice` global exception handler.
- Request timing filter for performance visibility.

**Why**:
- Consistent error envelope improves frontend UX and debugging.
- Cross-cutting instrumentation avoids duplicating timing/logging in each controller.

**How**:
- Exceptions are translated into an `ApiErrorResponse` with `status`, `message`, `path`, and timestamp.

## 3) Backend Design Patterns Used

- **Repository Pattern**: Spring Data repositories encapsulate persistence.
- **Service Layer Pattern**: services hold business rules and orchestrate multiple repositories.
- **DTO / Anti-Corruption Layer**: request/response DTOs prevent tight coupling between API contracts and entity models.
- **Dependency Injection**: Spring manages construction and wiring.
- **Interceptor / Filter Pattern**:
  - HTTP security filters for auth
  - Request timing filter
  - WebSocket handshake and STOMP channel interceptors
- **Publish/Subscribe (Messaging)**: STOMP topics broadcast notifications to subscribed clients.
- **Scheduled Tasks**: `@Scheduled` cron jobs for EMI processing and payment scheduling.
- **Builder Pattern**: Entity construction using Lombok `@Builder` for complex objects like Transaction, LoanRequest.

## 3.1) Scheduled Services

| Service | Schedule | Description |
|---------|----------|-------------|
| `EmiSchedulerService` | Daily at 6:00 AM | Processes due EMIs, sends reminders 3 days before, updates credit scores |
| `ScheduledPaymentService` | Configurable | Executes recurring payments based on frequency settings |

## 4) Frontend (React/Vite) Architecture

### 4.1 App Structure

**What**:
- React SPA with React Router.
- Feature-oriented component folders under `src/Components`.
- Shared utilities under `src/utils`.
- Shared API/service layer under `src/services`.

**Why**:
- Keeps UI concerns modular and discoverable.
- Centralizing network calls reduces duplicated fetch boilerplate and makes auth/error handling consistent.

**How**:
- Routing is defined in `src/App.jsx` using a protected routes array.
- User role is stored in `sessionStorage` and checked at routing and component boundaries.

### 4.2 Client-side Auth & Route Protection

**What**:
- Route guards enforce authentication and role authorization.
- Session validity is checked via token expiration decoding.

**Why**:
- Prevents exposing protected screens to unauthenticated users.
- Improves UX by redirecting immediately when a token expires.

**How**:
- `AuthGuard` wraps protected routes.
- A Higher-Order Component (`withSessionMonitoring`) periodically validates session and reacts to multi-tab logout.

### 4.3 API Layer

**What**:
- `apiFetch` is a centralized wrapper around `fetch`.

**Why**:
- Standardizes base URL, headers, error parsing, and JSON/text handling.
- Enables consistent loading state and error envelopes.

**How**:
- Token is attached as `Authorization: Bearer <token>`.
- A small pub/sub mechanism powers a global loading overlay.

### 4.4 Real-time Notifications

**What**:
- WebSocket/STOMP client using `@stomp/stompjs`.

**Why**:
- Live notifications without manual refresh.

**How**:
- The client connects to `/ws?token=<jwt>` and subscribes to per-user topics.
- A lightweight listener registry broadcasts incoming notifications to components/hooks.

## 5) Frontend Design Patterns Used

- **Component Composition**: pages built from reusable components.
- **Custom Hooks**: shared stateful logic (auth, notifications, transaction PIN).
- **Service Layer**: `src/services/*` and `src/utils/bankingApi.js` groups API calls by domain.
- **Higher-Order Component (HOC)**: session monitoring wrapper.
- **Observer/Publisher Pattern**: notification listeners and global loading listeners.

## 5.1) New Feature Components (January 2026)

The following major feature components were added to enhance banking functionality:

| Component | Location | Description |
|-----------|----------|-------------|
| `BeneficiaryManagement` | `src/Components/User/` | Save, search, and manage frequently-used transfer recipients with favorites |
| `CardManagement` | `src/Components/User/` | Virtual card display with realistic design, card blocking, and settings management |
| `TransactionPinModal` | `src/Components/Modals/` | 4-digit PIN setup/verification with visual feedback and forgot PIN flow |
| `ScheduledPayments` | `src/Components/User/` | Create and manage recurring payments (daily, weekly, monthly, etc.) |
| `UserAnalyticsDashboard` | `src/Components/User/` | Spending analytics, loan repayment history, and debt analysis with charts |
| `EmiManagement` | `src/Components/User/` | EMI schedule viewing, manual payments, and auto-debit toggle |

## 6) Module Map (Backend ↔ Frontend)

This section is an onboarding shortcut: **backend module → key endpoints → where it shows up in the UI**.

| Domain | Backend package (controller) | Key API endpoints | Frontend routes/pages | Frontend API module |
|---|---|---|---|---|
| Auth + OTP | `auth` (`UserController`, `JWTAuthenticationFilter`) | `POST /api/create`, `POST /api/login`, `POST /api/verify-otp` | `/register` (`RegisterPage`), `/login` (`LoginPage`) | `src/services/auth.js`, `src/utils/authApi.js` |
| User details (ownership-checked) | `auth` (`UserController`) | `GET /api/user/details/{accountNumber}` | Used to hydrate user/account context | `src/services/users.js` (`getUserDetailsOwned`) |
| KYC submission | `account` (`AccountController`) | `POST /api/account/submit` (multipart/form-data) | User home KYC flow (`KycUploadForm`) | `src/services/accounts.js` (`submitKyc`) |
| Account admin listing + search | `account` (`AccountController`) | `GET /api/account/admin/accounts?status=&q=` | `/accounts` (`AccountsPage`) | `src/services/accounts.js` (`listAdminAccounts`) |
| Account lifecycle (verify/suspend/disable) | `account` (`AccountController`) | `PATCH /api/account/updateAccountStatus/{accountNumber}` | Admin accounts management | `src/services/accounts.js` (`updateAccountStatus`) |
| Interest rate updates | `account` (`AccountController`) | `PATCH /api/account/interestRate?accountNumber=&newInterestRate=` | Admin home widget (`InterestRateUpdateForm`) | `src/services/accounts.js` (`updateInterestRate`) |
| Deposit requests (user) | `account` (`AccountController`) | `POST /api/account/deposit` | `/deposit` (user side: `DepositPage`, `DepositRequestForm`) | `src/services/accounts.js` (`createDepositRequest`) |
| Deposit approvals (admin/manager) | `account` (`AccountController`) | `PUT /api/account/depositRequests?status=`, `PUT /api/account/depositAction?action=&depositRequestId=` | Admin deposit approvals (`DepositRequestsAdmin`) | `src/services/accounts.js` (`listDeposits`, `depositAction`) |
| Transfers | `transaction` (`TransactionController`) | `POST /api/transaction/transfer` | `/transfer` (`TransferPage`) | `src/services/transactions.js` (`transferFunds`) |
| Transaction history | `transaction` (`TransactionController`) | `GET /api/transaction/transaction?accountNumber=&page=&size=&startDate=&endDate=` | `/transactions` (`TransactionHistoryPage`) | `src/services/transactions.js` (`fetchTransactions`) |
| Transaction PDF/email | `transaction` (`TransactionController`) | `GET /api/transaction/pdf` | Triggered from UI where needed | `src/services/transactions.js` (`requestTransactionsPdf`) |
| Loans (user) | `loan` (`LoanController`) | `POST /api/loan/apply`, `GET /api/loan/my/{accountNumber}` | `/loan-apply` (`LoanApplicationPage`) | `src/services/loans.js` (`applyForLoan`) |
| Loans (admin/manager) | `loan` (`LoanController`) | `GET /api/loan/pending`, `POST /api/loan/approve/{id}`, `POST /api/loan/reject/{id}`, `POST /api/loan/status` | `/loan-approval` (`AdminLoanApproval`) | `src/services/loans.js` |
| Notifications (REST) | `notification` (`NotificationController`) | `GET /api/notification/notifications?userEmail=`, `PATCH /api/notification/notifications/{id}/seen` | Used by notification UI (modal/toast) | `src/services/notifications.js` |
| Notifications (WebSocket) | `notification` (`WebSocketConfig`, `WebSocketController`) | WebSocket endpoint: `/ws`; subscribe: `/topic/notifications/{email}`; send: `/app/notifications/seen` | Real-time notifications in user/admin UI | `src/utils/notifications.js` |
| Audit logs | `audit` (`AuditController`) | `GET /api/audit?actorEmail=&action=&targetType=` | Admin home audit view (`AdminHome`) | `src/services/audit.js` |
| Support tickets | `support` (`SupportController`) | `POST /api/support/tickets`, `GET /api/support/tickets/my`, `GET /api/support/tickets` | `/support` (`SupportPage`) | `src/services/support.js` |
| Admin analytics | `admin` (`AdminDashboardController`) | `GET /api/admin-dashboard/analytics`, `GET /api/admin-dashboard/analytics/realtime` | `/admin-home` (`AdminHome`) | `src/services/admin.js` |
| **Beneficiaries** | `controller` (`BeneficiaryController`) | `GET /api/beneficiaries`, `POST /api/beneficiaries`, `PUT /api/beneficiaries/{id}`, `DELETE /api/beneficiaries/{id}` | `BeneficiaryManagement` component | `src/utils/bankingApi.js` (`beneficiaryApi`) |
| **Cards** | `controller` (`CardController`) | `GET /api/cards`, `POST /api/cards/issue/debit`, `POST /api/cards/issue/credit`, `POST /api/cards/{id}/block` | `CardManagement` component | `src/utils/bankingApi.js` (`cardApi`) |
| **Scheduled Payments** | `controller` (`ScheduledPaymentController`) | `GET /api/scheduled-payments`, `POST /api/scheduled-payments`, `POST /api/scheduled-payments/{id}/pause` | `ScheduledPayments` component | `src/utils/bankingApi.js` (`scheduledPaymentApi`) |
| **Transaction PIN** | `controller` (`TransactionPinController`) | `POST /api/transaction-pin/setup`, `POST /api/transaction-pin/verify`, `POST /api/transaction-pin/reset` | `TransactionPinModal` component | `src/utils/bankingApi.js` (`transactionPinApi`) |
| **User Analytics** | `controller` (`UserAnalyticsController`) | `GET /api/analytics/dashboard`, `GET /api/analytics/spending`, `GET /api/analytics/loans`, `GET /api/analytics/debts` | `UserAnalyticsDashboard` component | `src/utils/bankingApi.js` (`analyticsApi`) |
| **EMI Management** | `controller` (`EmiController`) | `GET /api/emi/schedule/{loanId}`, `POST /api/emi/pay/{loanId}`, `POST /api/emi/auto-debit/{loanId}` | `EmiManagement` component | `src/utils/bankingApi.js` (`emiApi`) |

Notes:
- The SPA routes and role gating live in `src/App.jsx` and `AuthGuard`.
- Services use `apiFetch` (centralized fetch wrapper) so auth headers and error parsing are consistent.

## 7) “How to extend” (Practical Guide)

### Add a new backend feature
1. Create a new package `com.example.banking_system.<feature>`.
2. Add:
   - `*Controller` (REST endpoints)
   - `*Service` (business logic)
   - `*Repository` (JPA persistence)
   - DTOs in `dto/` (or inside the feature package if preferred)
3. Add method-level security with `@PreAuthorize`.
4. Add validation annotations (`@Valid`, `@NotNull`, etc.).

### Add a new frontend feature
1. Add page/component under `src/Components/Pages` (or relevant module folder).
2. Add API calls to `src/services/<feature>.js`.
3. Add a route in `src/App.jsx` with appropriate roles.

## 8) Notes / Known Trade-offs

- Using `ddl-auto=update` is convenient for local development, but production should typically use a migration tool (Flyway/Liquibase) for repeatable schema changes.
- JWT secret currently appears hard-coded in the backend; consider externalizing it to environment variables for security and rotation.
