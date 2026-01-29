import { useState, useEffect, useCallback } from 'react';

// Custom hook for authentication management
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Function to validate token
  const validateToken = useCallback((token) => {
    if (!token) return false;
    
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      return tokenPayload.exp && tokenPayload.exp > currentTime;
    } catch {
      return false;
    }
  }, []);

  // Function to logout
  const logout = useCallback(() => {
    try {
      // Clear all storage completely
      sessionStorage.clear();
      localStorage.clear(); // Clear any legacy data
      setUser(null);
      setIsAuthenticated(false);
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, []);

  // Function to check authentication status
  const checkAuth = useCallback(() => {
    setIsLoading(true);
    
    try {
      // Only check sessionStorage - tokens should not persist across browser sessions for security
      const storedUser = sessionStorage.getItem("user");
      
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        
        // Check if user data is complete and token is valid
        if (userData.token && userData.email && userData.role && validateToken(userData.token)) {
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          // Clear invalid session data
          sessionStorage.clear();
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      sessionStorage.clear();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [validateToken]);

  // Function to login
  const login = useCallback((userData) => {
    try {
      const userJson = JSON.stringify(userData);
      sessionStorage.setItem("user", userJson);
      // Do NOT store in localStorage - security risk
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error during login:', error);
    }
  }, []);

  // Function to check if user has specific role
  const hasRole = useCallback((roles) => {
    if (!user || !user.role) return false;
    
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    
    return user.role === roles;
  }, [user]);

  // Check authentication status on mount and when storage changes
  useEffect(() => {
    checkAuth();

    // Listen for storage changes (e.g., logout in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'user' || e.key === null) {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkAuth]);

  // Periodically check token validity
  useEffect(() => {
    if (!isAuthenticated || !user?.token) return;

    const interval = setInterval(() => {
      if (!validateToken(user.token)) {
        logout();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isAuthenticated, user?.token, validateToken, logout]);

  return {
    user,
    token: user?.token || sessionStorage.getItem("token"),
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasRole,
    checkAuth
  };
};
