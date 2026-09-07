import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Lock,
  LockKeyhole,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  QrCode,
  Shield,
  Wrench,
  Power,
  X,
  KeyRound,
  Send,
  MessageSquare,
  FileText,
  ShieldAlert,
  HelpCircle,
  Check,
  Zap
} from 'lucide-react';
import { API_BASE_URL } from '../api/config';
import { setCachedWallet } from '../utils/walletCache';
import AuthChatBot from '../components/auth/AuthChatBot';
import SpiderWebCaptcha from '../components/auth/SpiderWebCaptcha';
import AltchaWidget from '../components/common/AltchaWidget';

const SECURITY_QUESTIONS = [
  "What is your childhood pet's name?",
  "In what city were you born?",
  "What was the name of your first school?",
  "What is your mother's maiden name?",
  "What is your favorite dish or food?",
  "What is the name of your favorite teacher?"
];

export default function AuthPage({ mode = 'login' }) {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const isSignup = mode === 'signup';
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [altchaPayload, setAltchaPayload] = useState('');
  const [altchaKey, setAltchaKey] = useState(0);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    referral: '',
    code: ''
  });
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [activeCaptcha, setActiveCaptcha] = useState('');
  const [error, setError] = useState('');

  // Maintenance Mode Detection State
  const [isMaintenance, setIsMaintenance] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = identifier lookup, 2 = answer security question
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotQuestion, setForgotQuestion] = useState('');
  const [forgotAnswer, setForgotAnswer] = useState('');
  const [forgotNote, setForgotNote] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [chatTrigger, setChatTrigger] = useState(null);

  // Terms & Privacy Modals State
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Live Invitation Code Verification State
  const [sponsorStatus, setSponsorStatus] = useState('idle'); // 'idle' | 'checking' | 'valid' | 'invalid'
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorError, setSponsorError] = useState('');

  // Check Maintenance mode from backend
  useEffect(() => {
    fetch(`${API_BASE_URL}/site-settings`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => {
        if (d && d.maintenance_mode === true) {
          setIsMaintenance(true);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-read referral from URL query ?ref=...
  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam) {
      const cleanRef = refParam.trim().toUpperCase();
      setForm((prev) => ({ ...prev, referral: cleanRef }));
      verifyCode(cleanRef);
    }
  }, [searchParams]);

  const verifyCode = async (codeToVerify) => {
    const code = String(codeToVerify || '').trim().toUpperCase();
    if (!code) {
      setSponsorStatus('idle');
      setSponsorName('');
      setSponsorError('');
      return;
    }

    setSponsorStatus('checking');
    setSponsorError('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-invitation/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setSponsorStatus('valid');
        setSponsorName(data.sponsorName);
        setSponsorError('');
      } else {
        setSponsorStatus('invalid');
        setSponsorName('');
        setSponsorError(data.message || 'Invalid or unverified invitation code.');
      }
    } catch (e) {
      setSponsorStatus('invalid');
      setSponsorError('Unable to verify invitation code with server.');
    }
  };

  const handleReferralChange = (val) => {
    const code = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setForm((prev) => ({ ...prev, referral: code }));
    if (code.length >= 3) {
      verifyCode(code);
    } else {
      setSponsorStatus('idle');
      setSponsorName('');
      setSponsorError('');
    }
  };

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (isSignup) {
      if (form.password !== form.confirm) {
        setError('Passwords do not match.');
        return;
      }

      // STRICT INVITATION CODE VALIDATION
      const cleanRef = form.referral.trim().toUpperCase();
      if (!cleanRef) {
        setError('Invitation Code is strictly required to register an account.');
        return;
      }
      // Check SpiderWeb Security Captcha
      const expectedCaptcha = String(activeCaptcha || '').replace(/\s+/g, '').toUpperCase();
      const inputCaptcha = String(form.code || '').replace(/\s+/g, '').toUpperCase();
      if (!inputCaptcha || inputCaptcha !== expectedCaptcha) {
        setError('Incorrect verification code (CAPTCHA). Please enter the characters shown in the security image.');
        return;
      }

      // Validate phone format on signup
      const cleanPhone = form.phone.replace(/[\s\-\(\)]/g, '').trim();
      if (!cleanPhone || cleanPhone.length < 9) {
        setError('Please enter a valid mobile phone number (min 10 digits).');
        return;
      }

      if (!agreeTerms) {
        setError('You must accept the Terms & Conditions and Privacy Policy.');
        return;
      }
      if (!altchaPayload) {
        setError('Please complete the human verification before registering.');
        return;
      }
    }

    setLoading(true);
    setNameSuggestions([]);
    try {
      const endpoint = isSignup ? 'register' : 'login';
      const body = isSignup
        ? {
            fullName: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            password: form.password,
            referralCode: form.referral.trim().toUpperCase(),
            altchaPayload
          }
        : {
            email: form.email.trim(),
            password: form.password
          };

      const r = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      let d = {};
      try {
        d = await r.json();
      } catch {
        throw new Error(`Server returned unexpected format (Status ${r.status}). Please verify API connection.`);
      }

      if (r.status === 503 || d.maintenance) {
        setIsMaintenance(true);
        throw new Error(d.message || 'Code Clever is currently under scheduled maintenance.');
      }

      if (!r.ok) {
        if (d.suggestions && Array.isArray(d.suggestions)) {
          setNameSuggestions(d.suggestions);
        }
        throw new Error(d.message || 'Authentication failed.');
      }

      if (d.token) {
        sessionStorage.setItem('cc_token', d.token);
      }
      if (d.user) {
        sessionStorage.setItem('cc_user', JSON.stringify(d.user));
      }
      if (d.wallet) {
        setCachedWallet({
          ...d.wallet,
          user_name: d.user?.full_name || d.user?.name || '',
          referral_code: d.user?.referral_code || d.user?.referralCode || '',
          plan_code: d.plan?.code || 'INTERN',
          plan_name: d.plan?.name || 'Internship (3-Day Free Trial)'
        });
      }
      nav('/home');
    } catch (err) {
      setError(err.message || 'Unable to connect to the server.');
      if (isSignup) {
        // ALTCHA challenges are single-use; give the member a fresh challenge
        // when registration did not complete.
        setAltchaPayload('');
        setAltchaKey((key) => key + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotLookup = async (e) => {
    e.preventDefault();
    setForgotError('');

    const target = forgotEmail.trim();
    if (!target) {
      setForgotError('Please enter your registered email address or mobile phone number.');
      return;
    }

    setForgotLoading(true);
    try {
      const r = await fetch(`${API_BASE_URL}/auth/get-security-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: target })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'No registered account found with this email or phone.');

      setForgotQuestion(d.question || 'What is your registered secret answer?');
      setForgotEmail(d.email || target);
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.message || 'Unable to look up account.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotVerifyAndSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');

    const targetEmail = forgotEmail.trim();
    const answer = forgotAnswer.trim();
    if (!targetEmail) {
      setForgotError('Please enter your registered email or phone.');
      return;
    }
    if (!answer) {
      setForgotError('Please enter the answer to your security question.');
      return;
    }

    const note = forgotNote.trim();
    const guestToken = localStorage.getItem('cc_guest_chat_token') || ('CC-' + Math.random().toString(36).slice(2, 8).toUpperCase());
    localStorage.setItem('cc_guest_chat_token', guestToken);

    setForgotLoading(true);
    try {
      const r = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          securityAnswer: answer,
          note,
          sessionToken: guestToken
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Security verification failed.');

      setShowForgotModal(false);
      setForgotStep(1);
      setForgotEmail('');
      setForgotQuestion('');
      setForgotAnswer('');
      setForgotNote('');

      // Auto-open chatbot with verified inquiry
      setChatTrigger({
        text: `🔑 Verified Password Reset Request for account "${targetEmail}". (Security Answer Verified ✅). Note: ${note || 'Please assist with password reset.'}`,
        email: targetEmail
      });
    } catch (err) {
      setForgotError(err.message || 'Security verification failed.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="auth-futuristic-page">
      {/* Receding 3D Neon Horizon Grid Background */}
      <div className="cyber-horizon-grid">
        <div className="cyber-grid-plane" />
        <div className="cyber-horizon-glow" />
        <div className="cyber-circuit-left" />
        <div className="cyber-circuit-right" />
      </div>

      <motion.div
        className="auth-futuristic-shell"
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        {/* Top 3D Metallic Emblem & Branding */}
        <div className="cyber-brand-header">
          <div className="cyber-logo-wrap">
            <img src="/assets/logo.jpeg" alt="Code Clever" className="cyber-logo-img" />
          </div>
          <h2 className="cyber-brand-text">CODE CLEVER</h2>
        </div>

        {/* ----------------- MAINTENANCE SCREEN ----------------- */}
        {isMaintenance ? (
          <div className="cyber-auth-card">
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '24px',
                background: 'linear-gradient(145deg, rgba(249,115,22,0.2), rgba(16,6,36,0.9))',
                border: '2px solid #f97316',
                display: 'grid',
                placeItems: 'center',
                color: '#f97316',
                margin: '0 auto 16px',
                boxShadow: '0 0 35px rgba(249, 115, 22, 0.35)'
              }}
            >
              <Wrench size={38} />
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)', padding: '4px 14px', borderRadius: 99, marginBottom: 12 }}>
              <Power size={13} color="#fb923c" />
              <span style={{ fontSize: 11.5, fontWeight: 800, color: '#fb923c', letterSpacing: 0.5 }}>
                SYSTEM MAINTENANCE ACTIVE
              </span>
            </div>

            <h1 style={{ fontSize: '22px', margin: '0 0 10px', color: '#fff', fontWeight: 800, textAlign: 'center' }}>
              Platform Under Scheduled Maintenance
            </h1>

            <p style={{ color: '#cbd5e1', fontSize: '13.5px', lineHeight: 1.6, margin: '0', textAlign: 'center' }}>
              Code Clever is currently undergoing scheduled infrastructure upgrades. Public member access is temporarily paused. Please check back shortly.
            </p>
          </div>
        ) : (
          /* ----------------- LOGIN / REGISTER MAIN CARD ----------------- */
          <div className="cyber-auth-card">
            {/* Top Shield Emblem for Welcome Back */}
            {!isSignup && (
              <div className="cyber-card-shield-badge">
                <div className="cyber-shield-inner">
                  <Shield size={24} />
                  <Lock size={12} className="shield-lock-icon" />
                </div>
              </div>
            )}

            {/* Heading */}
            <div className="cyber-card-head">
              <h1 className="cyber-card-title">{isSignup ? 'Create Your Account' : 'Welcome Back'}</h1>
              <div className="cyber-title-glow-line" />
            </div>

            {error && (
              <div className="cyber-auth-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Suggested Names Box */}
            {isSignup && nameSuggestions.length > 0 && (
              <div
                style={{
                  background: 'rgba(203, 78, 255, 0.12)',
                  border: '1px solid rgba(203, 78, 255, 0.35)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  marginBottom: '14px'
                }}
              >
                <span style={{ fontSize: '11.5px', color: '#df65ff', fontWeight: 800, display: 'block', marginBottom: '6px' }}>
                  💡 Available Unique Name Suggestions (Click to apply):
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {nameSuggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      style={{
                        background: 'linear-gradient(135deg, rgba(203,78,255,0.3), rgba(120,40,180,0.5))',
                        border: '1px solid #cb4eff',
                        color: '#ffffff',
                        padding: '5px 14px',
                        borderRadius: '99px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                      onClick={() => {
                        set('name')(sug);
                        setNameSuggestions([]);
                        setError('');
                      }}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={submit} className="cyber-auth-form" autoComplete="off" data-lpignore="true">
              {/* Decoy inputs to block browser aggressive auto-fill */}
              <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
              <input type="password" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

              {/* Full Name (Signup Only) */}
              {isSignup && (
                <div className="cyber-input-wrap">
                  <User size={18} className="cyber-field-icon" />
                  <input
                    type="text"
                    required
                    name="auth_full_name_entry"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="words"
                    spellCheck="false"
                    data-lpignore="true"
                    data-form-type="other"
                    placeholder="Full Name (Unique)"
                    value={form.name}
                    onChange={(e) => {
                      set('name')(e.target.value);
                      if (nameSuggestions.length > 0) setNameSuggestions([]);
                    }}
                  />
                </div>
              )}

              {/* Email / Username */}
              <div className="cyber-input-wrap">
                {isSignup ? (
                  <Mail size={18} className="cyber-field-icon" />
                ) : (
                  <User size={18} className="cyber-field-icon" />
                )}
                <input
                  type={isSignup ? 'email' : 'text'}
                  required
                  name="auth_email_user_entry"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  data-lpignore="true"
                  data-form-type="other"
                  placeholder={isSignup ? 'Email Address' : 'Email / Username'}
                  value={form.email}
                  onChange={(e) => set('email')(e.target.value)}
                />
              </div>

              {/* Mobile Phone Number (Signup Only) */}
              {isSignup && (
                <div className="cyber-input-wrap">
                  <Phone size={18} className="cyber-field-icon" />
                  <input
                    type="tel"
                    required
                    name="auth_phone_mobile_entry"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-form-type="other"
                    placeholder="Mobile Phone Number (Unique)"
                    value={form.phone}
                    onChange={(e) => set('phone')(e.target.value)}
                  />
                </div>
              )}

              {/* Password */}
              <div className="cyber-input-wrap">
                <Lock size={18} className="cyber-field-icon" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  name="auth_user_key_entry"
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-form-type="other"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => set('password')(e.target.value)}
                />
                <button
                  type="button"
                  className="cyber-eye-btn"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Confirm Password (Signup Only) */}
              {isSignup && (
                <div className="cyber-input-wrap">
                  <Lock size={18} className="cyber-field-icon" />
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    name="auth_user_confirm_key_entry"
                    autoComplete="new-password"
                    autoCorrect="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-form-type="other"
                    placeholder="Confirm Password"
                    value={form.confirm}
                    onChange={(e) => set('confirm')(e.target.value)}
                  />
                  <button
                    type="button"
                    className="cyber-eye-btn"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    tabIndex={-1}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}

              {/* Referral Code (Required) */}
              {isSignup && (
                <div className="cyber-input-wrap">
                  <QrCode size={18} className="cyber-field-icon" />
                  <input
                    type="text"
                    required
                    name="auth_sponsor_code_entry"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck="false"
                    data-lpignore="true"
                    data-form-type="other"
                    placeholder="Referral Code (Required)"
                    value={form.referral}
                    onChange={(e) => handleReferralChange(e.target.value)}
                  />
                  <div className="cyber-field-right-action">
                    {sponsorStatus === 'checking' ? (
                      <RefreshCw className="spin" size={15} color="#cb4eff" />
                    ) : sponsorStatus === 'valid' ? (
                      <CheckCircle size={17} color="#4ade80" title={`Verified: ${sponsorName}`} />
                    ) : sponsorStatus === 'invalid' ? (
                      <span className="cyber-asterisk" title={sponsorError}>*</span>
                    ) : (
                      <span className="cyber-asterisk">*</span>
                    )}
                  </div>
                </div>
              )}

              {/* Sponsor Feedback Pill */}
              {isSignup && sponsorStatus === 'valid' && (
                <div className="cyber-sponsor-pill valid">
                  <CheckCircle size={13} />
                  <span>Verified Sponsor: <b>{sponsorName}</b></span>
                </div>
              )}
              {isSignup && sponsorStatus === 'invalid' && sponsorError && (
                <div className="cyber-sponsor-pill invalid">
                  <AlertCircle size={13} />
                  <span>{sponsorError}</span>
                </div>
              )}

              {/* SpiderWeb Security Captcha Verification Row */}
              {isSignup && (
                <div className="cyber-captcha-grid" style={{ alignItems: 'center' }}>
                  <div className="cyber-input-wrap">
                    <ShieldCheck size={18} className="cyber-field-icon" />
                    <input
                      type="text"
                      required
                      name="auth_captcha_challenge_entry"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="characters"
                      spellCheck="false"
                      data-lpignore="true"
                      data-form-type="other"
                      placeholder="Security Code"
                      value={form.code}
                      onChange={(e) => set('code')(e.target.value)}
                      maxLength={6}
                      style={{ letterSpacing: '1px', textTransform: 'uppercase' }}
                    />
                  </div>

                  <SpiderWebCaptcha onCaptchaChange={setActiveCaptcha} />
                </div>
              )}

              {isSignup && <AltchaWidget key={altchaKey} onVerify={setAltchaPayload} />}

              {/* Terms & Privacy Agreement Checkbox */}
              {isSignup && (
                <div className="cyber-terms-row">
                  <input
                    type="checkbox"
                    id="agreeTermsInput"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                  />
                  <label htmlFor="agreeTermsInput" style={{ cursor: 'pointer', userSelect: 'none' }}>
                    I have read and agree to the{' '}
                    <button type="button" className="terms-text-link" onClick={() => setShowTermsModal(true)}>
                      Terms & Conditions
                    </button>{' '}
                    and{' '}
                    <button type="button" className="terms-text-link" onClick={() => setShowPrivacyModal(true)}>
                      Privacy Policy
                    </button>
                  </label>
                </div>
              )}

              {/* Main Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="cyber-submit-btn"
              >
                {loading ? (
                  <RefreshCw className="spin" size={20} />
                ) : isSignup ? (
                  <>
                    <Zap size={18} style={{ marginRight: 6 }} /> Register Account
                  </>
                ) : (
                  <>
                    <Lock size={18} style={{ marginRight: 6 }} /> Secure Login
                  </>
                )}
              </button>
            </form>

            {/* Help / Forgot Password Action (Login Mode Only) */}
            {!isSignup && (
              <div className="cyber-forgot-row" style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  className="cyber-forgot-link"
                  onClick={() => {
                    setForgotStep(1);
                    setForgotError('');
                    setShowForgotModal(true);
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="cyber-or-divider">
              <span>{isSignup ? 'ALREADY A MEMBER?' : 'NEW TO CODE CLEVER?'}</span>
            </div>

            {/* Secondary Action Switch */}
            {isSignup ? (
              <button
                type="button"
                className="cyber-secondary-btn"
                onClick={() => nav('/login')}
              >
                Sign In to Your Account
              </button>
            ) : (
              <button
                type="button"
                className="cyber-secondary-btn"
                onClick={() => nav('/signup')}
              >
                Create New Account
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* ----------------- 2-STEP VERIFIED FORGOT PASSWORD MODAL ----------------- */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="admin-modal-backdrop" onClick={() => setShowForgotModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="cyber-auth-card"
              style={{ maxWidth: '440px', padding: '28px 24px', margin: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setShowForgotModal(false)} aria-label="Close forgot password modal">
                <X size={18} />
              </button>

              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(145deg, #38125e, #100624)',
                  border: '2px solid #a83dff',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 12px',
                  boxShadow: '0 0 25px rgba(184, 61, 255, 0.4)',
                  color: '#e879f9'
                }}
              >
                <KeyRound size={26} />
              </div>
              <h2 style={{ fontSize: '18px', margin: '0 0 6px', color: '#fff', textAlign: 'center', fontWeight: 800 }}>
                Account Password Recovery
              </h2>

              <p style={{ color: '#cbd5e1', fontSize: '12px', margin: '0 0 16px', textAlign: 'center', lineHeight: 1.5 }}>
                {forgotStep === 1
                  ? 'Enter your registered email or phone to retrieve your registered security question.'
                  : 'Answer your secret security question to verify ownership and forward your recovery ticket.'}
              </p>

              {forgotError && (
                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', padding: '10px 12px', borderRadius: 10, fontSize: 12, marginBottom: 12 }}>
                  <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  {forgotError}
                </div>
              )}

              {/* STEP 1: Account Lookup */}
              {forgotStep === 1 && (
                <form onSubmit={handleForgotLookup} autoComplete="off" data-lpignore="true" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                  <div className="cyber-input-wrap" style={{ height: '46px' }}>
                    <Mail size={16} className="cyber-field-icon" />
                    <input
                      type="text"
                      required
                      name="forgot_lookup_identifier_entry"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      data-lpignore="true"
                      data-form-type="other"
                      placeholder="Registered Email or Mobile Number"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="cyber-submit-btn"
                    disabled={forgotLoading}
                    style={{ height: '44px', marginTop: 4, background: 'linear-gradient(90deg, #7c18eb, #ce2bff)' }}
                  >
                    <HelpCircle size={16} style={{ marginRight: 6 }} />
                    {forgotLoading ? 'Looking up account...' : 'Find My Security Question'}
                  </button>
                </form>
              )}

              {/* STEP 2: Answer Security Question & Submit */}
              {forgotStep === 2 && (
                <form onSubmit={handleForgotVerifyAndSubmit} autoComplete="off" data-lpignore="true" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                  <div
                    style={{
                      background: 'rgba(203, 78, 255, 0.1)',
                      border: '1px solid rgba(203, 78, 255, 0.3)',
                      borderRadius: 12,
                      padding: '10px 12px'
                    }}
                  >
                    <span style={{ fontSize: '10px', color: '#cb4eff', fontWeight: 800, textTransform: 'uppercase' }}>
                      Security Recovery Question:
                    </span>
                    <div style={{ color: '#ffffff', fontSize: '13px', fontWeight: 700, marginTop: 2 }}>
                      {forgotQuestion}
                    </div>
                  </div>

                  <div className="cyber-input-wrap" style={{ height: '46px' }}>
                    <ShieldCheck size={16} className="cyber-field-icon" />
                    <input
                      type="text"
                      required
                      name="forgot_recovery_answer_entry"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      data-lpignore="true"
                      data-form-type="other"
                      placeholder="Your Secret Security Answer"
                      value={forgotAnswer}
                      onChange={(e) => setForgotAnswer(e.target.value)}
                    />
                  </div>

                  <div className="cyber-input-wrap" style={{ height: '46px' }}>
                    <Send size={16} className="cyber-field-icon" />
                    <input
                      type="text"
                      name="forgot_optional_note_entry"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      data-lpignore="true"
                      data-form-type="other"
                      placeholder="Notes for Administration (Optional)"
                      value={forgotNote}
                      onChange={(e) => setForgotNote(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="cyber-submit-btn"
                    disabled={forgotLoading}
                    style={{ height: '44px', marginTop: 4, background: 'linear-gradient(90deg, #7c18eb, #ce2bff)' }}
                  >
                    <ShieldCheck size={16} style={{ marginRight: 6 }} />
                    {forgotLoading ? 'Verifying...' : 'Verify Answer & Open Support Chatbot'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setForgotError('');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#a78bfa',
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      marginTop: 2
                    }}
                  >
                    ← Change Email / Mobile Number
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------- TERMS & CONDITIONS MODAL ----------------- */}
      <AnimatePresence>
        {showTermsModal && (
          <div className="admin-modal-backdrop" onClick={() => setShowTermsModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="cyber-auth-card policy-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setShowTermsModal(false)} aria-label="Close terms modal">
                <X size={18} />
              </button>

              <div className="policy-modal-header">
                <div className="policy-icon-badge">
                  <FileText size={24} />
                </div>
                <div>
                  <h2>Terms & Conditions</h2>
                  <p>Code Clever Digital Services & Compliance Framework</p>
                </div>
              </div>

              <div className="policy-modal-content">
                <div className="policy-section">
                  <h4>1. Account Integrity & Invitation Protocol</h4>
                  <p>
                    Every Code Clever account requires a verified email, unique mobile phone number, and an authentic sponsor invitation code. Multiple accounts under identical identifiers are strictly restricted.
                  </p>
                </div>

                <div className="policy-section">
                  <h4>2. Task Fulfillment & Daily Allocations</h4>
                  <p>
                    Daily micro-task quotas reset every 24 hours at 12:00 AM PKT. Completed tasks undergo automatic cryptographic validation before rewards credit to your available balance.
                  </p>
                </div>

                <div className="policy-section">
                  <h4>3. Job Security Bond & Tier Validity</h4>
                  <p>
                    Plan activation bonds guarantee verified task allocations for the duration of the plan lifecycle.
                  </p>
                </div>

                <div className="policy-section">
                  <h4>4. Team Referral Commissions</h4>
                  <p>
                    Referral rewards are strictly credited upon authentic team member tier activations and verified task completions according to Tier 1, Tier 2, and Tier 3 structures.
                  </p>
                </div>

                <div className="policy-section">
                  <h4>5. Withdrawal Operations & Processing Speed</h4>
                  <p>
                    Withdrawal requests are processed Monday through Saturday between 10:00 AM and 06:00 PM PKT. Standard settlement speed is 10 to 15 minutes (or up to 2 hours during peak transaction hours).
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="cyber-submit-btn"
                style={{ marginTop: '16px', height: '44px' }}
                onClick={() => setShowTermsModal(false)}
              >
                <Check size={16} style={{ marginRight: 6 }} /> I Understand & Agree
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------- PRIVACY POLICY MODAL ----------------- */}
      <AnimatePresence>
        {showPrivacyModal && (
          <div className="admin-modal-backdrop" onClick={() => setShowPrivacyModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="cyber-auth-card policy-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setShowPrivacyModal(false)} aria-label="Close privacy policy modal">
                <X size={18} />
              </button>

              <div className="policy-modal-header">
                <div className="policy-icon-badge" style={{ background: 'linear-gradient(145deg, #0284c7, #0369a1)' }}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h2>Privacy Policy</h2>
                  <p>How Code Clever Protects Your Personal & Financial Data</p>
                </div>
              </div>

              <div className="policy-modal-content">
                <div className="policy-section">
                  <h4>1. Data We Collect</h4>
                  <p>
                    We collect member account identifiers (name, verified email, phone number) and payout account credentials (Easypaisa, JazzCash, IBAN) exclusively for transaction processing and identity authentication.
                  </p>
                </div>

                <div className="policy-section">
                  <h4>2. Cryptographic Security</h4>
                  <p>
                    All passwords and 6-digit Fund PINs are irreversibly encrypted using industry-standard bcrypt hashing. Platform staff and administrators never have access to raw user passwords.
                  </p>
                </div>

                <div className="policy-section">
                  <h4>3. Zero Third-Party Data Selling</h4>
                  <p>
                    Code Clever adheres to strict confidentiality standards. We never sell, lease, or monetize user profile data or telephone numbers with external marketing networks.
                  </p>
                </div>

                <div className="policy-section">
                  <h4>4. Session Isolation & Account Protection</h4>
                  <p>
                    Active user sessions terminate automatically upon browser close to prevent session hijacking or unauthorized access on shared devices.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="cyber-submit-btn"
                style={{ marginTop: '16px', height: '44px', background: 'linear-gradient(90deg, #0284c7, #06b6d4)' }}
                onClick={() => setShowPrivacyModal(false)}
              >
                <Check size={16} style={{ marginRight: 6 }} /> Accept Privacy Policy
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------- AI ONBOARDING CHATBOT (LOGIN & SIGNUP ONLY) ----------------- */}
      <AuthChatBot onSwitchMode={(target) => nav(`/${target}`)} externalTrigger={chatTrigger} />
    </div>
  );
}
