import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Wrench,
  Wallet,
  ArrowDownLeft,
  UserPlus,
  UserCheck,
  ClipboardList,
  Gift,
  Users,
  CheckCircle2,
  AlertCircle,
  Power,
  RotateCcw,
  RefreshCw,
  Trash2,
  AlertTriangle,
  X,
  ShieldCheck
} from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../../api/config';

export default function AdminSiteControls({ settings: initialSettings, onAction }) {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Reset Dataset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/site-settings`);
      if (res.ok) {
        const d = await res.json();
        setSettings(d);
      }
    } catch {}
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (Array.isArray(initialSettings)) {
      const map = {};
      initialSettings.forEach((s) => {
        map[s.setting_key] = s.value_json === 'true' || s.value_json === true;
      });
      setSettings((prev) => ({ ...prev, ...map }));
    }
  }, [initialSettings]);

  const handleToggle = async (settingKey, currentFeatureState, label, invert = false) => {
    const nextFeatureState = !currentFeatureState;
    const valueToSend = invert ? !nextFeatureState : nextFeatureState;

    setLoading(true);
    setMsg('');
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ key: settingKey, value: valueToSend })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update setting');

      setSettings((prev) => ({ ...prev, [settingKey]: valueToSend }));
      setMsg(`${label} is now ${nextFeatureState ? 'ENABLED & ACTIVE' : 'PAUSED & DISABLED'}.`);
      if (onAction) onAction();
    } catch (err) {
      setError(err.message || 'Failed to update setting.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteReset = async (e) => {
    e.preventDefault();
    if (confirmText.trim().toUpperCase() !== 'RESET') return;

    setResetting(true);
    setError('');
    setMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/admin/system/reset-all-data-except-admin`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ confirmation: 'RESET' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset dataset');

      setMsg(data.message || 'Complete dataset purged successfully. Master Admin preserved.');
      setShowResetModal(false);
      setConfirmText('');
      if (onAction) onAction();
    } catch (err) {
      setError(err.message || 'Failed to reset dataset.');
    } finally {
      setResetting(false);
    }
  };

  const isMaintenanceActive = settings.maintenance_mode === true || settings.maintenance_mode === 'true';
  const isWithdrawalsActive = settings.withdrawals_enabled !== false && settings.withdrawals_enabled !== 'false';
  const isDepositsActive = settings.deposits_enabled !== false && settings.deposits_enabled !== 'false';
  const isRegistrationsActive = settings.new_registrations !== false && settings.new_registrations !== 'false';
  const isTasksRunning = settings.task_assignments_paused !== true && settings.task_assignments_paused !== 'true';
  const isLuckyWheelActive = settings.lucky_wheel_enabled !== false && settings.lucky_wheel_enabled !== 'false';
  const isCommissionsActive = settings.team_commissions_enabled !== false && settings.team_commissions_enabled !== 'false';
  const isRequireActivePlanToRefer = settings.require_active_plan_to_refer !== false && settings.require_active_plan_to_refer !== 'false';

  const policies = [
    {
      key: 'maintenance_mode',
      name: 'Platform Maintenance Mode',
      desc: 'Temporarily lock public member access for system upgrades. Non-admin users are restricted to the maintenance screen.',
      icon: Wrench,
      isRunning: !isMaintenanceActive,
      activeLabel: 'Normal (Live Open)',
      inactiveLabel: 'Maintenance (Restricted)',
      color: '#f97316',
      invert: true
    },
    {
      key: 'withdrawals_enabled',
      name: 'User Withdrawals Gateway',
      desc: 'Controls whether members can submit cashout withdrawal requests across JazzCash, Easypaisa, SadaPay, and Bank accounts.',
      icon: Wallet,
      isRunning: isWithdrawalsActive,
      activeLabel: 'Accepting (Live)',
      inactiveLabel: 'Frozen (Disabled)',
      color: '#4ade80',
      invert: false
    },
    {
      key: 'deposits_enabled',
      name: 'Deposit & Recharge Submissions',
      desc: 'Controls whether members can submit balance recharge and package upgrade payment verification slips.',
      icon: ArrowDownLeft,
      isRunning: isDepositsActive,
      activeLabel: 'Accepting (Live)',
      inactiveLabel: 'Paused (Disabled)',
      color: '#38bdf8',
      invert: false
    },
    {
      key: 'new_registrations',
      name: 'New Member Registration',
      desc: 'Allow new users to sign up and register accounts via referral invitation links.',
      icon: UserPlus,
      isRunning: isRegistrationsActive,
      activeLabel: 'Open (Accepting)',
      inactiveLabel: 'Closed (Restricted)',
      color: '#a855f7',
      invert: false
    },
    {
      key: 'require_active_plan_to_refer',
      name: 'Require Active Package to Share & Invite',
      desc: 'Only allow members who have activated a paid package (Plan C1 to C9) to share their referral link and invite new team members.',
      icon: UserCheck,
      isRunning: isRequireActivePlanToRefer,
      activeLabel: 'Active (Package Required)',
      inactiveLabel: 'Open (Any Member Can Share)',
      color: '#c084fc',
      invert: false
    },
    {
      key: 'task_assignments_paused',
      name: 'Daily Task Engine & Completion',
      desc: 'Controls whether active subscribed members can access, perform, and submit daily application rating tasks.',
      icon: ClipboardList,
      isRunning: isTasksRunning,
      activeLabel: 'Running (Active)',
      inactiveLabel: 'Paused (Hold)',
      color: '#ec4899',
      invert: true
    },
    {
      key: 'lucky_wheel_enabled',
      name: 'Lucky Prize Wheel Access',
      desc: 'Allow users to spin the daily lucky prize wheel to win balance and commission bonuses.',
      icon: Gift,
      isRunning: isLuckyWheelActive,
      activeLabel: 'Enabled (Active)',
      inactiveLabel: 'Disabled (Hidden)',
      color: '#eab308',
      invert: false
    },
    {
      key: 'team_commissions_enabled',
      name: '3-Tier Referral Auto-Commissions',
      desc: 'Automatically credit Level 1 (10%), Level 2 (5%), and Level 3 (2%) team rewards on subordinate earnings.',
      icon: Users,
      isRunning: isCommissionsActive,
      activeLabel: 'Active (Auto-Credit)',
      inactiveLabel: 'Disabled (Paused)',
      color: '#10b981',
      invert: false
    }
  ];

  return (
    <div className="admin-site-controls-page">
      <div className="admin-section-head">
        <div>
          <h2>Platform Settings & Live System Killswitches</h2>
          <p>Real-time policy enforcement for financial gateways, registration access, task processing, wheel events, and system maintenance.</p>
        </div>
      </div>

      {msg && (
        <div className="admin-cc-alert success" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={18} /> <span>{msg}</span>
        </div>
      )}
      {error && (
        <div className="admin-cc-alert error" style={{ marginBottom: 16 }}>
          <AlertCircle size={18} /> <span>{error}</span>
        </div>
      )}

      {/* System Policy Cards Grid */}
      <div className="admin-policy-list">
        {policies.map((p) => {
          const Icon = p.icon;
          const isLive = p.isRunning;

          return (
            <div key={p.key} className={`admin-policy-card ${!isLive ? 'is-disabled' : ''}`}>
              <div className="policy-card-left">
                <div className="policy-icon-box" style={{ borderColor: p.color, color: p.color }}>
                  <Icon size={22} />
                </div>
                <div className="policy-details">
                  <div className="policy-title-row">
                    <h3>{p.name}</h3>
                    <span className={`policy-status-pill ${isLive ? 'enabled' : 'disabled'}`}>
                      {isLive ? p.activeLabel : p.inactiveLabel}
                    </span>
                  </div>
                  <p className="policy-desc">{p.desc}</p>
                </div>
              </div>

              <div className="policy-card-actions">
                <button
                  type="button"
                  className={`policy-toggle-switch-btn ${isLive ? 'active' : 'inactive'}`}
                  onClick={() => handleToggle(p.key, isLive, p.name, p.invert)}
                  disabled={loading}
                >
                  <Power size={13} />
                  <span>{isLive ? 'Turn OFF' : 'Turn ON'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* DANGER ZONE: DATABASE PURGE (KEEP ADMIN ONLY) */}
      <div style={{ marginTop: 32 }}>
        <div className="admin-section-head" style={{ marginBottom: 14 }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171' }}>
              <AlertTriangle size={22} color="#f87171" /> High-Level Administrative Operations & Dataset Purge
            </h2>
            <p>Irreversible database wipe actions for clean platform staging or total fresh launches.</p>
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(18, 11, 31, 0.9) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 16,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ maxWidth: 650 }}>
            <h3 style={{ margin: '0 0 6px', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trash2 size={18} color="#ef4444" /> Reset Database Dataset (Keep Master Admin Only)
            </h3>
            <p style={{ margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.55 }}>
              Purges all registered member accounts, deposits, withdrawals, wallet transactions, task assignments, referral downlines, and support tickets.
              The <b>Master Admin account (<code style={{ color: '#facc15' }}>faizanbarvi786@gmail.com</code>)</b>, default earning plans (C1–C9), task library, and site settings are <b>permanently preserved</b>.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setShowResetModal(true);
                setConfirmText('');
              }}
              style={{
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                padding: '12px 22px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 13.5,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              <Trash2 size={16} /> Reset All Data (Except Admin)
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showResetModal && (
        <div className="add-account-modal-overlay" onClick={() => !resetting && setShowResetModal(false)}>
          <div className="add-account-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500, border: '1px solid rgba(239, 68, 68, 0.5)' }}>
            <div className="add-account-head">
              <h3 style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} color="#f87171" /> Confirm Complete Dataset Reset
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => !resetting && setShowResetModal(false)}
                disabled={resetting}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#0a0618', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <p style={{ color: '#fff', margin: '0 0 10px', fontSize: '13px', lineHeight: '1.5', fontWeight: 600 }}>
                ⚠️ Warning: This action is permanent and cannot be undone!
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#cbd5e1', fontSize: '12.5px', lineHeight: 1.6 }}>
                <li>All user accounts (except Master Admin) will be deleted.</li>
                <li>All deposits, withdrawals, and ledger transactions will be wiped.</li>
                <li>All referral hierarchy trees and commissions will be cleared.</li>
                <li>All daily check-ins, tasks, and wheel spins will be reset.</li>
                <li><b style={{ color: '#4ade80' }}>Master Admin (faizanbarvi786@gmail.com) is 100% safe & preserved.</b></li>
              </ul>
            </div>

            <form onSubmit={handleExecuteReset}>
              <div className="admin-form-group">
                <label style={{ fontSize: 12.5, color: '#e2e8f0', marginBottom: 6, display: 'block' }}>
                  To confirm, type <b style={{ color: '#ef4444' }}>RESET</b> in the box below:
                </label>
                <input
                  type="text"
                  className="filter-input"
                  style={{ width: '100%', padding: '10px 14px', background: '#0e061c', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 10, color: '#fff', fontWeight: 700, letterSpacing: 1 }}
                  placeholder="Type RESET"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="add-account-actions" style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowResetModal(false)}
                  disabled={resetting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="reject-btn"
                  style={{ background: confirmText.trim().toUpperCase() === 'RESET' ? '#ef4444' : '#555', color: '#fff', borderColor: 'transparent', padding: '10px 20px', fontWeight: 700 }}
                  disabled={resetting || confirmText.trim().toUpperCase() !== 'RESET'}
                >
                  {resetting ? 'Purging Dataset...' : 'Confirm & Wipe Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
