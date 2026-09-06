import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import GlowBg from '../components/common/GlowBg';
import Logo from '../components/common/Logo';

import { clearCachedWallet } from '../utils/walletCache';

export default function LogoutPage() {
  const nav = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('cc_user');
    localStorage.removeItem('cc_token');
    sessionStorage.removeItem('cc_user');
    sessionStorage.removeItem('cc_token');
    clearCachedWallet();
    nav('/login');
  };

  return (
    <div className="auth">
      <GlowBg />
      <motion.div
        className="logout-card"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="logout-icon">
          <LogOut size={36} />
        </div>
        <Logo />
        <h1>Exit Code Clever?</h1>
        <p>Are you sure you want to end your active session?</p>
        <div className="actions">
          <button className="gradient-btn" onClick={handleLogout}>
            Logout
          </button>
          <button className="ghost-btn" onClick={() => nav('/home')}>
            Stay Logged In
          </button>
        </div>
      </motion.div>
    </div>
  );
}
