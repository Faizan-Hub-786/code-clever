// PWA Service Worker Registration & Installation Manager

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const isDev =
    import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  // In development, actively unregister any service workers and clear stale caches
  if (isDev) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().then((success) => {
          if (success) {
            console.log('[PWA] Unregistered service worker in development environment.');
          }
        });
      }
    });

    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      });
    }
    return;
  }

  // In production, register the service worker for offline PWA support
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version ready.');
              }
            };
          }
        };
      })
      .catch((err) => {
        console.warn('[PWA] Service worker registration failed:', err);
      });
  });
}
