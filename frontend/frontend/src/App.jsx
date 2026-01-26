import React from "react";
import { Routes, Route } from "react-router-dom";
import {
  WelcomePage,
  LoginPage,
  RegisterPage,
  Home as HomePage,
  AdminHome,
  AdminLoanApproval,
  LoanRequestDetails,
  AccountApprovalDetails,
  DepositPage,
  TransactionHistoryPage,
  TransferPage,
  AccountsPage,
  PaymentsPage,
  SupportPage,
  LoanApplicationPage,
  DeveloperDashboard,
  ProfilePage,
  // New feature components
  BeneficiaryManagement,
  CardManagement,
  ScheduledPayments,
  UserAnalyticsDashboard,
  EmiManagement,
} from "./Components";
import GlobalLoadingOverlay from "./Components/Modals/GlobalLoadingOverlay";
import { AuthGuard, PublicRoute } from "./Components/AuthGuard";
import "./index.css";

const Protected = ({ roles, children }) => (
  <AuthGuard allowedRoles={roles}>{children}</AuthGuard>
);

const SmartHomeRoute = () => {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const role = (user.role || '').toUpperCase();
  if (role === 'DEVELOPER') return <Protected roles={['DEVELOPER']}><DeveloperDashboard /></Protected>;
  const isAdmin = role === "ADMIN" || role === "MANAGER";
  return <Protected>{isAdmin ? <AdminHome /> : <HomePage />}</Protected>;
};

const protectedRoutes = [
  {
    path: "/admin-home",
    roles: ["ADMIN", "MANAGER"],
    element: <AdminHome />,
  },
  {
    path: "/user-home",
    roles: ["USER", "CUSTOMER"],
    element: <HomePage />,
  },
  {
    path: "/loan-approval",
    roles: ["ADMIN", "MANAGER"],
    element: <AdminLoanApproval />,
  },
  {
    path: "/loan-approval/:loanId",
    roles: ["ADMIN", "MANAGER"],
    element: <LoanRequestDetails />,
  },
  {
    path: "/deposit",
    roles: ["USER", "CUSTOMER", "ADMIN", "MANAGER"],
    element: <DepositPage />,
  },
  {
    path: "/transactions",
    roles: ["USER", "CUSTOMER", "ADMIN", "MANAGER"],
    element: <TransactionHistoryPage />,
  },
  {
    path: "/accounts",
    roles: ["ADMIN", "MANAGER"],
    element: <AccountsPage />,
  },
  {
    path: "/accounts/:accountNumber",
    roles: ["ADMIN", "MANAGER"],
    element: <AccountApprovalDetails />,
  },
  {
    path: "/payments",
    roles: ["USER", "CUSTOMER"],
    element: <PaymentsPage />,
  },
  {
    path: "/support",
    roles: ["USER", "CUSTOMER", "ADMIN", "MANAGER"],
    element: <SupportPage />,
  },
  {
    path: "/transfer",
    roles: ["USER", "CUSTOMER"],
    element: <TransferPage />,
  },
  {
    path: "/loan-apply",
    roles: ["USER", "CUSTOMER"],
    element: <LoanApplicationPage />,
  },
  {
    path: "/developer",
    roles: ["DEVELOPER"],
    element: <DeveloperDashboard />,
  },
  {
    path: "/profile",
    roles: ["USER", "CUSTOMER", "ADMIN", "MANAGER", "DEVELOPER"],
    element: <ProfilePage />,
  },
  // New feature routes
  {
    path: "/beneficiaries",
    roles: ["USER", "CUSTOMER"],
    element: <BeneficiaryManagement />,
  },
  {
    path: "/cards",
    roles: ["USER", "CUSTOMER"],
    element: <CardManagement />,
  },
  {
    path: "/scheduled-payments",
    roles: ["USER", "CUSTOMER"],
    element: <ScheduledPayments />,
  },
  {
    path: "/analytics",
    roles: ["USER", "CUSTOMER"],
    element: <UserAnalyticsDashboard />,
  },
  {
    path: "/emi",
    roles: ["USER", "CUSTOMER"],
    element: <EmiManagement />,
  },
];

function App() {
  return (
    <>
      <GlobalLoadingOverlay />
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        <Route path="/home" element={<SmartHomeRoute />} />
        {protectedRoutes.map(({ path, roles, element }) => (
          <Route
            key={path}
            path={path}
            element={<Protected roles={roles}>{element}</Protected>}
          />
        ))}

        <Route path="*" element={<WelcomePage />} />
      </Routes>
    </>
  );
}

export default App;
