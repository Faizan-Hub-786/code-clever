// Lightweight, instant Stale-While-Revalidate (SWR) cache for wallet & profile data.
// Eliminates page switching delays by providing instant synchronous state on mount.

const CACHE_KEY = 'cc_wallet_cache_v4';

let memoryCache = null;

const DEFAULT_STATE = {
  available_balance: 0,
  personal_balance: 0,
  commission_balance: 0,
  total_balance: 0,
  lifetime_earned: 0,
  pending_balance: 0,
  today_earned: 0,
  monthly_earned: 0,
  week_earned: 0,
  tasks_completed: 0,
  tasks_remaining: 2,
  plan_code: 'INTERN',
  plan_name: 'Internship (3-Day Free Trial)',
  user_name: 'Code Clever User',
  referral_code: ''
};

export function getCachedWallet() {
  if (memoryCache) return memoryCache;
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      memoryCache = { ...DEFAULT_STATE, ...JSON.parse(stored) };
      return memoryCache;
    }
  } catch {}
  memoryCache = { ...DEFAULT_STATE };
  return memoryCache;
}

export function setCachedWallet(partial) {
  if (!partial || typeof partial !== 'object') return getCachedWallet();
  const current = getCachedWallet();
  const updated = { ...current, ...partial };
  
  // Ensure total balance consistency
  if (updated.personal_balance !== undefined || updated.commission_balance !== undefined) {
    const p = Number(updated.personal_balance ?? updated.available_balance ?? 0);
    const c = Number(updated.commission_balance ?? 0);
    updated.total_balance = p + c;
    updated.available_balance = p;
    updated.personal_balance = p;
    updated.commission_balance = c;
  }
  
  memoryCache = updated;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  } catch {}

  // Broadcast instantly to all pages in memory without network request
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cc_wallet_updated', { detail: updated }));
  }
  return updated;
}

export function clearCachedWallet() {
  memoryCache = { ...DEFAULT_STATE };
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cc_wallet_updated', { detail: memoryCache }));
  }
}
