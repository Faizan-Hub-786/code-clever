import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Gift,
  Save,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  RotateCw,
  Lock,
  Unlock,
  Trash2,
  Sliders,
  Flame,
  ShieldCheck,
  Check
} from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../../api/config';
import { fmt } from '../../utils/formatters';

let cachedWheelData = null;

export default function AdminWheel() {
  const [loading, setLoading] = useState(!cachedWheelData);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [granting, setGranting] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Global Wheel Configuration State
  const [prizeSegmentsRaw, setPrizeSegmentsRaw] = useState(() => cachedWheelData?.config?.prizeSegmentsRaw || '50, 100, 200, 300, 450, 500, 550, 600, 650, 700');
  const [defaultWinAmount, setDefaultWinAmount] = useState(() => String(cachedWheelData?.config?.defaultWinAmount || '100'));
  const [depositAutoWinPrize, setDepositAutoWinPrize] = useState(() => String(cachedWheelData?.config?.depositAutoWinPrize || '200'));
  const [autoRechargeSpin, setAutoRechargeSpin] = useState(() => cachedWheelData?.config?.autoRechargeSpin !== false);

  // User Assignment State
  const [users, setUsers] = useState(() => cachedWheelData?.users || []);
  const [userSearchText, setUserSearchText] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignSpinCount, setAssignSpinCount] = useState('1');
  const [assignGuaranteedPrize, setAssignGuaranteedPrize] = useState('100');

  // Tables State
  const [allocations, setAllocations] = useState(() => cachedWheelData?.allocations || []);
  const [allocationFilter, setAllocationFilter] = useState('');
  const [recentSpins, setRecentSpins] = useState(() => cachedWheelData?.recentSpins || []);

  // Parse segments array for dropdown options
  const parsedSegments = useMemo(() => {
    const raw = String(prizeSegmentsRaw || '').trim();
    const list = raw.split(/[\s,]+/).map(n => Number(n.trim())).filter(n => !isNaN(n) && n > 0);
    return list.length === 10 ? list : [50, 100, 200, 300, 450, 500, 550, 600, 650, 700];
  }, [prizeSegmentsRaw]);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    const q = userSearchText.trim().toLowerCase();
    if (!q) return users.slice(0, 50);
    return users.filter(
      u =>
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [users, userSearchText]);

  // Filter allocations table
  const filteredAllocations = useMemo(() => {
    const q = allocationFilter.trim().toLowerCase();
    if (!q) return allocations;
    return allocations.filter(
      a =>
        (a.phone && a.phone.toLowerCase().includes(q)) ||
        (a.full_name && a.full_name.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q))
    );
  }, [allocations, allocationFilter]);

  const loadControlCenter = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/wheel/control-center`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        cachedWheelData = data;
        if (data.config) {
          setPrizeSegmentsRaw(data.config.prizeSegmentsRaw || '50, 100, 200, 300, 450, 500, 550, 600, 650, 700');
          setDefaultWinAmount(String(data.config.defaultWinAmount || '100'));
          setDepositAutoWinPrize(String(data.config.depositAutoWinPrize || '200'));
          setAutoRechargeSpin(data.config.autoRechargeSpin !== false);
        }
        setUsers(data.users || []);
        setAllocations(data.allocations || []);
        setRecentSpins(data.recentSpins || []);
      }
    } catch (err) {
      console.error('Failed to load wheel control center:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadControlCenter();
  }, []);

  const handleSaveGlobal = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');

    // Check exactly 10 numbers
    const list = prizeSegmentsRaw.split(/[\s,]+/).map(n => Number(n.trim())).filter(n => !isNaN(n) && n > 0);
    if (list.length !== 10) {
      setError(`Must specify exactly 10 prize numbers. Currently have ${list.length}.`);
      return;
    }

    setSavingGlobal(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/wheel/save-global-settings`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          prizeSegmentsRaw,
          defaultWinAmount,
          depositAutoWinPrize,
          autoRechargeSpin
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save global settings');
      setMsg(data.message || 'Global wheel settings saved successfully.');
      loadControlCenter();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingGlobal(false);
    }
  };

  const handleAssignGuaranteedSpin = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');

    if (!selectedUserId) {
      setError('Please select a user from the dropdown.');
      return;
    }

    setGranting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/wheel/assign-guaranteed-spin`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          userId: selectedUserId,
          spinsCount: Number(assignSpinCount || 1),
          guaranteedWinAmount: assignGuaranteedPrize
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to assign spin outcome.');
      setMsg(data.message);
      loadControlCenter();
    } catch (err) {
      setError(err.message);
    } finally {
      setGranting(false);
    }
  };

  const handleAllocationAction = async (userId, action, prizeValue = null) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/wheel/update-allocation`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId, action, prizeValue })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(data.message);
        loadControlCenter();
      } else {
        setError(data.message);
      }
    } catch {
      setError('Action failed');
    }
  };

  return (
    <div className="wheel-control-center-v2">
      {/* Header Section */}
      <div className="wheel-cc-header">
        <div className="wheel-cc-title-row">
          <div className="wheel-cc-icon-badge">
            <Sparkles size={20} />
          </div>
          <div>
            <h2>Lucky Wheel / Spin Control Center</h2>
            <p>Control wheel prize segments, assign spins to specific users, and set guaranteed winning amounts.</p>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      <AnimatePresence>
        {msg && (
          <motion.div
            className="admin-cc-alert success"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <CheckCircle2 size={18} />
            <span>{msg}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            className="admin-cc-alert error"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top 2-Column Grid */}
      <div className="wheel-cc-grid">
        {/* CARD 1: GLOBAL WHEEL CONFIGURATION */}
        <div className="wheel-cc-card">
          <div className="card-header-line">
            <span className="card-emoji">⚙️</span>
            <h3>Global Wheel Configuration</h3>
          </div>

          <form onSubmit={handleSaveGlobal} className="wheel-cc-form">
            <div className="form-group">
              <label>10 Wheel Prize Segments (Comma-separated PKR):</label>
              <input
                type="text"
                className="cc-input"
                value={prizeSegmentsRaw}
                onChange={(e) => setPrizeSegmentsRaw(e.target.value)}
                placeholder="50, 100, 200, 300, 450, 500, 550, 600, 650, 700"
                required
              />
              <small className="field-hint">
                Must be exactly 10 numbers (e.g. 50, 100, 200, 300, 450, 500, 550, 600, 650, 700)
              </small>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Default Win Amount:</label>
                <select
                  className="cc-select"
                  value={defaultWinAmount}
                  onChange={(e) => setDefaultWinAmount(e.target.value)}
                >
                  <option value="random">🎲 Random (Probability Odds)</option>
                  {parsedSegments.map((num, i) => (
                    <option key={i} value={String(num)}>
                      Rs. {fmt(num)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Deposit Auto-Win Prize:</label>
                <select
                  className="cc-select"
                  value={depositAutoWinPrize}
                  onChange={(e) => setDepositAutoWinPrize(e.target.value)}
                >
                  <option value="random">🎲 Random Prize</option>
                  {parsedSegments.map((num, i) => (
                    <option key={i} value={String(num)}>
                      Rs. {fmt(num)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={autoRechargeSpin}
                  onChange={(e) => setAutoRechargeSpin(e.target.checked)}
                />
                <span>Automatically give +1 spin when user's recharge is approved</span>
              </label>
            </div>

            <button
              type="submit"
              className="cc-btn-green"
              disabled={savingGlobal}
            >
              <Save size={16} />
              <span>{savingGlobal ? 'Saving Settings...' : 'Save Global Wheel Settings'}</span>
            </button>
          </form>
        </div>

        {/* CARD 2: ASSIGN SPIN & GUARANTEED PRIZE TO USER */}
        <div className="wheel-cc-card">
          <div className="card-header-line">
            <span className="card-emoji">🎁</span>
            <h3>Assign Spin & Guaranteed Prize to User</h3>
          </div>

          <form onSubmit={handleAssignGuaranteedSpin} className="wheel-cc-form">
            <div className="form-group">
              <label>Quick Search User Phone / Name:</label>
              <input
                type="text"
                className="cc-input"
                value={userSearchText}
                onChange={(e) => setUserSearchText(e.target.value)}
                placeholder="Type phone digits (e.g. 0325)..."
              />
            </div>

            <div className="form-group">
              <select
                className="cc-select user-picker-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
              >
                <option value="">-- Select user ({filteredUsers.length} matches) --</option>
                {filteredUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} • {u.phone || 'No phone'} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Number of Spins:</label>
                <select
                  className="cc-select"
                  value={assignSpinCount}
                  onChange={(e) => setAssignSpinCount(e.target.value)}
                >
                  <option value="1">1 Spin (Single use)</option>
                  <option value="2">2 Spins</option>
                  <option value="3">3 Spins</option>
                  <option value="5">5 Spins</option>
                  <option value="10">10 Spins</option>
                  <option value="20">20 Spins</option>
                </select>
              </div>

              <div className="form-group">
                <label>Guaranteed Win Amount:</label>
                <select
                  className="cc-select guaranteed-select"
                  value={assignGuaranteedPrize}
                  onChange={(e) => setAssignGuaranteedPrize(e.target.value)}
                >
                  <option value="random">🎲 Random (No Guarantee)</option>
                  {parsedSegments.map((num, i) => (
                    <option key={i} value={String(num)}>
                      Guaranteed: Rs. {fmt(num)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="cc-btn-dark"
              disabled={granting}
            >
              <span>🎯</span>
              <span>{granting ? 'Locking Outcome...' : 'Grant Spin & Lock Prize Outcome'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* TABLE 1: ACTIVE USERS SPIN ALLOCATIONS */}
      <div className="wheel-cc-card table-section">
        <div className="table-header-row">
          <div className="table-title">
            <span className="card-emoji">👥</span>
            <h3>Active Users Spin Allocations ({allocations.length} users)</h3>
          </div>
          <div className="table-search-wrap">
            <Search size={15} className="table-search-icon" />
            <input
              type="text"
              className="table-search-input"
              value={allocationFilter}
              onChange={(e) => setAllocationFilter(e.target.value)}
              placeholder="Filter user phone, name..."
            />
          </div>
        </div>

        <div className="cc-table-container">
          <table className="cc-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Available Spins</th>
                <th>Locked Win Prize</th>
                <th>Spins Completed</th>
                <th>Total Cash Won</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAllocations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-table-cell">
                    No active user spin allocations found.
                  </td>
                </tr>
              ) : (
                filteredAllocations.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="user-cell">
                        <strong>{a.full_name}</strong>
                        <small>{a.phone || a.email}</small>
                      </div>
                    </td>
                    <td>
                      <span className="badge-spins">
                        {a.available_spins} Spins
                      </span>
                    </td>
                    <td>
                      {a.locked_prize ? (
                        <span className="badge-locked">
                          <Lock size={12} /> Guaranteed: Rs. {fmt(a.locked_prize)}
                        </span>
                      ) : (
                        <span className="badge-unlocked">
                          Default (Rs. {fmt(defaultWinAmount)})
                        </span>
                      )}
                    </td>
                    <td>{a.spins_completed}</td>
                    <td>
                      <strong className="cash-won-text">
                        Rs. {fmt(a.total_cash_won)}
                      </strong>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="action-btn plus"
                          title="Add +1 Spin"
                          onClick={() => handleAllocationAction(a.id, 'add_spin')}
                        >
                          +1 Spin
                        </button>
                        {a.locked_prize && (
                          <button
                            type="button"
                            className="action-btn unlock"
                            title="Clear Lock"
                            onClick={() => handleAllocationAction(a.id, 'clear_lock')}
                          >
                            Unlock
                          </button>
                        )}
                        <button
                          type="button"
                          className="action-btn reset"
                          title="Reset Spins"
                          onClick={() => handleAllocationAction(a.id, 'reset')}
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLE 2: RECENT SPIN ACTIVITY LOG */}
      <div className="wheel-cc-card table-section">
        <div className="table-header-row">
          <div className="table-title">
            <span className="card-emoji">📜</span>
            <h3>Recent Spin Activity Log ({recentSpins.length} records)</h3>
          </div>
        </div>

        <div className="cc-table-container">
          {recentSpins.length === 0 ? (
            <div className="empty-log-box">
              <p>No spin activities recorded yet.</p>
            </div>
          ) : (
            <table className="cc-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Slice Landed</th>
                  <th>Reward Won</th>
                  <th>Spin Source</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {recentSpins.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="user-cell">
                        <strong>{s.user_name}</strong>
                        <small>{s.user_phone || s.user_email}</small>
                      </div>
                    </td>
                    <td>
                      <span className="slice-pill">{s.segment_label}</span>
                    </td>
                    <td>
                      <strong className={Number(s.reward) > 0 ? 'win-text' : 'zero-text'}>
                        {Number(s.reward) > 0 ? `+Rs. ${fmt(s.reward)}` : 'Rs. 0'}
                      </strong>
                    </td>
                    <td>
                      <span className={`source-pill ${s.spin_source}`}>
                        {s.spin_source === 'bonus' ? 'Bonus / Admin' : 'Daily Free'}
                      </span>
                    </td>
                    <td>
                      <small className="date-text">{s.formatted_date || s.created_at}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
