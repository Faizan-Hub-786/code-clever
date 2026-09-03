import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  Sparkles,
  Trophy,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Coins,
  History,
  ShieldCheck,
  Award,
  ChevronRight
} from 'lucide-react';
import Shell from '../components/layout/Shell';
import PageTitle from '../components/common/PageTitle';
import { API_BASE_URL, getAuthHeaders } from '../api/config';
import { fmt, fmtDate } from '../utils/formatters';

const DEFAULT_SEGMENTS = [
  { id: 1, label: 'Rs. 50', reward: 50, color: '#7c3aed' },
  { id: 2, label: 'Rs. 100', reward: 100, color: '#db2777' },
  { id: 3, label: 'Rs. 200', reward: 200, color: '#2563eb' },
  { id: 4, label: 'Rs. 300', reward: 300, color: '#d97706' },
  { id: 5, label: 'Rs. 450', reward: 450, color: '#9333ea' },
  { id: 6, label: 'Rs. 500', reward: 500, color: '#e11d48' },
  { id: 7, label: 'Rs. 550', reward: 550, color: '#059669' },
  { id: 8, label: 'Rs. 600', reward: 600, color: '#0891b2' },
  { id: 9, label: 'Rs. 650', reward: 650, color: '#4f46e5' },
  { id: 10, label: 'Rs. 700', reward: 700, color: '#ca8a04' }
];

