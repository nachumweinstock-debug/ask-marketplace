import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';
import { redactContactText } from '../lib/redact';

const isLegacyEncrypted = body => typeof body === 'string' && body.startsWith('enc:v1:');

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function safeBody(body, adminMode = false) {
  if (isLegacyEncrypted(body)) return adminMode ? '[Older encrypted message]' : '[Older message]';
  return redactContactText(body || '');
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
      fontWeight: 700, fontSize: size * 0.32, fontFamily: 'var(--font-ui)',
      color: 'var(--ink-800)', overflow: 'hidden',
    }}>
      {initials(name)}
    </div>
  );
}

function adminTitle(convo) {
  return `${convo.user_a_name || 'User'} + ${convo.user_b_name || 'User'}`;
}

export default function DirectMessages({ adminMode = false }) {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [selectedPair, setSelectedPair] = useState('');
  const [search, setSearch] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const requestedUserId = adminMode ? searchParams.get('user') : '';
  const requestedPair = adminMode ? searchParams.get('pair') : '';

  useEffect(() => {
    function onResize() { setWindowWidth(window.innerWidth); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobile = windowWidth < 700;
  const activeKey = adminMode ? selectedPair : userId;
  const hasConvo = Boolean(activeKey && (adminMode ? participants.length === 2 : otherUser));
  const showList = !isMobile || !hasConvo;
  const showChat = !isMobile || hasConvo;

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter(c => {
      if (adminMode) {
        if (requestedUserId && String(c.user_a_id) !== requestedUserId && String(c.user_b_id) !== requestedUserId) {
          return false;
        }
        if (!q) return true;
        return [
          c.user_a_name,
          c.user_a_email,
          c.user_b_name,
          c.user_b_email,
          c.last_message,
        ].some(value => String(value || '').toLowerCase().includes(q));
      }
      if (!q) return true;
      return [c.other_name, c.last_message].some(value => String(value || '').toLowerCase().includes(q));
    });
  }, [adminMode, conversations, requestedUserId, search]);

  useEffect(() => { fetchConversations(); }, [adminMode]);

  useEffect(() => {
    if (!adminMode || conversations.length === 0) return;
    if (requestedPair && requestedPair !== selectedPair) {
      fetchMessages(requestedPair);
      return;
    }
    if (requestedUserId && !selectedPair) {
      const first = conversations.find(c => String(c.user_a_id) === requestedUserId || String(c.user_b_id) === requestedUserId);
      if (first) fetchMessages(first.pair_key);
    }
  }, [adminMode, conversations, requestedPair, requestedUserId, selectedPair]);

  useEffect(() => {
    if (adminMode) return;
    if (userId) {
      fetchMessages(userId);
      inputRef.current?.focus();
    } else {
      setMessages([]);
      setOtherUser(null);
    }
  }, [adminMode, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (adminMode || !userId) return;
    const t = setInterval(() => fetchMessages(userId), 8000);
    return () => clearInterval(t);
  }, [adminMode, userId]);

  async function fetchConversations() {
    setLoadingConvos(true);
    try {
      const endpoint = adminMode ? '/dm/admin/conversations' : '/dm';
      const { data } = await api.get(endpoint);
      const masked = data.map(c => ({
        ...c,
        last_message: safeBody(c.last_message, adminMode),
      }));
      setConversations(masked);
      if (!adminMode && userId) {
        const match = data.find(c => String(c.other_id) === String(userId));
        if (match) setOtherUser({ id: match.other_id, name: match.other_name, avatar_url: match.other_avatar_url });
      }
    } catch { /* silent */ }
    finally { setLoadingConvos(false); }
  }

  async function fetchMessages(key) {
    setLoadingMessages(true);
    try {
      if (adminMode) {
        const { data } = await api.get(`/dm/admin/conversations/${key}`);
        setParticipants(data.participants || []);
        setMessages(data.messages || []);
        setSelectedPair(data.pair_key);
        return;
      }

      const { data } = await api.get(`/dm/${key}`);
      setMessages(data);
      setConversations(cs => cs.map(c => String(c.other_id) === String(key) ? { ...c, unread_count: 0 } : c));
    } catch { /* silent */ }
    finally { setLoadingMessages(false); }
  }

  useEffect(() => {
    if (adminMode || !userId || otherUser) return;
    api.get(`/people/${userId}`)
      .then(({ data }) => setOtherUser({ id: data.id, name: data.name, avatar_url: data.avatar_url }))
      .catch(() => {});
  }, [adminMode, userId, otherUser]);

  async function handleSend(e) {
    e.preventDefault();
    const text = body.trim();
    if (adminMode || !text || !userId || sending) return;
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
      setSendError(err.response?.data?.error || 'Failed to send');
      setTimeout(() => setSendError(''), 4000);
    } finally {
      setSending(false);
    }
  }

  function openConversation(convo) {
    if (adminMode) {
      setSearchParams({ pair: convo.pair_key });
      fetchMessages(convo.pair_key);
      return;
    }
    navigate(`/messages/${convo.other_id}`);
  }

  function closeMobileChat() {
    if (adminMode) {
      setSelectedPair('');
      setParticipants([]);
      setMessages([]);
      setSearchParams({});
      return;
    }
    navigate('/messages');
  }

  const title = adminMode ? 'Direct Messages' : 'Messages';
  const subtitle = adminMode ? 'Admin read-only conversation review' : 'Conversations';
  const chatTitle = adminMode
    ? participants.map(p => p.name).join(' + ')
    : otherUser?.name;
  const chatAvatar = adminMode ? null : otherUser?.avatar_url;

  return (
    <div style={{ maxWidth: adminMode ? 1360 : 1100, margin: '0 auto', padding: isMobile ? '0 0 88px' : '28px 32px 70px' }}>
      <div style={{ padding: isMobile ? '16px 16px 12px' : '0 0 20px' }} className="fade-up">
        <h1 style={{
          fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
          fontSize: isMobile ? 28 : 36, fontWeight: 600, color: 'var(--ink-900)',
          marginBottom: 4,
        }}>
          {title}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-500)', fontFamily: 'var(--font-ui)' }}>{subtitle}</div>
          {adminMode && requestedUserId && (
            <button
              type="button"
              onClick={() => {
                setSelectedPair('');
                setParticipants([]);
                setMessages([]);
                setSearchParams({});
              }}
              style={{
                border: '1px solid var(--cream-300)', background: '#fff', color: 'var(--ink-700)',
                borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
              }}
            >
              Show all DMs
            </button>
          )}
        </div>
      </div>

      <div className="messages-shell" style={{
        display: 'flex',
        border: isMobile ? '1px solid var(--cream-200)' : '1px solid var(--cream-200)',
        borderLeft: isMobile ? 'none' : '1px solid var(--cream-200)',
        borderRight: isMobile ? 'none' : '1px solid var(--cream-200)',
        borderRadius: isMobile ? 0 : 16,
        overflow: 'hidden',
        height: isMobile ? 'calc(100dvh - 190px)' : adminMode ? 'calc(100vh - 250px)' : 640,
        minHeight: isMobile ? 480 : 560,
        background: 'var(--cream-50)',
      }}>
        <div style={{
          width: showChat && !isMobile ? (adminMode ? 430 : 340) : '100%',
          flexShrink: 0,
          borderRight: isMobile ? 'none' : '1px solid var(--cream-200)',
          overflowY: 'auto',
          display: showList ? 'flex' : 'none',
          flexDirection: 'column',
          background: 'var(--cream-50)',
        }}>
          <div style={{ padding: isMobile ? '14px 16px' : '16px 18px', borderBottom: '1px solid var(--cream-200)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <span className="section-label">{adminMode ? 'All DMs' : 'Conversations'}</span>
              {adminMode && (
                <span style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 700, fontFamily: 'var(--font-ui)' }}>
                  {requestedUserId ? `${filteredConversations.length}/${conversations.length}` : conversations.length}
                </span>
              )}
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={adminMode ? 'Search names, emails, messages...' : 'Search messages...'}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid var(--cream-300)',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
                fontFamily: 'var(--font-ui)',
                color: 'var(--ink-900)',
                background: '#fff',
                outline: 'none',
              }}
            />
          </div>

          {loadingConvos ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-500)', fontSize: 13, fontFamily: 'var(--font-ui)' }}>Loading...</div>
          ) : (
            <>
              {!adminMode && userId && otherUser && !conversations.find(c => String(c.other_id) === String(userId)) && (
                <ConvoRow
                  name={otherUser.name}
                  avatar_url={otherUser.avatar_url}
                  lastMsg=""
                  unread={0}
                  active
                  onClick={() => navigate(`/messages/${userId}`)}
                />
              )}
              {filteredConversations.length === 0 && !hasConvo ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-500)', fontSize: 14, lineHeight: 1.6, fontFamily: 'var(--font-ui)' }}>
                  {requestedUserId ? 'No DMs for this user.' : search ? 'No matching conversations.' : adminMode ? 'No direct messages yet.' : 'No messages yet.'}
                </div>
              ) : (
                filteredConversations.map(c => (
                  <ConvoRow
                    key={adminMode ? c.pair_key : c.other_id}
                    name={adminMode ? adminTitle(c) : c.other_name}
                    subtitle={adminMode ? `${c.user_a_email || 'No email'} / ${c.user_b_email || 'No email'}` : ''}
                    avatar_url={adminMode ? c.user_a_avatar_url : c.other_avatar_url}
                    lastMsg={c.last_message}
                    unread={c.unread_count}
                    meta={adminMode ? `${c.message_count} msg${c.message_count === 1 ? '' : 's'}` : ''}
                    active={adminMode ? c.pair_key === selectedPair : String(c.other_id) === String(userId)}
                    onClick={() => openConversation(c)}
                  />
                ))
              )}
            </>
          )}
        </div>

        {hasConvo ? (
          <div style={{ flex: 1, display: showChat ? 'flex' : 'none', flexDirection: 'column', minWidth: 0, background: '#fff' }}>
            <div style={{
              padding: isMobile ? '12px 16px' : '14px 22px',
              borderBottom: '1px solid var(--cream-200)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexShrink: 0,
              background: 'var(--cream-50)',
            }}>
              {isMobile && (
                <button onClick={closeMobileChat} aria-label="Back to messages" style={{
                  background: '#fff', border: '1px solid var(--cream-300)', cursor: 'pointer',
                  width: 36, height: 36, borderRadius: 10, color: 'var(--ink-900)', fontSize: 18, lineHeight: 1, flexShrink: 0,
                  fontFamily: 'var(--font-ui)',
                }}>
                  ←
                </button>
              )}
              <Avatar name={chatTitle} avatar_url={chatAvatar} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 700, color: 'var(--ink-900)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{chatTitle}</div>
                {adminMode && (
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {participants.map(p => p.email).filter(Boolean).join(' / ')}
                  </div>
                )}
              </div>
              {adminMode && (
                <span style={{
                  fontSize: 11, fontWeight: 800, color: '#92400E', background: '#FEF3C7',
                  border: '1px solid #FDE68A', borderRadius: 999, padding: '5px 10px', flexShrink: 0,
                }}>
                  Read-only
                </span>
              )}
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: isMobile ? '18px 14px 14px' : '24px 24px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              {loadingMessages && messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--ink-500)', fontSize: 14, paddingTop: 60, fontFamily: 'var(--font-ui)' }}>Loading...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--ink-500)', fontSize: 14, paddingTop: 60, fontFamily: 'var(--font-ui)' }}>
                  No messages yet.
                </div>
              ) : (
                messages.map(m => {
                  const isMe = !adminMode && m.sender_id === user?.id;
                  const alignRight = adminMode ? m.sender_id === participants[1]?.id : isMe;
                  const encrypted = isLegacyEncrypted(m.body);
                  const displayBody = safeBody(m.body, adminMode);
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
                      {!alignRight && (
                        <Avatar
                          name={m.sender_name || otherUser?.name}
                          avatar_url={adminMode ? m.sender_avatar_url : otherUser?.avatar_url}
                          size={28}
                        />
                      )}
                      <div style={{
                        maxWidth: isMobile ? '84%' : adminMode ? '82%' : '70%',
                        padding: adminMode ? '12px 15px' : '10px 14px',
                        borderRadius: alignRight ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: alignRight ? 'var(--blue-600)' : 'var(--cream-100)',
                        color: alignRight ? '#fff' : 'var(--ink-900)',
                        fontSize: encrypted ? 12 : adminMode ? 15 : 14,
                        lineHeight: adminMode ? 1.58 : 1.5,
                        fontStyle: encrypted ? 'italic' : 'normal',
                        opacity: encrypted ? 0.65 : 1,
                        fontFamily: 'var(--font-ui)',
                        overflowWrap: 'anywhere',
                      }}>
                        {adminMode && (
                          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.72, marginBottom: 4 }}>
                            {m.sender_name}
                          </div>
                        )}
                        {displayBody}
                        <div style={{ fontSize: 10, opacity: 0.55, marginTop: 4, textAlign: alignRight ? 'right' : 'left' }}>
                          {new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {!adminMode && isMe && m.read_at && (
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

            {adminMode ? (
              <div style={{
                padding: isMobile ? '12px 16px' : '14px 20px',
                borderTop: '1px solid var(--cream-200)',
                background: 'var(--cream-50)',
                fontSize: 12,
                color: 'var(--ink-500)',
                fontFamily: 'var(--font-ui)',
                flexShrink: 0,
              }}>
                Admin view only. This does not mark messages as read.
              </div>
            ) : (
              <>
                {sendError && (
                  <div style={{ padding: '6px 20px 0', fontSize: 12, color: '#DC2626' }}>{sendError}</div>
                )}
                <form onSubmit={handleSend} style={{
                  padding: isMobile ? '10px 12px calc(10px + env(safe-area-inset-bottom))' : '14px 20px',
                  borderTop: '1px solid var(--cream-200)',
                  display: 'flex',
                  gap: 10,
                  flexShrink: 0,
                  background: 'var(--cream-50)',
                  alignItems: 'flex-end',
                }}>
                  <textarea
                    ref={inputRef}
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder={`Message ${otherUser.name}...`}
                    rows={1}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                    style={{
                      flex: 1,
                      resize: 'none',
                      border: '1px solid var(--cream-300)',
                      borderRadius: 12,
                      padding: '11px 13px',
                      fontSize: 16,
                      outline: 'none',
                      fontFamily: 'var(--font-ui)',
                      background: '#fff',
                      color: 'var(--ink-900)',
                      maxHeight: 118,
                      minHeight: 44,
                      lineHeight: 1.35,
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--blue-600)'}
                    onBlur={e => e.target.style.borderColor = 'var(--cream-300)'}
                    onInput={e => {
                      e.currentTarget.style.height = 'auto';
                      e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 118)}px`;
                    }}
                  />
                  <button type="submit" disabled={!body.trim() || sending} style={{
                    background: body.trim() && !sending ? 'var(--blue-600)' : 'var(--cream-300)',
                    color: body.trim() && !sending ? '#fff' : 'var(--ink-500)',
                    border: 'none',
                    borderRadius: 12,
                    width: isMobile ? 52 : 'auto',
                    height: 44,
                    padding: isMobile ? 0 : '0 22px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: body.trim() && !sending ? 'pointer' : 'not-allowed',
                    fontFamily: 'var(--font-ui)',
                    flexShrink: 0,
                  }}>
                    {isMobile ? '→' : 'Send'}
                  </button>
                </form>
              </>
            )}
          </div>
        ) : (
          <div style={{
            flex: 1,
            display: showChat ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-500)',
            fontSize: 15,
            flexDirection: 'column',
            gap: 12,
            fontFamily: 'var(--font-ui)',
          }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--cream-300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>{adminMode ? 'Select a DM thread' : 'Select a conversation'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ConvoRow({ name, subtitle = '', avatar_url, lastMsg, unread, active, onClick, meta = '' }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 18px', width: '100%', textAlign: 'left',
      background: active ? 'var(--cream-100)' : 'transparent',
      border: 'none', borderBottom: '1px solid var(--cream-200)',
      cursor: 'pointer', fontFamily: 'var(--font-ui)',
      transition: 'background .12s',
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--cream-100)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <Avatar name={name} avatar_url={avatar_url} size={42} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 14, fontWeight: unread > 0 ? 800 : 650,
            color: 'var(--ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {name}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {meta && <span style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 700 }}>{meta}</span>}
            {unread > 0 && (
              <span style={{
                background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 800,
                minWidth: 18, height: 18, borderRadius: 999, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
              }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
        </div>
        {subtitle && (
          <div style={{ fontSize: 11.5, color: 'var(--ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
            {subtitle}
          </div>
        )}
        {lastMsg && (
          <div style={{ fontSize: 12, color: 'var(--ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 3 }}>
            {lastMsg}
          </div>
        )}
      </div>
    </button>
  );
}
