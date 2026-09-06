import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  MessageSquare,
  Send,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  Minus,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Headphones,
  Image as ImageIcon,
  Camera,
  X,
  Eye,
  Video,
  PlayCircle,
  KeyRound,
  UserCheck,
  Bot
} from 'lucide-react';
import Shell from '../components/layout/Shell';
import { API_BASE_URL, getAuthHeaders } from '../api/config';

const FAQS = [
  {
    id: 1,
    q: 'How do I complete a task?',
    a: 'Go to the Tasks section from your dashboard, select an active task, and click "Download App". The system will execute an automated 5-second verification pipeline (Start ➔ Download ➔ Install ➔ Complete ➔ Reward). Upon completion, your reward is credited instantly to your personal wallet.'
  },
  {
    id: 2,
    q: 'How do I withdraw my earnings?',
    a: 'Navigate to the Withdraw page, select your preferred withdrawal wallet (Personal or Commission), choose your saved mobile account (JazzCash, Easypaisa, SadaPay, or NayaPay), enter your withdrawal amount, enter your 6-digit fund password, and click Submit.'
  },
  {
    id: 3,
    q: 'How are referral commissions calculated?',
    a: 'Code Clever distributes dynamic tier-based commissions across 3 network levels: Level 1 (12%), Level 2 (4%), and Level 3 (2%) on every task completed by your referred members, plus First Deposit Management bonuses.'
  },
  {
    id: 4,
    q: 'How does the 3-day Intern trial work?',
    a: 'Every newly registered member receives a 3-day introductory trial package with active daily task allocations so you can test app evaluations and experience instantaneous ledger rewards.'
  },
  {
    id: 5,
    q: 'When are deposit and withdrawal requests processed?',
    a: 'Deposit verifications and payout disbursements operate 24/7. Most submissions are verified within 5 to 30 minutes after submitting your Transaction Reference ID (TID) or payout request.'
  }
];

