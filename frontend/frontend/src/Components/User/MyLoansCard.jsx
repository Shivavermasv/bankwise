import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyLoans } from '../../services/loans';
import { 
  FaFileAlt, 
  FaClock, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaLock, 
  FaChartLine,
  FaCalendarAlt,
  FaPercentage,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';

const MyLoansCard = ({ user }) => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedLoan, setExpandedLoan] = useState(null);

  useEffect(() => {
    loadLoans();
  }, [user.accountNumber, user.token]);

  const loadLoans = async () => {
    if (!user.accountNumber || !user.token) return;
    setLoading(true);
    try {
      const data = await getMyLoans({ token: user.token, accountNumber: user.accountNumber });
      setLoans(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load loans', e);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'PENDING':
        return {
          icon: FaClock,
          color: 'text-amber-500',
          bg: 'bg-amber-100 dark:bg-amber-900/30',
          border: 'border-amber-200 dark:border-amber-800',
          label: 'Pending Approval'
        };
      case 'APPROVED':
        return {
          icon: FaCheckCircle,
          color: 'text-emerald-500',
          bg: 'bg-emerald-100 dark:bg-emerald-900/30',
          border: 'border-emerald-200 dark:border-emerald-800',
          label: 'Approved'
        };
      case 'REJECTED':
        return {
          icon: FaTimesCircle,
          color: 'text-rose-500',
          bg: 'bg-rose-100 dark:bg-rose-900/30',
          border: 'border-rose-200 dark:border-rose-800',
          label: 'Rejected'
        };
      case 'CLOSED':
        return {
          icon: FaLock,
          color: 'text-blue-500',
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          border: 'border-blue-200 dark:border-blue-800',
          label: 'Closed (Fully Paid)'
        };
      default:
        return {
          icon: FaFileAlt,
          color: 'text-slate-500',
          bg: 'bg-slate-100 dark:bg-slate-700',
          border: 'border-slate-200 dark:border-slate-600',
          label: status
        };
    }
  };

  const getPaymentStatusConfig = (paymentStatus, paidPercentage) => {
    switch (paymentStatus) {
      case 'FULLY_PAID':
        return {
          color: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-500',
          label: '✓ Fully Paid'
        };
      case 'IN_PROGRESS':
        return {
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-500',
          label: `${paidPercentage.toFixed(1)}% Paid`
        };
      case 'NOT_STARTED':
        return {
          color: 'text-slate-500 dark:text-slate-400',
          bg: 'bg-slate-400',
          label: 'Payment Not Started'
        };
      default:
        return {
          color: 'text-slate-500',
          bg: 'bg-slate-400',
          label: 'Unknown'
        };
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="rounded-2xl shadow-md border border-slate-200/60 bg-white/80 dark:bg-slate-800/80 dark:border-slate-700 p-6">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (loans.length === 0) {
    return null; // No loans, don't show the card
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl shadow-md border border-slate-200/60 bg-white/80 dark:bg-slate-800/80 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <FaFileAlt className="text-indigo-500" />
          My Loan Applications
        </h3>
        <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium">
          {loans.length} {loans.length === 1 ? 'Loan' : 'Loans'}
        </span>
      </div>

      <div className="space-y-4">
        {loans.map((loan) => {
          const statusConfig = getStatusConfig(loan.status);
          const StatusIcon = statusConfig.icon;
          const isExpanded = expandedLoan === loan.id;
          const paymentConfig = loan.status === 'APPROVED' || loan.status === 'CLOSED' 
            ? getPaymentStatusConfig(loan.paymentStatus, loan.paidPercentage || 0)
            : null;

          return (
            <motion.div
              key={loan.id}
              layout
              className={`rounded-xl border ${statusConfig.border} overflow-hidden`}
            >
              {/* Loan Header */}
              <button
                onClick={() => setExpandedLoan(isExpanded ? null : loan.id)}
                className={`w-full p-4 ${statusConfig.bg} flex items-center justify-between hover:opacity-90 transition-opacity`}
              >
                <div className="flex items-center gap-3">
                  <StatusIcon className={`text-xl ${statusConfig.color}`} />
                  <div className="text-left">
                    <p className="font-semibold text-slate-800 dark:text-white">
                      Loan #{loan.id}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Applied: {formatDate(loan.requestDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-slate-800 dark:text-white">
                      {formatCurrency(loan.amount)}
                    </p>
                    <span className={`text-xs font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  {isExpanded ? (
                    <FaChevronUp className="text-slate-400" />
                  ) : (
                    <FaChevronDown className="text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                      {/* Loan Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                          <FaChartLine className="mx-auto text-indigo-500 mb-1" />
                          <p className="text-xs text-slate-500 dark:text-slate-400">Interest Rate</p>
                          <p className="font-semibold text-slate-800 dark:text-white">{loan.interestRate}% p.a.</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                          <FaCalendarAlt className="mx-auto text-blue-500 mb-1" />
                          <p className="text-xs text-slate-500 dark:text-slate-400">Tenure</p>
                          <p className="font-semibold text-slate-800 dark:text-white">{loan.tenureInMonths} months</p>
                        </div>
                        {loan.emiAmount && (
                          <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                            <FaPercentage className="mx-auto text-emerald-500 mb-1" />
                            <p className="text-xs text-slate-500 dark:text-slate-400">Monthly EMI</p>
                            <p className="font-semibold text-slate-800 dark:text-white">{formatCurrency(loan.emiAmount)}</p>
                          </div>
                        )}
                      </div>

                      {/* Approval/Maturity Dates */}
                      {loan.approvalDate && (
                        <div className="flex flex-wrap gap-4 text-sm mb-4">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Approved: </span>
                            <span className="font-medium text-slate-800 dark:text-white">{formatDate(loan.approvalDate)}</span>
                          </div>
                          {loan.maturityDate && (
                            <div>
                              <span className="text-slate-500 dark:text-slate-400">Maturity: </span>
                              <span className="font-medium text-slate-800 dark:text-white">{formatDate(loan.maturityDate)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Payment Progress (for approved/closed loans) */}
                      {paymentConfig && (loan.status === 'APPROVED' || loan.status === 'CLOSED') && (
                        <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Payment Progress
                            </span>
                            <span className={`text-sm font-semibold ${paymentConfig.color}`}>
                              {paymentConfig.label}
                            </span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden mb-3">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${loan.paidPercentage || 0}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                              className={`h-full ${paymentConfig.bg} rounded-full`}
                            />
                          </div>

                          {/* Payment Stats */}
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">EMIs Paid</p>
                              <p className="font-semibold text-slate-800 dark:text-white">
                                {loan.emisPaid || 0} / {loan.totalEmis || loan.tenureInMonths}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Amount Paid</p>
                              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(loan.totalAmountPaid || 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Outstanding</p>
                              <p className="font-semibold text-rose-600 dark:text-rose-400">
                                {formatCurrency(loan.totalOutstanding || 0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Reason */}
                      {loan.reason && (
                        <div className="mt-4 text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Reason: </span>
                          <span className="text-slate-700 dark:text-slate-300">{loan.reason}</span>
                        </div>
                      )}

                      {/* Admin Remark (for rejected loans) */}
                      {loan.adminRemark && loan.status === 'REJECTED' && (
                        <div className="mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                          <p className="text-sm text-rose-700 dark:text-rose-300">
                            <strong>Admin Remark:</strong> {loan.adminRemark}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default MyLoansCard;
