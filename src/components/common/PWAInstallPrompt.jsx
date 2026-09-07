import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const STORAGE_KEY = 'codeclever_pwa_prompt_dismissed_v1';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // 1. If already dismissed once by user, do not listen or show
    if (dismissed) return;

    // 2. Check if app is already running in standalone display mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {}
      return;
    }

    // 3. Listen for Chrome / Edge / Android PWA beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // 4. Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setDismissed(true);
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [dismissed]);

  const handleDismiss = () => {
    setIsClosing(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch (err) {
      console.warn('Could not persist PWA dismiss state:', err);
    }
    setTimeout(() => {
      setDismissed(true);
    }, 250);
  };

  const handleInstallClick = async () => {
    // 1-time prompt: dismiss permanently so it never pops up again
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}

    if (!deferredPrompt) {
      handleDismiss();
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    } finally {
      setDeferredPrompt(null);
      handleDismiss();
    }
  };

  // Do not render if not installable, already installed, or dismissed by user
  if (!isInstallable || isInstalled || dismissed) {
    return null;
  }

  return (
    <div
      className={`pwa-install-banner ${isClosing ? 'closing' : ''}`}
      role="dialog"
      aria-label="Install App"
    >
      <div className="pwa-install-banner-left">
        <img
          src="/icons/code-clever-192.png"
          alt="CODE CLEVER"
          className="pwa-install-banner-icon"
          onError={(e) => {
            e.currentTarget.src = '/apple-touch-icon.png';
          }}
        />
        <div className="pwa-install-banner-text">
          <span className="pwa-install-banner-title">
            CODE CLEVER
          </span>
          <span className="pwa-install-banner-sub">
            Install app for fast 1-tap access
          </span>
        </div>
      </div>

      <div className="pwa-install-banner-actions">
        <button
          type="button"
          onClick={handleInstallClick}
          className="pwa-install-btn"
          aria-label="Install CODE CLEVER Application"
        >
          <Download size={14} />
          <span>Install</span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="pwa-dismiss-btn"
          aria-label="Dismiss Install Prompt"
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

