import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';
import { fmtTime, fmtDay, DAYS } from '../lib/slots';
import CategoryPill, { SessionTypePill } from '../components/CategoryPill';
import MiniCalendar from '../components/MiniCalendar';
import { providerUrl, parseProviderSlug, isUsernameSlug } from '../lib/providerUrl';
import GroupInvitePicker from '../components/GroupInvitePicker';
import { trackEvent } from '../lib/analytics';
import SavedTutorButton from '../components/SavedTutorButton';
import FAQAccordion from '../components/FAQAccordion';
import { ProfileSkeleton } from '../components/Skeletons';
import PoweredByAsk from '../components/PoweredByAsk';

function ShareButton({ providerId, providerName, username }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${providerUrl(providerName, providerId, username)}`;
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

const TIME_SLOTS = [
  '7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM','9:30 AM',
  '10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','12:30 PM',
  '1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM',
  '4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM','6:30 PM',
  '7:00 PM','7:30 PM','8:00 PM','8:30 PM','9:00 PM',
];

const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function TimeRequestPicker({ reqDate, setReqDate, reqTime, setReqTime, reqMessage, setReqMessage, reqLoading, reqDayOffset, setReqDayOffset, onSubmit }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  function toISODate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function timeToValue(label) {
    const [time, ampm] = label.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  const visibleDays = days.slice(reqDayOffset, reqDayOffset + 7);
  const canNext = reqDayOffset + 7 < days.length;

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Day strip */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>Pick a day</span>
          <div style={{ display: 'flex', gap: 2 }}>
            <button type="button" onClick={() => setReqDayOffset(o => Math.max(0, o - 7))}
              disabled={reqDayOffset === 0}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 24, height: 24, cursor: reqDayOffset === 0 ? 'not-allowed' : 'pointer', opacity: reqDayOffset === 0 ? 0.3 : 1, fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ‹
            </button>
            <button type="button" onClick={() => setReqDayOffset(o => o + 7)}
              disabled={!canNext}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 24, height: 24, cursor: !canNext ? 'not-allowed' : 'pointer', opacity: !canNext ? 0.3 : 1, fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ›
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {visibleDays.map(d => {
            const iso = toISODate(d);
            const active = reqDate === iso;
            const isToday = d.getTime() === today.getTime();
            return (
              <button key={iso} type="button" onClick={() => { setReqDate(iso); setReqTime(''); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '6px 2px', borderRadius: 8,
                  border: `1.5px solid ${active ? 'var(--ink-900)' : 'var(--border)'}`,
                  background: active ? 'var(--ink-900)' : 'var(--card)',
                  color: active ? '#fff' : 'var(--text)',
                  cursor: 'pointer', transition: 'all .12s',
                  fontFamily: 'var(--font-ui)',
                }}>
                <span style={{ fontSize: 9, fontWeight: 600, opacity: active ? 0.7 : 0.5, letterSpacing: '0.04em' }}>
                  {isToday ? 'TODAY' : DAY_LABELS[d.getDay()]}
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{d.getDate()}</span>
                <span style={{ fontSize: 9, opacity: active ? 0.6 : 0.4 }}>{MONTH_SHORT[d.getMonth()]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time grid */}
      {reqDate && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Pick a time</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
            {TIME_SLOTS.map(label => {
              const val = timeToValue(label);
              const active = reqTime === val;
              return (
                <button key={label} type="button" onClick={() => setReqTime(active ? '' : val)}
                  style={{
                    padding: '7px 4px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                    border: `1.5px solid ${active ? 'var(--ink-900)' : 'var(--border)'}`,
                    background: active ? 'var(--ink-900)' : 'var(--card)',
                    color: active ? '#fff' : 'var(--text)',
                    cursor: 'pointer', transition: 'all .1s', fontFamily: 'var(--font-ui)',
                  }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Note */}
      <textarea value={reqMessage} onChange={e => setReqMessage(e.target.value)}
        placeholder="Add a note (optional)"
        maxLength={300} rows={2}
        style={{
          padding: '9px 12px', borderRadius: 10,
          border: '1px solid var(--border)', fontSize: 13,
          fontFamily: 'var(--font-ui)', background: 'var(--card)',
          resize: 'none', outline: 'none', color: 'var(--text)',
          lineHeight: 1.5,
        }}
      />

      <button type="submit" disabled={reqLoading || !reqDate || !reqTime} style={{
        width: '100%',
        background: (!reqDate || !reqTime || reqLoading) ? 'var(--cream-200)' : 'var(--ink-900)',
        color: (!reqDate || !reqTime || reqLoading) ? 'var(--muted)' : '#fff',
        border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 600,
        cursor: (!reqDate || !reqTime || reqLoading) ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-ui)', transition: 'background .15s',
      }}>
        {reqLoading ? 'Sending…' : (reqDate && reqTime) ? `Request ${new Date(reqDate + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${TIME_SLOTS.find(t => timeToValue(t) === reqTime) || reqTime}` : 'Select a day & time'}
      </button>
    </form>
  );
}

export default function ProviderProfile() {
  const { id: rawId, providerSlug } = useParams();
  const slug = providerSlug ?? '';
  const numericId = rawId ?? (isUsernameSlug(slug) ? null : String(parseProviderSlug(slug)));
  const usernameSlug = (!rawId && isUsernameSlug(slug) && slug) ? slug : null;

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
  const [reqDate, setReqDate] = useState('');
  const [reqTime, setReqTime] = useState('');
  const [reqMessage, setReqMessage] = useState('');
  const [reqLoading, setReqLoading] = useState(false);
  const [reqSuccess, setReqSuccess] = useState('');
  const [reqDayOffset, setReqDayOffset] = useState(0);
  const [groupMode, setGroupMode] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setOtherListings([]);
    const fetch = usernameSlug
      ? api.get(`/providers/u/${usernameSlug}`).then(({ data }) => {
          if (!data.listings?.length) throw new Error('no listings');
          // Show the most recent listing; stash the rest as otherListings
          setProvider(data.listings[0]);
          setOtherListings(data.listings.slice(1));
        })
      : api.get(`/providers/${numericId}`).then(({ data }) => {
          setProvider(data);
          api.get(`/providers/by-user/${data.user_id}`)
            .then(({ data: all }) => setOtherListings(all.filter(l => l.id !== data.id)))
            .catch(() => {});
        });
    fetch.catch(() => {
      if (usernameSlug) navigate(`/u/${usernameSlug}`, { replace: true });
      else navigate('/browse');
    }).finally(() => setLoading(false));
  }, [numericId, usernameSlug]);

  useEffect(() => {
    if (!provider?.id) return;
    trackEvent('tutor_profile_viewed', {
      provider_id: provider.id,
      category: provider.category,
      custom_category: provider.custom_category,
      subcategory: provider.subcategory,
    });
  }, [provider?.id]);

  useEffect(() => {
    if (!user || !provider?.id) { setSaved(false); return; }
    api.get('/saved-tutors/ids')
      .then(({ data }) => setSaved(Array.isArray(data) && data.includes(provider.id)))
      .catch(() => {});
  }, [user?.id, provider?.id]);

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

  const redirectParam = `?redirect=${encodeURIComponent(window.location.pathname)}`;

  function handleMessage() {
    trackEvent('contact_tutor_clicked', { provider_id: provider.id, provider_user_id: provider.user_id, logged_in: !!user });
    if (!user) return navigate(`/signup${redirectParam}`);
    navigate(`/messages/${provider.user_id}`);
  }

  async function handleBook() {
    if (!user) return navigate(`/signup${redirectParam}`);
    if (!booking) return setBookingError('Please select a time slot.');
    setBookingLoading(true); setBookingError(''); setBookingSuccess('');
    try {
      trackEvent('booking_started', { provider_id: provider.id, slot_id: booking, group_mode: groupMode, invite_count: invitedUsers.length });
      await api.post('/bookings', {
        availability_id: booking,
        ...(groupMode && invitedUsers.length > 0 ? { group_invite_ids: invitedUsers } : {}),
      });
      trackEvent('booking_completed', { provider_id: provider.id, group_mode: groupMode, invite_count: invitedUsers.length });
      setBookingSuccess(groupMode && invitedUsers.length > 0
        ? `Booking requested! ${invitedUsers.length} invite${invitedUsers.length !== 1 ? 's' : ''} sent.`
        : 'Booking requested! Check your dashboard.');
      setProvider(p => ({ ...p, availability: p.availability.filter(s => s.id !== booking) }));
      setBooking(null); setGroupMode(false); setInvitedUsers([]);
    } catch (err) {
      console.error('[booking]', err.response?.status, err.response?.data);
      setBookingError(err.response?.data?.error || `Booking failed (${err.response?.status || 'network error'})`);
    } finally {
      setBookingLoading(false);
    }
  }

  async function handleRequestTime(e) {
    e.preventDefault();
    if (!user) return navigate(`/signup${redirectParam}`);
    if (!reqDate || !reqTime) { setBookingError('Pick a date and time'); return; }
    setReqLoading(true); setBookingError(''); setReqSuccess('');
    try {
      trackEvent('booking_started', { provider_id: provider.id, requested_time: true });
      await api.post('/time-requests', {
        provider_id: provider.id,
        requested_date: reqDate,
        requested_time: reqTime,
        message: reqMessage || undefined,
      });
      setReqSuccess('Request sent! They\'ll get an email notification.');
      setReqDate(''); setReqTime(''); setReqMessage('');
    } catch (err) {
      setBookingError(err.response?.data?.error || 'Failed to send request');
    } finally {
      setReqLoading(false);
    }
  }

  if (loading) return <ProfileSkeleton />;
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
    <div className="page" style={{ maxWidth: 860 }}>

      {/* Back */}
      <Link to="/browse" style={{
        fontSize: 13, fontWeight: 500, color: 'var(--muted)', textDecoration: 'none',
        display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20,
        transition: 'color .12s',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
      >
        ← Browse
      </Link>

      {/* Profile header */}
      <div style={{
        background: '#fff', borderRadius: 20, marginBottom: 20, overflow: 'hidden',
        border: '1px solid var(--gray-100)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)',
      }}>
        {/* Cover image or gradient */}
        <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
          {provider.listing_image ? (
            <img src={provider.listing_image} alt="listing cover"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: provider.custom_category
                ? (() => { let h = 0; for (const c of (provider.custom_category||'')) h = (h*31+c.charCodeAt(0))&0xffffffff; const hue = Math.abs(h)%360; return `linear-gradient(135deg,hsl(${hue},65%,72%),hsl(${(hue+30)%360},60%,52%))`; })()
                : { tutor:'linear-gradient(135deg,#FDE68A,#F59E0B)', 'hebrew tutor':'linear-gradient(135deg,#A5B4FC,#4F46E5)', fitness:'linear-gradient(135deg,#6EE7B7,#059669)', barber:'linear-gradient(135deg,#FCA5A5,#DC2626)', other:'linear-gradient(135deg,#E2E8F0,#94A3B8)' }[provider.category] || 'linear-gradient(135deg,#E2E8F0,#94A3B8)',
            }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 55%)' }} />
        </div>

        {/* Owner controls */}
        {isOwner && (
          <div style={{
            padding: '10px 20px', background: 'var(--gray-50)',
            borderBottom: '1px solid var(--gray-100)',
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', flexGrow: 1, fontWeight: 500 }}>Your listing</span>
            <ShareButton providerId={provider?.id} providerName={provider?.name} username={provider?.username} />
            <Link to="/dashboard/provider?tab=availability" style={{
              fontSize: 12, fontWeight: 600, color: 'var(--text)',
              textDecoration: 'none', padding: '5px 14px',
              border: '1.5px solid var(--gray-300)', borderRadius: 99,
              fontFamily: 'var(--font-ui)',
            }}>
              Edit
            </Link>
            <button onClick={handleDeleteListing} disabled={deleteLoading} style={{
              fontSize: 12, fontWeight: 600, color: '#DC2626', background: 'none',
              border: '1.5px solid #FECACA', borderRadius: 99, padding: '5px 14px',
              cursor: deleteLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)',
              opacity: deleteLoading ? 0.6 : 1,
            }}>
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}

      <div style={{ padding: '24px 28px 28px' }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {mediaUrl(provider.avatar_url) ? (
            <img src={mediaUrl(provider.avatar_url)} alt={provider.name}
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '3px solid #fff', boxShadow: '0 0 0 1px var(--gray-200)', marginTop: -36 }} />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#FDE68A,#F59E0B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 24, fontFamily: 'var(--font-display)', color: '#fff',
              border: '3px solid #fff', boxShadow: '0 0 0 1px var(--gray-200)', marginTop: -36,
            }}>
              {initials(provider.name)}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h1 style={{
                  fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
                  fontSize: 30, fontWeight: 700, color: 'var(--text)',
                  marginBottom: 6, letterSpacing: '-0.02em', lineHeight: 1.1,
                }}>
                  {provider.name}
                </h1>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <CategoryPill category={provider.category} customCategory={provider.custom_category} size="md" />
                  <SessionTypePill sessionType={provider.session_type} />
                  {provider.college && (
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                      background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE',
                      fontFamily: 'var(--font-ui)',
                    }}>
                      {provider.college}
                    </span>
                  )}
                  {provider.allow_group && (
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                      background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0',
                      fontFamily: 'var(--font-ui)',
                    }}>
                      Group sessions
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                {!isOwner && (
                  <SavedTutorButton tutorId={provider.id} initialSaved={saved} onChange={setSaved} />
                )}
                <div style={{ fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto', fontSize: 32, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  {provider.price_per_session > 0 ? `$${provider.price_per_session}` : 'Free'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>per session</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <Stars rating={Math.round(provider.rating)} />
              <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
                {provider.rating > 0 ? provider.rating.toFixed(1) : 'No reviews yet'}
              </span>
              {provider.review_count > 0 && (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>({provider.review_count})</span>
              )}
              {provider.completed_sessions > 0 && (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  · {provider.completed_sessions} session{provider.completed_sessions !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {provider.bio && (
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 12, lineHeight: 1.7, maxWidth: 560 }}>
                {provider.bio}
              </p>
            )}

            {!isOwner && (
              <div style={{ marginTop: 16 }}>
                <button onClick={handleMessage} style={{
                  padding: '10px 24px', borderRadius: 99, fontSize: 14, fontWeight: 700,
                  background: 'var(--text)', color: '#fff', border: 'none',
                  cursor: 'pointer', fontFamily: 'var(--font-ui)',
                  transition: 'opacity .15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Message {provider.name.split(' ')[0]}
                </button>
              </div>
            )}

            {/* Payment info — only shown after accepted connection or confirmed booking */}
            {provider.payment_unlocked ? (
              (provider.zelle || provider.venmo) && (
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
              )
            ) : (
              <div style={{
                marginTop: 14, display: 'flex', alignItems: 'center', gap: 8,
                background: '#F9FAFB', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 12px',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Book a session and get confirmed to see payment details
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Slots + Reviews */}
      <div className="grid-3-2">

        {/* Availability */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid var(--gray-100)', boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16, letterSpacing: '-0.01em' }}>
            Book a session
          </div>

          {provider.availability.length === 0 ? (
            !isOwner ? (
              <div>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
                  No set availability — but you can request a time and they'll be notified.
                </p>
                {reqSuccess ? (
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#166534' }}>
                    {reqSuccess}
                  </div>
                ) : (
                  <TimeRequestPicker
                    reqDate={reqDate} setReqDate={setReqDate}
                    reqTime={reqTime} setReqTime={setReqTime}
                    reqMessage={reqMessage} setReqMessage={setReqMessage}
                    reqLoading={reqLoading}
                    reqDayOffset={reqDayOffset} setReqDayOffset={setReqDayOffset}
                    onSubmit={handleRequestTime}
                  />
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '28px 0' }}>
                No availability set. Add slots from your dashboard so students can book.
              </p>
            )
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
                              border: `1.5px solid ${booking === slot.id ? 'var(--ink-900)' : 'var(--border)'}`,
                              background: booking === slot.id ? 'var(--ink-900)' : 'var(--card)',
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
                              border: `1.5px solid ${booking === slot.id ? 'var(--ink-900)' : 'var(--border)'}`,
                              background: booking === slot.id ? 'var(--ink-900)' : 'var(--card)',
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
              <PoweredByAsk compact url={`${window.location.origin}${providerUrl(provider.name, provider.id, provider.username)}`} />
            </div>
          )}

          {/* Group booking toggle — only when provider allows it and user selected a slot */}
          {provider.allow_group && !isOwner && user && booking && (
            <div style={{ marginTop: 16 }}>
              <div style={{
                display: 'flex', background: 'var(--gray-100)', borderRadius: 10, padding: 3, gap: 2,
              }}>
                {[
                  { id: false, label: 'Solo' },
                  { id: true, label: `Group (up to ${provider.max_group_size})` },
                ].map(({ id, label }) => (
                  <button key={String(id)} type="button" onClick={() => { setGroupMode(id); if (!id) setInvitedUsers([]); }} style={{
                    flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: 'none',
                    background: groupMode === id ? '#fff' : 'transparent',
                    color: groupMode === id ? 'var(--text)' : 'var(--muted)',
                    cursor: 'pointer', fontFamily: 'var(--font-ui)',
                    boxShadow: groupMode === id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all .12s',
                  }}>
                    {label}
                  </button>
                ))}
              </div>

              {groupMode && (
                <div style={{ marginTop: 12 }}>
                  <GroupInvitePicker
                    selected={invitedUsers}
                    onChange={setInvitedUsers}
                    maxGroupSize={provider.max_group_size || 6}
                  />
                </div>
              )}
            </div>
          )}

          {provider.availability.length > 0 && (
            <button onClick={handleBook} disabled={!booking || bookingLoading}
              style={{
                marginTop: 16, width: '100%',
                background: !booking || bookingLoading ? 'var(--cream-200)' : 'var(--ink-900)',
                color: !booking || bookingLoading ? 'var(--muted)' : '#fff',
                border: 'none', borderRadius: 10,
                padding: '12px', fontSize: 14, fontWeight: 600,
                cursor: !booking || bookingLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-ui)', transition: 'all .15s',
              }}>
              {bookingLoading ? 'Booking...'
                : !booking ? 'Select a time to book'
                : groupMode ? `Request Group Booking${invitedUsers.length > 0 ? ` + ${invitedUsers.length} invite${invitedUsers.length !== 1 ? 's' : ''}` : ''}`
                : 'Request Booking'}
            </button>
          )}

          {!user && (
            <div style={{
              marginTop: 20, background: 'var(--cream-100)',
              border: '1px solid var(--cream-300)', borderRadius: 12,
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
                  background: 'var(--ink-900)', color: '#fff', textDecoration: 'none',
                  borderRadius: 10, padding: '9px 22px', fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--font-ui)',
                }}>Sign up free</Link>
                <Link to={`/login${redirectParam}`} style={{
                  background: 'none', color: 'var(--ink-700)', textDecoration: 'none',
                  borderRadius: 10, padding: '9px 22px', fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--font-ui)', border: '1.5px solid var(--cream-300)',
                }}>Log in</Link>
              </div>
            </div>
          )}
        </div>

        {/* Reviews */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid var(--gray-100)', boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16, letterSpacing: '-0.01em' }}>
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
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid var(--gray-100)', boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>
              Also offered by {provider.name}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {otherListings.map(l => (
                <Link
                  key={l.id}
                  to={providerUrl(l.name || provider?.name, l.id, l.username || provider?.username)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 10,
                    border: '1px solid var(--gray-100)', background: '#fff',
                    textDecoration: 'none', transition: 'background .12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
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

      <FAQAccordion
        title={`Questions about ${provider.name}`}
        schemaId={`provider-faq-${provider.id}`}
        faqs={[
          ['How do I book this tutor?', 'Choose an available time on this profile and send a booking request. The tutor can confirm it from their dashboard.'],
          ['Can I message before booking?', 'Yes. Use the message button to ask about fit, class material, location, or online session details.'],
          ['Can I book online sessions?', 'Check the session type badge on the profile. Online and both-mode tutors can coordinate remote sessions.'],
          ['What happens after I book?', 'Ask Marketplace sends the booking request, opens a message thread, and gives calendar options after confirmation.'],
          ['What if I need a different time?', 'Use the request time section if no listed availability works for you.'],
        ]}
      />
    </div>
  );
}
