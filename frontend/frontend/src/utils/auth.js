// Authentication utility functions

/**
 * Validates if a JWT token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - true if valid, false if expired or invalid
 */
export const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    
    return tokenPayload.exp && tokenPayload.exp > currentTime;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

/**
 * Checks if user session is valid
 * @param {object} user - User object from session storage
 * @returns {boolean} - true if session is valid
 */
export const isSessionValid = (user) => {
  if (!user || !user.token || !user.email || !user.role) {
    return false;
  }
  
  return isTokenValid(user.token);
};

/**
 * Clears session and redirects to login
 * @param {function} navigate - React Router navigate function
 */
export const clearSessionAndRedirect = (navigate) => {
  sessionStorage.clear();
  if (navigate) {
    navigate('/login', { replace: true });
  } else {
    window.location.href = '/login';
  }
};

/**
 * Checks if user has required role
 * @param {object} user - User object
 * @param {string|array} allowedRoles - Single role or array of allowed roles
 * @returns {boolean} - true if user has required role
 */
export const hasRequiredRole = (user, allowedRoles) => {
  if (!user || !user.role) return false;
  
  if (Array.isArray(allowedRoles)) {
    return allowedRoles.includes(user.role);
  }
  
  return user.role === allowedRoles;
};

/**
 * Gets the appropriate home route based on user role
 * @param {object} user - User object
 * @returns {string} - Route path
 */
export const getHomeRouteForRole = (user) => {
  if (!user || !user.role) return '/login';
  
  switch (user.role.toLowerCase()) {
    case 'admin':
    case 'manager':
      return '/admin-home';
    case 'user':
    case 'customer':
    default:
      return '/home';
  }
};

/**
 * Handles API response errors, especially authentication errors
 * @param {Response} response - Fetch response object
 * @param {function} navigate - React Router navigate function
 * @returns {boolean} - true if it was an auth error and handled
 */
export const handleApiAuthError = (response, navigate) => {
  if (response && (response.status === 401 || response.status === 403)) {
    clearSessionAndRedirect(navigate);
    return true;
  }
  return false;
};

/**
 * Creates headers with authorization token
 * @param {string} token - JWT token
 * @param {object} additionalHeaders - Additional headers to include
 * @returns {object} - Headers object
 */
export const createAuthHeaders = (token, additionalHeaders = {}) => {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...additionalHeaders
  };
};
