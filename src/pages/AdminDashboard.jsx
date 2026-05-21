import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { hasSuggestion, suggestText } from '../lib/textSuggestions';
import { providerUrl } from '../lib/providerUrl';
import { redactContactText } from '../lib/redact';
import { discountedPrice, discountPercent, firstTimeDiscountLabel, money } from '../lib/pricing';

const CATEGORIES = [
  { id: 'tutor', label: 'Instruction' },
  { id: 'barber', label: 'Barber' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'languages', label: 'Languages' },
  { id: 'music', label: 'Music' },
  { id: 'torah', label: 'Torah' },
  { id: 'other', label: 'Other' },
];

const SUBCATEGORY_SUGGESTIONS = {
  tutor:     ['Math', 'Chemistry', 'Biology', 'Physics', 'Excel', 'Coding', 'English', 'History', 'Economics', 'SAT/ACT', 'Calculus', 'Statistics'],
  fitness:   ['Tennis', 'Golf', 'Basketball', 'Soccer', 'Baseball', 'Swimming', 'Squash', 'Yoga', 'Weightlifting', 'Running', 'Boxing', 'Volleyball'],
  languages: ['Hebrew', 'Ivrit', 'Spanish', 'French', 'Yiddish', 'Arabic', 'Russian', 'Mandarin', 'Italian', 'German'],
  music:     ['Guitar', 'Piano', 'Violin', 'Drums', 'Vocals', 'Bass', 'Ukulele', 'Flute', 'Music Theory', 'Saxophone'],
  torah:     ['Gemara', 'Halacha', 'Chumash', 'Mishna', 'Tefilla', 'Parsha', 'Tanach', 'Jewish History', 'Mussar', 'Chassidus'],
};

const STATUS_COLORS = {
  student:  { bg: 'var(--accent)', color: 'var(--primary)' },
  provider: { bg: '#F0FDF4', color: '#166534' },
};
const DEVELOPER_ADMIN_EMAIL = 'nachumweinstock@gmail.com';

function publicListingPath(listing, userRow) {
  return providerUrl(userRow?.name, listing?.id, userRow?.username);
}

function publicListingUrl(listing, userRow) {
  const origin = window.location.origin;
  return `${origin}${publicListingPath(listing, userRow)}`;
}

function qrImageUrl(url, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
}

function safeDownloadName(title) {
  const slug = String(title || 'provider')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'provider';
  return `ask-${slug}-qr.png`;
}

function dmPairPath(message) {
  const ids = [Number(message.sender_id), Number(message.receiver_id)].sort((a, b) => a - b);
  return `/admin/dms?pair=${ids.join('-')}`;
}

function hasDmPairIds(message) {
  return Number.isFinite(Number(message.sender_id)) && Number.isFinite(Number(message.receiver_id));
}

