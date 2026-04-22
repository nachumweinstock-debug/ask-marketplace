import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';
import { fmtTime, fmtDay, DAYS } from '../lib/slots';
import CategoryPill, { SessionTypePill } from '../components/CategoryPill';
import MiniCalendar from '../components/MiniCalendar';

function ShareButton({ providerId }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/providers/${providerId}`;
  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={handleCopy} style={{
      fontSize: 12, fontWeight: 600, color: copied ? '#166534' : 'var(--primary)',
      background: copied ? '#F0FDF4' : 'var(--accent)',
      border: `1.5px solid ${copied ? '#BBF7D0' : '#BFDBFE'}`,
      borderRadius: 999, padding: '5px 14px',
      cursor: 'pointer', fontFamily: 'var(--font-ui)',
      transition: 'all .15s',
    }}>
      {copied ? '✓ Copied!' : '🔗 Copy link'}
    </button>
  );
}

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
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otherListings, setOtherListings] = useState([]);
  const [booking, setBooking] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    setOtherListings([]);
    api.get(`/providers/${id}`)
      .then(({ data }) => {
        setProvider(data);
        // Fetch other listings by same user
        api.get(`/providers/by-user/${data.user_id}`)
          .then(({ data: all }) => setOtherListings(all.filter(l => l.id !== data.id)))
          .catch(() => {});
      })
      .catch(() => navigate('/browse'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDeleteListing() {
    if (!confirm('Delete your listing? This removes all your availability, bookings, and reviews. Cannot be undone.')) return;
    setDeleteLoading(true);
    try {
      await api.delete('/providers/me');
      await refreshUser();
      navigate('/dashboard/student');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete listing');
      setDeleteLoading(false);
    }
  }

  const redirectParam = `?redirect=/providers/${id}`;

  function handleMessage() {
    if (!user) return navigate(`/signup${redirectParam}`);
    navigate(`/messages/${provider.user_id}`);
  }

  async function handleBook() {
    if (!user) return navigate(`/signup${redirectParam}`);
    if (!booking) return setBookingError('Please select a time slot.');
    setBookingLoading(true); setBookingError(''); setBookingSuccess('');
    try {
      await api.post('/bookings', { availability_id: booking });
      setBookingSuccess('Booking requested! Check your dashboard.');
      setProvider(p => ({ ...p, availability: p.availability.filter(s => s.id !== booking) }));
      setBooking(null);
    } catch (err) {
      console.error('[booking]', err.response?.status, err.response?.data);
      setBookingError(err.response?.data?.error || `Booking failed (${err.response?.status || 'network error'})`);
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

  const isOwner = user && user.id === provider.user_id;

  // Separate real calendar dates from legacy day-name slots
  const realSlots    = provider.availability.filter(s => /^\d{4}/.test(s.date));
  const legacySlots  = provider.availability.filter(s => DAYS.includes(s.date));
  const availDates   = new Set(realSlots.map(s => s.date));
  const slotsForDate = selectedDate ? realSlots.filter(s => s.date === selectedDate) : [];

  // Legacy slots grouped by day name (backward compat)
  const groupedLegacy = legacySlots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  return (
    <div className="page" style={{ maxWidth: 840 }}>

      {/* Back */}
      <Link to="/browse" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none', display: 'inline-block', marginBottom: 28 }}
        onMouseEnter={e => e.target.style.color = 'var(--text)'}
        onMouseLeave={e => e.target.style.color = 'var(--muted)'}
      >
        ← Back to browse
      </Link>

      {/* Profile header */}
      <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
        {/* Listing cover image */}
        {provider.listing_image && (
          <img src={provider.listing_image} alt="listing cover"
            style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
        )}
        {/* Owner controls */}
        {isOwner && (
          <div style={{
            padding: '10px 20px', background: 'var(--bg)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', flexGrow: 1 }}>This is your listing</span>
            <ShareButton providerId={id} />
            <Link to="/dashboard/provider?tab=availability" style={{
              fontSize: 12, fontWeight: 600, color: 'var(--primary)',
              textDecoration: 'none', padding: '5px 14px',
              border: '1.5px solid var(--primary)', borderRadius: 999,
            }}>
              Edit listing
            </Link>
            <button onClick={handleDeleteListing} disabled={deleteLoading} style={{
              fontSize: 12, fontWeight: 600, color: '#DC2626', background: 'none',
              border: '1.5px solid #FECACA', borderRadius: 999, padding: '5px 14px',
              cursor: deleteLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)',
              opacity: deleteLoading ? 0.6 : 1,
            }}>
              {deleteLoading ? 'Deleting...' : 'Delete listing'}
            </button>
          </div>
        )}
      <div style={{ padding: '28px' }}>
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
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <CategoryPill category={provider.category} customCategory={provider.custom_category} size="md" />
                  <SessionTypePill sessionType={provider.session_type} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)' }}>
                  {provider.price_per_session > 0 ? `$${provider.price_per_session}` : 'Free'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>per session</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <Stars rating={Math.round(provider.rating)} />
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                {provider.rating > 0 ? provider.rating.toFixed(1) : 'No reviews yet'}
              </span>
              {provider.review_count > 0 && (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {provider.review_count} review{provider.review_count !== 1 ? 's' : ''}</span>
              )}
              {provider.completed_sessions > 0 && (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  · <strong style={{ color: 'var(--text)' }}>{provider.completed_sessions}</strong> session{provider.completed_sessions !== 1 ? 's' : ''} completed
                </span>
              )}
            </div>

            {provider.bio && (
              <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 12, lineHeight: 1.65, maxWidth: 560 }}>
                {provider.bio}
              </p>
            )}

            {!isOwner && (
              <div style={{ marginTop: 16 }}>
                <button onClick={handleMessage} style={{
                  padding: '9px 22px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                  background: 'var(--primary)', color: '#fff', border: 'none',
                  cursor: 'pointer', fontFamily: 'var(--font-ui)',
                }}>
                  Message {provider.name.split(' ')[0]}
                </button>
              </div>
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
      </div>

      {/* Slots + Reviews */}
      <div className="grid-3-2">

        {/* Availability */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 18 }}>
            Book a Session
          </div>

          {provider.availability.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '28px 0' }}>
              No availability yet. Check back later.
            </p>
          ) : (
            <>
              {/* Calendar — for real date slots */}
              {realSlots.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <MiniCalendar
                    markedDates={availDates}
                    selectedDates={selectedDate ? new Set([selectedDate]) : new Set()}
                    onSelect={d => { setSelectedDate(d === selectedDate ? null : d); setBooking(null); }}
                    onlyMarked={true}
                    disablePast={true}
                  />

                  {/* Time slots for selected date */}
                  {selectedDate && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'long', month: 'long', day: 'numeric',
                        })}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {slotsForDate.map(slot => (
                          <button key={slot.id}
                            onClick={() => setBooking(booking === slot.id ? null : slot.id)}
                            style={{
                              padding: '8px 18px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                              border: `1.5px solid ${booking === slot.id ? 'var(--primary)' : 'var(--border)'}`,
                              background: booking === slot.id ? 'var(--primary)' : 'var(--card)',
                              color: booking === slot.id ? '#fff' : 'var(--text)',
                              cursor: 'pointer', transition: 'all .15s',
                              fontFamily: 'var(--font-ui)',
                            }}>
                            {fmtTime(slot.start_time)} – {fmtTime(slot.end_time)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!selectedDate && (
                    <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 12, textAlign: 'center' }}>
                      Pick a highlighted date to see available times
                    </p>
                  )}
                </div>
              )}

              {/* Legacy day-name slots */}
              {legacySlots.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: realSlots.length > 0 ? 12 : 0 }}>
                  {realSlots.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: 14, fontWeight: 500 }}>
                      Also available (recurring weekly)
                    </div>
                  )}
                  {Object.entries(groupedLegacy).map(([day, slots]) => (
                    <div key={day}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                        {day}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {slots.map(slot => (
                          <button key={slot.id}
                            onClick={() => setBooking(booking === slot.id ? null : slot.id)}
                            style={{
                              padding: '7px 16px', borderRadius: 999, fontSize: 12.5, fontWeight: 500,
                              border: `1.5px solid ${booking === slot.id ? 'var(--primary)' : 'var(--border)'}`,
                              background: booking === slot.id ? 'var(--primary)' : 'var(--card)',
                              color: booking === slot.id ? '#fff' : 'var(--text)',
                              cursor: 'pointer', transition: 'all .15s', fontFamily: 'var(--font-ui)',
                            }}>
                            {fmtTime(slot.start_time)} – {fmtTime(slot.end_time)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
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

          {provider.availability.length > 0 && (
            <button onClick={handleBook} disabled={!booking || bookingLoading}
              style={{
                marginTop: 20, width: '100%',
                background: !booking || bookingLoading ? '#93C5FD' : 'var(--primary)',
                color: '#fff', border: 'none', borderRadius: 999,
                padding: '12px', fontSize: 14, fontWeight: 600,
                cursor: !booking || bookingLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-ui)', transition: 'opacity .15s',
              }}>
              {bookingLoading ? 'Booking...' : booking ? 'Request Booking' : 'Select a time to book'}
            </button>
          )}

          {!user && (
            <div style={{
              marginTop: 20, background: 'var(--accent)',
              border: '1.5px solid #BFDBFE', borderRadius: 12,
              padding: '18px 20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Create a free account to book
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
                Pick a date and time above, then sign up.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to={`/signup${redirectParam}`} style={{
                  background: 'var(--primary)', color: '#fff', textDecoration: 'none',
                  borderRadius: 999, padding: '9px 22px', fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--font-ui)',
                }}>Sign up free</Link>
                <Link to={`/login${redirectParam}`} style={{
                  background: 'none', color: 'var(--primary)', textDecoration: 'none',
                  borderRadius: 999, padding: '9px 22px', fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--font-ui)', border: '1.5px solid #BFDBFE',
                }}>Log in</Link>
              </div>
            </div>
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

        {/* Other listings by same person */}
        {otherListings.length > 0 && (
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>
              Also offered by {provider.name}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {otherListings.map(l => (
                <Link
                  key={l.id}
                  to={`/providers/${l.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 10,
                    border: '1px solid var(--border)', background: 'var(--bg)',
                    textDecoration: 'none', transition: 'background .12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}
                >
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                      {l.title || l.subcategory || l.custom_category ||
                        { tutor: 'Tutoring', barber: 'Haircuts', 'hebrew tutor': 'Hebrew Tutoring', fitness: 'Fitness' }[l.category] || l.category}
                    </div>
                    {l.bio && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380 }}>
                        {l.bio}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flexShrink: 0, marginLeft: 12 }}>
                    {l.price_per_session > 0 ? `$${l.price_per_session}` : 'Free'}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
