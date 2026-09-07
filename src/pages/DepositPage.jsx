import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Wallet,
  Gift,
  CreditCard,
  Clock,
  Copy,
  Check,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Lock,
  Layers,
  Sparkles,
  ChevronRight,
  User,
  Phone,
  Hash,
  FileCheck
} from 'lucide-react';
import Shell from '../components/layout/Shell';
import { API_BASE_URL, getAuthHeaders } from '../api/config';
import { fmt, normalizeImageUrl } from '../utils/formatters';
import DualImageUpload from '../components/common/DualImageUpload';

const PACKAGE_PRICES = {
  C1: 3500,
  C2: 15500,
  C3: 59000,
  C4: 215000,
  C5: 479000,
  C6: 1454000,
  C7: 3869000,
  C8: 7349000,
  C9: 15149000
};

const PAYMENT_METHODS = [
  {
    id: 'jazzcash',
    name: 'JazzCash',
    accountLabel: 'JazzCash Business Till',
    subtitle: 'Mobile Wallet',
    logo: '/assets/Wallets/jazzcash.svg',
    accountName: 'Code Clever Payments',
    accountNumber: '03254138875'
  },
  {
    id: 'sadapay',
    name: 'SadaPay',
    accountLabel: 'SadaPay Account',
    subtitle: 'Digital Wallet',
    logo: '/assets/Wallets/sadapay.svg',
    accountName: 'Code Clever Treasury',
    accountNumber: '03254138875'
  },
  {
    id: 'easypaisa',
    name: 'Easypaisa',
    accountLabel: 'Easypaisa Mobile Account',
    subtitle: 'Mobile Wallet',
    logo: '/assets/Wallets/easypaisa.svg',
    accountName: 'Code Clever Finance',
    accountNumber: '03451234567'
  },
  {
    id: 'nayapay',
    name: 'NayaPay',
    accountLabel: 'NayaPay Wallet ID',
    subtitle: 'Digital Wallet',
    logo: '/assets/Wallets/nayapay.svg',
    accountName: 'Code Clever Operations',
    accountNumber: '@codeclever'
  }
];

