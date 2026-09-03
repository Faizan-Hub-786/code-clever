import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../../api/config';

export default function AltchaWidget({ onVerify, style }) {
  const [status, setStatus] = useState('idle'); // idle | loading | solved | error
  const [errorMsg, setErrorMsg] = useState('');
  const [payload, setPayload] = useState('');
  const isSolvingRef = useRef(false);

  const startVerification = async () => {
    if (status === 'loading' || isSolvingRef.current) return;
    isSolvingRef.current = true;
    setStatus('loading');
    setErrorMsg('');

    try {
      // 1. Fetch challenge from backend
      const res = await fetch(`${API_BASE_URL}/altcha-challenge`);
      if (!res.ok) {
        throw new Error('Failed to fetch verification challenge from server.');
      }
      const challengeData = await res.json();
      const { challenge, salt, maxnumber, signature, expires } = challengeData;

      // 2. Solve Proof-of-Work (SHA-256) locally in non-blocking batches
      const max = maxnumber || 50000;
      let solution = null;

      // Use native Web Crypto Subtle API
      const encoder = new TextEncoder();

      for (let i = 0; i <= max; i++) {
        const text = salt + i;
        const msgUint8 = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

        if (hashHex === challenge) {
          solution = i;
          break;
        }

        // Yield execution every 5000 iterations to keep UI completely responsive
        if (i % 5000 === 0 && i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      if (solution === null) {
        throw new Error('Could not find challenge solution.');
      }

      // 3. Assemble and encode payload
      const solutionPayload = {
        algorithm: 'SHA-256',
        challenge,
        number: solution,
        salt,
        signature,
        expires,
        maxnumber: max
      };

      const b64Payload = btoa(JSON.stringify(solutionPayload));
      setPayload(b64Payload);
      setStatus('solved');

      if (onVerify) {
        onVerify(b64Payload);
      }
    } catch (err) {
      console.error('ALTCHA verification error:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Verification failed. Please try again.');
      if (onVerify) onVerify('');
    } finally {
      isSolvingRef.current = false;
    }
  };

  return (
    <div
      className="altcha-container"
      style={{
        background: status === 'solved' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(20, 9, 41, 0.65)',
        border: `1.5px solid ${status === 'solved' ? 'rgba(34, 197, 94, 0.45)' : status === 'error' ? 'rgba(239, 68, 68, 0.45)' : 'rgba(203, 78, 255, 0.35)'}`,
        borderRadius: '14px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
        transition: 'all 0.25s ease',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          onClick={status !== 'solved' ? startVerification : undefined}
          disabled={status === 'loading'}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            border: `2px solid ${status === 'solved' ? '#22c55e' : status === 'error' ? '#ef4444' : '#a855f7'}`,
            background: status === 'solved' ? '#22c55e' : 'transparent',
            display: 'grid',
            placeItems: 'center',
            cursor: status === 'solved' ? 'default' : 'pointer',
            padding: 0,
            transition: 'all 0.2s ease',
            color: '#fff'
          }}
          title={status === 'solved' ? 'Verified human' : 'Click to verify you are human'}
        >
          {status === 'loading' && <Loader2 size={14} className="spin" color="#ce2bff" />}
          {status === 'solved' && <CheckCircle2 size={16} color="#ffffff" />}
          {status === 'error' && <AlertCircle size={14} color="#ef4444" />}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            onClick={status !== 'solved' ? startVerification : undefined}
            style={{
              fontSize: '12.5px',
              fontWeight: 600,
              color: status === 'solved' ? '#4ade80' : status === 'error' ? '#f87171' : '#e2e8f0',
              cursor: status === 'solved' ? 'default' : 'pointer'
            }}
          >
            {status === 'idle' && "I'm not a robot (ALTCHA Proof-of-Work)"}
            {status === 'loading' && 'Verifying secure cryptographic challenge...'}
            {status === 'solved' && 'Human Verification Successful'}
            {status === 'error' && 'Verification failed (Click to retry)'}
          </span>
          {errorMsg && (
            <span style={{ fontSize: '10px', color: '#f87171', marginTop: '2px' }}>{errorMsg}</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {status === 'error' && (
          <button
            type="button"
            onClick={startVerification}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a78bfa',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center'
            }}
            title="Retry challenge"
          >
            <RefreshCw size={14} />
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', opacity: 0.65 }}>
          <ShieldCheck size={13} color="#a855f7" />
          <span style={{ fontSize: '10px', color: '#cbd5e1', fontWeight: 700, letterSpacing: '0.5px' }}>
            ALTCHA
          </span>
        </div>
      </div>
    </div>
  );
}
