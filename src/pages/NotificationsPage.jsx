import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  ChevronLeft,
  CheckCircle2,
  Wallet,
  Gift,
  ShieldCheck,
  Send,
  Sparkles,
  CheckCheck,
  Clock,
  ArrowRight,
  Layers,
  HelpCircle
} from 'lucide-react';
import Shell from '../components/layout/Shell';
import { API_BASE_URL, getAuthHeaders } from '../api/config';

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    category: 'transactions',
    title: 'Withdrawal Request Submitted',
    message: 'Your withdrawal request has been submitted for queue review.',
    time: '10 minutes ago',
    unread: true,
    actionUrl: '/withdraw'
  },
  {
    id: 2,
    category: 'tasks',
    title: 'Task Reward Credited (Instagram Evaluation)',
    message: 'Awesome! Your app task evaluation was verified and Rs. 59 was credited to your Personal Wallet.',
    time: '45 minutes ago',
    unread: true,
    actionUrl: '/tasks'
  },
  {
    id: 3,
    category: 'transactions',
    title: 'Deposit Request Submitted',
    message: 'Your deposit submission via JazzCash is currently being verified by the treasury desk.',
    time: '2 hours ago',
    unread: false,
    actionUrl: '/deposit'
  }
];

export default function NotificationsPage() {
  const nav = useNavigate();
  const [filter, setFilter] = useState('all'); // 'all' | 'transactions' | 'tasks' | 'system'
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const loadNotifications = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/notifications`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d.list) && d.list.length) {
          setNotifications(d.list);
        }
      }
    } catch {}
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    try {
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
    } catch {}
  };

  const getIconData = (item) => {
    const cat = item.category || 'transactions';
    const type = item.type || '';
    if (type.includes('deposit') || cat === 'transactions') {
      return { Icon: Wallet, color: '#38bdf8' };
    }
    if (type.includes('withdraw')) {
      return { Icon: Send, color: '#df65ff' };
    }
    if (cat === 'tasks') {
      return { Icon: Gift, color: '#4ade80' };
    }
    if (cat === 'system' || type.includes('support')) {
      return { Icon: ShieldCheck, color: '#a855f7' };
    }
    return { Icon: Sparkles, color: '#fbbf24' };
  };

  const filtered =
    filter === 'all'
      ? notifications
      : notifications.filter((n) => n.category === filter);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <Shell>
      <div className="notifications-page">
        {/* Top Header Bar */}
        <div className="deposit-top-bar">
          <div className="deposit-top-left">
            <button className="deposit-back-btn" onClick={() => nav(-1)} title="Back">
              <ChevronLeft size={22} />
            </button>
            <div className="deposit-brand">
              <img src="/assets/logo.jpeg" alt="Code Clever" />
              <span>CODE CLEVER</span>
            </div>
          </div>
          <button
            className="text-btn"
            onClick={markAllRead}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cb4eff', fontSize: '13px', cursor: 'pointer', background: 'transparent', border: 0 }}
          >
            <CheckCheck size={16} /> Mark All as Read
          </button>
        </div>

        {/* Page Title */}
        <div style={{ margin: '18px 0 20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={26} color="#c45eff" /> Notification Center
            {unreadCount > 0 && (
              <span style={{ fontSize: '12px', background: '#c45eff', color: '#fff', padding: '2px 10px', borderRadius: '99px' }}>
                {unreadCount} New
              </span>
            )}
          </h1>
          <p style={{ color: '#8e879f', fontSize: '13px', margin: 0 }}>
            Stay updated on account activity, deposit/withdrawal approvals, and announcements.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="notif-filter-tabs">
          {[
            ['all', 'All Updates'],
            ['transactions', 'Transactions'],
            ['tasks', 'Tasks & Rewards'],
            ['system', 'System & Security']
          ].map(([k, l]) => (
            <button
              key={k}
              className={`notif-tab-btn ${filter === k ? 'active' : ''}`}
              onClick={() => setFilter(k)}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="notifications-list">
          {filtered.length > 0 ? (
            filtered.map((item, idx) => {
              const { Icon: IconComp, color: iconColor } = getIconData(item);
              return (
                <motion.div
                  key={item.id || idx}
                  className={`notif-item-card ${item.unread ? 'unread' : ''}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => item.actionUrl && nav(item.actionUrl)}
                  style={{ cursor: item.actionUrl ? 'pointer' : 'default' }}
                >
                  <div className="notif-icon-badge">
                    <IconComp size={22} color={iconColor} />
                  </div>
                  <div className="notif-copy">
                    <h4>{item.title}</h4>
                    <p>{item.message}</p>
                    <span>
                      <Clock size={11} style={{ display: 'inline', marginRight: '4px' }} />
                      {item.time}
                    </span>
                  </div>
                  {item.unread && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#bd49ff', marginTop: '6px', flexShrink: 0, boxShadow: '0 0 10px #bd49ff' }} />
                  )}
                </motion.div>
              );
            })
          ) : (
            <div className="empty-task">
              <CheckCircle2 size={38} />
              <h3>No notifications</h3>
              <p>You are all caught up with your updates.</p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
