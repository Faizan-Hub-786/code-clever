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
  KeyRound
} from 'lucide-react';
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

export default function AdminPage() {
  const navigate = useNavigate();
  const [section, setSection] = useState('overview');
  const [data, setData] = useState({
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
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const loadData = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/admin/overview`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
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

  const nav = [
    ['overview', 'Overview', LayoutDashboard],
    ['users', 'Users', Users],
    ['team', 'Team & Hierarchy', UsersRound],
    ['deposits', 'Deposits', ArrowDownLeft],
    ['withdrawals', 'Withdrawals', ArrowUpRight],
    ['bank', 'Bank & Recharge', Landmark],
    ['support', 'General Inquiries', Headphones],
    ['password_resets', 'Password Resets', KeyRound],
    ['plans', 'Plan Controls', Layers3],
    ['tasks', 'Task Library', ListTodo],
    ['announcements', 'News & Announcements', Megaphone],
    ['wheel', 'Lucky Wheel', Gift],
    ['controls', 'Site Controls', SlidersHorizontal]
  ];

  return (
    <div className="admin-standalone-root">
      {/* Standalone Admin Top Navigation Bar */}
      <header className="admin-standalone-topbar">
        <div className="admin-brand-left">
          <img src="/assets/logo.jpeg" alt="Code Clever" className="admin-topbar-logo" />
          <div className="admin-brand-text">
            <h2>CODE CLEVER</h2>
            <span className="admin-topbar-tag">ADMIN CONTROL CENTER</span>
          </div>
        </div>

        <div className="admin-topbar-right">
          <div className="admin-badge-indicator">
            <ShieldCheck size={15} color="#4ade80" />
            <span>Master Admin</span>
          </div>
          <button
            type="button"
            className="admin-topbar-btn website-btn"
            onClick={() => navigate('/home')}
            title="Open main consumer website"
          >
            <Globe size={15} />
            <span>Main Website</span>
          </button>
          <button
            type="button"
            className="admin-topbar-btn logout-btn"
            onClick={handleLogout}
            title="Logout of admin session"
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Admin Dashboard Container */}
      <div className="admin-page-fullscreen">
        {/* Admin Header with Title & Refresh */}
        <div className="admin-header-row">
          <div>
            <div className="admin-eyebrow">ADMINISTRATION HUB</div>
            <h1 className="admin-title">System Control Center</h1>
            <p className="admin-subtitle">
              Centralized oversight for users, passwords, financial queues, support tickets, lucky wheel, and platform policies.
            </p>
          </div>
          <button className="outline-btn refresh-btn" onClick={loadData}>
            <RefreshCw size={16} /> Refresh Data
          </button>
        </div>

        {msg && <div className="admin-global-msg">{msg}</div>}

        {/* 2-Line Horizontal Pill Navigation Bar (No Scrollbar) */}
        <div className="admin-pills-nav-wrap">
          <div className="admin-pills-nav">
            {nav.map(([id, label, Icon]) => {
              const isActive = section === id;
              let badgeCount = 0;
              if (id === 'deposits') badgeCount = data.pendingDeposits || 0;
              if (id === 'withdrawals') badgeCount = data.pendingWithdrawals || 0;
              if (id === 'support') {
                badgeCount = (data.inquiries || []).filter(
                  (x) => x.category !== 'Password Reset' && !String(x.message || '').includes('[PASSWORD RESET') && x.status === 'pending'
                ).length;
              }
              if (id === 'password_resets') {
                badgeCount = (data.inquiries || []).filter(
                  (x) => (x.category === 'Password Reset' || String(x.message || '').includes('[PASSWORD RESET') || String(x.message || '').includes('[VERIFIED PASSWORD RESET')) && x.status === 'pending'
                ).length;
              }

              return (
                <button
                  key={id}
                  type="button"
                  className={`admin-nav-pill ${isActive ? 'active' : ''}`}
                  onClick={() => setSection(id)}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  {badgeCount > 0 && <span className="admin-pill-badge">{badgeCount}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content View (Full Width) */}
        <div className="admin-content-fullwidth">
          <main className="admin-view-card">
            {section === 'overview' && (
              <>
                <AdminOverview data={data} setSection={setSection} />
                <AdminQuickControls onAction={loadData} />
              </>
            )}
            {section === 'users' && (
              <AdminUsers users={data.userList || []} onAction={runAction} />
            )}
            {section === 'team' && (
              <AdminTeam />
            )}
            {section === 'deposits' && (
              <AdminDeposits queue={data.depositsQueue || []} onAction={runAction} />
            )}
            {section === 'withdrawals' && (
              <AdminWithdrawals queue={data.withdrawalsQueue || []} onAction={runAction} />
            )}
            {section === 'bank' && (
              <AdminBank />
            )}
            {section === 'support' && (
              <AdminSupport inquiries={data.inquiries || []} onAction={runAction} />
            )}
            {section === 'password_resets' && (
              <AdminPasswordResets inquiries={data.inquiries || []} onAction={runAction} />
            )}
            {section === 'plans' && (
              <AdminPlans plans={data.plans || []} onAction={runAction} />
            )}
            {section === 'tasks' && (
              <AdminTasks library={data.taskLibrary || []} onAction={runAction} />
            )}
            {section === 'announcements' && (
              <AdminAnnouncements onAction={loadData} />
            )}
            {section === 'wheel' && (
              <AdminWheel wheel={data.wheel} onAction={runAction} />
            )}
            {section === 'controls' && (
              <AdminSiteControls settings={data.siteSettings || []} onAction={runAction} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
