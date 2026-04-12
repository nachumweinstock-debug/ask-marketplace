import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { id: 'tutor',        label: 'Tutors'  },
  { id: 'barber',       label: 'Barbers' },
  { id: 'hebrew tutor', label: 'Hebrew'  },
  { id: 'tennis',       label: 'Fitness' },
  { id: 'other',        label: 'Other'   },
];

const BIO_PLACEHOLDERS = {
  tutor: 'e.g. I tutor Calc 1 & 2 and Orgo. 3 years experience, patient.',
  barber: 'e.g. Fades, lineups, beard trims. Clean cuts right on campus.',
  'hebrew tutor': 'e.g. Rashi, Gemara, conversational Hebrew — all levels.',
  tennis: 'e.g. USTA rated player, great with beginners and intermediates.',
  other: "Describe what you offer and who it's for...",
};

const inputStyle = {
  width: '100%', border: '1.5px solid var(--border)', borderRadius: 8,
  padding: '10px 14px', fontSize: 13.5, outline: 'none',
  background: '#fff', color: 'var(--text)', fontFamily: 'var(--font-ui)',
  transition: 'border-color .15s', boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 500,
  color: 'var(--muted)', marginBottom: 6,
};

export default function CreateListing() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [bio, setBio] = useState('');
  const [price, setPrice] = useState('');
  const [zelle, setZelle] = useState('');
  const [venmo, setVenmo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!category) { setError('Select a category first'); return; }
    setError(''); setLoading(true);
    try {
      await api.post('/providers/become');
      await api.put('/providers/me', { category, bio, price_per_session: price || 0, zelle, venmo });
      await refreshUser();
      navigate('/dashboard/provider?tab=availability&new=1');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 32px 80px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 6 }}>
          Post a listing
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>Takes about 30 seconds.</p>
      </div>

      <div className="card" style={{ padding: '32px 28px' }}>
        <form onSubmit={handleSubmit}>

          {/* Category */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Category</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map(({ id, label }) => {
                const active = category === id;
                return (
                  <button key={id} type="button" onClick={() => setCategory(id)}
                    style={{
                      padding: '8px 20px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                      border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      background: active ? 'var(--primary)' : 'var(--card)',
                      color: active ? '#fff' : 'var(--muted)',
                      cursor: 'pointer', transition: 'all .15s',
                      fontFamily: 'var(--font-ui)',
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bio */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Describe what you offer</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
              placeholder={BIO_PLACEHOLDERS[category] || BIO_PLACEHOLDERS.other}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Price */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Price per session</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13.5, color: 'var(--muted)', fontFamily: 'var(--font-ui)' }}>$</span>
              <input type="number" min="0" placeholder="0" value={price}
                onChange={e => setPrice(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 28 }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5 }}>Leave 0 if free or negotiable</div>
          </div>

          {/* Payment */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>How do students pay you?</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ ...labelStyle, marginBottom: 5 }}>Zelle (phone or email)</div>
                <input type="text" placeholder="646-555-1234" value={zelle}
                  onChange={e => setZelle(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
              <div>
                <div style={{ ...labelStyle, marginBottom: 5 }}>Venmo username</div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-ui)' }}>@</span>
                  <input type="text" placeholder="username" value={venmo}
                    onChange={e => setVenmo(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 26 }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 8, padding: '9px 14px',
              fontSize: 12.5, color: '#DC2626', marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !category} style={{
            width: '100%', background: loading || !category ? '#93C5FD' : 'var(--primary)',
            color: '#fff', border: 'none', borderRadius: 999,
            padding: '12px', fontSize: 14, fontWeight: 600,
            cursor: loading || !category ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-ui)', transition: 'opacity .15s',
          }}>
            {loading ? 'Publishing...' : 'Publish listing'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted)', marginTop: 14 }}>
            Next you'll add your available time slots.
          </p>
        </form>
      </div>
    </div>
  );
}
