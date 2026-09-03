import React, { useState } from 'react';
import {
  User,
  X,
  KeyRound,
  Lock,
  Wallet,
  Shield,
  CheckCircle2,
  RefreshCw,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Filter,
  RotateCcw
} from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../../api/config';
import { fmt } from '../../utils/formatters';

export default function AdminUsers({ users = [], onAction }) {
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [query, setQuery] = useState('');

  // Action Modals State
  const [actionType, setActionType] = useState(null); // 'password' | 'fund_password' | 'balance'
  const [newPassword, setNewPassword] = useState('');
  const [newFundPassword, setNewFundPassword] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjType, setAdjType] = useState('credit'); // 'credit' | 'debit'
  const [adjNote, setAdjNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState('');

  // Delete & Blacklist Confirmation State
  const [deletingUser, setDeletingUser] = useState(null); // { id, name, email }

  const open = async (id) => {
    setSelected(id);
    setActionType(null);
    setMsg('');
    try {
      const r = await fetch(`${API_BASE_URL}/admin/users/${id}`, { headers: getAuthHeaders() });
      if (r.ok) setDetail(await r.json());
    } catch {}
  };

  // Filters State
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const list = Array.isArray(users) ? users : [];
  let filtered = list.filter((u) => {
    const q = query.trim().toLowerCase();
    const matchesSearch = !q ||
      (u.name || u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      String(u.id || '').includes(q);

    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    let matchesDate = true;
    if (fromDate || toDate) {
      const userDate = u.created_at || u.joined;
      if (userDate) {
        const d = new Date(userDate).toISOString().slice(0, 10);
        if (fromDate && d < fromDate) matchesDate = false;
        if (toDate && d > toDate) matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesRole && matchesDate;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
    if (sortBy === 'oldest') return (a.id || 0) - (b.id || 0);
    if (sortBy === 'name_asc') return (a.name || a.full_name || '').localeCompare(b.name || b.full_name || '');
    if (sortBy === 'name_desc') return (b.name || b.full_name || '').localeCompare(a.name || a.full_name || '');
    return 0;
  });

  const handleResetFilters = () => {
    setQuery('');
    setFromDate('');
    setToDate('');
    setStatusFilter('all');
    setRoleFilter('all');
    setSortBy('newest');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim() || !detail?.user?.id) return;
    setProcessing(true);
    try {
      await onAction(`/api/admin/users/${detail.user.id}/reset-password`, { password: newPassword.trim() });
      setMsg('Login password has been reset successfully.');
      setActionType(null);
      setNewPassword('');
    } catch {
      setMsg('Failed to reset password.');
    } finally {
      setProcessing(false);
    }
  };

  const handleResetFundPassword = async (e) => {
    e.preventDefault();
    if (!newFundPassword.trim() || !detail?.user?.id) return;
    setProcessing(true);
    try {
      await onAction(`/api/admin/users/${detail.user.id}/reset-fund-password`, { fundPassword: newFundPassword.trim() });
      setMsg('6-digit Fund password has been reset successfully.');
      setActionType(null);
      setNewFundPassword('');
    } catch {
      setMsg('Failed to reset fund password.');
    } finally {
      setProcessing(false);
    }
  };

  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    const num = Number(adjAmount);
    if (!num || num <= 0 || !detail?.user?.id) return;
    setProcessing(true);
    try {
      await onAction(`/api/admin/users/${detail.user.id}/adjust-balance`, {
        amount: num,
        direction: adjType,
        note: adjNote.trim() || `Admin manual balance ${adjType}`
      });
      setMsg(`Wallet balance ${adjType === 'credit' ? 'credited' : 'debited'} by Rs. ${fmt(num)} successfully.`);
      setActionType(null);
      setAdjAmount('');
      setAdjNote('');
      open(detail.user.id);
    } catch {
      setMsg('Failed to adjust balance.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser?.id) return;
    setProcessing(true);
    try {
      await onAction(`/api/admin/users/${deletingUser.id}/delete`, {});
      setMsg(`User ${deletingUser.name || ''} (${deletingUser.email}) was deleted and permanently blacklisted.`);
      setDeletingUser(null);
      setSelected(null);
    } catch {
      setMsg('Failed to delete user.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <div className="admin-section-head">
        <div>
          <h2>User Directory ({filtered.length} members)</h2>
          <p>Search, inspect, adjust balances, reset passwords, or delete & blacklist member accounts.</p>
        </div>
      </div>

      {/* Filter Toolbar Matching Deposits/Withdrawals Style */}
      <div className="records-filter-card" style={{ marginBottom: 18 }}>
        <div className="filter-item search-box">
          <input
            type="text"
            className="filter-input"
            placeholder="Search phone, name, email, ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="filter-item date-box">
          <label>From:</label>
          <input
            type="date"
            className="filter-input date-input"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div className="filter-item date-box">
          <label>To:</label>
          <input
            type="date"
            className="filter-input date-input"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <div className="filter-item select-box">
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="filter-item select-box">
          <select
            className="filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="filter-item select-box">
          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
          </select>
        </div>

        <button type="button" className="filter-reset-btn" onClick={handleResetFilters}>
          Reset
        </button>
      </div>

      {msg && <div className="admin-msg" style={{ marginBottom: '16px' }}>{msg}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Status</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Quick Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>
                  <b>{u.name || u.full_name}</b>
                  <small>{u.email} · #{u.id}</small>
                </td>
                <td>
                  <span className={`status-chip ${u.status}`}>{u.status}</span>
                </td>
                <td>
                  <b style={{ color: u.role === 'admin' ? '#df65ff' : '#aaa' }}>{u.role}</b>
                </td>
                <td>{u.joined || 'Active'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button className="approve-btn" onClick={() => open(u.id)}>
                      Manage
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => onAction(`/api/admin/users/${u.id}/toggle-status`)}
                    >
                      {u.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                    {u.role !== 'admin' && String(u.email || '').toLowerCase() !== 'faizanbarvi786@gmail.com' && (
                      <button
                        className="reject-btn"
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          borderColor: 'rgba(239, 68, 68, 0.3)'
                        }}
                        onClick={() =>
                          setDeletingUser({
                            id: u.id,
                            name: u.name || u.full_name || 'Member',
                            email: u.email
                          })
                        }
                        title="Delete member and blacklist email"
                      >
                        <Trash2 size={13} style={{ display: 'inline', marginRight: '3px' }} /> Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Detail & Control Modal */}
      {selected && detail && (
        <div className="add-account-modal-overlay" onClick={() => setSelected(null)}>
          <div className="add-account-modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="add-account-head">
              <h3>
                <User size={22} color="#cb4eff" /> User #{detail.user.id} — {detail.user.full_name}
              </h3>
              <button type="button" className="modal-close-btn" onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="user-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#0a0618', padding: '16px', borderRadius: '16px', border: '1px solid #302048', marginBottom: '18px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#8f87a1' }}>Email Address</span>
                <strong style={{ color: '#fff', fontSize: '13.5px', display: 'block' }}>{detail.user.email}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#8f87a1' }}>Role & Status</span>
                <strong style={{ color: '#fff', fontSize: '13.5px', display: 'block' }}>{detail.user.role.toUpperCase()} • {detail.user.status}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#8f87a1' }}>Available Balance</span>
                <strong style={{ color: '#4ade80', fontSize: '16px', display: 'block' }}>Rs. {fmt(detail.wallet?.available_balance || 0)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#8f87a1' }}>Lifetime Earned</span>
                <strong style={{ color: '#df65ff', fontSize: '16px', display: 'block' }}>Rs. {fmt(detail.wallet?.lifetime_earned || 0)}</strong>
              </div>
            </div>

            {/* Quick Management Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                className={`notif-tab-btn ${actionType === 'password' ? 'active' : ''}`}
                onClick={() => setActionType(actionType === 'password' ? null : 'password')}
              >
                <KeyRound size={14} style={{ display: 'inline', marginRight: '4px' }} /> Login Password
              </button>
              <button
                type="button"
                className={`notif-tab-btn ${actionType === 'fund_password' ? 'active' : ''}`}
                onClick={() => setActionType(actionType === 'fund_password' ? null : 'fund_password')}
              >
                <Lock size={14} style={{ display: 'inline', marginRight: '4px' }} /> Fund Password
              </button>
              <button
                type="button"
                className={`notif-tab-btn ${actionType === 'balance' ? 'active' : ''}`}
                onClick={() => setActionType(actionType === 'balance' ? null : 'balance')}
              >
                <Wallet size={14} style={{ display: 'inline', marginRight: '4px' }} /> Adjust Balance
              </button>
            </div>

            {/* Action Form 1: Reset Login Password */}
            {actionType === 'password' && (
              <form onSubmit={handleResetPassword} style={{ background: 'rgba(120,40,180,.08)', border: '1px solid #5a248f', padding: '14px', borderRadius: '14px', marginBottom: '16px' }}>
                <label className="field-label" style={{ fontSize: '11px', color: '#cb4eff', fontWeight: 800, display: 'block', marginBottom: '6px' }}>
                  Set New Login Password
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    required
                    type="text"
                    placeholder="Enter new secure password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ flex: 1, background: '#090714', border: '1px solid #4a2870', borderRadius: '10px', color: '#fff', padding: '10px 14px' }}
                  />
                  <button type="submit" className="gradient-btn" disabled={processing} style={{ height: '42px' }}>
                    Save Password
                  </button>
                </div>
              </form>
            )}

            {/* Action Form 2: Reset Fund Password */}
            {actionType === 'fund_password' && (
              <form onSubmit={handleResetFundPassword} style={{ background: 'rgba(120,40,180,.08)', border: '1px solid #5a248f', padding: '14px', borderRadius: '14px', marginBottom: '16px' }}>
                <label className="field-label" style={{ fontSize: '11px', color: '#cb4eff', fontWeight: 800, display: 'block', marginBottom: '6px' }}>
                  Set New 6-Digit Fund Password
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    required
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 123456"
                    value={newFundPassword}
                    onChange={(e) => setNewFundPassword(e.target.value)}
                    style={{ flex: 1, background: '#090714', border: '1px solid #4a2870', borderRadius: '10px', color: '#fff', padding: '10px 14px', letterSpacing: '3px' }}
                  />
                  <button type="submit" className="gradient-btn" disabled={processing} style={{ height: '42px' }}>
                    Save Fund PIN
                  </button>
                </div>
              </form>
            )}

            {/* Action Form 3: Adjust Wallet Balance */}
            {actionType === 'balance' && (
              <form onSubmit={handleAdjustBalance} style={{ background: 'rgba(120,40,180,.08)', border: '1px solid #5a248f', padding: '14px', borderRadius: '14px', marginBottom: '16px' }}>
                <label className="field-label" style={{ fontSize: '11px', color: '#cb4eff', fontWeight: 800, display: 'block', marginBottom: '6px' }}>
                  Adjust User Wallet Balance (PKR)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '8px' }}>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value)}
                    style={{ background: '#090714', border: '1px solid #4a2870', borderRadius: '10px', color: '#fff', padding: '10px' }}
                  >
                    <option value="credit">+ Credit</option>
                    <option value="debit">- Debit</option>
                  </select>
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="Amount in PKR"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    style={{ background: '#090714', border: '1px solid #4a2870', borderRadius: '10px', color: '#fff', padding: '10px 14px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Reason / Transaction note"
                    value={adjNote}
                    onChange={(e) => setAdjNote(e.target.value)}
                    style={{ flex: 1, background: '#090714', border: '1px solid #4a2870', borderRadius: '10px', color: '#fff', padding: '10px 14px' }}
                  />
                  <button type="submit" className="gradient-btn" disabled={processing} style={{ height: '42px' }}>
                    Apply Balance
                  </button>
                </div>
              </form>
            )}

            {/* Bottom Actions: Role Toggle, Status Toggle & Delete Member */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', borderTop: '1px solid #302048', paddingTop: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="outline-btn"
                style={{ height: '40px', fontSize: '12.5px' }}
                onClick={() => {
                  onAction(`/api/admin/users/${detail.user.id}/change-role`, {
                    role: detail.user.role === 'admin' ? 'user' : 'admin'
                  });
                  setSelected(null);
                }}
              >
                <Shield size={14} /> {detail.user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={detail.user.status === 'active' ? 'reject-btn' : 'approve-btn'}
                  style={{ padding: '8px 18px' }}
                  onClick={() => {
                    onAction(`/api/admin/users/${detail.user.id}/toggle-status`);
                    setSelected(null);
                  }}
                >
                  {detail.user.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                </button>

                {detail.user.role !== 'admin' && String(detail.user.email || '').toLowerCase() !== 'faizanbarvi786@gmail.com' && (
                  <button
                    type="button"
                    className="reject-btn"
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      borderColor: '#ef4444',
                      color: '#fca5a5',
                      padding: '8px 16px'
                    }}
                    onClick={() => {
                      setDeletingUser({
                        id: detail.user.id,
                        name: detail.user.full_name || 'Member',
                        email: detail.user.email
                      });
                    }}
                  >
                    <Trash2 size={14} style={{ display: 'inline', marginRight: '4px' }} /> Delete & Blacklist
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete & Blacklist Confirmation Modal */}
      {deletingUser && (
        <div className="add-account-modal-overlay" onClick={() => setDeletingUser(null)} style={{ zIndex: 9999 }}>
          <div
            className="add-account-modal"
            style={{ maxWidth: '500px', border: '1px solid rgba(239, 68, 68, 0.4)', background: '#120b1f' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="add-account-head" style={{ borderBottomColor: 'rgba(239,68,68,0.2)' }}>
              <h3 style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={22} color="#ef4444" /> Delete & Blacklist Member
              </h3>
              <button type="button" className="modal-close-btn" onClick={() => setDeletingUser(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 0' }}>
              <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.5, marginBottom: '14px' }}>
                Are you sure you want to permanently delete <strong>{deletingUser.name}</strong> (<code>{deletingUser.email}</code>)?
              </p>

              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  color: '#fca5a5',
                  fontSize: '12.5px',
                  lineHeight: 1.45,
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start'
                }}
              >
                <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Permanent Blacklist Enforcement:</strong>
                  <div style={{ marginTop: 2 }}>
                    This will delete all user data, wallet balance, and task history. Their email (<code>{deletingUser.email}</code>) will be permanently blacklisted, strictly preventing them from creating a new account.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #302048', paddingTop: '14px' }}>
              <button
                type="button"
                className="outline-btn"
                onClick={() => setDeletingUser(null)}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="reject-btn"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                  borderColor: '#ef4444',
                  color: '#ffffff',
                  padding: '9px 20px',
                  fontWeight: 700
                }}
                onClick={handleDeleteUser}
                disabled={processing}
              >
                {processing ? 'Deleting & Blacklisting…' : 'Yes, Delete & Blacklist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
