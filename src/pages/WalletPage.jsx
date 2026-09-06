import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wallet,
  WalletCards,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import Shell from '../components/layout/Shell';
import Stat from '../components/common/Stat';
import { API_BASE_URL, getAuthHeaders } from '../api/config';
import { fmt, fmtDate } from '../utils/formatters';
import { getCachedWallet, setCachedWallet } from '../utils/walletCache';

export default function WalletPage() {
  const nav = useNavigate();
  const [wallet, setWallet] = useState(() => {
    const cached = getCachedWallet();
    return {
      available_balance: cached.total_balance ?? (cached.available_balance + cached.commission_balance),
      personal_balance: cached.personal_balance ?? cached.available_balance,
      commission_balance: cached.commission_balance,
      total_balance: cached.total_balance,
      pending_balance: cached.pending_balance || 0,
      lifetime_earned: cached.lifetime_earned || 0,
      total_withdrawn: 0
    };
  });
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/wallet`, { headers: getAuthHeaders() });
        if (r.ok) {
          const d = await r.json();
          const w = d.wallet || d || {};
          setWallet(w);
          setTransactions(d.transactions || []);
          setCachedWallet({
            available_balance: w.available_balance,
            personal_balance: w.personal_balance,
            commission_balance: w.commission_balance,
            total_balance: w.total_balance,
            pending_balance: w.pending_balance,
            lifetime_earned: w.lifetime_earned
          });
        }
      } catch {}
      setLoading(false);
    };
    fetchWallet();

    const handleWalletUpdate = (e) => {
      const u = e.detail;
      if (!u) return;
      setWallet((prev) => ({
        ...prev,
        available_balance: u.total_balance ?? (u.available_balance + u.commission_balance),
        personal_balance: u.personal_balance ?? u.available_balance,
        commission_balance: u.commission_balance,
        total_balance: u.total_balance,
        lifetime_earned: u.lifetime_earned ?? prev.lifetime_earned
      }));
    };
    window.addEventListener('cc_wallet_updated', handleWalletUpdate);
    return () => window.removeEventListener('cc_wallet_updated', handleWalletUpdate);
  }, []);

  const filtered = transactions.filter((t) => {
    if (filter === 'all') return true;
    return (t.type || '').toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <Shell>
      <div className="wallet-page">
        <div className="wallet-hero">
          <div className="wallet-hero-icon">
            <WalletCards size={48} />
          </div>
          <div>
            <span>Your Available Balance</span>
            <strong>Rs. {fmt(wallet.available_balance)}</strong>
            <small>Pending Settlement: Rs. {fmt(wallet.pending_balance)}</small>
          </div>
          <div className="wallet-hero-actions">
            <button className="gradient-btn" onClick={() => nav('/deposit')}>
              <ArrowDownLeft size={18} /> Deposit Funds
            </button>
            <button className="outline-btn" onClick={() => nav('/withdraw')}>
              <ArrowUpRight size={18} /> Withdraw
            </button>
          </div>
        </div>

        <div className="stats">
          <Stat
            icon={Wallet}
            label="Personal Wallet"
            value={`Rs. ${fmt(wallet.personal_balance || wallet.available_balance)}`}
            sub="Deposit & Intern Tasks"
          />
          <Stat
            icon={Coins}
            label="Commission Wallet"
            value={`Rs. ${fmt(wallet.commission_balance || 0)}`}
            sub="Tasks & Team Rewards"
          />
          <Stat
            icon={Clock}
            label="Pending In-Review"
            value={`Rs. ${fmt(wallet.pending_balance)}`}
            sub="Under verification"
          />
          <Stat
            icon={TrendingUp}
            label="Lifetime Earnings"
            value={`Rs. ${fmt(wallet.lifetime_earned)}`}
            sub="All tasks & bonuses"
          />
        </div>

        <div className="section-title">
          <div>
            <h2>Transaction Ledger</h2>
            <p>Cryptographically verified immutable record of all wallet activity.</p>
          </div>
          <div className="level-filter">
            {['all', 'deposit', 'withdrawal', 'reward', 'commission'].map((f) => (
              <button
                key={f}
                className={filter === f ? 'active' : ''}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="admin-table-wrap desktop-table-view">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Balance After</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, idx) => {
                const isPositive = t.direction ? t.direction === 'credit' : ['deposit', 'task_reward', 'commission', 'wheel_win', 'bonus', 'spin_reward', 'daily_checkin'].includes(t.type);
                return (
                  <tr key={t.id || idx}>
                    <td>{fmtDate(t.created_at)}</td>
                    <td>
                      <span className={`status-chip ${t.type}`}>{t.type?.replace(/_/g, ' ')}</span>
                    </td>
                    <td>{t.description || 'Transaction'}</td>
                    <td>
                      <b style={{ color: isPositive ? '#4ade80' : '#f87171' }}>
                        {isPositive ? '+' : '-'} Rs. {fmt(t.amount)}
                      </b>
                    </td>
                    <td>Rs. {fmt(t.balance_after)}</td>
                    <td>
                      <span className={`status-chip ${t.status || 'completed'}`}>
                        {t.status || 'completed'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Zero-Scroll Cards View */}
        <div className="mobile-tx-cards-view">
          {filtered.map((t, idx) => {
            const isPositive = t.direction ? t.direction === 'credit' : ['deposit', 'task_reward', 'commission', 'wheel_win', 'bonus', 'spin_reward', 'daily_checkin'].includes(t.type);
            return (
              <div key={t.id || idx} className="mobile-tx-card">
                <div className="mobile-tx-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`status-chip ${t.type}`}>{t.type?.replace(/_/g, ' ')}</span>
                    <small style={{ color: '#94a3b8', fontSize: '11px' }}>{fmtDate(t.created_at)}</small>
                  </div>
                  <b style={{ color: isPositive ? '#4ade80' : '#f87171', fontSize: '15px', fontWeight: 800 }}>
                    {isPositive ? '+' : '-'} Rs. {fmt(t.amount)}
                  </b>
                </div>
                <div className="mobile-tx-card-bottom">
                  <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 500 }}>
                    {t.description || 'Wallet Transaction'}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <small style={{ color: '#a78bfa', fontSize: '11px' }}>
                      Balance After: <b>Rs. {fmt(t.balance_after)}</b>
                    </small>
                    <span className={`status-chip ${t.status || 'completed'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                      {t.status || 'completed'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {!filtered.length && (
            <div className="wallet-empty" style={{ padding: '30px 15px' }}>
              <Receipt size={32} />
              <p>No transactions found in this category.</p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
