import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminReferrals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user?.is_admin) { navigate('/'); return; }
    api.get('/referrals/admin/all')
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return (
    <div className="page" style={{ maxWidth: 960, textAlign: 'center', padding: 80 }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
    </div>
  );

  const filtered = (data?.referrers || []).filter(r =>
    !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.email?.toLowerCase().includes(search.toLowerCase()) || r.referral_code?.toLowerCase().includes(search.toLowerCase())
  );

  const { totals } = data || {};

  return (
    <div className="page" style={{ maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Admin</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, margin: 0, lineHeight: 1 }}>Referrals</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>Every referral code and the users they brought in.</p>
        </div>
        <button onClick={() => navigate('/admin')} style={{
          border: '1.5px solid var(--border)', background: 'none', borderRadius: 99,
          padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'var(--font-ui)', color: 'var(--muted)',
        }}>
          ← Admin
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Active referrers', value: totals?.total_referrers ?? 0 },
          { label: 'Total signups via referral', value: totals?.total_signups ?? 0 },
          { label: 'Bookings from referrals', value: totals?.total_bookings ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="card" style={{ padding: '18px 20px', borderRadius: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, lineHeight: 1, color: 'var(--text)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, email, or code…"
        style={{
          width: '100%', border: '1.5px solid var(--border)', borderRadius: 10,
          padding: '10px 14px', fontSize: 13.5, outline: 'none',
          background: '#fff', fontFamily: 'var(--font-ui)', marginBottom: 14,
          boxSizing: 'border-box',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1.4fr 0.8fr 0.8fr 0.8fr',
          padding: '10px 20px', background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          fontSize: 11, fontWeight: 700, color: 'var(--muted)',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          gap: 8,
        }}>
          <span>User</span>
          <span>Code</span>
          <span style={{ textAlign: 'right' }}>Signups</span>
          <span style={{ textAlign: 'right' }}>Bookings</span>
          <span />
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
            {search ? 'No matches.' : 'No referral codes issued yet.'}
          </div>
        ) : (
          filtered.map((r, idx) => (
            <div key={r.id}>
              {/* Referrer row */}
              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 1.4fr 0.8fr 0.8fr 0.8fr',
                padding: '14px 20px', gap: 8, alignItems: 'center',
                borderBottom: expanded === r.id && r.referred_users?.length ? 'none' : '1px solid var(--border)',
                background: expanded === r.id ? 'rgba(23,19,15,0.02)' : '#fff',
                transition: 'background 0.1s',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 660, color: 'var(--text)', lineHeight: 1.2 }}>{r.name || '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{r.email}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text)', wordBreak: 'break-all' }}>
                  {r.referral_code}
                </div>
                <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 15, color: r.signups > 0 ? '#166534' : 'var(--muted)' }}>
                  {r.signups}
                </div>
                <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 15, color: r.bookings > 0 ? 'var(--primary)' : 'var(--muted)' }}>
                  {r.bookings}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {r.referred_users?.length > 0 && (
                    <button
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      style={{
                        background: 'none', border: '1px solid var(--border)', borderRadius: 6,
                        padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'var(--font-ui)', color: 'var(--muted)',
                        transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
                    >
                      {expanded === r.id ? 'Hide' : 'View'}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded referred users */}
              {expanded === r.id && r.referred_users?.length > 0 && (
                <div style={{
                  background: 'rgba(23,19,15,0.025)',
                  borderBottom: '1px solid var(--border)',
                  borderLeft: '3px solid var(--primary)',
                  padding: '8px 0',
                }}>
                  {r.referred_users.map(u => (
                    <div key={u.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 20px 8px 28px', gap: 12,
                    }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{u.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>{u.email}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                          Joined {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: u.bookings > 0 ? 'var(--primary)' : 'var(--muted)' }}>
                          {u.bookings} booking{u.bookings !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
