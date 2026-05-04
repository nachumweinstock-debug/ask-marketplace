import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { fmtTime, fmtDay } from '../lib/slots';
import { RowSkeleton } from '../components/Skeletons';
import PoweredByAsk from '../components/PoweredByAsk';

const STATUS = {
  pending:   { label: 'Pending',   bg: '#FFF8E6', color: '#92600A' },
  confirmed: { label: 'Confirmed', bg: '#F0FDF4', color: '#166534' },
  completed: { label: 'Completed', bg: 'var(--accent)', color: 'var(--primary)' },
  cancelled: { label: 'Cancelled', bg: '#FEF2F2', color: '#DC2626' },
};

const CAT_LABELS = { tutor: 'Instructor', barber: 'Barber', 'hebrew tutor': 'Hebrew', tennis: 'Tennis', other: 'Other' };

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <div className="card" style={{ padding: '28px', width: '100%', maxWidth: 380 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>Leave a review</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 22 }}>Session with {booking.provider_name}</div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 8 }}>Rating</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => setRating(n)}
                  style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: n <= rating ? '#F59E0B' : '#E5E0D8', padding: 0 }}>
                  ★
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 6 }}>Comment (optional)</div>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
              placeholder="How was your session?"
              style={{
                width: '100%', border: '1.5px solid var(--border)', borderRadius: 8,
                padding: '10px 14px', fontSize: 13, outline: 'none', resize: 'none',
                background: '#fff', color: 'var(--text)', fontFamily: 'var(--font-ui)',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          {error && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px', border: '1.5px solid var(--border)', borderRadius: 999,
              fontSize: 13, cursor: 'pointer', background: 'var(--card)',
              color: 'var(--text)', fontFamily: 'var(--font-ui)',
            }}>Cancel</button>
            <button type="submit" disabled={loading} style={{
              flex: 1, padding: '10px', background: loading ? '#93C5FD' : 'var(--primary)',
              color: '#fff', border: 'none', borderRadius: 999,
              fontSize: 13, cursor: 'pointer', fontWeight: 600,
              fontFamily: 'var(--font-ui)',
            }}>
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
  const [doneLoading, setDoneLoading] = useState(null);
  const [groupInvites, setGroupInvites] = useState([]);
  const [inviteLoading, setInviteLoading] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState(null); // booking object
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleSlotId, setRescheduleSlotId] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  useEffect(() => { fetchBookings(); fetchGroupInvites(); }, []);

  async function fetchBookings() {
    try { const { data } = await api.get('/bookings/mine'); setBookings(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function fetchGroupInvites() {
    try { const { data } = await api.get('/bookings/group-invites/mine'); setGroupInvites(data); }
    catch { /* ignore */ }
  }

  async function handleInviteResponse(inviteId, action) {
    setInviteLoading(inviteId);
    try {
      await api.post(`/bookings/group-invites/${inviteId}/${action}`);
      setGroupInvites(gs => gs.filter(g => g.id !== inviteId));
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setInviteLoading(null); }
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

  async function handleMarkDone(id) {
    if (!confirm('Mark this session as completed? You\'ll be able to leave a review after.')) return;
    setDoneLoading(id);
    try {
      await api.patch(`/bookings/${id}`, { status: 'completed' });
      setBookings(bs => bs.map(b => b.id === id ? { ...b, status: 'completed' } : b));
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setDoneLoading(null); }
  }

  async function handleReview(data) { await api.post('/reviews', data); fetchBookings(); }

  async function handleRescheduleResponse(bookingId, action) {
    setRescheduleLoading(bookingId + action);
    try {
      await api.post(`/bookings/${bookingId}/reschedule/${action}`);
      fetchBookings();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setRescheduleLoading(null); }
  }

  async function openRescheduleModal(booking) {
    setRescheduleModal(booking);
    setRescheduleSlots([]);
    setRescheduleSlotId('');
    try {
      const { data } = await api.get(`/availability/${booking.provider_profile_id}`);
      const openSlots = (data || []).filter(s => !s.is_booked && String(s.id) !== String(booking.availability_id));
      setRescheduleSlots(openSlots);
    } catch { setRescheduleSlots([]); }
  }

  async function submitStudentReschedule() {
    if (!rescheduleSlotId) return alert('Please select a new time slot');
    setRescheduleSubmitting(true);
    try {
      await api.post(`/bookings/${rescheduleModal.id}/reschedule`, { new_availability_id: Number(rescheduleSlotId) });
      setRescheduleModal(null);
      fetchBookings();
    } catch (err) { alert(err.response?.data?.error || 'Failed to propose reschedule'); }
    finally { setRescheduleSubmitting(false); }
  }

  const upcoming = bookings.filter(b => ['pending', 'confirmed'].includes(b.status));
  const past = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));

  return (
    <div className="page" style={{ maxWidth: 840 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 6 }}>
            My Bookings
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>Welcome back, {user?.name?.split(' ')[0]}</p>
        </div>
        <button onClick={() => navigate('/create-listing')} style={{
          background: 'var(--primary)', color: '#fff', border: 'none',
          padding: '10px 22px', borderRadius: 999, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--font-ui)',
        }}>
          {user?.role === 'provider' ? 'Edit listing' : 'Post a listing'}
        </button>
      </div>

      {/* Reschedule proposals */}
      {bookings.filter(b => b.reschedule_status === 'pending_student_approval').length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>
            Reschedule Requests
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bookings.filter(b => b.reschedule_status === 'pending_student_approval').map(b => (
              <div key={b.id} className="card" style={{ padding: '14px 20px', border: '1.5px solid #FCD34D', background: '#FFFBEB' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                  {b.provider_name} wants to reschedule
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>
                  <span style={{ textDecoration: 'line-through' }}>{fmtDay(b.date)} · {fmtTime(b.start_time)}–{fmtTime(b.end_time)}</span>
                  {' → '}
                  <strong>{fmtDay(b.reschedule_date)} · {fmtTime(b.reschedule_start_time)}–{fmtTime(b.reschedule_end_time)}</strong>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleRescheduleResponse(b.id, 'accept')}
                    disabled={rescheduleLoading === b.id + 'accept'}
                    style={{
                      background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0',
                      padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'var(--font-ui)',
                    }}
                  >{rescheduleLoading === b.id + 'accept' ? '…' : 'Accept'}</button>
                  <button
                    onClick={() => handleRescheduleResponse(b.id, 'decline')}
                    disabled={rescheduleLoading === b.id + 'decline'}
                    style={{
                      background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                      padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'var(--font-ui)',
                    }}
                  >{rescheduleLoading === b.id + 'decline' ? '…' : 'Decline'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Group invites */}
      {groupInvites.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>
            Group Invites ({groupInvites.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {groupInvites.map(inv => (
              <div key={inv.id} className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                    {inv.inviter_name} invited you to a group session
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
                    {inv.custom_category || inv.category} with {inv.provider_name}
                    {' · '}{fmtDay(inv.date)}{' · '}{fmtTime(inv.start_time)}–{fmtTime(inv.end_time)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => handleInviteResponse(inv.id, 'accept')}
                    disabled={inviteLoading === inv.id}
                    style={{ fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 999, border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                    {inviteLoading === inv.id ? '...' : 'Join'}
                  </button>
                  <button onClick={() => handleInviteResponse(inv.id, 'decline')}
                    disabled={inviteLoading === inv.id}
                    style={{ fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 999, border: '1.5px solid var(--border)', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <RowSkeleton rows={5} />
      ) : bookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text)', marginBottom: 10 }}>
            No bookings yet
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>Browse providers and book your first session.</div>
          <Link to="/browse" style={{
            display: 'inline-block', background: 'var(--primary)', color: '#fff',
            padding: '10px 24px', borderRadius: 999, fontSize: 13, fontWeight: 600,
            textDecoration: 'none', fontFamily: 'var(--font-ui)',
          }}>
            Browse listings
          </Link>
        </div>
      ) : (
        <div>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>Upcoming</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcoming.map(b => (
                  <BookingRow key={b.id} booking={b} onCancel={handleCancel} cancelLoading={cancelLoading} showChat
                    onMarkDone={b.status === 'confirmed' ? () => handleMarkDone(b.id) : null}
                    doneLoading={doneLoading === b.id}
                    onReschedule={b.status === 'confirmed' ? () => openRescheduleModal(b) : null} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>Past Sessions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {past.map(b => (
                  <BookingRow key={b.id} booking={b} showChat
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

      {rescheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div className="card" style={{ padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text)', marginBottom: 4 }}>
              Request a reschedule
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 20 }}>
              Session with {rescheduleModal.provider_name} · {fmtDay(rescheduleModal.date)} · {fmtTime(rescheduleModal.start_time)}–{fmtTime(rescheduleModal.end_time)}
            </div>
            {rescheduleSlots.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                {rescheduleSlots === null ? 'Loading available slots…' : 'No open slots available for this provider right now.'}
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 8 }}>Select a new time</div>
                <select
                  value={rescheduleSlotId}
                  onChange={e => setRescheduleSlotId(e.target.value)}
                  style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, background: '#fff', color: 'var(--text)', fontFamily: 'var(--font-ui)', outline: 'none' }}
                >
                  <option value="">— choose a slot —</option>
                  {rescheduleSlots.map(s => (
                    <option key={s.id} value={s.id}>{s.date} · {fmtTime(s.start_time)}–{fmtTime(s.end_time)}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setRescheduleModal(null)} style={{ flex: 1, padding: 10, border: '1.5px solid var(--border)', borderRadius: 999, fontSize: 13, cursor: 'pointer', background: 'var(--card)', color: 'var(--text)', fontFamily: 'var(--font-ui)' }}>Cancel</button>
              {rescheduleSlots.length > 0 && (
                <button onClick={submitStudentReschedule} disabled={rescheduleSubmitting || !rescheduleSlotId} style={{ flex: 1, padding: 10, background: rescheduleSubmitting ? '#93C5FD' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: rescheduleSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)' }}>
                  {rescheduleSubmitting ? 'Sending…' : 'Send request'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddToCalendarButton({ bookingId }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  async function handleOpen() {
    if (!data) {
      try {
        const { data: d } = await api.get(`/bookings/${bookingId}/calendar`);
        setData(d);
      } catch { return; }
    }
    setOpen(o => !o);
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={handleOpen} style={{
        fontSize: 12, color: 'var(--primary)', background: 'var(--accent)',
        border: '1px solid #BFDBFE', borderRadius: 999, padding: '4px 10px',
        cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        📅 Calendar
      </button>
      {open && data && (
        <div style={{
          position: 'absolute', right: 0, top: 32, zIndex: 100,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          minWidth: 200, overflow: 'hidden',
          animation: 'slideDown 0.15s ease both',
        }}>
          <a href={data.google} target="_blank" rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 16px', textDecoration: 'none',
              fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-ui)',
              borderBottom: '1px solid var(--border)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span style={{ fontSize: 18 }}>📅</span>
            <div>
              <div style={{ fontWeight: 600 }}>Google Calendar</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Opens in browser</div>
            </div>
          </a>
          <a href={data.ics}
            onClick={() => setOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 16px', textDecoration: 'none',
              fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-ui)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span style={{ fontSize: 18 }}></span>
            <div>
              <div style={{ fontWeight: 600 }}>Apple Calendar</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Downloads .ics · also works with Outlook</div>
            </div>
          </a>
        </div>
      )}
    </div>
  );
}

function BookingRow({ booking, onCancel, cancelLoading, onReview, onMarkDone, doneLoading, showChat, onReschedule }) {
  const s = STATUS[booking.status] || STATUS.pending;
  const showCalendar = booking.status === 'confirmed';
  const reschedulePending = booking.reschedule_status === 'pending_provider_approval';
  const rescheduleAvailable = booking.status === 'confirmed' && (!booking.reschedule_status || booking.reschedule_status === 'none');
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Link to={`/providers/${booking.provider_profile_id}`}
            style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>
            {booking.provider_name}
          </Link>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
            {CAT_LABELS[booking.category] || booking.category}
            {' · '}
            {fmtDay(booking.date)}
            {' · '}{fmtTime(booking.start_time)}–{fmtTime(booking.end_time)}
          </div>
          {booking.price_per_session > 0 && (
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, opacity: 0.8 }}>
              Pay ${booking.price_per_session} via Zelle/Venmo
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-block', fontSize: 11, fontWeight: 600,
            padding: '3px 10px', borderRadius: 999, background: s.bg, color: s.color,
          }}>
            {s.label}
          </span>
          {showCalendar && <AddToCalendarButton bookingId={booking.id} />}
          {showChat && booking.status !== 'cancelled' && (
            <Link to={`/chat/${booking.id}`}
              style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Chat
            </Link>
          )}
          {reschedulePending && (
            <span style={{ fontSize: 11, color: '#92600A', background: '#FFF8E6', border: '1px solid #FCD34D', borderRadius: 999, padding: '3px 10px' }}>
              Reschedule pending
            </span>
          )}
          {rescheduleAvailable && onReschedule && (
            <button onClick={onReschedule}
              style={{ fontSize: 12, color: '#92600A', background: '#FFF8E6', border: '1px solid #FCD34D', borderRadius: 999, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 600 }}>
              Reschedule
            </button>
          )}
          {onMarkDone && (
            <button onClick={onMarkDone} disabled={doneLoading}
              style={{ fontSize: 12, color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 999, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 600 }}>
              {doneLoading ? '...' : 'Done ✓'}
            </button>
          )}
          {onCancel && booking.status !== 'cancelled' && (
            <button onClick={() => onCancel(booking.id)} disabled={cancelLoading === booking.id}
              style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-ui)' }}>
              Cancel
            </button>
          )}
          {onReview && (
            <button onClick={onReview}
              style={{ fontSize: 12, color: '#fff', background: 'var(--primary)', border: 'none', borderRadius: 999, padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 600 }}>
              Leave a Review
            </button>
          )}
          {booking.status === 'completed' && booking.review_id && (
            <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>Reviewed ★</span>
          )}
        </div>
      </div>
      {['confirmed', 'completed'].includes(booking.status) && (
        <PoweredByAsk compact url={`${window.location.origin}/browse`} />
      )}
    </div>
  );
}
