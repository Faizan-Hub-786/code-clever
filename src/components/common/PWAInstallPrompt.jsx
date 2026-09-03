import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles, Check } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 1. Check if app is already running in standalone display mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Listen for Chrome / Edge / Android PWA beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // 3. Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Trigger native browser install prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  // Do not render if not installable, already installed, or dismissed by user
  if (!isInstallable || isInstalled || dismissed) {
    return null;
  }

  return (
    <div
      className="pwa-install-banner"
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '440px',
        background: 'linear-gradient(135deg, rgba(26, 16, 48, 0.96) 0%, rgba(10, 6, 24, 0.98) 100%)',
        border: '1px solid rgba(147, 51, 234, 0.5)',
        borderRadius: '16px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(147, 51, 234, 0.25)',
        zIndex: 9999,
        backdropFilter: 'blur(12px)',
        animation: 'pwaSlideUp 0.35s ease-out forwards'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <img
          src="/icons/code-clever-192.png"
          alt="CODE CLEVER"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            objectFit: 'cover',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            flexShrink: 0
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, color: '#fff', fontSize: '13.5px', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            CODE CLEVER
          </div>
          <div style={{ color: '#c4b5fd', fontSize: '11.5px', marginTop: '1px' }}>
            Install app for fast 1-tap access
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={handleInstallClick}
          aria-label="Install CODE CLEVER Application"
          style={{
            background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)',
            transition: 'transform 0.15s ease'
          }}
        >
          <Download size={14} /> Install
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss Install Prompt"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            padding: '6px',
            cursor: 'pointer',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
