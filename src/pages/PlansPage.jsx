import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Crown,
  Check,
  ArrowRight,
  HelpCircle,
  AlertCircle,
  Wallet,
  Award,
  ClipboardList,
  Tag,
  TrendingUp,
  CalendarDays,
  BarChart3,
  Briefcase,
  Coins,
  PieChart,
  BarChart2,
  Lock,
  CheckCircle2,
  ChevronLeft,
  X,
  AlertTriangle,
  CreditCard
} from 'lucide-react';
import Shell from '../components/layout/Shell';
import { API_BASE_URL, getAuthHeaders } from '../api/config';
import { DEFAULT_PLANS, PLANS_FALLBACK_OBJECTS } from '../constants/plans';
import { fmt } from '../utils/formatters';
import { getCachedWallet, setCachedWallet } from '../utils/walletCache';

let cachedPlansData = null;

export default function PlansPage() {
  const nav = useNavigate();
  const [plans, setPlans] = useState(() => cachedPlansData?.plans || PLANS_FALLBACK_OBJECTS);
  const [activePlan, setActivePlan] = useState(() => cachedPlansData?.activePlan ?? getCachedWallet().plan_code);
  const [isIntern, setIsIntern] = useState(() => {
    if (cachedPlansData) return !cachedPlansData.activePlan || cachedPlansData.activePlan === 'INTERN';
    return !getCachedWallet().plan_code || getCachedWallet().plan_code === 'INTERN';
  });
  const [walletBalance, setWalletBalance] = useState(() => getCachedWallet().total_balance);
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [pendingPlan, setPendingPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const loadPlans = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/plans`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        if (d.plans?.length) setPlans(d.plans);
        if (d.activePlan?.code) {
          setActivePlan(d.activePlan.code);
          setIsIntern(false);
        } else {
          setActivePlan(null);
          setIsIntern(true);
        }
        const planBal = Number(d.wallet?.total_balance ?? d.wallet?.available_balance ?? d.total_balance ?? d.available_balance ?? 0);
        setWalletBalance(planBal);
        setCachedWallet({
          total_balance: planBal,
          plan_code: d.activePlan?.code || null
        });
        cachedPlansData = {
          plans: d.plans?.length ? d.plans : plans,
          activePlan: d.activePlan?.code || null
        };
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadPlans();
    const handleWalletUpdate = (e) => {
      const u = e.detail;
      if (!u) return;
      if (u.total_balance !== undefined) setWalletBalance(u.total_balance);
      if (u.plan_code) {
        setActivePlan(u.plan_code);
        setIsIntern(u.plan_code === 'INTERN');
      }
    };
    window.addEventListener('cc_wallet_updated', handleWalletUpdate);
    return () => window.removeEventListener('cc_wallet_updated', handleWalletUpdate);
  }, []);

  const selectPlan = (p) => {
    if (p.code === activePlan) return;
    setMsg('');
    setError('');
    setPendingPlan(p);
    setShowModal(true);
  };

  const confirmActivation = async () => {
    if (!pendingPlan) return;
    setBuying(true);
    setMsg('');
    setError('');
    try {
      const r = await fetch(`${API_BASE_URL}/plans/activate`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ planCode: pendingPlan.code })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Failed to activate plan.');
      setShowModal(false);
      setMsg(`Congratulations! Plan ${pendingPlan.code} activated successfully.`);
      setPendingPlan(null);
      setCachedWallet({
        plan_code: pendingPlan.code,
        total_balance: d.total_balance ?? d.balance,
        personal_balance: d.personal_balance,
        commission_balance: d.commission_balance
      });
      loadPlans();
    } catch (err) {
      setError(err.message);
      setShowModal(false);
    } finally {
      setBuying(false);
    }
  };

  const teamBonusData = [
    { code: 'C1', bond: 3500, a: 420, b: 140, c: 70 },
    { code: 'C2', bond: 15500, a: 1860, b: 620, c: 310 },
    { code: 'C3', bond: 59000, a: 7080, b: 2360, c: 1180 },
    { code: 'C4', bond: 215000, a: 25800, b: 8600, c: 4300 },
    { code: 'C5', bond: 479000, a: 57480, b: 19160, c: 9580 },
    { code: 'C6', bond: 1454000, a: 174480, b: 58160, c: 29080 },
    { code: 'C7', bond: 3869000, a: 464280, b: 154760, c: 77380 },
    { code: 'C8', bond: 7349000, a: 881880, b: 293960, c: 146980 },
    { code: 'C9', bond: 15149000, a: 1817880, b: 605960, c: 302980 }
  ];

  return (
    <Shell>
      <div className="plans-page">
        {/* Top Bar with Brand & Floating Wallet Balance */}
        <div className="plans-top-bar">
          <div className="plans-top-brand">
            <button className="deposit-back-btn" onClick={() => nav(-1)} title="Back" style={{ marginRight: '10px' }}>
              <ChevronLeft size={22} />
            </button>
            <img src="/assets/logo.jpeg" alt="Code Clever" />
            <span>CODE CLEVER</span>
          </div>
          <div className="wallet-top-pill">
            <Wallet size={20} />
            <div>
              <span>Wallet Balance</span>
              <strong>Rs. {fmt(walletBalance)}</strong>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="plans-hero">
          <div className="plans-hero-copy">
            <h1>CODE CLEVER EARNING PLANS</h1>
            <div className="plans-tagline">
              COMPLETE TASKS • EARN DAILY • BUILD YOUR INCOME
            </div>
            <p>
              Choose the plan that suits you best and start completing eligible tasks to earn daily income. Higher levels unlock increased reward rates and guaranteed daily allocations.
            </p>
            <div className="hero-trust">
              <span><Sparkles size={13} /> Official Earning Tiers</span>
              <span><ShieldCheck size={13} /> Fully Refundable Job Bond</span>
              <span><Zap size={13} /> 00:00 UTC Reset</span>
            </div>
          </div>
          <div className="plans-hero-art">
            <div className="plans-briefcase-wrap">
              <Briefcase size={56} />
              <div className="briefcase-logo">
                <img src="/assets/logo.jpeg" alt="Code Clever" />
              </div>
            </div>
            <div className="floating-coins">
              <Coins size={26} />
            </div>
            <div className="floating-growth">
              <TrendingUp size={26} />
            </div>
          </div>
        </div>

        {/* Alerts */}
        {msg && (
          <motion.div
            className="task-message"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: '20px' }}
          >
            <Check size={18} /> {msg}
          </motion.div>
        )}

        {error && (
          <motion.div
            className="auth-error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: '20px' }}
          >
            <AlertCircle size={18} /> {error}
            <button className="gradient-btn mini" onClick={() => nav('/deposit')} style={{ marginLeft: 'auto' }}>
              Deposit Funds
            </button>
          </motion.div>
        )}

        {/* 1. CODE CLEVER EARNING PACKAGES Matrix Table */}
        <div className="package-matrix-card">
          <div className="table-header-brand">
            <div className="table-brand-logo">
              <img src="/assets/logo.jpeg" alt="Code Clever" />
              <span>CODE CLEVER</span>
            </div>
            <div className="package-matrix-title">CODE CLEVER EARNING PACKAGES</div>
          </div>
          <table className="matrix-table">
            <thead>
              <tr>
                <th>
                  <div className="th-icon-wrap"><Award size={18} /></div>
                  Level
                </th>
                <th>
                  <div className="th-icon-wrap"><Wallet size={18} /></div>
                  <span className="th-mobile-short">Bond</span>
                  <span className="th-desktop-full">Job Bond (PKR)</span>
                </th>
                <th>
                  <div className="th-icon-wrap"><ClipboardList size={18} /></div>
                  Tasks
                </th>
                <th>
                  <div className="th-icon-wrap"><Tag size={18} /></div>
                  <span className="th-mobile-short">Unit</span>
                  <span className="th-desktop-full">Unit Price (PKR)</span>
                </th>
                <th>
                  <div className="th-icon-wrap"><TrendingUp size={18} /></div>
                  <span className="th-mobile-short">Daily</span>
                  <span className="th-desktop-full">Daily Income (PKR)</span>
                </th>
                <th>
                  <div className="th-icon-wrap"><CalendarDays size={18} /></div>
                  <span className="th-mobile-short">Monthly</span>
                  <span className="th-desktop-full">Monthly Income (PKR)</span>
                </th>
                <th>
                  <div className="th-icon-wrap"><BarChart3 size={18} /></div>
                  <span className="th-mobile-short">Annual</span>
                  <span className="th-desktop-full">Annual Income (PKR)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {DEFAULT_PLANS.map(([code, bond, tasks, unitPrice, daily, monthly, annual]) => {
                const isCurrent = code === activePlan;
                return (
                  <tr key={code} className={isCurrent ? 'active-row' : ''}>
                    <td>
                      <div className={`matrix-level-badge ${isCurrent ? 'active' : ''}`}>
                        {code}
                      </div>
                    </td>
                    <td>{fmt(bond)}</td>
                    <td>{tasks}</td>
                    <td>{fmt(unitPrice)}</td>
                    <td>{fmt(daily)}</td>
                    <td>{fmt(monthly)}</td>
                    <td>{fmt(annual)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 2. FIRST DEPOSIT MANAGEMENT FEE (Team Bonus Table) */}
        <div className="team-bonus-card">
          <div className="table-header-brand">
            <div className="table-brand-logo">
              <img src="/assets/logo.jpeg" alt="Code Clever" />
              <span>CODE CLEVER</span>
            </div>
            <div className="package-matrix-title">
              FIRST DEPOSIT <span>MANAGEMENT FEE</span>
            </div>
            <div className="team-bonus-pill">
              <b>A - 12%</b> • <b>B - 4%</b> • <b>C - 2%</b> (PKR)
            </div>
          </div>

          <table className="matrix-table">
            <thead>
              <tr>
                <th>
                  <div className="th-icon-wrap"><Award size={18} /></div>
                  Level
                </th>
                <th>
                  <div className="th-icon-wrap"><Wallet size={18} /></div>
                  <span className="th-mobile-short">Bond</span>
                  <span className="th-desktop-full">Job Bond</span>
                </th>
                <th>
                  <div className="th-icon-wrap"><PieChart size={18} /></div>
                  A - 12%
                </th>
                <th>
                  <div className="th-icon-wrap"><BarChart2 size={18} /></div>
                  B - 4%
                </th>
                <th>
                  <div className="th-icon-wrap"><Coins size={18} /></div>
                  C - 2%
                </th>
              </tr>
            </thead>
            <tbody>
              {teamBonusData.map((item) => {
                const isCurrent = item.code === activePlan;
                return (
                  <tr key={item.code} className={isCurrent ? 'active-row' : ''}>
                    <td>
                      <div className={`matrix-level-badge ${isCurrent ? 'active' : ''}`}>
                        {item.code}
                      </div>
                    </td>
                    <td>{fmt(item.bond)}</td>
                    <td>{fmt(item.a)}</td>
                    <td>{fmt(item.b)}</td>
                    <td>{fmt(item.c)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer Notice Box */}
          <div className="bonus-footer-notice">
            <div className="bonus-footer-icon">
              <Wallet size={24} />
            </div>
            <div className="bonus-footer-text">
              <div><b>Deposits are credited to the Personal Wallet after approval.</b></div>
              <div>Buying a plan deducts the plan price from that wallet.</div>
            </div>
          </div>
        </div>

        {/* 3. Available Earning Plans Cards Grid (C1 to C4 Open, C5 to C9 Locked) */}
        <div className="plan-controls">
          <div>
            <strong>Available Earning Plans</strong>
            <span>Your Current Plan: <b>{activePlan ? `Plan ${activePlan}` : 'Internship (Free Trial)'}</b> · Wallet Balance: <b>Rs. {fmt(walletBalance)}</b></span>
          </div>
        </div>

        <div className="plans-grid">
          {plans.map((p) => {
            const bond = Number(p.job_bond || p.bond);
            const dailyTasks = Number(p.daily_task_count || p.dailyTasks);
            const unitReward = Number(p.unit_reward || p.reward);
            const dailyCap = dailyTasks * unitReward;
            const monthlyEst = dailyCap * 30;
            const annualEst = dailyCap * 365;
            const isCurrent = p.code === activePlan;
            const isLocked = Boolean(p.is_locked);

            return (
              <motion.div
                key={p.code}
                className={`plan-card ${isCurrent ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                whileHover={{ y: isLocked ? 0 : -6 }}
              >
                <div className="plan-card-head">
                  <div className="plan-code-orb">
                    <span>{p.code}</span>
                    <i />
                  </div>
                  <div>
                    <h2>Plan {p.code}</h2>
                    <p>{p.name || 'Tier Level'}</p>
                  </div>
                  {isCurrent && (
                    <div className="selected-mark">
                      <Check size={12} /> ACTIVE
                    </div>
                  )}
                  {isLocked && !isCurrent && (
                    <div className="locked-badge">
                      <Lock size={12} /> LOCKED
                    </div>
                  )}
                </div>

                <div className="bond-box">
                  <span>Required Job Bond</span>
                  <strong>Rs. {fmt(bond)}</strong>
                </div>

                <div className="plan-metrics">
                  <div>
                    <small>Daily Task Quota</small>
                    <b>{dailyTasks} Tasks</b>
                  </div>
                  <div>
                    <small>Reward per Task</small>
                    <b>Rs. {fmt(unitReward)}</b>
                  </div>
                </div>

                <div className="earnings-box">
                  <div>
                    <span>Daily Cap</span>
                    <strong>Rs. {fmt(dailyCap)}</strong>
                  </div>
                  <div>
                    <span>Monthly Est.</span>
                    <strong>Rs. {fmt(monthlyEst)}</strong>
                  </div>
                  <div>
                    <span>Annual Est.</span>
                    <strong>Rs. {fmt(annualEst)}</strong>
                  </div>
                </div>

                <div className="formula">
                  <span>{dailyTasks} Tasks</span> × <span>Rs. {fmt(unitReward)}</span> ={' '}
                  <b>Rs. {fmt(dailyCap)} / Day</b>
                </div>

                {isCurrent ? (
                  <button className="plan-selected-btn" disabled>
                    <Check size={16} /> Current Plan
                  </button>
                ) : isLocked ? (
                  <button className="plan-locked-btn" disabled>
                    <Lock size={15} /> Locked (Coming Soon)
                  </button>
                ) : (
                  <button
                    className="plan-select-btn"
                    disabled={buying}
                    onClick={() => selectPlan(p)}
                  >
                    Activate {p.code} <ArrowRight size={16} />
                  </button>
                )}

                <div className="plan-disclaimer">
                  * Job bond security deposit is credited back upon term completion.
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Security & Policy Rules */}
        <div className="plan-rules">
          <div>
            <ShieldCheck size={22} />
            <div>
              <strong>Security Bond Guarantee</strong>
              <p>Job bond protects advertiser budgets and verifies legitimate participant identity.</p>
            </div>
          </div>
          <div>
            <Zap size={22} />
            <div>
              <strong>Instant Upgrades</strong>
              <p>Upgrade to higher tiers anytime by funding the bond difference from your wallet.</p>
            </div>
          </div>
          <div>
            <HelpCircle size={22} />
            <div>
              <strong>Transparent Daily Settlement</strong>
              <p>All task rewards are credited immediately upon verified proof submission.</p>
            </div>
          </div>
        </div>

        {/* Plan Activation & Recharge Modals */}
        {showModal && pendingPlan && (() => {
          const bondAmount = Number(pendingPlan.job_bond || pendingPlan.bond);
          const hasEnough = walletBalance >= bondAmount;
          const remainingBalance = walletBalance - bondAmount;
          const neededAmount = bondAmount - walletBalance;

          return (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(5, 2, 16, 0.85)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 16
            }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 15 }}
                style={{
                  background: '#0d0724',
                  border: `1px solid ${hasEnough ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.35)'}`,
                  borderRadius: 20,
                  width: '100%',
                  maxWidth: 480,
                  overflow: 'hidden',
                  boxShadow: '0 25px 60px -15px rgba(0,0,0,0.85)'
                }}
              >
                {/* Modal Header */}
                <div style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: hasEnough ? 'rgba(74, 222, 128, 0.04)' : 'rgba(239, 68, 68, 0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: hasEnough ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: hasEnough ? '#4ade80' : '#ef4444'
                    }}>
                      {hasEnough ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 17, color: '#f8fafc', fontWeight: 700 }}>
                        {hasEnough ? 'Confirm Plan Activation' : 'Insufficient Balance'}
                      </h3>
                      <small style={{ color: '#94a3b8', fontSize: 12 }}>
                        Plan {pendingPlan.code} ({pendingPlan.name || 'Earning Tier'})
                      </small>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: 'none',
                      borderRadius: 8,
                      color: '#94a3b8',
                      padding: 6,
                      cursor: 'pointer',
                      display: 'flex'
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Content */}
                <div style={{ padding: '22px 24px' }}>
                  {hasEnough ? (
                    // SUFFICIENT BALANCE: Breakdown of payment & remaining balance
                    <div>
                      <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 14,
                        padding: '16px 18px',
                        marginBottom: 16
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                          <span style={{ color: '#94a3b8' }}>Current Wallet Balance:</span>
                          <strong style={{ color: '#f1f5f9' }}>Rs. {fmt(walletBalance)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                          <span style={{ color: '#94a3b8' }}>Plan Activation Cost:</span>
                          <strong style={{ color: '#c084fc' }}>- Rs. {fmt(bondAmount)}</strong>
                        </div>
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '10px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                          <span style={{ color: '#86efac', fontWeight: 600 }}>Balance Left After Activation:</span>
                          <strong style={{ color: '#4ade80', fontSize: 16 }}>Rs. {fmt(remainingBalance)}</strong>
                        </div>
                      </div>

                      <div style={{
                        background: 'rgba(74, 222, 128, 0.08)',
                        border: '1px solid rgba(74, 222, 128, 0.2)',
                        borderRadius: 10,
                        padding: '12px 14px',
                        fontSize: 12,
                        color: '#cbd5e1',
                        lineHeight: 1.5,
                        marginBottom: 22
                      }}>
                        Total cost for <b>Plan {pendingPlan.code}</b> is <strong style={{ color: '#4ade80' }}>Rs. {fmt(bondAmount)}</strong>. After activating this plan, you will have <strong style={{ color: '#4ade80' }}>Rs. {fmt(remainingBalance)}</strong> remaining in your wallet.
                      </div>

                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          type="button"
                          className="outline-btn"
                          onClick={() => setShowModal(false)}
                          style={{ flex: 1, height: 44, borderRadius: 10, fontSize: 13 }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="gradient-btn"
                          disabled={buying}
                          onClick={confirmActivation}
                          style={{ flex: 2, height: 44, borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                          {buying ? 'Activating...' : <>Confirm & Activate Plan <ArrowRight size={16} /></>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // INSUFFICIENT BALANCE: Show shortfall and attached Recharge button
                    <div>
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: 12,
                        padding: '12px 14px',
                        fontSize: 13,
                        color: '#fca5a5',
                        marginBottom: 16,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                        <span>Please recharge your wallet to activate <b>Plan {pendingPlan.code}</b>.</span>
                      </div>

                      <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 14,
                        padding: '16px 18px',
                        marginBottom: 22
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                          <span style={{ color: '#94a3b8' }}>Required Plan Bond:</span>
                          <strong style={{ color: '#f1f5f9' }}>Rs. {fmt(bondAmount)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                          <span style={{ color: '#94a3b8' }}>Your Current Balance:</span>
                          <strong style={{ color: '#cbd5e1' }}>Rs. {fmt(walletBalance)}</strong>
                        </div>
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '10px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                          <span style={{ color: '#fca5a5', fontWeight: 600 }}>Amount Needed (Shortage):</span>
                          <strong style={{ color: '#ef4444', fontSize: 16 }}>Rs. {fmt(neededAmount)}</strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          type="button"
                          className="outline-btn"
                          onClick={() => setShowModal(false)}
                          style={{ flex: 1, height: 44, borderRadius: 10, fontSize: 13 }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="gradient-btn"
                          onClick={() => {
                            setShowModal(false);
                            nav('/deposit');
                          }}
                          style={{ flex: 2, height: 44, borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
                        >
                          <CreditCard size={16} /> Recharge Wallet Now →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </div>
    </Shell>
  );
}
