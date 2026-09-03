import React from 'react';
import { Navigate } from 'react-router-dom';

export default function Protected({ children }) {
  const token = sessionStorage.getItem('cc_token') || localStorage.getItem('cc_token');
  return token ? children : <Navigate to="/login" replace />;
}
