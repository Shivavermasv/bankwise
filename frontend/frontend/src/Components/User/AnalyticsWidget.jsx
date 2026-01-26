import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '../../utils/bankingApi';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiCreditCard, FiArrowRight, FiActivity } from 'react-icons/fi';

/**
 * Compact Analytics Widget for Dashboard
 * Shows key financial metrics with links to full analytics
 */
const AnalyticsWidget = ({ token }) => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    
    try {
      // Don't show loading on refresh - use stale-while-revalidate approach
      const dashboard = await analyticsApi.getDashboard(token);
      setData(dashboard);
      setError(null);
    } catch (err) {
      // Only set error if we have no data yet
      if (!data) {
        setError('Unable to load analytics');
      }
      console.error('Analytics widget error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, data]);

  useEffect(() => {
    loadData();
    // Refresh every 5 minutes in background
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, [loadData]);

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '₹0';
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount));
  };

  const getHealthColor = (category) => {
    switch (category?.toUpperCase()) {
      case 'EXCELLENT': return 'text-green-500';
      case 'GOOD': return 'text-blue-500';
      case 'FAIR': return 'text-yellow-500';
      case 'POOR': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // Show skeleton while loading initially
  if (loading && !data) {
    return (
      <div className="rounded-2xl shadow-md border border-slate-200/60 backdrop-blur bg-white/80 dark:bg-slate-800/80 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 rounded-xl bg-slate-100 dark:bg-slate-700/50">
              <div className="h-4 w-16 bg-slate-200 dark:bg-slate-600 rounded mb-2 animate-pulse" />
              <div className="h-6 w-24 bg-slate-200 dark:bg-slate-600 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show error state (compact, not full-screen)
  if (error && !data) {
    return (
      <div className="rounded-2xl shadow-md border border-slate-200/60 backdrop-blur bg-white/80 dark:bg-slate-800/80 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Financial Insights</h3>
          <button 
            onClick={loadData}
            className="text-sm text-blue-600 hover:underline"
          >
            Retry
          </button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl shadow-md border border-slate-200/60 backdrop-blur bg-white/80 dark:bg-slate-800/80 dark:border-slate-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <FiActivity className="text-blue-500" />
          Financial Insights
        </h3>
        <button 
          onClick={() => navigate('/analytics')}
          className="text-sm text-blue-600 hover:underline font-medium flex items-center gap-1"
        >
          View Details <FiArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Monthly Spending */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-800/10 border border-rose-100 dark:border-rose-800/30">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-1">
            <FiTrendingDown className="w-4 h-4" />
            <span className="text-xs font-medium">Monthly Spending</span>
          </div>
          <p className="text-lg font-bold text-rose-700 dark:text-rose-300">
            {formatCurrency(data?.monthlySpending || 0)}
          </p>
        </div>

        {/* Monthly Income */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 border border-emerald-100 dark:border-emerald-800/30">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <FiTrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Monthly Income</span>
          </div>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
            {formatCurrency(data?.monthlyIncome || 0)}
          </p>
        </div>

        {/* Total Debt */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border border-amber-100 dark:border-amber-800/30">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
            <FiCreditCard className="w-4 h-4" />
            <span className="text-xs font-medium">Total Debt</span>
          </div>
          <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
            {formatCurrency(data?.totalDebt || 0)}
          </p>
        </div>

        {/* Financial Health */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-100 dark:border-blue-800/30">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <FiDollarSign className="w-4 h-4" />
            <span className="text-xs font-medium">Health Score</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {data?.healthScore || 0}
            </p>
            <span className={`text-xs font-medium ${getHealthColor(data?.healthCategory)}`}>
              {data?.healthCategory || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Insights (if available) */}
      {data?.insights && data.insights.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">💡 Quick Tip</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {data.insights[0]}
          </p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsWidget;