export default function DepositPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(1); // 1 = Select method & pkg, 2 = Confirm & submit
  const [selectedPkg, setSelectedPkg] = useState('C1');
  const [paymentMethods, setPaymentMethods] = useState(PAYMENT_METHODS);
  const [selectedMethodId, setSelectedMethodId] = useState('jazzcash');
  const [walletBalance, setWalletBalance] = useState(0);

  // Form states (Step 2)
  const [senderName, setSenderName] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [txId, setTxId] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(288); // 04:48
  const [recentDeposits, setRecentDeposits] = useState([]);

  const selectedMethod =
    paymentMethods.find((m) => m.id === selectedMethodId) || paymentMethods[0] || PAYMENT_METHODS[0];
  const depositAmount = PACKAGE_PRICES[selectedPkg] || 3500;

  const loadPaymentMethods = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/payment-methods?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d) && d.length > 0) {
          setPaymentMethods(d);
          if (!d.some(m => m.id === selectedMethodId)) {
            setSelectedMethodId(d[0].id);
          }
        }
      }
    } catch {}
  };

  const loadRecentDeposits = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/deposits/my`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d)) setRecentDeposits(d);
      }
    } catch {}
  };

  const loadWallet = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/wallet`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        setWalletBalance(Number(d.available_balance ?? d.wallet?.available_balance ?? 0));
      }
    } catch {}
  };

  const [depositsEnabled, setDepositsEnabled] = useState(true);

  useEffect(() => {
    loadPaymentMethods();
    loadWallet();
    loadRecentDeposits();

    const handleBankUpdate = () => loadPaymentMethods();
    window.addEventListener('cc_bank_updated', handleBankUpdate);

    fetch(`${API_BASE_URL}/site-settings`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => {
        if (d && (d.deposits_enabled === false || d.deposits_enabled === 'false')) {
          setDepositsEnabled(false);
        } else {
          setDepositsEnabled(true);
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('cc_bank_updated', handleBankUpdate);
    };
  }, []);

  // 5-minute countdown timer on Step 2
  useEffect(() => {
    if (step !== 2) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSelectMethod = (methodId) => {
    setSelectedMethodId(methodId);
    setMsg('');
    setError('');
    setStep(2);
    setSecondsLeft(288); // Reset 04:48 timer
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(selectedMethod.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      `${selectedMethod.name}:${selectedMethod.accountNumber}?amount=${depositAmount}`
    )}`;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `${selectedMethod.name}_QRCode.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProofImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmitDeposit = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');

    if (!senderName.trim()) {
      setError('Please enter the Sender Name (Account Holder Name).');
      return;
    }

    if (!senderNumber.trim()) {
      setError('Please enter the Sender Account / Mobile Number.');
      return;
    }

    if (!txId.trim()) {
      setError('Please provide your Transaction ID / TID number.');
      return;
    }

    if (!proofImage || !proofImage.trim()) {
      setError('Payment proof screenshot or URL is compulsory. Please attach payment receipt proof.');
      return;
    }

    setLoading(true);
    try {
      const r = await fetch(`${API_BASE_URL}/deposits`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          method: selectedMethod.id,
          amount: depositAmount,
          senderName: senderName.trim(),
          senderNumber: senderNumber.trim(),
          transactionReference: txId.trim(),
          txId: txId.trim(),
          packageCode: selectedPkg,
          proofImage: proofImage.trim()
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Deposit submission failed.');
      setMsg('Payment submitted successfully! Your deposit is now pending verification.');
      setTxId('');
      setSenderName('');
      setSenderNumber('');
      setProofImage('');
      loadRecentDeposits();
      loadWallet();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <div className="deposit-v2-page">
        {/* Top Header Bar */}
        <div className="deposit-top-bar">
          <div className="deposit-top-left">
            <button
              className="deposit-back-btn"
              onClick={() => (step === 2 ? setStep(1) : nav('/wallet'))}
              title="Back"
            >
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
              <span>Wallet Balance</span>
              <strong>Rs. {fmt(walletBalance)}</strong>
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

        {/* ======================= STEP 1: SELECT PACKAGE & METHOD ======================= */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
          >
            <div style={{ marginBottom: '18px' }}>
              <h1 style={{ fontSize: '28px', margin: '0 0 4px', fontWeight: 800 }}>Deposit</h1>
              <p style={{ margin: 0, color: '#9b92b1', fontSize: '13px' }}>
                Choose a payment method
              </p>
            </div>

            {/* Hero Selected Package Card */}
            <div className="deposit-hero-card">
              <div className="deposit-package-info">
                <small>SELECTED PACKAGE</small>
                <h2>
                  {selectedPkg}
                  <Layers size={22} color="#c45eff" />
                </h2>
                <small>DEPOSIT AMOUNT</small>
                <strong>
                  <span>PKR </span>
                  {fmt(depositAmount)}
                </strong>
              </div>
              <div className="deposit-wallet-art">
                <div className="wallet-glow-circle" />
                <div className="wallet-3d-emblem">
                  <Wallet size={48} />
                </div>
                <div className="floating-deposit-coin">
                  <Sparkles size={16} />
                </div>
              </div>
            </div>

            {/* Select Package Pills */}
            <div className="section-label">
              <Gift size={18} /> Select Package
            </div>
            <div className="package-pills-row">
              {['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9'].map((code) => (
                <button
                  key={code}
                  className={`package-pill ${selectedPkg === code ? 'active' : ''}`}
                  onClick={() => setSelectedPkg(code)}
                >
                  {code}
                </button>
              ))}
            </div>

            {/* Choose Payment Method Grid */}
            <div className="section-label">
              <CreditCard size={18} /> Choose Payment Method
            </div>
            <div className="payment-methods-grid">
              {paymentMethods.map((m) => {
                const isSelected = selectedMethodId === m.id;
                return (
                  <motion.div
                    key={m.id}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    className={`payment-method-card ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectMethod(m.id)}
                  >
                    <div className="method-radio-badge">
                      {isSelected && <Check size={12} />}
                    </div>
                    {m.logo && <img src={m.logo} alt={m.name} className="payment-method-logo" />}
                    <b>{m.name}</b>
                    <span>{m.accountLabel || m.subtitle || 'Mobile Wallet'}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ======================= STEP 2: CONFIRM & SUBMIT PAYMENT ======================= */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
          >
            {/* Method Header Banner */}
            <div className="method-header-banner">
              {selectedMethod.logo && (
                <img src={selectedMethod.logo} alt={selectedMethod.name} className="method-header-logo" />
              )}
              <div className="method-header-text">
                <h2>{selectedMethod.name}</h2>
                <p>{selectedMethod.instructions || 'Complete your payment securely 🛡️'}</p>
              </div>
            </div>

            {/* Circular Countdown Timer */}
            <div className="timer-box-card">
              <div className="timer-circular">
                <strong>{formatTimer(secondsLeft)}</strong>
              </div>
              <div className="timer-info">
                <h3>Complete Payment</h3>
                <p>Complete your payment and submit the details before the session expires.</p>
              </div>
            </div>

            {/* Package & Payment Details (2 Columns) */}
            <div className="deposit-details-grid">
              <div className="details-left-card">
                <div style={{ color: '#8f87a1', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                  Selected Package
                </div>
                <h2 style={{ fontSize: '28px', margin: '6px 0 14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={22} color="#c45eff" /> {selectedPkg}
                </h2>
                <div style={{ color: '#8f87a1', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                  Deposit Amount
                </div>
                <strong style={{ fontSize: '24px', color: '#f0ebfa', marginTop: '4px' }}>
                  <span style={{ color: '#c45eff' }}>PKR </span>
                  {fmt(depositAmount)}
                </strong>
              </div>

              <div className="details-right-card">
                <div className="details-right-top">
                  <div className="payment-text-details">
                    <h4>Payment Details</h4>
                    <span style={{ fontSize: '11px', color: '#8f87a1' }}>Account Name</span>
                    <b>{selectedMethod.accountName || 'Code Clever Payments'}</b>

                    <span style={{ fontSize: '11px', color: '#8f87a1' }}>Account Number</span>
                    <b>{selectedMethod.accountNumber || '—'}</b>

                    {selectedMethod.accountLabel && (
                      <span style={{ fontSize: '11px', color: '#cb4eff', marginTop: '4px', fontWeight: 700 }}>
                        {selectedMethod.accountLabel}
                      </span>
                    )}

                    <button className="copy-acct-btn" onClick={handleCopyAccount}>
                      {copied ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                      {copied ? 'Copied to Clipboard' : 'Copy Account Number'}
                    </button>
                  </div>

                  <div className="qr-wrapper">
                    <img
                      className="qr-img-tag"
                      src={
                        selectedMethod.qrCode
                          ? normalizeImageUrl(selectedMethod.qrCode)
                          : `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                              `${selectedMethod.name}:${selectedMethod.accountNumber}?amount=${depositAmount}`
                            )}`
                      }
                      alt="Payment QR Code"
                      onError={(e) => {
                        if (selectedMethod.qrCode) {
                          const currentSrc = e.currentTarget.src;
                          const fileMatch =
                            selectedMethod.qrCode.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                            selectedMethod.qrCode.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                            selectedMethod.qrCode.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                          if (fileMatch && fileMatch[1]) {
                            const fid = fileMatch[1];
                            if (currentSrc.includes('thumbnail')) {
                              e.currentTarget.src = `https://lh3.googleusercontent.com/d/${fid}`;
                              return;
                            } else if (currentSrc.includes('googleusercontent')) {
                              e.currentTarget.src = `https://drive.google.com/uc?export=view&id=${fid}`;
                              return;
                            }
                          }
                        }
                        // Final fallback to auto-generated QR code
                        e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                          `${selectedMethod.name}:${selectedMethod.accountNumber}?amount=${depositAmount}`
                        )}`;
                      }}
                    />
                    {selectedMethod.logo && (
                      <img src={selectedMethod.logo} alt={selectedMethod.name} className="qr-corner-badge" />
                    )}
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="details-right-bottom-actions">
                  <button className="qr-action-btn" onClick={handleCopyAccount}>
                    {copied ? <Check size={13} color="#4ade80" /> : <Copy size={13} />}
                    <span>{copied ? 'Copied' : 'Copy Account Number'}</span>
                  </button>
                  <button className="qr-action-btn" onClick={handleDownloadQR}>
                    <Download size={13} />
                    <span>Download QR Code</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Confirm Payment Form */}
            <form className="confirm-form-card" onSubmit={handleSubmitDeposit}>
              <h3>Confirm Payment</h3>

              {/* 1. Sender Name */}
              <label className="field-label" style={{ fontSize: '11px', color: '#a69db2', display: 'block', marginBottom: '6px' }}>
                Sender Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="profile-input-field" style={{ marginBottom: '14px' }}>
                <User size={18} className="field-icon" />
                <div className="field-content">
                  <input
                    required
                    type="text"
                    placeholder="Enter sender account holder name"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                  />
                </div>
              </div>

              {/* 2. Sender Account / Mobile Number */}
              <label className="field-label" style={{ fontSize: '11px', color: '#a69db2', display: 'block', marginBottom: '6px' }}>
                Sender Account / Mobile Number <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="profile-input-field" style={{ marginBottom: '14px' }}>
                <Phone size={18} className="field-icon" />
                <div className="field-content">
                  <input
                    required
                    type="text"
                    placeholder="Enter your JazzCash / Easypaisa / Bank number"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* 3. Transaction ID (TID) */}
              <label className="field-label" style={{ fontSize: '11px', color: '#a69db2', display: 'block', marginBottom: '6px' }}>
                Transaction ID (TID) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="profile-input-field" style={{ marginBottom: '14px' }}>
                <Hash size={18} className="field-icon" />
                <div className="field-content">
                  <input
                    required
                    type="text"
                    placeholder="Enter transaction ID / Reference number"
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                  />
                </div>
              </div>

              {/* 4. Payment Proof (Compulsory) */}
              <div style={{ marginBottom: '14px' }}>
                <DualImageUpload
                  label="Payment Proof (Compulsory) *"
                  fileLabel="Upload Proof Screenshot (File) *"
                  urlLabel="Or Screenshot / Google Drive URL *"
                  value={proofImage || ''}
                  onChange={setProofImage}
                  placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                />
              </div>

              {!depositsEnabled && (
                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', padding: '12px 16px', borderRadius: 12, marginTop: '14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px' }}>
                  <AlertCircle size={18} />
                  <span><b>Recharge Submissions Paused:</b> Deposits and balance recharges are temporarily on hold by administration.</span>
                </div>
              )}

              <button
                type="submit"
                className="gradient-btn"
                disabled={loading || !depositsEnabled}
                style={{ width: '100%', height: '50px', justifyContent: 'center', marginTop: '20px', fontSize: '15px' }}
              >
                {loading ? (
                  <>
                    <RefreshCw className="spin" size={18} /> Submitting Verification…
                  </>
                ) : !depositsEnabled ? (
                  'Recharge Submissions Currently Paused'
                ) : (
                  <>
                    Submit for Verification <Lock size={16} style={{ marginLeft: 'auto' }} />
                  </>
                )}
              </button>
            </form>

            {/* Deposit Pipeline Flow */}
            <div className="deposit-pipeline">
              <div className="pipeline-step active">
                <div className="pipeline-dot">
                  <CreditCard size={16} />
                </div>
                <span>Payment Required</span>
                <small>Make your payment using the details above.</small>
              </div>
              <div className="pipeline-step">
                <div className="pipeline-dot">
                  <User size={16} />
                </div>
                <span>Payment Submitted</span>
                <small>Submit your details for verification.</small>
              </div>
              <div className="pipeline-step">
                <div className="pipeline-dot">
                  <Clock size={16} />
                </div>
                <span>Pending Approval</span>
                <small>Our team will verify your payment.</small>
              </div>
              <div className="pipeline-step">
                <div className="pipeline-dot">
                  <CheckCircle2 size={16} />
                </div>
                <span>Approved / Rejected</span>
                <small>You will be notified after review.</small>
              </div>
            </div>
          </motion.div>
        )}

        {/* ======================= RECENT DEPOSITS LIST ======================= */}
        <div className="recent-deposits-wrap">
          <div className="recent-deposits-head">
            <h3>
              <Clock size={18} color="#cb4eff" /> Recent Deposits
            </h3>
            <button onClick={() => nav('/wallet')}>
              View All <ChevronRight size={14} />
            </button>
          </div>

          <div className="deposit-history-list">
            {recentDeposits.map((item) => {
              const methodLogo =
                PAYMENT_METHODS.find((m) => m.id === (item.method || '').toLowerCase())?.logo ||
                '/assets/Wallets/Jazzcash.jpg';
              const status = (item.status || 'approved').toLowerCase();
              return (
                <div key={item.id} className="deposit-history-row">
                  <img src={methodLogo} alt="Wallet" className="deposit-history-logo" />
                  <div className="deposit-history-copy">
                    <strong>PKR {fmt(item.amount)}</strong>
                    <span>
                      {(item.method || 'JazzCash').toUpperCase()} • {item.pkg || 'C1'} • {item.date}
                    </span>
                  </div>
                  <div className={`deposit-status-pill ${status}`}>
                    {status === 'approved' ? 'Approved' : status === 'pending' ? 'Pending Admin Approval' : 'Rejected'}
                  </div>
                  <ChevronRight size={16} color="#6c647d" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Shell>
  );
}
