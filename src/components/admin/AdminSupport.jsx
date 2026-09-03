import React, { useState } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  Clock,
  Send,
  X,
  RefreshCw,
  Eye,
  Camera,
  Image as ImageIcon,
  Search,
  Filter,
  RotateCcw,
  Trash2,
  Edit3,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function AdminSupport({ inquiries = [], onAction }) {
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, type: 'reply' | 'ticket' }

  // Filter Toolbar States
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Filter out Password Resets (they have their own dedicated page)
  const generalInquiries = (inquiries || []).filter(
    (inq) => inq.category !== 'Password Reset' && !String(inq.message || '').includes('[PASSWORD RESET') && !String(inq.message || '').includes('[VERIFIED PASSWORD RESET')
  );

  let filtered = generalInquiries.filter((inq) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      String(inq.id || '').includes(q) ||
      (inq.userName || inq.user_name || '').toLowerCase().includes(q) ||
      (inq.userEmail || inq.user_email || '').toLowerCase().includes(q) ||
      (inq.userPhone || '').toLowerCase().includes(q) ||
      (inq.message || '').toLowerCase().includes(q) ||
      (inq.adminReply || inq.admin_reply || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || inq.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || inq.category === categoryFilter;

    let matchesDate = true;
    if (fromDate || toDate) {
      const ticketDate = inq.createdAt || inq.date || inq.created_at;
      if (ticketDate) {
        const d = new Date(ticketDate).toISOString().slice(0, 10);
        if (fromDate && d < fromDate) matchesDate = false;
        if (toDate && d > toDate) matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesDate;
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
    setCategoryFilter('all');
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

  // Extract unique categories for filter dropdown
  const categories = Array.from(new Set(generalInquiries.map((x) => x.category).filter(Boolean)));

  return (
    <div>
      <div className="admin-section-head">
        <div>
          <h2>Help Desk & General Support Tickets ({filtered.length} tickets)</h2>
          <p>Review user inquiries, payment proofs, deposit verification screenshots, and dispatch instant responses.</p>
        </div>
      </div>

      {/* Filter Toolbar Matching Screenshot 2 */}
      <div className="records-filter-card" style={{ marginBottom: 18 }}>
        <div className="filter-item search-box">
          <input
            type="text"
            className="filter-input"
            placeholder="Search phone, name, email, ticket ID, message..."
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
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
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
              <th>Category</th>
              <th>Inquiry Message</th>
              <th>Screenshot Proof</th>
              <th>Status</th>
              <th>Admin Reply</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inq) => {
              const isPending = inq.status === 'pending';
              const imgUrl = inq.attachmentUrl || inq.attachment_url;
              const hasReply = !!(inq.adminReply || inq.admin_reply);

              return (
                <tr key={inq.id}>
                  <td>
                    <b>#{inq.id}</b>
                    <small>{inq.createdAt || inq.date || 'Today'}</small>
                  </td>
                  <td>
                    <b>{inq.userName || inq.user_name || 'User'}</b>
                    <small>{inq.userEmail || inq.user_email || `User #${inq.userId || inq.user_id}`}</small>
                    {inq.userPhone && <small style={{ color: '#a78bfa' }}>📱 {inq.userPhone}</small>}
                  </td>
                  <td>
                    <span className="task-cat-pill">{inq.category}</span>
                  </td>
                  <td style={{ maxWidth: '260px' }}>
                    <div style={{ fontSize: '12.5px', color: '#ded4eb', lineHeight: '1.4' }}>
                      {inq.message}
                    </div>
                  </td>
                  <td>
                    {imgUrl ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <img
                          src={imgUrl}
                          alt="Screenshot Proof"
                          style={{
                            width: 42,
                            height: 42,
                            objectFit: 'cover',
                            borderRadius: 8,
                            border: '1px solid #a83dff',
                            cursor: 'pointer'
                          }}
                          onClick={() => setLightboxImg(imgUrl)}
                          title="Click to zoom in"
                        />
                        <button
                          type="button"
                          onClick={() => setLightboxImg(imgUrl)}
                          style={{
                            background: 'rgba(203,78,255,0.15)',
                            border: '1px solid rgba(203,78,255,0.3)',
                            borderRadius: 6,
                            padding: '4px 6px',
                            color: '#e9d5ff',
                            fontSize: '10.5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                        >
                          <Eye size={12} /> View
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#665f75' }}>None attached</span>
                    )}
                  </td>
                  <td>
                    <span className={`deposit-status-pill ${isPending ? 'pending' : 'approved'}`}>
                      {inq.status || 'pending'}
                    </span>
                  </td>
                  <td style={{ maxWidth: '220px' }}>
                    {hasReply ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: '11.5px', color: '#4ade80', lineHeight: 1.35 }}>
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
                      <span style={{ fontSize: '11.5px', color: '#7e778f' }}>No reply sent yet</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        className="approve-btn"
                        onClick={() => {
                          setSelectedInquiry(inq);
                          setReplyText(inq.adminReply || inq.admin_reply || '');
                        }}
                      >
                        {hasReply ? 'Edit' : 'Reply'}
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
                <td colSpan={8} className="empty-cell">
                  No support tickets found matching current search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reply / Edit Modal */}
      {selectedInquiry && (
        <div className="add-account-modal-overlay" onClick={() => setSelectedInquiry(null)}>
          <div className="add-account-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="add-account-head">
              <h3>
                <MessageSquare size={20} color="#cb4eff" /> {selectedInquiry.adminReply || selectedInquiry.admin_reply ? 'Edit Reply for Ticket' : 'Reply to Ticket'} #{selectedInquiry.id}
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
                User Inquiry ({selectedInquiry.category} - {selectedInquiry.userName}):
              </div>
              <p style={{ color: '#fff', margin: 0, fontSize: '13px', lineHeight: '1.5' }}>
                "{selectedInquiry.message}"
              </p>

              {(selectedInquiry.attachmentUrl || selectedInquiry.attachment_url) && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '11px', color: '#cb4eff', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                    Attached Screenshot Proof:
                  </span>
                  <img
                    src={selectedInquiry.attachmentUrl || selectedInquiry.attachment_url}
                    alt="Proof"
                    style={{ maxHeight: 120, borderRadius: 8, border: '1px solid #a83dff', cursor: 'pointer' }}
                    onClick={() => setLightboxImg(selectedInquiry.attachmentUrl || selectedInquiry.attachment_url)}
                  />
                </div>
              )}
            </div>

            <form onSubmit={handleSendReply}>
              <div className="admin-form-group">
                <label>Official Admin Reply to Member (Visible in User Panel & Live Guest Chat):</label>
                <textarea
                  className="admin-textarea"
                  rows={4}
                  required
                  placeholder="Type your response or resolution details for the customer..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#0e061c', border: '1px solid rgba(203, 78, 255, 0.3)', borderRadius: 10, color: '#fff' }}
                />
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
                    <Send size={15} /> {sending ? 'Updating...' : (selectedInquiry.adminReply || selectedInquiry.admin_reply ? 'Update Reply' : 'Send Reply')}
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
              {confirmDelete.type === 'reply' ? 'Delete Admin Reply?' : 'Delete Support Ticket?'}
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.5, margin: '0 0 18px' }}>
              {confirmDelete.type === 'reply'
                ? 'This will remove the reply from both the admin dashboard and the live website / guest chat, setting ticket back to pending.'
                : 'This will permanently delete this support ticket and remove any associated chat messages from the website.'}
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

      {/* Screenshot Lightbox Modal */}
      <AnimatePresence>
        {lightboxImg && (
          <div className="admin-modal-backdrop" onClick={() => setLightboxImg(null)} style={{ zIndex: 99999 }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ maxWidth: '90vw', maxHeight: '90vh', background: '#120b1f', padding: '16px', borderRadius: '16px', border: '1px solid #a83dff', position: 'relative' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightboxImg(null)}
                style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.7)', border: '1px solid #fff', borderRadius: '50%', color: '#fff', width: 30, height: 30, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
              <img
                src={lightboxImg}
                alt="Full Screenshot Proof"
                style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
