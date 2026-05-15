import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="card" style={{ padding: '42px 34px', textAlign: 'center' }}>
        <div className="section-label" style={{ marginBottom: 12 }}>404</div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(40px, 8vw, 72px)',
          lineHeight: 0.95,
          marginBottom: 14,
          letterSpacing: 0,
        }}>
          Page not found.
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 1.65, maxWidth: 480, margin: '0 auto 24px' }}>
          That link does not match a live Ask Marketplace page or instructor profile.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="ask-button-primary" to="/browse">Browse listings</Link>
          <Link className="ask-button-secondary" to="/support">Contact support</Link>
        </div>
      </div>
    </div>
  );
}
