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

export default function WalletPage() {
  const nav = useNavigate();
  const [wallet, setWallet] = useState({
    available_balance: 0,
    personal_balance: 0,
    commission_balance: 0,
    pending_balance: 0,
    lifetime_earned: 0,
    total_withdrawn: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/wallet`, { headers: getAuthHeaders() });
        if (r.ok) {
          const d = await r.json();
          setWallet(d.wallet || d || {});
          setTransactions(d.transactions || []);
        }
      } catch {}
      setLoading(false);
    };
    fetchWallet();
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

        <div className="admin-table-wrap">
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
                const isPositive = ['deposit', 'task_reward', 'commission', 'wheel_win'].includes(t.type);
                return (
                  <tr key={t.id || idx}>
                    <td>{fmtDate(t.created_at)}</td>
                    <td>
                      <span className={`status-chip ${t.type}`}>{t.type?.replace('_', ' ')}</span>
                    </td>
                    <td>{t.description || 'Transaction'}</td>
                    <td>
                      <b style={{ color: isPositive ? '#7ee0aa' : '#ff7a7a' }}>
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
      </div>
    </Shell>
  );
}
