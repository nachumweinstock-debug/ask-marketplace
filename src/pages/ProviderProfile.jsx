import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, DollarSign, Calendar, Clock, MessageCircle, Smartphone, User } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const CATEGORY_LABELS = {
  tutor: 'Tutor', barber: 'Barber', 'hebrew tutor': 'Hebrew Tutor', tennis: 'Tennis', other: 'Other',
};

function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={14} className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 fill-slate-300'} />
      ))}
    </div>
  );
}

function Initials({ name }) {
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
    if (user.role !== 'student') return setBookingError('Only students can book sessions.');
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
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
    </div>
  );

  if (!provider) return null;

  const groupedSlots = provider.availability.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-5">
          {provider.avatar_url ? (
            <img src={provider.avatar_url} alt={provider.name} className="w-24 h-24 rounded-2xl object-cover shrink-0 border border-slate-200" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-3xl shrink-0">
              <Initials name={provider.name} />
            </div>
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{provider.name}</h1>
                <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full mt-1">
                  {CATEGORY_LABELS[provider.category] || provider.category}
                </span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-900">
                  {provider.price_per_session > 0 ? `$${provider.price_per_session}` : 'Free'}
                </div>
                <div className="text-slate-400 text-sm">per session</div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <StarRating rating={Math.round(provider.rating)} />
              <span className="text-slate-700 font-medium text-sm">
                {provider.rating > 0 ? provider.rating.toFixed(1) : 'No reviews yet'}
              </span>
              {provider.review_count > 0 && (
                <span className="text-slate-400 text-sm">· {provider.review_count} review{provider.review_count !== 1 ? 's' : ''}</span>
              )}
            </div>
            {provider.bio && <p className="text-slate-600 mt-3 text-sm leading-relaxed">{provider.bio}</p>}
            {(provider.zelle || provider.venmo) && (
              <div className="flex flex-wrap gap-3 mt-4">
                {provider.zelle && (
                  <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2">
                    <Smartphone size={14} className="text-violet-600" />
                    <span className="text-xs font-medium text-violet-700">Zelle: {provider.zelle}</span>
                  </div>
                )}
                {provider.venmo && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                    <Smartphone size={14} className="text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">Venmo: @{provider.venmo}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-5 gap-6">
        <div className="sm:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" /> Available Slots
            </h2>
            {Object.keys(groupedSlots).length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No availability yet. Check back later!</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedSlots).map(([date, slots]) => (
                  <div key={date}>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {slots.map(slot => (
                        <button
                          key={slot.id}
                          onClick={() => setBooking(booking === slot.id ? null : slot.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                            booking === slot.id
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <Clock size={13} />
                          {slot.start_time} – {slot.end_time}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {bookingError && <p className="text-red-600 text-sm mt-3 bg-red-50 rounded-lg px-3 py-2">{bookingError}</p>}
            {bookingSuccess && <p className="text-green-700 text-sm mt-3 bg-green-50 rounded-lg px-3 py-2">{bookingSuccess}</p>}
            {Object.keys(groupedSlots).length > 0 && (
              <button
                onClick={handleBook}
                disabled={!booking || bookingLoading}
                className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bookingLoading ? 'Booking...' : booking ? 'Book This Slot' : 'Select a Slot to Book'}
              </button>
            )}
            {!user && (
              <p className="text-center text-slate-500 text-xs mt-2">
                <a href="/login" className="text-blue-600 hover:underline">Log in</a> to book a session
              </p>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MessageCircle size={18} className="text-blue-600" /> Reviews
            </h2>
            {provider.reviews.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No reviews yet</p>
            ) : (
              <div className="space-y-4">
                {provider.reviews.map(r => (
                  <div key={r.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center">
                          <User size={12} className="text-slate-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{r.student_name}</span>
                      </div>
                      <StarRating rating={r.rating} />
                    </div>
                    {r.comment && <p className="text-slate-500 text-sm leading-relaxed">{r.comment}</p>}
                    <p className="text-slate-300 text-xs mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
