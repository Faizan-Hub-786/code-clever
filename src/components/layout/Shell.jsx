import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  ClipboardList,
  Hexagon,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  Bell
} from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../../api/config';
import SecurityOnboardingModal from '../common/SecurityOnboardingModal';

let globalShellUser = null;
let globalShellUnread = 0;
let lastProfileFetch = 0;
let lastNotifFetch = 0;
const PROFILE_TTL = 30000;
const NOTIF_TTL = 15000;

export default function Shell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    if (globalShellUser) return globalShellUser;
    try {
      const u = JSON.parse(sessionStorage.getItem('cc_user') || localStorage.getItem('cc_user') || '{}');
      const parsed = { name: u.name || u.full_name || 'Code Clever User', avatar: u.avatar || u.avatar_url || null, role: u.role || 'user' };
      globalShellUser = parsed;
      return parsed;
    } catch {
      return { name: 'Code Clever User', avatar: null, role: 'user' };
    }
  });
  const [unread, setUnread] = useState(globalShellUnread);

  useEffect(() => {
    const token = sessionStorage.getItem('cc_token') || localStorage.getItem('cc_token');
    if (!token) return;

    const loadProfile = (force = false) => {
      const now = Date.now();
      if (!force && now - lastProfileFetch < PROFILE_TTL && globalShellUser) {
        setUser(globalShellUser);
        return;
      }
      lastProfileFetch = now;
      fetch(`${API_BASE_URL}/profile`, { headers: getAuthHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) {
            const next = {
              name: d.full_name || d.name || 'Code Clever User',
              avatar: d.avatar_url || d.avatar || null,
              role: d.role || 'user'
            };
            globalShellUser = next;
            setUser(next);
          }
        })
        .catch(() => {});
    };

    const loadNotifications = (force = false) => {
      const now = Date.now();
      if (!force && now - lastNotifFetch < NOTIF_TTL) {
        setUnread(globalShellUnread);
        return;
      }
      lastNotifFetch = now;
      fetch(`${API_BASE_URL}/notifications`, { headers: getAuthHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (typeof d?.unreadCount === 'number') {
            globalShellUnread = d.unreadCount;
            setUnread(d.unreadCount);
          }
        })
        .catch(() => {});
    };

    loadProfile();
    loadNotifications();

    const onProfileUpdate = () => loadProfile(true);
    const onNotifUpdate = () => loadNotifications(true);
    window.addEventListener('cc_profile_updated', onProfileUpdate);
    window.addEventListener('cc_wallet_updated', onNotifUpdate);

    return () => {
      window.removeEventListener('cc_profile_updated', onProfileUpdate);
      window.removeEventListener('cc_wallet_updated', onNotifUpdate);
    };
  }, []);

  const navItems = [
    { path: '/home', label: 'Home', Icon: Home },
    { path: '/tasks', label: 'Tasks', Icon: ClipboardList },
    { path: '/plans', label: 'Plans', Icon: Hexagon },
    { path: '/team', label: 'Team', Icon: Users },
    { path: '/settings', label: 'Settings', Icon: Settings },
    { path: '/logout', label: 'Exit', Icon: LogOut }
  ];

  const isNavActive = (p) => {
    if (p === '/home') return location.pathname === '/home' || location.pathname === '/';
    if (p === '/logout') return location.pathname === '/logout';
    return location.pathname === p || location.pathname.startsWith(p + '/');
  };

  return (
    <div className="app-shell">
      <div className="cc-main">
        <header className="cc-topbar">
          <div className="cc-topbar-container">
            <div className="cc-topbar-left">
              <button className="topbar-back-btn" onClick={() => navigate(-1)} title="Go Back" aria-label="Go Back">
                <ChevronLeft size={20} />
              </button>
              <div className="cc-top-brand" onClick={() => navigate('/home')} role="button" tabIndex={0} aria-label="Code Clever Home">
                <img src="/assets/logo.jpeg" alt="Code Clever Logo" className="cc-brand-logo-img" width="34" height="34" />
                <span>CODE CLEVER</span>
              </div>
            </div>

            <div className="cc-top-actions">
              <button
                className="icon-btn notification-btn"
                onClick={() => navigate('/notifications')}
                title="Notifications"
                aria-label="View Notifications"
              >
                <Bell size={18} />
                {unread > 0 && <i style={{ display: 'block' }}>{unread}</i>}
              </button>
              <button className="cc-user-menu" onClick={() => navigate('/settings/profile')} aria-label="View Profile Settings">
                {user.avatar ? (
                  <img src={user.avatar} alt="User Avatar" width="32" height="32" />
                ) : (
                  <div className="top-avatar">{(user.name || 'CC').slice(0, 2).toUpperCase()}</div>
                )}
                <span>{user.name}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="cc-content">
          {children}
          <SecurityOnboardingModal />
        </main>

        {/* Fixed Bottom Navigation Dock */}
        <div className="cc-bottom-dock-wrap">
          <div className="cc-bottom-dock-container">
            <nav className="cc-bottom-dock" aria-label="Main Navigation">
              {navItems.map(({ path, label, Icon }) => {
                const active = isNavActive(path);
                return (
                  <button
                    key={path}
                    className={`cc-dock-item ${active ? 'active' : ''}`}
                    onClick={() => {
                      if (!active) navigate(path);
                    }}
                    title={label}
                    aria-label={label}
                  >
                    <div className="dock-icon-wrap">
                      <Icon size={21} strokeWidth={active ? 2.3 : 1.9} />
                    </div>
                    <span className="dock-label">{label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
