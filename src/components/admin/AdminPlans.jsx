import React, { useState } from 'react';
import {
  Layers3,
  Lock,
  Unlock,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Coins,
  Calendar,
  Sparkles,
  X,
  Save,
  RefreshCw,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { fmt } from '../../utils/formatters';

export default function AdminPlans({ plans = [], onAction }) {
  const [editingPlan, setEditingPlan] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    job_bond: '',
    daily_task_count: '',
    unit_reward: ''
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setEditForm({
      name: plan.name || '',
      job_bond: plan.job_bond || plan.bond || 0,
      daily_task_count: plan.daily_task_count || plan.dailyTasks || 1,
      unit_reward: plan.unit_reward || plan.reward || 0
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPlan) return;
    setSaving(true);
    try {
      await onAction(`/api/admin/plans/${editingPlan.id}`, {
        name: editForm.name,
        job_bond: Number(editForm.job_bond),
        daily_task_count: Number(editForm.daily_task_count),
        unit_reward: Number(editForm.unit_reward)
      });
      setEditingPlan(null);
      setMsg(`Parameters for ${editingPlan.code} updated successfully.`);
      setTimeout(() => setMsg(''), 4000);
    } catch {}
    setSaving(false);
  };

  const handleToggleLock = async (plan) => {
    try {
      await onAction(`/api/admin/plans/${plan.id}/toggle-lock`);
    } catch {}
  };

  const unlockedCount = plans.filter((p) => !p.is_locked).length;
  const lockedCount = plans.filter((p) => p.is_locked).length;

  return (
    <div className="admin-plans-container">
      {/* Header */}
      <div className="admin-section-head">
        <div>
          <h2>Package & Plan Controls (C1 – C9)</h2>
          <p>Control activation pricing, daily task distribution, rewards, and lock/unlock tiers for member upgrades.</p>
        </div>
      </div>

      {msg && (
        <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80', padding: '10px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <CheckCircle2 size={16} /> {msg}
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="admin-plan-kpis">
        <div className="plan-kpi-card">
          <small>Total Platform Tiers</small>
          <strong>{plans.length} Packages (C1 – C9)</strong>
        </div>
        <div className="plan-kpi-card">
          <small>Active & Unlocked Tiers</small>
          <strong style={{ color: '#4ade80' }}>{unlockedCount} Available for Activation</strong>
        </div>
        <div className="plan-kpi-card">
          <small>Locked Tiers (Coming Soon)</small>
          <strong style={{ color: '#f59e0b' }}>{lockedCount} Locked by Administration</strong>
        </div>
      </div>

      {/* 9 Plan Cards Grid */}
      <div className="admin-plan-cards-grid">
        {plans.map((p) => {
          const isLocked = Boolean(p.is_locked);
          const bond = Number(p.job_bond || p.bond || 0);
          const tasks = Number(p.daily_task_count || p.dailyTasks || 0);
          const reward = Number(p.unit_reward || p.reward || 0);
          const dailyEarn = tasks * reward;
          const monthlyEarn = dailyEarn * 30;

          return (
            <div key={p.id || p.code} className={`admin-tier-card ${isLocked ? 'tier-locked' : 'tier-unlocked'}`}>
              {/* Card Header */}
              <div className="admin-tier-card-head">
                <div className="tier-code-wrap">
                  <span className="tier-code-badge">{p.code}</span>
                  <div>
                    <h4>{p.name || `Package ${p.code}`}</h4>
                    <small>Official Tier</small>
                  </div>
                </div>

                <span className={`tier-status-pill ${isLocked ? 'locked' : 'unlocked'}`}>
                  {isLocked ? (
                    <>
                      <Lock size={12} /> Locked (Coming Soon)
                    </>
                  ) : (
                    <>
                      <Unlock size={12} /> Unlocked (Active)
                    </>
                  )}
                </span>
              </div>

              {/* Card Metrics Grid */}
              <div className="admin-tier-metrics">
                <div className="metric-row">
                  <span>Job Bond (Price)</span>
                  <strong>Rs. {fmt(bond)}</strong>
                </div>

                <div className="metric-row">
                  <span>Daily Tasks Quota</span>
                  <strong>{tasks} Evaluations / Day</strong>
                </div>

                <div className="metric-row">
                  <span>Reward per Evaluation</span>
                  <strong>Rs. {fmt(reward)}</strong>
                </div>

                <div className="metric-row highlight">
                  <span>Daily Earnings Potential</span>
                  <strong style={{ color: '#cb4eff' }}>Rs. {fmt(dailyEarn)} / day</strong>
                </div>

                <div className="metric-row highlight">
                  <span>30-Day Projected Revenue</span>
                  <strong style={{ color: '#4ade80' }}>Rs. {fmt(monthlyEarn)} / mo</strong>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="admin-tier-actions">
                <button
                  type="button"
                  className={`plan-toggle-lock-btn ${isLocked ? 'btn-unlock' : 'btn-lock'}`}
                  onClick={() => handleToggleLock(p)}
                >
                  {isLocked ? (
                    <>
                      <Unlock size={15} /> Unlock Package
                    </>
                  ) : (
                    <>
                      <Lock size={15} /> Lock (Coming Soon)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="plan-edit-btn"
                  onClick={() => handleOpenEdit(p)}
                  title="Edit Parameters"
                >
                  <Edit3 size={15} /> Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="admin-modal-backdrop" onClick={() => setEditingPlan(null)}>
          <div className="admin-user-modal" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setEditingPlan(null)}>
              <X size={18} />
            </button>

            <div className="modal-header">
              <div className="modal-avatar" style={{ background: 'linear-gradient(145deg, #7c18eb, #ce2bff)' }}>
                <Layers3 size={24} />
              </div>
              <div>
                <h2>Edit Package {editingPlan.code}</h2>
                <p>Modify activation bond, task allocations, and reward per evaluation.</p>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#334155', marginBottom: 5, fontWeight: 700 }}>
                  Package Name / Title
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="admin-input-style"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#334155', marginBottom: 5, fontWeight: 700 }}>
                  Job Bond Price (PKR)
                </label>
                <input
                  type="number"
                  required
                  value={editForm.job_bond}
                  onChange={(e) => setEditForm({ ...editForm, job_bond: e.target.value })}
                  className="admin-input-style"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#334155', marginBottom: 5, fontWeight: 700 }}>
                    Daily Tasks Quota
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editForm.daily_task_count}
                    onChange={(e) => setEditForm({ ...editForm, daily_task_count: e.target.value })}
                    className="admin-input-style"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#334155', marginBottom: 5, fontWeight: 700 }}>
                    Reward per Task (PKR)
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    value={editForm.unit_reward}
                    onChange={(e) => setEditForm({ ...editForm, unit_reward: e.target.value })}
                    className="admin-input-style"
                  />
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '12px 14px', fontSize: 12.5, color: '#475569' }}>
                <div>Estimated Daily Earnings: <b style={{ color: '#0f172a' }}>Rs. {fmt(Number(editForm.daily_task_count || 0) * Number(editForm.unit_reward || 0))}</b></div>
                <div style={{ marginTop: 4 }}>Estimated Monthly Yield: <b style={{ color: '#059669' }}>Rs. {fmt(Number(editForm.daily_task_count || 0) * Number(editForm.unit_reward || 0) * 30)}</b></div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="outline-btn"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setEditingPlan(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gradient-btn"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw className="spin" size={16} /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
