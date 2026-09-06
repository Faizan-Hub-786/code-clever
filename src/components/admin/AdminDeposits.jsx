import React, { useState, useEffect } from 'react';
import { Search, Filter, RotateCcw, Check, X, ExternalLink, Calendar } from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../../api/config';
import { fmt, fmtDate } from '../../utils/formatters';

export default function AdminDeposits({ queue, onAction }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Proof Modal
  const [previewProofUrl, setPreviewProofUrl] = useState(null);

  const loadDeposits = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery.trim());
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (sortBy) params.append('sort', sortBy);

      const res = await fetch(`${API_BASE_URL}/admin/deposits/records?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load deposits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeposits();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadDeposits();
  };

  const handleReset = () => {
    setSearchQuery('');
    setFromDate('');
    setToDate('');
    setStatusFilter('all');
    setSortBy('newest');
    setTimeout(() => {
      loadDeposits();
    }, 50);
  };

  const handleApprove = async (id) => {
    await onAction(`/api/admin/deposits/${id}/approve`);
    loadDeposits();
  };

  const handleReject = async (id) => {
    await onAction(`/api/admin/deposits/${id}/reject`);
    loadDeposits();
  };

  return (
    <div className="admin-deposits-records-page">
      {/* Title */}
      <div className="admin-section-head">
        <div>
          <h2>Recharge / Deposits ({records.length} records)</h2>
          <p>Verify incoming recharge submissions, inspect proof receipts, and credit user balances.</p>
        </div>
      </div>

      {/* Filter Toolbar Matching Screenshot 2 */}
      <form onSubmit={handleFilterSubmit} className="records-filter-card">
        <div className="filter-item search-box">
          <input
            type="text"
            className="filter-input"
            placeholder="Search phone, name, TID..."
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
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
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
            <option value="amount_desc">Highest amount</option>
          </select>
        </div>

        <button type="submit" className="cc-btn-green filter-submit-btn">
          <Filter size={14} /> Filter
        </button>

        <button type="button" className="filter-reset-btn" onClick={handleReset}>
          Reset
        </button>
      </form>

      {/* Table Section */}
      <div className="wheel-cc-card table-section">
        <div className="cc-table-container">
          <table className="cc-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Plan / TID</th>
                <th>Amount</th>
                <th>Date & Time</th>
                <th>Proof</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-table-cell">
                    {loading ? 'Loading recharge records...' : 'No recharge / deposit records found.'}
                  </td>
                </tr>
              ) : (
                records.map((d) => {
                  const isPending = d.status === 'pending';
                  const isApproved = d.status === 'approved';

                  return (
                    <tr key={d.id}>
                      <td>
                        <div className="user-cell">
                          <strong>{d.user_name || 'Member'}</strong>
                          <small>{d.user_phone || d.user_email || `ID ${d.user_id}`}</small>
                        </div>
                      </td>
                      <td>
                        <div className="user-cell">
                          <strong style={{ color: '#2563eb' }}>{d.plan_name || 'Recharge'}</strong>
                          <small>{d.method ? `${d.method} • ` : ''}TID {d.tx_id || '—'}</small>
                          {(d.sender_name || d.sender_number) && (
                            <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              <span>👤 <b>{d.sender_name || '—'}</b></span>
                              <span style={{ color: '#94a3b8' }}>•</span>
                              <span>📞 <b>{d.sender_number || '—'}</b></span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <strong className="cash-won-text" style={{ color: '#059669', fontSize: 14, fontWeight: 800 }}>
                          Rs. {fmt(d.amount)}
                        </strong>
                      </td>
                      <td>
                        <small className="date-text">
                          {new Date(d.created_at).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                            second: 'numeric',
                            hour12: true
                          })}
                        </small>
                      </td>
                      <td>
                        {d.proof_image ? (
                          <button
                            type="button"
                            className="proof-pill-btn"
                            onClick={() => setPreviewProofUrl(d.proof_image)}
                          >
                            View proof
                          </button>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: 11 }}>No proof</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-pill ${d.status}`}>
                          {d.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isPending ? (
                          <div className="table-actions">
                            <button
                              type="button"
                              className="action-btn plus"
                              onClick={() => handleApprove(d.id)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="action-btn unlock"
                              onClick={() => handleReject(d.id)}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          /* Once approved or rejected, no action is permitted (empty / locked) */
                          null
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proof Modal */}
      {previewProofUrl && (
        <div className="proof-modal-overlay" onClick={() => setPreviewProofUrl(null)}>
          <div className="proof-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="proof-modal-header">
              <h3>Payment Proof Screenshot</h3>
              <button type="button" className="proof-close-btn" onClick={() => setPreviewProofUrl(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="proof-modal-body">
              <img src={previewProofUrl} alt="Proof" className="proof-full-img" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
