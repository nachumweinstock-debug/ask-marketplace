import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[app-error-boundary]', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: '#fbfaf7',
        color: '#17130f',
        fontFamily: 'Inter Tight, system-ui, sans-serif',
      }}>
        <main style={{
          width: 'min(560px, 100%)',
          background: '#fff',
          border: '1px solid rgba(23, 19, 15, 0.12)',
          borderRadius: 14,
          padding: '28px 24px',
          boxShadow: '0 20px 60px rgba(23, 19, 15, 0.12)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#e55b2f', marginBottom: 10 }}>
            Ask Marketplace
          </div>
          <h1 style={{
            margin: 0,
            fontSize: 34,
            lineHeight: 1.05,
            fontFamily: 'Fraunces, Georgia, serif',
            letterSpacing: 0,
          }}>
            We hit a loading problem.
          </h1>
          <p style={{ margin: '12px 0 20px', color: '#6f6a63', fontSize: 16, lineHeight: 1.55 }}>
            The marketplace is still here. Refresh once, or jump back to browse while the issue is logged.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                border: 'none',
                borderRadius: 999,
                padding: '11px 18px',
                background: '#111827',
                color: '#fff',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
            <a
              href="/browse"
              style={{
                border: '1px solid rgba(23, 19, 15, 0.16)',
                borderRadius: 999,
                padding: '10px 18px',
                color: '#17130f',
                textDecoration: 'none',
                fontWeight: 900,
              }}
            >
              Browse instructors
            </a>
          </div>
        </main>
      </div>
    );
  }
}
