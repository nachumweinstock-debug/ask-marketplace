import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';

const isLegacyEncrypted = body => typeof body === 'string' && body.startsWith('enc:v1:');

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function Avatar({ name, avatar_url, size = 36 }) {
  return mediaUrl(avatar_url) ? (
    <img src={mediaUrl(avatar_url)} alt={name}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--cream-200)' }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--cream-100)', border: '1px solid var(--cream-300)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontSize: size * 0.33, fontFamily: 'var(--font-display)',
      color: 'var(--ink-700)', overflow: 'hidden',
    }}>
      {initials(name)}
    </div>
  );
}

export default function DirectMessages() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { fetchConversations(); }, []);

  useEffect(() => {
    if (userId) {
      fetchMessages(userId);
      inputRef.current?.focus();
    } else {
      setMessages([]);
      setOtherUser(null);
    }
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!userId) return;
    const t = setInterval(() => fetchMessages(userId), 8000);
    return () => clearInterval(t);
  }, [userId]);

  async function fetchConversations() {
    try {
      const { data } = await api.get('/dm');
      const masked = data.map(c => ({
        ...c,
        last_message: isLegacyEncrypted(c.last_message) ? '[Older message]' : c.last_message,
      }));
      setConversations(masked);
      if (userId) {
        const match = data.find(c => String(c.other_id) === String(userId));
        if (match) setOtherUser({ id: match.other_id, name: match.other_name, avatar_url: match.other_avatar_url });
      }
    } catch { /* silent */ }
    finally { setLoadingConvos(false); }
  }

  async function fetchMessages(uid) {
    setLoadingMessages(true);
    try {
      const { data } = await api.get(`/dm/${uid}`);
      setMessages(data);
      setConversations(cs => cs.map(c => String(c.other_id) === String(uid) ? { ...c, unread_count: 0 } : c));
    } catch { /* silent */ }
    finally { setLoadingMessages(false); }
  }

  useEffect(() => {
    if (!userId || otherUser) return;
    api.get(`/people/${userId}`)
      .then(({ data }) => setOtherUser({ id: data.id, name: data.name, avatar_url: data.avatar_url }))
      .catch(() => {});
  }, [userId, otherUser]);

  async function handleSend(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !userId || sending) return;
    setSending(true);
    const optimistic = {
      id: Date.now(),
      sender_id: user.id,
      receiver_id: Number(userId),
      body: text,
      created_at: new Date().toISOString(),
      sender_name: user.name,
    };
    setMessages(ms => [...ms, optimistic]);
    setBody('');
    try {
      const { data } = await api.post(`/dm/${userId}`, { body: text });
      setMessages(ms => ms.map(m => m.id === optimistic.id ? data : m));
      fetchConversations();
    } catch (err) {
      setMessages(ms => ms.filter(m => m.id !== optimistic.id));
      alert(err.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  const hasConvo = userId && otherUser;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const showList = !isMobile || !hasConvo;
  const showChat = !isMobile || hasConvo;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 48px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }} className="fade-up">
        <h1 style={{
          fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
          fontSize: 36, fontWeight: 600, color: 'var(--ink-900)',
          letterSpacing: '-0.02em',
        }}>
          Messages
        </h1>
      </div>

      <div style={{
        display: 'flex', border: '1px solid var(--cream-200)', borderRadius: 16,
        overflow: 'hidden', minHeight: 560, background: 'var(--cream-50)',
      }}>

        {/* ── Left panel: conversation list ── */}
        <div style={{
          width: showChat && !isMobile ? 280 : '100%',
          flexShrink: 0, borderRight: isMobile ? 'none' : '1px solid var(--cream-200)',
          overflowY: 'auto', display: showList ? 'flex' : 'none', flexDirection: 'column',
          background: 'var(--cream-50)',
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--cream-200)',
          }}>
            <span className="section-label">Conversations</span>
          </div>

          {loadingConvos ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-500)', fontSize: 13, fontFamily: 'var(--font-ui)' }}>Loading...</div>
          ) : (
            <>
              {userId && otherUser && !conversations.find(c => String(c.other_id) === String(userId)) && (
                <ConvoRow name={otherUser.name} avatar_url={otherUser.avatar_url} lastMsg="" unread={0} active onClick={() => navigate(`/messages/${userId}`)} />
              )}
              {conversations.length === 0 && !hasConvo ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-500)', fontSize: 14, lineHeight: 1.6, fontFamily: 'var(--font-ui)' }}>
                  No messages yet.<br />Browse providers or people to start a conversation.
                </div>
              ) : (
                conversations.map(c => (
                  <ConvoRow
                    key={c.other_id}
                    name={c.other_name}
                    avatar_url={c.other_avatar_url}
                    lastMsg={c.last_message}
                    unread={c.unread_count}
                    active={String(c.other_id) === String(userId)}
                    onClick={() => navigate(`/messages/${c.other_id}`)}
                  />
                ))
              )}
            </>
          )}
        </div>

        {/* ── Right panel: chat ── */}
        {hasConvo ? (
          <div style={{ flex: 1, display: showChat ? 'flex' : 'none', flexDirection: 'column', minWidth: 0, background: '#fff' }}>

            {/* Chat header */}
            <div style={{
              padding: '14px 24px', borderBottom: '1px solid var(--cream-200)',
              display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
              background: 'var(--cream-50)',
            }}>
              {isMobile && (
                <button onClick={() => navigate('/messages')} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px 8px 4px 0', color: 'var(--ink-900)', fontSize: 18, lineHeight: 1, flexShrink: 0,
                  fontFamily: 'var(--font-ui)',
                }}>
                  ←
                </button>
              )}
              <Avatar name={otherUser.name} avatar_url={otherUser.avatar_url} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--ink-900)',
                }}>{otherUser.name}</div>
              </div>
            </div>

            {/* Messages area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loadingMessages && messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--ink-500)', fontSize: 14, paddingTop: 60, fontFamily: 'var(--font-ui)' }}>Loading...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--ink-500)', fontSize: 14, paddingTop: 60, fontFamily: 'var(--font-ui)' }}>
                  No messages yet. Say hello!
                </div>
              ) : (
                messages.map(m => {
                  const isMe = m.sender_id === user?.id;
                  const encrypted = isLegacyEncrypted(m.body);
                  const displayBody = encrypted ? '[Older message — not available]' : m.body;
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
                      {!isMe && <Avatar name={otherUser.name} avatar_url={otherUser.avatar_url} size={28} />}
                      <div style={{
                        maxWidth: '68%', padding: '10px 16px',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isMe ? 'var(--ink-900)' : 'var(--cream-100)',
                        color: isMe ? 'var(--cream-50)' : 'var(--ink-900)',
                        fontSize: encrypted ? 12 : 14, lineHeight: 1.5,
                        fontStyle: encrypted ? 'italic' : 'normal',
                        opacity: encrypted ? 0.5 : 1,
                        fontFamily: 'var(--font-ui)',
                      }}>
                        {displayBody}
                        <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMe && m.read_at && (
                            <span style={{ marginLeft: 4 }}>· Read</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} style={{
              padding: '14px 20px', borderTop: '1px solid var(--cream-200)',
              display: 'flex', gap: 10, flexShrink: 0, background: 'var(--cream-50)',
            }}>
              <input
                ref={inputRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={`Message ${otherUser.name}...`}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
                style={{
                  flex: 1, border: '1px solid var(--cream-300)', borderRadius: 12,
                  padding: '11px 18px', fontSize: 14, outline: 'none',
                  fontFamily: 'var(--font-ui)', background: '#fff', color: 'var(--ink-900)',
                  transition: 'border-color .15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--ink-900)'}
                onBlur={e => e.target.style.borderColor = 'var(--cream-300)'}
              />
              <button type="submit" disabled={!body.trim() || sending} style={{
                background: body.trim() && !sending ? 'var(--ink-900)' : 'var(--cream-300)',
                color: body.trim() && !sending ? 'var(--cream-50)' : 'var(--ink-500)',
                border: 'none', borderRadius: 12,
                padding: '11px 22px', fontSize: 14, fontWeight: 600,
                cursor: body.trim() && !sending ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-ui)', flexShrink: 0,
                transition: 'background .15s, color .15s',
              }}>
                Send
              </button>
            </form>
          </div>
        ) : (
          <div style={{
            flex: 1, display: showChat ? 'flex' : 'none',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-500)', fontSize: 15, flexDirection: 'column', gap: 12,
            fontFamily: 'var(--font-ui)',
          }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--cream-300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Select a conversation</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ConvoRow({ name, avatar_url, lastMsg, unread, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 20px', width: '100%', textAlign: 'left',
      background: active ? 'var(--cream-100)' : 'transparent',
      border: 'none', borderBottom: '1px solid var(--cream-200)',
      cursor: 'pointer', fontFamily: 'var(--font-ui)',
      transition: 'background .12s',
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--cream-100)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <Avatar name={name} avatar_url={avatar_url} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 14, fontWeight: unread > 0 ? 700 : 500,
            color: 'var(--ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {name}
          </span>
          {unread > 0 && (
            <span style={{
              background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700,
              minWidth: 18, height: 18, borderRadius: 999, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
            }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        {lastMsg && (
          <div style={{ fontSize: 12, color: 'var(--ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
            {lastMsg}
          </div>
        )}
      </div>
    </button>
  );
}
