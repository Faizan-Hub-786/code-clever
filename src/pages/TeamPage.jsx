import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UsersRound,
  Sparkles,
  Gift,
  Share2,
  Copy,
  Check,
  TrendingUp,
  Layers3,
  ChevronRight,
  ShieldCheck,
  QrCode,
  Search,
  Receipt,
  UserCheck,
  Award,
  ExternalLink,
  MessageCircle,
  Clock,
  ArrowUpRight,
  Coins,
  Lock,
  AlertCircle
} from 'lucide-react';
import Shell from '../components/layout/Shell';
import Stat from '../components/common/Stat';
import { API_BASE_URL, getAuthHeaders } from '../api/config';
import { fmt, fmtDate } from '../utils/formatters';
import { getCachedWallet } from '../utils/walletCache';

let cachedTeamData = null;

export default function TeamPage() {
  const [team, setTeam] = useState(() => {
    if (cachedTeamData) return cachedTeamData;
    const w = getCachedWallet();
    return {
      referral_code: w.referral_code || null,
      total_members: 0,
      lifetime_commission: 0,
      level1_count: 0,
      level1_commission: 0,
      level2_count: 0,
      level2_commission: 0,
      level3_count: 0,
      level3_commission: 0,
      can_share_referral: Boolean(w.referral_code && w.plan_code && w.plan_code !== 'INTERN'),
      require_active_plan_to_refer: true,
      has_active_paid_plan: Boolean(w.plan_code && w.plan_code !== 'INTERN'),
      rates: [
        { level: 1, name: 'Level A (Direct)', code: 'A', percent: 10, description: 'Direct referrals registered with your code' },
        { level: 2, name: 'Level B (Tier 2)', code: 'B', percent: 5, description: 'Referrals invited by your Level A members' },
        { level: 3, name: 'Level C (Tier 3)', code: 'C', percent: 2, description: 'Referrals invited by your Level B members' }
      ],
      members: [],
      recent_commissions: []
    };
  });

  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'ledger' | 'rules'
  const [levelFilter, setLevelFilter] = useState('all'); // 'all' | '1' | '2' | '3'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(!cachedTeamData);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/team`, { headers: getAuthHeaders() });
        if (r.ok) {
          const d = await r.json();
          cachedTeamData = d;
          setTeam(d);
        }
      } catch (err) {
        console.error('Error fetching team data:', err);
      }
      setLoading(false);
    };
    fetchTeam();
  }, []);

  const canShare = Boolean(team.can_share_referral && team.referral_code);
  const referralUrl = canShare ? `${window.location.origin}/signup?ref=${team.referral_code}` : '';

  const copyLink = () => {
    if (!canShare || !team.referral_code) return;
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = () => {
    if (!canShare || !team.referral_code) return;
    navigator.clipboard.writeText(team.referral_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const shareWhatsApp = () => {
    if (!canShare || !team.referral_code) return;
    const text = encodeURIComponent(
      `🚀 Join Code Clever with my exclusive invitation code ${team.referral_code} and start earning daily rewards by evaluating mobile apps!\n\n👉 Register here: ${referralUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Filter members by search & level
  const filteredMembers = (team.members || []).filter((m) => {
    const matchesLevel = levelFilter === 'all' || String(m.level) === levelFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <Shell>
      <div className="team-page">
        {/* Top Hero Banner */}
        <div className="team-hero">
          <div className="team-hero-copy">
            <div className="hero-trust">
              <span><Sparkles size={13} /> 3-Generation Multi-Tier Network</span>
              <span><ShieldCheck size={13} /> Instant Balance Settlement</span>
            </div>
            <h1>
              Build Your <span>Affiliate Team</span>
            </h1>
            <p>
              Earn automated commission across 3 generations (Level A 10%, Level B 5%, Level C 2%) whenever downline members activate plans and complete tasks.
            </p>

            {/* Invitation Controls Hub */}
            {!canShare ? (
              <div className="referral-box" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '16px 20px', borderRadius: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', flexShrink: 0, marginTop: 2 }}>
                    <Lock size={18} />
                  </div>
                  <div>
                    <strong style={{ color: '#f8fafc', fontSize: 14, display: 'block', marginBottom: 4 }}>
                      Active Package Required to Generate Referral Code & Invite
                    </strong>
                    <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1', lineHeight: 1.45 }}>
                      You must activate an official earning package (Plan C1 to C9) to generate your unique referral code, unlock your invitation link, and sponsor downline members.
                    </p>
                    <div style={{ marginTop: 12 }}>
                      <NavLink to="/plans" className="gradient-btn" style={{ padding: '8px 18px', fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Sparkles size={14} /> Activate Plan to Unlock <ChevronRight size={14} />
                      </NavLink>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="referral-box">
                <div className="referral-label">
                  <span>Invitation Link & Code</span>
                  <button className="copy-code-badge" onClick={copyCode} title="Copy Referral Code">
                    {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                    Code: <b>{team.referral_code}</b>
                  </button>
                </div>
                <div className="referral-input">
                  <span className="ref-url-text">{referralUrl}</span>
                  <button onClick={copyLink}>
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    <b>{copiedLink ? 'Copied' : 'Copy Link'}</b>
                  </button>
                </div>
              </div>
            )}

            {canShare ? (
              <div className="team-actions">
                <button className="team-share-wa" onClick={shareWhatsApp}>
                  <MessageCircle size={16} /> Share on WhatsApp
                </button>
                <button className="team-qr-btn" onClick={() => setShowQR(!showQR)}>
                  <QrCode size={16} /> {showQR ? 'Hide QR' : 'Show QR'}
                </button>
                <NavLink to="/plans" className="team-plan-link">
                  Commission Plans <ChevronRight size={14} />
                </NavLink>
              </div>
            ) : (
              <div className="team-actions" style={{ marginTop: 14 }}>
                <NavLink to="/plans" className="team-plan-link" style={{ marginLeft: 0 }}>
                  View All Earning Packages <ChevronRight size={14} />
                </NavLink>
              </div>
            )}

            {showQR && (
              <motion.div
                className="team-qr-card"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                    referralUrl
                  )}`}
                  alt="Referral QR Code"
                  className="team-qr-img"
                />
                <div className="team-qr-desc">
                  <strong>Scan to Join Team</strong>
                  <p>Scan with any mobile camera to open registration with code <b>{team.referral_code}</b> prefilled.</p>
                </div>
              </motion.div>
            )}
          </div>

          <div className="team-visual">
            <div className="network-glow" />
            <div className="network-node node-main">
              <Users size={30} />
              <b>YOU</b>
            </div>
            <div className="network-node node-a">
              <UsersRound size={17} />
              <b>Level A (10%)</b>
            </div>
            <div className="network-node node-b">
              <UsersRound size={17} />
              <b>Level B (5%)</b>
            </div>
            <div className="network-node node-c">
              <UsersRound size={17} />
              <b>Level C (2%)</b>
            </div>
            <div className="network-line line-a" />
            <div className="network-line line-b" />
            <div className="network-line line-c" />
            <div className="network-particle" />
            <div className="network-particle p-b" />
          </div>
        </div>

        {/* Global Stats Grid */}
        <div className="team-stats-grid">
          <Stat icon={Users} label="Total Network" value={team.total_members} sub="Across All 3 Generations" />
          <Stat
            icon={TrendingUp}
            label="Total Commission Earned"
            value={`Rs. ${fmt(team.lifetime_commission)}`}
            sub="Auto-Credited to Balance"
          />
          <Stat
            icon={Award}
            label="Level A (Direct)"
            value={team.level1_count || 0}
            sub={`10% Rate · Rs. ${fmt(team.level1_commission || 0)}`}
          />
          <Stat
            icon={Layers3}
            label="Level B & C (Indirect)"
            value={(team.level2_count || 0) + (team.level3_count || 0)}
            sub={`5% & 2% · Rs. ${fmt((team.level2_commission || 0) + (team.level3_commission || 0))}`}
          />
        </div>

        {/* Tier Cards Breakdown (Level A, Level B, Level C) */}
        <div className="tier-cards-grid">
          {/* Level A Card */}
          <div className="tier-card tier-a">
            <div className="tier-card-head">
              <div className="tier-pill pill-a">LEVEL A · 10%</div>
              <span className="tier-badge-gen">1st Generation</span>
            </div>
            <h3>Direct Referrals</h3>
            <p>Users who register directly using your invitation link or code.</p>
            <div className="tier-stats-row">
              <div>
                <small>Members</small>
                <strong>{team.level1_count || 0}</strong>
              </div>
              <div>
                <small>Commission Earned</small>
                <strong className="tier-earn-val">Rs. {fmt(team.level1_commission || 0)}</strong>
              </div>
            </div>
          </div>

          {/* Level B Card */}
          <div className="tier-card tier-b">
            <div className="tier-card-head">
              <div className="tier-pill pill-b">LEVEL B · 5%</div>
              <span className="tier-badge-gen">2nd Generation</span>
            </div>
            <h3>Tier-2 Network</h3>
            <p>Users invited by your Level A team members across the network.</p>
            <div className="tier-stats-row">
              <div>
                <small>Members</small>
                <strong>{team.level2_count || 0}</strong>
              </div>
              <div>
                <small>Commission Earned</small>
                <strong className="tier-earn-val">Rs. {fmt(team.level2_commission || 0)}</strong>
              </div>
            </div>
          </div>

          {/* Level C Card */}
          <div className="tier-card tier-c">
            <div className="tier-card-head">
              <div className="tier-pill pill-c">LEVEL C · 2%</div>
              <span className="tier-badge-gen">3rd Generation</span>
            </div>
            <h3>Tier-3 Network</h3>
            <p>Users invited by your Level B team members across the network.</p>
            <div className="tier-stats-row">
              <div>
                <small>Members</small>
                <strong>{team.level3_count || 0}</strong>
              </div>
              <div>
                <small>Commission Earned</small>
                <strong className="tier-earn-val">Rs. {fmt(team.level3_commission || 0)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Section Tabs Switcher */}
        <div className="team-tabs-bar">
          <button
            className={`team-tab-btn ${activeTab === 'directory' ? 'active' : ''}`}
            onClick={() => setActiveTab('directory')}
          >
            <UsersRound size={17} /> Team Directory ({team.members?.length || 0})
          </button>
          <button
            className={`team-tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            <Receipt size={17} /> Commission Ledger ({team.recent_commissions?.length || 0})
          </button>
          <button
            className={`team-tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            <Coins size={17} /> Commission Policy
          </button>
        </div>

        {/* TAB 1: TEAM MEMBERS DIRECTORY */}
        {activeTab === 'directory' && (
          <div>
            <div className="team-section-top">
              <div className="team-search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search members by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="level-filter">
                {[
                  ['all', 'All Tiers'],
                  ['1', 'Level A (10%)'],
                  ['2', 'Level B (5%)'],
                  ['3', 'Level C (2%)']
                ].map(([lvl, label]) => (
                  <button
                    key={lvl}
                    className={levelFilter === lvl ? 'active' : ''}
                    onClick={() => setLevelFilter(lvl)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="member-list">
              {filteredMembers.map((m, idx) => (
                <motion.div
                  key={m.id || idx}
                  className="member-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <div className={`member-avatar lvl-${m.level}`}>
                    {(m.full_name || 'CC').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="member-info-col">
                    <b>{m.full_name}</b>
                    <small>{m.email || 'Verified Member'} · Joined {m.created_at}</small>
                  </div>
                  <div className="member-level">
                    <span>Generation</span>
                    <b className={`badge-lvl-${m.level}`}>{m.level_name}</b>
                  </div>
                  <div className="member-plan">
                    <span>Active Plan</span>
                    <b>{m.plan_code || 'Free'}</b>
                  </div>
                  <div className="member-comm">
                    <span>Commission Generated</span>
                    <strong>Rs. {fmt(m.commission_generated || 0)}</strong>
                  </div>
                </motion.div>
              ))}

              {!filteredMembers.length && (
                <div className="empty-task">
                  <UsersRound size={36} color="#c084fc" />
                  <h3>No team members found</h3>
                  <p>
                    {searchQuery
                      ? 'No results match your search query.'
                      : 'Share your invitation link to start enrolling members into your network.'}
                  </p>
                  <button className="gradient-btn mini-btn" onClick={copyLink} style={{ margin: '14px auto 0' }}>
                    {copiedLink ? 'Link Copied!' : 'Copy Invitation Link'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE COMMISSION LEDGER */}
        {activeTab === 'ledger' && (
          <div className="commission-ledger-card">
            <div className="ledger-head">
              <h3>Live Commission Accrual History</h3>
              <p>Real-time stream of all commissions credited directly to your available balance.</p>
            </div>

            {team.recent_commissions && team.recent_commissions.length > 0 ? (
              <div className="ledger-table-wrap">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Source Member</th>
                      <th>Generation</th>
                      <th>Reference</th>
                      <th>Date & Time</th>
                      <th style={{ textAlign: 'right' }}>Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.recent_commissions.map((tx, idx) => (
                      <tr key={tx.id || idx}>
                        <td>#{tx.id}</td>
                        <td>
                          <b>{tx.source_user_name}</b>
                          <small>{tx.source_user_email}</small>
                        </td>
                        <td>
                          <span className={`ledger-lvl-badge lvl-${tx.level}`}>
                            {Number(tx.level) === 1
                              ? 'Level A (10%)'
                              : Number(tx.level) === 2
                              ? 'Level B (5%)'
                              : 'Level C (2%)'}
                          </span>
                        </td>
                        <td>
                          <span className="ledger-ref-pill">
                            {tx.reference_type === 'plan_activation'
                              ? 'Plan Upgrade'
                              : tx.reference_type === 'task_reward'
                              ? 'Task Evaluation'
                              : 'Team Activity'}
                          </span>
                        </td>
                        <td>{tx.created_at}</td>
                        <td style={{ textAlign: 'right' }}>
                          <strong className="ledger-credit-amt">+Rs. {fmt(tx.amount)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-task">
                <Receipt size={36} color="#c084fc" />
                <h3>No commission transactions yet</h3>
                <p>Commissions will appear here automatically when your team members activate plans or complete daily evaluations.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: COMMISSION RULES & FAQ */}
        {activeTab === 'rules' && (
          <div className="team-rules-card">
            <h3>Multi-Tier Commission Structure & Terms</h3>
            <div className="rules-grid">
              <div className="rule-item">
                <div className="rule-num">01</div>
                <div>
                  <h4>Level A — Direct Referrals (10%)</h4>
                  <p>
                    You receive 10% commission whenever members who registered with your code upgrade their plan or complete evaluated tasks.
                  </p>
                </div>
              </div>

              <div className="rule-item">
                <div className="rule-num">02</div>
                <div>
                  <h4>Level B — 2nd Generation (5%)</h4>
                  <p>
                    You receive 5% commission whenever members invited by your Level A team members upgrade their plan or complete tasks.
                  </p>
                </div>
              </div>

              <div className="rule-item">
                <div className="rule-num">03</div>
                <div>
                  <h4>Level C — 3rd Generation (2%)</h4>
                  <p>
                    You receive 2% commission whenever members invited by your Level B team members upgrade their plan or complete tasks.
                  </p>
                </div>
              </div>

              <div className="rule-item">
                <div className="rule-num">04</div>
                <div>
                  <h4>Instant Ledger Settlement</h4>
                  <p>
                    All commission earnings are credited in real-time to your available withdrawal balance with no delay or withholding.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
