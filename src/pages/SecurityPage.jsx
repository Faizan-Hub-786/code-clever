import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  CreditCard,
  Check,
  Shield,
  HelpCircle
} from 'lucide-react';
import Shell from '../components/layout/Shell';
import PageTitle from '../components/common/PageTitle';
import Field from '../components/common/Field';
import { API_BASE_URL, getAuthHeaders } from '../api/config';

const SECURITY_QUESTIONS = [
  "What was the name of your first school?",
  "What is your childhood pet's name?",
  "In what city were you born?",
  "What is your mother's maiden name?",
  "What is your favorite dish or food?",
  "What is the name of your favorite teacher?"
];

export default function SecurityPage() {
  // Login Password Form State
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Fund Password (6-Digit PIN) State
  const [isFundSet, setIsFundSet] = useState(false);
  const [fundLoading, setFundLoading] = useState(true);
  const [fundForm, setFundForm] = useState({
    current: '',
    next: '',
    confirm: ''
  });
  const [fundSaving, setFundSaving] = useState(false);
  const [fundMsg, setFundMsg] = useState('');
  const [fundError, setFundError] = useState('');

  // Security Recovery Question State
  const [isQuestionSet, setIsQuestionSet] = useState(false);
  const [questionForm, setQuestionForm] = useState({
    question: SECURITY_QUESTIONS[0],
    answer: '',
    accountPassword: ''
  });
  const [questionSaving, setQuestionSaving] = useState(false);
  const [questionMsg, setQuestionMsg] = useState('');
  const [questionError, setQuestionError] = useState('');

  const fetchFundStatus = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/settings/fund-password-status`, {
        headers: getAuthHeaders()
      });
      if (r.ok) {
        const d = await r.json();
        setIsFundSet(Boolean(d.isSet));
      }
    } catch {}
    setFundLoading(false);
  };

  const fetchSecurityQuestion = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/settings/security-question`, {
        headers: getAuthHeaders()
      });
      if (r.ok) {
        const d = await r.json();
        setIsQuestionSet(Boolean(d.isSet));
        if (d.question) {
          setQuestionForm((prev) => ({ ...prev, question: d.question }));
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchFundStatus();
    fetchSecurityQuestion();
  }, []);

  const submitPassword = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');

    if (form.next !== form.confirm) {
      setError('New passwords do not match.');
      return;
    }
    if (form.next.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    setSaving(true);
    try {
      const r = await fetch(`${API_BASE_URL}/settings/security`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          currentPassword: form.current,
          newPassword: form.next
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Failed to update password.');
      setMsg('Your account password has been changed successfully!');
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const submitFundPassword = async (e) => {
    e.preventDefault();
    setFundMsg('');
    setFundError('');

    const pin = String(fundForm.next || '').trim();
    if (!/^\d{6}$/.test(pin)) {
      setFundError('Fund password must be exactly 6 numeric digits (0-9).');
      return;
    }
    if (fundForm.next !== fundForm.confirm) {
      setFundError('New fund passwords do not match.');
      return;
    }
    if (isFundSet && !fundForm.current) {
      setFundError('Please enter your current 6-digit fund password.');
      return;
    }

    setFundSaving(true);
    try {
      const r = await fetch(`${API_BASE_URL}/settings/fund-password`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          currentFundPassword: fundForm.current,
          newFundPassword: fundForm.next
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Failed to update fund password.');
      setFundMsg(d.message || 'Fund password saved successfully!');
      setFundForm({ current: '', next: '', confirm: '' });
      setIsFundSet(true);
    } catch (err) {
      setFundError(err.message);
    } finally {
      setFundSaving(false);
    }
  };

  const submitSecurityQuestion = async (e) => {
    e.preventDefault();
    setQuestionMsg('');
    setQuestionError('');

    const answer = String(questionForm.answer || '').trim();
    if (!answer || answer.length < 2) {
      setQuestionError('Please enter your secret answer (minimum 2 characters).');
      return;
    }

    setQuestionSaving(true);
    try {
      const r = await fetch(`${API_BASE_URL}/settings/security-question`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          question: questionForm.question,
          answer,
          accountPassword: questionForm.accountPassword
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Failed to update security question.');
      setQuestionMsg(d.message || 'Security recovery question saved successfully!');
      setQuestionForm((prev) => ({ ...prev, answer: '', accountPassword: '' }));
      setIsQuestionSet(true);
    } catch (err) {
      setQuestionError(err.message);
    } finally {
      setQuestionSaving(false);
    }
  };

  return (
    <Shell>
      <div className="security-page">
        <PageTitle
          eyebrow="SECURITY SETTINGS"
          title="Password & Security"
          text="Protect your Code Clever account and withdrawals with strong credentials."
        />

        {/* 1. Change Account Login Password */}
        <div className="security-card-v15" style={{ marginBottom: 24 }}>
          <div className="security-intro">
            <div>
              <ShieldCheck size={32} />
            </div>
            <section>
              <h2>Change Account Password</h2>
              <p>Choose a unique password that you do not use for any other service.</p>
            </section>
          </div>

          {msg && (
            <motion.div
              className="task-message"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CheckCircle2 size={18} /> {msg}
            </motion.div>
          )}
          {error && (
            <motion.div
              className="auth-error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle size={18} /> {error}
            </motion.div>
          )}

          <form onSubmit={submitPassword} className="password-grid" autoComplete="off" data-lpignore="true">
            {/* Decoy inputs to defeat aggressive browser password managers */}
            <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
            <input type="password" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

            <Field
              icon={KeyRound}
              type="password"
              name="old_security_pwd"
              autoComplete="new-password"
              placeholder="Current Password"
              value={form.current}
              onChange={(v) => setForm((x) => ({ ...x, current: v }))}
            />
            <Field
              icon={Lock}
              type="password"
              name="new_security_pwd"
              autoComplete="new-password"
              placeholder="New Password (min 8 chars)"
              value={form.next}
              onChange={(v) => setForm((x) => ({ ...x, next: v }))}
            />
            <Field
              icon={ShieldCheck}
              type="password"
              name="confirm_security_pwd"
              autoComplete="new-password"
              placeholder="Confirm New Password"
              value={form.confirm}
              onChange={(v) => setForm((x) => ({ ...x, confirm: v }))}
            />

            <button
              type="submit"
              className="gradient-btn"
              disabled={saving}
              style={{ width: '100%', marginTop: '14px' }}
            >
              {saving ? (
                <>
                  <RefreshCw className="spin" size={16} /> Updating Password…
                </>
              ) : (
                <>
                  <Lock size={18} /> Update Password
                </>
              )}
            </button>
          </form>
        </div>

        {/* 2. Set / Change Fund Password (6-Digit Security PIN) */}
        <div className="security-card-v15" style={{ marginBottom: 24 }}>
          <div className="security-intro">
            <div style={{ background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc' }}>
              <CreditCard size={32} />
            </div>
            <section style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <h2 style={{ margin: 0 }}>
                  {isFundSet ? 'Change Fund Password' : 'Set Up Fund Password'}
                </h2>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: 20,
                  background: isFundSet ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: isFundSet ? '#4ade80' : '#f87171',
                  border: `1px solid ${isFundSet ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                  {isFundSet ? 'PIN CONFIGURED' : 'PIN NOT SET'}
                </span>
              </div>
              <p style={{ marginTop: 4 }}>
                {isFundSet
                  ? 'Update your 6-digit transaction PIN required to authorize wallet withdrawals.'
                  : 'Create a 6-digit security PIN to protect your cashout requests and withdrawals.'}
              </p>
            </section>
          </div>

          {fundMsg && (
            <motion.div
              className="task-message"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CheckCircle2 size={18} /> {fundMsg}
            </motion.div>
          )}
          {fundError && (
            <motion.div
              className="auth-error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle size={18} /> {fundError}
            </motion.div>
          )}

          <form onSubmit={submitFundPassword} className="password-grid" autoComplete="off" data-lpignore="true">
            {/* Decoy inputs */}
            <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
            <input type="password" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

            {isFundSet && (
              <Field
                icon={KeyRound}
                type="password"
                maxLength={6}
                name="cur_fund_pin_val"
                autoComplete="new-password"
                placeholder="Current 6-Digit Fund Password"
                value={fundForm.current}
                onChange={(v) => setFundForm((x) => ({ ...x, current: v.replace(/\D/g, '').slice(0, 6) }))}
              />
            )}
            <Field
              icon={Lock}
              type="password"
              maxLength={6}
              name="new_fund_pin_val"
              autoComplete="new-password"
              placeholder="New 6-Digit Fund PIN (0-9)"
              value={fundForm.next}
              onChange={(v) => setFundForm((x) => ({ ...x, next: v.replace(/\D/g, '').slice(0, 6) }))}
            />
            <Field
              icon={Shield}
              type="password"
              maxLength={6}
              name="confirm_fund_pin_val"
              autoComplete="new-password"
              placeholder="Confirm 6-Digit Fund PIN"
              value={fundForm.confirm}
              onChange={(v) => setFundForm((x) => ({ ...x, confirm: v.replace(/\D/g, '').slice(0, 6) }))}
            />

            <button
              type="submit"
              className="gradient-btn"
              disabled={fundSaving}
              style={{
                width: '100%',
                marginTop: '14px',
                background: isFundSet
                  ? 'linear-gradient(135deg, #a855f7, #6366f1)'
                  : 'linear-gradient(135deg, #10b981, #059669)'
              }}
            >
              {fundSaving ? (
                <>
                  <RefreshCw className="spin" size={16} /> Saving Fund Password…
                </>
              ) : (
                <>
                  <CreditCard size={18} /> {isFundSet ? 'Update Fund Password' : 'Set Fund Password'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* 3. Set / Update Security Recovery Question */}
        <div className="security-card-v15">
          <div className="security-intro">
            <div style={{ background: 'rgba(203, 78, 255, 0.15)', color: '#cb4eff' }}>
              <HelpCircle size={32} />
            </div>
            <section style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <h2 style={{ margin: 0 }}>
                  {isQuestionSet ? 'Security Recovery Question' : 'Set Up Security Question'}
                </h2>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: 20,
                  background: isQuestionSet ? 'rgba(74, 222, 128, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                  color: isQuestionSet ? '#4ade80' : '#facc15',
                  border: `1px solid ${isQuestionSet ? 'rgba(74, 222, 128, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`
                }}>
                  {isQuestionSet ? 'QUESTION CONFIGURED' : 'NOT CONFIGURED'}
                </span>
              </div>
              <p style={{ marginTop: 4 }}>
                Set your secret question and answer to verify ownership and recover access if you ever forget your password.
              </p>
            </section>
          </div>

          {questionMsg && (
            <motion.div
              className="task-message"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CheckCircle2 size={18} /> {questionMsg}
            </motion.div>
          )}
          {questionError && (
            <motion.div
              className="auth-error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle size={18} /> {questionError}
            </motion.div>
          )}

          <form onSubmit={submitSecurityQuestion} className="password-grid" autoComplete="off" data-lpignore="true">
            {/* Decoy inputs to defeat aggressive browser password managers from autofilling into question answer */}
            <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
            <input type="password" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '11px', color: '#a69db2', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px', display: 'block' }}>
                Select Secret Security Question
              </label>
              <div style={{ height: '48px', background: '#0e071f', border: '1px solid #362052', borderRadius: '12px', display: 'flex', alignItems: 'center', padding: '0 10px' }}>
                <select
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, question: e.target.value }))}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {SECURITY_QUESTIONS.map((q) => (
                    <option key={q} value={q} style={{ background: '#120b1f', color: '#fff' }}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Field
              icon={ShieldCheck}
              type="text"
              name="secret_recovery_answer_entry"
              autoComplete="off"
              placeholder="Your Secret Security Answer"
              value={questionForm.answer}
              onChange={(v) => setQuestionForm((x) => ({ ...x, answer: v }))}
            />

            <Field
              icon={Lock}
              type="password"
              name="auth_confirm_pwd_entry"
              autoComplete="new-password"
              placeholder="Account Password (For Authorization)"
              value={questionForm.accountPassword}
              onChange={(v) => setQuestionForm((x) => ({ ...x, accountPassword: v }))}
            />

            <button
              type="submit"
              className="gradient-btn"
              disabled={questionSaving}
              style={{
                width: '100%',
                marginTop: '14px',
                gridColumn: '1 / -1',
                background: 'linear-gradient(135deg, #7c18eb, #ce2bff)'
              }}
            >
              {questionSaving ? (
                <>
                  <RefreshCw className="spin" size={16} /> Saving Security Question…
                </>
              ) : (
                <>
                  <HelpCircle size={18} /> {isQuestionSet ? 'Update Security Question' : 'Save Security Question'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </Shell>
  );
}
