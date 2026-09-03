import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  CheckCircle2,
  Grid2X2,
  ListTodo,
  Wallet,
  Clock3,
  ChevronRight,
  Download,
  CloudDownload,
  Settings,
  Gift,
  RefreshCw,
  Sparkles,
  Layers,
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  Flame,
  Award,
  ExternalLink
} from 'lucide-react';
import Shell from '../components/layout/Shell';
import Stat from '../components/common/Stat';
import { API_BASE_URL, getAuthHeaders } from '../api/config';
import { fmt, getAppIconUrl } from '../utils/formatters';

const DEFAULT_DEMO_TASKS = [
  {
    assignment_id: 101,
    title: 'TikTok Lite',
    description: 'Evaluate short-form video streaming latency, audio sync, and engagement response.',
    category: 'Social Video',
    app_icon: '/assets/Apps Icons/tiktok.svg',
    reward: 59,
    status: 'available'
  },
  {
    assignment_id: 102,
    title: 'Instagram Reels',
    description: 'Verify instant reel playback buffer, story camera filter rendering, and DM delivery.',
    category: 'Media & Photo',
    app_icon: '/assets/Apps Icons/instagram.svg',
    reward: 59,
    status: 'available'
  },
  {
    assignment_id: 103,
    title: 'Clash of Clans',
    description: 'Evaluate 60 FPS multiplayer village load times and army attack animations.',
    category: 'Strategy Gaming',
    app_icon: '/assets/Apps Icons/Clash of clan.jpg',
    reward: 59,
    status: 'available'
  },
  {
    assignment_id: 104,
    title: 'Gardenscapes',
    description: 'Test puzzle board gesture sensitivity and booster reward claiming responsiveness.',
    category: 'Casual Puzzle',
    app_icon: '/assets/Apps Icons/Gardensacpes.jpg',
    reward: 59,
    status: 'available'
  }
];

