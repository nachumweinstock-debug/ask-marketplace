import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const BLUE = '#2B6CB0';

const CATEGORY_LABELS = {
  tutor: 'Tutor', barber: 'Barber', 'hebrew tutor': 'Hebrew Tutor', tennis: 'Tennis', other: 'Other',
};

function StarRating({ rating }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ fontSize: 14, color: n <= rating ? '#F59E0B' : '#E2E8F0' }}>★</span>
      ))}
    </div>
  );
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
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
    setBookingLoading(true);
    setBookingError('');
    setBookingSuccess('');
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
    <div style={{ textAlign: 'center', padding: '64px 24px' }}>
      <div style={{ width: 28, height: 28, border: `2px solid ${BLUE}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
    </div>
  );

  if (!provider) return null;

  const groupedSlots = provider.availability.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 24px 48px' }}>

      {/* Profile card */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {provider.avatar_url ? (
            <img src={provider.avatar_url} alt={provider.name}
              style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', flexShrink: 0, border: '1px solid #E2E8F0' }} />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: 12, background: '#EBF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: BLUE, fontWeight: 700, fontSize: 28, flexShrink: 0 }}>
              {initials(provider.name)}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', marginBottom: 6 }}>{provider.name}</h1>
                <span style={{ display: 'inline-block', background: '#EBF4FF', color: BLUE, fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20 }}>
                  {CATEGORY_LABELS[provider.category] || provider.category}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E' }}>
                  {provider.price_per_session > 0 ? `$${provider.price_per_session}` : 'Free'}
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>per session</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <StarRating rating={Math.round(provider.rating)} />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A2E' }}>
                {provider.rating > 0 ? provider.rating.toFixed(1) : 'No reviews yet'}
              </span>
              {provider.review_count > 0 && (
                <span style={{ fontSize: 12, color: '#94A3B8' }}>· {provider.review_count} review{provider.review_count !== 1 ? 's' : ''}</span>
              )}
            </div>

            {provider.bio && (
              <p style={{ fontSize: 13, color: '#64748B', marginTop: 10, lineHeight: 1.6 }}>{provider.bio}</p>
            )}

            {(provider.zelle || provider.venmo) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {provider.zelle && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 8, padding: '5px 10px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#5B21B6' }}>Zelle: {provider.zelle}</span>
                  </div>
                )}
                {provider.venmo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EBF4FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '5px 10px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: BLUE }}>Venmo: @{provider.venmo}</span>
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
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            📅 Available Slots
          </h2>
          {Object.keys(groupedSlots).length === 0 ? (
            <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '24px 0' }}>
              No availability yet. Check back later!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Object.entries(groupedSlots).map(([date, slots]) => (
                <div key={date}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {slots.map(slot => (
                      <button
                        key={slot.id}
                        onClick={() => setBooking(booking === slot.id ? null : slot.id)}
                        style={{
                          padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                          border: `2px solid ${booking === slot.id ? BLUE : '#E2E8F0'}`,
                          background: booking === slot.id ? BLUE : '#fff',
                          color: booking === slot.id ? '#fff' : '#1A1A2E',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {slot.start_time} – {slot.end_time}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {bookingError && (
            <div style={{ background: '#FFF0F0', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#b91c1c', marginTop: 12 }}>
              {bookingError}
            </div>
          )}
          {bookingSuccess && (
            <div style={{ background: '#F0FFF4', border: '1px solid #86EFAC', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#166534', marginTop: 12 }}>
              {bookingSuccess}
            </div>
          )}

          {Object.keys(groupedSlots).length > 0 && (
            <button
              onClick={handleBook}
              disabled={!booking || bookingLoading}
              style={{
                marginTop: 16, width: '100%', background: !booking || bookingLoading ? '#93C5FD' : BLUE,
                color: '#fff', border: 'none', borderRadius: 10, padding: '12px',
                fontSize: 14, fontWeight: 500, cursor: !booking || bookingLoading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {bookingLoading ? 'Booking...' : booking ? 'Book This Slot' : 'Select a Slot to Book'}
            </button>
          )}

          {!user && (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 10 }}>
              <a href="/login" style={{ color: BLUE }}>Log in</a> to book a session
            </p>
          )}
        </div>

        {/* Reviews */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            💬 Reviews
          </h2>
          {provider.reviews.length === 0 ? (
            <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '24px 0' }}>
              No reviews yet
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {provider.reviews.map((r, i) => (
                <div key={r.id} style={{ borderBottom: i < provider.reviews.length - 1 ? '1px solid #F1F5F9' : 'none', paddingBottom: i < provider.reviews.length - 1 ? 16 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#64748B' }}>
                        👤
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A2E' }}>{r.student_name}</span>
                    </div>
                    <StarRating rating={r.rating} />
                  </div>
                  {r.comment && <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6, marginTop: 4 }}>{r.comment}</p>}
                  <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
