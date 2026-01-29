import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getActiveLoan, getEmiDetails, repayLoan } from '../../services/loans';
import { invalidateCache } from '../../utils/apiClient';
import { FaCreditCard, FaCalendarAlt, FaMoneyBillWave, FaExclamationTriangle, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const LoanRepaymentCard = ({ user, onPaymentSuccess }) => {
  const [activeLoan, setActiveLoan] = useState(null);
  const [emiDetails, setEmiDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [repayAmount, setRepayAmount] = useState('');
  const [repaying, setRepaying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);

  useEffect(() => {
    loadActiveLoan();
  }, [user.accountNumber, user.token]);

  const loadActiveLoan = async () => {
    if (!user.accountNumber || !user.token) return;
    setLoading(true);
    try {
      const loan = await getActiveLoan({ token: user.token, accountNumber: user.accountNumber });
      if (loan && loan.id) {
        setActiveLoan(loan);
        const emi = await getEmiDetails({ token: user.token, loanId: loan.id });
        setEmiDetails(emi);
      } else {
        setActiveLoan(null);
      }
    } catch (e) {
      console.error('Failed to load active loan', e);
      setActiveLoan(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRepay = async () => {
    if (!repayAmount || parseFloat(repayAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    setRepaying(true);
    setError('');
    setMessage('');
    try {
      const paidAmount = parseFloat(repayAmount);
      const result = await repayLoan({
        token: user.token,
        loanId: activeLoan.id,
        amount: paidAmount
      });
      
      // Store payment details for success modal
      setPaymentDetails({
        amount: paidAmount,
        loanId: activeLoan.id,
        message: typeof result === 'string' ? result : 'Payment successful!',
        timestamp: new Date().toLocaleString()
      });
      setShowSuccessModal(true);
      setRepayAmount('');
      
      // Invalidate caches and reload
      invalidateCache('/api/user');
      invalidateCache('/api/account');
      
      // Reload loan details
      loadActiveLoan();
      
      // Notify parent to refresh user data (balance)
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (e) {
      setError(e.message || 'Payment failed');
    } finally {
      setRepaying(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl shadow-md border border-slate-200/60 bg-white/80 dark:bg-slate-800/80 p-6 animate-pulse">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
    );
  }

  if (!activeLoan) {
    return null; // No active loan, don't show the card
  }

  const isEmiDueSoon = emiDetails?.nextEmiDate && 
    new Date(emiDetails.nextEmiDate) <= new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl shadow-md border border-slate-200/60 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <FaCreditCard className="text-indigo-500" />
          Active Loan
        </h3>
        {isEmiDueSoon && (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
            <FaExclamationTriangle />
            EMI Due Soon
          </span>
        )}
      </div>

      {/* Loan Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/60 dark:bg-slate-700/40 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Loan Amount</p>
          <p className="text-lg font-bold text-slate-800 dark:text-white">
            ₹{Number(activeLoan.amount).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white/60 dark:bg-slate-700/40 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Monthly EMI</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            ₹{emiDetails?.emiAmount ? Number(emiDetails.emiAmount).toLocaleString('en-IN') : '-'}
          </p>
        </div>
        <div className="bg-white/60 dark:bg-slate-700/40 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">EMIs Paid</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {emiDetails?.emisPaid || 0} / {emiDetails?.totalEmis || activeLoan.tenureInMonths}
          </p>
        </div>
        <div className="bg-white/60 dark:bg-slate-700/40 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Outstanding</p>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
            ₹{emiDetails?.totalOutstanding ? Number(emiDetails.totalOutstanding).toLocaleString('en-IN') : '-'}
          </p>
        </div>
      </div>

      {/* Next EMI Date */}
      {emiDetails?.nextEmiDate && (
        <div className={`flex items-center gap-2 mb-4 px-4 py-2 rounded-lg ${isEmiDueSoon ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-slate-700/40'}`}>
          <FaCalendarAlt className={isEmiDueSoon ? 'text-amber-600' : 'text-slate-500'} />
          <span className={`text-sm font-medium ${isEmiDueSoon ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'}`}>
            Next EMI Due: {new Date(emiDetails.nextEmiDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      )}

      {/* Repayment Form */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
          <input
            type="number"
            placeholder="Enter amount to repay"
            value={repayAmount}
            onChange={(e) => setRepayAmount(e.target.value)}
            className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            min="0"
          />
        </div>
        <button
          onClick={handleRepay}
          disabled={repaying || !repayAmount}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          <FaMoneyBillWave />
          {repaying ? 'Processing...' : 'Pay Now'}
        </button>
      </div>

      {/* Quick pay buttons */}
      {emiDetails?.emiAmount && (
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={() => setRepayAmount(String(emiDetails.emiAmount))}
            className="px-3 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            1 EMI (₹{Number(emiDetails.emiAmount).toLocaleString('en-IN')})
          </button>
          <button
            onClick={() => setRepayAmount(String(emiDetails.emiAmount * 2))}
            className="px-3 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            2 EMIs
          </button>
          {emiDetails.totalOutstanding && (
            <button
              onClick={() => setRepayAmount(String(emiDetails.totalOutstanding))}
              className="px-3 py-1 text-xs rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800/40 transition-colors"
            >
              Pay All (₹{Number(emiDetails.totalOutstanding).toLocaleString('en-IN')})
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      {message && !showSuccessModal && (
        <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && paymentDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSuccessModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <FaCheckCircle className="text-4xl text-emerald-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  Payment Successful!
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {paymentDetails.message}
                </p>
                
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6 text-left">
                  <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-600">
                    <span className="text-slate-500 dark:text-slate-400">Amount Paid</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      ₹{paymentDetails.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-600">
                    <span className="text-slate-500 dark:text-slate-400">Loan ID</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      #{paymentDetails.loanId}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500 dark:text-slate-400">Time</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {paymentDetails.timestamp}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LoanRepaymentCard;
