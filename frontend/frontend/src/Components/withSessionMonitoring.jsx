import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSessionValid, clearSessionAndRedirect } from '../utils/auth';

/**
 * Higher-order component that monitors session validity
 * and automatically redirects to login when session expires
 */
const withSessionMonitoring = (WrappedComponent) => {
  return function SessionMonitoredComponent(props) {
    const navigate = useNavigate();

    useEffect(() => {
      const checkSession = () => {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        
        if (!isSessionValid(user)) {
          clearSessionAndRedirect(navigate);
        }
      };

      // Check session immediately
      checkSession();

      // Set up periodic session checks (every 30 seconds)
      const interval = setInterval(checkSession, 30000);

      // Listen for storage changes (logout from another tab)
      const handleStorageChange = (e) => {
        if (e.key === 'user' || e.key === null) {
          checkSession();
        }
      };

      window.addEventListener('storage', handleStorageChange);

      // Cleanup
      return () => {
        clearInterval(interval);
        window.removeEventListener('storage', handleStorageChange);
      };
    }, [navigate]);

    return <WrappedComponent {...props} />;
  };
};

export default withSessionMonitoring;
