import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { fmtTime, fmtDay } from '../lib/slots';

const CAT_LABELS = { tutor: 'Tutor', barber: 'Barber', 'hebrew tutor': 'Hebrew Tutor', tennis: 'Tennis', other: 'Other' };

export default function Chat() {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  const fetchMessages = useCallback(async (scroll = false) => {
    try {
      const { data } = await api.get(`/messages/booking/${bookingId}`);
      setBooking(data.booking);
      setMessages(data.messages);
      if (scroll) {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) navigate('/dashboard/student');
    } finally {
      setLoading(false);
    }
  }, [bookingId, navigate]);

  useEffect(() => {
    fetchMessages(true);
    pollRef.current = setInterval(() => fetchMessages(false), 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  async function handleSend(e) {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/messages/booking/${bookingId}`, { body });
      setMessages(m => [...m, data]);
      setBody('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );

  if (!booking) return null;

  const isStudent = user?.id === booking.student_id;
  const otherName = isStudent ? booking.provider_name : booking.student_name;
  const catLabel = booking.custom_category || CAT_LABELS[booking.category] || 'Other';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 0', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>

      {/* Header */}
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <Link
          to={isStudent ? '/dashboard/student' : '/dashboard/provider'}
          style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none', display: 'inline-block', marginBottom: 14 }}
          onMouseEnter={e => e.target.style.color = 'var(--text)'}
          onMouseLeave={e => e.target.style.color = 'var(--muted)'}
        >
          ← Back to dashboard
        </Link>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: 'var(--accent)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-ui)',
          }}>
            {(otherName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{otherName}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {catLabel} · {fmtDay(booking.date)} · {fmtTime(booking.start_time)}–{fmtTime(booking.end_time)}
            </div>
          </div>
          <Link
            to={`/providers/${booking.provider_profile_id}`}
            style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none', fontWeight: 500, flexShrink: 0 }}
          >
            View listing →
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '4px 0 16px',
        minHeight: 0,
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)', fontSize: 13 }}>
            No messages yet. Say hi!
          </div>
        ) : (
          messages.map(msg => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div key={msg.id} style={{
                display: 'flex',
                justifyContent: isMine ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '72%',
                  background: isMine ? 'var(--primary)' : 'var(--card)',
                  color: isMine ? '#fff' : 'var(--text)',
                  border: isMine ? 'none' : '1px solid var(--border)',
                  borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '10px 14px',
                }}>
                  {!isMine && (
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--primary)', marginBottom: 4, opacity: 0.8 }}>
                      {msg.sender_name}
                    </div>
                  )}
                  <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.body}
                  </div>
                  <div style={{
                    fontSize: 10, marginTop: 4, opacity: 0.65,
                    color: isMine ? 'rgba(255,255,255,0.85)' : 'var(--muted)',
                    textAlign: 'right',
                  }}>
                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        flexShrink: 0,
        padding: '12px 0 24px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
      }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            style={{
              flex: 1,
              resize: 'none',
              border: '1.5px solid var(--border)',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 14,
              fontFamily: 'var(--font-ui)',
              outline: 'none',
              background: 'var(--card)',
              color: 'var(--text)',
              maxHeight: 120,
              overflowY: 'auto',
              lineHeight: 1.5,
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button type="submit" disabled={!body.trim() || sending} style={{
            background: !body.trim() || sending ? '#93C5FD' : 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: !body.trim() || sending ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-ui)',
            flexShrink: 0,
            height: 44,
          }}>
            {sending ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
