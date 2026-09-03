import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0514', color: '#ffffff', padding: '24px', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', display: 'grid', placeItems: 'center', marginBottom: '16px', fontSize: '24px' }}>
            ⚠️
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#f8fafc' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', maxWidth: '420px', marginBottom: '20px', lineHeight: 1.5 }}>
            {this.state.error?.message || 'A temporary interface error occurred. Please refresh or return to Home.'}
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Refresh Page
            </button>
            <button
              onClick={() => { window.location.href = '/home'; }}
              style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#cbd5e1', border: '1px solid rgba(255, 255, 255, 0.15)', padding: '10px 20px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
