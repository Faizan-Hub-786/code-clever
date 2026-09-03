import React, { useState } from 'react';
import {
  KeyRound,
  CheckCircle2,
  Clock,
  Send,
  X,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Search,
  Filter,
  RotateCcw,
  Trash2,
  Edit3,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export default function AdminPasswordResets({ inquiries = [], onAction }) {
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, type: 'reply' | 'ticket' }

  // Filter Toolbar States
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verifyFilter, setVerifyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const generateRandomPassword = () => 'CodeClever@' + Math.floor(1000 + Math.random() * 9000);
  const [dynamicPass, setDynamicPass] = useState(generateRandomPassword);

  // Filter only Password Reset inquiries
  const passwordResets = (inquiries || []).filter(
    (inq) => inq.category === 'Password Reset' || String(inq.message || '').includes('[PASSWORD RESET') || String(inq.message || '').includes('[VERIFIED PASSWORD RESET')
  );

  let filtered = passwordResets.filter((inq) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      String(inq.id || '').includes(q) ||
      (inq.userName || inq.user_name || '').toLowerCase().includes(q) ||
      (inq.userEmail || inq.user_email || '').toLowerCase().includes(q) ||
      (inq.userPhone || '').toLowerCase().includes(q) ||
      (inq.message || '').toLowerCase().includes(q) ||
      (inq.adminReply || inq.admin_reply || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || inq.status === statusFilter;
    const isVerified = String(inq.message || '').includes('Security Question Verified') || String(inq.message || '').includes('Verified ✅');
    const matchesVerify = verifyFilter === 'all' || (verifyFilter === 'verified' ? isVerified : !isVerified);

    let matchesDate = true;
    if (fromDate || toDate) {
      const ticketDate = inq.createdAt || inq.date || inq.created_at;
      if (ticketDate) {
        const d = new Date(ticketDate).toISOString().slice(0, 10);
        if (fromDate && d < fromDate) matchesDate = false;
        if (toDate && d > toDate) matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesVerify && matchesDate;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
    if (sortBy === 'oldest') return (a.id || 0) - (b.id || 0);
    return 0;
  });

  const handleResetFilters = () => {
    setSearchQuery('');
    setFromDate('');
    setToDate('');
    setStatusFilter('all');
    setVerifyFilter('all');
    setSortBy('newest');
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedInquiry) return;
    setSending(true);
    try {
      await onAction(`/api/admin/support/${selectedInquiry.id}/reply`, {
        reply: replyText.trim()
      });
      setSelectedInquiry(null);
      setReplyText('');
    } catch {
    } finally {
      setSending(false);
    }
  };

  const handleDeleteReply = async (inqId) => {
    try {
      await onAction(`/api/admin/support/${inqId}/delete-reply`, {});
      setConfirmDelete(null);
      if (selectedInquiry?.id === inqId) {
        setSelectedInquiry(null);
        setReplyText('');
      }
    } catch {}
  };

  const handleDeleteTicket = async (inqId) => {
    try {
      await onAction(`/api/admin/support/${inqId}/delete`, {});
      setConfirmDelete(null);
      if (selectedInquiry?.id === inqId) {
        setSelectedInquiry(null);
        setReplyText('');
      }
    } catch {}
  };

  const applyTemplate = (templateText) => {
    setReplyText(templateText);
  };

  return (
    <div>
      <div className="admin-section-head">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={22} color="#cb4eff" /> Password Recovery Requests ({filtered.length} tickets)
          </h2>
          <p>Review verified security question tickets and dispatch temporary passwords or recovery instructions.</p>
        </div>
      </div>

      {/* Filter Toolbar Matching Screenshot 2 */}
      <div className="records-filter-card" style={{ marginBottom: 18 }}>
        <div className="filter-item search-box">
          <input
            type="text"
            className="filter-input"
            placeholder="Search phone, name, email, ticket ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
            <option value="pending">Pending</option>
            <option value="replied">Replied</option>
          </select>
        </div>

        <div className="filter-item select-box">
          <select
            className="filter-select"
            value={verifyFilter}
            onChange={(e) => setVerifyFilter(e.target.value)}
          >
            <option value="all">All Requests</option>
            <option value="verified">Question Verified</option>
            <option value="standard">Standard Request</option>
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
          </select>
        </div>

        <button type="button" className="filter-reset-btn" onClick={handleResetFilters}>
          Reset
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Member Account</th>
              <th>Verification Status</th>
              <th>Recovery Request Details</th>
              <th>Status</th>
              <th>Admin Response (Pinned)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inq) => {
              const isPending = inq.status === 'pending';
              const isVerified = String(inq.message || '').includes('Security Question Verified') || String(inq.message || '').includes('Verified ✅');
              const hasReply = !!(inq.adminReply || inq.admin_reply);

              return (
                <tr key={inq.id}>
                  <td>
                    <b>#{inq.id}</b>
                    <small>{inq.createdAt || inq.date || 'Today'}</small>
                  </td>
                  <td>
                    <b>{inq.userName || inq.user_name || 'Member'}</b>
                    <small>{inq.userEmail || inq.user_email || `User #${inq.userId || inq.user_id}`}</small>
                    {inq.userPhone && <small style={{ color: '#a78bfa' }}>📱 {inq.userPhone}</small>}
                  </td>
                  <td>
                    {isVerified ? (
                      <span
                        style={{
                          background: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                          color: '#4ade80',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <ShieldCheck size={13} /> Question Verified
                      </span>
                    ) : (
                      <span
                        style={{
                          background: 'rgba(234, 179, 8, 0.15)',
                          border: '1px solid rgba(234, 179, 8, 0.4)',
                          color: '#facc15',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}
                      >
                        Standard Request
                      </span>
                    )}
                  </td>
                  <td style={{ maxWidth: '280px' }}>
                    <div style={{ fontSize: '12.5px', color: '#ded4eb', lineHeight: '1.4' }}>
                      {inq.message}
                    </div>
                  </td>
                  <td>
                    <span className={`deposit-status-pill ${isPending ? 'pending' : 'approved'}`}>
                      {inq.status || 'pending'}
                    </span>
                  </td>
                  <td style={{ maxWidth: '220px' }}>
                    {hasReply ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: '11.5px', color: '#4ade80', fontWeight: 600, lineHeight: 1.35 }}>
                          {inq.adminReply || inq.admin_reply}
                        </span>
                        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInquiry(inq);
                              setReplyText(inq.adminReply || inq.admin_reply || '');
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#38bdf8',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2,
                              padding: 0
                            }}
                          >
                            <Edit3 size={11} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete({ id: inq.id, type: 'reply' })}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#f87171',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2,
                              padding: 0
                            }}
                          >
                            <XCircle size={11} /> Delete Reply
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '11.5px', color: '#7e778f' }}>Pending response</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        className="approve-btn"
                        onClick={() => {
                          setSelectedInquiry(inq);
                          const newPass = generateRandomPassword();
                          setDynamicPass(newPass);
                          setReplyText(inq.adminReply || inq.admin_reply || '');
                        }}
                      >
                        {hasReply ? 'Edit' : 'Send Password / Reply'}
                      </button>
                      <button
                        className="reject-btn"
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          borderColor: 'rgba(239, 68, 68, 0.3)',
                          padding: '6px 8px'
                        }}
                        onClick={() => setConfirmDelete({ id: inq.id, type: 'ticket' })}
                        title="Delete ticket completely"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={7} className="empty-cell">
                  No password recovery requests found matching current search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reply / Issue Password Modal */}
      {selectedInquiry && (
        <div className="add-account-modal-overlay" onClick={() => setSelectedInquiry(null)}>
          <div className="add-account-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="add-account-head">
              <h3>
                <KeyRound size={20} color="#cb4eff" /> {selectedInquiry.adminReply || selectedInquiry.admin_reply ? 'Edit Password Recovery Ticket' : 'Password Recovery Ticket'} #{selectedInquiry.id}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedInquiry(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#0a0618', padding: '14px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #302048' }}>
              <div style={{ fontSize: '12px', color: '#8f87a1', marginBottom: '4px' }}>
                Member Request ({selectedInquiry.userName || selectedInquiry.userEmail}):
              </div>
              <p style={{ color: '#fff', margin: 0, fontSize: '13px', lineHeight: '1.5' }}>
                "{selectedInquiry.message}"
              </p>
            </div>

            {/* Quick Template Chips */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '11.5px', color: '#8f87a1', display: 'block' }}>
                  ⚡ Quick Reply Templates (Auto-Pins in User's Chatbot & Syncs Database):
                </label>
                <button
                  type="button"
                  onClick={() => setDynamicPass(generateRandomPassword())}
                  style={{ background: 'transparent', border: 'none', color: '#cb4eff', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                  title="Generate another unique password"
                >
                  <RefreshCw size={11} /> Roll New
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => applyTemplate(`Your password reset is approved. Your temporary password is: ${dynamicPass}. Please login and change your password immediately in Settings.`)}
                  style={{
                    background: 'rgba(203, 78, 255, 0.15)',
                    border: '1px solid #cb4eff',
                    color: '#e9d5ff',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <KeyRound size={13} color="#cb4eff" /> Unique Password: {dynamicPass}
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('Your identity and security question have been verified. Your account login access is restored.')}
                  style={{
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid #22c55e',
                    color: '#86efac',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  ✓ Identity Verified & Restored
                </button>
              </div>
            </div>

            <form onSubmit={handleSendReply}>
              <div className="admin-form-group">
                <label>Admin Response Message (Pinned in User's Live Chatbot):</label>
                <textarea
                  className="admin-textarea"
                  rows={4}
                  required
                  placeholder="Enter temporary password or recovery instructions for the user..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#0e061c', border: '1px solid rgba(203, 78, 255, 0.3)', borderRadius: 10, color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', color: '#86efac' }}>
                <ShieldCheck size={14} color="#4ade80" />
                <span>Sending a temporary password will instantly update the user's password in the database so they can log in.</span>
              </div>

              <div className="add-account-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {(selectedInquiry.adminReply || selectedInquiry.admin_reply) && (
                    <button
                      type="button"
                      className="reject-btn"
                      style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)', fontSize: '12px' }}
                      onClick={() => handleDeleteReply(selectedInquiry.id)}
                    >
                      <Trash2 size={13} style={{ display: 'inline', marginRight: 4 }} /> Delete Reply
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setSelectedInquiry(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={sending || !replyText.trim()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Send size={15} /> {sending ? 'Saving...' : (selectedInquiry.adminReply || selectedInquiry.admin_reply ? 'Update Reply' : 'Send Pinned Reply')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="add-account-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="add-account-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
              <AlertTriangle size={24} />
            </div>
            <h3 style={{ margin: '0 0 8px', color: '#fff' }}>
              {confirmDelete.type === 'reply' ? 'Delete Admin Reply?' : 'Delete Password Request?'}
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.5, margin: '0 0 18px' }}>
              {confirmDelete.type === 'reply'
                ? 'This will remove the temporary password reply from both the admin dashboard and the live website / guest chat, setting ticket back to pending.'
                : 'This will permanently delete this password recovery ticket and remove any associated chat messages from the website.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="cancel-btn" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button
                className="reject-btn"
                style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444', padding: '8px 18px', fontWeight: 700 }}
                onClick={() => (confirmDelete.type === 'reply' ? handleDeleteReply(confirmDelete.id) : handleDeleteTicket(confirmDelete.id))}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
