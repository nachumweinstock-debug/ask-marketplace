import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const BLUE = '#2B6CB0';

const STATUS = {
  pending:   { label: 'Pending',   bg: '#FFF8E6', color: '#92600A' },
  confirmed: { label: 'Confirmed', bg: '#F0FFF4', color: '#166534' },
  completed: { label: 'Completed', bg: '#EBF4FF', color: '#1D4ED8' },
  cancelled: { label: 'Cancelled', bg: '#FFF0F0', color: '#b91c1c' },
};

const CAT_LABELS = { tutor: 'Tutor', barber: 'Barber', 'hebrew tutor': 'Hebrew', tennis: 'Tennis', other: 'Other' };

function ReviewModal({ booking, onClose, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError('');
    try { await onSubmit({ booking_id: booking.id, rating, comment }); onClose(); }
    catch (err) { setError(err.response?.data?.error || 'Failed'); setLoading(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: '24px', width: '100%', maxWidth: 380, border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>Leave a review</div>
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 20 }}>Session with {booking.provider_name}</div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>Rating</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => setRating(n)}
                  style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', opacity: n <= rating ? 1 : 0.3 }}>
                  ⭐
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>Comment (optional)</div>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
              placeholder="How was your session?"
              style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'none', background: '#FAFAFA' }} />
          </div>
          {error && <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 10 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#fff' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px', background: BLUE, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(null);

  useEffect(() => { fetchBookings(); }, []);

  async function fetchBookings() {
    try { const { data } = await api.get('/bookings/mine'); setBookings(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleCancel(id) {
    if (!confirm('Cancel this booking?')) return;
    setCancelLoading(id);
    try {
      await api.patch(`/bookings/${id}`, { status: 'cancelled' });
      setBookings(bs => bs.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setCancelLoading(null); }
  }

  async function handleReview(data) { await api.post('/reviews', data); fetchBookings(); }

  const upcoming = bookings.filter(b => ['pending', 'confirmed'].includes(b.status));
  const past = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 24px 48px' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1A1A2E' }}>My Bookings</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>Welcome back, {user?.name?.split(' ')[0]}</p>
        </div>
        {user?.role !== 'provider' && (
          <button onClick={() => navigate('/create-listing')} style={{
            background: BLUE, color: '#fff', border: 'none',
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            + Post a listing
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8', fontSize: 13 }}>Loading...</div>
      ) : bookings.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#1A1A2E', marginBottom: 6 }}>No bookings yet</div>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>Browse providers and book your first session.</div>
          <Link to="/browse" style={{ display: 'inline-block', background: BLUE, color: '#fff', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
            Browse listings
          </Link>
        </div>
      ) : (
        <div>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: '#64748B', textTransform: 'uppercase', marginBottom: 10 }}>Upcoming</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcoming.map(b => <BookingRow key={b.id} booking={b} onCancel={handleCancel} cancelLoading={cancelLoading} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: '#64748B', textTransform: 'uppercase', marginBottom: 10 }}>Past Sessions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {past.map(b => (
                  <BookingRow key={b.id} booking={b}
                    onReview={b.status === 'completed' && !b.review_id ? () => setReviewTarget(b) : null} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {reviewTarget && (
        <ReviewModal booking={reviewTarget} onClose={() => setReviewTarget(null)} onSubmit={handleReview} />
      )}
    </div>
  );
}

function BookingRow({ booking, onCancel, cancelLoading, onReview }) {
  const s = STATUS[booking.status] || STATUS.pending;
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link to={`/providers/${booking.provider_profile_id}`}
          style={{ fontSize: 14, fontWeight: 500, color: '#1A1A2E', textDecoration: 'none' }}>
          {booking.provider_name}
        </Link>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
          {CAT_LABELS[booking.category] || booking.category} · {new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {booking.start_time}–{booking.end_time}
        </div>
        {booking.price_per_session > 0 && (
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Pay ${booking.price_per_session} via Zelle/Venmo</div>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color }}>
          {s.label}
        </span>
        <div style={{ marginTop: 6, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {onCancel && booking.status !== 'cancelled' && (
            <button onClick={() => onCancel(booking.id)} disabled={cancelLoading === booking.id}
              style={{ fontSize: 11, color: '#b91c1c', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Cancel
            </button>
          )}
          {onReview && (
            <button onClick={onReview}
              style={{ fontSize: 11, color: '#2B6CB0', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