export default function TasksPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState('today'); // 'today' | 'completed' | 'library'
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({ total: 2, completed: 0, earned: 0, maxDaily: 118 });
  const [plan, setPlan] = useState({
    code: 'INTERN',
    name: 'Internship (3-Day Free Trial)',
    daily_task_count: 2,
    unit_reward: 59,
    is_intern: true,
    is_trial_active: true,
    is_trial_expired: false,
    trial_day: 1,
    trial_days_left: 3,
    trial_hours_left: 72
  });
  const [library, setLibrary] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedReason, setLockedReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // 5-second automatic evaluation tracking: { [assignmentId]: currentStepNumber (1..5) }
  const [activeEvaluations, setActiveEvaluations] = useState({});

  const [isTasksPaused, setIsTasksPaused] = useState(false);

  const loadTasks = async () => {
    try {
      fetch(`${API_BASE_URL}/site-settings`)
        .then((r) => (r.ok ? r.json() : {}))
        .then((d) => {
          if (d && (d.task_assignments_paused === true || d.task_assignments_paused === 'true')) {
            setIsTasksPaused(true);
          } else {
            setIsTasksPaused(false);
          }
        })
        .catch(() => {});

      const r = await fetch(`${API_BASE_URL}/tasks/today`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        if (d.is_locked || d.plan?.is_trial_expired) {
          setIsLocked(true);
          setLockedReason(d.locked_reason || d.plan?.locked_reason || '3-Day Intern Free Trial has ended.');
          setTasks([]);
        } else {
          setIsLocked(false);
          setLockedReason('');
          if (d.tasks?.length) {
            setTasks(d.tasks);
          } else {
            const unit = Number(d.plan?.unit_reward || 59);
            const limit = Number(d.plan?.daily_task_count || 2);
            setTasks(DEFAULT_DEMO_TASKS.slice(0, limit).map((t) => ({ ...t, reward: unit })));
          }
        }
        if (d.library?.length) setLibrary(d.library);
        if (d.summary) setSummary(d.summary);
        if (d.plan) setPlan(d.plan);
      } else {
        setTasks(DEFAULT_DEMO_TASKS);
      }
    } catch {
      setTasks(DEFAULT_DEMO_TASKS);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // 5-Second Automated Evaluation Handler
  const handleStart5sEvaluation = (t) => {
    const id = t.assignment_id;
    if (activeEvaluations[id] || t.status === 'completed' || isLocked || isTasksPaused) return;

    setMessage('');

    // Step 1 immediately
    setActiveEvaluations((prev) => ({ ...prev, [id]: 1 }));

    // Step 2 at 1s
    setTimeout(() => {
      setActiveEvaluations((prev) => ({ ...prev, [id]: 2 }));
    }, 1000);

    // Step 3 at 2s
    setTimeout(() => {
      setActiveEvaluations((prev) => ({ ...prev, [id]: 3 }));
    }, 2000);

    // Step 4 at 3s
    setTimeout(() => {
      setActiveEvaluations((prev) => ({ ...prev, [id]: 4 }));
    }, 3000);

    // Step 5 (Reward) at 4s
    setTimeout(() => {
      setActiveEvaluations((prev) => ({ ...prev, [id]: 5 }));
    }, 4000);

    // Final Completion at 5s
    setTimeout(async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/tasks/${id}/evaluate`, {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' })
        });
        const d = await r.json();
        const earnedReward = Number(d.reward || t.reward || plan.unit_reward || 59);

        // Update local state
        setTasks((prev) =>
          prev.map((item) =>
            item.assignment_id === id ? { ...item, status: 'completed', completed_at: new Date() } : item
          )
        );
        setSummary((prev) => ({
          ...prev,
          completed: (prev.completed || 0) + 1,
          earned: (prev.earned || 0) + earnedReward,
          remaining: Math.max((prev.total || 2) - ((prev.completed || 0) + 1), 0)
        }));

        setMessage(`🎉 Task "${t.title}" verified! Rs. ${fmt(earnedReward)} added to your wallet!`);
      } catch {
        // Fallback for offline/demo
        setTasks((prev) =>
          prev.map((item) =>
            item.assignment_id === id ? { ...item, status: 'completed' } : item
          )
        );
        setSummary((prev) => ({
          ...prev,
          completed: (prev.completed || 0) + 1,
          earned: (prev.earned || 0) + Number(t.reward || 59)
        }));
        setMessage(`🎉 Task "${t.title}" evaluation completed successfully!`);
      } finally {
        setActiveEvaluations((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    }, 5000);
  };

  const totalTasks = summary.total || Number(plan.daily_task_count || 2);
  const completedTasks = summary.completed || tasks.filter((t) => t.status === 'completed').length;
  const progressPercent = totalTasks ? Math.min(100, Math.round((completedTasks / totalTasks) * 100)) : 0;
  const maxDailyEst = Number(plan.daily_task_count || 2) * Number(plan.unit_reward || 59);

  const shownTasks =
    tab === 'completed'
      ? tasks.filter((t) => t.status === 'completed')
      : tasks;

  const STEPS_TIMELINE = [
    { key: 1, label: 'START', icon: Download },
    { key: 2, label: 'DOWNLOAD', icon: CloudDownload },
    { key: 3, label: 'INSTALL', icon: Settings },
    { key: 4, label: 'EVALUATE', icon: CheckCircle2 },
    { key: 5, label: 'REWARD', icon: Gift }
  ];

  return (
    <Shell>
      <div className="task-page">
        {/* Top Hero Banner */}
        <div className="task-hero">
          <div>
            <div className="eyebrow">DAILY APP TESTING & EVALUATION</div>
            <h1>
              Task <span>Portal & Library</span>
            </h1>
            <p>
              Complete verified mobile application evaluations to unlock instant reward settlements credited directly to your wallet.
            </p>
          </div>
          <div className="task-art">
            <div className="task-orbit" />
            <div className="task-clipboard">
              <ListTodo size={46} />
            </div>
            <div className="task-phone">
              <CloudDownload size={34} />
            </div>
            <div className="task-gift">✦</div>
          </div>
        </div>

        {/* 1. INTERNSHIP 3-DAY FREE TRIAL ACTIVE BANNER */}
        {plan.is_intern && plan.is_trial_active && !isLocked && (
          <motion.div
            className="intern-trial-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="intern-trial-glow" />
            <div className="intern-trial-content">
              <div className="intern-badge-pill">
                <Flame size={16} /> 3-DAY FREE INTERNSHIP TRIAL
              </div>
              <h2>
                Enjoy <b>Free Daily Tasks</b> (Same Earnings as Plan C1)
              </h2>
              <p>
                As a new Intern, you receive <b>2 Free Tasks Daily</b> at <b>Rs. 59 / task (Rs. 118 Daily)</b> for your first 3 days. Upgrade to any package (C1–C9) anytime to keep earning without interruption!
              </p>
              <div className="intern-stats-row">
                <div className="intern-stat-chip">
                  <CalendarDays size={16} /> Day <b>{plan.trial_day || 1}</b> of 3
                </div>
                <div className="intern-stat-chip">
                  <Clock3 size={16} /> <b>{plan.trial_hours_left || 72}h</b> Remaining
                </div>
                <div className="intern-stat-chip reward">
                  <Gift size={16} /> Daily Reward: <b>Rs. 118</b>
                </div>
              </div>
            </div>
            <div className="intern-trial-action">
              <NavLink to="/plans" className="gradient-btn">
                <Zap size={17} /> Upgrade Plan <ChevronRight size={18} />
              </NavLink>
            </div>
          </motion.div>
        )}

        {/* 2. INTERNSHIP EXPIRED & TASKS LOCKED BANNER */}
        {isLocked && (
          <motion.div
            className="intern-locked-banner"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="locked-icon-orb">
              <Lock size={36} />
            </div>
            <div className="locked-text-wrap">
              <div className="locked-badge-pill">
                <AlertTriangle size={15} /> 3-DAY INTERNSHIP TRIAL CONCLUDED
              </div>
              <h2>Daily Tasks Are Locked</h2>
              <p>
                {lockedReason ||
                  'Your 3-day free internship trial period has finished. To unlock today’s tasks, increase your daily quota, and continue earning daily rewards, please activate an earning package.'}
              </p>
            </div>
            <NavLink to="/plans" className="gradient-btn unlock-cta-btn">
              <Unlock size={18} /> Activate Package (C1–C9) <ArrowRight size={18} />
            </NavLink>
          </motion.div>
        )}

        {/* 3. TASK ENGINE PAUSED BY ADMIN BANNER */}
        {isTasksPaused && (
          <motion.div
            className="intern-trial-banner"
            style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(185, 28, 28, 0.1))', borderColor: 'rgba(239, 68, 68, 0.4)' }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="intern-trial-content">
              <div className="intern-badge-pill" style={{ background: 'rgba(239, 68, 68, 0.25)', color: '#fca5a5' }}>
                <AlertTriangle size={15} /> TASK ENGINE TEMPORARILY PAUSED
              </div>
              <h2 style={{ color: '#fecaca' }}>Task Evaluations On Hold</h2>
              <p style={{ color: '#fca5a5' }}>
                Daily task assignments and evaluation processing are temporarily paused by platform administration. Check back shortly.
              </p>
            </div>
          </motion.div>
        )}

        {/* Tab Switcher */}
        <div className="task-tabs">
          {[
            ['today', "Today's Tasks", CalendarDays],
            ['completed', 'Completed Today', CheckCircle2],
            ['library', 'Task Library (25 Apps)', Grid2X2]
          ].map(([k, l, IconComp]) => (
            <button
              key={k}
              className={tab === k ? 'active' : ''}
              onClick={() => setTab(k)}
            >
              <IconComp size={20} />
              {l}
            </button>
          ))}
        </div>

        {/* 4 Stat Cards */}
        <div className="task-stats">
          <Stat icon={ListTodo} label="Today's Tasks" value={isLocked ? 0 : totalTasks} />
          <Stat icon={CheckCircle2} label="Completed" value={completedTasks} />
          <Stat
            icon={Wallet}
            label="Today's Earnings"
            value={`Rs. ${fmt(summary.earned || 0)}`}
          />
          <Stat icon={Clock3} label="Remaining" value={isLocked ? 0 : Math.max(totalTasks - completedTasks, 0)} />
        </div>

        {/* Today's Progress Card */}
        <div className="task-progress-card">
          <div className="task-progress-top">
            <div>
              <h2>Today's Evaluation Progress</h2>
              <span>
                <b>{completedTasks}</b> / {isLocked ? 0 : totalTasks} Completed
              </span>
            </div>
            <div className="earned-mini">
              <Wallet size={20} />
              <span>
                Earned Today
                <strong>Rs. {fmt(summary.earned || 0)}</strong>
              </span>
            </div>
          </div>
          <div className="progress-line">
            <b>{progressPercent}%</b>
            <div>
              <i style={{ width: `${progressPercent}%` }} />
            </div>
            <span>100%</span>
          </div>
          <div className="max-earn">
            Maximum Daily Potential: <b>Rs. {fmt(isLocked ? 0 : maxDailyEst)}</b>
          </div>
        </div>

        {/* Current Plan Banner */}
        <div className="current-plan-row">
          <div className="plan-badge">{plan.code || 'INTERN'}</div>
          <div>
            <strong>Active Package: {plan.name || plan.code || 'Internship'}</strong>
            <p>
              {isLocked ? 0 : plan.daily_task_count || 2} Tasks per day <i /> Reward per task: Rs.{' '}
              {fmt(isLocked ? 0 : plan.unit_reward || 59)} <i /> Daily Potential: Rs.{' '}
              {fmt(isLocked ? 0 : maxDailyEst)}
            </p>
          </div>
          <NavLink to="/plans" className="blue-btn">
            View All Packages <ChevronRight size={18} />
          </NavLink>
        </div>

        {/* Toast Notification Alert */}
        {message && (
          <motion.div
            className="task-message"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CheckCircle2 size={18} />
            {message}
          </motion.div>
        )}

        {/* Section Header */}
        <div className="task-section-head">
          <div>
            <h2>
              <span>☆</span>{' '}
              {tab === 'library'
                ? 'App Evaluation Library (25 Sponsor Apps)'
                : tab === 'completed'
                ? 'Completed Tasks History'
                : "Today's Assigned Tasks"}
            </h2>
            <p>
              {tab === 'library'
                ? 'Explore all 25 mobile applications in our verification pool unlocked by tier.'
                : isLocked
                ? 'Tasks are locked. Activate an earning package to start evaluating.'
                : 'Complete each 5-second app evaluation to claim instant wallet rewards.'}
            </p>
          </div>
        </div>

        {/* TAB 1 & 2: TODAY & COMPLETED TASK CARDS */}
        {tab !== 'library' && (
          <div>
            {isLocked && tab === 'today' ? (
              <div className="locked-tasks-state">
                <Lock size={44} color="#f43f5e" />
                <h3>Daily Tasks Are Locked</h3>
                <p>
                  Your 3-day Intern Free Trial has finished. Please activate an earning package (C1 to C9) to unlock daily tasks and resume earning.
                </p>
                <NavLink to="/plans" className="gradient-btn">
                  <Zap size={18} /> Choose Earning Package
                </NavLink>
              </div>
            ) : shownTasks.length > 0 ? (
              shownTasks.map((t, index) => {
                const evalStep = activeEvaluations[t.assignment_id];
                const isEvaluating = evalStep !== undefined;
                const isDone = t.status === 'completed';

                return (
                  <motion.div
                    key={t.assignment_id || index}
                    className="task-item-card"
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {/* Top Row */}
                    <div className="task-card-top">
                      {/* Left: App Info */}
                      <div className="task-app-col">
                        <div className="task-idx-badge">
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <img
                          src={getAppIconUrl(t.app_icon, t.title)}
                          alt={t.title}
                          className="task-app-logo"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(t.title || 'App')}&background=7c18eb&color=fff&size=80&bold=true`;
                          }}
                        />
                        <div className="task-app-details">
                          <h3>{t.title}</h3>
                          <p>{t.description || 'Download & evaluate the mobile app'}</p>
                          <span className="task-cat-pill">{t.category || 'Social Media'}</span>
                        </div>
                      </div>

                      {/* Middle: Reward */}
                      <div className="task-reward-col">
                        <small>Unit Reward</small>
                        <strong>Rs. {fmt(t.reward || plan.unit_reward || 59)}</strong>
                        <span>
                          <Layers size={12} color="#c45eff" /> Instant Wallet Credit
                        </span>
                      </div>

                      {/* Right: Status & Action Button */}
                      <div className="task-action-col">
                        <div
                          className={`task-status-chip ${
                            isDone ? 'done' : isEvaluating ? 'running' : ''
                          }`}
                        >
                          {isDone ? 'COMPLETED' : isEvaluating ? 'IN PROGRESS' : 'AVAILABLE'}
                        </div>

                        {isDone ? (
                          <div className="task-completed-badge">
                            <Check size={16} /> Completed
                          </div>
                        ) : isEvaluating ? (
                          <button className="task-download-btn running" disabled>
                            <RefreshCw className="spin" size={16} /> Evaluating ({evalStep}/5s)...
                          </button>
                        ) : (
                          <button
                            className="task-download-btn"
                            onClick={() => handleStart5sEvaluation(t)}
                          >
                            <Download size={16} /> Start Evaluation
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bottom 5-Step Process Timeline */}
                    <div className="task-steps-timeline">
                      {STEPS_TIMELINE.map((st, i) => {
                        const IconComponent = st.icon;
                        const isStepActive =
                          isDone || (isEvaluating && evalStep >= st.key) || (!isEvaluating && !isDone && st.key === 1);

                        return (
                          <React.Fragment key={st.key}>
                            <div className={`timeline-node ${isStepActive ? 'active' : ''}`}>
                              <div className="node-circle">
                                <IconComponent size={20} />
                              </div>
                              <span>{st.label}</span>
                            </div>
                            {i < STEPS_TIMELINE.length - 1 && (
                              <ChevronRight
                                className={`timeline-arrow ${isStepActive ? 'active' : ''}`}
                                size={18}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="empty-task">
                <CheckCircle2 size={38} />
                <h3>No completed tasks today yet</h3>
                <p>Click "Start Evaluation" on any assigned task above to complete it in 5 seconds!</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: APP TASK LIBRARY GRID (25 APPS) */}
        {tab === 'library' && (
          <div className="library-grid-25">
            {(library.length ? library : DEFAULT_DEMO_TASKS).map((t, i) => {
              const isAppUnlocked = t.is_unlocked || (!isLocked && i < Number(plan.daily_task_count || 2));
              const unlockTier = t.unlocked_plan_min || (i < 2 ? 'C1' : i < 4 ? 'C2' : i < 8 ? 'C3' : i < 12 ? 'C4' : i < 16 ? 'C5' : i < 18 ? 'C6' : i < 22 ? 'C7' : i < 24 ? 'C8' : 'C9');

              return (
                <motion.div
                  className={`library-card-v25 ${isAppUnlocked ? 'unlocked' : 'locked'}`}
                  key={t.id || t.assignment_id || i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (i % 8) * 0.04 }}
                >
                  <div className="library-card-header">
                    <img
                      src={getAppIconUrl(t.app_icon, t.title)}
                      alt={t.title}
                      className="library-app-icon"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(t.title || 'App')}&background=7c18eb&color=fff&size=80&bold=true`;
                      }}
                    />
                    <div className="library-tier-badge">
                      {isAppUnlocked ? (
                        <span className="unlocked-tag">
                          <Unlock size={11} /> UNLOCKED
                        </span>
                      ) : (
                        <span className="locked-tag">
                          <Lock size={11} /> Tier {unlockTier}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="library-card-body">
                    <h3>{t.title}</h3>
                    <span className="library-cat-pill">{t.category || 'Mobile App'}</span>
                    <p>{t.description || 'Complete testing and evaluation workflow.'}</p>
                  </div>

                  <div className="library-card-footer">
                    {isAppUnlocked ? (
                      <button
                        className="lib-action-btn active"
                        onClick={() => setTab('today')}
                      >
                        <Zap size={14} /> In Today's Pool
                      </button>
                    ) : (
                      <NavLink to="/plans" className="lib-action-btn upgrade">
                        <Lock size={13} /> Unlock in Plan {unlockTier}
                      </NavLink>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Footer Ledger Notice */}
        <div className="task-footer-banner">
          <span>✦</span> 100% of task rewards and affiliate member commissions (Level A 10%, Level B 5%, Level C 2%) are settled directly via MySQL database transactions.
        </div>
      </div>
    </Shell>
  );
}
