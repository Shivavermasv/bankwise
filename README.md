# 🏦 BankWise – Modern Digital Banking Platform

<div align="center">

![BankWise](https://img.shields.io/badge/BankWise-Digital%20Banking-blue?style=for-the-badge&logo=bank&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.2-6DB33F?style=flat-square&logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**A secure, full-featured digital banking platform with real-time notifications, loan management, and comprehensive admin controls.**

[🌐 Live Demo](https://bankwise-production-69d4.up.railway.app/) • [📖 Documentation](DOCUMENTATION.md) • [🏗️ Architecture](docs/ARCHITECTURE.md)

</div>

---

## ✨ Features

### 💰 Core Banking
- **Account Management** – Create savings/current accounts with unique 12-digit account numbers
- **KYC Verification** – Upload Aadhar & PAN documents for admin approval
- **Fund Transfers** – Secure transfers with transaction PIN verification
- **Deposit Requests** – Request deposits with admin approval workflow
- **Transaction History** – Detailed history with PDF export capability
- **Beneficiary Management** – Save frequent transfer recipients

### 💳 Cards & Payments
- **Virtual Cards** – Issue debit/credit cards with customizable limits
- **Card Controls** – Block/unblock, enable international transactions
- **Scheduled Payments** – Set up recurring transfers (daily, weekly, monthly)
- **Bill Payments** – Pay utility bills with scheduling options

### 📊 Loans & EMI
- **Loan Applications** – Apply for loans with instant EMI calculation
- **EMI Management** – Track payments, enable auto-debit
- **Repayment History** – View payment schedules and outstanding amounts
- **Credit Score** – Dynamic scoring based on repayment behavior (±2-25 points)

### 🔔 Real-time Features
- **WebSocket Notifications** – Instant alerts for transactions
- **Live Balance Updates** – Real-time account balance sync
- **Admin Alerts** – Notifications for pending approvals

### 👤 User Dashboard
- **Analytics Dashboard** – Spending patterns, category breakdowns
- **Profile Management** – Update personal info and profile photo
- **Dark/Light Theme** – Customizable UI theme

### 🛡️ Admin Panel
- **Account Verification** – Approve/reject KYC submissions
- **Deposit Management** – Process deposit requests
- **Loan Approvals** – Review and approve loan applications
- **User Management** – Suspend/activate accounts
- **System Analytics** – Platform-wide metrics and insights

### 🔧 Developer Console
- **API Documentation** – Interactive Swagger UI
- **System Metrics** – Memory, uptime, request statistics
- **Audit Logs** – Comprehensive activity tracking
- **Support Tickets** – Manage user support requests

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Java 17 | Runtime environment |
| Spring Boot 3.3.2 | Application framework |
| Spring Security | Authentication & authorization |
| Spring Data JPA | Database ORM |
| PostgreSQL | Primary database |
| Redis | Caching layer |
| WebSocket/STOMP | Real-time notifications |
| JWT | Token-based authentication |
| Brevo (Sendinblue) | Transactional emails |
| OpenPDF/iText | PDF generation |

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| Vite 7 | Build tool |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| Lottie | Success/error animations |
| React Router | Navigation |

---

## 🚀 Quick Start

### Prerequisites
- Java 17+
- Node.js 18+
- PostgreSQL 14+ (or use cloud database)
- Maven 3.8+

### Backend Setup
```bash
cd backend

# Configure environment
cp .env.example .env
# Edit .env with your database, email, and JWT settings

# Run the application
./mvnw spring-boot:run
```

### Frontend Setup
```bash
cd frontend/frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with API URL

# Start development server
npm run dev
```

### Environment Variables

#### Backend (.env)
```properties
# Database
DB_URL=jdbc:postgresql://localhost:5432/bankwise
DB_USERNAME=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-256-bit-secret-key

# Email (Brevo)
BREVO_API_KEY=your-brevo-api-key

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

#### Frontend (.env)
```properties
VITE_API_BASE_URL=http://localhost:8091
```

---

## 📁 Project Structure

```
bankwise/
├── backend/
│   ├── src/main/java/com/example/banking_system/
│   │   ├── config/          # Security, WebSocket, Cache configs
│   │   ├── controller/      # REST API controllers
│   │   ├── dto/             # Data transfer objects
│   │   ├── entity/          # JPA entities
│   │   ├── enums/           # Status, Role enumerations
│   │   ├── exception/       # Custom exceptions & handlers
│   │   ├── repository/      # JPA repositories
│   │   └── service/         # Business logic
│   └── src/main/resources/
│       └── application.properties
│
├── frontend/frontend/
│   ├── src/
│   │   ├── Components/      # React components
│   │   │   ├── Admin/       # Admin dashboard components
│   │   │   ├── Auth/        # Login, Register, Forgot password
│   │   │   ├── Layout/      # Navbar, Footer
│   │   │   ├── Modals/      # Dialog components
│   │   │   └── User/        # User dashboard components
│   │   ├── context/         # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API service functions
│   │   └── utils/           # Utility functions, API client
│   └── public/
│
└── docs/                    # Additional documentation
```

---

## 🔐 Security Features

- **JWT Authentication** – Secure token-based auth with expiration
- **OTP Verification** – Email-based two-factor authentication
- **Transaction PIN** – 4-digit PIN for sensitive operations
- **Rate Limiting** – 120 requests/minute per IP
- **Request Deduplication** – Prevents duplicate transactions
- **HTTPS Enforced** – SSL/TLS encryption in production
- **CORS Protection** – Restricted cross-origin access
- **Input Validation** – Server-side validation for all inputs

---

## 📊 API Overview

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/create` | POST | Register new user |
| `/api/verify-otp` | POST | Verify OTP & get token |
| `/api/password/forgot` | POST | Request password reset |

### Banking Operations
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/transaction/transfer` | POST | Transfer funds |
| `/api/transaction/transactions` | GET | Transaction history |
| `/api/loan/apply` | POST | Apply for loan |
| `/api/emi/loans` | GET | Get active loans |

### Admin
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin-dashboard/analytics` | GET | Dashboard metrics |
| `/api/account/updateAccountStatus/{id}` | PATCH | Update account status |
| `/api/loan/{id}/approve` | PUT | Approve loan |

📖 **Full API documentation available at:** `/swagger-ui.html`

---

## 🌐 Deployment

### Live Application
**🔗 [https://bankwise-production-69d4.up.railway.app/](https://bankwise-production-69d4.up.railway.app/)**

### Deployment Platforms
- **Backend:** Railway (Docker container)
- **Frontend:** Netlify (Static hosting)
- **Database:** Neon PostgreSQL (Cloud)

### Docker Deployment
```bash
# Backend
cd backend
docker build -t bankwise-backend .
docker run -p 8091:8091 --env-file .env bankwise-backend

# Frontend
cd frontend/frontend
npm run build
# Deploy dist/ folder to any static hosting
```

---

## 🧪 Testing

```bash
# Backend tests
cd backend
./mvnw test

# Frontend (if tests configured)
cd frontend/frontend
npm run test
```

---

## 📈 Performance Optimizations

- **Response Compression** – GZIP compression (70-80% payload reduction)
- **HTTP/2 Support** – Multiplexed connections
- **Connection Pooling** – HikariCP with optimized settings
- **Query Optimization** – Indexed database queries
- **Caching** – Redis/In-memory caching for frequent data
- **Lazy Loading** – JPA lazy fetch for related entities
- **Async Processing** – Background email/notification processing

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Shiva Verma**

---

<div align="center">

Made with ❤️ using Spring Boot & React

⭐ Star this repository if you find it helpful!

</div>
