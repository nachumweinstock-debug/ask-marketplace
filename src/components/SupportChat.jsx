import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const SHORTCUTS = [
  'Booking help',
  'Instructor account help',
  'Payment issue',
  'Technical issue',
  'Report a problem',
];

const PROMPTS = {
  'Booking help': 'I need help with booking an instructor session.',
  'Instructor account help': 'I need help becoming an instructor or managing my instructor listing.',
  'Payment issue': 'I have a payment, charge, or refund issue.',
  'Technical issue': 'Something on the site is broken or not working.',
  'Report a problem': 'I want to report a problem with Ask Marketplace.',
};

export { SHORTCUTS, PROMPTS };

export default function SupportChat({ compact = false, initialPrompt = '' }) {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState(() => localStorage.getItem('ask_support_conversation_id') || '');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState(initialPrompt);
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const delayRef = useRef(null);

  useEffect(() => { setEmail(user?.email || email); }, [user?.email]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, loading]);
  useEffect(() => {
    function handlePrefill(event) {
      if (event.detail) setText(String(event.detail));
    }
    window.addEventListener('ask-support-prefill', handlePrefill);
    return () => window.removeEventListener('ask-support-prefill', handlePrefill);
  }, []);
  useEffect(() => () => { if (delayRef.current) clearTimeout(delayRef.current); }, []);

  async function sendMessage(message = text) {
    const body = message.trim();
    if (!body || loading) return;
    setText('');
    setError('');
    setMessages((items) => [...items, { sender_type: 'user', message: body }]);
    setLoading(true);
    try {
      const { data } = await api.post('/support/chat', {
        userMessage: body,
        conversationId: conversationId || undefined,
        userEmail: user?.email || email || undefined,
      });
      if (data.conversationId) {
        setConversationId(data.conversationId);
        localStorage.setItem('ask_support_conversation_id', data.conversationId);
      }
      delayRef.current = setTimeout(() => {
        setMessages((items) => [...items, { sender_type: 'bot', message: data.botMessage }]);
        setLoading(false);
      }, 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Support is unavailable. Try again in a moment.');
      setLoading(false);
    }
  }

  return (
    <div className="support-chat-shell" style={{
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: compact ? 14 : 18,
      boxShadow: compact ? '0 18px 48px rgba(0,0,0,0.18)' : 'var(--shadow-card)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: compact ? 14 : 18, borderBottom: '1px solid var(--border)', background: 'var(--gray-50)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#111827', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>?</div>
          <div>
            <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: 15 }}>Ask Support</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>Bot first, human review when needed.</div>
          </div>
        </div>
      </div>

      <div style={{ padding: compact ? 12 : 16, borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SHORTCUTS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => sendMessage(PROMPTS[label])}
            style={{
              border: '1px solid var(--border)',
              background: '#fff',
              borderRadius: 999,
              padding: '7px 10px',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {!user && (
        <div style={{ padding: compact ? '10px 12px' : '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email for follow-up (optional)"
            style={{
              width: '100%',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>
      )}

      <div style={{ height: compact ? 280 : 390, overflowY: 'auto', padding: compact ? 12 : 18, background: '#fff' }}>
        {messages.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
            Tell us what is going on. You can ask about bookings, instructors, payments, accounts, or technical problems.
          </div>
        )}
        {messages.map((message, index) => {
          const mine = message.sender_type === 'user';
          return (
            <div key={index} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
              <div style={{
                maxWidth: '82%',
                whiteSpace: 'pre-line',
                borderRadius: 14,
                padding: '10px 12px',
                background: mine ? '#111827' : 'var(--gray-50)',
                color: mine ? '#fff' : 'var(--text)',
                border: mine ? 'none' : '1px solid var(--border)',
                fontSize: 13.5,
                lineHeight: 1.45,
              }}>
                {message.message}
              </div>
            </div>
          );
        })}
        {loading && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Support is typing...</div>}
        {error && <div style={{ color: '#B91C1C', fontSize: 13 }}>{error}</div>}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} style={{ display: 'flex', gap: 8, padding: compact ? 12 : 16, borderTop: '1px solid var(--border)' }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask a question..."
          style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 12, padding: '11px 12px', fontSize: 14, outline: 'none' }}
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          style={{
            border: 'none',
            borderRadius: 12,
            padding: '0 16px',
            background: loading || !text.trim() ? 'var(--gray-200)' : '#111827',
            color: loading || !text.trim() ? 'var(--muted)' : '#fff',
            fontWeight: 800,
            cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
