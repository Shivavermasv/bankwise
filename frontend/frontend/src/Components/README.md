# Component Structure

The components have been organized into logical folders for better maintainability and easier access:

## 📁 Folder Structure

```
src/Components/
├── Auth/                    # Authentication components
│   ├── LoginPage.jsx       # User login page
│   ├── RegisterPage.jsx    # User registration page
│   └── index.js           # Export barrel
│
├── Admin/                   # Admin-specific components
│   ├── AdminHome.jsx       # Admin dashboard
│   ├── AdminLoanApproval.jsx # Loan approval management
│   └── index.js           # Export barrel
│
├── User/                    # User dashboard components
│   ├── Home.jsx            # Main user dashboard
│   ├── QuickActions.jsx    # Quick action buttons
│   ├── TransactionsSection.jsx # Transaction history
│   ├── UserSummaryCard.jsx # User info summary
│   └── index.js           # Export barrel
│
├── Modals/                  # All modal/popup components
│   ├── AccountPendingModal.jsx
│   ├── AccountVerificationModal.jsx
│   ├── ApplyLoanModal.jsx
│   ├── NotificationModal.jsx
│   ├── PayBillsComingSoon.jsx
│   └── index.js           # Export barrel
│
├── Layout/                  # Navigation and layout components
│   ├── Header.jsx          # Top header with notifications
│   ├── Navbar.jsx          # Navigation bar
│   └── index.js           # Export barrel
│
├── Pages/                   # Main page components
│   ├── WelcomePage.jsx     # Landing/welcome page
│   └── index.js           # Export barrel
│
└── index.js                # Main export barrel
```

## 🚀 Usage

### Option 1: Import from specific folders
```javascript
import LoginPage from './Components/Auth/LoginPage';
import AdminHome from './Components/Admin/AdminHome';
import { Header, Navbar } from './Components/Layout';
```

### Option 2: Import from main barrel (recommended)
```javascript
import { 
  LoginPage, 
  AdminHome, 
  Header, 
  Navbar,
  ApplyLoanModal 
} from './Components';
```

## 📋 Component Categories

### Auth Components
- **LoginPage**: Handles user authentication with email/password and OTP
- **RegisterPage**: User registration for new accounts

### Admin Components  
- **AdminHome**: Admin dashboard with overview
- **AdminLoanApproval**: Manage pending loan applications

### User Components
- **Home**: Main user dashboard with all sections
- **QuickActions**: Deposit, transfer, bills, loan buttons
- **TransactionsSection**: Display recent transactions
- **UserSummaryCard**: User account summary and balance

### Modal Components
- **AccountPendingModal**: Shows when account verification is pending
- **AccountVerificationModal**: Document upload for account verification
- **ApplyLoanModal**: Loan application form with EMI calculator
- **NotificationModal**: Display notifications
- **PayBillsComingSoon**: Coming soon modal for bill payments

### Layout Components
- **Header**: Top header with notifications and logout
- **Navbar**: Main navigation bar

### Page Components
- **WelcomePage**: Landing page with login/register options

## 🔧 Benefits

1. **Better Organization**: Related components are grouped together
2. **Easy Navigation**: Clear folder structure makes finding components simple
3. **Scalability**: Easy to add new components in appropriate categories
4. **Clean Imports**: Barrel exports make imports cleaner
5. **Maintainability**: Easier to maintain and refactor related components
