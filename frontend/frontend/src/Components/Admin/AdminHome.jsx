import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../Layout/Navbar";
import Header from "../Layout/Header";
import NotificationModal from "../Modals/NotificationModal";
import NotificationToast from "../Modals/NotificationToast";
import InterestRateUpdateForm from "./InterestRateUpdateForm";
import DepositRequestsAdmin from "./DepositRequestsAdmin";
import { getAnalytics, getRealtimeAnalytics } from "../../services/admin";
import { fetchNotifications as fetchNotificationsApi, markNotificationSeen } from "../../services/notifications";
import { listDeposits, depositAction, updateAccountStatus } from "../../services/accounts";
import { invalidateCache } from "../../utils/apiClient";
import { updateLoanStatus } from "../../services/loans";
import { fetchAuditLogs } from "../../services/audit";
import { useTheme } from '../../context/ThemeContext.jsx';
import { useNotifications } from "../../hooks/useNotifications";
import { toDisplayString } from "../../utils";

const AdminHome = () => {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const navigate = useNavigate();
  const { theme } = useTheme();

  const formatNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toLocaleString() : '0';
  };

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

  // State management
  const [notifications, setNotifications] = useState([]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [depositRefreshTrigger, setDepositRefreshTrigger] = useState(0);
  
  // Admin dashboard data
  const [dashboardData, setDashboardData] = useState({
    pendingDeposits: [],
    totalDeposits: 0,
    analytics: {
      totalUsers: 0,
      activeUsers: 0,
      totalAccounts: 0,
      verifiedAccounts: 0,
      pendingAccounts: 0,
      suspendedAccounts: 0,
      totalLoans: 0,
      activeLoans: 0,
      pendingLoans: 0,
      rejectedLoans: 0,
      totalDepositRequests: 0,
      pendingDeposits: 0,
      approvedDeposits: 0,
      rejectedDeposits: 0,
      totalApprovedDepositAmount: 0,
      totalSuccessfulTransactionVolume: 0,
      generatedAt: null
    }
  });
  
  const [activeTab, setActiveTab] = useState("overview");

  // Audit logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [auditFilters, setAuditFilters] = useState({ actorEmail: "", action: "", targetType: "" });

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

  // Fetch admin dashboard data
  const fetchDashboardData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      // Fetch pending deposits
      try {
        const depositsData = await listDeposits({ token: user.token, status: 'PENDING' });
        setDashboardData(prev => ({
          ...prev,
            pendingDeposits: depositsData,
            totalDeposits: depositsData.length
        }));
      } catch (e) {
        if (e.status === 401 || e.status === 403) {
          handleApiError(e, { status: e.status });
          return;
        }
        console.error('Failed to load deposit requests', e);
      }

      // Fetch analytics data (when endpoints become available)
      await fetchAnalyticsData();
      
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // Fetch analytics data using new admin dashboard endpoints
  const fetchAnalyticsData = async () => {
    const analytics = await getAnalytics({ token: user.token });
    setDashboardData(prev => ({ ...prev, analytics }));
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchNotifications();
    fetchDashboardData(true);
  }, [user.email, user.token]);

  useEffect(() => {
    if (activeTab !== "audit") return;
    loadAuditLogs();
  }, [activeTab]);

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    setAuditError("");
    try {
      const data = await fetchAuditLogs({ token: user.token, ...auditFilters });
      setAuditLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      setAuditError(e?.message || "Failed to load audit logs");
    } finally {
      setAuditLoading(false);
    }
  };

  // Realtime analytics polling
  useEffect(() => {
    let interval;
    const start = async () => {
      interval = setInterval(async () => {
        const realtime = await getRealtimeAnalytics({ token: user.token });
        setDashboardData(prev => ({ ...prev, analytics: realtime }));
      }, 30000); // 30s
    };
    start();
    return () => interval && clearInterval(interval);
  }, [user.token]);

  // WebSocket notifications (simplified)
  useNotifications(user.email, user.token, {
    onNotification: (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnseenCount(prev => prev + 1);
      
      // Auto-refresh deposit requests when a deposit notification arrives
      if (notif.message && (notif.message.includes('deposit request') || notif.message.includes('deposit'))) {
        invalidateCache('/api/account/depositRequests');
        setDepositRefreshTrigger(prev => prev + 1);
      }
    }
  });

  // Mark notification as seen
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

  // Clear toast notification
  const clearToastNotification = (notifId) => {
    setNotifications(notifications =>
      notifications.map(n => n.id === notifId ? { ...n, toastShown: true } : n)
    );
  };

  // Handle deposit approval/rejection
  const handleDepositAction = async (depositId, action) => {
    const validDepositId = depositId ? Number(depositId) : null;
    if (!validDepositId) { setError('Invalid deposit ID'); return; }
    const result = await depositAction({ token: user.token, action, depositRequestId: validDepositId });
    if (result.success) {
      await fetchDashboardData(false); // Silent refresh
      setError('');
      // Deposit action completed successfully
    } else if (result.status === 401 || result.status === 403) {
      handleApiError(result.message, { status: result.status });
    } else {
      setError(result.message);
    }
  };

  // Logout handler
  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/");
  };

  // Quick stats cards
  const QuickStatsCard = ({ title, count, color, icon, onClick }) => (
    <motion.button
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur p-5 flex items-center gap-5 shadow-sm text-left"
    >
      <div className="relative w-14 h-14 rounded-xl flex items-center justify-center text-2xl" style={{ background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)` }}>
        <span>{icon}</span>
        <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `radial-gradient(circle at 30% 30%, ${color}33, transparent 70%)` }} />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</span>
        <span className="text-3xl font-bold leading-none mt-1" style={{ color }}>{count}</span>
      </div>
    </motion.button>
  );

  return (
    <div className={`min-h-screen w-full relative overflow-x-hidden pt-16 ${theme === 'dark' ? 'bg-slate-900' : ''}`} style={{ background: theme === 'dark' ? undefined : 'linear-gradient(135deg,#eef7ff 0%,#f5fdfa 100%)' }}>
      <Navbar onNotificationsClick={() => setShowNotifModal(true)} unseenCount={unseenCount} />
      <div className="max-w-7xl mx-auto px-4 py-10">
        <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Admin Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Welcome back, {user.name || user.username || 'Admin'} 👋</p>
          </div>
        </motion.div>
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {toDisplayString(error)}
          </div>
        )}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.05 }} className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 mb-10">
          <QuickStatsCard title="Pending Deposits" count={dashboardData.pendingDeposits.length} color="#f59e0b" icon="💰" onClick={() => setActiveTab('deposits')} />
          <QuickStatsCard title="Total Users" count={dashboardData.analytics.totalUsers} color="#3b82f6" icon="👥" onClick={() => setActiveTab('analytics')} />
          <QuickStatsCard title="Active Users" count={dashboardData.analytics.activeUsers} color="#10b981" icon="📈" onClick={() => setActiveTab('analytics')} />
          <QuickStatsCard title="Approved Deposit Amount" count={`₹${formatNumber(dashboardData.analytics.totalApprovedDepositAmount)}`} color="#8b5cf6" icon="💹" onClick={() => setActiveTab('analytics')} />
        </motion.div>

        {/* Analytics Overview Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid gap-5 mb-8 md:grid-cols-2 xl:grid-cols-3"
        >
          {/* Compact Snapshot (Accounts & Deposits) */}
          <div className="bg-white/90 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 shadow-lg shadow-slate-900/5 border border-slate-200/60 dark:border-slate-700/50">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">💰 Deposits</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Approved</span><span className="font-semibold text-emerald-600">{dashboardData.analytics.approvedDeposits}</span></div>
              <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Pending</span><span className="font-semibold text-amber-500">{dashboardData.analytics.pendingDeposits}</span></div>
              <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Rejected</span><span className="font-semibold text-rose-500">{dashboardData.analytics.rejectedDeposits}</span></div>
            </div>
          </div>
          <div className="bg-white/90 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 shadow-lg shadow-slate-900/5 border border-slate-200/60 dark:border-slate-700/50">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">📋 Loans</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Active</span><span className="font-semibold text-blue-600">{dashboardData.analytics.activeLoans}</span></div>
              <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Pending</span><span className="font-semibold text-amber-500">{dashboardData.analytics.pendingLoans}</span></div>
              <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Rejected</span><span className="font-semibold text-rose-500">{dashboardData.analytics.rejectedLoans}</span></div>
            </div>
          </div>
          <div className="bg-white/90 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 shadow-lg shadow-slate-900/5 border border-slate-200/60 dark:border-slate-700/50">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">👥 Accounts</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Verified</span><span className="font-semibold text-emerald-600">{dashboardData.analytics.verifiedAccounts}</span></div>
              <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Pending</span><span className="font-semibold text-amber-500">{dashboardData.analytics.pendingAccounts}</span></div>
              <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Suspended</span><span className="font-semibold text-rose-500">{dashboardData.analytics.suspendedAccounts}</span></div>
            </div>
          </div>

  </motion.div>

  {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/90 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-2 mb-6 flex gap-2 shadow-lg shadow-slate-900/5 border border-slate-200/60 dark:border-slate-700/50 overflow-x-auto"
        >
          {[
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "analytics", label: "Analytics", icon: "📈" },
            { id: "deposits", label: "Deposits", icon: "💰" },
            { id: "accounts", label: "Accounts", icon: "👤" },
            { id: "loans", label: "Loans", icon: "📋" },
            { id: "settings", label: "Settings", icon: "⚙️" }
          ].map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl transition-all whitespace-nowrap",
                  active
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow hover:shadow-md"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-700/40"
                ].join(" ")}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/90 dark:bg-slate-800/70 backdrop-blur-md rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-200/60 dark:border-slate-700/50 overflow-hidden"
        >
            {/* Analytics Tab */}
            {activeTab === "analytics" && (
              <div className="p-8">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                  <span>Analytics Dashboard</span>
                </h3>
                {/* Key Metrics Grid (aligned with backend analytics payload) */}
                <div className="grid gap-5 md:gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl p-5 border bg-gradient-to-br from-blue-50 to-white dark:from-blue-500/10 dark:to-slate-800 border-blue-200/40 dark:border-blue-500/30">
                    <div className="text-sm text-slate-500 dark:text-slate-300 mb-1">Total Accounts</div>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">{dashboardData.analytics.totalAccounts}</div>
                    <div className="text-xs text-blue-600 dark:text-blue-300 mt-1 font-medium">Users: {dashboardData.analytics.totalUsers}</div>
                  </div>
                  <div className="rounded-xl p-5 border bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-slate-800 border-emerald-200/50 dark:border-emerald-500/30">
                    <div className="text-sm text-slate-500 dark:text-slate-300 mb-1">Approved Deposit Amount</div>
                    <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">₹{formatNumber(dashboardData.analytics.totalApprovedDepositAmount)}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Approved Deposits: {dashboardData.analytics.approvedDeposits}</div>
                  </div>
                  <div className="rounded-xl p-5 border bg-gradient-to-br from-amber-50 to-white dark:from-amber-500/10 dark:to-slate-800 border-amber-200/50 dark:border-amber-500/30">
                    <div className="text-sm text-slate-500 dark:text-slate-300 mb-1">Successful Tx Volume</div>
                    <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">₹{formatNumber(dashboardData.analytics.totalSuccessfulTransactionVolume)}</div>
                    <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">Active Users: {dashboardData.analytics.activeUsers}</div>
                  </div>
                </div>
                {/* Account Status Breakdown */}
                <div className="grid gap-5 md:grid-cols-3 mb-8">
                  <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700"><div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Verified Accounts</div><div className="text-2xl font-semibold text-emerald-600">{dashboardData.analytics.verifiedAccounts}</div></div>
                  <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700"><div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Pending Accounts</div><div className="text-2xl font-semibold text-amber-500">{dashboardData.analytics.pendingAccounts}</div></div>
                  <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700"><div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Suspended Accounts</div><div className="text-2xl font-semibold text-rose-500">{dashboardData.analytics.suspendedAccounts}</div></div>
                </div>
                {/* Loan & Deposit Request Breakdown */}
                <div className="grid gap-6 md:grid-cols-2 mb-8">
                  <div className="rounded-2xl p-6 bg-white/90 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60">
                    <h5 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">Loan Requests</h5>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-semibold">{dashboardData.analytics.totalLoans}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Active</span><span className="font-semibold text-blue-600 dark:text-blue-400">{dashboardData.analytics.activeLoans}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Pending</span><span className="font-semibold text-amber-500">{dashboardData.analytics.pendingLoans}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Rejected</span><span className="font-semibold text-rose-500">{dashboardData.analytics.rejectedLoans}</span></div>
                    </div>
                  </div>
                  <div className="rounded-2xl p-6 bg-white/90 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60">
                    <h5 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">Deposit Requests</h5>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-semibold">{dashboardData.analytics.totalDepositRequests}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Pending</span><span className="font-semibold text-amber-500">{dashboardData.analytics.pendingDeposits}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Approved</span><span className="font-semibold text-emerald-600">{dashboardData.analytics.approvedDeposits}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Rejected</span><span className="font-semibold text-rose-500">{dashboardData.analytics.rejectedDeposits}</span></div>
                    </div>
                  </div>
                </div>
                {/* Timestamp */}
                {dashboardData.analytics.generatedAt && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">Last Updated: {new Date(dashboardData.analytics.generatedAt).toLocaleString()}</div>
                )}
                {/* Monthly Performance */}
                <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 p-6 mb-6 border border-slate-200/60 dark:border-slate-700/60">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-5">Monthly Performance</h4>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {(dashboardData.analytics.monthlyStats || []).map(month => (
                      <div key={month.month} className="bg-white dark:bg-slate-800/70 rounded-xl p-4 text-center border border-slate-200/70 dark:border-slate-700/60">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 tracking-tight">{month.month}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Deposits: ₹{(month.deposits / 1000).toFixed(0)}K</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Loans: ₹{(month.loans / 1000).toFixed(0)}K</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Users: +{month.users}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* API Notice */}
                <div className="mt-6 p-4 rounded-xl text-center border border-blue-300/40 bg-blue-50/70 dark:bg-blue-500/10 dark:border-blue-500/40">
                  <div className="text-sm font-medium text-blue-600 dark:text-blue-400">📊 Live Analytics</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Values reflect backend payload; updates every 30s.</div>
                </div>
              </div>
            )}
            {/* Deposits Tab */}
            {activeTab === "deposits" && (
              <div className="p-8">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">Pending Deposit Requests</h3>
                {initialLoading ? (
                  <div className="py-16 text-center text-slate-500 dark:text-slate-400">Loading deposit requests...</div>
                ) : dashboardData.pendingDeposits.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 dark:text-slate-400">No pending deposit requests</div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {dashboardData.pendingDeposits.map((deposit, index) => (
                      <motion.div
                        key={deposit.id || deposit.depositRequestId || deposit.requestId || `deposit-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl p-5 bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/70 shadow-sm"
                      >
                        <div>
                          <div className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight mb-1">Account: {deposit.accountNumber}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Amount: ₹{formatNumber(deposit.amount)}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Reference: {deposit.referenceNumber || deposit.refferenceNumber}</div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleDepositAction(deposit.id || deposit.depositRequestId || deposit.requestId, "approve")}
                            className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow hover:shadow-md transition"
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => handleDepositAction(deposit.id || deposit.depositRequestId || deposit.requestId, "reject")}
                            className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow hover:shadow-md transition"
                          >
                            ❌ Reject
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
                {/* Admin Deposit Requests Table (integrated component) */}
                <div className="mt-8">
                  <DepositRequestsAdmin token={user.token} refreshTrigger={depositRefreshTrigger} />
                </div>
              </div>
            )}
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="p-8">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">System Overview</h3>
                <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
                  <div className="rounded-2xl p-6 text-center bg-gradient-to-br from-blue-50 to-white dark:from-blue-500/10 dark:to-slate-800 border border-blue-200/40 dark:border-blue-500/40">
                    <div className="text-4xl mb-2">📊</div>
                    <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">Dashboard</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Active & Running</div>
                  </div>
                  <div className="rounded-2xl p-6 text-center bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-slate-800 border border-emerald-200/40 dark:border-emerald-500/40">
                    <div className="text-4xl mb-2">🔔</div>
                    <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">Notifications</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{unseenCount} Unread</div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'accounts' && (
              <div className="p-8 space-y-10">
                <AccountVerificationPanel token={user.token} />
              </div>
            )}
            {activeTab === 'loans' && (
              <div className="p-8 space-y-10">
                <LoanStatusPanel token={user.token} />
              </div>
            )}
            {activeTab === 'audit' && (
              <div className="p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-slate-500 block mb-1">Actor Email</label>
                    <input
                      value={auditFilters.actorEmail}
                      onChange={(e) => setAuditFilters(prev => ({ ...prev, actorEmail: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300/70 dark:border-slate-600 bg-white/70 dark:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="admin@bankwise.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Action</label>
                    <input
                      value={auditFilters.action}
                      onChange={(e) => setAuditFilters(prev => ({ ...prev, action: e.target.value }))}
                      className="px-4 py-2.5 rounded-xl border border-slate-300/70 dark:border-slate-600 bg-white/70 dark:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="TRANSFER"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Target Type</label>
                    <input
                      value={auditFilters.targetType}
                      onChange={(e) => setAuditFilters(prev => ({ ...prev, targetType: e.target.value }))}
                      className="px-4 py-2.5 rounded-xl border border-slate-300/70 dark:border-slate-600 bg-white/70 dark:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="ACCOUNT"
                    />
                  </div>
                  <button
                    onClick={loadAuditLogs}
                    className="px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow hover:shadow-md disabled:opacity-60"
                    disabled={auditLoading}
                  >
                    {auditLoading ? 'Loading...' : 'Search'}
                  </button>
                </div>

                {auditError && <div className="text-sm text-rose-600">{auditError}</div>}

                <div className="overflow-x-auto rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300">
                        <th className="p-3 text-left">Time</th>
                        <th className="p-3 text-left">Action</th>
                        <th className="p-3 text-left">Actor</th>
                        <th className="p-3 text-left">Target</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-left">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="p-3 text-xs text-slate-500">{log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}</td>
                          <td className="p-3 font-semibold text-slate-700 dark:text-slate-100">{log.action}</td>
                          <td className="p-3">{log.actorEmail}</td>
                          <td className="p-3 text-xs">{log.targetType}:{log.targetId}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-700">
                              {log.status}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-slate-500 max-w-xs truncate" title={log.details}>{log.details}</td>
                        </tr>
                      ))}
                      {!auditLogs.length && !auditLoading && (
                        <tr><td colSpan={6} className="p-6 text-center text-slate-500">No audit logs found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="p-8">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                  ⚙️ Admin Settings
                </h3>
                
                {/* Interest Rate Management */}
                <div className="mb-8">
                  <h4 className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-4">Interest Rate Management</h4>
                  <InterestRateUpdateForm token={user.token} />
                </div>

                {/* Service Health */}
                <div className="mb-8">
                  <h4 className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-4">Service Health</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">API Server</span>
                      </div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2">Status: Healthy</p>
                    </div>
                    <div className="rounded-xl p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">Database</span>
                      </div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2">PostgreSQL Connected</p>
                    </div>
                    <div className="rounded-xl p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="font-medium text-amber-700 dark:text-amber-400">Email Service</span>
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">SMTP (Gmail)</p>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="mb-8">
                  <h4 className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-4">System Overview</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                      <div className="text-sm text-slate-500 mb-2">Current Limits</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Min Transfer:</span><span className="font-medium">₹1</span></div>
                        <div className="flex justify-between"><span>Max Transfer:</span><span className="font-medium">₹50,000</span></div>
                        <div className="flex justify-between"><span>Daily Limit:</span><span className="font-medium">₹1,00,000</span></div>
                        <div className="flex justify-between"><span>Min Loan:</span><span className="font-medium">₹1,000</span></div>
                        <div className="flex justify-between"><span>Max Loan:</span><span className="font-medium">₹5,00,000</span></div>
                      </div>
                    </div>
                    <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                      <div className="text-sm text-slate-500 mb-2">Environment</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Mode:</span><span className="font-medium text-emerald-600">Production</span></div>
                        <div className="flex justify-between"><span>API Version:</span><span className="font-medium">v1.0</span></div>
                        <div className="flex justify-between"><span>Backend:</span><span className="font-medium">Render</span></div>
                        <div className="flex justify-between"><span>Frontend:</span><span className="font-medium">Netlify</span></div>
                        <div className="flex justify-between"><span>Database:</span><span className="font-medium">Neon PostgreSQL</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
    </motion.div>
      </div>

      {/* Modals */}
      <NotificationModal 
        show={showNotifModal} 
        notifications={notifications} 
        markAsSeen={markAsSeen} 
        setShowNotifModal={setShowNotifModal} 
      />
      <NotificationToast 
        notifications={notifications} 
        onMarkAsSeen={markAsSeen} 
        onClear={clearToastNotification} 
      />
    </div>
  );
};

export default AdminHome;

// --- Inline Panels (could be split later) ---

const AccountVerificationPanel = ({ token }) => {
  const [accountNumber, setAccountNumber] = React.useState('');
  const [status, setStatus] = React.useState('VERIFIED');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState({});

  const submit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    if (!accountNumber) {
      setFieldErrors({ accountNumber: 'Account number is required' });
      return;
    }
    setLoading(true); setMessage('');
    try {
      const res = await updateAccountStatus({ token, accountNumber, status });
      setMessage(res === true || res === 'true' ? 'Status updated successfully' : (res?.message || 'Updated'));
    } catch (err) {
      setMessage(`Failed: ${err.status || ''} ${err.message || err}`);
    } finally { setLoading(false); }
  };

  return (
    <div className="rounded-3xl border border-slate-200/60 dark:border-slate-700/60 bg-white/90 dark:bg-slate-800/70 p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">👤 Account Verification</h3>
      <form onSubmit={submit} className="flex flex-col md:flex-row gap-4 items-start md:items-end">
        <div className="flex-1 w-full">
          <label className="text-xs font-medium text-slate-500 block mb-1">Account Number</label>
          <input value={accountNumber} onChange={e=>{ setAccountNumber(e.target.value); setFieldErrors(prev => ({ ...prev, accountNumber: undefined })); }} required className={`w-full px-4 py-2.5 rounded-xl border ${fieldErrors.accountNumber ? 'border-red-500' : 'border-slate-300/70 dark:border-slate-600'} bg-white/70 dark:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`} placeholder="Enter account number" />
          {fieldErrors.accountNumber && <div className="text-red-500 text-xs mt-1">{fieldErrors.accountNumber}</div>}
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-300/70 dark:border-slate-600 bg-white/70 dark:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
            {['VERIFIED','PENDING','SUSPENDED'].map(s=> <option key={s}>{s}</option>)}
          </select>
        </div>
        <button disabled={loading} className="px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow hover:shadow-md disabled:opacity-60">{loading? 'Updating...' : 'Update'}</button>
      </form>
      {message && <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">{toDisplayString(message)}</div>}
      <p className="mt-4 text-[11px] text-slate-500 dark:text-slate-400">PATCH /api/account/updateAccountStatus/{'{accountNumber}'} body: {"{\"status\":\"VERIFIED|PENDING|SUSPENDED\"}"}</p>
    </div>
  );
};

const LoanStatusPanel = ({ token }) => {
  const [loanId, setLoanId] = React.useState('');
  const [status, setStatus] = React.useState('APPROVED');
  const [remark, setRemark] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState({});

  const submit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    if (!loanId || Number.isNaN(Number(loanId))) {
      setFieldErrors({ loanId: 'Valid loan ID is required' });
      return;
    }
    setLoading(true); setMessage('');
    try {
      const res = await updateLoanStatus({
        token,
        loanId: Number(loanId),
        status,
        adminRemark: remark
      });
      setMessage(typeof res === 'string' ? res : (res?.message || 'Status updated'));
    } catch (err) {
      setMessage(`Failed: ${err.status || ''} ${err.message || err}`);
    } finally { setLoading(false); }
  };

  return (
    <div className="rounded-3xl border border-slate-200/60 dark:border-slate-700/60 bg-white/90 dark:bg-slate-800/70 p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">📋 Loan Status Management</h3>
      <form onSubmit={submit} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Loan ID</label>
          <input value={loanId} onChange={e=>{ setLoanId(e.target.value); setFieldErrors(prev => ({ ...prev, loanId: undefined })); }} required className={`w-full px-4 py-2.5 rounded-xl border ${fieldErrors.loanId ? 'border-red-500' : 'border-slate-300/70 dark:border-slate-600'} bg-white/70 dark:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`} placeholder="Enter loan ID" />
          {fieldErrors.loanId && <div className="text-red-500 text-xs mt-1">{fieldErrors.loanId}</div>}
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300/70 dark:border-slate-600 bg-white/70 dark:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
            {['APPROVED','REJECTED','PENDING'].map(s=> <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="text-xs font-medium text-slate-500 block mb-1">Admin Remark</label>
          <input value={remark} onChange={e=>setRemark(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300/70 dark:border-slate-600 bg-white/70 dark:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Optional remark" />
        </div>
        <div className="lg:col-span-1">
          <button disabled={loading} className="w-full px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow hover:shadow-md disabled:opacity-60">{loading? 'Updating...' : 'Update Status'}</button>
        </div>
      </form>
      {message && <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">{toDisplayString(message)}</div>}
      <p className="mt-4 text-[11px] text-slate-500 dark:text-slate-400">POST /api/loan/status?loanId=..&status=APPROVED|REJECTED|PENDING&adminRemark=..</p>
    </div>
  );
};
