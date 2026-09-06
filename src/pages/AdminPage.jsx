import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  ArrowDownLeft,
  ArrowUpRight,
  Layers3,
  ListTodo,
  Gift,
  SlidersHorizontal,
  Headphones,
  Landmark,
  Megaphone,
  RefreshCw,
  Globe,
  LogOut,
  ShieldCheck,
  KeyRound,
  Search,
  Calendar,
  Bell,
  Menu,
  X,
  Plus,
  ChevronDown
} from 'lucide-react';
import '../styles/admin-shopeers.css';

import AdminQuickControls from '../components/admin/AdminQuickControls';
import AdminOverview from '../components/admin/AdminOverview';
import AdminUsers from '../components/admin/AdminUsers';
import AdminTeam from '../components/admin/AdminTeam';
import AdminDeposits from '../components/admin/AdminDeposits';
import AdminWithdrawals from '../components/admin/AdminWithdrawals';
import AdminPlans from '../components/admin/AdminPlans';
import AdminTasks from '../components/admin/AdminTasks';
import AdminSupport from '../components/admin/AdminSupport';
import AdminPasswordResets from '../components/admin/AdminPasswordResets';
import AdminSiteControls from '../components/admin/AdminSiteControls';
import AdminWheel from '../components/admin/AdminWheel';
import AdminBank from '../components/admin/AdminBank';
import AdminAnnouncements from '../components/admin/AdminAnnouncements';
import { API_BASE_URL, getAuthHeaders } from '../api/config';

let adminOverviewCache = null;

