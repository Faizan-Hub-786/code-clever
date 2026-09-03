import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Wallet,
  Coins,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Plus,
  Send,
  Lock,
  Clock,
  HelpCircle,
  PhoneCall,
  MessageSquare,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
  Layers,
  Sparkles,
  ArrowRight,
  Briefcase,
  X,
  Building2
} from 'lucide-react';
import Shell from '../components/layout/Shell';
import { API_BASE_URL, getAuthHeaders } from '../api/config';
import { fmt } from '../utils/formatters';

const DEFAULT_SAVED_ACCOUNTS = [
  { id: 'jazzcash', name: 'JazzCash', holder: 'Muhammad Faizan', number: '0300-1234567', logo: '/assets/Wallets/jazzcash.svg' },
  { id: 'easypaisa', name: 'Easypaisa', holder: 'Muhammad Faizan', number: '0345-1234567', logo: '/assets/Wallets/easypaisa.svg' },
  { id: 'sadapay', name: 'SadaPay', holder: 'Muhammad Faizan', number: '0300-9876543', logo: '/assets/Wallets/sadapay.svg' },
  { id: 'nayapay', name: 'NayaPay', holder: 'Muhammad Faizan', number: '@faizan', logo: '/assets/Wallets/nayapay.svg' }
];

const PROVIDER_OPTIONS = [
  { id: 'jazzcash', name: 'JazzCash', logo: '/assets/Wallets/jazzcash.svg' },
  { id: 'easypaisa', name: 'Easypaisa', logo: '/assets/Wallets/easypaisa.svg' },
  { id: 'sadapay', name: 'SadaPay', logo: '/assets/Wallets/sadapay.svg' },
  { id: 'nayapay', name: 'NayaPay', logo: '/assets/Wallets/nayapay.svg' },
  { id: 'bank', name: 'Bank Transfer', logo: '/assets/logo.jpeg' }
];

const QUICK_AMOUNTS = [150, 1400, 5500, 14500, 45000, 100000, 1525000, 2589000, 12955000];

