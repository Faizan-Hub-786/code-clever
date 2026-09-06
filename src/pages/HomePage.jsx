import React, { useEffect, useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Wallet,
  CheckCircle2,
  TrendingUp,
  Crown,
  ChevronRight,
  ChevronLeft,
  ListTodo,
  Layers3,
  UsersRound,
  Gift,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowRight,
  Check,
  Globe,
  Megaphone,
  X,
  CreditCard,
  Clock,
  Send
} from 'lucide-react';
import Shell from '../components/layout/Shell';
import Stat from '../components/common/Stat';
import { API_BASE_URL, getAuthHeaders } from '../api/config';
import { fmt, getAppIconUrl } from '../utils/formatters';
import { getCachedWallet, setCachedWallet } from '../utils/walletCache';

export default function HomePage() {
  const nav = useNavigate();
  const [slide, setSlide] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showNotice, setShowNotice] = useState(true);
  const [loading, setLoading] = useState(false);

  // Pop-up modals state
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const [dashboard, setDashboard] = useState(() => {
    const cached = getCachedWallet();
    return {
      wallet: {
        available_balance: cached.available_balance,
        total_balance: cached.total_balance,
        personal_balance: cached.personal_balance,
        commission_balance: cached.commission_balance,
        lifetime_earned: cached.lifetime_earned
      },
      available_balance: cached.available_balance,
      personal_balance: cached.personal_balance,
      commission_balance: cached.commission_balance,
      total_balance: cached.total_balance,
      plan: { code: cached.plan_code || 'C1', daily_task_count: 2, unit_reward: 59 },
      summary: {
        available_balance: cached.available_balance,
        today_earned: cached.today_earned || 0,
        monthly_earned: cached.monthly_earned || 0,
        team_earned: 0,
        tasks_completed: cached.tasks_completed || 0,
        tasks_total: 2
      },
      task_progress: { total: 2, completed: cached.tasks_completed || 0, percentage: 0 },
      team: { total_members: 0, lifetime_commission: 0 },
      profile: { full_name: cached.user_name || 'Code Clever User', referral_code: cached.referral_code || 'CC1000' }
    };
  });

  const slides = [
    {
      title: 'Global Operations & Corporate Team',
      tag: 'OUR PEOPLE',
      desc: 'Meet our dedicated cross-functional engineering, publisher relations, and compliance teams driving daily operations.',
      img: '/assets/Home Page Photo/corporate_team_group_photo.webp'
    },
    {
      title: 'Code Clever Annual Stage Convention',
      tag: 'ANNUAL CONVENTION',
      desc: 'Celebrating platform milestones, publisher growth, and top-tier affiliate leaders on the grand stage.',
      img: '/assets/Home Page Photo/code_clever_team_stage.webp'
    },
    {
      title: 'Official Platform Launch Ceremony',
      tag: 'CORPORATE LAUNCH',
      desc: 'Commemorating our certified digital marketing operations and mobile app monetization infrastructure.',
      img: '/assets/Home Page Photo/corporate_launch_ceremony.webp'
    },
    {
      title: 'Executive Strategic Planning & Partner Meeting',
      tag: 'EXECUTIVE STRATEGY',
      desc: 'Formulating strategic publisher integrations, fraud-prevention algorithms, and daily task distribution frameworks.',
      img: '/assets/Home Page Photo/code_clever_meeting.webp'
    },
    {
      title: 'Leadership Keynote & Innovation Roadmap',
      tag: 'INNOVATION ROADMAP',
      desc: 'Presenting the future of mobile app monetization, micro-tasks distribution, and automated instant payouts.',
      img: '/assets/Home Page Photo/code_clever_speech.webp'
    },
    {
      title: 'Performance Awards & Partner Recognition',
      tag: 'RECOGNITION AWARDS',
      desc: 'Honoring outstanding digital partners, top-performing affiliates, and certified app evaluators.',
      img: '/assets/Home Page Photo/corporate_award_celebration.webp'
    },
    {
      title: 'Regional Leadership & Governance Council',
      tag: 'GOVERNANCE COUNCIL',
      desc: 'Ensuring strict compliance, fair payout audits, and high-trust ecosystem governance.',
      img: '/assets/Home Page Photo/executive_group_photo.webp'
    }
  ];

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/home`, { headers: getAuthHeaders() });
        if (r.ok) {
          const d = await r.json();
          setDashboard(d);
          setCachedWallet({
            available_balance: d.available_balance ?? d.wallet?.available_balance,
            personal_balance: d.personal_balance ?? d.wallet?.personal_balance,
            commission_balance: d.commission_balance ?? d.wallet?.commission_balance,
            total_balance: d.total_balance ?? d.wallet?.total_balance,
            lifetime_earned: d.wallet?.lifetime_earned,
            today_earned: d.summary?.today_earned,
            monthly_earned: d.summary?.monthly_earned,
            tasks_completed: d.task_progress?.completed,
            plan_code: d.plan?.code,
            user_name: d.profile?.full_name,
            referral_code: d.profile?.referral_code
          });
        }
      } catch {}
      setLoading(false);
    };
    fetchDashboard();

    // Listen for instant wallet updates from other pages
    const handleWalletUpdate = (e) => {
      const u = e.detail;
      if (!u) return;
      setDashboard((prev) => ({
        ...prev,
        wallet: {
          ...prev.wallet,
          available_balance: u.available_balance,
          total_balance: u.total_balance,
          personal_balance: u.personal_balance,
          commission_balance: u.commission_balance
        },
        available_balance: u.available_balance,
        personal_balance: u.personal_balance,
        commission_balance: u.commission_balance,
        total_balance: u.total_balance
      }));
    };
    window.addEventListener('cc_wallet_updated', handleWalletUpdate);

    // Fetch active announcement for start pop-up
    const fetchAnnouncement = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/announcements/active`);
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data) && data.length > 0) {
            const ann = data[0];
            const mode = ann.display_mode || 'every_visit';
            let shouldShow = true;

            if (mode === 'once_per_session') {
              if (sessionStorage.getItem(`cc_ann_dismissed_${ann.id}`)) shouldShow = false;
            } else if (mode === 'once_per_login') {
              if (localStorage.getItem(`cc_ann_dismissed_${ann.id}`)) shouldShow = false;
            }

            if (shouldShow) {
              setActiveAnnouncement(ann);
              setShowAnnouncementModal(true);
            }
          }
        }
      } catch {}
    };
    fetchAnnouncement();

    return () => {
      window.removeEventListener('cc_wallet_updated', handleWalletUpdate);
    };
  }, []);

  const handleDismissAnnouncement = () => {
    if (activeAnnouncement) {
      const mode = activeAnnouncement.display_mode || 'every_visit';
      if (mode === 'once_per_session') {
        sessionStorage.setItem(`cc_ann_dismissed_${activeAnnouncement.id}`, 'true');
      } else if (mode === 'once_per_login') {
        localStorage.setItem(`cc_ann_dismissed_${activeAnnouncement.id}`, 'true');
      }
    }
    setShowAnnouncementModal(false);
  };

  // Auto-scroll Platform Highlights every 4.5 seconds repeatedly (paused if tab inactive)
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setSlide((s) => (s + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const copyRef = () => {
    const code = dashboard.profile?.referral_code || 'CC1000';
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tasksCompleted = dashboard.task_progress?.completed || 0;
  const tasksTotal = dashboard.task_progress?.total || dashboard.plan?.daily_task_count || 2;
  const progressPercent = dashboard.task_progress?.percentage || 0;
  const dailyEarningsEst = tasksCompleted * Number(dashboard.plan?.unit_reward || 59);

  const quickNav = [
    {
      title: 'Invite Friends',
      icon: '/assets/Home page icons/invite_friends.webp',
      path: '/team'
    },
    {
      title: 'Recharge',
      icon: '/assets/Home page icons/recharge.webp',
      path: '/deposit'
    },
    {
      title: 'Withdraw',
      icon: '/assets/Home page icons/withdraw.webp',
      path: '/withdraw'
    },
    {
      title: 'Wealth Fund',
      icon: '/assets/Home page icons/wealth_fund.webp',
      isWealthFund: true
    },
    {
      title: 'Daily Check-in',
      icon: '/assets/Home page icons/daily_checkin.webp',
      path: '/checkin'
    },
    {
      title: 'News Center',
      icon: '/assets/Home page icons/news_center.webp',
      path: '/news'
    },
    {
      title: 'Loan',
      icon: '/assets/Home page icons/loan.webp',
      isLoan: true
    },
    {
      title: 'Lucky Draw',
      icon: '/assets/Home page icons/lucky_draw.webp',
      path: '/lucky-wheel'
    }
  ];

  const partners = [
    { name: 'Google AdMob', type: 'Mobile Ad Network', status: 'Active' },
    { name: 'Unity Ads', type: 'Rewarded Video SDK', status: 'Verified' },
    { name: 'AppLovin MAX', type: 'Programmatic Bidding', status: 'Active' },
    { name: 'ironSource', type: 'Mediation Platform', status: 'Connected' },
    { name: 'Meta Audience', type: 'Social Publisher Ads', status: 'Active' },
    { name: 'Mintegral', type: 'APAC Ad Exchange', status: 'Verified' },
    { name: 'Pangle', type: 'ByteDance Ad Network', status: 'Active' },
    { name: 'Liftoff', type: 'Performance Marketing', status: 'Verified' },
    { name: 'InMobi', type: 'Global Ad Exchange', status: 'Connected' },
    { name: 'AppsFlyer', type: 'Attribution & Analytics', status: 'Certified' }
  ];

  return (
    <Shell>
      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            style={{
              position: 'fixed',
              top: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              background: 'linear-gradient(135deg, rgba(30, 15, 55, 0.96), rgba(15, 7, 30, 0.96))',
              border: '1px solid rgba(203, 78, 255, 0.45)',
              borderRadius: '16px',
              padding: '12px 24px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(203, 78, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <Sparkles size={18} color="#cb4eff" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Hero Banner */}
      <div className="home-hero">
        <div className="hero-copy">
          <div className="hero-trust">
            <span><Sparkles size={14} /> Official Earning Portal</span>
            <span><ShieldCheck size={14} /> Instant Proof Verifications</span>
          </div>
          <h1>
            Smart Earning with <span>Code Clever</span>
          </h1>
          <p>
            Complete daily app evaluations, download sponsor apps, and build your team network to unlock predictable daily income credited directly to your digital wallet.
          </p>
          <div className="actions">
            <button className="gradient-btn" onClick={() => nav('/tasks')} aria-label="Go to Daily Task Center">
              <ListTodo size={18} /> Daily Task Center
            </button>
            <button className="outline-btn" onClick={() => nav('/plans')} aria-label="Upgrade Earning Plan">
              <Crown size={18} /> Upgrade Plan
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-character">
            <img src="/assets/logo.jpeg" alt="Code Clever Logo" width="145" height="145" fetchPriority="high" />
          </div>
          <div className="hero-orbit orbit-a" />
          <div className="hero-orbit orbit-b" />
          <div className="floating-badge badge-income">
            <Wallet size={18} />
            <div>
              <span>Available Balance</span>
              <strong>Rs. {fmt(dashboard.wallet?.available_balance)}</strong>
            </div>
          </div>
          <div className="floating-badge badge-task">
            <CheckCircle2 size={18} />
            <div>
              <span>Tasks Finished</span>
              <strong>{tasksCompleted} / {tasksTotal}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. System Notice (Relocated: EXACTLY BEFORE Platform Highlights) */}
      {showNotice && (
        <div className="home-notice">
          <div>
            <Zap size={18} />
            <div>
              <b>System Notice:</b> Daily task reset occurs at 00:00 UTC. Ensure all proof submissions are completed before the daily cycle ends.
            </div>
          </div>
          <button onClick={() => setShowNotice(false)} aria-label="Dismiss System Notice">Dismiss</button>
        </div>
      )}

      {/* 3. Platform Highlights Showcase Slider (Auto-rotates smoothly every 2s) */}
      <div className="company-section">
        <div className="section-title">
          <div>
            <h2>Platform Highlights</h2>
            <p>Empowering digital workforce and publisher ecosystems across South Asia.</p>
          </div>
        </div>
        <div className="company-showcase">
          <div className="company-image">
            <img
              src={slides[slide].img}
              alt={slides[slide].title}
              width="800"
              height="400"
              fetchPriority={slide === 0 ? "high" : "auto"}
              loading={slide === 0 ? "eager" : "lazy"}
            />
            <div className="company-overlay">
              <span>{slides[slide].tag}</span>
              <h3>{slides[slide].title}</h3>
              <p>{slides[slide].desc}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 8 3D Quick Action Icons */}
      <div className="home-icons-container">
        <div className="home-icons-grid">
          {quickNav.map((item) => (
            <motion.button
              key={item.title}
              whileHover={{ y: -4, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="home-icon-card"
              aria-label={item.title}
              onClick={() => {
                if (item.isLoan) {
                  setShowLoanModal(true);
                } else if (item.isWealthFund) {
                  triggerToast('Wealth Fund coming soon');
                } else if (item.path) {
                  nav(item.path);
                }
              }}
            >
              <div className="home-icon-img-wrap">
                <img src={item.icon} alt={item.title} width="48" height="48" loading="lazy" />
              </div>
              <span className="home-icon-title">{item.title}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* 5. Live Stats Grid */}
      <div className="stats home-stats">
        <Stat
          icon={Wallet}
          label="Available Balance"
          value={`Rs. ${fmt(dashboard.wallet?.available_balance ?? dashboard.available_balance ?? dashboard.summary?.available_balance ?? 0)}`}
          sub="Ready for withdrawal"
        />
        <Stat
          icon={TrendingUp}
          label="Today's Earned"
          value={`Rs. ${fmt(dailyEarningsEst)}`}
          sub={`${tasksCompleted} tasks completed`}
        />
        <Stat
          icon={Crown}
          label="Active Plan"
          value={dashboard.plan?.code || 'C1'}
          sub={`Rs. ${fmt(dashboard.plan?.unit_reward || 59)} / task`}
        />
        <Stat
          icon={UsersRound}
          label="Team Network"
          value={dashboard.team?.total_members || 0}
          sub={`Rs. ${fmt(dashboard.team?.lifetime_commission || 0)} earned`}
        />
      </div>

      {/* 6. Today's Task Progress & Refer Section */}
      <div className="home-grid-section">
        <div className="daily-card">
          <div className="section-title">
            <h2>Today's Task Progress</h2>
            <NavLink to="/tasks" className="link-btn">
              Go to Tasks <ChevronRight size={16} />
            </NavLink>
          </div>
          <div className="progress-layout">
            <div className="progress-ring">
              <div>
                <strong>{progressPercent}%</strong>
                <span>COMPLETED</span>
              </div>
            </div>
            <div className="progress-copy">
              <h3>{tasksCompleted} of {tasksTotal} Tasks Submitted</h3>
              <p>
                Complete your daily app evaluations to claim your full plan quota of{' '}
                <b>Rs. {fmt(tasksTotal * Number(dashboard.plan?.unit_reward || 59))}</b> today.
              </p>
              <div className="wide-progress">
                <i style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="progress-meta">
                <span>Current Plan: {dashboard.plan?.code}</span>
                <b>{tasksTotal - tasksCompleted} tasks remaining</b>
              </div>
            </div>
          </div>
        </div>

        <div className="referral-card">
          <div className="section-title">
            <h2>Refer & Earn</h2>
          </div>
          <p>Share your unique invitation code with friends and earn multi-tier commissions on their activations.</p>
          <div className="ref-code">
            <span>{dashboard.profile?.referral_code || 'CC1000'}</span>
            <button onClick={copyRef}>
              {copied ? <Check size={14} /> : <ExternalLink size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button className="outline-btn" onClick={() => nav('/team')}>
            View Team Network <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* 7. Certified Publisher & Advertising Network */}
      <div className="partners-banner">
        <div className="section-title">
          <div>
            <h2>Certified Publisher & Advertising Network</h2>
            <p>Direct API integration with tier-1 global mobile advertising and monetization platforms.</p>
          </div>
        </div>
        <div className="partners-grid">
          {partners.map((partner) => (
            <div key={partner.name} className="partner-card">
              <div className="partner-icon-wrap">
                <Globe size={22} />
              </div>
              <b>{partner.name}</b>
              <span>{partner.type}</span>
              <small>● {partner.status}</small>
            </div>
          ))}
        </div>
      </div>

      {/* ----------------- LOAN FEATURE COMING SOON MODAL ----------------- */}
      <AnimatePresence>
        {showLoanModal && (
          <div className="admin-modal-backdrop" onClick={() => setShowLoanModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="admin-user-modal"
              style={{ maxWidth: '480px', textAlign: 'center' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setShowLoanModal(false)}>
                <X size={18} />
              </button>

              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '22px',
                  background: 'linear-gradient(145deg, #38125e, #100624)',
                  border: '2px solid #a83dff',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 0 25px rgba(184, 61, 255, 0.4)'
                }}
              >
                <img
                  src="/assets/Home page icons/loan.png"
                  alt="Loan"
                  style={{ width: '46px', height: '46px', objectFit: 'contain' }}
                />
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(203,78,255,0.15)', border: '1px solid rgba(203,78,255,0.3)', padding: '3px 12px', borderRadius: 99, marginBottom: 12 }}>
                <Clock size={12} color="#e879f9" />
                <span style={{ fontSize: 11.5, fontWeight: 800, color: '#e879f9' }}>COMING SOON</span>
              </div>

              <h2 style={{ fontSize: '22px', margin: '0 0 8px', color: '#fff' }}>
                Code Clever Micro-Loan Facility
              </h2>

              <p style={{ color: '#aaa1c0', fontSize: '13px', margin: '0 0 20px', lineHeight: 1.5 }}>
                This feature is currently under final preparation for our active members. Soon, qualified members will be eligible to apply for instant, interest-free salary advances and task credit based on their account Tier level.
              </p>

              <button
                type="button"
                className="gradient-btn"
                style={{ width: '100%', justifyContent: 'center', height: '46px' }}
                onClick={() => setShowLoanModal(false)}
              >
                <CheckCircle2 size={18} /> Understood
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------- GLOBAL ANNOUNCEMENT POP-UP MODAL ----------------- */}
      <AnimatePresence>
        {showAnnouncementModal && activeAnnouncement && (
          <div className="admin-modal-backdrop" onClick={handleDismissAnnouncement}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="admin-user-modal announcement-popup-card"
              style={{ maxWidth: '520px', padding: 0, overflow: 'hidden' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Icon Button */}
              <button
                className="modal-close"
                style={{ top: 12, right: 12, zIndex: 10, background: 'rgba(0,0,0,0.6)' }}
                onClick={handleDismissAnnouncement}
              >
                <X size={18} />
              </button>

              {/* Banner Image if exists */}
              {activeAnnouncement.image_url && (
                <div className="announcement-banner-wrap">
                  <img
                    src={getAppIconUrl(activeAnnouncement.image_url, activeAnnouncement.title)}
                    alt={activeAnnouncement.title}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="announcement-banner-overlay" />
                </div>
              )}

              <div style={{ padding: '20px 24px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div className="announcement-pill">
                    <Megaphone size={12} />
                    <span>Official Announcement</span>
                  </div>
                </div>

                <h2 style={{ fontSize: '20px', margin: '0 0 10px', color: '#fff', fontWeight: 800 }}>
                  {activeAnnouncement.title}
                </h2>

                <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.55, margin: '0 0 20px', whiteSpace: 'pre-line' }}>
                  {activeAnnouncement.message}
                </p>

                <div style={{ display: 'grid', gap: '10px' }}>
                  {activeAnnouncement.action_url && (
                    <a
                      href={activeAnnouncement.action_url}
                      target="_blank"
                      rel="noreferrer"
                      className="gradient-btn"
                      style={{ justifyContent: 'center', height: '46px', textDecoration: 'none' }}
                      onClick={handleDismissAnnouncement}
                    >
                      <Send size={16} /> {activeAnnouncement.action_text || 'Join WhatsApp Channel'}
                    </a>
                  )}

                  <button
                    type="button"
                    className="outline-btn"
                    style={{ justifyContent: 'center', height: '44px', color: '#94a3b8' }}
                    onClick={handleDismissAnnouncement}
                  >
                    Dismiss & Continue to Portal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Shell>
  );
}
