import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Wrench,
  PauseCircle,
  PlayCircle,
  LockKeyhole,
  Unlock,
  Zap,
  Power,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../../api/config';

export default function AdminQuickControls({ onAction, siteSettings }) {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

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

  // Sync if siteSettings prop changes
  useEffect(() => {
    if (Array.isArray(siteSettings)) {
      const map = {};
      siteSettings.forEach((s) => {
        map[s.setting_key] = s.value_json === 'true' || s.value_json === true;
      });
      setSettings((prev) => ({ ...prev, ...map }));
    }
  }, [siteSettings]);

  const isMaintenance = settings.maintenance_mode === true;
  const isTasksPaused = settings.task_assignments_paused === true;
  const isWithdrawalsEnabled = settings.withdrawals_enabled !== false;

  const toggleSetting = async (key, nextVal, label) => {
    setLoading(true);
    setMsg('');
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ key, value: nextVal })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update setting');

      setSettings((prev) => ({ ...prev, [key]: nextVal }));
      setMsg(`${label} is now ${nextVal ? 'ENABLED' : 'DISABLED'}.`);
      if (onAction) onAction();
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTasks = async () => {
    setGenerating(true);
    setMsg('');
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tasks/generate`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate tasks');

      setMsg(data.message || 'Daily tasks assigned successfully to all active members!');
      if (onAction) onAction();
    } catch (err) {
      setError(err.message || 'Task generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="admin-quick-controls">
      <div className="admin-section-head">
        <div>
          <h2>Quick Actions & Live Controls</h2>
          <p>Execute platform maintenance and toggle live system killswitches.</p>
        </div>
      </div>

      {msg && (
        <div className="admin-cc-alert success" style={{ marginBottom: 14 }}>
          <CheckCircle2 size={17} /> <span>{msg}</span>
        </div>
      )}
      {error && (
        <div className="admin-cc-alert error" style={{ marginBottom: 14 }}>
          <AlertCircle size={17} /> <span>{error}</span>
        </div>
      )}

      <div className="admin-quick-grid">
        {/* 1. Generate Daily Tasks */}
        <div className="quick-action-card">
          <div className="quick-action-card-top">
            <div className="quick-action-icon-box purple">
              <CalendarDays size={20} />
            </div>
            <span className="quick-status-pill blue">Manual Trigger</span>
          </div>
          <b>Generate Daily Tasks</b>
          <span>Assign tasks from the active library to active members.</span>
          <button
            type="button"
            className="quick-card-btn primary"
            onClick={handleGenerateTasks}
            disabled={generating}
          >
            {generating ? <RefreshCw size={13} className="spin" /> : <Zap size={13} />}
            <span>{generating ? 'Assigning Tasks…' : 'Assign Today’s Tasks'}</span>
          </button>
        </div>

        {/* 2. Maintenance Mode */}
        <div className={`quick-action-card ${isMaintenance ? 'alert-active' : ''}`}>
          <div className="quick-action-card-top">
            <div className="quick-action-icon-box orange">
              <Wrench size={20} />
            </div>
            <span className={`quick-status-pill ${isMaintenance ? 'red' : 'green'}`}>
              {isMaintenance ? 'Active (Locked)' : 'Live (Open)'}
            </span>
          </div>
          <b>Maintenance Mode</b>
          <span>Temporarily restrict public platform access during upgrades.</span>
          <button
            type="button"
            className={`quick-card-btn ${isMaintenance ? 'danger' : 'success'}`}
            onClick={() => toggleSetting('maintenance_mode', !isMaintenance, 'Maintenance Mode')}
            disabled={loading}
          >
            <Power size={13} />
            <span>{isMaintenance ? 'Disable Maintenance' : 'Enable Maintenance'}</span>
          </button>
        </div>

        {/* 3. Pause / Resume Task Assignments */}
        <div className={`quick-action-card ${isTasksPaused ? 'alert-active' : ''}`}>
          <div className="quick-action-card-top">
            <div className="quick-action-icon-box purple">
              {isTasksPaused ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
            </div>
            <span className={`quick-status-pill ${isTasksPaused ? 'yellow' : 'green'}`}>
              {isTasksPaused ? 'Paused (Hold)' : 'Running (Active)'}
            </span>
          </div>
          <b>Task Assignments</b>
          <span>Stop or resume daily task assignment generation.</span>
          <button
            type="button"
            className={`quick-card-btn ${isTasksPaused ? 'success' : 'warning'}`}
            onClick={() => toggleSetting('task_assignments_paused', !isTasksPaused, 'Task Assignments')}
            disabled={loading}
          >
            {isTasksPaused ? <PlayCircle size={13} /> : <PauseCircle size={13} />}
            <span>{isTasksPaused ? 'Resume Assignments' : 'Pause Assignments'}</span>
          </button>
        </div>

        {/* 4. Pause / Resume Withdrawals */}
        <div className={`quick-action-card ${!isWithdrawalsEnabled ? 'alert-active' : ''}`}>
          <div className="quick-action-card-top">
            <div className="quick-action-icon-box red">
              {isWithdrawalsEnabled ? <Unlock size={20} /> : <LockKeyhole size={20} />}
            </div>
            <span className={`quick-status-pill ${isWithdrawalsEnabled ? 'green' : 'red'}`}>
              {isWithdrawalsEnabled ? 'Open (Accepting)' : 'Frozen (Paused)'}
            </span>
          </div>
          <b>Withdrawal Gateway</b>
          <span>Disable or allow new member withdrawal cashout requests.</span>
          <button
            type="button"
            className={`quick-card-btn ${isWithdrawalsEnabled ? 'warning' : 'success'}`}
            onClick={() => toggleSetting('withdrawals_enabled', !isWithdrawalsEnabled, 'Withdrawal Gateway')}
            disabled={loading}
          >
            {isWithdrawalsEnabled ? <LockKeyhole size={13} /> : <Unlock size={13} />}
            <span>{isWithdrawalsEnabled ? 'Pause Withdrawals' : 'Enable Withdrawals'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