export default function LuckyWheelPage() {
  const [wheel, setWheel] = useState({
    enabled: true,
    remainingSpins: 1,
    dailyRemaining: 1,
    bonusSpins: 0,
    dailyLimit: 1,
    segments: DEFAULT_SEGMENTS
  });
  const [history, setHistory] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winnerModal, setWinnerModal] = useState(null); // { label, reward, balance }
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const segments = wheel.segments?.length ? wheel.segments : DEFAULT_SEGMENTS;
  const numSegments = segments.length;
  const arcSize = 360 / numSegments;
  const R = 185; // wheel radius in SVG

  const [wheelKillswitchEnabled, setWheelKillswitchEnabled] = useState(true);

  const loadWheel = async () => {
    try {
      fetch(`${API_BASE_URL}/site-settings`)
        .then((r) => (r.ok ? r.json() : {}))
        .then((d) => {
          if (d && (d.lucky_wheel_enabled === false || d.lucky_wheel_enabled === 'false')) {
            setWheelKillswitchEnabled(false);
          } else {
            setWheelKillswitchEnabled(true);
          }
        })
        .catch(() => {});

      const r = await fetch(`${API_BASE_URL}/wheel`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        setWheel((prev) => ({ ...prev, ...d }));
      }
      const histRes = await fetch(`${API_BASE_URL}/wheel/history`, { headers: getAuthHeaders() });
      if (histRes.ok) {
        const histData = await histRes.json();
        setHistory(histData || []);
      }
    } catch {}
  };

  useEffect(() => {
    loadWheel();
  }, []);

  const spin = async () => {
    if (spinning || !wheelKillswitchEnabled || (wheel.remainingSpins || 0) <= 0) return;
    setError('');
    setToast('');
    setWinnerModal(null);
    setSpinning(true);

    try {
      const r = await fetch(`${API_BASE_URL}/wheel/spin`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Spin failed.');

      const winningIndex = d.segment_index !== undefined ? d.segment_index : 0;
      
      // Calculate target angle so pointer at top (12 o'clock / 0 deg) lands in winning segment center
      const sliceCenter = (winningIndex * arcSize) + (arcSize / 2);
      const targetSliceOffset = (360 - sliceCenter + 720) % 360;
      const extraFullTurns = 6 * 360; // 6 full fast revolutions
      const currentMod = rotation % 360;
      const deltaRotation = extraFullTurns + ((targetSliceOffset - currentMod + 360) % 360);
      const finalRotation = rotation + deltaRotation;

      setRotation(finalRotation);

      setTimeout(() => {
        setSpinning(false);
        setWinnerModal(d);
        setWheel((prev) => ({
          ...prev,
          remainingSpins: d.remainingSpins ?? Math.max((prev.remainingSpins || 1) - 1, 0),
          bonusSpins: d.bonusSpins ?? prev.bonusSpins
        }));
        if (d.reward > 0) {
          setToast(`🎉 Congratulations! Rs. ${fmt(d.reward)} added directly to your available balance!`);
        } else {
          setToast(`Better luck next time! Your spin has been recorded.`);
        }
        loadWheel();
      }, 4800);
    } catch (err) {
      setSpinning(false);
      setError(err.message || 'Unable to connect to the spin server.');
    }
  };

  // Helper to generate SVG slice wedge path starting from top 12 o'clock (-90 degrees)
  const getSlicePath = (index) => {
    const angle1 = ((index * arcSize) - 90) * (Math.PI / 180);
    const angle2 = (((index + 1) * arcSize) - 90) * (Math.PI / 180);
    const cx = 220;
    const cy = 220;
    const x1 = cx + R * Math.cos(angle1);
    const y1 = cy + R * Math.sin(angle1);
    const x2 = cx + R * Math.cos(angle2);
    const y2 = cy + R * Math.sin(angle2);

    return `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;
  };

  const spinsLeft = wheel.remainingSpins ?? 0;
  const dailyLeft = wheel.dailyRemaining ?? 0;
  const bonusLeft = wheel.bonusSpins ?? 0;

  return (
    <Shell>
      <div className="wheel-page-v20">
        <PageTitle
          eyebrow="DAILY CASH DRAW & PRIZE ENGINE"
          title="Lucky Fortune Wheel"
          text="Spin the fortune wheel for instant cash bonuses credited directly to your wallet available balance."
        />

        {/* Status Toast Alert */}
        {toast && (
          <motion.div
            className="task-message"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '16px' }}
          >
            <CheckCircle2 size={18} /> {toast}
          </motion.div>
        )}

        {error && (
          <motion.div
            className="auth-error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '16px' }}
          >
            <AlertCircle size={18} /> {error}
          </motion.div>
        )}

        <div className="wheel-layout-v20">
          {/* LEFT: INTERACTIVE SVG WHEEL STAGE */}
          <div className="wheel-stage-card">
            {/* Top Pointer Indicator */}
            <div className="wheel-top-pointer">
              <div className="pointer-triangle" />
              <div className="pointer-glow" />
            </div>

            {/* SVG Wheel Graphic */}
            <div className="wheel-svg-container">
              {/* Outer Golden Ring with Lights */}
              <div className="wheel-outer-lights">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className="rim-bulb"
                    style={{
                      transform: `rotate(${i * 15}deg) translate(0, -212px)`
                    }}
                  />
                ))}
              </div>

              {/* Rotating Wheel Group */}
              <motion.div
                className="wheel-rotator"
                animate={{ rotate: rotation }}
                transition={{ duration: 4.8, ease: [0.12, 0.9, 0.22, 1] }}
              >
                <svg
                  viewBox="0 0 440 440"
                  className="wheel-svg-surface"
                  width="100%"
                  height="100%"
                >
                  <defs>
                    <radialGradient id="centerHubGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="70%" stopColor="#d97706" />
                      <stop offset="100%" stopColor="#78350f" />
                    </radialGradient>
                    <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="glow" />
                      <feComposite in="SourceGraphic" in2="glow" operator="over" />
                    </filter>
                  </defs>

                  {/* Slices */}
                  {segments.map((seg, idx) => {
                    const midAngle = (idx * arcSize) + (arcSize / 2);
                    const defaultColors = [
                      '#7c3aed', '#db2777', '#2563eb', '#d97706',
                      '#1e293b', '#9333ea', '#059669', '#0891b2'
                    ];
                    const fillColor = seg.color || defaultColors[idx % defaultColors.length];
                    const isZero = Number(seg.reward) === 0 || String(seg.label).toLowerCase().includes('better luck');

                    return (
                      <g key={seg.id || idx}>
                        <path
                          d={getSlicePath(idx)}
                          fill={fillColor}
                          stroke="#1e1b4b"
                          strokeWidth="2.5"
                        />
                        {/* Slice Text Label aligned along radius */}
                        <g transform={`rotate(${midAngle}, 220, 220)`}>
                          <text
                            x="220"
                            y={isZero ? "68" : "75"}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize={isZero ? "11.5" : "13.5"}
                            fontWeight="900"
                            letterSpacing="0.4"
                            style={{
                              textShadow: '0 2px 6px rgba(0,0,0,0.95)',
                              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.95))'
                            }}
                          >
                            {isZero ? (
                              <>
                                <tspan x="220" dy="0">Better Luck</tspan>
                                <tspan x="220" dy="13" fontSize="10.5" fill="#cbd5e1">Next Time</tspan>
                              </>
                            ) : (
                              seg.label || `Rs. ${fmt(seg.reward)}`
                            )}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* Wheel Center Hub */}
                  <circle
                    cx="220"
                    cy="220"
                    r="40"
                    fill="url(#centerHubGrad)"
                    stroke="#ffffff"
                    strokeWidth="3.5"
                    filter="url(#glowFilter)"
                  />
                  <circle
                    cx="220"
                    cy="220"
                    r="28"
                    fill="#18181b"
                    stroke="#f59e0b"
                    strokeWidth="2"
                  />
                </svg>

                {/* Center Hub Sparkle Icon */}
                <div className="wheel-center-icon">
                  <Sparkles size={24} color="#f59e0b" />
                </div>
              </motion.div>
            </div>

            {/* Spin CTA Button */}
            <div className="wheel-cta-wrap">
              {!wheelKillswitchEnabled && (
                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', padding: '10px 16px', borderRadius: 12, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '13px' }}>
                  <AlertCircle size={18} />
                  <span><b>Lucky Wheel Inactive:</b> Prize wheel events are temporarily paused by administration.</span>
                </div>
              )}

              <button
                className="gradient-btn wheel-spin-action-btn"
                disabled={spinning || !wheelKillswitchEnabled || spinsLeft <= 0}
                onClick={spin}
              >
                {spinning ? (
                  <>
                    <RotateCw className="spin" size={22} /> SPINNING WHEEL…
                  </>
                ) : !wheelKillswitchEnabled ? (
                  <>
                    <AlertCircle size={22} /> WHEEL CURRENTLY DISABLED
                  </>
                ) : spinsLeft > 0 ? (
                  <>
                    <Sparkles size={22} /> SPIN NOW ({spinsLeft} {spinsLeft === 1 ? 'SPIN' : 'SPINS'} AVAILABLE)
                  </>
                ) : (
                  <>
                    <Clock size={22} /> NO SPINS AVAILABLE
                  </>
                )}
              </button>
              <span className="spins-note">
                {spinsLeft > 0
                  ? `✓ You have ${spinsLeft} Lucky Wheel spin(s) available. All cash rewards are credited instantly to your wallet!`
                  : 'Spins are unlocked upon Package Activation: 1 Spin for C1, 2 Spins for C2–C9, and 1 Sponsor Spin for your Direct Leader!'}
              </span>
            </div>
          </div>

          {/* RIGHT: INFO & LIVE RECENT SPINS HISTORY */}
          <div className="wheel-side-col">
            {/* User Daily Fortune Card */}
            <div className="fortune-quota-card">
              <div className="fortune-quota-top">
                <div>
                  <small>Available Turns</small>
                  <h3>Activation Spins</h3>
                </div>
                <div className="fortune-quota-badge">
                  <b>{spinsLeft}</b>
                  <span>Spins Available</span>
                </div>
              </div>

              {/* Package Activation Spin Rules */}
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', margin: '14px 0' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#c084fc', marginBottom: '8px' }}>
                  🎁 Package Activation Spin Rules:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#e2e8f0', lineHeight: 1.6 }}>
                  <li><b>C1 Activation:</b> <b>1 Spin</b> for member + <b>1 Spin</b> for Direct Leader (Sponsor).</li>
                  <li><b>C2 to C9 Activation:</b> <b>2 Spins</b> for member + <b>1 Spin</b> for Direct Leader (Sponsor).</li>
                  <li style={{ color: '#94a3b8' }}>No unearned daily spins — spins are guaranteed on plan activations.</li>
                </ul>
              </div>

              <div className="fortune-perk-row">
                <div>
                  <ShieldCheck size={16} color="#4ade80" /> Instant Ledger Credit
                </div>
                <div>
                  <Coins size={16} color="#fbbf24" /> Up to Rs. 700+ Cash
                </div>
                <div>
                  <Award size={16} color="#38bdf8" /> Member & Sponsor Rewards
                </div>
              </div>
            </div>

            {/* Live Spin History Table */}
            <div className="spin-history-card">
              <div className="history-head">
                <History size={18} color="#c084fc" />
                <h3>Recent Spin Results</h3>
              </div>
              <div className="history-list-stream">
                {history.length > 0 ? (
                  history.map((h, i) => {
                    const isWin = Number(h.reward) > 0;
                    return (
                      <div key={h.id || i} className="history-stream-row">
                        <div className={`history-icon-orb ${isWin ? 'win' : 'zero'}`}>
                          {isWin ? <Gift size={16} /> : <Clock size={16} />}
                        </div>
                        <div className="history-stream-details">
                          <strong>{h.segment_label || (isWin ? `Rs. ${fmt(h.reward)}` : 'Better Luck Next Time')}</strong>
                          <small>{h.created_at || 'Today'}{h.spin_source === 'bonus' ? ' • Bonus Spin' : ''}</small>
                        </div>
                        <div className={`history-stream-amount ${isWin ? 'win' : 'zero'}`}>
                          {isWin ? `+Rs. ${fmt(h.reward)}` : 'Better Luck'}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-history">
                    <Trophy size={32} />
                    <p>No spins recorded yet. Take your lucky turn above!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CELEBRATION WINNER POPUP MODAL */}
        <AnimatePresence>
          {winnerModal && (
            <motion.div
              className="winner-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setWinnerModal(null)}
            >
              <motion.div
                className="winner-modal-card"
                initial={{ scale: 0.8, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 30 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="winner-modal-confetti">✨ 🎉 ✨</div>
                <div className="winner-modal-icon">
                  {Number(winnerModal.reward) > 0 ? <Gift size={44} /> : <Clock size={44} />}
                </div>
                <h2>
                  {Number(winnerModal.reward) > 0 ? 'Congratulations!' : 'Better Luck Next Time!'}
                </h2>
                <div className="winner-prize-amount">
                  {Number(winnerModal.reward) > 0 ? (
                    <span>Rs. {fmt(winnerModal.reward)}</span>
                  ) : (
                    <span style={{ fontSize: '24px', color: '#94a3b8' }}>Better Luck Next Time</span>
                  )}
                </div>
                <p>
                  {Number(winnerModal.reward) > 0
                    ? `Your prize of Rs. ${fmt(winnerModal.reward)} has been credited directly to your available wallet balance.`
                    : `Thank you for taking your turn! Activate packages or recharge to earn more bonus spins.`}
                </p>
                <button
                  className="gradient-btn winner-claim-btn"
                  onClick={() => setWinnerModal(null)}
                >
                  <CheckCircle2 size={18} /> {Number(winnerModal.reward) > 0 ? 'Claim & Continue' : 'Got It'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}
