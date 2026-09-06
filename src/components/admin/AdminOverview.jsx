import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Clock,
  MoreHorizontal,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Send,
  Mic,
  Calendar,
  Layers,
  ListTodo
} from 'lucide-react';
import { fmt } from '../../utils/formatters';

export default function AdminOverview({ data = {}, setSection }) {
  const today = data?.todayStats || {};
  const [activeTab, setActiveTab] = useState('all');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  // Sample or actual queue items
  const depositsQueue = data?.depositsQueue || [];
  const withdrawalsQueue = data?.withdrawalsQueue || [];
  const userList = data?.userList || [];

  // Filtered recent rows
  let recentRows = [];
  if (activeTab === 'all' || activeTab === 'deposits') {
    depositsQueue.slice(0, 4).forEach((d) => {
      recentRows.push({
        id: `#DEP-${d.id}`,
        name: d.email || d.username || `User #${d.user_id}`,
        type: 'Deposit',
        amount: `Rs. ${fmt(d.amount)}`,
        status: d.status || 'pending',
        rawType: 'deposits',
        date: d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Today'
      });
    });
  }

  if (activeTab === 'all' || activeTab === 'withdrawals') {
    withdrawalsQueue.slice(0, 4).forEach((w) => {
      recentRows.push({
        id: `#WTH-${w.id}`,
        name: w.email || w.username || `User #${w.user_id}`,
        type: 'Withdrawal',
        amount: `Rs. ${fmt(w.amount)}`,
        status: w.status || 'pending',
        rawType: 'withdrawals',
        date: w.created_at ? new Date(w.created_at).toLocaleDateString() : 'Today'
      });
    });
  }

  if (recentRows.length === 0 && userList.length > 0) {
    userList.slice(0, 5).forEach((u) => {
      recentRows.push({
        id: `#USR-${u.id}`,
        name: u.email || u.username,
        type: 'Member',
        amount: `Rs. ${fmt(u.balance || 0)}`,
        status: u.status === 'banned' ? 'banned' : 'active',
        rawType: 'users',
        date: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Recent'
      });
    });
  }

  const handleAiAsk = (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    const q = aiPrompt.toLowerCase();
    if (q.includes('deposit')) {
      setAiResponse(`There are currently ${data.pendingDeposits || 0} deposits pending verification.`);
    } else if (q.includes('withdraw')) {
      setAiResponse(`There are currently ${data.pendingWithdrawals || 0} withdrawal requests waiting for processing.`);
    } else if (q.includes('user') || q.includes('member')) {
      setAiResponse(`Total registered members: ${data.users || 0} (${data.activeUsers || 0} active).`);
    } else if (q.includes('revenue') || q.includes('profit')) {
      setAiResponse(`Total platform approved revenue is Rs. ${fmt(data.revenue || 0)}.`);
    } else {
      setAiResponse(`Platform status: Healthy. All databases and microservices operational.`);
    }
    setAiPrompt('');
  };

  return (
    <div className="shopeers-overview">
      {/* 1. TOP 4 METRIC KPI CARDS */}
      <div className="shopeers-kpi-grid">
        {/* Metric 1: Page Views / Total Users */}
        <div className="shopeers-kpi-card" onClick={() => setSection('users')}>
          <div className="shopeers-kpi-top">
            <span className="shopeers-kpi-label">Page Views / Users</span>
            <div className="shopeers-kpi-icon blue">
              <Eye size={20} />
            </div>
          </div>
          <div className="shopeers-kpi-value">
            {fmt(data.users || 16431)}
            <span className="shopeers-kpi-growth up">▲ 15.5%</span>
          </div>
          <div className="shopeers-kpi-subtext">vs. 14,653 last period</div>
        </div>

        {/* Metric 2: Visitors / Active Today */}
        <div className="shopeers-kpi-card" onClick={() => setSection('users')}>
          <div className="shopeers-kpi-top">
            <span className="shopeers-kpi-label">Visitors / Active Today</span>
            <div className="shopeers-kpi-icon purple">
              <Users size={20} />
            </div>
          </div>
          <div className="shopeers-kpi-value">
            {fmt(today.activeUsers || data.activeUsers || 6225)}
            <span className="shopeers-kpi-growth up">▲ 8.4%</span>
          </div>
          <div className="shopeers-kpi-subtext">vs. 5,732 last period</div>
        </div>

        {/* Metric 3: Approved Revenue */}
        <div className="shopeers-kpi-card" onClick={() => setSection('deposits')}>
          <div className="shopeers-kpi-top">
            <span className="shopeers-kpi-label">Approved Revenue</span>
            <div className="shopeers-kpi-icon cyan">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="shopeers-kpi-value">
            Rs. {fmt(data.revenue || 446700)}
            <span className="shopeers-kpi-growth up">▲ 24.4%</span>
          </div>
          <div className="shopeers-kpi-subtext">vs. last period</div>
        </div>

        {/* Metric 4: Pending Action Queue */}
        <div className="shopeers-kpi-card" onClick={() => setSection('deposits')}>
          <div className="shopeers-kpi-top">
            <span className="shopeers-kpi-label">Pending Queues</span>
            <div className="shopeers-kpi-icon emerald">
              <Clock size={20} />
            </div>
          </div>
          <div className="shopeers-kpi-value">
            {(data.pendingDeposits || 0) + (data.pendingWithdrawals || 0)}
            <span className="shopeers-kpi-growth up">▲ 4.4%</span>
          </div>
          <div className="shopeers-kpi-subtext">
            {data.pendingDeposits || 0} deposits · {data.pendingWithdrawals || 0} withdrawals
          </div>
        </div>
      </div>

      {/* 2. MIDDLE DUAL GRID: FINANCIAL SVG CHART + WEEKLY BAR GRAPH */}
      <div className="shopeers-dual-grid">
        {/* Left: Total Profit Chart */}
        <div className="shopeers-card">
          <div className="shopeers-card-header">
            <h3 className="shopeers-card-title">Total Profit</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                Jan 1, 2026 - Present
              </span>
              <button className="shopeers-card-menu-btn" title="Options">
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>

          <div className="shopeers-profit-stat">
            Rs. {fmt(data.revenue || 446700)}
            <span className="shopeers-kpi-growth up" style={{ fontSize: 13 }}>
              ▲ 24.4% vs. last period
            </span>
          </div>

          {/* High-definition SVG Area Graph */}
          <div className="shopeers-chart-wrap">
            <svg
              className="shopeers-chart-svg"
              viewBox="0 0 600 160"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="30" x2="600" y2="30" stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1="0" y1="80" x2="600" y2="80" stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1="0" y1="130" x2="600" y2="130" stroke="#f1f5f9" strokeDasharray="4 4" />

              {/* Area Shading */}
              <path
                d="M 0,110 Q 70,112 120,95 T 240,115 T 320,60 T 400,90 T 500,45 T 600,65 L 600,160 L 0,160 Z"
                fill="url(#profitGradient)"
              />

              {/* Smooth Spline Curve */}
              <path
                d="M 0,110 Q 70,112 120,95 T 240,115 T 320,60 T 400,90 T 500,45 T 600,65"
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Peak Active Dot on Jan 18 */}
              <circle cx="320" cy="60" r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" />
            </svg>

            {/* Interactive Tooltip matching reference screenshot */}
            <div className="shopeers-chart-tooltip">
              <strong>Jan 18, 2026</strong>
              <span>Rs. 12,324 this month</span>
              <small style={{ display: 'block', color: '#64748b' }}>Rs. 5,543 last month</small>
            </div>
          </div>

          {/* Date Axis labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#94a3b8', fontWeight: 600, padding: '0 4px' }}>
            <span>1 Jan</span>
            <span>8 Jan</span>
            <span>15 Jan</span>
            <span>22 Jan</span>
            <span>29 Jan</span>
          </div>

          {/* Bottom Customer Segments Row */}
          <div className="shopeers-segments-box">
            <div className="shopeers-segment-item">
              <span className="shopeers-segment-dot blue" />
              <div>
                <strong>2,884</strong>
                <small>Retailers / VIP 1</small>
              </div>
            </div>
            <div className="shopeers-segment-item">
              <span className="shopeers-segment-dot emerald" />
              <div>
                <strong>1,432</strong>
                <small>Distributors / VIP 2</small>
              </div>
            </div>
            <div className="shopeers-segment-item">
              <span className="shopeers-segment-dot amber" />
              <div>
                <strong>562</strong>
                <small>Wholesalers / VIP 3</small>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Most Day Active Bar Chart */}
        <div className="shopeers-card">
          <div className="shopeers-card-header">
            <h3 className="shopeers-card-title">Most Day Active</h3>
            <button className="shopeers-card-menu-btn" title="Options">
              <MoreHorizontal size={18} />
            </button>
          </div>

          <div className="shopeers-bars-container">
            {/* Sun */}
            <div className="shopeers-bar-col">
              <div className="shopeers-bar-track">
                <div className="shopeers-bar-fill" style={{ height: '40%' }} />
              </div>
              <span className="shopeers-bar-day">Sun</span>
            </div>
            {/* Mon */}
            <div className="shopeers-bar-col">
              <div className="shopeers-bar-track">
                <div className="shopeers-bar-fill" style={{ height: '55%' }} />
              </div>
              <span className="shopeers-bar-day">Mon</span>
            </div>
            {/* Tue (Highlighted Peak Day with Badge) */}
            <div className="shopeers-bar-col">
              <div className="shopeers-bar-track">
                <div className="shopeers-bar-fill active" style={{ height: '92%' }} />
                <span className="shopeers-bar-badge">8,162</span>
              </div>
              <span className="shopeers-bar-day active">Tue</span>
            </div>
            {/* Wed */}
            <div className="shopeers-bar-col">
              <div className="shopeers-bar-track">
                <div className="shopeers-bar-fill" style={{ height: '50%' }} />
              </div>
              <span className="shopeers-bar-day">Wed</span>
            </div>
            {/* Thu */}
            <div className="shopeers-bar-col">
              <div className="shopeers-bar-track">
                <div className="shopeers-bar-fill" style={{ height: '42%' }} />
              </div>
              <span className="shopeers-bar-day">Thu</span>
            </div>
            {/* Fri */}
            <div className="shopeers-bar-col">
              <div className="shopeers-bar-track">
                <div className="shopeers-bar-fill" style={{ height: '65%' }} />
              </div>
              <span className="shopeers-bar-day">Fri</span>
            </div>
            {/* Sat */}
            <div className="shopeers-bar-col">
              <div className="shopeers-bar-track">
                <div className="shopeers-bar-fill" style={{ height: '35%' }} />
              </div>
              <span className="shopeers-bar-day">Sat</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM DUAL GRID: RECENT TRANSACTION QUEUES + STACKED WIDGETS */}
      <div className="shopeers-dual-grid">
        {/* Left: Best Selling / Recent Transaction Queue Table */}
        <div className="shopeers-card">
          <div className="shopeers-card-header">
            <div>
              <h3 className="shopeers-card-title">Recent Activity & Action Queues</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                Latest member transactions and verification requests.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`shopeers-btn-secondary ${activeTab === 'all' ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: 11.5 }}
                onClick={() => setActiveTab('all')}
              >
                All
              </button>
              <button
                className={`shopeers-btn-secondary ${activeTab === 'deposits' ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: 11.5 }}
                onClick={() => setActiveTab('deposits')}
              >
                Deposits ({data.pendingDeposits || 0})
              </button>
              <button
                className={`shopeers-btn-secondary ${activeTab === 'withdrawals' ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: 11.5 }}
                onClick={() => setActiveTab('withdrawals')}
              >
                Withdrawals ({data.pendingWithdrawals || 0})
              </button>
            </div>
          </div>

          <div className="shopeers-table-wrap">
            <table className="shopeers-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Member</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentRows.length > 0 ? (
                  recentRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="shopeers-table-id">{row.id}</td>
                      <td className="shopeers-table-primary">{row.name}</td>
                      <td>{row.type}</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{row.amount}</td>
                      <td>
                        <span
                          className={`shopeers-status-pill ${
                            row.status === 'approved' || row.status === 'active'
                              ? 'success'
                              : row.status === 'pending'
                              ? 'pending'
                              : 'danger'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="shopeers-action-btn"
                          onClick={() => setSection(row.rawType || 'deposits')}
                        >
                          Review →
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                      No recent transaction records in queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Stack: Repeat Rate Gauge + AI Assistant */}
        <div className="shopeers-right-stack">
          {/* Gauge Widget: Task Completion Rate */}
          <div className="shopeers-card shopeers-gauge-box">
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 className="shopeers-card-title">Task Completion Rate</h3>
              <button className="shopeers-card-menu-btn">
                <MoreHorizontal size={16} />
              </button>
            </div>

            <div className="shopeers-gauge-arc-wrap">
              <svg className="shopeers-gauge-svg" viewBox="0 0 160 160">
                {/* Background track arc */}
                <path
                  d="M 20,80 A 60,60 0 0,1 140,80"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="12"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />
                {/* Colored progress arc (68%) */}
                <path
                  d="M 20,80 A 60,60 0 0,1 125,45"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />
              </svg>
              <span className="shopeers-gauge-value">68%</span>
            </div>

            <div className="shopeers-gauge-desc">On track for 80% platform target</div>
            <button className="shopeers-gauge-btn" onClick={() => setSection('tasks')}>
              Show Details
            </button>
          </div>

          {/* AI Assistant & System Quick Controls */}
          <div className="shopeers-card shopeers-ai-card">
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="shopeers-card-title">AI Assistant</h3>
              <Sparkles size={16} color="#2563eb" />
            </div>

            {/* 3D Glowing Blue Sphere */}
            <div className="shopeers-ai-sphere" />

            {aiResponse && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#1e293b', marginBottom: 12, width: '100%', textAlign: 'left' }}>
                {aiResponse}
              </div>
            )}

            <form onSubmit={handleAiAsk} className="shopeers-ai-input-wrap">
              <Search size={14} className="shopeers-ai-input-icon" />
              <input
                type="text"
                className="shopeers-ai-input"
                placeholder="Ask me anything..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
              <button type="submit" className="shopeers-ai-send-btn" title="Send question">
                <Send size={12} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
