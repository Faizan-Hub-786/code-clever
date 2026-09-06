import React, { useState, useEffect } from 'react';
import { Search, Filter, RotateCcw, Check, X } from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../../api/config';
import { fmt } from '../../utils/formatters';

export default function AdminWithdrawals({ queue, onAction }) {
  const [records, setRecords] = useState(() => (Array.isArray(queue) && queue.length > 0 ? queue : []));
  const [loading, setLoading] = useState(() => !(Array.isArray(queue) && queue.length > 0));

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery.trim());
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (sortBy) params.append('sort', sortBy);

      const res = await fetch(`${API_BASE_URL}/admin/withdrawals/records?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load withdrawals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadWithdrawals();
  };

  const handleReset = () => {
    setSearchQuery('');
    setFromDate('');
    setToDate('');
    setStatusFilter('all');
    setSortBy('newest');
    setTimeout(() => {
      loadWithdrawals();
    }, 50);
  };

  const handleMarkPaid = async (id) => {
    await onAction(`/api/admin/withdrawals/${id}/paid`);
    loadWithdrawals();
  };

  const handleReject = async (id) => {
    await onAction(`/api/admin/withdrawals/${id}/reject`);
    loadWithdrawals();
  };

  return (
    <div className="admin-withdrawals-records-page">
      {/* Title */}
      <div className="admin-section-head">
        <div>
          <h2>Withdrawals ({records.length} records)</h2>
          <p>Authorize payout settlements or refund balances. Once a withdrawal is approved/paid, it is locked permanently.</p>
        </div>
      </div>

      {/* Filter Toolbar Matching Screenshot 2 */}
      <form onSubmit={handleFilterSubmit} className="records-filter-card">
        <div className="filter-item search-box">
          <input
            type="text"
            className="filter-input"
            placeholder="Search phone, name, account..."
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
            <option value="paid">Paid / Approved</option>
            <option value="rejected">Rejected / Refunded</option>
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
                <th>Account Details</th>
                <th>Requested</th>
                <th>Net Payout</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-table-cell">
                    {loading ? 'Loading withdrawal records...' : 'No withdrawal records found.'}
                  </td>
                </tr>
              ) : (
                records.map((w) => {
                  const isPending = w.status === 'pending' || w.status === 'processing';
                  const isPaid = w.status === 'paid';

                  return (
                    <tr key={w.id}>
                      <td>
                        <div className="user-cell">
                          <strong>{w.user_name || 'Member'}</strong>
                          <small>{w.user_phone || w.user_email || `ID ${w.user_id}`}</small>
                        </div>
                      </td>
                      <td>
                        <div className="user-cell">
                          <strong style={{ color: '#2563eb' }}>{w.method ? w.method.toUpperCase() : 'Wallet'} • {w.account_title || '—'}</strong>
                          <small>{w.account_number || '—'}</small>
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>Rs. {fmt(w.amount)}</strong>
                        {w.wallet_type && (
                          <small style={{ display: 'block', color: '#7c3aed', fontSize: 10, fontWeight: 700, textTransform: 'capitalize' }}>
                            {w.wallet_type} Wallet
                          </small>
                        )}
                      </td>
                      <td>
                        <strong className="cash-won-text" style={{ color: '#059669', fontSize: 14, fontWeight: 800 }}>
                          Rs. {fmt(w.net_amount !== undefined ? w.net_amount : (Number(w.amount) - Number(w.fee || w.tax_amount || 0)))}
                        </strong>
                        {Number(w.fee || w.tax_amount) > 0 ? (
                          <small style={{ display: 'block', color: '#dc2626', fontSize: 10, fontWeight: 700 }}>
                            10% Tax: -Rs. {fmt(w.fee || w.tax_amount)}
                          </small>
                        ) : null}
                      </td>
                      <td>
                        <small className="date-text">
                          {new Date(w.created_at).toLocaleString('en-US', {
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
                        <span className={`status-pill ${w.status}`}>
                          {w.status === 'paid' ? 'approved' : w.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isPending ? (
                          /* PENDING: Show Approve (Mark Paid) and Reject options */
                          <div className="table-actions">
                            <button
                              type="button"
                              className="action-btn plus"
                              onClick={() => handleMarkPaid(w.id)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="action-btn unlock"
                              onClick={() => handleReject(w.id)}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          /* ONCE APPROVED (PAID) OR REJECTED: NO REJECT OPTION ALLOWED (LOCKED READ-ONLY) */
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
    </div>
  );
}
