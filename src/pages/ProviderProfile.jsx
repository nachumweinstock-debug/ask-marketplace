import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';

const CATEGORY_LABELS = {
  tutor: 'Tutor', barber: 'Barber', 'hebrew tutor': 'Hebrew Tutor', tennis: 'Tennis', other: 'Other',
};

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function Stars({ rating }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ fontSize: 13, color: n <= rating ? '#F59E0B' : '#E5E0D8' }}>★</span>
      ))}
    </div>
  );
}

export default function ProviderProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');

  useEffect(() => {
    api.get(`/providers/${id}`)
      .then(({ data }) => setProvider(data))
      .catch(() => navigate('/browse'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleBook() {
    if (!user) return navigate('/login');
    if (!booking) return setBookingError('Please select a time slot.');
    setBookingLoading(true); setBookingError(''); setBookingSuccess('');
    try {
      await api.post('/bookings', { availability_id: booking });
      setBookingSuccess('Booking requested! Check your dashboard.');
      setProvider(p => ({ ...p, availability: p.availability.filter(s => s.id !== booking) }));
      setBooking(null);
    } catch (err) {
      setBookingError(err.response?.data?.error || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
    </div>
  );
  if (!provider) return null;

  const groupedSlots = provider.availability.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '48px 32px 80px' }}>

      {/* Back */}
      <Link to="/browse" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none', display: 'inline-block', marginBottom: 28 }}
        onMouseEnter={e => e.target.style.color = 'var(--text)'}
        onMouseLeave={e => e.target.style.color = 'var(--muted)'}
      >
        ← Back to browse
      </Link>

      {/* Profile header */}
      <div className="card" style={{ padding: '28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {mediaUrl(provider.avatar_url) ? (
            <img src={mediaUrl(provider.avatar_url)} alt={provider.name}
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} />
          ) : (
            <div style={{
              width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
              background: 'var(--accent)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 26, fontFamily: 'var(--font-ui)',
            }}>
              {initials(provider.name)}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.3px' }}>
                  {provider.name}
                </h1>
                <span style={{
                  display: 'inline-block', background: 'var(--accent)', color: 'var(--primary)',
                  fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 999,
                }}>
                  {CATEGORY_LABELS[provider.category] || provider.category}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)' }}>
                  {provider.price_per_session > 0 ? `$${provider.price_per_session}` : 'Free'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>per session</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <Stars rating={Math.round(provider.rating)} />
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                {provider.rating > 0 ? provider.rating.toFixed(1) : 'No reviews yet'}
              </span>
              {provider.review_count > 0 && (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {provider.review_count} review{provider.review_count !== 1 ? 's' : ''}</span>
              )}
            </div>

            {provider.bio && (
              <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 12, lineHeight: 1.65, maxWidth: 560 }}>
                {provider.bio}
              </p>
            )}

            {(provider.zelle || provider.venmo) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                {provider.zelle && (
                  <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: '#5B21B6' }}>
                    Zelle: {provider.zelle}
                  </div>
                )}
                {provider.venmo && (
                  <div style={{ background: 'var(--accent)', border: '1px solid #BFDBFE', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: 'var(--primary)' }}>
                    Venmo: @{provider.venmo}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slots + Reviews */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>

        {/* Availability */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 18 }}>
            Available Slots
          </div>

          {Object.keys(groupedSlots).length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '28px 0' }}>
              No availability yet. Check back later.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {Object.entries(groupedSlots).map(([date, slots]) => (
                <div key={date}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {slots.map(slot => (
                      <button key={slot.id} onClick={() => setBooking(booking === slot.id ? null : slot.id)}
                        style={{
                          padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                          border: `1.5px solid ${booking === slot.id ? 'var(--primary)' : 'var(--border)'}`,
                          background: booking === slot.id ? 'var(--primary)' : 'var(--card)',
                          color: booking === slot.id ? '#fff' : 'var(--text)',
                          cursor: 'pointer', transition: 'all .15s',
                          fontFamily: 'var(--font-ui)',
                        }}>
                        {slot.start_time} – {slot.end_time}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {bookingError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '9px 14px', fontSize: 12, color: '#DC2626', marginTop: 16 }}>
              {bookingError}
            </div>
          )}
          {bookingSuccess && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '9px 14px', fontSize: 12, color: '#166534', marginTop: 16 }}>
              {bookingSuccess}
            </div>
          )}

          {Object.keys(groupedSlots).length > 0 && (
            <button onClick={handleBook} disabled={!booking || bookingLoading}
              style={{
                marginTop: 20, width: '100%',
                background: !booking || bookingLoading ? '#93C5FD' : 'var(--primary)',
                color: '#fff', border: 'none', borderRadius: 999,
                padding: '12px', fontSize: 14, fontWeight: 600,
                cursor: !booking || bookingLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-ui)', transition: 'opacity .15s',
              }}>
              {bookingLoading ? 'Booking...' : booking ? 'Book This Slot' : 'Select a Slot to Book'}
            </button>
          )}

          {!user && (
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
              <Link to="/login" style={{ color: 'var(--primary)' }}>Log in</Link> to book a session
            </p>
          )}
        </div>

        {/* Reviews */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 18 }}>
            Reviews
          </div>
          {provider.reviews.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '28px 0' }}>
              No reviews yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {provider.reviews.map((r, i) => (
                <div key={r.id} style={{ borderBottom: i < provider.reviews.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: i < provider.reviews.length - 1 ? 18 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.student_name}</span>
                    <Stars rating={r.rating} />
                  </div>
                  {r.comment && <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>{r.comment}</p>}
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, opacity: 0.7 }}>{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
