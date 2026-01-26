import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from '../../context/ThemeContext.jsx';
import { FaBell, FaUser, FaCog, FaSignOutAlt, FaChevronDown } from "react-icons/fa";

const userLinks = [
  { label: 'Dashboard', to: '/home' },
  { label: 'Transfer', to: '/transfer' },
  { label: 'Transactions', to: '/transactions' },
  { label: 'Cards', to: '/cards' },
  { label: 'Analytics', to: '/analytics' },
  { label: 'More', to: null, isDropdown: true, subLinks: [
    { label: 'Payments', to: '/payments' },
    { label: 'Scheduled Payments', to: '/scheduled-payments' },
    { label: 'Beneficiaries', to: '/beneficiaries' },
    { label: 'EMI Management', to: '/emi' },
    { label: 'Support', to: '/support' },
  ]}
];

const adminLinks = [
  { label: 'Dashboard', to: '/admin-home' },
  { label: 'Accounts', to: '/accounts' },
  { label: 'Loan Approval', to: '/loan-approval' },
  { label: 'Support', to: '/support' }
];

const Navbar = ({ onNotificationsClick, unseenCount = 0 }) => {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const role = (user.role || '').toUpperCase();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const moreMenuRef = useRef(null);
  const { theme, toggleTheme } = useTheme();

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check authentication on component mount
  useEffect(() => {
    if (!user.token || !user.email || !user.role) {
      // User is not properly authenticated, but don't redirect from navbar
      // Let the page components handle authentication
      return;
    }

    // Validate token expiration
    try {
      const tokenPayload = JSON.parse(atob(user.token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      if (tokenPayload.exp && tokenPayload.exp < currentTime) {
        sessionStorage.clear();
        navigate("/login", { replace: true });
        return;
      }
    } catch (error) {
      console.error("Invalid token format:", error);
      sessionStorage.clear();
      navigate("/login", { replace: true });
      return;
    }
  }, [user, navigate]);

  // Theme class sync handled centrally in ThemeProvider

  // Handle logo click - redirect to role-specific home
  const handleLogoClick = () => {
    if (!role) {
      navigate('/login');
      return;
    }
    switch (role) {
      case 'ADMIN':
      case 'MANAGER':
        navigate('/admin-home');
        break;
      case 'USER':
      case 'CUSTOMER':
      default:
        navigate('/home');
        break;
    }
  };
  const isAdmin = role === 'ADMIN' || role === 'MANAGER';
  const links = isAdmin ? adminLinks : userLinks;
  const isActive = (to) => {
    if (to === '/home') return location.pathname === '/home';
    if (to === '/admin-home') return location.pathname === '/admin-home';
    return location.pathname === to;
  };
  const navLinkClasses = (to) => `relative px-3 py-2 rounded-md text-sm font-semibold transition-colors ${isActive(to) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`;

  return (
    <nav className={`fixed top-0 inset-x-0 z-[1100] backdrop-blur border-b shadow-sm ${isAdmin ? 'bg-slate-900/85 border-slate-800' : 'bg-white/80 dark:bg-slate-900/70 border-slate-200/70 dark:border-slate-800'}`}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <button onClick={handleLogoClick} className="flex items-center gap-2 group">
          <img src="/bankwise-logo.svg" alt="Bankwise Logo" className="h-9 w-9 drop-shadow-sm group-hover:scale-105 transition-transform" />
          <span className={`font-extrabold text-xl tracking-tight ${isAdmin ? 'text-white' : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent'}`}>
            {isAdmin ? 'Bankwise Admin' : 'Bankwise'}
          </span>
          {isAdmin && <span className="ml-2 text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/30">Console</span>}
        </button>
        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            l.isDropdown ? (
              <div key={l.label} className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className={`${navLinkClasses(l.to)} flex items-center gap-1`}
                >
                  {l.label}
                  <FaChevronDown className={`w-3 h-3 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {moreMenuOpen && (
                  <div className={`absolute top-full left-0 mt-2 w-48 rounded-xl shadow-lg border ${isAdmin ? 'bg-slate-800 border-slate-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'} overflow-hidden z-50`}>
                    {l.subLinks.map(sub => (
                      <button
                        key={sub.to}
                        onClick={() => { navigate(sub.to); setMoreMenuOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          isActive(sub.to)
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : isAdmin 
                              ? 'text-slate-300 hover:bg-slate-700' 
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                key={l.to}
                onClick={() => navigate(l.to)}
                className={navLinkClasses(l.to)}
              >
                {l.label}
                {isActive(l.to) && <span className={`absolute left-2 right-2 -bottom-[6px] h-0.5 rounded-full ${isAdmin ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400' : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400'}`} />}
              </button>
            )
          ))}
        </div>
        <div className="flex items-center gap-3">
          {/* Profile Avatar with Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className={`flex items-center gap-2 p-1.5 rounded-lg border transition-colors ${isAdmin ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <div className={`w-8 h-8 rounded-full overflow-hidden ${isAdmin ? 'bg-amber-500/20' : 'bg-gradient-to-br from-blue-400 to-indigo-500'} flex items-center justify-center`}>
                {user.profilePhoto ? (
                  <img 
                    src={`data:${user.profilePhotoContentType};base64,${user.profilePhoto}`} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className={`text-sm font-bold ${isAdmin ? 'text-amber-300' : 'text-white'}`}>
                    {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </button>
            
            {/* Dropdown Menu */}
            {profileMenuOpen && (
              <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-lg border ${isAdmin ? 'bg-slate-800 border-slate-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'} overflow-hidden z-50`}>
                <div className={`px-4 py-3 border-b ${isAdmin ? 'border-slate-700' : 'border-slate-200 dark:border-slate-700'}`}>
                  <p className={`font-semibold text-sm ${isAdmin ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{user.name || user.username}</p>
                  <p className={`text-xs ${isAdmin ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'} truncate`}>{user.email}</p>
                </div>
                <button
                  onClick={() => { navigate('/profile'); setProfileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${isAdmin ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'} transition-colors`}
                >
                  <FaUser className="text-blue-500" /> My Profile
                </button>
                <button
                  onClick={() => { 
                    sessionStorage.clear();
                    localStorage.clear();
                    window.history.replaceState(null, '', '/');
                    window.location.href = '/';
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${isAdmin ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'} transition-colors text-red-500`}
                >
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            )}
          </div>

          {/* Notification bell for all users */}
          <button
            onClick={onNotificationsClick || (() => {})}
            className={`relative p-2 rounded-lg border transition-colors ${isAdmin ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            aria-label="Notifications"
            title="Notifications"
          >
            <FaBell className="text-lg" />
            {unseenCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unseenCount > 9 ? '9+' : unseenCount}
              </span>
            )}
          </button>
          <button onClick={toggleTheme} className={`p-2 rounded-lg border transition-colors ${isAdmin ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={() => setMobileOpen(o=>!o)} className="md:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700">
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden px-4 pb-4 space-y-1">
          {links.map(l => (
            l.isDropdown ? (
              l.subLinks.map(sub => (
                <button key={sub.to} onClick={() => { navigate(sub.to); setMobileOpen(false); }} className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${location.pathname === sub.to ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{sub.label}</button>
              ))
            ) : (
              <button key={l.to} onClick={() => { navigate(l.to); setMobileOpen(false); }} className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${location.pathname === l.to ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{l.label}</button>
            )
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
