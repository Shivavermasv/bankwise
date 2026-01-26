import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../Layout/Navbar';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext.jsx';
import { 
  FaServer, FaMemory, FaClock, FaChartLine, FaDatabase, 
  FaTicketAlt, FaSync, FaCheckCircle, FaExclamationTriangle,
  FaNetworkWired, FaCode, FaTerminal
} from 'react-icons/fa';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, subValue, color = 'blue', trend }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-lg border border-slate-200/50 dark:border-slate-700/50"
  >
    <div className="flex items-start justify-between">
      <div className={`p-3 rounded-xl bg-${color}-100 dark:bg-${color}-900/30`}>
        <Icon className={`text-xl text-${color}-600 dark:text-${color}-400`} />
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          trend > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div className="mt-4">
      <p className="text-2xl font-bold text-slate-800 dark:text-white">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
    </div>
  </motion.div>
);

// Endpoint Performance Row
const EndpointRow = ({ endpoint, count, avgTime }) => {
  const getTimeColor = (ms) => {
    if (ms < 200) return 'text-emerald-600 dark:text-emerald-400';
    if (ms < 500) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <tr className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <td className="py-3 px-4 font-mono text-sm text-slate-700 dark:text-slate-300">{endpoint}</td>
      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{count.toLocaleString()}</td>
      <td className={`py-3 px-4 text-right font-medium ${getTimeColor(avgTime)}`}>
        {avgTime.toFixed(0)}ms
      </td>
    </tr>
  );
};

// Support Ticket Row
const TicketRow = ({ ticket }) => {
  const statusColors = {
    OPEN: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    RESOLVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    CLOSED: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
  };

  return (
    <tr className="border-b border-slate-100 dark:border-slate-700/50">
      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">#{ticket.id}</td>
      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">{ticket.subject}</td>
      <td className="py-3 px-4">
        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[ticket.status] || statusColors.OPEN}`}>
          {ticket.status}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400">
        {new Date(ticket.createdAt).toLocaleDateString()}
      </td>
    </tr>
  );
};

const DeveloperDashboard = () => {
  const { theme } = useTheme();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [analytics, setAnalytics] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${user.token}` };

      const [analyticsRes, ticketsRes] = await Promise.all([
        fetch(`${API_BASE}/api/system/analytics`, { headers }),
        fetch(`${API_BASE}/api/system/support-tickets`, { headers })
      ]);

      if (!analyticsRes.ok || !ticketsRes.ok) {
        throw new Error('Failed to fetch system data');
      }

      const [analyticsData, ticketsData] = await Promise.all([
        analyticsRes.json(),
        ticketsRes.json()
      ]);

      setAnalytics(analyticsData);
      setTickets(Array.isArray(ticketsData) ? ticketsData : []);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.token]);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const endpoints = analytics?.endpoints ? Object.entries(analytics.endpoints)
    .map(([endpoint, data]) => ({ endpoint, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15) : [];

  return (
    <div className={`min-h-screen pt-16 ${theme === 'dark' ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 to-indigo-50'}`}>
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <FaTerminal className="text-indigo-600" />
              Developer Console
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              System analytics and monitoring • Last updated: {lastRefresh?.toLocaleTimeString() || 'Never'}
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <FaSync className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={FaClock}
            label="System Uptime"
            value={analytics?.uptime?.formatted || '--'}
            subValue={`Started: ${analytics?.startedAt?.split('T')[0] || '--'}`}
            color="emerald"
          />
          <StatCard
            icon={FaMemory}
            label="Memory Usage"
            value={`${analytics?.memory?.usedMB || 0} MB`}
            subValue={`${analytics?.memory?.percentage || 0}% of ${analytics?.memory?.maxMB || 0} MB`}
            color="blue"
          />
          <StatCard
            icon={FaChartLine}
            label="Total Requests"
            value={(analytics?.requests?.total || 0).toLocaleString()}
            subValue={`${(analytics?.requests?.successRate || 100).toFixed(1)}% success rate`}
            color="purple"
          />
          <StatCard
            icon={FaExclamationTriangle}
            label="Errors"
            value={(analytics?.requests?.errors || 0).toLocaleString()}
            color="amber"
          />
        </div>

        {/* Database Stats */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <FaDatabase className="text-indigo-600" />
            Database Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {analytics?.database && Object.entries(analytics.database).map(([key, value]) => (
              <div key={key} className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{value.toLocaleString()}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{key}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Endpoint Performance */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <FaNetworkWired className="text-indigo-600" />
              API Endpoint Performance
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 px-4">Endpoint</th>
                    <th className="py-2 px-4 text-right">Requests</th>
                    <th className="py-2 px-4 text-right">Avg Time</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoints.map((ep) => (
                    <EndpointRow 
                      key={ep.endpoint} 
                      endpoint={ep.endpoint}
                      count={ep.count}
                      avgTime={ep.avgResponseTimeMs}
                    />
                  ))}
                  {endpoints.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-500">No data yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Support Tickets */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <FaTicketAlt className="text-indigo-600" />
              Support Tickets ({tickets.length})
            </h2>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-white dark:bg-slate-800">
                  <tr className="text-left text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 px-4">ID</th>
                    <th className="py-2 px-4">Subject</th>
                    <th className="py-2 px-4">Status</th>
                    <th className="py-2 px-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.slice(0, 10).map((ticket) => (
                    <TicketRow key={ticket.id} ticket={ticket} />
                  ))}
                  {tickets.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">No tickets</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="mt-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <FaCheckCircle className="text-3xl" />
              </div>
              <div>
                <h3 className="text-xl font-bold">System Status: Healthy</h3>
                <p className="text-emerald-100">All services running normally</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-emerald-100">Environment</p>
              <p className="text-lg font-semibold">Production</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDashboard;
