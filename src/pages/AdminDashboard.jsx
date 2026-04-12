import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';

const STATUS_COLORS = {
  student:  { bg: 'var(--accent)', color: 'var(--primary)' },
  provider: { bg: '#F0FDF4', color: '#166534' },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user?.is_admin) { navigate('/'); return; }
    Promise.all([
      api.get('/admin/users'),
      api.get('/admin/stats'),
    ]).then(([u, s]) => { setUsers(u.data); setStats(s.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  async function toggleAdmin(id, current) {
    try {
      const { data } = await api.patch(`/admin/users/${id}`, { is_admin: !current });
      setUsers(us => us.map(u => u.id === id ? { ...u, is_admin: data.is_admin } : u));
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  }

  async function deleteUser(id, name) {
    if (!confirm(`Delete ${name}? This removes their account and everything associated with it.`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(us => us.filter(u => u.id !== id));
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  }

  async function deleteListing(profileId, name) {
    if (!confirm(`Delete ${name}'s listing? Their account stays but their service, slots, and bookings are removed.`)) return;
    try {
      await api.delete(`/admin/listings/${profileId}`);
      setUsers(us => us.map(u => u.provider_profile_id === profileId
        ? { ...u, role: 'student', provider_profile_id: null, rating: null, review_count: null, category: null }
        : u
      ));
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 32px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 6 }}>
            Admin
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>Manage users and platform activity.</p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: '#FEF3C7', color: '#92400E', alignSelf: 'center' }}>
          Admin
        </span>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 36 }}>
          {[
            { label: 'Total users', value: stats.users },
            { label: 'Providers', value: stats.providers },
            { label: 'Bookings', value: stats.bookings },
            { label: 'Reviews', value: stats.reviews },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '20px 24px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--text)' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Grant admin section */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>
          Grant Admin Access
        </div>
        <BootstrapForm onSuccess={email => {
          setUsers(us => us.map(u => u.email === email ? { ...u, is_admin: 1 } : u));
        }} />
      </div>

      {/* Users table */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)' }}>
            All Users ({filtered.length})
          </div>
          <input
            type="text" placeholder="Search name or email..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              border: '1.5px solid var(--border)', borderRadius: 8, padding: '7px 14px',
              fontSize: 13, outline: 'none', background: '#fff', fontFamily: 'var(--font-ui)',
              color: 'var(--text)', width: 220,
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(u => (
            <div key={u.id} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
              border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{u.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{u.email}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                  background: STATUS_COLORS[u.role]?.bg || 'var(--accent)',
                  color: STATUS_COLORS[u.role]?.color || 'var(--primary)',
                }}>
                  {u.role}
                </span>
                {u.is_admin ? (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#FEF3C7', color: '#92400E' }}>
                    Admin
                  </span>
                ) : null}
                {u.rating > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>★ {u.rating.toFixed(1)}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button onClick={() => toggleAdmin(u.id, u.is_admin)} style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'var(--card)',
                  color: u.is_admin ? '#92400E' : 'var(--muted)', fontFamily: 'var(--font-ui)',
                }}>
                  {u.is_admin ? 'Revoke admin' : 'Make admin'}
                </button>
                {u.role === 'provider' && u.provider_profile_id && (
                  <button onClick={() => deleteListing(u.provider_profile_id, u.name)} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                    border: '1px solid #FED7AA', background: '#FFF7ED', color: '#C2410C',
                    fontFamily: 'var(--font-ui)',
                  }}>
                    Delete listing
                  </button>
                )}
                <button onClick={() => deleteUser(u.id, u.name)} style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                  border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626',
                  fontFamily: 'var(--font-ui)',
                }}>
                  Delete user
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BootstrapForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setMsg('');
    try {
      const { data } = await api.post('/admin/bootstrap', { email, secret });
      setMsg(data.message);
      onSuccess(email);
      setEmail(''); setSecret('');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 5 }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
          placeholder="user@email.com"
          style={{ border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 14px', fontSize: 13, outline: 'none', background: '#fff', fontFamily: 'var(--font-ui)', color: 'var(--text)', width: 220 }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 5 }}>Admin Secret</label>
        <input type="password" value={secret} onChange={e => setSecret(e.target.value)} required
          placeholder="ADMIN_SECRET env var"
          style={{ border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 14px', fontSize: 13, outline: 'none', background: '#fff', fontFamily: 'var(--font-ui)', color: 'var(--text)', width: 200 }}
        />
      </div>
      <button type="submit" disabled={loading} style={{
        background: loading ? '#93C5FD' : 'var(--primary)', color: '#fff', border: 'none',
        borderRadius: 999, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
      }}>
        {loading ? '...' : 'Grant'}
      </button>
      {msg && <div style={{ fontSize: 12.5, color: msg.includes('admin') ? '#166534' : '#DC2626', alignSelf: 'center' }}>{msg}</div>}
    </form>
  );
}