export default function SupportPage() {
  const nav = useNavigate();
  const fileInputRef = useRef(null);
  const [category, setCategory] = useState('General Inquiry');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [previewModalImg, setPreviewModalImg] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [dailyQuota, setDailyQuota] = useState({ dailyUsed: 0, dailyLimit: 1, remaining: 1 });

  const [expandedFaq, setExpandedFaq] = useState(1);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadInquiries = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/support/inquiries`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d)) {
          setInquiries(d);
        } else if (d && d.list) {
          setInquiries(d.list);
          const limit = d.dailyLimit || 1;
          const used = d.dailyUsed || 0;
          setDailyQuota({
            dailyUsed: used,
            dailyLimit: limit,
            remaining: d.remaining !== undefined ? d.remaining : Math.max(0, limit - used)
          });
        }
      }
    } catch {}
  };

  useEffect(() => {
    loadInquiries();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Screenshot too large. Maximum file size is 5MB.');
      return;
    }
    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachment('');
    setAttachmentName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitInquiry = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (dailyQuota.remaining <= 0) {
      setErrorMsg('Daily limit reached (4/4 messages used today). You can send more inquiries tomorrow.');
      return;
    }

    if (!message.trim()) {
      setErrorMsg('Please describe your inquiry before submitting.');
      return;
    }

    setLoading(true);
    try {
      const r = await fetch(`${API_BASE_URL}/support/inquiries`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          category,
          message: message.trim(),
          attachment: attachment || null
        })
      });
      const d = await r.json();
      if (r.ok) {
        setSuccessMsg('Your inquiry and screenshot have been submitted to Administration.');
        setMessage('');
        removeAttachment();
        loadInquiries();
      } else {
        setErrorMsg(d.message || 'Failed to submit inquiry.');
      }
    } catch {
      setErrorMsg('Unable to connect to support desk server.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <Shell>
      <div className="support-v2-page">
        {/* Top Header Bar */}
        <div className="deposit-top-bar">
          <div className="deposit-top-left">
            <button className="deposit-back-btn" onClick={() => nav(-1)} title="Back">
              <ChevronLeft size={22} />
            </button>
            <div className="deposit-brand">
              <img src="/assets/logo.jpeg" alt="Code Clever" />
              <span>CODE CLEVER</span>
            </div>
          </div>
          <div className="wallet-top-pill">
            <Headphones size={18} color="#c45eff" />
            <div>
              <span>Support Desk</span>
              <strong>24/7 Online</strong>
            </div>
          </div>
        </div>

        {/* Page Title */}
        <div style={{ margin: '18px 0 20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HelpCircle size={26} color="#c45eff" /> Help & Support
          </h1>
          <p style={{ color: '#8e879f', fontSize: '13px', margin: 0 }}>
            Official community channels & direct in-app support
          </p>
        </div>

        {/* 1. Official WhatsApp Channel Card */}
        <div className="whatsapp-channel-card">
          <div className="whatsapp-left">
            <div className="whatsapp-icon-circle">
              <MessageSquare size={24} />
            </div>
            <div>
              <strong>Official WhatsApp Channel</strong>
              <p>Join for daily announcements, bonuses & alerts</p>
            </div>
          </div>
          <button
            type="button"
            className="join-whatsapp-btn"
            onClick={() => window.open('https://whatsapp.com/channel/0029VbDvBwe1NCrU5GW09A0I', '_blank')}
          >
            Join <ExternalLink size={14} />
          </button>
        </div>

        {/* Notification Alerts */}
        {successMsg && (
          <motion.div
            className="task-message"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '20px' }}
          >
            <CheckCircle2 size={18} /> {successMsg}
          </motion.div>
        )}

        {errorMsg && (
          <motion.div
            className="auth-error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '20px' }}
          >
            <AlertCircle size={18} /> {errorMsg}
          </motion.div>
        )}

        {/* 2. Submit Support Inquiry Card */}
        <div className="support-card-container">
          <div className="support-card-head">
            <h3>
              <Send size={18} color="#cb4eff" /> Submit Support Inquiry
            </h3>
            <p>
              Have a question about your account, task rewards, or deposits? Send your query directly to our support team.
            </p>
          </div>

          {/* Daily Quota Indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '10px 14px', background: 'rgba(203, 78, 255, 0.08)', borderRadius: 12, border: '1px solid rgba(203, 78, 255, 0.25)' }}>
            <span style={{ fontSize: '12.5px', color: '#cb4eff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageSquare size={14} /> Daily Message Quota:
            </span>
            <span style={{ fontSize: '12px', color: dailyQuota.remaining > 0 ? '#4ade80' : '#f87171', fontWeight: 800 }}>
              {dailyQuota.dailyUsed}/{dailyQuota.dailyLimit || 1} used ({dailyQuota.remaining} remaining today)
            </span>
          </div>

          <form onSubmit={handleSubmitInquiry}>
            <label className="field-label" style={{ fontSize: '11px', color: '#a69db2', display: 'block', textTransform: 'uppercase' }}>
              Inquiry Category
            </label>
            <select
              className="support-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>General Inquiry</option>
              <option>Deposit & Payment Verification</option>
              <option>Withdrawal Settlement</option>
              <option>Task Evaluation & Rewards</option>
              <option>Account & Security</option>
              <option>Team & Referral Bonus</option>
            </select>

            <label className="field-label" style={{ fontSize: '11px', color: '#a69db2', display: 'block', textTransform: 'uppercase', marginTop: '16px' }}>
              Message / Details
            </label>
            <textarea
              required
              className="support-textarea"
              placeholder="Describe your inquiry in detail so we can assist you..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            {/* Screenshot Attachment */}
            <div style={{ marginTop: '14px' }}>
              <label className="field-label" style={{ fontSize: '11px', color: '#a69db2', display: 'block', textTransform: 'uppercase', marginBottom: '6px' }}>
                Attach Screenshot (Optional)
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              {!attachment ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    fontSize: '12px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(203, 78, 255, 0.3)',
                    color: '#e9d5ff',
                    borderRadius: 10,
                    cursor: 'pointer'
                  }}
                >
                  <Camera size={16} color="#cb4eff" /> Attach Screenshot (PNG / JPG / Max 5MB)
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'rgba(203, 78, 255, 0.12)', borderRadius: 10, border: '1px solid rgba(203, 78, 255, 0.35)' }}>
                  <img
                    src={attachment}
                    alt="Screenshot attachment"
                    style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid #cb4eff', cursor: 'pointer' }}
                    onClick={() => setPreviewModalImg(attachment)}
                    title="Click to preview screenshot"
                  />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600, display: 'block' }}>
                      {attachmentName || 'Screenshot attached'}
                    </span>
                    <small style={{ color: '#4ade80', fontSize: '10.5px' }}>✓ Ready to upload with inquiry</small>
                  </div>
                  <button
                    type="button"
                    onClick={removeAttachment}
                    style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', borderRadius: 8, padding: '4px 8px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <X size={12} /> Remove
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="gradient-btn"
              disabled={loading || dailyQuota.remaining <= 0}
              style={{ width: '100%', height: '48px', justifyContent: 'center', fontSize: '14.5px', marginTop: '18px' }}
            >
              {loading ? (
                <>
                  <RefreshCw className="spin" size={18} /> Sending Inquiry…
                </>
              ) : dailyQuota.remaining <= 0 ? (
                `Daily Quota Reached (${dailyQuota.dailyLimit || 1}/${dailyQuota.dailyLimit || 1} Used Today)`
              ) : (
                <>
                  <Send size={16} /> Send Inquiry to Admin
                </>
              )}
            </button>
          </form>
        </div>

        {/* 3. My Inquiries & Admin Replies Card */}
        <div className="support-card-container">
          <div className="support-card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3>
                <Clock size={18} color="#cb4eff" /> My Inquiries & Admin Replies
              </h3>
              <p>Track responses to your submitted tickets.</p>
            </div>
            <button
              type="button"
              className="text-btn"
              style={{ color: '#cb4eff', background: 'transparent', border: 0, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12.5px' }}
              onClick={() => {
                loadInquiries();
                setSuccessMsg('Inquiry ledger synced.');
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <div>
            {inquiries.length > 0 ? (
              inquiries.map((inq, idx) => {
                const isPending = inq.status?.toLowerCase().includes('pending');
                return (
                  <motion.div
                    key={inq.id || idx}
                    className="inquiry-item-row"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="inquiry-item-top">
                      <b>{inq.category}</b>
                      <span className={`deposit-status-pill ${isPending ? 'pending' : 'approved'}`} style={{ fontSize: '10.5px' }}>
                        {inq.status}
                      </span>
                    </div>
                    <p className="inquiry-item-msg">{inq.message}</p>

                    {/* Attached Screenshot Thumbnail */}
                    {(inq.attachmentUrl || inq.attachment_url) && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img
                          src={inq.attachmentUrl || inq.attachment_url}
                          alt="Attached proof"
                          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid #7c18eb', cursor: 'pointer' }}
                          onClick={() => setPreviewModalImg(inq.attachmentUrl || inq.attachment_url)}
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewModalImg(inq.attachmentUrl || inq.attachment_url)}
                          style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: '11.5px', textDecoration: 'underline', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Eye size={13} /> View Attached Screenshot
                        </button>
                      </div>
                    )}

                    <span style={{ fontSize: '11px', color: '#7e778f', marginTop: 4, display: 'block' }}>
                      Ticket #{inq.id} • {inq.date}
                    </span>

                    {inq.reply && (
                      <div className="inquiry-admin-reply">
                        <small>🛡️ Support Team Response:</small>
                        <p>{inq.reply}</p>
                      </div>
                    )}
                  </motion.div>
                );
              })
            ) : (
              <div className="empty-task" style={{ padding: '30px 20px' }}>
                <CheckCircle2 size={32} />
                <p>No support inquiries submitted yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* 3.5. Official WhatsApp Video Guide Channel (Added directly below Inquiry section) */}
        <div
          className="support-card-container"
          style={{
            background: 'linear-gradient(135deg, rgba(20, 83, 45, 0.25), rgba(15, 23, 42, 0.95))',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            boxShadow: '0 12px 30px -10px rgba(34, 197, 94, 0.25)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.5)', padding: '4px 10px', borderRadius: '20px', color: '#4ade80', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                <Video size={13} /> Official WhatsApp Video Guides
              </div>
              <h3 style={{ fontSize: '20px', color: '#ffffff', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlayCircle size={22} color="#22c55e" /> Member Step-by-Step Video Channel
              </h3>
              <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0, maxWidth: '640px', lineHeight: 1.5 }}>
                This channel is specifically designed to guide every member through visual video demonstrations. Learn everything from account setup to instant withdrawals.
              </p>
            </div>

            <a
              href="https://whatsapp.com/channel/0029VbDfDEI4IBhBAAWEJG2M"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '13px',
                textDecoration: 'none',
                boxShadow: '0 6px 16px rgba(34, 197, 94, 0.4)',
                transition: 'transform 0.15s ease'
              }}
            >
              <ExternalLink size={16} /> Open Video Channel
            </a>
          </div>

          {/* Video Topics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginTop: '18px' }}>
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.2)', display: 'grid', placeItems: 'center', color: '#4ade80' }}>
                <UserCheck size={18} />
              </div>
              <div>
                <strong style={{ fontSize: '13px', color: '#f8fafc', display: 'block' }}>How to Register Account</strong>
                <small style={{ color: '#94a3b8', fontSize: '11px' }}>Invitation code & signup rules</small>
              </div>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.2)', display: 'grid', placeItems: 'center', color: '#60a5fa' }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <strong style={{ fontSize: '13px', color: '#f8fafc', display: 'block' }}>How to Login</strong>
                <small style={{ color: '#94a3b8', fontSize: '11px' }}>Credential entry & session security</small>
              </div>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.2)', display: 'grid', placeItems: 'center', color: '#facc15' }}>
                <KeyRound size={18} />
              </div>
              <div>
                <strong style={{ fontSize: '13px', color: '#f8fafc', display: 'block' }}>How to Reset Password</strong>
                <small style={{ color: '#94a3b8', fontSize: '11px' }}>Security question & temporary PIN</small>
              </div>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.2)', display: 'grid', placeItems: 'center', color: '#c084fc' }}>
                <Bot size={18} />
              </div>
              <div>
                <strong style={{ fontSize: '13px', color: '#f8fafc', display: 'block' }}>How to Chat in Bot</strong>
                <small style={{ color: '#94a3b8', fontSize: '11px' }}>24/7 AI assist & ticket pinning</small>
              </div>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(236, 72, 153, 0.2)', display: 'grid', placeItems: 'center', color: '#f472b6' }}>
                <Headphones size={18} />
              </div>
              <div>
                <strong style={{ fontSize: '13px', color: '#f8fafc', display: 'block' }}>How to Use Help & Support</strong>
                <small style={{ color: '#94a3b8', fontSize: '11px' }}>Inquiries & screenshot attachments</small>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              🎥 All video guides are updated continuously as new features are released.
            </span>
            <a
              href="https://whatsapp.com/channel/0029VbDfDEI4IBhBAAWEJG2M"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4ade80', fontSize: '12.5px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
            >
              https://whatsapp.com/channel/0029VbDfDEI4IBhBAAWEJG2M <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Screenshot Lightbox Modal */}
        <AnimatePresence>
          {previewModalImg && (
            <div className="admin-modal-backdrop" onClick={() => setPreviewModalImg(null)}>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                style={{ maxWidth: '90vw', maxHeight: '90vh', background: '#120b1f', padding: '16px', borderRadius: '16px', border: '1px solid #a83dff', position: 'relative' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setPreviewModalImg(null)}
                  style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.7)', border: '1px solid #fff', borderRadius: '50%', color: '#fff', width: 30, height: 30, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
                <img
                  src={previewModalImg}
                  alt="Screenshot full view"
                  style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 4. Frequently Asked Questions (FAQ) Accordion */}
        <div className="support-card-container">
          <div className="support-card-head">
            <h3>
              <HelpCircle size={18} color="#cb4eff" /> Frequently Asked Questions
            </h3>
            <p>Quick answers to common questions about Code Clever.</p>
          </div>

          <div>
            {FAQS.map((faq) => {
              const isOpen = expandedFaq === faq.id;
              return (
                <div key={faq.id} className="faq-accordion-item">
                  <button
                    type="button"
                    className="faq-question-btn"
                    onClick={() => toggleFaq(faq.id)}
                  >
                    <span>{faq.q}</span>
                    <div className="faq-toggle-icon">
                      {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        className="faq-answer-panel"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Shell>
  );
}
