import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../Layout';
import { useTheme } from '../../context/ThemeContext.jsx';
import { listAdminAccounts, updateAccountStatus } from '../../services/accounts';
import { toDisplayString } from '../../utils';

const AccountsPage = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const token = user.token;

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const loadAccounts = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await listAdminAccounts({ token, status: statusFilter, query });
      setAccounts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [statusFilter, token]);

  const summary = useMemo(() => {
    const total = accounts.length;
    const verified = accounts.filter(a => a.verificationStatus === 'VERIFIED').length;
    const pending = accounts.filter(a => a.verificationStatus === 'PENDING').length;
    const suspended = accounts.filter(a => a.verificationStatus === 'SUSPENDED').length;
    const disabled = accounts.filter(a => a.verificationStatus === 'DISABLED').length;
    const rejected = accounts.filter(a => a.verificationStatus === 'REJECTED').length;
    return { total, verified, pending, suspended, disabled, rejected };
  }, [accounts]);

  const handleAction = async (accountNumber, status) => {
    if (!accountNumber) return;
    setActionLoading(`${accountNumber}-${status}`);
    setMessage('');
    setError('');
    try {
      await updateAccountStatus({ token, accountNumber, status });
      setMessage(`Account ${accountNumber} updated to ${status}`);
      setAccounts(prev => prev.map(a => a.accountNumber === accountNumber ? { ...a, verificationStatus: status } : a));
    } catch (e) {
      setError(e?.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const canShowActions = (status) => {
    switch (status) {
      case 'PENDING':
        return ['VERIFIED', 'REJECTED'];
      case 'VERIFIED':
        return ['SUSPENDED', 'DISABLED'];
      case 'SUSPENDED':
        return ['VERIFIED', 'DISABLED'];
      default:
        return [];
    }
  };

  const formatBalance = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toLocaleString() : '0';
  };

  const statusBadge = (status) => {
    const base = 'px-2 py-1 rounded-full text-xs font-semibold';
    switch (status) {
      case 'VERIFIED':
        return `${base} bg-emerald-100 text-emerald-700`;
      case 'PENDING':
        return `${base} bg-amber-100 text-amber-700`;
      case 'SUSPENDED':
        return `${base} bg-rose-100 text-rose-700`;
      case 'DISABLED':
        return `${base} bg-slate-200 text-slate-700`;
      case 'REJECTED':
        return `${base} bg-red-100 text-red-700`;
      default:
        return `${base} bg-slate-100 text-slate-700`;
    }
  };

  return (
    <div className={`min-h-screen pt-16 px-4 pb-10 ${theme==='dark'?'bg-slate-900':'bg-[linear-gradient(135deg,#eef7ff_0%,#f5fdfa_100%)]'}`}>
      <Navbar />
      <div className="max-w-6xl mx-auto bg-white dark:bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-md p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Accounts</h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm">Manage accounts, verification, and suspension.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs">Total: {summary.total}</div>
            <div className="px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 text-xs">Verified: {summary.verified}</div>
            <div className="px-3 py-2 rounded-xl bg-amber-100 text-amber-700 text-xs">Pending: {summary.pending}</div>
            <div className="px-3 py-2 rounded-xl bg-rose-100 text-rose-700 text-xs">Suspended: {summary.suspended}</div>
            <div className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs">Disabled: {summary.disabled}</div>
            <div className="px-3 py-2 rounded-xl bg-red-100 text-red-700 text-xs">Rejected: {summary.rejected}</div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <input
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300/70 dark:border-slate-600 bg-white/70 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Search by account number, name, email, phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="px-4 py-2.5 rounded-xl border border-slate-300/70 dark:border-slate-600 bg-white/70 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {['ALL','PENDING','VERIFIED','REJECTED','SUSPENDED','DISABLED'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={loadAccounts}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white shadow hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>

        {message && <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">{toDisplayString(message)}</div>}
        {error && <div className="mb-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">{toDisplayString(error)}</div>}

        <div className="overflow-x-auto rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300">
                <th className="p-3 text-left">Account</th>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Balance</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {accounts.map((acc) => (
                <tr
                  key={acc.accountNumber}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                  onClick={() => navigate(`/accounts/${acc.accountNumber}`, { state: { account: acc } })}
                >
                  <td className="p-3 font-mono text-xs text-slate-800 dark:text-slate-200">{acc.accountNumber}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-200">{acc.userName || '-'}</td>
                  <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{acc.userEmail || '-'}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-200">₹{formatBalance(acc.balance)}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-200">{acc.accountType || '-'}</td>
                  <td className="p-3"><span className={statusBadge(acc.verificationStatus)}>{acc.verificationStatus || '-'}</span></td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap gap-2">
                      {canShowActions(acc.verificationStatus).map(next => (
                        <button
                          key={next}
                          onClick={() => handleAction(acc.accountNumber, next)}
                          disabled={actionLoading === `${acc.accountNumber}-${next}`}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold text-white shadow ${actionLoading === `${acc.accountNumber}-${next}` ? 'opacity-60 cursor-not-allowed' : ''} ${next === 'VERIFIED' ? 'bg-emerald-600 hover:bg-emerald-500' : next === 'REJECTED' ? 'bg-red-600 hover:bg-red-500' : next === 'SUSPENDED' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-slate-700 hover:bg-slate-600'}`}
                        >
                          {next}
                        </button>
                      ))}
                      {!canShowActions(acc.verificationStatus).length && (
                        <span className="text-xs text-slate-400">No actions</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && accounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">No accounts found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default AccountsPage;
