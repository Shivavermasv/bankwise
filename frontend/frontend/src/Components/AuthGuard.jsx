import React from 'react';
import { Navigate } from 'react-router-dom';
import { getHomeRouteForRole, hasRequiredRole, isSessionValid, getStoredUser } from '../utils/auth';

// Authentication Guard - checks if user has valid token and session
const AuthGuard = ({ children, allowedRoles = [] }) => {
  const user = getStoredUser();
  
  // If not authenticated or token invalid, redirect to login
  if (!user || !isSessionValid(user)) {
    sessionStorage.clear();
    localStorage.clear(); // Clear any legacy data
    return <Navigate to="/login" replace />;
  }
  
  // If authenticated but doesn't have required role, show access denied
  if (allowedRoles.length > 0 && !hasRequiredRole(user, allowedRoles)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0fdfa 0%, #e0e7ff 100%)',
        color: '#ef4444',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.9)',
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
            Access Denied
          </h2>
          <p style={{ fontSize: 16, color: '#64748b', marginBottom: 24 }}>
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => {
              sessionStorage.clear();
              window.location.href = '/login';
            }}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }
  
  return children;
};

// Public Route Guard - redirects authenticated users away from login/register pages
const PublicRoute = ({ children }) => {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  
  if (isSessionValid(user)) {
    return <Navigate to={getHomeRouteForRole(user)} replace />;
  }
  
  return children;
};

export { AuthGuard, PublicRoute };
