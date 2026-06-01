import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { copyText } from '../lib/clipboard';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';
import { fmtTime, DAYS } from '../lib/slots';
import CategoryPill, { SessionTypePill } from '../components/CategoryPill';
import MiniCalendar from '../components/MiniCalendar';
import { providerUrl, parseProviderSlug, isUsernameSlug } from '../lib/providerUrl';
import GroupInvitePicker from '../components/GroupInvitePicker';
import { trackEvent } from '../lib/analytics';
import SavedTutorButton from '../components/SavedTutorButton';
import FAQAccordion from '../components/FAQAccordion';
import { ProfileSkeleton } from '../components/Skeletons';
import PoweredByAsk from '../components/PoweredByAsk';
import TrustBadges from '../components/TrustBadges';
import ProfileTrustPanel from '../components/ProfileTrustPanel';
import NotFound from './NotFound';
import { discountedPrice, discountPercent, firstTimeDiscountLabel, money } from '../lib/pricing';

function ShareButton({ providerId, providerName, username }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${providerUrl(providerName, providerId, username)}`;
  async function handleCopy() {
    try { await copyText(url); } catch { return; }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

function normalizeProviderProfile(data) {
  if (!data) return null;
  return {
    ...data,
    availability: Array.isArray(data.availability) ? data.availability : [],
    reviews: Array.isArray(data.reviews) ? data.reviews : [],
  };
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
  const parsedId = !rawId && !isUsernameSlug(slug) ? parseProviderSlug(slug) : null;
  const numericId = rawId ?? (Number.isFinite(parsedId) ? String(parsedId) : null);
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
  const [mediaItems, setMediaItems] = useState([]);
  const [reportingReview, setReportingReview] = useState(null);
  const [reportForm, setReportForm] = useState({ reason: 'spam', details: '' });
  const [notFound, setNotFound] = useState(false);
  const [providerShareCopied, setProviderShareCopied] = useState(false);

  useEffect(() => {
    setNotFound(false);
    setOtherListings([]);
    const fetch = usernameSlug
      ? api.get(`/providers/u/${usernameSlug}`).then(async ({ data }) => {
          if (!data.listings?.length) throw new Error('no listings');
          // Resolve the username page to the full listing detail so availability,
          // reviews, and payment gating are always available for the profile UI.
          const primary = data.listings[0];
          const detail = await api.get(`/providers/${primary.id}`)
            .then(({ data: full }) => full)
            .catch(() => primary);
          setProvider(normalizeProviderProfile(detail));
          setOtherListings(data.listings.slice(1));
        })
      : api.get(`/providers/${numericId}`).then(({ data }) => {
          setProvider(normalizeProviderProfile(data));
          api.get(`/providers/by-user/${data.user_id}`)
            .then(({ data: all }) => setOtherListings(all.filter(l => l.id !== data.id)))
            .catch(() => {});
        });
    fetch.catch(() => {
      setProvider(null);
      setNotFound(true);
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

  useEffect(() => {
    if (!provider?.id) return;
    api.get(`/provider-media/${provider.id}`)
      .then(({ data }) => setMediaItems(Array.isArray(data) ? data : []))
      .catch(() => setMediaItems([]));
  }, [provider?.id]);

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

  async function reportReview(e) {
    e.preventDefault();
    if (!user) return navigate(`/login${redirectParam}`);
    if (!reportingReview) return;
    try {
      await api.post(`/reviews/${reportingReview.id}/report`, reportForm);
      setReportingReview(null);
      setReportForm({ reason: 'spam', details: '' });
      alert('Thanks. Admins will review that report.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to report review');
    }
  }

  if (loading) return <ProfileSkeleton />;
  if (notFound) return <NotFound />;
  if (!provider) return null;

  const isOwner = user && user.id === provider.user_id;
  const availability = Array.isArray(provider.availability) ? provider.availability : [];
  const reviews = Array.isArray(provider.reviews) ? provider.reviews : [];
  const discount = discountPercent(provider);
  const displayPrice = discountedPrice(provider);
  const sitewideSale = discount > 0 && provider.first_time_discount_scope === 'sitewide';
  const providerShareUrl = `https://uask.live/providers/${provider.id}`;
  const providerServiceType = provider.subcategory || provider.custom_category || provider.title || provider.category || 'campus services';

  async function copyProviderShareLink() {
    try {
      await copyText(providerShareUrl);
      setProviderShareCopied(true);
      setTimeout(() => setProviderShareCopied(false), 2000);
    } catch {}
  }

  function openProviderWhatsAppShare() {
    const text = `Book me on ASK for ${providerServiceType} at YU: ${providerShareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  // Separate real calendar dates from legacy day-name slots
  const realSlots    = availability.filter(s => /^\d{4}/.test(s.date));
  const legacySlots  = availability.filter(s => DAYS.includes(s.date));
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
                  <SessionTypePill sessionType={provider.session_type} campus={provider.campus} />
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
                <div style={{ marginTop: 10 }}>
                  <TrustBadges trust={provider.trust} />
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                {!isOwner && (
                  <SavedTutorButton tutorId={provider.id} initialSaved={saved} onChange={setSaved} />
                )}

                {provider.price_per_session > 0 && discount > 0 && (!provider.surge_percent || sitewideSale) ? (
                  /* ── Sale / discount active (hidden during surge-only) ── */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, marginTop: 4 }}>
                    {/* Sale label */}
                    <div style={{
                      fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
                      padding: '5px 12px', borderRadius: 8,
                      background: sitewideSale
                        ? 'linear-gradient(135deg, #7C3AED, #EC4899)'
                        : '#F0FDF4',
                      color: sitewideSale ? '#fff' : '#166534',
                      border: sitewideSale ? 'none' : '1px solid #BBF7D0',
                    }}>
                      {sitewideSale ? '✦ Campus Sale' : 'First-time discount'} · −{discount}%
                    </div>

                    {/* Crossed-out original */}
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--muted)', textDecoration: 'line-through', lineHeight: 1 }}>
                      {money(provider.price_per_session)}
                    </div>

                    {/* Big final price */}
                    <div style={{
                      fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
                      fontSize: 40, fontWeight: 760, lineHeight: 1,
                      color: 'var(--text)', letterSpacing: '-0.02em',
                    }}>
                      {money(displayPrice)}
                    </div>

                    {/* Savings line */}
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, lineHeight: 1 }}>
                      <span style={{ color: '#16A34A', fontWeight: 700 }}>
                        You save {money(Math.round((provider.price_per_session - displayPrice) * 100) / 100)}
                      </span>
                      {' '}· per session
                    </div>
                  </div>
                ) : (
                  /* ── No discount ── */
                  <>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
                      fontSize: 36, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1,
                    }}>
                      {provider.price_per_session > 0 ? money(provider.price_per_session) : 'Free'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>per session</div>
                  </>
                )}
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

      <ProfileTrustPanel provider={provider} />

      {isOwner && (
        <section className="mb-5 rounded-2xl border border-[#E8E3DA] border-l-4 border-l-[#1B3A6B] bg-[#FAF7F2] p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="font-['DM_Serif_Display'] text-3xl leading-tight text-[#1B3A6B]">
              Grow your client base
            </h2>
            <p className="mt-2 font-['Outfit'] text-sm leading-6 text-[#5F5A50]">
              Share your profile link and start getting bookings from new students
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={copyProviderShareLink}
              className="rounded-xl bg-[#1B3A6B] px-5 py-3 font-['Outfit'] text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {providerShareCopied ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              type="button"
              onClick={openProviderWhatsAppShare}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#1B3A6B] px-5 py-3 font-['Outfit'] text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
                <path fill="currentColor" d="M16.02 3.2A12.7 12.7 0 0 0 5.05 22.3L3.2 28.8l6.68-1.75A12.66 12.66 0 0 0 16.02 28.6 12.7 12.7 0 1 0 16.02 3.2Zm0 23.25c-2.02 0-4-.58-5.7-1.67l-.4-.25-3.95 1.03 1.05-3.82-.27-.42a10.55 10.55 0 1 1 9.27 5.13Zm5.8-7.9c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.71.16-.21.31-.82 1.03-1 1.24-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.58-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.53-.71-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.08-1.11 2.64s1.14 3.07 1.3 3.28c.16.21 2.24 3.42 5.42 4.8.76.33 1.35.53 1.81.68.76.24 1.45.21 2 .13.61-.09 1.88-.77 2.15-1.51.27-.74.27-1.38.19-1.51-.08-.13-.29-.21-.61-.37Z" />
              </svg>
              WhatsApp
            </button>
          </div>
        </section>
      )}

      {(mediaItems.length > 0 || provider.intro_video_url || provider.portfolio_notes) && (
        <section className="card" style={{ padding: 24, borderRadius: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 14 }}>
            Portfolio
          </div>
          {provider.intro_video_url && (
            <a href={provider.intro_video_url} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', color: 'var(--primary)', fontWeight: 800, fontSize: 13,
              textDecoration: 'none', marginBottom: 12,
            }}>
              Watch intro video
            </a>
          )}
          {provider.portfolio_notes && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 14 }}>
              {provider.portfolio_notes}
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {mediaItems.map(item => (
              <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                {item.media_type === 'image' ? (
                  <img src={mediaUrl(item.url)} alt={item.title || 'Portfolio'} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ padding: 14, minHeight: 90 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text)' }}>{item.title || (item.media_type === 'video' ? 'Video' : 'Note')}</div>
                    {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 800 }}>Open link</a>}
                  </div>
                )}
                {(item.title || item.notes) && (
                  <div style={{ padding: 10 }}>
                    {item.title && <div style={{ fontSize: 12.5, fontWeight: 800 }}>{item.title}</div>}
                    {item.notes && <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>{item.notes}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Slots + Reviews */}
      <div className="grid-3-2">

        {/* Availability */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid var(--gray-100)', boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16, letterSpacing: '-0.01em' }}>
            Book a session
          </div>

          {availability.length === 0 ? (
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

          {availability.length > 0 && (
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
          {reviews.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '28px 0' }}>
              No reviews yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {reviews.map((r, i) => (
                <div key={r.id} style={{ borderBottom: i < reviews.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: i < reviews.length - 1 ? 18 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.student_name}</span>
                    <Stars rating={r.rating} />
                  </div>
                  {r.comment && <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>{r.comment}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <p style={{ fontSize: 11, color: 'var(--muted)', opacity: 0.7 }}>{new Date(r.created_at).toLocaleDateString()}</p>
                    {user && user.id !== r.student_id && (
                      <button onClick={() => { setReportingReview(r); setReportForm({ reason: 'spam', details: '' }); }} style={{
                        border: 'none', background: 'none', color: 'var(--muted)', fontSize: 11,
                        cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--font-ui)',
                      }}>
                        Report
                      </button>
                    )}
                  </div>
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
                        { tutor: 'Instruction', barber: 'Haircuts', 'hebrew tutor': 'Hebrew Instruction', fitness: 'Fitness' }[l.category] || l.category}
                    </div>
                    {l.bio && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380 }}>
                        {l.bio}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flexShrink: 0, marginLeft: 12, textAlign: 'right' }}>
                    {l.price_per_session > 0 ? money(discountedPrice(l)) : 'Free'}
                    {discountPercent(l) > 0 && (
                      <div style={{ fontSize: 10.5, color: '#166534', fontWeight: 800, marginTop: 2 }}>
                        {firstTimeDiscountLabel(l)}
                      </div>
                    )}
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
          ['How do I book this instructor?', 'Choose an available time on this profile and send a booking request. The instructor can confirm it from their dashboard.'],
          ['Can I message before booking?', 'Yes. Use the message button to ask about fit, class material, format, or online session details.'],
          ['Can I book online sessions?', 'Check the session type badge on the profile. Online and both-mode instructors can coordinate remote sessions.'],
          ['What happens after I book?', 'Ask Marketplace sends the booking request, opens a message thread, and gives calendar options after confirmation.'],
          ['What if I need a different time?', 'Use the request time section if no listed availability works for you.'],
        ]}
      />

      {reportingReview && (
        <div onClick={() => setReportingReview(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <form onSubmit={reportReview} onClick={e => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: 420, padding: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 10 }}>Report review</h2>
            <select value={reportForm.reason} onChange={e => setReportForm(f => ({ ...f, reason: e.target.value }))} style={{
              width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: 11, marginBottom: 10,
              fontFamily: 'var(--font-ui)', background: '#fff',
            }}>
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="fake review">Fake review</option>
              <option value="offensive content">Offensive content</option>
              <option value="other">Other</option>
            </select>
            <textarea value={reportForm.details} onChange={e => setReportForm(f => ({ ...f, details: e.target.value }))} rows={3} placeholder="Optional details" style={{
              width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: 11,
              fontFamily: 'var(--font-ui)', resize: 'vertical', boxSizing: 'border-box',
            }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button type="button" onClick={() => setReportingReview(null)} style={{ border: '1px solid var(--border)', background: '#fff', borderRadius: 999, padding: '9px 16px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ border: 'none', background: 'var(--text)', color: '#fff', borderRadius: 999, padding: '9px 18px', cursor: 'pointer', fontWeight: 800 }}>Submit</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
