import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const BLUE = '#2B6CB0';
const INPUT = {
  width: '100%', border: '1px solid #E2E8F0', borderRadius: 8,
  padding: '10px 12px', fontSize: 13, outline: 'none',
  background: '#fff', color: '#1A1A2E',
};
const LABEL = { fontSize: 12, fontWeight: 500, color: '#64748B', marginBottom: 5, display: 'block' };

const CATEGORIES = [
  { id: 'tutor',        label: 'Tutors',   emoji: '📚' },
  { id: 'barber',       label: 'Barbers',  emoji: '✂️' },
  { id: 'hebrew tutor', label: 'Hebrew',   emoji: '✡️' },
  { id: 'tennis',       label: 'Tennis',   emoji: '🎾' },
  { id: 'other',        label: 'Other',    emoji: '💼' },
];

const BIO_PLACEHOLDERS = {
  tutor: 'e.g. I tutor Calc 1 & 2 and Orgo. 3 years experience, patient.',
  barber: 'e.g. Fades, lineups, beard trims. Clean cuts right on campus.',
  'hebrew tutor': 'e.g. Rashi, Gemara, conversational Hebrew — all levels.',
  tennis: 'e.g. USTA rated player, great with beginners and intermediates.',
  other: 'Describe what you offer and who it\'s for...',
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
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 24px 48px' }}>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1A1A2E' }}>Post a listing</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>Takes about 30 seconds.</p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '24px' }}>
        <form onSubmit={handleSubmit}>

          {/* Category */}
          <div style={{ marginBottom: 20 }}>
            <label style={LABEL}>Category</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {CATEGORIES.map(({ id, label, emoji }) => {
                const active = category === id;
                return (
                  <button key={id} type="button" onClick={() => setCategory(id)}
                    style={{
                      padding: '12px 8px', border: `1px solid ${active ? BLUE : '#E2E8F0'}`,
                      borderRadius: 8, textAlign: 'center', cursor: 'pointer',
                      background: active ? '#EBF4FF' : '#fff', transition: 'all 0.15s',
                    }}>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{emoji}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: active ? BLUE : '#64748B' }}>{label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bio */}
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Describe what you offer</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
              placeholder={BIO_PLACEHOLDERS[category] || BIO_PLACEHOLDERS.other}
              style={{ ...INPUT, resize: 'none', lineHeight: 1.5 }} />
          </div>

          {/* Price */}
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Price per session</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#64748B' }}>$</span>
              <input type="number" min="0" placeholder="0" value={price}
                onChange={e => setPrice(e.target.value)}
                style={{ ...INPUT, paddingLeft: 24 }} />
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Leave 0 if free or negotiable</div>
          </div>

          {/* Payment */}
          <div style={{ marginBottom: 20 }}>
            <label style={LABEL}>How do students pay you?</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ ...LABEL, marginBottom: 4 }}>Zelle (phone or email)</div>
                <input type="text" placeholder="646-555-1234" value={zelle}
                  onChange={e => setZelle(e.target.value)} style={INPUT} />
              </div>
              <div>
                <div style={{ ...LABEL, marginBottom: 4 }}>Venmo username</div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#64748B' }}>@</span>
                  <input type="text" placeholder="username" value={venmo}
                    onChange={e => setVenmo(e.target.value)}
                    style={{ ...INPUT, paddingLeft: 22 }} />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ background: '#FFF0F0', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#b91c1c', marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !category} style={{
            width: '100%', background: loading || !category ? '#93C5FD' : BLUE,
            color: '#fff', border: 'none', borderRadius: 8, padding: 12,
            fontSize: 14, fontWeight: 500, cursor: loading || !category ? 'not-allowed' : 'pointer',
          }}>
            {loading ? 'Publishing...' : '+ Publish listing'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 12 }}>
            Next you'll add your available time slots.
          </p>
        </form>
      </div>
    </div>
  );
}