function TextSuggestion({ value, onApply }) {
  if (!value || !hasSuggestion(value)) return null;
  const suggestion = suggestText(value);
  return (
    <button type="button" onClick={() => onApply(suggestion)} style={{
      marginTop: 7,
      border: '1px solid #BFDBFE',
      background: '#EFF6FF',
      color: '#1D4ED8',
      borderRadius: 999,
      padding: '5px 10px',
      fontSize: 11.5,
      fontWeight: 800,
      cursor: 'pointer',
      fontFamily: 'var(--font-ui)',
    }}>
      Apply spelling suggestion: {suggestion.slice(0, 70)}{suggestion.length > 70 ? '...' : ''}
    </button>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [hiddenFilter, setHiddenFilter] = useState('include');
  const [activity, setActivity] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [editModal, setEditModal] = useState(null); // { profileId, form }
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [userModal, setUserModal] = useState(null); // user object
  const [userDetail, setUserDetail] = useState(null);
  const [qrModal, setQrModal] = useState(null); // { title, url }
  const [qrBusy, setQrBusy] = useState(false);
  const [qrMessage, setQrMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [surgePercent, setSurgePercent] = useState(0);
  const [salePercent, setSalePercent] = useState(0);
  const isDeveloperAdmin = user?.email?.toLowerCase() === DEVELOPER_ADMIN_EMAIL;

  useEffect(() => {
    if (!user?.is_admin) { navigate('/'); return; }
    loadAdminData().finally(() => setLoading(false));
  }, [user, roleFilter, hiddenFilter]);

  async function loadAdminData() {
    const params = { role: roleFilter, hidden: hiddenFilter };
    const [u, s, d, a, e, surge, sale] = await Promise.all([
      api.get('/admin/users', { params }),
      api.get('/admin/stats'),
      api.get('/admin/duplicates'),
      api.get('/admin/activity'),
      api.get('/admin/email-status'),
      api.get('/admin/surge-pricing'),
      api.get('/admin/site-sale'),
    ]);
    setUsers(u.data);
    setStats(s.data);
    setDuplicates(d.data);
    setActivity(a.data);
    setEmailStatus(e.data);
    setSurgePercent(surge.data.surge_percent || 0);
    setSalePercent(sale.data.first_time_discount_percent || 0);
  }

  async function refreshAdmin() {
    setNotice('');
    await loadAdminData();
    setNotice('Admin data refreshed.');
    setTimeout(() => setNotice(''), 2000);
  }

  async function toggleSurge() {
    try {
      const next = surgePercent === 15 ? 0 : 15;
      const { data } = await api.patch('/admin/surge-pricing', { surge_percent: next });
      setSurgePercent(data.surge_percent);
      setNotice(data.surge_percent ? 'Surge pricing ON — all listings +15%.' : 'Surge pricing OFF.');
      setTimeout(() => setNotice(''), 3000);
    } catch (err) { setNotice(err.response?.data?.error || 'Failed to toggle surge'); }
  }

  async function toggleSale() {
    try {
      const next = salePercent === 15 ? 0 : 15;
      const { data } = await api.patch('/admin/site-sale', { first_time_discount_percent: next });
      setSalePercent(data.first_time_discount_percent);
      setNotice(data.first_time_discount_percent ? 'Finals Sale ON — all listings −15%.' : 'Finals Sale OFF.');
      setTimeout(() => setNotice(''), 3000);
    } catch (err) { setNotice(err.response?.data?.error || 'Failed to toggle sale'); }
  }

  async function cleanupTestUsers() {
    if (!confirm('Delete all Codex smoke/test users? This only removes disposable test accounts.')) return;
    const { data } = await api.delete('/admin/test-users');
    await loadAdminData();
    setNotice(`Deleted ${data.deleted} test user${data.deleted === 1 ? '' : 's'}.`);
  }

  async function sendPrankEmail() {
    if (!confirm('Send a clearly labeled admin prank/test email to both admins?')) return;
    const { data } = await api.post('/admin/prank-email');
    setNotice(data.message || 'Email sent.');
  }

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
      setDuplicates(ds => ds.map(g => ({
        ...g,
        accounts: g.accounts.filter(a => a.id !== id),
      })).filter(g => g.accounts.length > 1));
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  }

  async function mergeInto(sourceId, targetId, sourceName) {
    if (!confirm(`Merge this account into the selected one? All their messages and bookings move to the target account, then the duplicate is deleted.`)) return;
    try {
      await api.post(`/admin/users/${sourceId}/merge-into/${targetId}`);
      setUsers(us => us.filter(u => u.id !== sourceId));
      setDuplicates(ds => ds.map(g => ({
        ...g,
        accounts: g.accounts.filter(a => a.id !== sourceId),
      })).filter(g => g.accounts.length > 1));
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

  async function openEdit(profileId) {
    try {
      const { data } = await api.get(`/providers/${profileId}`);
      const catMap = { 'Torah Studies': 'torah', 'Languages': 'languages', 'Music': 'music' };
      const cat = catMap[data.custom_category] || data.category || 'other';
      setEditError('');
      setEditModal({
        profileId,
        form: {
          category: cat,
          custom_category: data.custom_category || '',
          subcategory: data.subcategory || '',
          bio: data.bio || '',
          price_per_session: data.price_per_session ?? '',
          first_time_discount_percent: discountPercent(data),
          zelle: data.zelle || '',
          venmo: data.venmo || '',
          session_type: data.session_type || 'in-person',
          campus: data.campus || 'WILF',
        },
      });
    } catch { alert('Failed to load listing'); }
  }

  async function openUser(userRow) {
    setUserModal(userRow);
    setUserDetail(null);
    try {
      const { data } = await api.get(`/admin/users/${userRow.id}`);
      setUserDetail(data);
    } catch {
      setUserDetail(null);
    }
  }

  function normalizedAdminQr(title, url) {
    const parsed = new URL(url, window.location.origin);
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      throw new Error('Invalid QR link');
    }
    return {
      title: String(title || 'Provider').slice(0, 120),
      url: parsed.href,
    };
  }

  function openQr(title, url) {
    try {
      setQrMessage('');
      setQrModal(normalizedAdminQr(title, url));
    } catch (err) {
      setNotice(err.message || 'Could not create QR code.');
    }
  }

  async function downloadQrCode(title, url) {
    let safe;
    try {
      safe = normalizedAdminQr(title, url);
      setQrBusy(true);
      setQrMessage('');
      const response = await fetch(qrImageUrl(safe.url, 900));
      if (!response.ok) throw new Error('QR service did not return an image');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = safeDownloadName(safe.title);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setQrMessage('QR downloaded.');
    } catch (err) {
      if (safe?.url) window.open(qrImageUrl(safe.url, 900), '_blank', 'noopener,noreferrer');
      setQrMessage(err.message ? `Download fallback opened: ${err.message}` : 'Download fallback opened.');
    } finally {
      setQrBusy(false);
    }
  }

  async function copyQrLink(url) {
    try {
      const safe = normalizedAdminQr('Provider', url);
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard?.writeText(safe.url);
      setQrMessage('Link copied.');
    } catch {
      setQrMessage('Could not copy link.');
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    setEditError(''); setEditLoading(true);
    const { profileId, form } = editModal;
    const CUSTOM_CAT_MAP = { torah: 'Torah Studies', languages: 'Languages', music: 'Music' };
    const isCustom = !!CUSTOM_CAT_MAP[form.category];
    try {
      await api.put(`/admin/listings/${profileId}`, {
        category: isCustom ? 'other' : form.category,
        custom_category: isCustom ? CUSTOM_CAT_MAP[form.category] : (form.category === 'other' ? form.custom_category : ''),
        subcategory: ['tutor', 'fitness', 'torah', 'languages', 'music'].includes(form.category) ? form.subcategory : '',
        bio: form.bio,
        price_per_session: form.price_per_session === '' ? 0 : Number(form.price_per_session),
        first_time_discount_percent: Number(form.first_time_discount_percent || 0),
        zelle: form.zelle,
        venmo: form.venmo,
        session_type: form.session_type,
        campus: form.session_type === 'zoom' ? null : form.campus,
      });
      setEditModal(null);
    } catch (err) {
      setEditError(err.response?.data?.error || 'Save failed');
    } finally {
      setEditLoading(false);
    }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
    </div>
  );

  return (
    <div className="admin-page" style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, marginBottom: 24, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Operations</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 44, color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1 }}>
            Admin
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>Users, listings, cleanup, imports, and system checks.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isDeveloperAdmin && <button onClick={() => navigate('/admin/analytics')} className="admin-action-btn">Analytics</button>}
          <button onClick={() => navigate('/admin/referrals')} className="admin-action-btn">Referrals</button>
          <button onClick={() => navigate('/admin/dms')} className="admin-action-btn">View DMs</button>
          <button onClick={() => navigate('/admin/support')} className="admin-action-btn">Support inbox</button>
          <button onClick={refreshAdmin} className="admin-action-btn">Refresh</button>
          <button onClick={cleanupTestUsers} className="admin-action-btn danger-soft">Clean Codex users</button>
          <button onClick={sendPrankEmail} className="admin-action-btn">Send admin test email</button>
          <button onClick={toggleSurge} className="admin-action-btn" style={surgePercent ? {
            background: '#92400E', color: '#fff', borderColor: '#92400E', fontWeight: 700,
          } : {}}>
            {surgePercent ? 'Surge ON +15% — Turn Off' : 'Surge Pricing'}
          </button>
          <button onClick={toggleSale} className="admin-action-btn" style={salePercent ? {
            background: '#166534', color: '#fff', borderColor: '#166534', fontWeight: 700,
          } : {}}>
            {salePercent ? 'Finals Sale ON −15% — Turn Off' : 'Finals Sale'}
          </button>
        </div>
      </div>

      {notice && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', fontSize: 13, fontWeight: 600 }}>
          {notice}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="admin-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10, marginBottom: 18 }}>
          {[
            { label: 'Users', value: stats.users },
            { label: 'Providers', value: stats.providers },
            { label: 'Listings', value: stats.listings },
            { label: 'Bookings', value: stats.bookings },
            { label: 'Pending', value: stats.pending_bookings },
            { label: 'Messages', value: stats.messages },
            { label: 'Reviews', value: stats.reviews },
            { label: 'Hidden', value: stats.hidden_test_users },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="admin-overview-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12, marginBottom: 18 }}>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="section-label" style={{ marginBottom: 12 }}>Recent activity</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              ['New users', activity?.users?.map(x => `${x.name} · ${x.email}`) || []],
              ['Bookings', activity?.bookings?.map(x => `${x.student_name} → ${x.provider_name} · ${x.status}`) || []],
              ['Listings', activity?.listings?.map(x => `${x.name} · ${x.custom_category || x.category}`) || []],
            ].map(([title, items]) => (
              <div key={title}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.slice(0, 4).map((item, i) => (
                    <div key={i} style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="section-label" style={{ marginBottom: 12 }}>System</div>
          <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: 'var(--muted)' }}>Email mode</span>
              <strong>{emailStatus?.mode || 'unknown'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: 'var(--muted)' }}>From</span>
              <span style={{ textAlign: 'right', wordBreak: 'break-all' }}>{emailStatus?.from || '—'}</span>
            </div>
            <button onClick={() => api.post('/admin/test-email').then(r => setNotice(r.data.message)).catch(err => setNotice(err.response?.data?.error || 'Email test failed'))} className="admin-action-btn" style={{ marginTop: 6, width: '100%' }}>
              Send verification test
            </button>
          </div>
        </div>
      </div>

      {/* Tools row */}
      <div className="admin-tools-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
            Grant Admin
          </div>
          <BootstrapForm onSuccess={email => {
            setUsers(us => us.map(u => u.email === email ? { ...u, is_admin: 1 } : u));
          }} />
        </div>
        <div className="card" style={{ padding: '18px 20px' }}>
          <ImportCard onImported={() => {
            api.get('/admin/users').then(r => setUsers(r.data)).catch(() => {});
            api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
          }} compact />
        </div>
      </div>

      {/* Duplicate accounts */}
      {duplicates.length > 0 && (
        <div className="card" style={{ padding: '20px 22px', marginBottom: 24, borderColor: '#FED7AA' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#C2410C', marginBottom: 14 }}>
            Duplicate Accounts — {duplicates.length} group{duplicates.length > 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {duplicates.map(group => (
              <div key={group.name}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  {group.name} ({group.count})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {group.accounts.map(a => (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                      border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', flexWrap: 'wrap',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{a.email}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                          ID {a.id} · {a.role} · {new Date(a.created_at).toLocaleDateString()} · {a.bookings_as_student}b · {a.messages_sent}msg
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                        {group.accounts.filter(b => b.id !== a.id).map(target => (
                          <button key={target.id} onClick={() => mergeInto(a.id, target.id, a.email)} style={{
                            fontSize: 11, padding: '3px 9px', borderRadius: 999, cursor: 'pointer',
                            border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#166534', fontFamily: 'var(--font-ui)',
                          }}>
                            Merge → {target.id}
                          </button>
                        ))}
                        <button onClick={() => deleteUser(a.id, a.email)} style={{
                          fontSize: 11, padding: '3px 9px', borderRadius: 999, cursor: 'pointer',
                          border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontFamily: 'var(--font-ui)',
                        }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users list */}
      <div className="card" style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', flex: 1 }}>
            Users ({filtered.length})
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="admin-select">
            <option value="all">All roles</option>
            <option value="student">Students</option>
            <option value="provider">Providers</option>
          </select>
          <select value={hiddenFilter} onChange={e => setHiddenFilter(e.target.value)} className="admin-select">
            <option value="include">Include hidden</option>
            <option value="hide">Hide Codex users</option>
            <option value="only">Only Codex users</option>
          </select>
          <input
            type="text" placeholder="Search name, email, handle..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px',
              fontSize: 13, outline: 'none', background: '#fff', fontFamily: 'var(--font-ui)',
              color: 'var(--text)', width: 200,
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {filtered.map(u => (
            <button key={u.id} onClick={() => openUser(u)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)',
                cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'var(--font-ui)',
                transition: 'border-color .12s, background .12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)'; }}
            >
              {/* Avatar */}
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: 'var(--accent)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
              }}>
                {(u.name || u.email)[0].toUpperCase()}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {u.name}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {u.email}{u.username ? ` · /${u.username}` : ''}
                </div>
              </div>
              {/* Badges */}
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                {u.is_admin && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: '#FEF3C7', color: '#92400E' }}>
                    Admin
                  </span>
                )}
                {u.is_hidden_test ? (
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: '#F3F4F6', color: '#4B5563' }}>
                    Hidden
                  </span>
                ) : null}
                <span style={{
                  fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
                  background: STATUS_COLORS[u.role]?.bg || 'var(--accent)',
                  color: STATUS_COLORS[u.role]?.color || 'var(--primary)',
                }}>
                  {u.role}
                </span>
                {u.rating > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>★ {u.rating.toFixed(1)}</span>
                )}
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{u.bookings_as_student || 0}b · {u.messages_sent || 0}m</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>›</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* User detail modal */}
      {userModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
        }} onClick={e => { if (e.target === e.currentTarget) setUserModal(null); }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: 680,
            maxHeight: '86vh',
            overflowY: 'auto',
            padding: '28px 28px 24px',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
              <div style={{
                width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                background: 'var(--accent)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700,
              }}>
                {(userModal.name || userModal.email)[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{userModal.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{userModal.email}</div>
                <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                    background: STATUS_COLORS[userModal.role]?.bg || 'var(--accent)',
                    color: STATUS_COLORS[userModal.role]?.color || 'var(--primary)',
                  }}>{userModal.role}</span>
                  {userModal.is_admin && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#FEF3C7', color: '#92400E' }}>Admin</span>
                  )}
                  {userModal.rating > 0 && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                      ★ {userModal.rating.toFixed(1)} ({userModal.review_count})
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setUserModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', padding: 2, flexShrink: 0 }}>✕</button>
            </div>

            {/* Meta */}
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 22, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>ID: {userModal.id}</span>
              <span>Joined {new Date(userModal.created_at).toLocaleDateString()}</span>
              {userModal.category && <span>Category: {userModal.custom_category || userModal.category}</span>}
            </div>

            {userDetail ? (
              <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <div className="admin-mini-stat"><strong>{userDetail.listings.length}</strong><span>Listings</span></div>
                  <div className="admin-mini-stat"><strong>{userDetail.bookingsAsStudent.length}</strong><span>Student bookings</span></div>
                  <div className="admin-mini-stat"><strong>{userDetail.bookingsAsProvider.length}</strong><span>Provider bookings</span></div>
                </div>
                {userDetail.listings.length > 0 && (
                  <div>
                    <div className="section-label" style={{ marginBottom: 6 }}>Listings</div>
                    {userDetail.listings.map(l => (
                      <div key={l.id} style={{ fontSize: 12.5, padding: '10px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                          <div style={{ minWidth: 0 }}>
                            <strong>{l.title || l.subcategory || l.custom_category || l.category}</strong>
                            <span style={{ color: 'var(--muted)' }}>
                              {' '}· {l.price_per_session > 0 ? money(discountedPrice(l)) : 'Free'} · {l.session_type}{l.session_type !== 'zoom' ? ` · ${l.campus || 'WILF'}` : ''}
                            </span>
                            {discountPercent(l) > 0 && (
                              <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 800, color: '#166534' }}>
                                {firstTimeDiscountLabel(l)}
                              </span>
                            )}
                            <div style={{ color: 'var(--muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {publicListingUrl(l, userModal)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => window.open(publicListingPath(l, userModal), '_blank')}
                              style={{
                                border: '1px solid var(--border)', background: '#fff', color: 'var(--text)',
                                borderRadius: 7, padding: '5px 8px', fontSize: 11, fontWeight: 700,
                                cursor: 'pointer', fontFamily: 'var(--font-ui)',
                              }}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadQrCode(l.title || l.subcategory || l.custom_category || l.category, publicListingUrl(l, userModal))}
                              disabled={qrBusy}
                              style={{
                                border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8',
                                borderRadius: 7, padding: '5px 8px', fontSize: 11, fontWeight: 800,
                                cursor: qrBusy ? 'wait' : 'pointer', fontFamily: 'var(--font-ui)', opacity: qrBusy ? 0.7 : 1,
                              }}
                            >
                              Download QR
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {userDetail.messages.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                      <div className="section-label">Latest messages</div>
                      <button
                        type="button"
                        onClick={() => window.open(`/admin/dms?user=${userModal.id}`, '_blank')}
                        style={{
                          border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8',
                          borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 800,
                          cursor: 'pointer', fontFamily: 'var(--font-ui)',
                        }}
                      >
                        Read all DMs
                      </button>
                    </div>
                    {userDetail.messages.slice(0, 8).map(m => (
                      <div key={m.id} style={{
                        fontSize: 13,
                        color: 'var(--text)',
                        padding: '10px 0',
                        borderBottom: '1px solid var(--border)',
                        lineHeight: 1.45,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                          <div style={{ minWidth: 0 }}>
                            <strong>{m.sender_name}</strong>
                            <span style={{ color: 'var(--muted)' }}> → {m.receiver_name}</span>
                          </div>
                          {hasDmPairIds(m) && (
                            <button
                              type="button"
                              onClick={() => window.open(dmPairPath(m), '_blank')}
                              style={{
                                border: '1px solid var(--border)', background: '#fff', color: 'var(--text)',
                                borderRadius: 7, padding: '4px 8px', fontSize: 11, fontWeight: 800,
                                cursor: 'pointer', fontFamily: 'var(--font-ui)', flexShrink: 0,
                              }}
                            >
                              Thread
                            </button>
                          )}
                        </div>
                        <div style={{ color: 'var(--ink-700)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                          {redactContactText(m.body)}
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 5 }}>
                          {new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 18 }}>Loading account detail…</div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={() => window.open(`/people/${userModal.id}`, '_blank')} style={{
                  padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-ui)', textAlign: 'left',
                  border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
                }}>
                  Open profile
                </button>
                <button onClick={() => window.open(`/admin/dms?user=${userModal.id}`, '_blank')} style={{
                  padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-ui)', textAlign: 'left',
                  border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
                }}>
                  Read DMs
                </button>
              </div>
              <select value={userModal.role} onChange={async e => {
                const role = e.target.value;
                const { data } = await api.patch(`/admin/users/${userModal.id}`, { role });
                setUsers(us => us.map(u => u.id === userModal.id ? { ...u, role: data.role } : u));
                setUserModal(u => ({ ...u, role: data.role }));
              }} style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.5px solid var(--border)', background: '#fff', fontFamily: 'var(--font-ui)' }}>
                <option value="student">Student</option>
                <option value="provider">Provider</option>
              </select>
              <button onClick={() => {
                toggleAdmin(userModal.id, userModal.is_admin);
                setUserModal(u => ({ ...u, is_admin: !u.is_admin }));
              }} style={{
                width: '100%', padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-ui)', textAlign: 'left',
                border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
              }}>
                {userModal.is_admin ? 'Revoke admin access' : 'Grant admin access'}
              </button>

              {userModal.role === 'provider' && userModal.provider_profile_id && (
                <>
                  <button onClick={() => window.open(publicListingPath({ id: userModal.provider_profile_id }, userModal), '_blank')} style={{
                    width: '100%', padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-ui)', textAlign: 'left',
                    border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
                  }}>
                    Open public provider page
                  </button>
                  <button onClick={() => downloadQrCode(userModal.name, publicListingUrl({ id: userModal.provider_profile_id }, userModal))} disabled={qrBusy} style={{
                    width: '100%', padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                    cursor: qrBusy ? 'wait' : 'pointer', fontFamily: 'var(--font-ui)', textAlign: 'left',
                    border: '1.5px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8',
                    opacity: qrBusy ? 0.7 : 1,
                  }}>
                    Download provider QR code
                  </button>
                  <button onClick={() => openQr(userModal.name, publicListingUrl({ id: userModal.provider_profile_id }, userModal))} style={{
                    width: '100%', padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-ui)', textAlign: 'left',
                    border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
                  }}>
                    Preview QR code
                  </button>
                  <button onClick={() => { openEdit(userModal.provider_profile_id); }} style={{
                    width: '100%', padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-ui)', textAlign: 'left',
                    border: '1.5px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8',
                  }}>
                    Edit listing
                  </button>
                  <button onClick={() => {
                    deleteListing(userModal.provider_profile_id, userModal.name);
                    setUserModal(null);
                  }} style={{
                    width: '100%', padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-ui)', textAlign: 'left',
                    border: '1.5px solid #FED7AA', background: '#FFF7ED', color: '#C2410C',
                  }}>
                    Delete listing
                  </button>
                </>
              )}

              <button onClick={() => {
                deleteUser(userModal.id, userModal.name);
                setUserModal(null);
              }} style={{
                width: '100%', padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-ui)', textAlign: 'left',
                border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626',
              }}>
                Delete user
              </button>
            </div>
          </div>
        </div>
      )}

      {qrModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
        }} onClick={e => { if (e.target === e.currentTarget) setQrModal(null); }}>
          <div className="card" style={{ width: '100%', maxWidth: 360, padding: 24, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16, textAlign: 'left' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{qrModal.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, overflowWrap: 'anywhere' }}>{qrModal.url}</div>
              </div>
              <button onClick={() => setQrModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', padding: 2, flexShrink: 0 }}>✕</button>
            </div>
            <img
              src={qrImageUrl(qrModal.url)}
              alt={`QR code for ${qrModal.title}`}
              style={{ width: 220, height: 220, display: 'block', margin: '0 auto 16px', border: '1px solid var(--border)', borderRadius: 8, padding: 8, background: '#fff' }}
            />
            <button
              type="button"
              onClick={() => downloadQrCode(qrModal.title, qrModal.url)}
              disabled={qrBusy}
              style={{
                width: '100%', padding: '11px 12px', borderRadius: 9, fontSize: 13, fontWeight: 800,
                cursor: qrBusy ? 'wait' : 'pointer', fontFamily: 'var(--font-ui)', marginBottom: 8,
                border: '1.5px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8',
                opacity: qrBusy ? 0.7 : 1,
              }}
            >
              {qrBusy ? 'Downloading...' : 'Download QR code'}
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button type="button" onClick={() => copyQrLink(qrModal.url)} style={{
                padding: '10px 12px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
                border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
              }}>
                Copy link
              </button>
              <button type="button" onClick={() => window.open(qrImageUrl(qrModal.url, 900), '_blank', 'noopener,noreferrer')} style={{
                padding: '10px 12px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
                border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
              }}>
                Open image
              </button>
            </div>
            {qrMessage && (
              <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: qrMessage.includes('Could not') ? '#DC2626' : '#166534' }}>
                {qrMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit listing modal */}
      {editModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
        }} onClick={e => { if (e.target === e.currentTarget) setEditModal(null); }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, padding: '28px 28px 24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Edit Listing</div>
              <button onClick={() => setEditModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', padding: 4 }}>✕</button>
            </div>
            <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Category</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CATEGORIES.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => setEditModal(m => ({ ...m, form: { ...m.form, category: c.id, subcategory: '', custom_category: '' } }))}
                      style={{
                        padding: '5px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                        fontFamily: 'var(--font-ui)', border: '1.5px solid',
                        borderColor: editModal.form.category === c.id ? 'var(--primary)' : 'var(--border)',
                        background: editModal.form.category === c.id ? 'var(--accent)' : '#fff',
                        color: editModal.form.category === c.id ? 'var(--primary)' : 'var(--text)',
                      }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {editModal.form.category === 'other' && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Service name</label>
                  <input value={editModal.form.custom_category}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, custom_category: e.target.value } }))}
                    placeholder="e.g. Photography, Golf Lessons…"
                    spellCheck="true"
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
                  />
                  <TextSuggestion value={editModal.form.custom_category} onApply={value => setEditModal(m => ({ ...m, form: { ...m.form, custom_category: value } }))} />
                </div>
              )}

              {SUBCATEGORY_SUGGESTIONS[editModal.form.category] && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>
                    {{ tutor: 'Subject', languages: 'Language', music: 'Instrument', fitness: 'Sport', torah: 'Topic' }[editModal.form.category]}
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                    {SUBCATEGORY_SUGGESTIONS[editModal.form.category].map(s => (
                      <button key={s} type="button"
                        onClick={() => setEditModal(m => ({ ...m, form: { ...m.form, subcategory: m.form.subcategory === s ? '' : s } }))}
                        style={{
                          padding: '3px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                          fontFamily: 'var(--font-ui)', border: '1.5px solid',
                          borderColor: editModal.form.subcategory === s ? 'var(--primary)' : 'var(--border)',
                          background: editModal.form.subcategory === s ? 'var(--accent)' : '#fff',
                          color: editModal.form.subcategory === s ? 'var(--primary)' : 'var(--text)',
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <input value={editModal.form.subcategory}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, subcategory: e.target.value } }))}
                    placeholder="Or type your own…"
                    spellCheck="true"
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
                  />
                  <TextSuggestion value={editModal.form.subcategory} onApply={value => setEditModal(m => ({ ...m, form: { ...m.form, subcategory: value } }))} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Description</label>
                <textarea value={editModal.form.bio}
                  onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, bio: e.target.value } }))}
                  rows={4} required spellCheck="true"
                  style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <TextSuggestion value={editModal.form.bio} onApply={value => setEditModal(m => ({ ...m, form: { ...m.form, bio: value } }))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Price / session ($)</label>
                  <input type="number" min="0" max="10000" value={editModal.form.price_per_session}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, price_per_session: e.target.value } }))}
                    placeholder="0"
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Session type</label>
                  <select value={editModal.form.session_type}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, session_type: e.target.value, campus: e.target.value === 'zoom' ? 'WILF' : (m.form.campus || 'WILF') } }))}
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', background: '#fff', boxSizing: 'border-box' }}>
                    <option value="in-person">In-person</option>
                    <option value="zoom">Zoom</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              {editModal.form.session_type !== 'zoom' && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Campus</label>
                  <select value={editModal.form.campus || 'WILF'}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, campus: e.target.value } }))}
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', background: '#fff', boxSizing: 'border-box' }}>
                    <option value="WILF">WILF</option>
                    <option value="BEREN">BEREN</option>
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>First time discount</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[0, 15, 20].map(percent => {
                    const active = Number(editModal.form.first_time_discount_percent || 0) === percent;
                    const base = Number(editModal.form.price_per_session || 0);
                    const preview = percent > 0 && base > 0 ? money(Math.round(base * (100 - percent)) / 100) : '';
                    return (
                      <button
                        key={percent}
                        type="button"
                        onClick={() => setEditModal(m => ({ ...m, form: { ...m.form, first_time_discount_percent: percent } }))}
                        style={{
                          border: `1.5px solid ${active ? '#16A34A' : 'var(--border)'}`,
                          background: active ? '#F0FDF4' : '#fff',
                          color: active ? '#166534' : 'var(--text)',
                          borderRadius: 9,
                          padding: '10px 8px',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-ui)',
                          textAlign: 'center',
                          fontWeight: 800,
                        }}
                      >
                        <div style={{ fontSize: 13 }}>{percent === 0 ? 'No discount' : `-${percent}%`}</div>
                        {percent > 0 && (
                          <div style={{ fontSize: 10.5, color: active ? '#166534' : 'var(--muted)', marginTop: 3 }}>
                            First time discount {preview ? `· ${preview}` : ''}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Zelle</label>
                  <input value={editModal.form.zelle}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, zelle: e.target.value } }))}
                    placeholder="Phone or email"
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Venmo</label>
                  <input value={editModal.form.venmo}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, venmo: e.target.value } }))}
                    placeholder="@handle"
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {editError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: '#DC2626' }}>
                  {editError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setEditModal(null)} style={{
                  border: '1.5px solid var(--border)', background: 'none', color: 'var(--muted)',
                  borderRadius: 999, padding: '9px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                }}>
                  Cancel
                </button>
                <button type="submit" disabled={editLoading} style={{
                  background: editLoading ? '#93C5FD' : 'var(--primary)', color: '#fff', border: 'none',
                  borderRadius: 999, padding: '9px 24px', fontSize: 13, fontWeight: 600,
                  cursor: editLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)',
                }}>
                  {editLoading ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CSV helpers ──────────────────────────────────────────────────────────────

const CSV_TEMPLATE = `email,name,category,custom_category,bio,price_per_session,zelle,venmo
yitz@yu.edu,Yitz Cohen,tutor,,I teach Calc I and Orgo. 3 yrs experience.,35,9175551234,yitzcohen
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

function ImportCard({ onImported, compact }) {
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

  const isOpen = compact || open;
  const inner = (
    <>
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => setOpen(o => !o)}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Bulk Import Providers
          </div>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{open ? '▲' : '▼'}</span>
        </div>
      )}
      {compact && (
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
          Bulk Import
        </div>
      )}

      {isOpen && (
        <div style={compact ? {} : { marginTop: 16 }}>
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
    </>
  );

  return compact
    ? inner
    : <div className="card" style={{ padding: '20px 24px' }}>{inner}</div>;
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
