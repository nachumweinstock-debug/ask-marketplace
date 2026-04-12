import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

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

      {/* Bulk import */}
      <div style={{ marginBottom: 24 }}>
        <ImportCard onImported={() => {
          // Refresh user list after import
          api.get('/admin/users').then(r => setUsers(r.data)).catch(() => {});
          api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
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

// ── CSV helpers ──────────────────────────────────────────────────────────────

const CSV_TEMPLATE = `email,name,category,custom_category,bio,price_per_session,zelle,venmo
yitz@yu.edu,Yitz Cohen,tutor,,I tutor Calc I and Orgo. 3 yrs experience.,35,9175551234,yitzcohen
sarah@mail.yu.edu,Sarah Levy,other,Photography,Campus portrait sessions — headshots and events.,50,,sarahlevy
`;
const TEMPLATE_URL = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv' }));

/** Robust CSV parser — handles quoted fields with embedded commas/newlines */
function parseCSV(text) {
  const raw = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lines = raw.split('\n');
  if (lines.length < 2) return [];

  function splitLine(line) {
    const cols = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  }

  const headers = splitLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
  return lines.slice(1)
    .filter(l => l.replace(/,/g, '').trim())
    .map(l => {
      const vals = splitLine(l);
      return headers.reduce((obj, h, i) => ({ ...obj, [h]: vals[i] ?? '' }), {});
    });
}

// ── Google Form auto-normalizer ───────────────────────────────────────────────

const GF_MARKERS = ['subjects', 'hourly_rate', 'short_bio', 'availability', 'phone_number'];

function isGoogleForm(headers) {
  return GF_MARKERS.some(m => headers.some(h => h.includes(m)));
}

function gfGet(row, ...patterns) {
  for (const p of patterns) {
    const key = Object.keys(row).find(k => k.includes(p));
    if (key && row[key]?.trim()) return row[key].trim();
  }
  return '';
}

function parsePrice(str) {
  if (!str) return 0;
  // strip $ signs, find first number >= 10 (avoids "1 on 1: 120" → 1)
  const nums = str.replace(/\$/g, '').match(/\d+/g);
  if (!nums) return 0;
  const price = nums.map(Number).find(n => n >= 10);
  return price || 0;
}

function parsePayment(paymentStr, phone) {
  const s = paymentStr || '';
  let venmo = null, zelle = null;

  // Venmo URL pattern: venmo.com/u/Handle
  const venmoUrl = s.match(/venmo\.com\/u\/([^\s,\n/?]+)/i);
  if (venmoUrl) venmo = venmoUrl[1];

  // Labeled patterns: "Venmo: handle", "Venmo - @handle", "Venmo = handle"
  if (!venmo) {
    const vm = s.match(/venmo[\s:\-=@]+([^\s,\n/]+)/i);
    if (vm) venmo = vm[1].replace(/^@/, '').replace(/\/$/, '').trim();
  }

  // Labeled zelle
  const zm = s.match(/zelle[\s:\-=@]+([^\s,\n/]+)/i);
  if (zm) zelle = zm[1].replace(/^@/, '').trim();

  // If nothing labeled, whole string might be a single handle
  if (!venmo && !zelle) {
    const clean = s.trim();
    if (/^[\d\-().+]+$/.test(clean) && clean.replace(/\D/g,'').length >= 7) {
      zelle = clean;
    } else if (clean && !/ /.test(clean) && clean.length < 40 &&
               !clean.toLowerCase().match(/^(venmo|zelle|cash|other)$/)) {
      venmo = clean.replace(/^@/, '');
    }
  }

  // Fall back to phone number for zelle
  if (!zelle && phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 7) zelle = digits;
  }

  return { venmo: venmo || null, zelle: zelle || null };
}

function inferCategory(subjects) {
  const s = (subjects || '').toLowerCase();
  if (/hair|barber|fade|lineup|beard|cut/.test(s))   return { category: 'barber',       custom_category: null };
  if (/\bgolf\b/.test(s))                             return { category: 'other',        custom_category: 'Golf Lessons' };
  if (/soccer/.test(s))                               return { category: 'other',        custom_category: 'Soccer Training' };
  if (/basketball/.test(s))                           return { category: 'other',        custom_category: 'Basketball' };
  if (/\btennis\b/.test(s))                           return { category: 'tennis',       custom_category: null };
  if (/hebrew|judaic|gemara|rashi|chumash/.test(s))   return { category: 'hebrew tutor', custom_category: null };
  return { category: 'tutor', custom_category: null };
}

function normalizeGoogleFormRow(row) {
  const name     = gfGet(row, 'name');
  const email    = gfGet(row, 'email');
  const subjects = gfGet(row, 'subjects', 'tutor');
  const shortBio = gfGet(row, 'short_bio', 'bio');
  const priceStr = gfGet(row, 'hourly_rate', 'rate', 'price');
  const payment  = gfGet(row, 'venmo', 'zelle', 'payment');
  const phone    = gfGet(row, 'phone');
  const year     = gfGet(row, 'year', 'degree', 'program');

  // Bio: prefer short bio; if absent use subjects description
  let bio = shortBio || subjects || '';
  // Append year/program as a short credential note
  if (year && bio) bio = `${bio.replace(/\.?\s*$/, '')}. ${year}.`;

  const price = parsePrice(priceStr);
  const { venmo, zelle } = parsePayment(payment, phone);
  const { category, custom_category } = inferCategory(subjects);

  return { email, name, category, custom_category, bio, price_per_session: price, venmo, zelle };
}

// ── Import card ───────────────────────────────────────────────────────────────

function ImportCard({ onImported }) {
  const fileRef = useRef(null);
  const [rows, setRows]       = useState(null);
  const [isGF, setIsGF]       = useState(false);
  const [results, setResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const [open, setOpen] = useState(false);

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const parsed = parseCSV(e.target.result);
      if (!parsed.length) return;
      const headers = Object.keys(parsed[0]);
      const googleForm = isGoogleForm(headers);
      setIsGF(googleForm);
      const normalized = googleForm
        ? parsed.map(normalizeGoogleFormRow).filter(r => r.email?.includes('@'))
        : parsed.filter(r => r.email?.includes('@'));
      setRows(normalized);
      setResults(null);
    };
    reader.readAsText(file);
  }

  async function runImport() {
    if (!rows?.length) return;
    setImporting(true);
    try {
      const { data } = await api.post('/admin/import', { providers: rows });
      setResults(data);
      onImported();
    } catch (err) {
      alert(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  function reset() { setRows(null); setResults(null); setIsGF(false); if (fileRef.current) fileRef.current.value = ''; }

  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Bulk Import Providers
        </div>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
            Upload any CSV — your Google Form export works directly.{' '}
            <a href={TEMPLATE_URL} download="ask-import-template.csv"
              style={{ color: 'var(--primary)', fontWeight: 600 }} onClick={e => e.stopPropagation()}>
              Download blank template
            </a>
          </p>

          {/* File upload */}
          {!rows && !results && (
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--primary)', color: '#fff', borderRadius: 999,
              padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}>
              Choose CSV file
              <input type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])} />
            </label>
          )}

          {/* Preview */}
          {rows && !results && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                  {rows.length} provider{rows.length !== 1 ? 's' : ''} ready
                </span>
                {isGF && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}>
                    Google Form detected — fields mapped automatically
                  </span>
                )}
              </div>

              <div style={{ overflowX: 'auto', marginBottom: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)' }}>
                      {['name', 'email', 'category', 'price', 'zelle', 'venmo', 'bio'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 8).map((r, i) => (
                      <tr key={i} style={{ borderBottom: i < Math.min(rows.length, 8) - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '7px 12px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>{r.name || <em style={{color:'var(--muted)'}}>—</em>}</td>
                        <td style={{ padding: '7px 12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{r.email}</td>
                        <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                          <span style={{ background: 'var(--accent)', color: 'var(--primary)', borderRadius: 999, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>
                            {r.custom_category || r.category}
                          </span>
                        </td>
                        <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>{r.price_per_session > 0 ? `$${r.price_per_session}` : <em style={{color:'var(--muted)'}}>free</em>}</td>
                        <td style={{ padding: '7px 12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{r.zelle || <em style={{color:'var(--muted)', opacity:.5}}>—</em>}</td>
                        <td style={{ padding: '7px 12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{r.venmo || <em style={{color:'var(--muted)', opacity:.5}}>—</em>}</td>
                        <td style={{ padding: '7px 12px', color: 'var(--muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.bio || <em style={{color:'var(--muted)', opacity:.5}}>—</em>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 8 && (
                  <div style={{ padding: '6px 12px', fontSize: 11.5, color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
                    …and {rows.length - 8} more rows
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={runImport} disabled={importing} style={{
                  background: importing ? '#93C5FD' : 'var(--primary)', color: '#fff',
                  border: 'none', borderRadius: 999, padding: '10px 28px',
                  fontSize: 13, fontWeight: 600, cursor: importing ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}>
                  {importing ? 'Importing...' : `Import all ${rows.length} providers`}
                </button>
                <button onClick={reset} style={{
                  background: 'none', border: '1.5px solid var(--border)', color: 'var(--muted)',
                  borderRadius: 999, padding: '10px 18px', fontSize: 13, cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div>
              <div style={{
                fontSize: 13.5, fontWeight: 600, marginBottom: 12,
                color: results.errors === 0 ? '#166534' : '#92400E',
              }}>
                {results.imported} imported successfully{results.errors > 0 ? `, ${results.errors} failed` : ''}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
                {results.results.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontSize: 12.5, padding: '5px 10px', borderRadius: 6,
                    background: r.status === 'ok' ? '#F0FDF4' : '#FEF2F2',
                  }}>
                    <span style={{ color: r.status === 'ok' ? '#166534' : '#DC2626', fontWeight: 700, fontSize: 13 }}>
                      {r.status === 'ok' ? '✓' : '✗'}
                    </span>
                    <span style={{ flex: 1, color: 'var(--text)' }}>{r.email}</span>
                    <span style={{ color: 'var(--muted)' }}>
                      {r.status === 'ok' ? r.action : r.error}
                    </span>
                  </div>
                ))}
              </div>
              <button onClick={reset} style={{
                marginTop: 14, background: 'none', border: '1.5px solid var(--border)',
                color: 'var(--muted)', borderRadius: 999, padding: '7px 18px',
                fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-ui)',
              }}>
                Import more
              </button>
            </div>
          )}
        </div>
      )}
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
