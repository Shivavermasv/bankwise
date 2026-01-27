import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { analyticsApi } from '../../utils/bankingApi';
import {
  FiTrendingUp, FiTrendingDown, FiPieChart, FiBarChart2,
  FiDollarSign, FiCreditCard, FiActivity, FiCalendar,
  FiArrowUpRight, FiArrowDownRight, FiRefreshCw
} from 'react-icons/fi';
import Navbar from '../Layout/Navbar';
import { useTheme } from '../../context/ThemeContext';

/**
 * User Analytics Dashboard
 * Displays spending patterns, repayment history, debt analysis with charts
 */
const UserAnalyticsDashboard = ({ embedded = false }) => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [dashboard, setDashboard] = useState(null);
  const [spending, setSpending] = useState(null);
  const [loans, setLoans] = useState(null);
  const [debts, setDebts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMonths, setSelectedMonths] = useState(6);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardData, spendingData, loansData, debtsData] = await Promise.all([
        analyticsApi.getDashboard(token),
        analyticsApi.getSpending(token, selectedMonths),
        analyticsApi.getLoans(token),
        analyticsApi.getDebts(token)
      ]);
      setDashboard(dashboardData);
      setSpending(spendingData);
      setLoans(loansData);
      setDebts(debtsData);
    } catch (err) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [token, selectedMonths]);

  useEffect(() => {
    loadAnalytics();
    console.log({ dashboard, spending, loans, debts });
  }, [dashboard, spending, loans, debts]);

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Show error inline, not full-screen
  const errorDisplay = error && !dashboard ? (
    <div className="p-6 bg-red-100 dark:bg-red-900/30 rounded-xl text-center mb-6">
      <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
      <button
        onClick={loadAnalytics}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
      >
        Retry
      </button>
    </div>
  ) : null;

  // Only show 'no data' message after all analytics data is loaded (not null)
  const allLoaded = dashboard !== null && spending !== null && loans !== null && debts !== null;
  const isAllEmpty =
    allLoaded &&
    Object.values(dashboard).every(
      v => v === 0 || v === null || (Array.isArray(v) && v.length === 0)
    ) &&
    Object.keys(spending).length === 0 &&
    Object.keys(loans).length === 0 &&
    Object.keys(debts).length === 0;

  if (allLoaded && isAllEmpty) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg font-semibold mb-2">No analytics data available yet</p>
          <p className="text-sm">Once you start using your account, your analytics will appear here.</p>
        </div>
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      {/* Error display inline */}
      {errorDisplay}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Financial Analytics
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track your spending, repayments, and financial health
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          disabled={loading}
          className={`flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${loading ? 'opacity-50' : ''}`}
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: FiPieChart },
          { id: 'spending', label: 'Spending', icon: FiBarChart2 },
          { id: 'loans', label: 'Loans & EMIs', icon: FiCreditCard },
          { id: 'debts', label: 'Debts', icon: FiDollarSign }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab dashboard={dashboard} />
      )}
      {activeTab === 'spending' && (
        <SpendingTab 
          spending={spending} 
          selectedMonths={selectedMonths}
          onMonthsChange={setSelectedMonths}
        />
      )}
      {activeTab === 'loans' && (
        <LoansTab loans={loans} />
      )}
      {activeTab === 'debts' && (
        <DebtsTab debts={debts} />
      )}
    </div>
  );
};

