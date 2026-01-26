import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Layout/Navbar";
import NotificationModal from "../Modals/NotificationModal";
import NotificationToast from "../Modals/NotificationToast";
import UserSummaryCard from "./UserSummaryCard";
import QuickActions from "./QuickActions";
import KycUploadForm from './KycUploadForm';
import DepositRequestForm from './DepositRequestForm';
import TransactionsSection from "./TransactionsSection";
import LoanRepaymentCard from "./LoanRepaymentCard";
import MyLoansCard from "./MyLoansCard";
import AnalyticsWidget from "./AnalyticsWidget";
import AccountPendingModal from "../Modals/AccountPendingModal";
import AccountVerificationModal from "../Modals/AccountVerificationModal";
import { fetchNotifications as fetchNotificationsApi, markNotificationSeen, getUserDetailsOwned } from "../../services";
import { fetchRecentTransactions } from "../../services/transactions";
import { useTheme } from '../../context/ThemeContext.jsx';
import { useNotifications } from "../../hooks/useNotifications";
import { FiRefreshCw } from 'react-icons/fi';

// Simple reusable skeleton block
const Skeleton = ({ className, style }) => (
  <div className={`animate-pulse rounded-md bg-slate-200 ${className || ''}`} style={style} />
);

const Home = () => {
  const [user, setUser] = useState(JSON.parse(sessionStorage.getItem("user") || "{}"));
  const [notifications, setNotifications] = useState([]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastLoginFlag, setLastLoginFlag] = useState(false);
  const [recentTxLoading, setRecentTxLoading] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isInitialLoad = useRef(true);

  // API call error handler
  const handleApiError = (error, response) => {
    if (response && (response.status === 401 || response.status === 403)) {
      // Token expired or unauthorized
      sessionStorage.clear();
      navigate("/login", { replace: true });
      return;
    }
    
    console.error("API Error:", error);
  };

  const [ownershipError, setOwnershipError] = useState('');
  // Fetch user details from API with ownership enforcement feedback
  // showLoader = true only when user clicks refresh button
  const fetchUserDetails = async (showLoader = false) => {
    if (!user.accountNumber || !user.token) return;
    if (showLoader) setRefreshing(true);
    
    try {
      const result = await getUserDetailsOwned({ token: user.token, accountNumber: user.accountNumber });
      if (result.__error) {
        if (result.ownershipDenied) setOwnershipError(result.message);
      } else {
        const mergedUserData = { ...result, token: result.token || user.token };
        setUser(mergedUserData);
        sessionStorage.setItem('user', JSON.stringify(mergedUserData));
        setOwnershipError('');
      }
    } catch (e) {
      console.error('Failed to fetch user details:', e);
    } finally {
      if (showLoader) setRefreshing(false);
      isInitialLoad.current = false;
    }
  };

  // Manual refresh function for the refresh button (also refresh recent transactions)
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchUserDetails(false), // Don't use internal loader, we're using refresh button state
        fetchNotifications(),
        loadRecentTransactions(false)
      ]);
    } finally {
      setRefreshing(false);
    }
  };
  const [showVerify, setShowVerify] = useState(false);

  // Load recent transactions (preview only top 5)
  // showLoader only for manual refresh
  const loadRecentTransactions = async (showLoader = false) => {
    if (!user.accountNumber || !user.token) return;
    if (showLoader) setRecentTxLoading(true);
    try {
      const data = await fetchRecentTransactions({
        token: user.token,
        accountNumber: user.accountNumber,
        days: 7,
        size: 5
      });
      const items = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
      setRecentTransactions(items.slice(0, 5));
    } catch (e) {
      console.error('Failed loading recent transactions preview', e);
    } finally {
      if (showLoader) setRecentTxLoading(false);
    }
  };

  // Fetch notifications function
  const fetchNotifications = async () => {
    if (!user.email || !user.token) return;
    
    try {
      const data = await fetchNotificationsApi({ token: user.token, email: user.email });
      setNotifications(data || []);
      setUnseenCount((data || []).filter(n => !n.seen).length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  // Fetch notifications on component mount and when returning to home
  useEffect(() => {
    fetchNotifications();
    // Check if this is just after login (flag can be set from login page)
    const justLoggedIn = sessionStorage.getItem("justLoggedIn");
    if (justLoggedIn) {
      sessionStorage.removeItem("justLoggedIn");
      setLastLoginFlag(true);
    } else {
      fetchUserDetails(false); // No loading indicator for background fetch
    }
    // Initial load shows skeleton for transactions
    if (isInitialLoad.current) {
      setRecentTxLoading(true);
    }
    loadRecentTransactions(isInitialLoad.current);
  }, [user.email, user.token]);

  // Auto-refresh user details every 2 minutes (optional)
  useEffect(() => {
    if (lastLoginFlag) return; // Skip auto-refresh if just logged in
    
    const interval = setInterval(() => {
      fetchUserDetails(false);
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [user.accountNumber, user.token, lastLoginFlag]);

  // Fetch notifications when user returns to the page (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user.email, user.token]);

  // WebSocket notifications (simplified)
  useNotifications(user.email, user.token, {
    onNotification: (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnseenCount(prev => prev + 1);
    }
  });

  // Mark notification as seen - Fixed API call based on Swagger
  const markAsSeen = async (notifId) => {
    try {
      await markNotificationSeen({ token: user.token, id: notifId });
      setNotifications(notifications =>
        notifications.map(n => n.id === notifId ? { ...n, seen: true } : n)
      );
      setUnseenCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as seen:", error);
    }
  };

  // Clear toast notification (mark as shown in toast)
  const clearToastNotification = (notifId) => {
    setNotifications(notifications =>
      notifications.map(n => n.id === notifId ? { ...n, toastShown: true } : n)
    );
  };


  if (user.verificationStatus && user.verificationStatus.toLowerCase() === "pending") {
    return (
      <>
        <Navbar />
        <div style={{ height: 64 }} />
        <AccountPendingModal onVerify={() => setShowVerify(true)} />
        {showVerify && <AccountVerificationModal user={user} onClose={() => setShowVerify(false)} onSuccess={() => window.location.reload()} />}
      </>
    );
  }
  return (
  <div className={`min-h-screen w-full pt-16 ${theme === 'dark' ? 'bg-slate-900' : ''} relative overflow-x-hidden`}
     style={{ background: theme === 'dark' ? undefined : 'linear-gradient(135deg,#eef7ff 0%,#f5fdfa 100%)' }}>
    <Navbar onNotificationsClick={() => setShowNotifModal(true)} unseenCount={unseenCount} />

      {/* Top bar */}
  <div className="mx-auto max-w-7xl px-4 flex items-center justify-end mb-4">
  <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`relative rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              refreshing 
                ? 'bg-slate-400 cursor-not-allowed text-white' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white hover:shadow-xl hover:scale-105'
            }`}
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>
      {ownershipError && (
        <div className="mx-auto max-w-7xl px-4 mb-4">
          <div className="rounded-lg border border-rose-300 bg-rose-50 text-rose-700 px-4 py-2 text-sm font-medium">
            {ownershipError}
          </div>
        </div>
      )}

      {/* Notification layers */}
      <NotificationModal show={showNotifModal} notifications={notifications} markAsSeen={markAsSeen} setShowNotifModal={setShowNotifModal} />
      <NotificationToast notifications={notifications} onMarkAsSeen={markAsSeen} onClear={clearToastNotification} />

      {/* Main content grid */}
      <main className="mx-auto max-w-7xl px-4 pb-24 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Summary and actions */}
        <div className="space-y-6 lg:col-span-2">
          <UserSummaryCard user={user} />
          <QuickActions user={user} />
          
          {/* My Loan Applications */}
          {user.verificationStatus === 'VERIFIED' && (
            <MyLoansCard user={user} />
          )}

          {/* Loan Repayment Card (shows if user has active loan) */}
          {user.verificationStatus === 'VERIFIED' && (
            <LoanRepaymentCard user={user} />
          )}

          {/* KYC submission (show if not VERIFIED) */}
          {(!user.verificationStatus || user.verificationStatus !== 'VERIFIED') && (
            <div className="rounded-2xl shadow-md border border-slate-200/60 bg-white/80 dark:bg-slate-800/80 p-6">
              <h3 className="text-lg font-semibold mb-4">Complete Your KYC</h3>
              <KycUploadForm accountNumber={user.accountNumber} token={user.token} onSuccess={fetchUserDetails} />
            </div>
          )}

          {/* Deposit request form (only show when verified) */}
          {user.verificationStatus === 'VERIFIED' && (
            <div className="rounded-2xl shadow-md border border-slate-200/60 bg-white/80 dark:bg-slate-800/80 p-6">
              <h3 className="text-lg font-semibold mb-4">Create Deposit Request</h3>
              <DepositRequestForm accountNumber={user.accountNumber} token={user.token} onCreated={handleRefresh} />
            </div>
          )}

          {/* Recent transactions preview card */}
          <div className={`rounded-2xl shadow-md border border-slate-200/60 backdrop-blur bg-white/80 dark:bg-slate-800/80 dark:border-slate-700 p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Recent Transactions</h3>
              <button onClick={() => navigate('/transactions')} className="text-sm text-blue-600 hover:underline font-medium">View all →</button>
            </div>
            {recentTxLoading && (
              <div className="space-y-3">
                {[...Array(5)].map((_,i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            )}
            {!recentTxLoading && recentTransactions.length === 0 && (
              <div className="text-sm text-slate-500 py-6 text-center">No transactions in last 7 days</div>
            )}
            {!recentTxLoading && recentTransactions.length > 0 && (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {recentTransactions.map(tx => {
                  const type = tx.transactionType || tx.type || '';
                  const timestamp = tx.time || tx.timestamp || tx.date || null;
                  const amountValue = Number(tx.amount) || 0;
                  const isCredit = type.toUpperCase() === 'CREDIT' || (amountValue > 0 && (type.toUpperCase() !== 'DEBIT'));
                  const positive = isCredit;
                  const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR'}).format(Math.abs(amountValue));
                  let dateLabel = '—';
                  try { if (timestamp) dateLabel = new Date(timestamp).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}); } catch { /* ignore */ }
                  return (
                    <li key={tx.id || `${type}-${timestamp}-${amountValue}`} className="py-3 flex items-center gap-4">
                      <div className={`w-10 h-10 flex items-center justify-center rounded-full text-lg font-semibold ${positive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300'}`}>{positive ? '↓' : '↑'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{tx.description || type || 'Transaction'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{dateLabel}</p>
                      </div>
                      <div className={`text-sm font-semibold ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{positive ? '+' : '-'}{amount}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Financial Insights Widget */}
          {user.verificationStatus === 'VERIFIED' && (
            <AnalyticsWidget token={user.token} />
          )}

          {/* (Removed duplicate legacy KYC / Deposit sections to avoid duplication) */}
        </div>

        {/* Right column: Detailed transactions section (reuse existing for now) */}
        <div className="lg:col-span-1">
          <TransactionsSection />
        </div>
      </main>

      {/* Decorative gradient blobs */}
      <div className="pointer-events-none select-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-tr from-blue-200 to-emerald-100 blur-3xl opacity-40" />
      <div className="pointer-events-none select-none absolute top-1/2 -right-40 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tr from-indigo-200 to-pink-100 blur-3xl opacity-30" />

      <style>{`@keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} } .dark .dark\\:text-slate-100 { color: #f1f5f9; }`}</style>
    </div>
  );
};

export default Home;