import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import { StatusBadge } from './AdminSupport';

export default function AdminSupportConversation() {
  const { conversationId } = useParams();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const { data } = await api.get(`/support/admin/conversations/${conversationId}`);
    setConversation(data.conversation);
    setMessages(data.messages);
  }

  useEffect(() => {
    document.title = 'Support Conversation | Ask Admin';
    load().catch((err) => setError(err.response?.data?.error || 'Failed to load conversation')).finally(() => setLoading(false));
  }, [conversationId]);

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSaving(true);
    try {
      await api.post(`/support/admin/conversations/${conversationId}/reply`, { message: reply.trim() });
      setReply('');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reply');
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(status) {
    setSaving(true);
    try {
      await api.patch(`/support/admin/conversations/${conversationId}/status`, { status });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}>Loading conversation...</div>;
  if (!conversation) return <div style={{ padding: 80 }}>Conversation not found.</div>;

  return (
    <div className="admin-page" style={{ maxWidth: 920, margin: '0 auto', padding: '36px 20px 80px' }}>
      <Link to="/admin/support" style={{ color: 'var(--muted)', textDecoration: 'none', fontWeight: 700 }}>← Support inbox</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'end', margin: '18px 0 22px', flexWrap: 'wrap' }}>
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Conversation</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, color: 'var(--text)', lineHeight: 1 }}>{conversation.topic || 'Support'}</h1>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>{conversation.user_email || 'No email provided'}</p>
        </div>
        <StatusBadge status={conversation.status} />
      </div>

      {error && <div className="card" style={{ padding: 16, color: '#B91C1C', background: '#FEF2F2', borderColor: '#FECACA', marginBottom: 16 }}>{error}</div>}

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        {messages.map((message) => {
          const isUser = message.sender_type === 'user';
          const isAdmin = message.sender_type === 'admin';
          return (
            <div key={message.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
              <div style={{ maxWidth: '78%' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 800 }}>
                  {message.sender_type} · {new Date(message.created_at).toLocaleString()}
                </div>
                <div style={{
                  whiteSpace: 'pre-line',
                  borderRadius: 14,
                  padding: '11px 13px',
                  background: isUser ? '#111827' : isAdmin ? '#EFF6FF' : 'var(--gray-50)',
                  color: isUser ? '#fff' : 'var(--text)',
                  border: isUser ? 'none' : '1px solid var(--border)',
                  lineHeight: 1.5,
                }}>
                  {message.message}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={() => setStatus('needs_admin')} disabled={saving} className="admin-action-btn">Mark needs admin</button>
        <button onClick={() => setStatus('closed')} disabled={saving} className="admin-action-btn">Mark closed</button>
      </div>

      <form onSubmit={sendReply} className="card" style={{ padding: 16 }}>
        <label style={{ display: 'block', fontWeight: 800, marginBottom: 8 }}>Admin reply</label>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={4}
          placeholder="Write a manual support reply..."
          style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: 12, resize: 'vertical', fontFamily: 'var(--font-ui)' }}
        />
        <button type="submit" disabled={saving || !reply.trim()} className="admin-action-btn" style={{ marginTop: 10 }}>
          {saving ? 'Sending...' : 'Send admin reply'}
        </button>
      </form>
    </div>
  );
}