// Overview Tab
const OverviewTab = ({ dashboard }) => {
  const stats = [
    {
      label: 'Total Balance',
      value: `₹${(dashboard?.totalBalance || 0).toLocaleString()}`,
      icon: FiDollarSign,
      color: 'blue',
      change: dashboard?.balanceChange
    },
    {
      label: 'This Month Spending',
      value: `₹${(dashboard?.monthlySpending || 0).toLocaleString()}`,
      icon: FiTrendingDown,
      color: 'red',
      change: dashboard?.spendingChange
    },
    {
      label: 'This Month Income',
      value: `₹${(dashboard?.monthlyIncome || 0).toLocaleString()}`,
      icon: FiTrendingUp,
      color: 'green',
      change: dashboard?.incomeChange
    },
    {
      label: 'Active Loans',
      value: dashboard?.activeLoans || 0,
      icon: FiCreditCard,
      color: 'purple'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5"
          >
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl ${colorClasses[stat.color]}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              {stat.change !== undefined && (
                <span className={`flex items-center text-sm ${
                  stat.change >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {stat.change >= 0 ? <FiArrowUpRight className="w-4 h-4" /> : <FiArrowDownRight className="w-4 h-4" />}
                  {Math.abs(stat.change)}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-4">
              {stat.value}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Insights */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InsightCard
            title="Savings Rate"
            value={`${dashboard?.savingsRate || 0}%`}
            description="of your income saved this month"
            trend={dashboard?.savingsRate > 20 ? 'positive' : 'negative'}
          />
          <InsightCard
            title="Credit Score"
            value={dashboard?.creditScore || 'N/A'}
            description="Updated based on your payment history"
            trend={dashboard?.creditScore >= 700 ? 'positive' : dashboard?.creditScore >= 600 ? 'neutral' : 'negative'}
          />
          <InsightCard
            title="Top Spending Category"
            value={dashboard?.topCategory || 'N/A'}
            description={`₹${(dashboard?.topCategoryAmount || 0).toLocaleString()} this month`}
          />
          <InsightCard
            title="Upcoming EMIs"
            value={dashboard?.upcomingEmis || 0}
            description="Due in next 7 days"
          />
        </div>
      </div>
    </div>
  );
};

// Insight Card Component
const InsightCard = ({ title, value, description, trend }) => {
  const trendColors = {
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-yellow-600 dark:text-yellow-400'
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${trend ? trendColors[trend] : 'text-gray-900 dark:text-white'}`}>
        {value}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
    </div>
  );
};

// Spending Tab
const SpendingTab = ({ spending, selectedMonths, onMonthsChange }) => {
  const categories = spending?.categories || [];
  const monthlyData = spending?.monthly || [];
  const totalSpent = spending?.totalSpent || 0;

  // Simple bar chart using CSS
  const maxAmount = Math.max(...monthlyData.map(m => m.amount), 1);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">Show:</span>
        {[3, 6, 12].map(months => (
          <button
            key={months}
            onClick={() => onMonthsChange(months)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              selectedMonths === months
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {months} months
          </button>
        ))}
      </div>

      {/* Monthly Spending Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Monthly Spending Trend
        </h3>
        <div className="flex items-end justify-between gap-2 h-48">
          {monthlyData.map((month, index) => (
            <div
              key={index}
              className="flex-1 flex flex-col items-center"
            >
              <div className="w-full relative flex flex-col items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  ₹{month.amount >= 1000 ? `${(month.amount / 1000).toFixed(1)}k` : month.amount}
                </span>
                <div
                  className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600"
                  style={{ height: `${(month.amount / maxAmount) * 150}px` }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {month.month}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Spending by Category
        </h3>
        <div className="space-y-4">
          {categories.map((category, index) => {
            const percentage = totalSpent > 0 ? (category.amount / totalSpent) * 100 : 0;
            const colors = [
              'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
              'bg-orange-500', 'bg-pink-500', 'bg-yellow-500'
            ];
            return (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">{category.name}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ₹{category.amount.toLocaleString()} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors[index % colors.length]} rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {totalSpent > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between">
              <span className="font-medium text-gray-700 dark:text-gray-300">Total Spent</span>
              <span className="font-bold text-gray-900 dark:text-white">
                ₹{totalSpent.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Loans Tab
const LoansTab = ({ loans }) => {
  const activeLoans = loans?.activeLoans || [];
  const repaymentHistory = loans?.repaymentHistory || [];
  const totalOutstanding = loans?.totalOutstanding || 0;
  const totalPaid = loans?.totalPaid || 0;

  return (
    <div className="space-y-6">
      {/* Loan Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Loans</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {activeLoans.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Outstanding</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            ₹{totalOutstanding.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Repaid</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            ₹{totalPaid.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Active Loans */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Active Loans
          </h3>
        </div>
        {activeLoans.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No active loans
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {activeLoans.map((loan, index) => (
              <div key={index} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Loan #{loan.id}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ₹{loan.amount?.toLocaleString()} at {loan.interestRate}% p.a.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      ₹{loan.emiAmount?.toLocaleString()}/mo
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {loan.remainingEmis} EMIs left
                    </p>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ 
                      width: `${((loan.totalEmis - loan.remainingEmis) / loan.totalEmis) * 100}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {loan.totalEmis - loan.remainingEmis} of {loan.totalEmis} EMIs paid
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Repayments */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Repayments
          </h3>
        </div>
        {repaymentHistory.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No repayment history
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-64 overflow-y-auto">
            {repaymentHistory.slice(0, 10).map((payment, index) => (
              <div key={index} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Loan #{payment.loanId}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(payment.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-600 dark:text-green-400">
                    ₹{payment.amount?.toLocaleString()}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    payment.status === 'ON_TIME' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : payment.status === 'EARLY'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Debts Tab
const DebtsTab = ({ debts }) => {
  const totalDebt = debts?.totalDebt || 0;
  const debtList = debts?.debts || [];
  const debtToIncomeRatio = debts?.debtToIncomeRatio || 0;

  return (
    <div className="space-y-6">
      {/* Debt Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Outstanding Debt</p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
            ₹{totalDebt.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Debt-to-Income Ratio</p>
          <p className={`text-3xl font-bold mt-2 ${
            debtToIncomeRatio <= 30 
              ? 'text-green-600 dark:text-green-400' 
              : debtToIncomeRatio <= 50 
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {debtToIncomeRatio.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {debtToIncomeRatio <= 30 
              ? 'Healthy' 
              : debtToIncomeRatio <= 50 
              ? 'Moderate - consider reducing'
              : 'High - take action'}
          </p>
        </div>
      </div>

      {/* Debt Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Debt Breakdown
          </h3>
        </div>
        {debtList.length === 0 ? (
          <div className="p-8 text-center">
            <FiActivity className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              🎉 You're debt-free! Great job!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {debtList.map((debt, index) => (
              <div key={index} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {debt.type || 'Loan'}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {debt.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">
                      ₹{debt.outstanding?.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Due: {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debt Reduction Tips */}
      {totalDebt > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
            💡 Tips to Reduce Debt
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>• Pay more than the minimum EMI when possible</li>
            <li>• Consider the debt avalanche method - pay highest interest first</li>
            <li>• Set up auto-debit to avoid late payment penalties</li>
            <li>• Review your budget and cut unnecessary expenses</li>
          </ul>
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
      <div className="max-w-6xl mx-auto pt-6">
        {content}
      </div>
    </div>
  );
};

export default UserAnalyticsDashboard;
