import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Star, Clock, CheckCircle, XCircle, AlertCircle, Briefcase } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: AlertCircle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  confirmed: { label: 'Confirmed', icon: CheckCircle, color: 'text-green-700 bg-green-50 border-green-200' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'text-slate-600 bg-slate-50 border-slate-200' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
};

const CATEGORY_LABELS = {
  tutor: 'Tutor', barber: 'Barber', 'hebrew tutor': 'Hebrew Tutor', tennis: 'Tennis', other: 'Other',
};

function ReviewModal({ booking, onClose, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSubmit({ booking_id: booking.id, rating, comment });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="font-bold text-lg text-slate-900 mb-1">Review Session</h3>
        <p className="text-slate-500 text-sm mb-5">With {booking.provider_name}</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setRating(n)}>
                  <Star size={28} className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} />
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Comment (optional)</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="How was your session?" rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(null);
  function handleBecomeProvider() {
    navigate('/create-listing');
  }

  useEffect(() => { fetchBookings(); }, []);

  async function fetchBookings() {
    try {
      const { data } = await api.get('/bookings/mine');
      setBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(bookingId) {
    if (!confirm('Cancel this booking?')) return;
    setCancelLoading(bookingId);
    try {
      await api.patch(`/bookings/${bookingId}`, { status: 'cancelled' });
      setBookings(bs => bs.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setCancelLoading(null);
    }
  }

  async function handleReview(data) {
    await api.post('/reviews', data);
    fetchBookings();
  }

  const upcoming = bookings.filter(b => ['pending', 'confirmed'].includes(b.status));
  const past = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
          <p className="text-slate-500 mt-1">Welcome back, {user?.name?.split(' ')[0]}</p>
        </div>
        {user?.role !== 'provider' && (
          <button
            onClick={handleBecomeProvider}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0"
          >
            <Briefcase size={16} />
            Offer Services
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No bookings yet</h3>
          <p className="text-slate-500 mb-5 text-sm">Browse providers and book your first session.</p>
          <Link to="/browse" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
            Browse Providers
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map(b => (
                  <BookingCard key={b.id} booking={b} onCancel={handleCancel} cancelLoading={cancelLoading} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Past Sessions</h2>
              <div className="space-y-3">
                {past.map(b => (
                  <BookingCard key={b.id} booking={b}
                    onReview={b.status === 'completed' && !b.review_id ? () => setReviewTarget(b) : null} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {reviewTarget && (
        <ReviewModal booking={reviewTarget} onClose={() => setReviewTarget(null)} onSubmit={handleReview} />
      )}
    </div>
  );
}

function BookingCard({ booking, onCancel, cancelLoading, onReview }) {
  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <Calendar size={20} className="text-blue-600" />
          </div>
          <div>
            <Link to={`/providers/${booking.provider_profile_id}`} className="font-semibold text-slate-900 hover:text-blue-600">
              {booking.provider_name}
            </Link>
            <div className="text-slate-500 text-sm">{CATEGORY_LABELS[booking.category] || booking.category}</div>
            <div className="flex items-center gap-1.5 mt-1.5 text-slate-600 text-sm">
              <Clock size={13} />
              {new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              · {booking.start_time} – {booking.end_time}
            </div>
            {booking.price_per_session > 0 && (
              <div className="text-slate-500 text-xs mt-1">Pay ${booking.price_per_session} via Zelle/Venmo</div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
            <Icon size={12} /> {cfg.label}
          </span>
          {onCancel && booking.status !== 'cancelled' && (
            <button onClick={() => onCancel(booking.id)} disabled={cancelLoading === booking.id}
              className="text-xs text-red-500 hover:underline disabled:opacity-50">Cancel</button>
          )}
          {onReview && (
            <button onClick={onReview} className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
              <Star size={12} /> Leave a review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
