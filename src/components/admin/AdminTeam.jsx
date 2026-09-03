import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ChevronDown, ChevronUp, Save, CheckCircle2, AlertCircle,
  Sparkles, Search, UserCheck, Sliders, Download, FileSpreadsheet,
  RefreshCw, X, ArrowRight
} from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../../api/config';
import { fmt } from '../../utils/formatters';

const LEVEL_COLORS = { A: '#4ade80', B: '#60a5fa', C: '#f472b6' };
const LEVEL_BG = { A: 'rgba(74,222,128,0.12)', B: 'rgba(96,165,250,0.12)', C: 'rgba(244,114,182,0.12)' };

function LevelBadge({ level }) {
  if (!level) return <span style={{ color: '#64748b', fontSize: 11 }}>—</span>;
  return (
    <span style={{
      background: LEVEL_BG[level] || 'rgba(148,163,184,0.1)',
      color: LEVEL_COLORS[level] || '#94a3b8',
      border: '1px solid ' + (LEVEL_COLORS[level] || '#94a3b8') + '33',
      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, letterSpacing: 1
    }}>LEVEL {level}</span>
  );
}

function MemberRow({ member, depth = 0 }) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const isC = member.teamLevel === 'C';
  const hasChildren = member.directCount > 0 && !isC;

  const loadChildren = async () => {
    if (open) { setOpen(false); return; }
    if (!children.length) {
      setLoading(true);
      try {
        const r = await fetch(API_BASE_URL + '/admin/team/member/' + member.id + '/children', { headers: getAuthHeaders() });
        if (r.ok) setChildren(await r.json());
      } catch {}
      setLoading(false);
    }
    setOpen(true);
  };

  return (
    <React.Fragment>
      <tr style={{ background: depth === 0 ? 'rgba(255,255,255,0.03)' : depth === 1 ? 'rgba(96,165,250,0.04)' : 'rgba(244,114,182,0.04)' }}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: depth * 22 }}>
            {depth > 0 && <ArrowRight size={11} color='#475569' />}
            <LevelBadge level={member.teamLevel} />
          </div>
        </td>
        <td>
          <div className='user-cell'>
            <strong>{member.fullName}</strong>
            <small>ID: {member.id} · {member.phone}</small>
          </div>
        </td>
        <td><span className='plan-badge'>{member.activePlan || 'Free'}</span></td>
        <td><strong style={{ color: '#4ade80' }}>Rs. {fmt(member.totalEarned)}</strong></td>
        <td>
          {hasChildren ? (
            <button className='cc-btn-green downline-btn' onClick={loadChildren} style={{ fontSize: 11, padding: '4px 10px' }}>
              {loading ? <RefreshCw size={11} /> : open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              <span>View ({member.directCount})</span>
            </button>
          ) : <span style={{ color: '#475569', fontSize: 12 }}>—</span>}
        </td>
        <td><span className={'status-chip ' + member.status}>{member.status}</span></td>
      </tr>
      {open && children.map(c => <MemberRow key={c.id} member={c} depth={depth + 1} />)}
    </React.Fragment>
  );
}

