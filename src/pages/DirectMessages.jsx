import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function Avatar({ name, avatar_url, size = 36 }) {
  return mediaUrl(avatar_url) ? (
    <img src={mediaUrl(avatar_url)} alt={name}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--accent)', color: 'var(--primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.33, fontFamily: 'var(--font-ui)',
      border: '1px solid var(--border)', overflow: 'hidden',
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

  // Poll new messages when conversation is open
  useEffect(() => {
    if (!userId) return;
    const t = setInterval(() => fetchMessages(userId), 8000);
    return () => clearInterval(t);
  }, [userId]);

  async function fetchConversations() {
    try {
      const { data } = await api.get('/dm');
      setConversations(data);
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

  // If recipient not in convo list yet (new conversation), look them up
  useEffect(() => {
    if (!userId || otherUser) return;
    api.get(`/people/${userId}`)
      .then(({ data }) => setOtherUser({ id: data.id, name: data.name, avatar_url: data.avatar_url }))
      .catch(() => {});
  }, [userId, otherUser]);

  async function handleSend(e) {
    e.preventDefault();
    if (!body.trim() || !userId || sending) return;
    setSending(true);
    const optimistic = {
      id: Date.now(),
      sender_id: user.id,
      receiver_id: Number(userId),
      body: body.trim(),
      created_at: new Date().toISOString(),
      sender_name: user.name,
    };
    setMessages(ms => [...ms, optimistic]);
    setBody('');
    try {
      const { data } = await api.post(`/dm/${userId}`, { body: optimistic.body });
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
  // On mobile: show list when no convo selected, show chat when convo selected
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const showList = !isMobile || !hasConvo;
  const showChat = !isMobile || hasConvo;

  return (
    <div className="page" style={{ maxWidth: 900, paddingTop: 32, paddingLeft: 0, paddingRight: 0 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text)', letterSpacing: '-0.3px', marginBottom: 20, padding: '0 16px' }}>
        Messages
      </h1>

      <div style={{
        display: 'flex', border: '1px solid var(--border)', borderRadius: 12,
        overflow: 'hidden', minHeight: 520, background: 'var(--card)',
      }}>

        {/* Left panel — conversation list */}
        <div style={{
          width: showChat && !isMobile ? 260 : '100%',
          flexShrink: 0, borderRight: isMobile ? 'none' : '1px solid var(--border)',
          overflowY: 'auto', display: showList ? 'flex' : 'none', flexDirection: 'column',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Conversations
          </div>

          {loadingConvos ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
          ) : (
            <>
              {/* Show current recipient first if not yet in list */}
              {userId && otherUser && !conversations.find(c => String(c.other_id) === String(userId)) && (
                <ConvoRow
                  name={otherUser.name}
                  avatar_url={otherUser.avatar_url}
                  lastMsg=""
                  unread={0}
                  active
                  onClick={() => {}}
                />
              )}
              {conversations.length === 0 && !hasConvo ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
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

        {/* Right panel — chat or placeholder */}
        {hasConvo ? (
          <div style={{ flex: 1, display: showChat ? 'flex' : 'none', flexDirection: 'column', minWidth: 0 }}>

            {/* Chat header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              {isMobile && (
                <button onClick={() => navigate('/messages')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0', color: 'var(--primary)', fontSize: 20, lineHeight: 1, flexShrink: 0 }}>
                  ←
                </button>
              )}
              <Avatar name={otherUser.name} avatar_url={otherUser.avatar_url} size={36} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{otherUser.name}</div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loadingMessages && messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, paddingTop: 40 }}>Loading...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, paddingTop: 40 }}>
                  No messages yet. Say hello!
                </div>
              ) : (
                messages.map(m => {
                  const isMe = m.sender_id === user?.id;
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
                      {!isMe && <Avatar name={otherUser.name} avatar_url={otherUser.avatar_url} size={28} />}
                      <div style={{
                        maxWidth: '68%', padding: '9px 14px',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isMe ? 'var(--primary)' : 'var(--bg)',
                        color: isMe ? '#fff' : 'var(--text)',
                        fontSize: 13.5, lineHeight: 1.5,
                        border: isMe ? 'none' : '1px solid var(--border)',
                      }}>
                        {m.body}
                        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, flexShrink: 0 }}>
              <input
                ref={inputRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={`Message ${otherUser.name}...`}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { handleSend(e); } }}
                style={{
                  flex: 1, border: '1.5px solid var(--border)', borderRadius: 999,
                  padding: '9px 16px', fontSize: 13, outline: 'none',
                  fontFamily: 'var(--font-ui)', background: '#fff', color: 'var(--text)',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <button type="submit" disabled={!body.trim() || sending} style={{
                background: body.trim() && !sending ? 'var(--primary)' : '#93C5FD',
                color: '#fff', border: 'none', borderRadius: 999,
                padding: '9px 20px', fontSize: 13, fontWeight: 600,
                cursor: body.trim() && !sending ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-ui)', flexShrink: 0,
              }}>
                Send
              </button>
            </form>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14, flexDirection: 'column', gap: 10 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Select a conversation to start messaging</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ConvoRow({ name, avatar_url, lastMsg, unread, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '13px 16px', width: '100%', textAlign: 'left',
      background: active ? 'var(--accent)' : 'none',
      border: 'none', borderBottom: '1px solid var(--border)',
      cursor: 'pointer', fontFamily: 'var(--font-ui)',
    }}>
      <Avatar name={name} avatar_url={avatar_url} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: unread > 0 ? 700 : 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </span>
          {unread > 0 && (
            <span style={{
              background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700,
              minWidth: 18, height: 18, borderRadius: 999, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
            }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        {lastMsg && (
          <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
            {lastMsg}
          </div>
        )}
      </div>
    </button>
  );
}
