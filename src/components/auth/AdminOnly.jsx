import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { API_BASE_URL } from '../../api/config';

export default function AdminOnly({ children }) {
  const nav = useNavigate();
  const [email, setEmail] = useState('faizan0687@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Check if currently authenticated user is the designated master admin
  const checkCurrentAdmin = () => {
    const token = sessionStorage.getItem('cc_token') || localStorage.getItem('cc_token');
    const raw = sessionStorage.getItem('cc_user') || localStorage.getItem('cc_user');
    if (!token || !raw) return false;
    try {
      const u = JSON.parse(raw);
      return (
        String(u?.email || '').trim().toLowerCase() === 'faizan0687@gmail.com' &&
        u?.role === 'admin'
      );
    } catch {
      return false;
    }
  };

  const [isAdminUnlocked, setIsAdminUnlocked] = useState(checkCurrentAdmin);

  useEffect(() => {
    setIsAdminUnlocked(checkCurrentAdmin());
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (cleanEmail !== 'faizan0687@gmail.com') {
      setError('Access Denied: Only the authorized administrator account (faizan0687@gmail.com) can access this portal.');
      return;
    }

    if (!password) {
      setError('Please enter the administrator password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Administrator authentication failed.');
      }

      // Save admin credentials in sessionStorage
      sessionStorage.setItem('cc_token', data.token);
      sessionStorage.setItem('cc_user', JSON.stringify(data.user));
      localStorage.removeItem('cc_token');
      localStorage.removeItem('cc_user');

      setSuccessMsg('Authentication verified. Loading Admin Hub...');
      setTimeout(() => {
        setIsAdminUnlocked(true);
      }, 500);
    } catch (err) {
      setError(err.message || 'Invalid administrator credentials. Access restricted.');
    } finally {
      setLoading(false);
    }
  };

  if (isAdminUnlocked) {
    return children;
  }

  return (
    <div className="admin-auth-overlay">
      <motion.div
        className="admin-auth-card"
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="admin-auth-icon">
          <ShieldAlert size={42} />
        </div>

        <div className="admin-auth-header">
          <h2>Master Admin Portal</h2>
          <span className="admin-auth-badge">Restricted Access</span>
        </div>

        <p className="admin-auth-desc">
          This system is strictly reserved for authorized platform management. Authenticate with your administrator credentials to proceed.
        </p>

        <AnimatePresence>
          {error && (
            <motion.div
              className="admin-auth-alert error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <AlertTriangle size={18} />
              <span>{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              className="admin-auth-alert success"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleAdminLogin} className="admin-auth-form">
          <div className="admin-input-group">
            <label>Admin Email Address</label>
            <div className="admin-input-wrapper">
              <Mail size={18} className="field-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="faizan0687@gmail.com"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="admin-input-group">
            <label>Master Admin Password</label>
            <div className="admin-input-wrapper">
              <KeyRound size={18} className="field-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                disabled={loading}
                autoFocus
              />
              <button
                type="button"
                className="pwd-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="gradient-btn admin-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span>Verifying Admin Credentials...</span>
            ) : (
              <>
                <Lock size={17} /> Authenticate & Open Admin Panel
              </>
            )}
          </button>
        </form>

        <div className="admin-auth-footer">
          <button
            type="button"
            className="outline-btn back-to-user-btn"
            onClick={() => nav('/home')}
          >
            <ArrowLeft size={16} /> Back to User Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}
