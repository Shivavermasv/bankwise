import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.jsx';
import { 
  FaServer, FaMemory, FaClock, FaChartLine, FaDatabase, 
  FaTicketAlt, FaSync, FaCheckCircle, FaExclamationTriangle,
  FaNetworkWired, FaTerminal, FaFileAlt, FaPlay, FaTimes,
  FaCheck, FaSpinner, FaCode, FaSearch, FaCopy, FaEye,
  FaSignOutAlt, FaHeartbeat, FaMoon, FaSun, FaFilter
} from 'react-icons/fa';

// Log level colors and patterns
const LOG_LEVELS = {
  ERROR: { color: 'text-red-400', bg: 'bg-red-900/30', badge: 'bg-red-500' },
  WARN: { color: 'text-yellow-400', bg: 'bg-yellow-900/20', badge: 'bg-yellow-500' },
  INFO: { color: 'text-blue-400', bg: 'bg-blue-900/10', badge: 'bg-blue-500' },
  DEBUG: { color: 'text-purple-400', bg: 'bg-purple-900/10', badge: 'bg-purple-500' },
  TRACE: { color: 'text-slate-500', bg: 'bg-slate-900/10', badge: 'bg-slate-500' }
};

// Parse and format a single log line
const parseLogLine = (line) => {
  // Pattern: YYYY-MM-DD HH:MM:SS LEVEL Logger - Message
  const fullPattern = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(ERROR|WARN|INFO|DEBUG|TRACE)\s+(\S+)\s*[-–]\s*(.*)$/;
  // Short pattern: HH:MM:SS LEVEL Logger - Message
  const shortPattern = /^(\d{2}:\d{2}:\d{2})\s+(ERROR|WARN|INFO|DEBUG|TRACE)\s+(\S+)\s*[-–]\s*(.*)$/;
  
  let match = line.match(fullPattern) || line.match(shortPattern);
  
  if (match) {
    return {
      timestamp: match[1],
      level: match[2],
      logger: match[3],
      message: match[4],
      isStackTrace: false
    };
  }
  
  // Check if it's a stack trace line
  if (line.trim().startsWith('at ') || line.includes('Exception') || line.includes('Error:')) {
    return { raw: line, isStackTrace: true, level: 'ERROR' };
  }
  
  return { raw: line, isStackTrace: false, level: null };
};

// Extract API endpoint from error message
const extractApiEndpoint = (message) => {
  // Pattern: "at /api/..." or "exception at /api/..."
  const apiMatch = message?.match(/(?:at\s+)?(\/?api\/[^\s]+)/i);
  if (apiMatch) return apiMatch[1];
  
  // Pattern for controller methods
  const controllerMatch = message?.match(/(\w+Controller\.\w+)/);
  if (controllerMatch) return controllerMatch[1];
  
  return null;
};

// Extract error cause from message or exception
const extractErrorCause = (message, stackLines = []) => {
  // Check for common patterns
  if (message?.includes('NullPointerException')) return 'Null Pointer Exception';
  if (message?.includes('RuntimeException')) {
    const causeMatch = message.match(/RuntimeException:\s*(.+)/);
    return causeMatch ? causeMatch[1].substring(0, 100) : 'Runtime Exception';
  }
  if (message?.includes('Failed to')) {
    const failMatch = message.match(/(Failed to [^.]+)/);
    return failMatch ? failMatch[1] : message.substring(0, 100);
  }
  if (message?.includes('Access denied')) return 'Access Denied';
  if (message?.includes('not found')) return 'Resource Not Found';
  
  // Look in stack trace for Caused by
  for (const line of stackLines) {
    if (line.includes('Caused by:')) {
      return line.replace('Caused by:', '').trim().substring(0, 100);
    }
  }
  
  return message?.substring(0, 100) || 'Unknown Error';
};

