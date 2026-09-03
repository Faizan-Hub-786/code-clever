import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Flame,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Coins,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Crown
} from 'lucide-react';
import Shell from '../components/layout/Shell';
import { API_BASE_URL, getAuthHeaders } from '../api/config';
import { fmt } from '../utils/formatters';

export default function CheckinPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [data, setData] = useState({
    eligible: false,
    plan_name: null,
    plan_code: null,
    claimed_today: false,
    current_streak: 0,
    reward_amount: 10,
    today_date: new Date().toISOString().slice(0, 10),
    month_checkins: [],
    total_checkin_earnings: 0,
    personal_balance: 0,
    commission_balance: 0,
    history: []
  });
  const [toast, setToast] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/checkin/status`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load checkin status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleClaim = async () => {
    if (!data.eligible) {
      nav('/plans');
      return;
    }
    if (data.claimed_today || claiming) return;

    setClaiming(true);
    setToast('');

    try {
      const res = await fetch(`${API_BASE_URL}/checkin/claim`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to claim daily check-in');
      }

      setToast('🎉 ' + json.message);
      await loadStatus();
    } catch (err) {
      setToast('⚠️ ' + err.message);
    } finally {
      setClaiming(false);
      setTimeout(() => setToast(''), 4000);
    }
  };

  // Calendar Helpers for Current Month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const monthName = now.toLocaleString('default', { month: 'long' });
  const todayDayNum = now.getDate();

  // First day of month day-of-week (0=Sun, 1=Mon, ..., 6=Sat)
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  // Total days in month
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  // Calendar cells array
  const calendarCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push({ type: 'empty', key: `empty-${i}` });
  }
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isChecked = data.month_checkins.some((dt) => dt.startsWith(dateStr));
    const isToday = d === todayDayNum;
    calendarCells.push({
      type: 'day',
      dayNum: d,
      dateStr,
      isChecked,
      isToday,
      key: `day-${d}`
    });
  }

  return (
    <Shell>
      <div className="checkin-page-container" style={{ maxWidth: '840px', margin: '0 auto', padding: '16px 12px 60px' }}>
        
        {/* Top Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => nav('/home')}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.3px' }}>
                Daily check-in
              </h1>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Show up daily, earn more
              </span>
            </div>
          </div>

          {/* Commission Balance Pill */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(217, 70, 239, 0.15), rgba(168, 85, 247, 0.15))',
              border: '1px solid rgba(217, 70, 239, 0.35)',
              borderRadius: '20px',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Coins size={14} color="#f472b6" />
            <span style={{ fontSize: '11.5px', color: '#cbd5e1' }}>Commission:</span>
            <strong style={{ fontSize: '12.5px', color: '#f5d0fe' }}>Rs. {fmt(data.commission_balance)}</strong>
          </div>
        </div>

        {/* Floating Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                background: toast.startsWith('⚠️')
                  ? 'linear-gradient(135deg, #7f1d1d, #991b1b)'
                  : 'linear-gradient(135deg, #065f46, #047857)',
                color: '#ffffff',
                padding: '12px 18px',
                borderRadius: '14px',
                marginBottom: '18px',
                fontSize: '13.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. Main Streak & Claim Card */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(22, 10, 39, 0.95), rgba(12, 5, 24, 0.95))',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '24px',
            padding: '32px 24px',
            textAlign: 'center',
            marginBottom: '22px',
            boxShadow: '0 12px 30px -10px rgba(16, 185, 129, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Flame Streak Icon Container */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 24px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Flame size={32} color="#10b981" strokeWidth={2.2} />
          </div>

          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            {data.current_streak} day streak
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '13.5px', margin: '0 0 20px', lineHeight: 1.5 }}>
            Every check-in pays a flat Rs. 10 — one claim per day.
          </p>

          {/* Condition Box */}
          {!data.eligible ? (
            <div style={{ maxWidth: '480px', margin: '0 auto' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  fontSize: '13px',
                  color: '#cbd5e1',
                  marginBottom: '14px'
                }}
              >
                Daily check-in unlocks after you activate your first plan.
              </div>
              <button
                type="button"
                onClick={() => nav('/plans')}
                className="gradient-btn"
                style={{
                  width: '100%',
                  height: '48px',
                  justifyContent: 'center',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  gap: '8px'
                }}
              >
                <Crown size={18} /> Activate a plan to check in
              </button>
            </div>
          ) : data.claimed_today ? (
            <div style={{ maxWidth: '480px', margin: '0 auto' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 95, 70, 0.3))',
                  border: '1px solid #10b981',
                  borderRadius: '16px',
                  padding: '14px 20px',
                  color: '#6ee7b7',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 18px rgba(16, 185, 129, 0.25)'
                }}
              >
                <CheckCircle2 size={20} color="#10b981" /> Already Checked In Today (+Rs. 10 Claimed)
              </div>
              <small style={{ display: 'block', marginTop: '10px', color: '#64748b', fontSize: '11.5px' }}>
                Next check-in unlocks tomorrow at 00:00 UTC. Keep your streak alive!
              </small>
            </div>
          ) : (
            <div style={{ maxWidth: '480px', margin: '0 auto' }}>
              <button
                type="button"
                onClick={handleClaim}
                disabled={claiming}
                style={{
                  width: '100%',
                  height: '50px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: '16px',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                  transition: 'transform 0.15s ease'
                }}
              >
                {claiming ? (
                  <>
                    <RefreshCw className="spin" size={18} /> Processing Check-in…
                  </>
                ) : (
                  <>
                    <CalendarIcon size={18} /> Claim Daily Check-in (Rs. 10)
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 2. Monthly Calendar Grid Card */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(22, 10, 39, 0.95), rgba(12, 5, 24, 0.95))',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: '24px 20px',
            marginBottom: '22px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)'
          }}
        >
          {/* Calendar Header with Live Clock */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '0.2px' }}>
              {year} | {monthName} | {String(todayDayNum).padStart(2, '0')}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#10b981', fontWeight: 700 }}>
              <Clock size={14} />
              <span>{currentTime.toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Days of Week Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 700,
              color: '#64748b',
              marginBottom: '12px'
            }}
          >
            <span>S</span>
            <span>M</span>
            <span>T</span>
            <span>W</span>
            <span>T</span>
            <span>F</span>
            <span>S</span>
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {calendarCells.map((cell) => {
              if (cell.type === 'empty') {
                return <div key={cell.key} style={{ height: '44px' }} />;
              }

              return (
                <div
                  key={cell.key}
                  style={{
                    height: '44px',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    background: cell.isChecked
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 95, 70, 0.25))'
                      : cell.isToday
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: cell.isToday
                      ? '2px solid #10b981'
                      : cell.isChecked
                      ? '1px solid rgba(16, 185, 129, 0.5)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    boxShadow: cell.isToday ? '0 0 14px rgba(16, 185, 129, 0.3)' : 'none',
                    color: cell.isChecked ? '#6ee7b7' : cell.isToday ? '#ffffff' : '#94a3b8',
                    fontWeight: cell.isToday || cell.isChecked ? 800 : 500,
                    fontSize: '13px'
                  }}
                >
                  <span>{cell.dayNum}</span>
                  {cell.isChecked && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '3px',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: '#10b981'
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Check-in History Table */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(22, 10, 39, 0.95), rgba(12, 5, 24, 0.95))',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
            padding: '24px 20px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#c084fc" />
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                Check-in history
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
              Total Claimed: Rs. {fmt(data.total_checkin_earnings)}
            </span>
          </div>

          {data.history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b', fontSize: '13px' }}>
              {loading ? 'Loading check-in history…' : 'No daily check-ins recorded yet. Claim today to start your streak!'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.history.map((h) => (
                <div
                  key={h.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '14px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                        Day Streak: {h.streak_count}
                      </span>
                      <span
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '8px'
                        }}
                      >
                        Success
                      </span>
                    </div>
                    <small style={{ color: '#64748b', fontSize: '11px' }}>
                      {h.checkin_date} • Credited to Commission Wallet
                    </small>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '15px', color: '#34d399', fontWeight: 800 }}>
                      +Rs. {fmt(h.reward)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Shell>
  );
}