export default function WithdrawPage() {
  const nav = useNavigate();
  const [selectedWalletType, setSelectedWalletType] = useState('personal'); // 'personal' | 'commission'
  const [accountsList, setAccountsList] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cc_saved_accounts') || '[]');
      return saved.length ? saved : DEFAULT_SAVED_ACCOUNTS;
    } catch {
      return DEFAULT_SAVED_ACCOUNTS;
    }
  });
  const [selectedAccountId, setSelectedAccountId] = useState('jazzcash');
  const [amount, setAmount] = useState('');
  const [fundPassword, setFundPassword] = useState('');
  const [personalBalance, setPersonalBalance] = useState(0);
  const [commissionBalance, setCommissionBalance] = useState(0);
  const [activePlan, setActivePlan] = useState(null);
  const [recentWithdrawals, setRecentWithdrawals] = useState([]);
  const [submittedBanner, setSubmittedBanner] = useState({
    id: '#WD2026001',
    amount: 4500,
    method: 'JazzCash',
    account: '0300-1234567',
    date: '26 Aug 2026 • 11:50 AM',
    status: 'Pending Review'
  });

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalProvider, setModalProvider] = useState('jazzcash');
  const [modalHolder, setModalHolder] = useState('Muhammad Faizan');
  const [modalNumber, setModalNumber] = useState('');
  const [modalBankName, setModalBankName] = useState('Meezan Bank');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const selectedAccount =
    accountsList.find((a) => a.id === selectedAccountId) || accountsList[0] || DEFAULT_SAVED_ACCOUNTS[0];

  const currentWalletBalance =
    selectedWalletType === 'personal' ? personalBalance : commissionBalance;

  const numAmount = Number(amount || 0);
  const fee = Math.round(numAmount * 0.10 * 100) / 100; // 10% tax on each withdrawal
  const receiveAmount = Math.max(Math.round((numAmount - fee) * 100) / 100, 0);

  const loadWallet = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/wallet`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        const pers = Number(d.personal_balance ?? d.available_balance ?? d.wallet?.personal_balance ?? d.wallet?.available_balance ?? 0);
        const comm = Number(d.commission_balance ?? d.wallet?.commission_balance ?? 0);
        setPersonalBalance(pers);
        setCommissionBalance(comm);
      }
    } catch {}
  };

  const loadRecentWithdrawals = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/withdrawals/my`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d)) setRecentWithdrawals(d);
      }
    } catch {}
  };

  const [withdrawalsEnabled, setWithdrawalsEnabled] = useState(true);

  useEffect(() => {
    loadWallet();
    loadRecentWithdrawals();

    // 1. Fetch site settings to check withdrawals killswitch
    fetch(`${API_BASE_URL}/site-settings`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => {
        if (d && (d.withdrawals_enabled === false || d.withdrawals_enabled === 'false')) {
          setWithdrawalsEnabled(false);
        } else {
          setWithdrawalsEnabled(true);
        }
      })
      .catch(() => {});

    // 2. Fetch active plan
    fetch(`${API_BASE_URL}/plans`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.activePlan) setActivePlan(d.activePlan);
      })
      .catch(() => {});
  }, []);

  const handleSaveNewAccount = (e) => {
    e.preventDefault();
    if (!modalNumber.trim()) {
      setError('Please provide an account or mobile number.');
      return;
    }
    const providerObj = PROVIDER_OPTIONS.find((p) => p.id === modalProvider) || PROVIDER_OPTIONS[0];
    const newAcc = {
      id: `${modalProvider}_${Date.now()}`,
      name: modalProvider === 'bank' ? modalBankName : providerObj.name,
      holder: modalHolder.trim() || 'Muhammad Faizan',
      number: modalNumber.trim(),
      logo: providerObj.logo
    };

    const updated = [newAcc, ...accountsList];
    setAccountsList(updated);
    setSelectedAccountId(newAcc.id);
    try {
      localStorage.setItem('cc_saved_accounts', JSON.stringify(updated));
    } catch {}
    setShowAddModal(false);
    setModalNumber('');
    setMsg(`🎉 ${newAcc.name} account (${newAcc.number}) added successfully!`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');

    if (numAmount < 150) {
      setError('Minimum withdrawal amount is Rs. 150.');
      return;
    }

    if (numAmount > currentWalletBalance) {
      setError(`Insufficient ${selectedWalletType === 'personal' ? 'Personal' : 'Commission'} Wallet balance.`);
      return;
    }

    if (fundPassword.length < 6) {
      setError('Please enter your 6-digit fund security password.');
      return;
    }

    setLoading(true);
    try {
      const r = await fetch(`${API_BASE_URL}/withdrawals`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          method: selectedAccount.id,
          amount: numAmount,
          accountTitle: selectedAccount.holder,
          accountNumber: selectedAccount.number,
          walletType: selectedWalletType,
          fundPassword
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Withdrawal request submission failed.');

      const newId = `#WD${2026000 + Math.floor(Math.random() * 900 + 100)}`;
      const newSubmission = {
        id: newId,
        amount: numAmount,
        method: selectedAccount.name,
        account: selectedAccount.number,
        date: 'Today • Just now',
        status: 'Pending Review'
      };

      setSubmittedBanner(newSubmission);
      setRecentWithdrawals((prev) => [newSubmission, ...prev]);
      setMsg('Withdrawal request submitted successfully! Funds will be dispatched after approval.');
      loadRecentWithdrawals();
      loadWallet();
      setAmount('');
      setFundPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <div className="withdraw-v2-page">
        {/* Top Header Bar */}
        <div className="deposit-top-bar">
          <div className="deposit-top-left">
            <button className="deposit-back-btn" onClick={() => nav('/wallet')} title="Back">
              <ChevronLeft size={22} />
            </button>
            <div className="deposit-brand">
              <img src="/assets/logo.jpeg" alt="Code Clever" />
              <span>CODE CLEVER</span>
            </div>
          </div>
          <div className="wallet-top-pill">
            <Wallet size={18} />
            <div>
              <span>Available Balance</span>
              <strong>Rs. {fmt(personalBalance + commissionBalance)}</strong>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="plans-hero" style={{ marginBottom: '22px' }}>
          <div className="plans-hero-copy">
            <h1 style={{ fontSize: '32px' }}>WITHDRAW</h1>
            <p style={{ margin: '4px 0 0', color: '#9b92b1', fontSize: '13.5px' }}>
              Withdraw your eligible earnings
            </p>
          </div>
          <div className="plans-hero-art">
            <div className="plans-briefcase-wrap">
              <Briefcase size={52} />
              <div className="briefcase-logo">
                <img src="/assets/logo.jpeg" alt="Code Clever" />
              </div>
            </div>
            <div className="floating-coins">
              <Coins size={24} />
            </div>
          </div>
        </div>

        {/* Alerts */}
        {msg && (
          <motion.div
            className="task-message"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '18px' }}
          >
            <CheckCircle2 size={18} /> {msg}
          </motion.div>
        )}

        {error && (
          <motion.div
            className="auth-error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '18px' }}
          >
            <AlertCircle size={18} /> {error}
          </motion.div>
        )}

        {/* 1. Withdrawal Status Banner */}
        <div className="withdraw-status-banner">
          <div className="status-banner-left">
            <div className="status-shield-icon">
              <ShieldAlert size={26} />
            </div>
            <div className="status-banner-text">
              <small>Withdrawal Status</small>
              <h3>{activePlan ? `Withdrawals Unlocked (${activePlan.code})` : 'Withdrawal unavailable'}</h3>
              <p>
                {activePlan
                  ? 'Your account is active. You can request settlements anytime.'
                  : 'Activate an earning package to unlock withdrawals.'}
              </p>
            </div>
          </div>
          <button className="view-plans-pill-btn" onClick={() => nav('/plans')}>
            View Plans <ArrowRight size={14} />
          </button>
        </div>

        {/* 1.5 Official Daily Withdrawal Schedule & Processing Speed Card */}
        <div className="withdraw-schedule-card">
          <div className="schedule-header">
            <div className="schedule-icon-badge">
              <Clock size={20} />
            </div>
            <div>
              <h4>Official Daily Withdrawal Schedule & Processing Speed</h4>
              <p>Standard processing timeline for JazzCash, Easypaisa, SadaPay & Bank Transfers.</p>
            </div>
          </div>

          <div className="schedule-grid">
            <div className="schedule-item">
              <span className="schedule-label">🕒 Operating Hours</span>
              <strong className="schedule-val">10:00 AM – 06:00 PM PKT</strong>
              <small className="schedule-sub">Every Monday to Saturday (Sunday Closed)</small>
            </div>

            <div className="schedule-item">
              <span className="schedule-label">⚡ Expected Arrival Speed</span>
              <strong className="schedule-val" style={{ color: '#4ade80' }}>10 to 15 Minutes</strong>
              <small className="schedule-sub">May take up to 2 hours during peak request traffic</small>
            </div>
          </div>
        </div>

        {/* 2. Dual Wallet Balance Cards */}
        <div className="dual-wallets-grid">
          <div className="wallet-stat-card">
            <div className="wallet-stat-icon">
              <Wallet size={26} />
            </div>
            <div className="wallet-stat-info">
              <small>PERSONAL WALLET</small>
              <strong>Rs. {fmt(personalBalance)}</strong>
              <span>Deposited funds</span>
            </div>
          </div>

          <div className="wallet-stat-card">
            <div className="wallet-stat-icon">
              <Coins size={26} />
            </div>
            <div className="wallet-stat-info">
              <small>COMMISSION WALLET</small>
              <strong>Rs. {fmt(commissionBalance)}</strong>
              <span>Task & referral earnings</span>
            </div>
          </div>
        </div>

        {/* 3. Saved Accounts Section */}
        <div className="saved-accounts-card">
          <div className="saved-accounts-head">
            <h3>
              <ShieldCheck size={18} color="#cb4eff" /> Saved Accounts
            </h3>
            <span onClick={() => setShowAddModal(true)}>
              Manage Accounts <ChevronRight size={14} />
            </span>
          </div>

          <div className="saved-accounts-grid">
            {accountsList.map((acc) => {
              const isSelected = selectedAccountId === acc.id;
              return (
                <div
                  key={acc.id}
                  className={`saved-account-item ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedAccountId(acc.id)}
                >
                  <div className="saved-radio-badge">
                    {isSelected && <Check size={11} />}
                  </div>
                  <img src={acc.logo} alt={acc.name} className="saved-account-logo" />
                  <b>{acc.name}</b>
                  <small>{acc.holder}</small>
                  <small style={{ color: '#6e6780', fontSize: '9.5px' }}>{acc.number}</small>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="add-account-btn"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} /> Add New Account
          </button>
        </div>

        {/* 4. Request Withdrawal Form */}
        <form className="request-withdraw-card" onSubmit={handleSubmit} autoComplete="off" data-lpignore="true">
          <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
          <input type="password" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
          <div className="request-withdraw-head">
            <h3>
              <Sparkles size={18} color="#cb4eff" /> Request Withdrawal
            </h3>
            <p>Enter the details below to submit your withdrawal request.</p>
          </div>

          {/* Row 1: Wallet Selector & Payout Method */}
          <div className="form-row-2col">
            <div className="field-group">
              <label>Withdrawal Wallet</label>
              <div className="wallet-toggle-btn-group">
                <button
                  type="button"
                  className={`wallet-toggle-btn ${selectedWalletType === 'personal' ? 'active' : ''}`}
                  onClick={() => setSelectedWalletType('personal')}
                >
                  Personal Wallet
                </button>
                <button
                  type="button"
                  className={`wallet-toggle-btn ${selectedWalletType === 'commission' ? 'active' : ''}`}
                  onClick={() => setSelectedWalletType('commission')}
                >
                  Commission Wallet
                </button>
              </div>
            </div>

            <div className="field-group">
              <label>Payout Method</label>
              <div className="selected-acct-card" onClick={() => setShowAddModal(true)} style={{ cursor: 'pointer' }}>
                <img src={selectedAccount.logo} alt={selectedAccount.name} />
                <span>{selectedAccount.name}</span>
                <small>Auto Selected ▾</small>
              </div>
            </div>
          </div>

          {/* Row 2: Account Details & Amount Input */}
          <div className="form-row-2col">
            <div className="field-group">
              <label>Account Details</label>
              <div className="selected-acct-card" onClick={() => setShowAddModal(true)} style={{ cursor: 'pointer' }}>
                <img src={selectedAccount.logo} alt={selectedAccount.name} />
                <div>
                  <b style={{ fontSize: '13px', display: 'block' }}>{selectedAccount.holder}</b>
                  <small style={{ color: '#8e879f', fontSize: '10.5px' }}>{selectedAccount.number}</small>
                </div>
                <ChevronRight size={16} color="#6c647d" style={{ marginLeft: 'auto' }} />
              </div>
            </div>

            <div className="field-group">
              <label>Amount</label>
              <div className="custom-amount-input">
                <span>PKR</span>
                <input
                  required
                  type="number"
                  placeholder="Enter withdrawal amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Quick Amounts Chips (Only amounts below or equal to selected wallet balance are shown) */}
          <div className="quick-amounts-wrap">
            {QUICK_AMOUNTS.filter((amt) => amt <= currentWalletBalance).length > 0 ? (
              QUICK_AMOUNTS.filter((amt) => amt <= currentWalletBalance).map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className={`quick-amt-chip ${numAmount === amt ? 'active' : ''}`}
                  onClick={() => setAmount(String(amt))}
                >
                  Rs. {fmt(amt)}
                </button>
              ))
            ) : (
              <div style={{ color: '#9b92b1', fontSize: '12px', padding: '6px 4px' }}>
                💡 No preset amounts available below your {selectedWalletType === 'personal' ? 'Personal' : 'Commission'} Wallet balance (Rs. {fmt(currentWalletBalance)}). You can manually enter an amount above.
              </div>
            )}
          </div>

          {/* Fee & Receive Calculation Cards */}
          <div className="calculation-cards-grid">
            <div className="calc-card">
              <div className="calc-card-icon">
                <Coins size={20} />
              </div>
              <div className="calc-card-text">
                <small>10% Platform Tax</small>
                <strong>Rs. {fmt(fee)}</strong>
              </div>
            </div>

            <div className="calc-card">
              <div className="calc-card-icon">
                <ArrowRight size={20} />
              </div>
              <div className="calc-card-text">
                <small>You will receive</small>
                <strong>Rs. {fmt(receiveAmount)}</strong>
              </div>
              <Info size={16} color="#8e879f" style={{ marginLeft: 'auto' }} />
            </div>
          </div>

          {/* Fund Password */}
          <div className="fund-password-row">
            <Lock size={20} />
            <div className="fund-left">
              <label>Fund Password (6-Digit PIN)</label>
              <input
                required
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoComplete="new-password"
                placeholder="Enter 6-digit PIN manually"
                value={fundPassword}
                onChange={(e) => setFundPassword(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <a onClick={() => nav('/settings/security')}>Forgot fund password?</a>
          </div>

          {!withdrawalsEnabled && (
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', padding: '12px 16px', borderRadius: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px' }}>
              <AlertCircle size={18} />
              <span><b>Withdrawal Gateway Paused:</b> Cashout withdrawals are temporarily on hold by administration.</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="gradient-btn"
            disabled={loading || !withdrawalsEnabled}
            style={{ width: '100%', height: '50px', justifyContent: 'center', fontSize: '15px' }}
          >
            {loading ? (
              <>
                <RefreshCw className="spin" size={18} /> Processing Withdrawal…
              </>
            ) : !withdrawalsEnabled ? (
              'Withdrawal Gateway Currently Paused'
            ) : (
              <>
                <Send size={18} /> Submit Withdrawal Request
              </>
            )}
          </button>
        </form>

        {/* 5. Real-time Withdrawal Tracking Banner */}
        {submittedBanner && (
          <div className="submitted-tracking-banner">
            <div className="tracking-clock-icon">
              <Clock size={24} />
            </div>
            <div className="tracking-title-wrap">
              <h4>
                Withdrawal Request Submitted
                <span className="deposit-status-pill pending" style={{ fontSize: '10px' }}>
                  {submittedBanner.status}
                </span>
              </h4>
              <p>Your withdrawal request has been submitted successfully and is awaiting verification.</p>
            </div>
            <div className="tracking-details-col">
              <div>
                <span>Request ID</span>
                <b>{submittedBanner.id}</b>
              </div>
              <div style={{ marginTop: '4px' }}>
                <span>Amount</span>
                <b>Rs. {fmt(submittedBanner.amount)}</b>
              </div>
              <div style={{ marginTop: '4px' }}>
                <span>Payout Method</span>
                <b>{submittedBanner.method}</b>
              </div>
              <span style={{ fontSize: '10px', marginTop: '4px' }}>{submittedBanner.date}</span>
            </div>
          </div>
        )}

        {/* 6. Withdrawal Information & Support */}
        <div className="support-cards-grid">
          <div className="info-rules-card">
            <h4>
              <ShieldCheck size={16} color="#cb4eff" /> Withdrawal Information
            </h4>
            <ul>
              <li><b>🕒 Operating Hours:</b> Requests accepted Monday to Saturday, 10:00 AM – 06:00 PM PKT (Sunday closed).</li>
              <li><b>⚡ Processing Speed:</b> Usually credited within 10 – 15 minutes (may take up to 2 hours during peak volume).</li>
              <li><b>🔒 Account Ownership:</b> The selected payout account title must belong to the registered member.</li>
              <li><b>✅ Payout Methods:</b> Fast settlements to JazzCash, Easypaisa, SadaPay, NayaPay & All Pakistani Banks.</li>
              <li><b>🛡️ Security Check:</b> Ensure your 6-digit Fund Password is kept confidential.</li>
            </ul>
          </div>

          <div className="support-action-card">
            <h4>
              <HelpCircle size={16} color="#cb4eff" /> Support & Inquiries
            </h4>
            <p style={{ fontSize: '12px', color: '#8e879f', margin: '0 0 14px' }}>
              Have questions about your payout settlement or account? Contact our team 24/7.
            </p>
            <div className="support-btns-row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                className="support-pill-btn"
                style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: '#fff', border: 'none', fontWeight: 700, padding: '10px 18px' }}
                onClick={() => nav('/support')}
              >
                <HelpCircle size={15} color="#fff" /> In-App Help & Support
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Gmail Icon */}
                <a
                  href="mailto:code.clever.space@gmail.com?subject=Code%20Clever%20Support%20Query&body=Hello%20Code%20Clever%20Team,%0A%0AI%20have%20a%20query%20regarding%20my%20account:%0A- Full Name:%20%0A- Phone/Email:%20%0A- Query Details:%20"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(234, 67, 53, 0.12)',
                    border: '1px solid rgba(234, 67, 53, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#EA4335',
                    transition: 'all 0.2s ease',
                    textDecoration: 'none',
                    cursor: 'pointer'
                  }}
                  title="Gmail: code.clever.space@gmail.com"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="#EA4335" fillOpacity="0.2"/>
                    <path d="M22 6l-10 7L2 6" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="2" y="4" width="20" height="16" rx="2" stroke="#EA4335" strokeWidth="2"/>
                  </svg>
                </a>

                {/* Instagram Icon */}
                <a
                  href="https://www.instagram.com/code.clever.space/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(225, 48, 108, 0.12)',
                    border: '1px solid rgba(225, 48, 108, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#e1306c',
                    transition: 'all 0.2s ease',
                    textDecoration: 'none',
                    cursor: 'pointer'
                  }}
                  title="Instagram: @code.clever.space"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e1306c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </a>

                {/* TikTok Icon */}
                <a
                  href="https://www.tiktok.com/@code.clever"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(0, 242, 254, 0.1)',
                    border: '1px solid rgba(0, 242, 254, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00f2fe',
                    transition: 'all 0.2s ease',
                    textDecoration: 'none',
                    cursor: 'pointer'
                  }}
                  title="TikTok: @code.clever"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#00f2fe">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .57.04.84.11V9.41a6.33 6.33 0 0 0-.84-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 8.79 5.86c3.27-1.35 4.89-4.8 4.89-8.31V8.58c1.37.98 3.03 1.56 4.77 1.56v-3.45z"/>
                  </svg>
                </a>

                {/* Facebook Icon */}
                <a
                  href="https://www.facebook.com/code.clever.space"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(24, 119, 242, 0.12)',
                    border: '1px solid rgba(24, 119, 242, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1877f2',
                    transition: 'all 0.2s ease',
                    textDecoration: 'none',
                    cursor: 'pointer'
                  }}
                  title="Facebook: @code.clever.space"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 7. Withdrawal History */}
        <div className="recent-deposits-wrap">
          <div className="recent-deposits-head">
            <h3>
              <Clock size={18} color="#cb4eff" /> Withdrawal History
            </h3>
            <button onClick={() => nav('/wallet')}>
              View All <ChevronRight size={14} />
            </button>
          </div>

          <div className="deposit-history-list">
            {recentWithdrawals.length > 0 ? (
              recentWithdrawals.map((item, idx) => {
                const logo =
                  PROVIDER_OPTIONS.find((a) => a.name.toLowerCase() === (item.method || '').toLowerCase())?.logo ||
                  '/assets/Wallets/jazzcash.svg';
                const status = (item.status || 'pending review').toLowerCase();

                return (
                  <div key={idx} className="deposit-history-row">
                    <img src={logo} alt="Wallet" className="deposit-history-logo" />
                    <div className="deposit-history-copy">
                      <strong>
                        {item.id} • Rs. {fmt(item.amount)}
                      </strong>
                      <span>
                        {item.walletType || 'Commission Wallet'} • {item.method} • {item.date}
                      </span>
                    </div>
                    <div
                      className={`deposit-status-pill ${
                        status.includes('approved') ? 'approved' : status.includes('rejected') ? 'rejected' : 'pending'
                      }`}
                    >
                      {item.status || 'Pending Review'}
                    </div>
                    <ChevronRight size={16} color="#6c647d" />
                  </div>
                );
              })
            ) : (
              <div className="deposit-history-row">
                <img src="/assets/Wallets/jazzcash.svg" alt="Wallet" className="deposit-history-logo" />
                <div className="deposit-history-copy">
                  <strong>#WD2026001 • Rs. 4,500</strong>
                  <span>Commission Wallet • JazzCash • 26 Aug 2026 • 11:50 AM</span>
                </div>
                <div className="deposit-status-pill pending">Pending Review</div>
              </div>
            )}
          </div>
        </div>

        {/* ===================== ADD NEW ACCOUNT MODAL ===================== */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              className="add-account-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="add-account-modal"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
              >
                <div className="add-account-head">
                  <h3>
                    <ShieldCheck size={22} color="#c45eff" /> Add Payout Account
                  </h3>
                  <button
                    type="button"
                    className="modal-close-btn"
                    onClick={() => setShowAddModal(false)}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveNewAccount} autoComplete="off" data-lpignore="true">
                  <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                  <label className="field-label" style={{ fontSize: '11px', color: '#a69db2', display: 'block', marginBottom: '8px' }}>
                    Select Provider / Gateway
                  </label>
                  <div className="provider-options-grid">
                    {PROVIDER_OPTIONS.map((opt) => (
                      <div
                        key={opt.id}
                        className={`provider-option-btn ${modalProvider === opt.id ? 'active' : ''}`}
                        onClick={() => setModalProvider(opt.id)}
                      >
                        <img src={opt.logo} alt={opt.name} />
                        <span>{opt.name}</span>
                      </div>
                    ))}
                  </div>

                  {modalProvider === 'bank' && (
                    <div style={{ marginBottom: '14px' }}>
                      <label className="field-label" style={{ fontSize: '11px', color: '#a69db2', display: 'block', marginBottom: '6px' }}>
                        Bank Name
                      </label>
                      <div className="profile-input-field">
                        <Building2 size={18} className="field-icon" />
                        <div className="field-content">
                          <input
                            type="text"
                            placeholder="e.g. Meezan Bank, HBL, UBL, Alfalah"
                            value={modalBankName}
                            onChange={(e) => setModalBankName(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <label className="field-label" style={{ fontSize: '11px', color: '#a69db2', display: 'block', marginBottom: '6px' }}>
                    Account Holder Name
                  </label>
                  <div className="profile-input-field" style={{ marginBottom: '14px' }}>
                    <div className="field-content">
                      <input
                        required
                        type="text"
                        placeholder="Exact name on bank account"
                        value={modalHolder}
                        onChange={(e) => setModalHolder(e.target.value)}
                      />
                    </div>
                  </div>

                  <label className="field-label" style={{ fontSize: '11px', color: '#a69db2', display: 'block', marginBottom: '6px' }}>
                    Account Number / Mobile / IBAN
                  </label>
                  <div className="profile-input-field" style={{ marginBottom: '20px' }}>
                    <div className="field-content">
                      <input
                        required
                        type="text"
                        placeholder="e.g. 03001234567 or PK..."
                        value={modalNumber}
                        onChange={(e) => setModalNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="gradient-btn"
                    style={{ width: '100%', height: '48px', justifyContent: 'center', fontSize: '14.5px' }}
                  >
                    <Plus size={16} /> Save Account Details
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}