// Parse errors from log content into table format
const parseErrorsToTable = (content) => {
  if (!content) return [];
  
  const lines = content.split('\n');
  const errors = [];
  let currentError = null;
  let stackLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parsed = parseLogLine(line);
    
    if (parsed.level === 'ERROR' && !parsed.isStackTrace) {
      // Save previous error if exists
      if (currentError) {
        currentError.cause = extractErrorCause(currentError.message, stackLines);
        currentError.stackTrace = stackLines.join('\n');
        errors.push(currentError);
      }
      
      // Start new error
      currentError = {
        id: errors.length + 1,
        timestamp: parsed.timestamp,
        logger: parsed.logger?.split('.').pop() || parsed.logger,
        fullLogger: parsed.logger,
        message: parsed.message,
        endpoint: extractApiEndpoint(parsed.message),
        cause: null,
        stackTrace: ''
      };
      stackLines = [];
    } else if (currentError && (parsed.isStackTrace || line.trim().startsWith('at '))) {
      stackLines.push(line);
      // Try to extract endpoint from stack trace
      if (!currentError.endpoint) {
        currentError.endpoint = extractApiEndpoint(line);
      }
    } else if (!parsed.level && currentError) {
      // Continuation of previous error
      stackLines.push(line);
    }
  }
  
  // Don't forget the last error
  if (currentError) {
    currentError.cause = extractErrorCause(currentError.message, stackLines);
    currentError.stackTrace = stackLines.join('\n');
    errors.push(currentError);
  }
  
  return errors.reverse(); // Most recent first
};