function LeaderDetailsModal({ leaderId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openA, setOpenA] = useState(true);
  const [openB, setOpenB] = useState(false);
  const [openC, setOpenC] = useState(false);

  useEffect(() => {
    async function fetchBreakdown() {
      setLoading(true);
      try {
        const r = await fetch(API_BASE_URL + '/admin/team/leader/' + leaderId + '/abc-breakdown', { headers: getAuthHeaders() });
        if (r.ok) setData(await r.json());
      } catch (err) {
        console.error('Failed to load breakdown:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBreakdown();
  }, [leaderId]);

  if (!leaderId) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(3,1,10,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#0b061e', border: '1px solid rgba(192,132,252,0.25)', borderRadius: 16, width: '100%', maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)' }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 20, color: '#f8fafc', fontWeight: 800, letterSpacing: 0.5 }}>
                {data?.leader?.fullName?.toUpperCase() || 'LEADER DETAILS'}
              </h2>
              <span style={{ background: 'rgba(192,132,252,0.15)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.3)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                Leader ID: #{data?.leader?.id || leaderId}
              </span>
            </div>
            {data?.leader && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                Phone: <span style={{ color: '#cbd5e1' }}>{data.leader.phone}</span> · Registered: <span style={{ color: '#cbd5e1' }}>{new Date(data.leader.createdAt).toLocaleDateString()}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#94a3b8', gap: 10 }}>
              <RefreshCw size={20} className='spin-icon' /> Loading leader downline...
            </div>
          ) : !data ? (
            <div style={{ textAlign: 'center', color: '#ef4444', padding: '40px 0' }}>Failed to load breakdown.</div>
          ) : (
            <React.Fragment>
              {/* 4 KPI Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <small style={{ color: '#86efac', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Team A</small>
                  <strong style={{ display: 'block', fontSize: 22, color: '#4ade80', marginTop: 2 }}>{data.summary.countA}</strong>
                </div>
                <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <small style={{ color: '#93c5fd', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Team B</small>
                  <strong style={{ display: 'block', fontSize: 22, color: '#60a5fa', marginTop: 2 }}>{data.summary.countB}</strong>
                </div>
                <div style={{ background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.25)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <small style={{ color: '#f9a8d4', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Team C</small>
                  <strong style={{ display: 'block', fontSize: 22, color: '#f472b6', marginTop: 2 }}>{data.summary.countC}</strong>
                </div>
                <div style={{ background: 'rgba(192,132,252,0.08)', border: '1px solid rgba(192,132,252,0.25)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <small style={{ color: '#d8b4fe', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>TOTAL TEAM</small>
                  <strong style={{ display: 'block', fontSize: 22, color: '#c084fc', marginTop: 2 }}>{data.summary.totalTeam}</strong>
                </div>
              </div>

              {/* Accordion 1: [ A TEAM ] */}
              <div style={{ marginBottom: 12, border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, overflow: 'hidden', background: 'rgba(74,222,128,0.03)' }}>
                <button onClick={() => setOpenA(p => !p)} style={{ width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(74,222,128,0.08)', border: 'none', color: '#4ade80', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: '#4ade80', color: '#000', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>A</span>
                    A TEAM ({data.teamA.length} members)
                  </span>
                  {openA ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {openA && (
                  <div style={{ padding: '10px 14px' }}>
                    {data.teamA.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>No Level A members registered under this leader.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {data.teamA.map(m => (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ color: '#4ade80', fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{m.code}</span>
                              <div>
                                <strong style={{ color: '#f1f5f9', fontSize: 13 }}>{m.fullName}</strong>
                                <small style={{ display: 'block', color: '#94a3b8', fontSize: 11 }}>ID: {m.id} · {m.phone}</small>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                                {m.directCount} {m.directCount === 1 ? 'member' : 'members'}
                              </span>
                              <span className='plan-badge' style={{ fontSize: 11 }}>{m.activePlan}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Accordion 2: [ B TEAM ] */}
              <div style={{ marginBottom: 12, border: '1px solid rgba(96,165,250,0.2)', borderRadius: 10, overflow: 'hidden', background: 'rgba(96,165,250,0.03)' }}>
                <button onClick={() => setOpenB(p => !p)} style={{ width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(96,165,250,0.08)', border: 'none', color: '#60a5fa', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: '#60a5fa', color: '#000', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>B</span>
                    B TEAM ({data.teamB.length} members)
                  </span>
                  {openB ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {openB && (
                  <div style={{ padding: '10px 14px' }}>
                    {data.teamB.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>No Level B members in this leader's tree.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {data.teamB.map(m => (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{m.code}</span>
                              <div>
                                <strong style={{ color: '#f1f5f9', fontSize: 13 }}>{m.fullName}</strong>
                                <small style={{ display: 'block', color: '#94a3b8', fontSize: 11 }}>via {m.sponsorName} · ID: {m.id}</small>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                                {m.directCount} {m.directCount === 1 ? 'member' : 'members'}
                              </span>
                              <span className='plan-badge' style={{ fontSize: 11 }}>{m.activePlan}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Accordion 3: [ C TEAM ] */}
              <div style={{ marginBottom: 12, border: '1px solid rgba(244,114,182,0.2)', borderRadius: 10, overflow: 'hidden', background: 'rgba(244,114,182,0.03)' }}>
                <button onClick={() => setOpenC(p => !p)} style={{ width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(244,114,182,0.08)', border: 'none', color: '#f472b6', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: '#f472b6', color: '#000', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>C</span>
                    C TEAM ({data.teamC.length} members)
                  </span>
                  {openC ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {openC && (
                  <div style={{ padding: '10px 14px' }}>
                    {data.teamC.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>No Level C members in this leader's tree.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {data.teamC.map(m => (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ color: '#f472b6', fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{m.code}</span>
                              <div>
                                <strong style={{ color: '#f1f5f9', fontSize: 13 }}>{m.fullName}</strong>
                                <small style={{ display: 'block', color: '#94a3b8', fontSize: 11 }}>via {m.sponsorName} · ID: {m.id}</small>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ background: 'rgba(244,114,182,0.1)', color: '#f472b6', border: '1px dashed rgba(244,114,182,0.3)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                                0 visible levels (Terminal Level C)
                              </span>
                              <span className='plan-badge' style={{ fontSize: 11 }}>{m.activePlan}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
}

function LeaderRow({ user, onInspect }) {
  const [open, setOpen] = useState(false);
  const [aMembers, setAMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const isLeader = user.countA > 0 || user.countB > 0 || user.countC > 0 || user.directCount > 0;

  const toggleDownline = async () => {
    if (open) { setOpen(false); return; }
    if (!aMembers.length) {
      setLoading(true);
      try {
        const r = await fetch(API_BASE_URL + '/admin/team/leader/' + user.id + '/downline', { headers: getAuthHeaders() });
        if (r.ok) setAMembers(await r.json());
      } catch {}
      setLoading(false);
    }
    setOpen(true);
  };

  return (
    <React.Fragment>
      <tr>
        <td>
          <div className='user-cell'>
            <strong style={{ cursor: isLeader ? 'pointer' : 'default', color: isLeader ? '#c084fc' : '#f1f5f9' }} onClick={() => isLeader && onInspect && onInspect(user.id)}>
              {user.fullName}
            </strong>
            <small>ID: {user.id} · {user.phone}</small>
          </div>
        </td>
        <td>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid #4ade8033', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>A: {user.countA}</span>
            <span style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid #60a5fa33', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>B: {user.countB}</span>
            <span style={{ background: 'rgba(244,114,182,0.1)', color: '#f472b6', border: '1px solid #f472b633', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>C: {user.countC}</span>
          </div>
          <small style={{ color: '#64748b', fontSize: 10 }}>Total: {user.totalTeam}</small>
        </td>
        <td><strong style={{ color: '#a78bfa' }}>Rs. {fmt(user.teamEarnings)}</strong></td>
        <td>{user.teamLevel ? <LevelBadge level={user.teamLevel} /> : <span style={{ color: '#c084fc', fontSize: 11, fontWeight: 700 }}>ROOT</span>}</td>
        <td style={{ textAlign: 'right' }}>
          <div style={{ display: 'inline-flex', gap: 6 }}>
            {isLeader && (
              <button className='outline-btn' onClick={() => onInspect && onInspect(user.id)} style={{ fontSize: 11, padding: '4px 8px' }}>
                Summary
              </button>
            )}
            {isLeader ? (
              <button className='cc-btn-green downline-btn' onClick={toggleDownline}>
                {loading ? <RefreshCw size={13} className='spin-icon' /> : open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                <span>View Downline ({user.directCount})</span>
              </button>
            ) : <span style={{ color: '#475569', fontSize: 12 }}>—</span>}
          </div>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan='5' style={{ padding: '0 0 0 20px', background: '#07031a' }}>
            <div style={{ borderLeft: '2px solid #4ade8044', paddingLeft: 16, paddingTop: 10, paddingBottom: 10 }}>
              <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 700, marginBottom: 8 }}>
                Level A Members under {user.fullName}
              </div>
              {aMembers.length === 0 ? (
                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>No A-level members found.</p>
              ) : (
                <table className='cc-table subtable' style={{ marginBottom: 0 }}>
                  <thead>
                    <tr>
                      <th>Level</th><th>Member</th><th>Plan</th><th>Total Earned</th><th>Sub-Team</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aMembers.map(m => <MemberRow key={m.id} member={m} depth={0} />)}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

export default function AdminTeam() {
  const [activeTab, setActiveTab] = useState('leaders');
  const [inspectLeaderId, setInspectLeaderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ totalMembers: 0, activeMembers: 0, membersTotalEarnings: 0, countA: 0, countB: 0, countC: 0 });
  const [users, setUsers] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(1);
  const LIMIT = 30;
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filter, setFilter] = useState('all');
  const [levels, setLevels] = useState([
    { level: 1, name: 'Level A', percent: 10 },
    { level: 2, name: 'Level B', percent: 5 },
    { level: 3, name: 'Level C', percent: 2 }
  ]);
  const [showRatesEditor, setShowRatesEditor] = useState(false);
  const [savingRates, setSavingRates] = useState(false);
  const [exportHistory, setExportHistory] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState('xlsx');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async (pg = 1, q = '', f = 'all') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT, q, filter: f });
      const r = await fetch(API_BASE_URL + '/admin/team/hierarchy?' + params, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        setKpis({ totalMembers: d.totalMembers, activeMembers: d.activeMembers, membersTotalEarnings: d.membersTotalEarnings, countA: d.countA, countB: d.countB, countC: d.countC });
        setUsers(d.users || []);
        setTotalRows(d.totalRows || 0);
        setPage(pg);
      }
    } catch {}
    setLoading(false);
  }, []);

  const loadExportHistory = async () => {
    try {
      const r = await fetch(API_BASE_URL + '/admin/team/exports', { headers: getAuthHeaders() });
      if (r.ok) setExportHistory(await r.json());
    } catch {}
  };

  const fetchLevels = async () => {
    try {
      const r = await fetch(API_BASE_URL + '/admin/team-levels', { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        if (d.levels && d.levels.length) setLevels(d.levels.map(l => ({ ...l, name: l.level === 1 ? 'Level A' : l.level === 2 ? 'Level B' : 'Level C' })));
      }
    } catch {}
  };

  useEffect(() => { loadData(1, '', 'all'); fetchLevels(); loadExportHistory(); }, []);
  useEffect(() => { if (activeTab === 'export') loadExportHistory(); }, [activeTab]);

  const handleSearch = e => { e.preventDefault(); setSearch(searchInput); loadData(1, searchInput, filter); };
  const handleFilter = f => { setFilter(f); loadData(1, search, f); };

  const handleSaveRates = async () => {
    setSavingRates(true); setMsg(''); setError('');
    try {
      const r = await fetch(API_BASE_URL + '/admin/team-levels', { method: 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ levels }) });
      const d = await r.json();
      if (r.ok) { setMsg('Commission rates updated!'); fetchLevels(); } else setError(d.message || 'Failed.');
    } catch { setError('Network error'); }
    setSavingRates(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await fetch(API_BASE_URL + '/admin/team/export', { method: 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ fileType: exportType }) });
      if (!r.ok) { const d = await r.json(); setError(d.message || 'Export failed.'); setExporting(false); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const now = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a'); a.href = url; a.download = 'CodeClever_TeamData_' + now + '.' + exportType; a.click();
      URL.revokeObjectURL(url);
      setMsg('Downloaded: CodeClever_TeamData_' + now + '.' + exportType);
      await loadExportHistory();
    } catch (e) { setError('Export failed: ' + e.message); }
    setExporting(false);
  };

  const handleBackfill = async () => {
    try {
      const r = await fetch(API_BASE_URL + '/admin/team/backfill', { method: 'POST', headers: getAuthHeaders() });
      const d = await r.json();
      if (r.ok) { setMsg(d.message); loadData(page, search, filter); } else setError(d.message);
    } catch { setError('Backfill failed.'); }
  };

  const totalPages = Math.ceil(totalRows / LIMIT);

  const FILTERS = [
    { key: 'all', label: 'All Users' }, { key: 'leaders', label: 'Leaders Only' },
    { key: 'A', label: 'Team A' }, { key: 'B', label: 'Team B' }, { key: 'C', label: 'Team C' },
    { key: 'with_members', label: 'With Members' }, { key: 'without_members', label: 'No Members' }
  ];

  return (
    <div className='admin-team-hierarchy-page'>
      <div className='admin-section-head'>
        <div>
          <h2>Team Structure & A/B/C Downline Management</h2>
          <p>Server-side search across all users. Lazy-loaded A → B → C tree. Max 3 levels per leader — no D level ever created.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type='button' className='outline-btn' onClick={handleBackfill} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} /> <span>Re-Sync Levels</span>
          </button>
          <button type='button' className='outline-btn' onClick={() => setShowRatesEditor(p => !p)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sliders size={13} /> <span>Commission Rates</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total Users', val: kpis.totalMembers, color: '#c084fc' },
          { label: 'Active Members', val: kpis.activeMembers, color: '#4ade80' },
          { label: 'Total Earnings', val: 'Rs. ' + fmt(kpis.membersTotalEarnings), color: '#fbbf24' },
          { label: 'Level A', val: kpis.countA, color: '#4ade80' },
          { label: 'Level B', val: kpis.countB, color: '#60a5fa' },
          { label: 'Level C', val: kpis.countC, color: '#f472b6' }
        ].map(k => (
          <div key={k.label} className='team-kpi-card' style={{ textAlign: 'center' }}>
            <small>{k.label}</small>
            <strong style={{ color: k.color, fontSize: 20, display: 'block' }}>{k.val}</strong>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {msg && <motion.div className='admin-cc-alert success' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><CheckCircle2 size={18} /> <span>{msg}</span> <button onClick={() => setMsg('')}><X size={14} /></button></motion.div>}
        {error && <motion.div className='admin-cc-alert error' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><AlertCircle size={18} /> <span>{error}</span> <button onClick={() => setError('')}><X size={14} /></button></motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {showRatesEditor && (
          <motion.div className='commission-rates-box' initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3>Commission Rates (A/B/C)</h3>
              <button className='cc-btn-green' style={{ height: 34, padding: '0 14px', fontSize: 12 }} disabled={savingRates} onClick={handleSaveRates}>
                <Save size={13} /> <span>{savingRates ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {levels.map(lvl => (
                <div key={lvl.level} className='tier-card'>
                  <div className='tier-card-head'><span className='tier-pill'>LEVEL {lvl.level === 1 ? 'A' : lvl.level === 2 ? 'B' : 'C'}</span></div>
                  <label style={{ fontSize: 11, color: '#cbd5e1', marginTop: 8, display: 'block' }}>Rate (%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <input type='number' min='0' max='100' step='0.5' className='cc-input' style={{ height: 36 }} value={lvl.percent}
                      onChange={e => setLevels(prev => prev.map(l => l.level === lvl.level ? { ...l, percent: Number(e.target.value) } : l))} />
                    <span style={{ fontWeight: 800, color: '#c084fc' }}>%</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className='team-tabs-bar' style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {[
          { key: 'leaders', icon: <Users size={15} />, label: 'Leader Directory' },
          { key: 'members', icon: <UserCheck size={15} />, label: 'All Members' },
          { key: 'export', icon: <FileSpreadsheet size={15} />, label: 'Daily Export' }
        ].map(t => (
          <button key={t.key} className={'team-tab-btn ' + (activeTab === t.key ? 'active' : '')} onClick={() => setActiveTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {(activeTab === 'leaders' || activeTab === 'members') && (
        <div className='wheel-cc-card table-section'>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0 12px', gap: 8 }}>
                <Search size={15} color='#94a3b8' />
                <input type='text' placeholder='Search by User ID, Name or Phone...' value={searchInput} onChange={e => setSearchInput(e.target.value)}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 13, padding: '9px 0' }} />
                {searchInput && <button type='button' onClick={() => { setSearchInput(''); setSearch(''); loadData(1, '', filter); }}><X size={13} color='#64748b' /></button>}
              </div>
              <button type='submit' className='cc-btn-green' style={{ padding: '0 18px', height: 38 }}>Search</button>
            </form>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => handleFilter(f.key)}
                  style={{ background: filter === f.key ? 'rgba(192,132,252,0.2)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (filter === f.key ? '#c084fc' : 'rgba(255,255,255,0.1)'), color: filter === f.key ? '#c084fc' : '#94a3b8', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>
                  {f.label}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>{totalRows} results</span>
            </div>
          </div>

          <div className='cc-table-container'>
            {activeTab === 'leaders' ? (
              <table className='cc-table'>
                <thead>
                  <tr>
                    <th>User / Leader</th><th>A / B / C Team</th><th>Team Earnings</th><th>My Level</th><th style={{ textAlign: 'right' }}>Downline</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan='5' className='empty-table-cell'><RefreshCw size={18} /> Loading...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan='5' className='empty-table-cell'>No users found.</td></tr>
                  ) : users.map(u => <LeaderRow key={u.id} user={u} onInspect={setInspectLeaderId} />)}
                </tbody>
              </table>
            ) : (
              <table className='cc-table'>
                <thead>
                  <tr>
                    <th>ID</th><th>User</th><th>Phone</th><th>Level</th><th>Root Leader</th><th>Sponsor</th><th>Direct</th><th>A·B·C</th><th>Earnings</th><th>Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan='10' className='empty-table-cell'><RefreshCw size={16} /> Loading...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan='10' className='empty-table-cell'>No users found.</td></tr>
                  ) : users.map(u => (
                    <tr key={u.id}>
                      <td><span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>#{u.id}</span></td>
                      <td><div className='user-cell'><strong>{u.fullName}</strong></div></td>
                      <td><span style={{ fontSize: 12, color: '#cbd5e1' }}>{u.phone}</span></td>
                      <td><LevelBadge level={u.teamLevel} /></td>
                      <td>{u.rootLeaderName ? <span style={{ fontSize: 12, color: '#c084fc' }}>{u.rootLeaderName} <small style={{ color: '#64748b' }}>#{u.rootLeaderId}</small></span> : <span style={{ color: '#64748b', fontSize: 12 }}>—</span>}</td>
                      <td><span style={{ fontSize: 12, color: '#94a3b8' }}>{u.referrerName || '—'}</span></td>
                      <td><span className='badge-spins'>{u.directCount}</span></td>
                      <td><span style={{ fontSize: 11 }}><span style={{ color: '#4ade80' }}>{u.countA}A</span> · <span style={{ color: '#60a5fa' }}>{u.countB}B</span> · <span style={{ color: '#f472b6' }}>{u.countC}C</span></span></td>
                      <td><strong className='cash-won-text'>Rs. {fmt(u.totalEarned)}</strong></td>
                      <td><span className='plan-badge'>{u.activePlan}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button className='outline-btn' disabled={page <= 1} onClick={() => loadData(page - 1, search, filter)}>Prev</button>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Page {page} of {totalPages}</span>
              <button className='outline-btn' disabled={page >= totalPages} onClick={() => loadData(page + 1, search, filter)}>Next</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'export' && (
        <div>
          <div className='wheel-cc-card' style={{ marginBottom: 20 }}>
            <div style={{ padding: '20px 24px' }}>
              <h3 style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileSpreadsheet size={18} color='#c084fc' /> Export Daily Team Data
              </h3>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px' }}>
                Download a snapshot of all users, leader summaries, and A/B/C structure. Each export is timestamped and logged.
              </p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['xlsx', 'csv'].map(t => (
                    <button key={t} onClick={() => setExportType(t)}
                      style={{ background: exportType === t ? 'rgba(192,132,252,0.2)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (exportType === t ? '#c084fc' : 'rgba(255,255,255,0.1)'), color: exportType === t ? '#c084fc' : '#94a3b8', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase' }}>
                      {t}
                    </button>
                  ))}
                </div>
                <button className='cc-btn-green' onClick={handleExport} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 22px', height: 42, fontSize: 14 }}>
                  {exporting ? <><RefreshCw size={15} /> Generating...</> : <><Download size={15} /> Export {exportType.toUpperCase()}</>}
                </button>
              </div>
              <div style={{ marginTop: 14, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: '#94a3b8' }}>
                <strong style={{ color: '#c084fc' }}>XLSX includes 3 sheets:</strong>
                <span style={{ marginLeft: 8 }}>Sheet 1: All Users · Sheet 2: Leader Summary · Sheet 3: A/B/C Summary</span>
              </div>
            </div>
          </div>

          <div className='wheel-cc-card table-section'>
            <div className='table-header-row'>
              <div className='table-title'><h3>Export History</h3></div>
            </div>
            <div className='cc-table-container'>
              <table className='cc-table'>
                <thead>
                  <tr><th>Date</th><th>Time</th><th>Total Users</th><th>Leaders</th><th>A</th><th>B</th><th>C</th><th>Format</th></tr>
                </thead>
                <tbody>
                  {exportHistory.length === 0 ? (
                    <tr><td colSpan='8' className='empty-table-cell'>No exports yet. Click 'Export' above to generate your first snapshot.</td></tr>
                  ) : exportHistory.map(e => (
                    <tr key={e.id}>
                      <td><strong style={{ color: '#e2e8f0' }}>{e.export_date}</strong></td>
                      <td><span style={{ color: '#94a3b8', fontSize: 12 }}>{String(e.export_time).slice(0, 5)}</span></td>
                      <td><span className='badge-spins'>{e.total_users}</span></td>
                      <td>{e.total_leaders}</td>
                      <td><span style={{ color: '#4ade80', fontWeight: 700 }}>{e.count_a}</span></td>
                      <td><span style={{ color: '#60a5fa', fontWeight: 700 }}>{e.count_b}</span></td>
                      <td><span style={{ color: '#f472b6', fontWeight: 700 }}>{e.count_c}</span></td>
                      <td><span style={{ textTransform: 'uppercase', fontSize: 11, color: '#c084fc', fontWeight: 700 }}>{e.file_type}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Leader Details Full Modal with A/B/C Collapsible Breakdowns */}
      {inspectLeaderId && (
        <LeaderDetailsModal leaderId={inspectLeaderId} onClose={() => setInspectLeaderId(null)} />
      )}
    </div>
  );
}
