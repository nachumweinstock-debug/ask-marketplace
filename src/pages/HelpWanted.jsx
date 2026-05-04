import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'tutor', label: 'Instruction' },
  { id: 'barber', label: 'Barber' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'other', label: 'Other' },
];

const URGENCY_LABELS = { asap: 'ASAP', this_week: 'This week', flexible: 'Flexible' };
const URGENCY_COLORS = { asap: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' }, this_week: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }, flexible: { bg: 'var(--cream-100)', color: 'var(--ink-500)', border: 'var(--cream-200)' } };

export default function HelpWanted() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formCat, setFormCat] = useState('');
  const [budget, setBudget] = useState('');
  const [urgency, setUrgency] = useState('flexible');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchRequests(); }, [category]);

  async function fetchRequests(q) {
    setLoading(true);
    try {
      const params = {};
      if (category !== 'all') params.category = category;
      const s = q !== undefined ? q : search;
      if (s) params.search = s;
      const { data } = await api.get('/help-wanted', { params });
      setRequests(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setError('Give it a title'); return; }
    setError(''); setSubmitting(true);
    try {
      await api.post('/help-wanted', { title, description, category: formCat || null, budget: budget || null, urgency });
      setTitle(''); setDescription(''); setFormCat(''); setBudget(''); setUrgency('flexible');
      setShowForm(false);
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post');
    } finally { setSubmitting(false); }
  }

  async function handleClose(id) {
    if (!confirm('Mark this request as filled?')) return;
    try {
      await api.patch(`/help-wanted/${id}`, { status: 'filled' });
      setRequests(rs => rs.filter(r => r.id !== id));
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this request?')) return;
    try {
      await api.delete(`/help-wanted/${id}`);
      setRequests(rs => rs.filter(r => r.id !== id));
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  }

  function handleSearch(e) {
    e.preventDefault();
    fetchRequests(search);
  }

  return (
    <div className="page" style={{ paddingTop: 56 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }} className="fade-up">
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
            fontSize: 'clamp(40px, 5vw, 56px)', fontWeight: 600,
            color: 'var(--ink-900)', lineHeight: 1.05,
            letterSpacing: '-0.02em', marginBottom: 12,
          }}>
            Help Wanted.
          </h1>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 17, color: 'var(--ink-500)', maxWidth: 480 }}>
            Looking for an instructor, barber, or someone who can help? Post what you need. Providers will find you.
          </p>
        </div>

        {user && (
          <button onClick={() => setShowForm(o => !o)} style={{
            background: showForm ? 'var(--cream-100)' : 'var(--blue-600)',
            color: showForm ? 'var(--ink-900)' : '#fff',
            border: showForm ? '1px solid var(--cream-300)' : 'none',
            borderRadius: 12, padding: '12px 28px',
            fontSize: 15, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
            transition: 'all .15s',
          }}>
            {showForm ? 'Cancel' : '+ Post a request'}
          </button>
        )}
      </div>

      {/* ── Post form ── */}
      {showForm && (
        <div style={{
          background: 'var(--cream-50)', border: '1px solid var(--cream-200)',
          borderRadius: 16, padding: 28, marginBottom: 36,
          animation: 'slideDown 0.2s ease both',
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>WHAT DO YOU NEED?</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Need Calc II help before finals"
                className="input-underline" style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 500 }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>DETAILS <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Times you're available, what level, any preferences..."
                rows={3} className="input-underline" style={{ resize: 'none', lineHeight: 1.6 }}
              />
            </div>

          <div className="helpwanted-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>CATEGORY</label>
                <select value={formCat} onChange={e => setFormCat(e.target.value)} style={{
                  width: '100%', border: 'none', borderBottom: '1px solid var(--cream-300)',
                  padding: '10px 0', fontSize: 14, background: 'transparent',
                  color: formCat ? 'var(--ink-900)' : 'var(--ink-500)',
                  fontFamily: 'var(--font-ui)', outline: 'none', cursor: 'pointer',
                }}>
                  <option value="">Any</option>
                  <option value="tutor">Instruction</option>
                  <option value="barber">Barber</option>
                  <option value="fitness">Fitness</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>BUDGET</label>
                <input value={budget} onChange={e => setBudget(e.target.value)}
                  placeholder="e.g. $20-30/hr" className="input-underline"
                />
              </div>
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>URGENCY</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[
                    { id: 'asap', label: 'ASAP' },
                    { id: 'this_week', label: 'This week' },
                    { id: 'flexible', label: 'Flexible' },
                  ].map(u => (
                    <button key={u.id} type="button" onClick={() => setUrgency(u.id)} style={{
                      flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                      border: `1px solid ${urgency === u.id ? 'var(--blue-600)' : 'var(--cream-200)'}`,
                      background: urgency === u.id ? 'var(--blue-600)' : 'transparent',
                      color: urgency === u.id ? '#fff' : 'var(--ink-500)',
                      cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all .15s',
                    }}>
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12, fontFamily: 'var(--font-ui)' }}>{error}</div>}

            <button type="submit" disabled={submitting} style={{
              background: 'var(--blue-600)', color: '#fff',
              border: 'none', borderRadius: 12, padding: '12px 32px',
              fontSize: 15, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
              opacity: submitting ? 0.6 : 1, transition: 'opacity .15s',
            }}>
              {submitting ? 'Posting...' : 'Post request'}
            </button>
          </form>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', background: 'var(--cream-50)', border: '1px solid var(--cream-300)', borderRadius: 10, height: 44, overflow: 'hidden', maxWidth: 320, flex: 1, minWidth: 200 }}>
          <div style={{ padding: '0 0 0 14px', color: 'var(--ink-500)', display: 'flex', alignItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <input type="text" placeholder="Search requests..." value={search}
            onChange={e => { setSearch(e.target.value); if (!e.target.value) fetchRequests(''); }}
            style={{ flex: 1, border: 'none', padding: '0 12px', height: '100%', fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--ink-900)', fontFamily: 'var(--font-ui)' }}
          />
        </form>
        <div style={{ display: 'flex', gap: 6 }}>
          {CATEGORIES.map(c => {
            const active = category === c.id;
            return (
              <button key={c.id} onClick={() => setCategory(c.id)} style={{
                padding: '7px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                border: `1px solid ${active ? 'var(--blue-600)' : 'var(--cream-200)'}`,
                background: active ? 'var(--blue-600)' : 'var(--cream-50)',
                color: active ? '#fff' : 'var(--ink-500)',
                cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all .15s',
              }}>
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Results ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ background: 'var(--cream-50)', border: '1px solid var(--cream-200)', borderRadius: 14, padding: 22, height: 100 }}>
              <div style={{ width: '40%', height: 16, background: 'var(--cream-200)', borderRadius: 6, marginBottom: 10 }} />
              <div style={{ width: '70%', height: 12, background: 'var(--cream-200)', borderRadius: 6 }} />
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto', fontSize: 28, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 10 }}>
            No open requests.
          </div>
          <div style={{ fontSize: 15, color: 'var(--ink-500)', fontFamily: 'var(--font-ui)' }}>
            {user ? 'Be the first to post what you need.' : 'Sign up to post a request.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map(r => {
            const isOwn = user?.id === r.user_id;
            const urg = URGENCY_COLORS[r.urgency] || URGENCY_COLORS.flexible;
            return (
              <div key={r.id} style={{
                background: 'var(--cream-50)', border: '1px solid var(--cream-200)',
                borderRadius: 14, padding: '20px 24px',
                transition: 'border-color .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--cream-300)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--cream-200)'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  {/* Avatar */}
                  {mediaUrl(r.user_avatar) ? (
                    <img src={mediaUrl(r.user_avatar)} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--cream-200)', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--cream-100)', border: '1px solid var(--cream-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--ink-700)', flexShrink: 0 }}>
                      {initials(r.user_name)}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto', fontSize: 18, fontWeight: 600, color: 'var(--ink-900)' }}>
                        {r.title}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
                        letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 999,
                        background: urg.bg, color: urg.color, border: `1px solid ${urg.border}`,
                      }}>
                        {URGENCY_LABELS[r.urgency]}
                      </span>
                      {r.category && (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
                          letterSpacing: '0.06em', color: 'var(--ink-500)',
                          textTransform: 'uppercase',
                        }}>
                          {r.category}
                        </span>
                      )}
                    </div>

                    {/* Meta */}
                    <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: r.description ? 8 : 0, fontFamily: 'var(--font-ui)' }}>
                      {r.user_name} {r.budget && <span>· Budget: {r.budget}</span>} · {new Date(r.created_at).toLocaleDateString()}
                    </div>

                    {/* Description */}
                    {r.description && (
                      <p style={{ fontSize: 14, color: 'var(--ink-700)', lineHeight: 1.55, margin: 0, fontFamily: 'var(--font-ui)' }}>
                        {r.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                    {!isOwn && user && (
                      <button onClick={() => navigate(`/messages/${r.user_id}`)} style={{
                        fontSize: 13, fontWeight: 500, padding: '7px 16px', borderRadius: 10,
                        background: 'transparent', color: 'var(--blue-600)',
                        border: '1px solid var(--blue-600)', cursor: 'pointer',
                        fontFamily: 'var(--font-ui)', transition: 'all .15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-600)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--blue-600)'; }}
                      >
                        I can help
                      </button>
                    )}
                    {isOwn && (
                      <>
                        <button onClick={() => handleClose(r.id)} style={{
                          fontSize: 12, fontWeight: 500, padding: '6px 12px', borderRadius: 8,
                          background: 'var(--cream-100)', color: 'var(--ink-500)',
                          border: '1px solid var(--cream-200)', cursor: 'pointer',
                          fontFamily: 'var(--font-ui)',
                        }}>
                          Mark filled
                        </button>
                        <button onClick={() => handleDelete(r.id)} style={{
                          fontSize: 12, fontWeight: 500, padding: '6px 10px', borderRadius: 8,
                          background: 'none', color: 'var(--danger)', border: 'none', cursor: 'pointer',
                          fontFamily: 'var(--font-ui)',
                        }}>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
