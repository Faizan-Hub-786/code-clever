import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  KeyRound,
  CreditCard,
  ArrowRight,
  X,
  Sparkles,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../../api/config';

export default function SecurityOnboardingModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isQuestionSet, setIsQuestionSet] = useState(true);
  const [isFundSet, setIsFundSet] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Don't show if already on security settings or auth pages
    if (location.pathname === '/settings/security' || location.pathname === '/login' || location.pathname === '/signup') {
      setIsOpen(false);
      return;
    }

    const token = sessionStorage.getItem('cc_token') || localStorage.getItem('cc_token');
    if (!token) return;

    // Check if dismissed for this tab session
    const isDismissed = sessionStorage.getItem('cc_dismissed_security_prompt');
    if (isDismissed === 'true') {
      return;
    }

    const checkSecurityStatus = async () => {
      try {
        const [qRes, fRes] = await Promise.all([
          fetch(`${API_BASE_URL}/settings/security-question`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE_URL}/settings/fund-password-status`, { headers: getAuthHeaders() })
        ]);

        let qSet = true;
        let fSet = true;

        if (qRes.ok) {
          const qData = await qRes.json();
          qSet = Boolean(qData.isSet);
          setIsQuestionSet(qSet);
        }
        if (fRes.ok) {
          const fData = await fRes.json();
          fSet = Boolean(fData.isSet);
          setIsFundSet(fSet);
        }

        // If either security question or fund password is not configured, open the prompt
        if (!qSet || !fSet) {
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Security check notice:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSecurityStatus();
  }, [location.pathname]);

  const handleGoToSecurity = () => {
    setIsOpen(false);
    navigate('/settings/security');
  };

  const handleDismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem('cc_dismissed_security_prompt', 'true');
  };

  if (!isOpen || loading) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 2, 14, 0.82)',
          backdropFilter: 'blur(12px)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 99999,
          padding: '16px'
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          style={{
            width: '100%',
            maxWidth: '460px',
            background: 'linear-gradient(180deg, #180a33 0%, #0d041c 100%)',
            border: '1.5px solid rgba(203, 78, 255, 0.45)',
            borderRadius: '24px',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85), 0 0 50px rgba(203, 78, 255, 0.3)',
            padding: '28px 24px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Glowing Top Accent Line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '10%',
              right: '10%',
              height: '3px',
              background: 'linear-gradient(90deg, transparent, #ce2bff, #7c18eb, transparent)'
            }}
          />

          {/* Close / Dismiss Button */}
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#a69db2',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>

          {/* Icon and Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #7c18eb 0%, #ce2bff 100%)',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                margin: '0 auto 14px',
                boxShadow: '0 0 30px rgba(206, 43, 255, 0.6)'
              }}
            >
              <ShieldAlert size={32} />
            </div>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#cb4eff',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              Account Security Setup
            </span>
            <h3 style={{ fontSize: '20px', color: '#fff', fontWeight: 800, margin: '6px 0 8px' }}>
              Complete Your Security Profile
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '12.5px', lineHeight: 1.5, margin: 0 }}>
              To safeguard your funds and ensure seamless account recovery, please complete your security configuration.
            </p>
          </div>

          {/* Checklist Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
            {/* 1. Security Recovery Question */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${isQuestionSet ? 'rgba(74, 222, 128, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: isQuestionSet ? 'rgba(74, 222, 128, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                  color: isQuestionSet ? '#4ade80' : '#facc15',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0
                }}
              >
                {isQuestionSet ? <ShieldCheck size={20} /> : <HelpCircle size={20} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '13px', color: '#fff' }}>Secret Security Question</strong>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '99px',
                      background: isQuestionSet ? 'rgba(74, 222, 128, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                      color: isQuestionSet ? '#4ade80' : '#facc15'
                    }}
                  >
                    {isQuestionSet ? 'CONFIGURED' : 'ACTION REQUIRED'}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                  Secret question & answer for instant password recovery.
                </p>
              </div>
            </div>

            {/* 2. Withdrawal Fund PIN */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${isFundSet ? 'rgba(74, 222, 128, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: isFundSet ? 'rgba(74, 222, 128, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                  color: isFundSet ? '#4ade80' : '#facc15',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0
                }}
              >
                {isFundSet ? <ShieldCheck size={20} /> : <CreditCard size={20} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '13px', color: '#fff' }}>6-Digit Withdrawal PIN</strong>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '99px',
                      background: isFundSet ? 'rgba(74, 222, 128, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                      color: isFundSet ? '#4ade80' : '#facc15'
                    }}
                  >
                    {isFundSet ? 'CONFIGURED' : 'ACTION REQUIRED'}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                  Transaction PIN required to authorize all cashouts.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={handleGoToSecurity}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #7c18eb 0%, #ce2bff 100%)',
                border: 'none',
                color: '#fff',
                fontSize: '13.5px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(206, 43, 255, 0.45)',
                transition: 'all 0.2s ease'
              }}
            >
              <Lock size={16} /> Complete Password & Security Setup <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '12px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Remind Me Later
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
