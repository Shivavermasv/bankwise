import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token'); // Check if the user is authenticated

    return token ? children : <Navigate to="/" />; // Redirect to the welcome page if not authenticated
};

export default ProtectedRoute;
