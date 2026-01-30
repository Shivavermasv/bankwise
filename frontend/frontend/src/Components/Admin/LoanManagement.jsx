import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiFileText, FiSearch, FiFilter, FiRefreshCw, FiChevronDown, FiChevronUp,
  FiUser, FiDollarSign, FiCalendar, FiCheck, FiX, FiClock, FiAlertCircle,
  FiEdit3, FiEye
} from 'react-icons/fi';
import Navbar from '../Layout/Navbar';
import { useTheme } from '../../context/ThemeContext';
import { listAllLoans, updateLoanStatus } from '../../services/loans';
import { getErrorMessage } from '../../utils/apiClient';

const STATUS_COLORS = {
  PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-300' },
  APPROVED: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-300' },
  ACTIVE: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-300' },
  REJECTED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-300' },
  CLOSED: { bg: 'bg-gray-100 dark:bg-gray-700/30', text: 'text-gray-700 dark:text-gray-400', border: 'border-gray-300' },
  DEFAULTED: { bg: 'bg-red-200 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-300', border: 'border-red-400' },
};

const STATUS_OPTIONS = ['ALL', 'PENDING', 'APPROVED', 'ACTIVE', 'REJECTED', 'CLOSED', 'DEFAULTED'];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Loan Details Modal
const LoanDetailsModal = ({ loan, onClose, onStatusUpdate }) => {
  const [newStatus, setNewStatus] = useState(loan.status);
  const [adminRemark, setAdminRemark] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const handleUpdateStatus = async () => {
    if (newStatus === loan.status) {
      setError('Please select a different status');
      return;
    }
    
    setUpdating(true);
    setError('');
    
    try {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      await updateLoanStatus({
        token: user.token,
        loanId: loan.id,
        status: newStatus,
        adminRemark: adminRemark || undefined
      });
      onStatusUpdate();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update status'));
    } finally {
      setUpdating(false);
    }
  };

  const statusColors = STATUS_COLORS[loan.status] || STATUS_COLORS.PENDING;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FiFileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Loan #{loan.id}
                </h2>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
                  {loan.status}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Loan Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <InfoCard icon={FiDollarSign} label="Amount" value={formatCurrency(loan.amount)} />
            <InfoCard icon={FiCalendar} label="Tenure" value={`${loan.tenureInMonths} months`} />
            <InfoCard icon={FiDollarSign} label="Interest Rate" value={`${loan.interestRate}%`} />
            <InfoCard icon={FiDollarSign} label="EMI Amount" value={formatCurrency(loan.emiAmount)} />
            <InfoCard icon={FiCalendar} label="Request Date" value={formatDate(loan.requestDate)} />
            <InfoCard icon={FiCalendar} label="Approval Date" value={formatDate(loan.approvalDate)} />
          </div>

          {/* Account Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Account Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Account Number:</span>
                <p className="font-medium text-gray-900 dark:text-white">{loan.accountNumber}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Account Holder:</span>
                <p className="font-medium text-gray-900 dark:text-white">{loan.accountHolderName || '-'}</p>
              </div>
            </div>
          </div>

          {/* EMI Progress */}
          {loan.status === 'APPROVED' || loan.status === 'ACTIVE' ? (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">EMI Progress</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">EMIs Paid</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {loan.emisPaid || 0} / {loan.totalEmis || loan.tenureInMonths}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${((loan.emisPaid || 0) / (loan.totalEmis || loan.tenureInMonths || 1)) * 100}%` }}
                  />
                </div>
                {loan.nextEmiDate && (
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-500 dark:text-gray-400">Next EMI Date</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatDate(loan.nextEmiDate)}</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Reason / Admin Remark */}
          {(loan.reason || loan.adminRemark) && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              {loan.reason && (
                <div className="mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Loan Purpose:</span>
                  <p className="text-gray-900 dark:text-white">{loan.reason}</p>
                </div>
              )}
              {loan.adminRemark && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Admin Remark:</span>
                  <p className="text-gray-900 dark:text-white">{loan.adminRemark}</p>
                </div>
              )}
            </div>
          )}

          {/* Update Status Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <FiEdit3 className="w-4 h-4" />
              Update Status
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.filter(s => s !== 'ALL').map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Admin Remark</label>
                <input
                  type="text"
                  value={adminRemark}
                  onChange={(e) => setAdminRemark(e.target.value)}
                  placeholder="Optional remark"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}

            <button
              onClick={handleUpdateStatus}
              disabled={updating || newStatus === loan.status}
              className="mt-4 w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {updating ? (
                <>
                  <FiRefreshCw className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <FiCheck className="w-4 h-4" />
                  Update Status
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const InfoCard = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
    <Icon className="w-5 h-5 text-gray-400" />
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

// Main Component
const LoanManagement = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'requestDate', direction: 'desc' });

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  const fetchLoans = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listAllLoans({ token: user.token, status: statusFilter });
      setLoans(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load loans'));
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [statusFilter]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredAndSortedLoans = useMemo(() => {
    let filtered = loans;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(loan => 
        loan.id?.toString().includes(term) ||
        loan.accountNumber?.toLowerCase().includes(term) ||
        loan.accountHolderName?.toLowerCase().includes(term) ||
        loan.status?.toLowerCase().includes(term)
      );
    }

    // Sort
    return [...filtered].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (sortConfig.key === 'amount' || sortConfig.key === 'interestRate') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      
      if (sortConfig.key === 'requestDate' || sortConfig.key === 'approvalDate') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [loans, searchTerm, sortConfig]);

  const stats = useMemo(() => {
    const counts = { total: loans.length };
    STATUS_OPTIONS.filter(s => s !== 'ALL').forEach(status => {
      counts[status] = loans.filter(l => l.status === status).length;
    });
    return counts;
  }, [loans]);

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />;
  };

  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Navbar />
      
      <div className="pt-20 px-4 sm:px-6 lg:px-8 pb-8 max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <FiFileText className="w-7 h-7 text-blue-600" />
                Loan Management
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                View and manage all loan applications
              </p>
            </div>
            <button
              onClick={fetchLoans}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {STATUS_OPTIONS.map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`p-3 rounded-xl transition-all ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-md'
                }`}
              >
                <p className="text-2xl font-bold">{status === 'ALL' ? stats.total : stats[status] || 0}</p>
                <p className="text-xs opacity-80">{status}</p>
              </button>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by loan ID, account number, or holder name..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-2">
              <FiAlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('id')}>
                      <div className="flex items-center gap-1">ID <SortIcon columnKey="id" /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('amount')}>
                      <div className="flex items-center gap-1">Amount <SortIcon columnKey="amount" /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tenure</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('interestRate')}>
                      <div className="flex items-center gap-1">Rate <SortIcon columnKey="interestRate" /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('requestDate')}>
                      <div className="flex items-center gap-1">Date <SortIcon columnKey="requestDate" /></div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                        <FiRefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                        Loading loans...
                      </td>
                    </tr>
                  ) : filteredAndSortedLoans.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                        <FiFileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        No loans found
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedLoans.map(loan => {
                      const statusColors = STATUS_COLORS[loan.status] || STATUS_COLORS.PENDING;
                      return (
                        <tr 
                          key={loan.id} 
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedLoan(loan)}
                        >
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">#{loan.id}</td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm">{loan.accountNumber}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{loan.accountHolderName}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{formatCurrency(loan.amount)}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{loan.tenureInMonths}M</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{loan.interestRate}%</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
                              {loan.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm">{formatDate(loan.requestDate)}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedLoan(loan); }}
                              className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                              title="View Details"
                            >
                              <FiEye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Loan Details Modal */}
      <AnimatePresence>
        {selectedLoan && (
          <LoanDetailsModal
            loan={selectedLoan}
            onClose={() => setSelectedLoan(null)}
            onStatusUpdate={fetchLoans}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoanManagement;