// Error Table Component
const ErrorTable = ({ content, onViewStack }) => {
  const errors = useMemo(() => parseErrorsToTable(content), [content]);
  const [expandedId, setExpandedId] = useState(null);
  
  if (errors.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <FaCheckCircle className="text-4xl mx-auto mb-3 text-green-500" />
        <p>No errors found in the logs</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800 text-left">
            <th className="px-3 py-2 text-slate-400 font-medium">#</th>
            <th className="px-3 py-2 text-slate-400 font-medium">Time</th>
            <th className="px-3 py-2 text-slate-400 font-medium">API / Source</th>
            <th className="px-3 py-2 text-slate-400 font-medium">Error Cause</th>
            <th className="px-3 py-2 text-slate-400 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((error) => (
            <React.Fragment key={error.id}>
              <tr className="border-b border-slate-700 hover:bg-slate-800/50">
                <td className="px-3 py-2 text-slate-500">{error.id}</td>
                <td className="px-3 py-2 text-slate-400 font-mono text-xs whitespace-nowrap">
                  {error.timestamp}
                </td>
                <td className="px-3 py-2">
                  <span className="text-cyan-400 font-mono text-xs">
                    {error.endpoint || error.logger || 'Unknown'}
                  </span>
                </td>
                <td className="px-3 py-2 text-red-400 max-w-md truncate" title={error.message}>
                  {error.cause || error.message?.substring(0, 80)}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => setExpandedId(expandedId === error.id ? null : error.id)}
                    className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1"
                  >
                    <FaEye />
                    {expandedId === error.id ? 'Hide' : 'Stack'}
                  </button>
                </td>
              </tr>
              {expandedId === error.id && error.stackTrace && (
                <tr>
                  <td colSpan="5" className="bg-slate-900 px-4 py-3">
                    <div className="text-xs font-mono text-red-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      <div className="text-slate-400 mb-2 font-sans">
                        <strong>Full Message:</strong> {error.message}
                      </div>
                      <div className="text-slate-500 mb-1">Stack Trace:</div>
                      {error.stackTrace}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-xs text-slate-500 text-right">
        Total Errors: {errors.length}
      </div>
    </div>
  );
};

// LogViewer component with syntax highlighting
const LogViewer = ({ content, filter }) => {
  const formattedLines = useMemo(() => {
    if (!content) return [];
    
    const lines = content.split('\n');
    let currentLevel = null;
    
    return lines.map((line, index) => {
      const parsed = parseLogLine(line);
      
      if (parsed.level) {
        currentLevel = parsed.level;
      }
      
      // Inherit level from previous log entry for stack traces
      if (parsed.isStackTrace && !parsed.level) {
        parsed.level = currentLevel;
      }
      
      return { ...parsed, index };
    }).filter(line => {
      if (!filter || filter === 'ALL') return true;
      return line.level === filter;
    });
  }, [content, filter]);
  
  if (!content) {
    return (
      <div className="text-slate-500 dark:text-slate-400 text-center py-8">
        No log content to display. Select a file from the list.
      </div>
    );
  }
  
  return (
    <div className="space-y-0.5">
      {formattedLines.map((line, idx) => {
        const levelStyle = LOG_LEVELS[line.level] || { color: 'text-slate-400', bg: '' };
        
        if (line.raw !== undefined) {
          // Raw line (no pattern match)
          return (
            <div key={idx} className={`px-2 py-0.5 font-mono text-xs ${line.isStackTrace ? 'pl-8 text-red-300' : 'text-slate-400'}`}>
              {line.raw}
            </div>
          );
        }
        
        return (
          <div key={idx} className={`px-2 py-1 rounded ${levelStyle.bg} flex items-start gap-2 hover:bg-slate-800/50 transition-colors`}>
            <span className="text-slate-500 text-xs font-mono min-w-[70px] flex-shrink-0">
              {line.timestamp}
            </span>
            <span className={`text-xs font-bold min-w-[50px] flex-shrink-0 ${levelStyle.color}`}>
              {line.level}
            </span>
            <span className="text-cyan-400 text-xs font-mono min-w-[120px] flex-shrink-0 truncate" title={line.logger}>
              {line.logger?.split('.').pop() || line.logger}
            </span>
            <span className={`text-xs font-mono flex-1 ${levelStyle.color}`}>
              {line.message}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, subValue, color = 'blue' }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-lg border border-slate-200/50 dark:border-slate-700/50"
  >
    <div className="flex items-start justify-between">
      <div className={`p-3 rounded-xl bg-${color}-100 dark:bg-${color}-900/30`}>
        <Icon className={`text-xl text-${color}-600 dark:text-${color}-400`} />
      </div>
    </div>
    <div className="mt-4">
      <p className="text-2xl font-bold text-slate-800 dark:text-white">{value}</p>
      <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
      {subValue && <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{subValue}</p>}
    </div>
  </motion.div>
);

// Tab Button Component
const TabButton = ({ active, onClick, icon: Icon, label, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
    }`}
  >
    <Icon className="text-lg" />
    {label}
    {count !== undefined && (
      <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
        active ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-600'
      }`}>
        {count}
      </span>
    )}
  </button>
);

const DeveloperDashboard = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [activeTab, setActiveTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [logFiles, setLogFiles] = useState([]);
  const [logContent, setLogContent] = useState(null);
  const [logLevelFilter, setLogLevelFilter] = useState('ALL');
  const [logViewMode, setLogViewMode] = useState('table'); // 'table' or 'raw'
  const [apiEndpoints, setApiEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolution, setResolution] = useState('');
  const [apiTestResult, setApiTestResult] = useState(null);
  const [apiSearchQuery, setApiSearchQuery] = useState('');

  const headers = { 'Authorization': `Bearer ${user.token}` };

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [analyticsRes, ticketsRes, endpointsRes] = await Promise.all([
        fetch(`${API_BASE}/api/system/analytics`, { headers }),
        fetch(`${API_BASE}/api/developer/tickets`, { headers }),
        fetch(`${API_BASE}/api/developer/api-endpoints`, { headers })
      ]);

      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (ticketsRes.ok) setTickets(await ticketsRes.json());
      if (endpointsRes.ok) {
        const data = await endpointsRes.json();
        setApiEndpoints(data.endpoints || []);
      }

      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.token]);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/developer/logs`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLogFiles(data.files || []);
      }
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  };

  const readLogFile = async (filename) => {
    try {
      const res = await fetch(`${API_BASE}/api/developer/logs/${filename}?lines=500`, { headers });
      if (res.ok) {
        setLogContent(await res.json());
      }
    } catch (err) {
      console.error('Failed to read log', err);
    }
  };

  const updateTicketStatus = async (ticketId, status) => {
    try {
      const res = await fetch(`${API_BASE}/api/developer/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolution })
      });
      if (res.ok) {
        fetchData();
        setSelectedTicket(null);
        setResolution('');
      }
    } catch (err) {
      console.error('Failed to update ticket', err);
    }
  };

  // Health Check - Only ping endpoints to check if they're up (no data modification)
  const [healthCheckResults, setHealthCheckResults] = useState({});
  const [isHealthChecking, setIsHealthChecking] = useState(false);

  const runHealthCheck = async () => {
    setIsHealthChecking(true);
    const results = {};
    
    // Only check system/public endpoints that don't require user context
    const healthEndpoints = [
      { path: '/api/system/ping', name: 'System Ping' },
      { path: '/api/system/health', name: 'System Health' },
      { path: '/api/system/analytics', name: 'System Analytics' },
      { path: '/api/developer/tickets', name: 'Developer Tickets' },
      { path: '/api/developer/logs', name: 'Developer Logs' },
      { path: '/api/developer/api-endpoints', name: 'API Documentation' },
    ];

    for (const ep of healthEndpoints) {
      try {
        const startTime = Date.now();
        const res = await fetch(`${API_BASE}${ep.path}`, {
          method: 'GET',
          headers
        });
        const duration = Date.now() - startTime;
        results[ep.path] = {
          name: ep.name,
          status: res.status,
          duration,
          healthy: res.status >= 200 && res.status < 400
        };
      } catch (err) {
        results[ep.path] = {
          name: ep.name,
          status: 0,
          duration: 0,
          healthy: false,
          error: err.message
        };
      }
    }
    
    setHealthCheckResults(results);
    setIsHealthChecking(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    navigate('/login');
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab]);

  const endpoints = analytics?.endpoints ? Object.entries(analytics.endpoints)
    .map(([endpoint, data]) => ({ endpoint, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20) : [];

  const filteredEndpoints = apiEndpoints.filter(ep => 
    apiSearchQuery === '' || 
    ep.path.toLowerCase().includes(apiSearchQuery.toLowerCase()) ||
    ep.description.toLowerCase().includes(apiSearchQuery.toLowerCase())
  );

  const openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 to-indigo-50'}`}>
      {/* Custom Developer Header - No User Navbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FaTerminal className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-white font-bold">Bankwise Developer Console</h1>
              <p className="text-slate-400 text-xs">System Administration</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <FaSun /> : <FaMoon />}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
            >
              <FaSignOutAlt />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <FaTerminal className="text-indigo-600" />
              Developer Console
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              System monitoring, logs & API testing • {lastRefresh?.toLocaleTimeString() || 'Loading...'}
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50 font-medium"
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

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl">
          <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={FaChartLine} label="Analytics" />
          <TabButton active={activeTab === 'tickets'} onClick={() => setActiveTab('tickets')} icon={FaTicketAlt} label="Tickets" count={openTickets} />
          <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={FaFileAlt} label="Logs" />
          <TabButton active={activeTab === 'api'} onClick={() => setActiveTab('api')} icon={FaHeartbeat} label="Health Check" />
        </div>

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                icon={FaClock}
                label="System Uptime"
                value={analytics?.uptime?.uptimeMs ? `${Math.floor(analytics.uptime.uptimeMs / 3600000)}h ${Math.floor((analytics.uptime.uptimeMs % 3600000) / 60000)}m` : '--'}
                subValue={`Started: ${analytics?.uptime?.startedAt?.split('T')[0] || '--'}`}
                color="emerald"
              />
              <StatCard
                icon={FaMemory}
                label="Memory Usage"
                value={`${analytics?.memory?.usedMB || 0} MB`}
                subValue={`${analytics?.memory?.usagePercent || 0}% of ${analytics?.memory?.maxMB || 0} MB`}
                color="blue"
              />
              <StatCard
                icon={FaChartLine}
                label="Total Requests"
                value={(analytics?.requests?.total || 0).toLocaleString()}
                subValue={`${(analytics?.requests?.successRate || 100).toFixed(1)}% success`}
                color="purple"
              />
              <StatCard
                icon={FaExclamationTriangle}
                label="Errors"
                value={(analytics?.requests?.errors || 0).toLocaleString()}
                color="amber"
              />
            </div>

            {/* Database & Redis Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <FaDatabase className="text-indigo-600" />
                  Database Statistics
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {analytics?.database && Object.entries(analytics.database).map(([key, value]) => (
                    <div key={key} className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{value.toLocaleString()}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">{key}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <FaServer className="text-indigo-600" />
                  Redis Cache & JVM
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <p className={`text-lg font-bold ${analytics?.redis?.status === 'UP' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {analytics?.redis?.status || 'Unknown'}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Redis Status</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{analytics?.jvm?.processors || '--'}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">CPU Cores</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{analytics?.threads?.active || '--'}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Active Threads</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{analytics?.threads?.peak || '--'}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Peak Threads</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Endpoint Performance */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <FaNetworkWired className="text-indigo-600" />
                API Endpoint Performance (Top 20)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-4">Endpoint</th>
                      <th className="py-3 px-4 text-right">Requests</th>
                      <th className="py-3 px-4 text-right">Avg Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoints.map((ep) => (
                      <tr key={ep.endpoint} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="py-3 px-4 font-mono text-sm text-slate-700 dark:text-slate-300">{ep.endpoint}</td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{ep.count.toLocaleString()}</td>
                        <td className={`py-3 px-4 text-right font-medium ${
                          ep.avgMs < 200 ? 'text-emerald-600' : ep.avgMs < 500 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {ep.avgMs?.toFixed(0) || 0}ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <FaTicketAlt className="text-indigo-600" />
                Support Tickets ({tickets.length})
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Created</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">#{ticket.id}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{ticket.userName || ticket.userEmail}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">{ticket.subject}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            ticket.priority === 'HIGH' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            ticket.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                          }`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            ticket.status === 'OPEN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            ticket.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                          }`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedTicket(ticket)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                              title="View Details"
                            >
                              <FaEye />
                            </button>
                            {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
                              <button
                                onClick={() => updateTicketStatus(ticket.id, 'RESOLVED')}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg"
                                title="Mark Resolved"
                              >
                                <FaCheck />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ticket Detail Modal */}
            <AnimatePresence>
              {selectedTicket && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                  onClick={() => setSelectedTicket(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                        Ticket #{selectedTicket.id}
                      </h3>
                      <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                        <FaTimes />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-slate-500 text-sm">User:</span><p className="font-medium text-slate-800 dark:text-white">{selectedTicket.userName}</p></div>
                        <div><span className="text-slate-500 text-sm">Email:</span><p className="font-medium text-slate-800 dark:text-white">{selectedTicket.userEmail}</p></div>
                        <div><span className="text-slate-500 text-sm">Category:</span><p className="font-medium text-slate-800 dark:text-white">{selectedTicket.category}</p></div>
                        <div><span className="text-slate-500 text-sm">Priority:</span><p className="font-medium text-slate-800 dark:text-white">{selectedTicket.priority}</p></div>
                      </div>

                      <div>
                        <span className="text-slate-500 text-sm">Subject:</span>
                        <p className="font-semibold text-slate-800 dark:text-white mt-1">{selectedTicket.subject}</p>
                      </div>

                      <div>
                        <span className="text-slate-500 text-sm">Description:</span>
                        <p className="text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                          {selectedTicket.description}
                        </p>
                      </div>

                      {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                        <div>
                          <label className="text-slate-500 text-sm">Resolution Notes:</label>
                          <textarea
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value)}
                            className="w-full mt-2 p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                            rows={3}
                            placeholder="Add resolution notes..."
                          />
                        </div>
                      )}

                      <div className="flex gap-3 pt-4">
                        {selectedTicket.status === 'OPEN' && (
                          <button
                            onClick={() => updateTicketStatus(selectedTicket.id, 'IN_PROGRESS')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Mark In Progress
                          </button>
                        )}
                        {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                          <button
                            onClick={() => updateTicketStatus(selectedTicket.id, 'RESOLVED')}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                          >
                            Mark Resolved
                          </button>
                        )}
                        {selectedTicket.status !== 'CLOSED' && (
                          <button
                            onClick={() => updateTicketStatus(selectedTicket.id, 'CLOSED')}
                            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
                          >
                            Close Ticket
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Log Files List */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <FaFileAlt className="text-indigo-600" />
                  Log Files
                </h3>
                <div className="space-y-2">
                  {logFiles.length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No log files available (console-only logging on Railway)</p>
                  ) : (
                    logFiles.map((file) => (
                      <button
                        key={file.name}
                        onClick={() => readLogFile(file.name)}
                        className={`w-full text-left p-3 rounded-xl transition-colors ${
                          logContent?.filename === file.name 
                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' 
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <p className="font-medium text-slate-800 dark:text-white text-sm">{file.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Log Content */}
              <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                    {logContent ? logContent.filename : 'Select a log file'}
                  </h3>
                  <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                      <button
                        onClick={() => setLogViewMode('table')}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          logViewMode === 'table' 
                            ? 'bg-indigo-600 text-white' 
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                        }`}
                      >
                        <FaExclamationTriangle className="inline mr-1" /> Errors Table
                      </button>
                      <button
                        onClick={() => setLogViewMode('raw')}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          logViewMode === 'raw' 
                            ? 'bg-indigo-600 text-white' 
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                        }`}
                      >
                        <FaTerminal className="inline mr-1" /> Raw Logs
                      </button>
                    </div>
                    {/* Log Level Filter - only show for raw view */}
                    {logViewMode === 'raw' && (
                      <div className="flex items-center gap-2">
                        <FaFilter className="text-slate-400" />
                        <select
                          value={logLevelFilter}
                          onChange={(e) => setLogLevelFilter(e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white border-none text-sm focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="ALL">All Levels</option>
                          <option value="ERROR">ERROR</option>
                          <option value="WARN">WARN</option>
                          <option value="INFO">INFO</option>
                          <option value="DEBUG">DEBUG</option>
                          <option value="TRACE">TRACE</option>
                        </select>
                      </div>
                    )}
                    {logContent && (
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        Lines: {logContent.returnedLines} / {logContent.totalLines}
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl overflow-x-auto max-h-[60vh] overflow-y-auto">
                  {logViewMode === 'table' ? (
                    <ErrorTable content={logContent?.content} />
                  ) : (
                    <LogViewer content={logContent?.content} filter={logLevelFilter} />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* API Health Check Tab */}
        {activeTab === 'api' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Endpoint Health Check */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    <FaHeartbeat className="text-indigo-600" />
                    Endpoint Health Check
                  </h3>
                  <button
                    onClick={runHealthCheck}
                    disabled={isHealthChecking}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isHealthChecking ? <FaSpinner className="animate-spin" /> : <FaPlay />}
                    Run Health Check
                  </button>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Tests read-only endpoints to verify they are responding. No data modification is performed.
                </p>

                <div className="space-y-3">
                  {Object.entries(healthCheckResults).length === 0 ? (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                      <FaHeartbeat className="text-4xl mx-auto mb-4 opacity-50" />
                      <p>Click "Run Health Check" to test endpoints</p>
                    </div>
                  ) : (
                    Object.entries(healthCheckResults).map(([path, result]) => (
                      <div
                        key={path}
                        className={`p-4 rounded-xl flex items-center justify-between ${
                          result.healthy 
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' 
                            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {result.healthy ? (
                            <FaCheckCircle className="text-xl text-emerald-600" />
                          ) : (
                            <FaExclamationTriangle className="text-xl text-red-600" />
                          )}
                          <div>
                            <p className="font-medium text-slate-800 dark:text-white">{result.name}</p>
                            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{path}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${result.healthy ? 'text-emerald-600' : 'text-red-600'}`}>
                            {result.status || 'ERR'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{result.duration}ms</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* API Documentation List */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    <FaCode className="text-indigo-600" />
                    API Documentation ({filteredEndpoints.length})
                  </h3>
                </div>
                
                {/* Search */}
                <div className="relative mb-4">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={apiSearchQuery}
                    onChange={(e) => setApiSearchQuery(e.target.value)}
                    placeholder="Search endpoints..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  />
                </div>

                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {filteredEndpoints.map((ep, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          ep.method === 'GET' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' :
                          ep.method === 'POST' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' :
                          ep.method === 'PUT' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                        }`}>
                          {ep.method}
                        </span>
                        <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{ep.path}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{ep.description}</p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {ep.roles.map(role => (
                          <span key={role} className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-600 rounded text-slate-600 dark:text-slate-300">
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* System Health Banner */}
        <div className="mt-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
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
              <p className="text-sm text-emerald-100">Java {analytics?.jvm?.javaVersion || '--'}</p>
              <p className="text-lg font-semibold">Production</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDashboard;
