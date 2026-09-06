import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  CreditCard,
  Mail,
  Gift,
  Copy,
  Check,
  Calendar,
  Wallet,
  Coins,
  TrendingUp,
  ClipboardCheck,
  ClipboardX,
  CalendarDays,
  Users,
  Award,
  User,
  Clock,
  Bell,
  Shield,
  Headphones,
  Download,
  LogOut,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  X,
  Briefcase,
  CalendarCheck2
} from 'lucide-react';
import Shell from '../components/layout/Shell';
import { API_BASE_URL, getAuthHeaders } from '../api/config';
import { fmt } from '../utils/formatters';
import { getCachedWallet, setCachedWallet } from '../utils/walletCache';

export default function SettingsPage() {
  const nav = useNavigate();
  const [profile, setProfile] = useState(() => {
    const cached = getCachedWallet();
    return {
      name: cached.user_name || 'Code Clever User',
      phone: '+92300******',
      rawPhone: '',
      email: 'user@example.com',
      id: 'CC684AF6',
      referral_code: cached.referral_code || 'CCFA93BC2',
      avatar_url: '/assets/Characters/Male.jpg'
    };
  });

  const [stats, setStats] = useState(() => {
    const cached = getCachedWallet();
    return {
      yesterday_earned: 0,
      today_earned: cached.today_earned || 0,
      total_earned: cached.lifetime_earned || cached.total_balance || 0,
      week_earned: cached.week_earned || 0,
      completed_tasks: cached.tasks_completed || 0,
      remaining_tasks: cached.tasks_remaining || 2,
      monthly_earned: cached.monthly_earned || 0,
      task_earnings: 0,
      spin_earnings: 0,
      checkin_earnings: 0,
      personal_balance: cached.personal_balance || 0,
      commission_balance: cached.commission_balance || 0,
      team_commission: 0,
      referral_rewards: 0
    };
  });

  const [copied, setCopied] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        return;
      }
    }
    setShowInstallModal(true);
  };

  useEffect(() => {
    // 1. Fetch user profile
    fetch(`${API_BASE_URL}/profile`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setProfile({
            name: d.full_name || d.name || 'Code Clever User',
            phone: d.phone ? maskPhone(d.phone) : '+92300******',
            rawPhone: d.phone || '',
            email: d.email || 'user@example.com',
            id: d.id ? 'CC' + String(d.id).padStart(6, '0') : '684AF603',
            referral_code: d.referral_code || 'CCFA93BC2',
            avatar_url: d.avatar_url || '/assets/Characters/Male.jpg'
          });
        }
      })
      .catch(() => {});

    // 2. Fetch accurate user earnings summary & stats
    fetch(`${API_BASE_URL}/user/earnings-summary`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setStats({
            yesterday_earned: Number(d.yesterday_earned || 0),
            today_earned: Number(d.today_earned || 0),
            total_earned: Number(d.total_earned || 0),
            week_earned: Number(d.week_earned || 0),
            completed_tasks: Number(d.completed_tasks || 0),
            remaining_tasks: Number(d.remaining_tasks || 0),
            monthly_earned: Number(d.monthly_earned || 0),
            task_earnings: Number(d.task_earnings || 0),
            spin_earnings: Number(d.spin_earnings || 0),
            checkin_earnings: Number(d.checkin_earnings || 0),
            personal_balance: Number(d.personal_balance || 0),
            commission_balance: Number(d.commission_balance || 0),
            team_commission: Number(d.team_commission || 0),
            referral_rewards: Number(d.referral_rewards || 0)
          });
          setCachedWallet({
            today_earned: Number(d.today_earned || 0),
            lifetime_earned: Number(d.total_earned || 0),
            personal_balance: Number(d.personal_balance || 0),
            commission_balance: Number(d.commission_balance || 0),
            total_balance: Number(d.personal_balance || 0) + Number(d.commission_balance || 0),
            tasks_completed: Number(d.completed_tasks || 0),
            tasks_remaining: Number(d.remaining_tasks || 0)
          });
        }
      })
      .catch(() => {});

    const handleWalletUpdate = (e) => {
      const u = e.detail;
      if (!u) return;
      setStats((prev) => ({
        ...prev,
        personal_balance: u.personal_balance ?? prev.personal_balance,
        commission_balance: u.commission_balance ?? prev.commission_balance,
        total_earned: u.lifetime_earned ?? prev.total_earned,
        today_earned: u.today_earned ?? prev.today_earned,
        completed_tasks: u.tasks_completed ?? prev.completed_tasks,
        remaining_tasks: u.tasks_remaining ?? prev.remaining_tasks
      }));
    };
    window.addEventListener('cc_wallet_updated', handleWalletUpdate);
    return () => window.removeEventListener('cc_wallet_updated', handleWalletUpdate);
  }, []);

  const maskPhone = (phone) => {
    if (!phone) return '+92300******';
    const str = String(phone).replace(/\s+/g, '');
    if (str.length >= 7) {
      return str.slice(0, 5) + '******';
    }
    return str;
  };

  const copyRefCode = () => {
    navigator.clipboard.writeText(profile.referral_code);
    setCopied(true);
    setToast('Referral code copied to clipboard!');
    setTimeout(() => {
      setCopied(false);
      setToast('');
    }, 2500);
  };

  const handleDownloadApp = () => {
    setToast('Code Clever Android APK download started!');
    setTimeout(() => setToast(''), 3000);
  };

  const activityLinks = [
    {
      title: 'Edit Profile',
      desc: 'Update your personal information',
      icon: User,
      path: '/settings/profile'
    },
    {
      title: 'Wallet & Withdrawals',
      desc: 'Manage your wallet and withdrawal methods',
      icon: Wallet,
      path: '/wallet'
    },
    {
      title: 'Earning History',
      desc: 'View your completed earning records',
      icon: Clock,
      path: '/wallet'
    },
    {
      title: 'Team & Referrals',
      desc: 'Manage your team and referral activity',
      icon: Users,
      path: '/team'
    },
    {
      title: 'Notifications',
      desc: 'Manage platform notifications',
      icon: Bell,
      path: '/settings/notifications'
    },
    {
      title: 'Security Settings',
      desc: 'Manage password and account security',
      icon: Shield,
      path: '/settings/security'
    },
    {
      title: 'Help & Support',
      desc: 'Get assistance from Code Clever',
      icon: Headphones,
      path: '/support'
    }
  ];

  return (
    <Shell>
      <div className="settings-v2-page">
        {/* Top Header */}
        <div className="settings-header-top">
          <div className="settings-header-title">
            <div className="title-bar" />
            <h1>Profile</h1>
          </div>
          <button
            className="ref-copy-btn"
            style={{ width: '40px', height: '40px', borderRadius: '12px' }}
            onClick={() => nav('/settings/notifications')}
            title="Notifications"
          >
            <Bell size={20} />
          </button>
        </div>

        {/* Profile Card */}
        <div className="settings-profile-card">
          <div className="settings-avatar-wrap">
            <img src={profile.avatar_url} alt={profile.name} />
          </div>
          <div className="settings-info-list">
            <div className="settings-info-item">
              <Phone size={17} />
              <span>{profile.phone}</span>
            </div>
            <div className="settings-info-item">
              <CreditCard size={17} />
              <span>ID: {profile.id}</span>
            </div>
            <div className="settings-info-item">
              <Mail size={17} />
              <span>{profile.email}</span>
            </div>
            <div className="settings-info-item ref-row">
              <div className="ref-left">
                <Gift size={18} color="#cb4eff" />
                <div>
                  <small>Referral Code</small>
                  <strong>{profile.referral_code}</strong>
                </div>
              </div>
              <button
                className="ref-copy-btn"
                onClick={copyRefCode}
                title="Copy Referral Code"
              >
                {copied ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Personal Wallet & Commission Wallet Overview (Dark Theme Matched, Buttons Removed) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', margin: '18px 0 22px' }}>
          {/* 1. Personal Wallet Card */}
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(22, 10, 39, 0.95), rgba(12, 5, 24, 0.95))',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '20px',
              padding: '22px 24px',
              boxShadow: '0 8px 30px -8px rgba(16, 185, 129, 0.2)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.18)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  <Wallet size={19} color="#34d399" strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#6ee7b7', letterSpacing: '-0.2px' }}>
                  Personal wallet
                </span>
              </div>

              <div style={{ fontSize: '34px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.8px', lineHeight: 1.1 }}>
                Rs. {fmt(stats.personal_balance)}
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                All-time balance • Deposit & Intern Tasks
              </span>
            </div>
          </div>

          {/* 2. Commission Wallet Card */}
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(28, 12, 48, 0.95), rgba(14, 6, 28, 0.95))',
              border: '1px solid rgba(217, 70, 239, 0.35)',
              borderRadius: '20px',
              padding: '22px 24px',
              boxShadow: '0 8px 30px -8px rgba(217, 70, 239, 0.2)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'rgba(217, 70, 239, 0.18)',
                    border: '1px solid rgba(217, 70, 239, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(217, 70, 239, 0.25)'
                  }}
                >
                  <Coins size={19} color="#f472b6" strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#f5d0fe', letterSpacing: '-0.2px' }}>
                  Commission wallet
                </span>
              </div>

              <div style={{ fontSize: '34px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.8px', lineHeight: 1.1 }}>
                Rs. {fmt(stats.commission_balance)}
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                All-time balance • Tasks, team, spin & check-in rewards
              </span>
            </div>
          </div>
        </div>

        {/* Earning Overview Section */}
        <div className="settings-section-head">Earning Overview</div>
        <div className="settings-earnings-grid">
          <div className="earning-box">
            <div className="earning-box-top">
              <div className="earning-icon">
                <Calendar size={18} />
              </div>
              <span>Yesterday's Earnings</span>
            </div>
            <strong>Rs. {fmt(stats.yesterday_earned)}</strong>
          </div>

          <div className="earning-box">
            <div className="earning-box-top">
              <div className="earning-icon">
                <Wallet size={18} />
              </div>
              <span>Today's Earnings</span>
            </div>
            <strong>Rs. {fmt(stats.today_earned)}</strong>
          </div>

          <div className="earning-box">
            <div className="earning-box-top">
              <div className="earning-icon">
                <Coins size={18} />
              </div>
              <span>Total Earnings</span>
            </div>
            <strong>Rs. {fmt(stats.total_earned)}</strong>
          </div>

          <div className="earning-box">
            <div className="earning-box-top">
              <div className="earning-icon">
                <TrendingUp size={18} />
              </div>
              <span>This Week's Earnings</span>
            </div>
            <strong>Rs. {fmt(stats.week_earned)}</strong>
          </div>

          <div className="earning-box">
            <div className="earning-box-top">
              <div className="earning-icon">
                <ClipboardCheck size={18} />
              </div>
              <span>Completed Tasks</span>
            </div>
            <strong>{stats.completed_tasks}</strong>
          </div>

          <div className="earning-box">
            <div className="earning-box-top">
              <div className="earning-icon">
                <ClipboardX size={18} />
              </div>
              <span>Remaining Tasks</span>
            </div>
            <strong>{stats.remaining_tasks}</strong>
          </div>

          {/* Task Earning Section (Added exactly between Remaining Tasks and This Month's Earnings) */}
          <div className="earning-box" style={{ border: '1px solid rgba(217, 70, 239, 0.35)', background: 'rgba(217, 70, 239, 0.05)' }}>
            <div className="earning-box-top">
              <div className="earning-icon" style={{ background: 'rgba(217, 70, 239, 0.2)', color: '#e879f9' }}>
                <Briefcase size={18} />
              </div>
              <span>Task Earnings</span>
            </div>
            <strong>Rs. {fmt(stats.task_earnings)}</strong>
            <small style={{ color: '#c084fc', fontSize: '10.5px', marginTop: '2px', display: 'block' }}>Credited to Commission Wallet</small>
          </div>

          <div className="earning-box">
            <div className="earning-box-top">
              <div className="earning-icon">
                <CalendarDays size={18} />
              </div>
              <span>This Month's Earnings</span>
            </div>
            <strong>Rs. {fmt(stats.monthly_earned)}</strong>
          </div>

          <div className="earning-box">
            <div className="earning-box-top">
              <div className="earning-icon">
                <Users size={18} />
              </div>
              <span>Team Commission</span>
            </div>
            <strong>Rs. {fmt(stats.team_commission)}</strong>
          </div>

          <div className="earning-box">
            <div className="earning-box-top">
              <div className="earning-icon">
                <Award size={18} />
              </div>
              <span>Referral Rewards</span>
            </div>
            <strong>Rs. {fmt(stats.referral_rewards)}</strong>
          </div>

          {/* Spin Earnings Card */}
          <div className="earning-box" style={{ border: '1px solid rgba(234, 179, 8, 0.35)', background: 'rgba(234, 179, 8, 0.05)' }}>
            <div className="earning-box-top">
              <div className="earning-icon" style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#facc15' }}>
                <Sparkles size={18} />
              </div>
              <span>Spin Earnings</span>
            </div>
            <strong>Rs. {fmt(stats.spin_earnings)}</strong>
            <small style={{ color: '#fbbf24', fontSize: '10.5px', marginTop: '2px', display: 'block' }}>Credited to Commission Wallet</small>
          </div>

          {/* Check-in Earnings Card */}
          <div className="earning-box" style={{ border: '1px solid rgba(16, 185, 129, 0.35)', background: 'rgba(16, 185, 129, 0.05)' }}>
            <div className="earning-box-top">
              <div className="earning-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                <CalendarCheck2 size={18} />
              </div>
              <span>Check-in Earnings</span>
            </div>
            <strong>Rs. {fmt(stats.checkin_earnings)}</strong>
            <small style={{ color: '#34d399', fontSize: '10.5px', marginTop: '2px', display: 'block' }}>Credited to Commission Wallet</small>
          </div>
        </div>

        {/* Account & Activity Section */}
        <div className="settings-section-head">Account & Activity</div>
        <div className="settings-activity-list">
          {activityLinks.map((item) => (
            <motion.button
              key={item.title}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.99 }}
              className="activity-row-btn"
              onClick={() => {
                if (item.action) {
                  item.action();
                } else if (item.path) {
                  nav(item.path);
                }
              }}
            >
              <div className="activity-icon">
                <item.icon size={20} />
              </div>
              <div className="activity-copy">
                <b>{item.title}</b>
                <span>{item.desc}</span>
              </div>
              <ChevronRight size={18} className="activity-arrow" />
            </motion.button>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="settings-actions">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="pwa-install-app-btn"
            onClick={handleInstallApp}
          >
            <Download size={19} />
            <span>Install / Add to Home Screen</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="pwa-logout-btn"
            onClick={() => nav('/logout')}
          >
            <LogOut size={18} />
            <span>Log Out</span>
          </motion.button>
        </div>

        {/* Toast Alert */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="profile-toast"
            >
              <CheckCircle2 size={18} />
              <span>{toast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PWA Install Guide Modal (Exact Matching User Request: Click 3-dot and Add to Home Screen) */}
        <AnimatePresence>
          {showInstallModal && (
            <div className="admin-modal-backdrop" onClick={() => setShowInstallModal(false)}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="admin-user-modal"
                style={{ maxWidth: '520px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button className="modal-close" onClick={() => setShowInstallModal(false)}>
                  <X size={18} />
                </button>

                <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
                  <div
                    style={{
                      width: '68px',
                      height: '68px',
                      borderRadius: '20px',
                      background: 'linear-gradient(145deg, #38125e, #100624)',
                      border: '2px solid #a83dff',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#e26aff',
                      margin: '0 auto 16px',
                      boxShadow: '0 0 25px rgba(184, 61, 255, 0.4)'
                    }}
                  >
                    <Download size={32} />
                  </div>
                  <h2 style={{ fontSize: '22px', margin: '0 0 6px', color: '#fff' }}>
                    Install Code Clever App
                  </h2>
                  <p style={{ color: '#aaa1c0', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                    Install Code Clever directly to your phone or desktop home screen for instant full-screen app access.
                  </p>
                </div>

                {/* Step-by-Step Installation Cards */}
                <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
                  <div className="pwa-step-card">
                    <div className="pwa-step-num">1</div>
                    <div className="pwa-step-text">
                      <b>Tap the Browser Menu</b>
                      <span>Click the <b>3 dots (⋮)</b> or Share icon in your browser toolbar (Chrome, Edge, or Safari).</span>
                    </div>
                  </div>

                  <div className="pwa-step-card">
                    <div className="pwa-step-num">2</div>
                    <div className="pwa-step-text">
                      <b>Select "Add to Home screen"</b>
                      <span>Tap <b>"Add to Home Screen"</b> or <b>"Install App"</b> from the browser menu options.</span>
                    </div>
                  </div>

                  <div className="pwa-step-card">
                    <div className="pwa-step-num">3</div>
                    <div className="pwa-step-text">
                      <b>Launch Instant Web App</b>
                      <span>Open <b>Code Clever</b> directly from your home screen just like a native mobile app!</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <button
                    type="button"
                    className="gradient-btn"
                    style={{ width: '100%', justifyContent: 'center', height: '46px' }}
                    onClick={() => setShowInstallModal(false)}
                  >
                    <CheckCircle2 size={18} /> Got it, thanks!
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Interactive Support Modal */}
        <AnimatePresence>
          {showSupportModal && (
            <div className="admin-modal-backdrop" onClick={() => setShowSupportModal(false)}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="admin-user-modal"
                style={{ maxWidth: '520px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button className="modal-close" onClick={() => setShowSupportModal(false)}>
                  <X size={18} />
                </button>
                <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'linear-gradient(145deg, #38125e, #100624)',
                      border: '2px solid #a83dff',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#e26aff',
                      margin: '0 auto 16px',
                      boxShadow: '0 0 25px rgba(184, 61, 255, 0.4)'
                    }}
                  >
                    <Headphones size={28} />
                  </div>
                  <h2 style={{ fontSize: '22px', margin: '0 0 6px' }}>Code Clever Help & Support</h2>
                  <p style={{ color: '#9b92b1', fontSize: '13px', margin: 0 }}>
                    Our dedicated 24/7 support channels are ready to assist you with tasks, deposits, and payouts.
                  </p>
                </div>

                <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
                  <button
                    className="gradient-btn"
                    style={{ justifyContent: 'center', height: '46px' }}
                    onClick={() => {
                      window.open('https://t.me/codecleversupport', '_blank');
                      setShowSupportModal(false);
                    }}
                  >
                    <Sparkles size={18} /> Official Telegram Support Channel
                  </button>
                  <button
                    className="outline-btn"
                    style={{ justifyContent: 'center', height: '46px' }}
                    onClick={() => {
                      window.open('https://wa.me/923000000000', '_blank');
                      setShowSupportModal(false);
                    }}
                  >
                    WhatsApp Direct Helpline
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}
