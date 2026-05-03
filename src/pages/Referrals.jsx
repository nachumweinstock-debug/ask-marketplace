import { useEffect, useState } from 'react';
import api from '../api';
import { RowSkeleton } from '../components/Skeletons';

export default function Referrals() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/referrals/mine')
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page" style={{ maxWidth: 900 }}><RowSkeleton rows={5} /></div>;

  function copy() {
    navigator.clipboard.writeText(data.invite_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="page" style={{ maxWidth: 960 }}>
      <div className="card" style={{ padding: 28, marginBottom: 16 }}>
        <div className="section-label">Growth</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, lineHeight: 1, marginTop: 8 }}>Invite friends to Ask</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginTop: 10 }}>
          Share your link with classmates who need tutors or want to offer tutoring. We track signups and bookings from your referral code.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
          <input readOnly value={data?.invite_url || ''} style={{ flex: 1, minWidth: 240, border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12 }} />
          <button onClick={copy} style={{ border: 'none', borderRadius: 999, padding: '11px 18px', background: copied ? '#16A34A' : 'var(--text)', color: '#fff', fontWeight: 900, cursor: 'pointer' }}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
          {navigator.share && (
            <button onClick={() => navigator.share({ title: 'Ask Marketplace', url: data.invite_url })} style={{ border: '1px solid var(--border)', borderRadius: 999, padding: '11px 18px', background: '#fff', fontWeight: 900, cursor: 'pointer' }}>
              Share
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi label="Referral code" value={data?.code || '-'} small />
        <Kpi label="Signups" value={data?.successful_signups || 0} />
        <Kpi label="Bookings" value={data?.successful_bookings || 0} />
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 14 }}>Invited users</h2>
        {!data?.invited_users?.length ? (
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>No referral signups yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {data.invited_users.map(user => (
              <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900 }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(user.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 900 }}>{user.bookings || 0} booking{user.bookings === 1 ? '' : 's'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, small }) {
  return (
    <div className="card" style={{ padding: 18, borderRadius: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
      <div style={{ fontFamily: small ? 'var(--font-mono)' : 'var(--font-display)', fontSize: small ? 18 : 34, marginTop: 7, wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}
