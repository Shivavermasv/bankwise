import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { emiApi } from '../../utils/bankingApi';
import {
  FiCalendar, FiDollarSign, FiClock, FiCheckCircle, FiAlertCircle,
  FiToggleLeft, FiToggleRight, FiRefreshCw, FiChevronDown, FiChevronUp,
  FiCreditCard, FiTrendingUp, FiSettings
} from 'react-icons/fi';
import Navbar from '../Layout/Navbar';
import { useTheme } from '../../context/ThemeContext';

/**
 * EMI Management Component
 * Displays active loans, EMI schedules, and allows manual payments and auto-debit settings
 */
const EmiManagement = ({ embedded = false }) => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const loadLoans = useCallback(async () => {
    try {
      setLoading(true);
      const data = await emiApi.getAllLoans(token);
      setLoans(data?.loans || []);
    } catch (err) {
      setError(err.message || 'Failed to load loans');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const loadSchedule = async (loanId) => {
    try {
      setScheduleLoading(true);
      const data = await emiApi.getSchedule(token, loanId);
      setSchedule(data?.schedule || []);
    } catch (err) {
      setError(err.message || 'Failed to load EMI schedule');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleSelectLoan = (loan) => {
    if (selectedLoan?.loanId === loan.loanId) {
      setSelectedLoan(null);
      setSchedule(null);
    } else {
      setSelectedLoan(loan);
      loadSchedule(loan.loanId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            EMI Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track and manage your loan EMIs
          </p>
        </div>
        <button
          onClick={loadLoans}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2">
          <FiAlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* No Loans State */}
      {loans.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <FiCreditCard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Active Loans
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You don't have any active loans with EMI schedules
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              icon={FiCreditCard}
              label="Total Active Loans"
              value={loans.length}
              color="blue"
            />
            <SummaryCard
              icon={FiDollarSign}
              label="Total Monthly EMI"
              value={`₹${loans.reduce((sum, l) => sum + (l.emiAmount || 0), 0).toLocaleString()}`}
              color="purple"
            />
            <SummaryCard
              icon={FiCalendar}
              label="Upcoming EMIs"
              value={loans.filter(l => !l.isFullyPaid).length}
              color="orange"
            />
          </div>

          {/* Loan List */}
          <div className="space-y-4">
            {loans.map((loan) => (
              <LoanCard
                key={loan.loanId}
                loan={loan}
                isSelected={selectedLoan?.loanId === loan.loanId}
                onSelect={() => handleSelectLoan(loan)}
                schedule={selectedLoan?.loanId === loan.loanId ? schedule : null}
                scheduleLoading={selectedLoan?.loanId === loan.loanId && scheduleLoading}
                token={token}
                onUpdate={loadLoans}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Summary Card
const SummaryCard = ({ icon: Icon, label, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
      <div className={`p-3 rounded-xl ${colorClasses[color]} w-fit`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-3">
        {value}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {label}
      </p>
    </div>
  );
};

// Loan Card
const LoanCard = ({ loan, isSelected, onSelect, schedule, scheduleLoading, token, onUpdate }) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [emiDay, setEmiDay] = useState(15);

  const handlePayEmi = async () => {
    try {
      setActionLoading(true);
      await emiApi.payManually(token, loan.loanId);
      onUpdate();
    } catch (err) {
      alert(err.message || 'Failed to pay EMI');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAutoDebit = async () => {
    try {
      setActionLoading(true);
      await emiApi.toggleAutoDebit(token, loan.loanId, !loan.autoDebitEnabled);
      onUpdate();
    } catch (err) {
      alert(err.message || 'Failed to toggle auto-debit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateEmiDay = async () => {
    try {
      setActionLoading(true);
      await emiApi.updateEmiDay(token, loan.loanId, emiDay);
      onUpdate();
      setShowSettings(false);
    } catch (err) {
      alert(err.message || 'Failed to update EMI day');
    } finally {
      setActionLoading(false);
    }
  };

  const daysUntilNextEmi = loan.nextEmiDate 
    ? Math.ceil((new Date(loan.nextEmiDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const progressPercentage = loan.totalEmis 
    ? ((loan.totalEmis - loan.remainingEmis) / loan.totalEmis) * 100 
    : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Loan Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        onClick={onSelect}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              loan.isFullyPaid 
                ? 'bg-green-100 dark:bg-green-900/30' 
                : 'bg-blue-100 dark:bg-blue-900/30'
            }`}>
              {loan.isFullyPaid ? (
                <FiCheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <FiCreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Loan #{loan.loanId}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Principal: ₹{loan.principalAmount?.toLocaleString()}
              </p>
              {!loan.isFullyPaid && loan.nextEmiDate && (
                <div className="flex items-center gap-2 mt-1">
                  <FiClock className="w-4 h-4 text-gray-400" />
                  <span className={`text-sm ${
                    daysUntilNextEmi && daysUntilNextEmi <= 3 
                      ? 'text-red-600 dark:text-red-400 font-medium' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    Next EMI: {new Date(loan.nextEmiDate).toLocaleDateString()}
                    {daysUntilNextEmi !== null && (
                      <span className="ml-1">
                        ({daysUntilNextEmi <= 0 ? 'Due Today!' : `${daysUntilNextEmi} days`})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                ₹{loan.emiAmount?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">per month</p>
            </div>
            {isSelected ? (
              <FiChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <FiChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>{progressPercentage.toFixed(0)}% completed</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                loan.isFullyPaid ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>{loan.totalEmis - loan.remainingEmis} EMIs paid</span>
            <span>{loan.remainingEmis} remaining</span>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isSelected && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Actions */}
          <div className="p-4 flex flex-wrap items-center gap-3">
            {!loan.isFullyPaid && (
              <>
                <button
                  onClick={handlePayEmi}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <FiDollarSign className="w-4 h-4" />
                  Pay EMI Now
                </button>

                <button
                  onClick={handleToggleAutoDebit}
                  disabled={actionLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    loan.autoDebitEnabled
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {loan.autoDebitEnabled ? (
                    <>
                      <FiToggleRight className="w-5 h-5" />
                      Auto-Debit On
                    </>
                  ) : (
                    <>
                      <FiToggleLeft className="w-5 h-5" />
                      Enable Auto-Debit
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <FiSettings className="w-4 h-4" />
                  Settings
                </button>
              </>
            )}

            {loan.isFullyPaid && (
              <span className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg">
                <FiCheckCircle className="w-5 h-5" />
                Fully Paid! 🎉
              </span>
            )}
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="px-4 pb-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  EMI Day of Month
                </label>
                <div className="flex items-center gap-3">
                  <select
                    value={emiDay}
                    onChange={(e) => setEmiDay(Number(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        {day}{['st', 'nd', 'rd'][day - 1] || 'th'} of every month
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleUpdateEmiDay}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EMI Schedule */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              EMI Schedule
            </h4>
            {scheduleLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : schedule && schedule.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Due Date</th>
                      <th className="pb-2 font-medium">EMI Amount</th>
                      <th className="pb-2 font-medium">Principal</th>
                      <th className="pb-2 font-medium">Interest</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {schedule.slice(0, 12).map((emi, index) => (
                      <tr key={index}>
                        <td className="py-2 text-gray-900 dark:text-white">{emi.emiNumber || index + 1}</td>
                        <td className="py-2 text-gray-900 dark:text-white">
                          {new Date(emi.dueDate).toLocaleDateString()}
                        </td>
                        <td className="py-2 text-gray-900 dark:text-white">
                          ₹{emi.amount?.toLocaleString()}
                        </td>
                        <td className="py-2 text-gray-600 dark:text-gray-400">
                          ₹{emi.principal?.toLocaleString()}
                        </td>
                        <td className="py-2 text-gray-600 dark:text-gray-400">
                          ₹{emi.interest?.toLocaleString()}
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            emi.status === 'PAID' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : emi.status === 'OVERDUE'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {emi.status || 'PENDING'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {schedule.length > 12 && (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
                    Showing first 12 EMIs of {schedule.length} total
                  </p>
                )}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-6">
                No EMI schedule available
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // If embedded, just return the content
  if (embedded) {
    return content;
  }

  // Otherwise, wrap with page layout
  return (
    <div className={`min-h-screen pt-16 px-4 pb-10 ${theme === 'dark' ? 'bg-slate-900' : 'bg-[linear-gradient(135deg,#f0fdfa_0%,#e0e7ff_100%)]'}`}>
      <Navbar />
      <div className="max-w-4xl mx-auto pt-6">
        {content}
      </div>
    </div>
  );
};

export default EmiManagement;
