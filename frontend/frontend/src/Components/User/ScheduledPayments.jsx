import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { scheduledPaymentApi, beneficiaryApi } from '../../utils/bankingApi';
import { 
  FiCalendar, FiClock, FiPlus, FiPlay, FiPause, FiX, 
  FiEdit2, FiRepeat, FiDollarSign, FiUser, FiAlertCircle,
  FiCheck, FiChevronDown
} from 'react-icons/fi';
import Navbar from '../Layout/Navbar';
import { useTheme } from '../../context/ThemeContext';

const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' }
];

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  PAUSED: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  COMPLETED: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
};

const ScheduledPayments = ({ embedded = false }) => {
  const { token, user, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [payments, setPayments] = useState([]);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'active' | 'upcoming'

  const loadPayments = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [allData, upcomingData] = await Promise.all([
        scheduledPaymentApi.getAll(token),
        scheduledPaymentApi.getUpcoming(token, 7)
      ]);
      setPayments(allData || []);
      setUpcomingPayments(upcomingData || []);
    } catch (err) {
      setError(err.message || 'Failed to load scheduled payments');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && token) {
      loadPayments();
    }
  }, [loadPayments, authLoading, token]);

  const handlePause = async (id) => {
    try {
      await scheduledPaymentApi.pause(token, id);
      loadPayments();
    } catch (err) {
      setError(err.message || 'Failed to pause payment');
    }
  };

  const handleResume = async (id) => {
    try {
      await scheduledPaymentApi.resume(token, id);
      loadPayments();
    } catch (err) {
      setError(err.message || 'Failed to resume payment');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this scheduled payment?')) return;
    try {
      await scheduledPaymentApi.cancel(token, id);
      loadPayments();
    } catch (err) {
      setError(err.message || 'Failed to cancel payment');
    }
  };

  const getDisplayPayments = () => {
    switch (activeTab) {
      case 'active':
        return payments.filter(p => p.status === 'ACTIVE');
      case 'upcoming':
        return upcomingPayments;
      default:
        return payments;
    }
  };

  const displayPayments = getDisplayPayments();

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
            Scheduled Payments
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Set up recurring payments and never miss a bill
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          Schedule New
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2">
          <FiAlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'all', label: 'All Payments', count: payments.length },
          { id: 'active', label: 'Active', count: payments.filter(p => p.status === 'ACTIVE').length },
          { id: 'upcoming', label: 'Due Soon', count: upcomingPayments.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
              activeTab === tab.id 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Upcoming Alert */}
      {activeTab === 'all' && upcomingPayments.length > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <FiClock className="w-5 h-5" />
            <span className="font-medium">{upcomingPayments.length} payments due in the next 7 days</span>
          </div>
        </div>
      )}

      {/* Payments List */}
      {displayPayments.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <FiCalendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Scheduled Payments
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Set up recurring payments for bills and regular transfers
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Schedule Your First Payment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {displayPayments.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              onPause={() => handlePause(payment.id)}
              onResume={() => handleResume(payment.id)}
              onCancel={() => handleCancel(payment.id)}
              onEdit={() => setEditingPayment(payment)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPayment) && (
        <SchedulePaymentModal
          payment={editingPayment}
          token={token}
          user={user}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPayment(null);
          }}
          onSuccess={() => {
            loadPayments();
            setShowCreateModal(false);
            setEditingPayment(null);
          }}
        />
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

// Payment Card Component
const PaymentCard = ({ payment, onPause, onResume, onCancel, onEdit }) => {
  const isActive = payment.status === 'ACTIVE';
  const isPaused = payment.status === 'PAUSED';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <FiRepeat className={`w-6 h-6 ${
                isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
              }`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {payment.description || 'Scheduled Payment'}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <FiUser className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  To: {payment.beneficiaryName || payment.toAccountNumber}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <FiCalendar className="w-4 h-4" />
                  {FREQUENCY_OPTIONS.find(f => f.value === payment.frequency)?.label || payment.frequency}
                </span>
                <span className="flex items-center gap-1">
                  <FiClock className="w-4 h-4" />
                  Next: {payment.nextPaymentDate 
                    ? new Date(payment.nextPaymentDate).toLocaleDateString() 
                    : 'Not set'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              ₹{payment.amount?.toLocaleString() || 0}
            </p>
            <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${STATUS_COLORS[payment.status] || STATUS_COLORS.ACTIVE}`}>
              {payment.status}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {isActive ? (
            <button
              onClick={onPause}
              className="flex items-center gap-2 px-3 py-1.5 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors text-sm"
            >
              <FiPause className="w-4 h-4" />
              Pause
            </button>
          ) : isPaused ? (
            <button
              onClick={onResume}
              className="flex items-center gap-2 px-3 py-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors text-sm"
            >
              <FiPlay className="w-4 h-4" />
              Resume
            </button>
          ) : null}
          
          {(isActive || isPaused) && (
            <>
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
              >
                <FiEdit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={onCancel}
                className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm ml-auto"
              >
                <FiX className="w-4 h-4" />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Schedule Payment Modal
const SchedulePaymentModal = ({ payment, token, user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    toAccountNumber: payment?.toAccountNumber || '',
    beneficiaryName: payment?.beneficiaryName || '',
    amount: payment?.amount || '',
    frequency: payment?.frequency || 'MONTHLY',
    startDate: payment?.startDate ? payment.startDate.split('T')[0] : '',
    endDate: payment?.endDate ? payment.endDate.split('T')[0] : '',
    description: payment?.description || ''
  });
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [showBeneficiaryDropdown, setShowBeneficiaryDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load beneficiaries for quick selection
    beneficiaryApi.getAll(token).then(data => {
      setBeneficiaries(data || []);
    }).catch(console.error);
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Build the request with fromAccountId
      const requestData = {
        fromAccountId: Number(user?.id || user?.accountId),
        toAccountNumber: formData.toAccountNumber,
        beneficiaryName: formData.beneficiaryName || 'Beneficiary',
        amount: Number(formData.amount),
        frequency: formData.frequency.toUpperCase(),
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        description: formData.description,
        maxExecutions: null
      };

      if (!requestData.fromAccountId) {
        throw new Error('Account ID not found. Please refresh the page.');
      }

      if (payment) {
        // Note: Update endpoint doesn't exist - cancel and recreate instead
        await scheduledPaymentApi.cancel(token, payment.id);
        await scheduledPaymentApi.createTransfer(token, requestData);
      } else {
        await scheduledPaymentApi.createTransfer(token, requestData);
      }
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to save scheduled payment');
    } finally {
      setLoading(false);
    }
  };

  const selectBeneficiary = (beneficiary) => {
    setFormData({ 
      ...formData, 
      toAccountNumber: beneficiary.beneficiaryAccountNumber || beneficiary.accountNumber,
      beneficiaryName: beneficiary.beneficiaryName || beneficiary.nickname,
      description: formData.description || `Payment to ${beneficiary.nickname || beneficiary.beneficiaryName}`
    });
    setShowBeneficiaryDropdown(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {payment ? 'Edit Scheduled Payment' : 'Schedule New Payment'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Recipient Account */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Recipient Account
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.toAccountNumber}
                onChange={(e) => setFormData({ ...formData, toAccountNumber: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Enter account number"
                required
              />
              {beneficiaries.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowBeneficiaryDropdown(!showBeneficiaryDropdown)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <FiChevronDown className="w-5 h-5 text-gray-500" />
                </button>
              )}
            </div>
            
            {/* Beneficiary Dropdown */}
            {showBeneficiaryDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {beneficiaries.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => selectBeneficiary(b)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
                  >
                    <FiUser className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {b.nickname || b.beneficiaryName}
                      </p>
                      <p className="text-xs text-gray-500">{b.accountNumber}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount (₹)
            </label>
            <div className="relative">
              <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount"
                min={1}
                required
              />
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Frequency
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              {FREQUENCY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          {/* End Date (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date (Optional)
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              min={formData.startDate || new Date().toISOString().split('T')[0]}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave empty for ongoing payments
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Rent payment, Electricity bill"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-center gap-2">
              <FiAlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                'Saving...'
              ) : (
                <>
                  <FiCheck className="w-4 h-4" />
                  {payment ? 'Update' : 'Schedule'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduledPayments;