export default function AdminPage() {
  const navigate = useNavigate();
  const [section, setSection] = useState('overview');
  const [visitedSections, setVisitedSections] = useState(() => new Set(['overview']));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState(() => adminOverviewCache || {
    users: 0,
    activeUsers: 0,
    revenue: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    pendingInquiries: 0,
    tasksToday: 0,
    depositsQueue: [],
    withdrawalsQueue: [],
    userList: [],
    inquiries: [],
    plans: [],
    taskLibrary: [],
    wheel: { enabled: true, segments: [] },
    siteSettings: []
  });
  const [loading, setLoading] = useState(!adminOverviewCache);
  const [msg, setMsg] = useState('');

  const loadData = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/admin/overview`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        adminOverviewCache = d;
        setData(d);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const runAction = async (endpoint, body = {}) => {
    setMsg('');
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL.replace('/api', '')}${endpoint}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body)
      });
      const d = await r.json();
      setMsg(d.message || 'Action executed successfully.');
      loadData();
    } catch {
      setMsg('Action failed.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('cc_token');
    sessionStorage.removeItem('cc_user');
    localStorage.removeItem('cc_token');
    localStorage.removeItem('cc_user');
    navigate('/login');
  };

  // Badge calculations
  const pendingInquiriesCount = (data.inquiries || []).filter(
    (x) => x.category !== 'Password Reset' && !String(x.message || '').includes('[PASSWORD RESET') && x.status === 'pending'
  ).length;

  const pendingPasswordResetsCount = (data.inquiries || []).filter(
    (x) => (x.category === 'Password Reset' || String(x.message || '').includes('[PASSWORD RESET') || String(x.message || '').includes('[VERIFIED PASSWORD RESET')) && x.status === 'pending'
  ).length;

  const totalNotifications = (data.pendingDeposits || 0) + (data.pendingWithdrawals || 0) + pendingInquiriesCount + pendingPasswordResetsCount;

  // Navigation Groups matching reference design
  const navGroups = [
    {
      category: 'General',
      items: [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'users', label: 'Users & Customers', icon: Users },
        { id: 'team', label: 'Team Hierarchy', icon: UsersRound }
      ]
    },
    {
      category: 'Finances',
      items: [
        { id: 'deposits', label: 'Deposits', icon: ArrowDownLeft, badge: data.pendingDeposits || 0, badgeType: 'danger' },
        { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpRight, badge: data.pendingWithdrawals || 0, badgeType: 'danger' },
        { id: 'bank', label: 'Bank & Recharge', icon: Landmark }
      ]
    },
    {
      category: 'Operations',
      items: [
        { id: 'plans', label: 'VIP Plans', icon: Layers3 },
        { id: 'tasks', label: 'Task Library', icon: ListTodo },
        { id: 'wheel', label: 'Lucky Wheel', icon: Gift }
      ]
    },
    {
      category: 'Support & Security',
      items: [
        { id: 'support', label: 'Inquiries', icon: Headphones, badge: pendingInquiriesCount, badgeType: 'pill' },
        { id: 'password_resets', label: 'Password Resets', icon: KeyRound, badge: pendingPasswordResetsCount, badgeType: 'pill' }
      ]
    },
    {
      category: 'Platform System',
      items: [
        { id: 'announcements', label: 'News & Updates', icon: Megaphone },
        { id: 'controls', label: 'Site Controls', icon: SlidersHorizontal }
      ]
    }
  ];

  const handleNavClick = (id) => {
    setSection(id);
    setMobileOpen(false);
    setVisitedSections((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <div className="admin-shopeers-root">
      {/* Mobile Drawer Overlay Backdrop */}
      <div
        className={`shopeers-mobile-overlay ${mobileOpen ? 'mobile-open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* 1. LEFT SIDEBAR */}
      <aside className={`shopeers-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="shopeers-brand">
          <div className="shopeers-brand-inner">
            <img src="/assets/logo.jpeg" alt="Code Clever" className="shopeers-brand-logo" />
            <div className="shopeers-brand-text">
              <span className="shopeers-brand-title">Code Clever</span>
              <span className="shopeers-brand-subtitle">Control Center</span>
            </div>
          </div>
          <button
            type="button"
            className="shopeers-collapse-btn"
            onClick={() => setMobileOpen(false)}
            title="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Categorized Menu List */}
        <div className="shopeers-nav-list">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} style={{ marginBottom: 4 }}>
              <div className="shopeers-nav-category">{group.category}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`shopeers-nav-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                  >
                    <div className="shopeers-nav-btn-left">
                      <Icon size={17} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span className={`shopeers-badge-pill ${item.badgeType === 'danger' ? 'danger' : ''}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom System Status / Upgrade Card */}
        <div className="shopeers-system-card">
          <div className="shopeers-system-card-head">
            <ShieldCheck size={16} color="#93c5fd" />
            <span>Master Admin</span>
          </div>
          <h4>System Online</h4>
          <p>All database clusters & microservices operational.</p>
          <button
            type="button"
            className="shopeers-system-card-btn"
            onClick={() => navigate('/home')}
          >
            Visit Live Website →
          </button>
        </div>
      </aside>

      {/* 2. MAIN WRAPPER & TOPBAR */}
      <div className="shopeers-main">
        <header className="shopeers-topbar">
          <div className="shopeers-topbar-left">
            <button
              type="button"
              className="shopeers-mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              title="Toggle Menu"
            >
              <Menu size={22} />
            </button>

            {/* Quick Search */}
            <div className="shopeers-search-wrap">
              <Search size={15} className="shopeers-search-icon" />
              <input
                type="text"
                className="shopeers-search-input"
                placeholder="Search anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="shopeers-search-shortcut">⌘K</span>
            </div>
          </div>

          <div className="shopeers-topbar-right">
            {/* Date Range Badge */}
            <div className="shopeers-date-pill">
              <Calendar size={14} color="#2563eb" />
              <span>Jan 1, 2026 - Present</span>
              <select className="shopeers-period-select">
                <option>Last 30 days</option>
                <option>Today</option>
                <option>This Month</option>
                <option>All Time</option>
              </select>
            </div>

            {/* Action Buttons */}
            <button
              type="button"
              className="shopeers-btn-secondary"
              onClick={() => setSection('announcements')}
            >
              <Plus size={14} /> Add Announcement
            </button>

            <button
              type="button"
              className="shopeers-btn-primary"
              onClick={loadData}
              title="Refresh all metrics"
            >
              <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
              <span>Refresh</span>
            </button>

            {/* Notification Bell */}
            <div
              className="shopeers-icon-btn"
              onClick={() => setSection(data.pendingDeposits ? 'deposits' : 'withdrawals')}
              title={`${totalNotifications} pending actions`}
            >
              <Bell size={18} />
              {totalNotifications > 0 && <span className="shopeers-notif-dot" />}
            </div>

            {/* User Profile Chip & Logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img
                src="/assets/logo.jpeg"
                alt="Admin Avatar"
                className="shopeers-user-avatar"
                title="Master Admin Account"
              />
              <button
                type="button"
                className="shopeers-icon-btn"
                onClick={handleLogout}
                title="Logout of Admin"
                style={{ color: '#ef4444' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* 3. DYNAMIC CONTENT AREA */}
        <main className="shopeers-content">
          {msg && (
            <div className="shopeers-global-msg">
              <span>{msg}</span>
              <button
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e40af', fontWeight: 800 }}
                onClick={() => setMsg('')}
              >
                ✕
              </button>
            </div>
          )}

          <div style={{ display: section === 'overview' ? 'block' : 'none' }}>
            <AdminOverview data={data} setSection={handleNavClick} />
            <div style={{ marginTop: 24 }}>
              <AdminQuickControls onAction={loadData} />
            </div>
          </div>

          <div className="shopeers-subview-card" style={{ display: section !== 'overview' ? 'block' : 'none' }}>
            {visitedSections.has('users') && (
              <div style={{ display: section === 'users' ? 'block' : 'none' }}>
                <AdminUsers users={data.userList || []} onAction={runAction} />
              </div>
            )}
            {visitedSections.has('team') && (
              <div style={{ display: section === 'team' ? 'block' : 'none' }}>
                <AdminTeam />
              </div>
            )}
            {visitedSections.has('deposits') && (
              <div style={{ display: section === 'deposits' ? 'block' : 'none' }}>
                <AdminDeposits queue={data.depositsQueue || []} onAction={runAction} />
              </div>
            )}
            {visitedSections.has('withdrawals') && (
              <div style={{ display: section === 'withdrawals' ? 'block' : 'none' }}>
                <AdminWithdrawals queue={data.withdrawalsQueue || []} onAction={runAction} />
              </div>
            )}
            {visitedSections.has('bank') && (
              <div style={{ display: section === 'bank' ? 'block' : 'none' }}>
                <AdminBank />
              </div>
            )}
            {visitedSections.has('support') && (
              <div style={{ display: section === 'support' ? 'block' : 'none' }}>
                <AdminSupport inquiries={data.inquiries || []} onAction={runAction} />
              </div>
            )}
            {visitedSections.has('password_resets') && (
              <div style={{ display: section === 'password_resets' ? 'block' : 'none' }}>
                <AdminPasswordResets inquiries={data.inquiries || []} onAction={runAction} />
              </div>
            )}
            {visitedSections.has('plans') && (
              <div style={{ display: section === 'plans' ? 'block' : 'none' }}>
                <AdminPlans plans={data.plans || []} onAction={runAction} />
              </div>
            )}
            {visitedSections.has('tasks') && (
              <div style={{ display: section === 'tasks' ? 'block' : 'none' }}>
                <AdminTasks library={data.taskLibrary || []} onAction={runAction} />
              </div>
            )}
            {visitedSections.has('announcements') && (
              <div style={{ display: section === 'announcements' ? 'block' : 'none' }}>
                <AdminAnnouncements onAction={loadData} />
              </div>
            )}
            {visitedSections.has('wheel') && (
              <div style={{ display: section === 'wheel' ? 'block' : 'none' }}>
                <AdminWheel wheel={data.wheel} onAction={runAction} />
              </div>
            )}
            {visitedSections.has('controls') && (
              <div style={{ display: section === 'controls' ? 'block' : 'none' }}>
                <AdminSiteControls settings={data.siteSettings || []} onAction={runAction} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
