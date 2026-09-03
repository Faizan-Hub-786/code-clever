/**
 * Configurable API configuration for hosting-independent frontend deployments
 * (Vercel, Netlify, Custom Domains like codeclever.com -> api.codeclever.com)
 */
const rawApiUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');

// Normalize URL (ensure it points to the API root without trailing slash)
export const API_BASE_URL = rawApiUrl.endsWith('/')
  ? rawApiUrl.slice(0, -1)
  : rawApiUrl;

export function getAuthHeaders(extraHeaders = {}) {
  const token = sessionStorage.getItem('cc_token') || localStorage.getItem('cc_token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders
  };
}
