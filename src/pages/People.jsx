import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';

function MessageButton({ personId }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  function handleClick(e) {
    e.preventDefault(); e.stopPropagation();
    navigate(user ? `/messages/${personId}` : '/login');
  }
  return (
    <button onClick={handleClick} title="Message" style={{
      fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 999,
      background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)',
      cursor: 'pointer', fontFamily: 'var(--font-ui)', flexShrink: 0,
    }}>
      Msg
    </button>
  );
}

const CAT_LABELS = { tutor: 'Tutor', barber: 'Barber', 'hebrew tutor': 'Hebrew Tutor', tennis: 'Tennis', other: 'Other' };

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function sharedClasses(myClasses, theirClasses) {
  if (!myClasses || !theirClasses) return [];
  const mine = myClasses.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
  const theirs = theirClasses.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
  return mine.filter(c => theirs.includes(c));
}

function ConnectButton({ person, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const isMe = user?.id === person.id;
  if (isMe) return null;

  const status = person.connection_status;
  const iReceived = status === 'pending' && person.requester_id !== user?.id;
  const iSent     = status === 'pending' && person.requester_id === user?.id;
  const connected = status === 'accepted';

  async function handleConnect(e) {
    e.preventDefault(); e.stopPropagation();
    if (!user) { window.location.href = '/login'; return; }
    setLoading(true);
    try {
      if (!status) {
        const { data } = await api.post('/people/connections', { receiver_id: person.id });
        onUpdate(person.id, data);
      } else if (iReceived) {
        const { data } = await api.patch(`/people/connections/${person.connection_id}`, {});
        onUpdate(person.id, data);
      } else if (connected || iSent) {
        await api.delete(`/people/connections/${person.connection_id}`);
        onUpdate(person.id, null);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  if (connected) return (
    <button onClick={handleConnect} disabled={loading}
      style={{
        fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 999,
        background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0',
        cursor: 'pointer', fontFamily: 'var(--font-ui)', flexShrink: 0,
      }}>
      Connected ✓
    </button>
  );

  if (iReceived) return (
    <button onClick={handleConnect} disabled={loading}
      style={{
        fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 999,
        background: 'var(--primary)', color: '#fff', border: 'none',
        cursor: 'pointer', fontFamily: 'var(--font-ui)', flexShrink: 0,
      }}>
      Accept
    </button>
  );

  if (iSent) return (
    <button onClick={handleConnect} disabled={loading}
      style={{
        fontSize: 12, fontWeight: 500, padding: '5px 14px', borderRadius: 999,
        background: 'none', color: 'var(--muted)', border: '1px solid var(--border)',
        cursor: 'pointer', fontFamily: 'var(--font-ui)', flexShrink: 0,
      }}>
      Pending
    </button>
  );

  return (
    <button onClick={handleConnect} disabled={loading}
      style={{
        fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 999,
        background: 'var(--accent)', color: 'var(--primary)', border: '1px solid #BFDBFE',
        cursor: 'pointer', fontFamily: 'var(--font-ui)', flexShrink: 0,
      }}>
      {loading ? '...' : '+ Connect'}
    </button>
  );
}

function PersonCard({ person, myClasses, onUpdate }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const shared = sharedClasses(myClasses, person.classes_taking);
  const catLabel = person.custom_category || CAT_LABELS[person.category] || null;

  return (
    <div
      onClick={() => navigate(`/people/${person.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '20px',
        boxShadow: hovered ? '0 6px 24px rgba(0,0,0,0.09)' : '0 1px 4px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow .2s, transform .2s',
        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Avatar */}
        <div style={{ flexShrink: 0 }}>
          {mediaUrl(person.avatar_url) ? (
            <img src={mediaUrl(person.avatar_url)} alt={person.name}
              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} />
          ) : (
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--accent)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-ui)',
            }}>
              {initials(person.name)}
            </div>
          )}
        </div>

        {/* Name + info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
            {person.name}
          </div>
          {person.major && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{person.major}</div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
            {catLabel && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                background: 'var(--accent)', color: 'var(--primary)',
              }}>
                {catLabel}
              </span>
            )}
            {shared.length > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: '#FEF3C7', color: '#92400E',
              }}>
                {shared.length} shared {shared.length === 1 ? 'class' : 'classes'}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <MessageButton personId={person.id} />
          <ConnectButton person={person} onUpdate={onUpdate} />
        </div>
      </div>

      {/* Bio */}
      {person.user_bio && (
        <p style={{
          fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55, margin: 0,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {person.user_bio}
        </p>
      )}

      {/* Classes */}
      {person.classes_taking && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {person.classes_taking.split(',').slice(0, 5).map(cls => {
            const c = cls.trim();
            const isShared = shared.includes(c.toLowerCase());
            return c ? (
              <span key={c} style={{
                fontSize: 10.5, padding: '2px 8px', borderRadius: 999,
                background: isShared ? '#FEF3C7' : 'var(--bg)',
                color: isShared ? '#92400E' : 'var(--muted)',
                border: `1px solid ${isShared ? '#FDE68A' : 'var(--border)'}`,
                fontWeight: isShared ? 600 : 400,
              }}>
                {c}
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

export default function People() {
  const { user } = useAuth();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('discover');
  const [connections, setConnections] = useState(null);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  const myClasses = user?.classes_taking || '';

  useEffect(() => { fetchPeople(); }, []);

  async function fetchPeople(q) {
    setLoading(true);
    try {
      const params = {};
      if (q !== undefined ? q : search) params.search = q !== undefined ? q : search;
      const { data } = await api.get('/people', { params });
      setPeople(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchConnections() {
    setConnectionsLoading(true);
    try {
      const { data } = await api.get('/people/connections/mine');
      setConnections(data);
    } catch (err) {
      console.error(err);
    } finally {
      setConnectionsLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'connections' && user) fetchConnections();
  }, [tab, user]);

  function handleSearch(e) {
    e.preventDefault();
    fetchPeople(search);
  }

  function handleUpdate(personId, connData) {
    setPeople(ps => ps.map(p => {
      if (p.id !== personId) return p;
      if (!connData) return { ...p, connection_id: null, connection_status: null, requester_id: null };
      return { ...p, connection_id: connData.id, connection_status: connData.status, requester_id: connData.requester_id };
    }));
    // Also refresh connections tab if open
    if (tab === 'connections') fetchConnections();
  }

  // Sort: pending-received first, then shared classes, then connected, then rest
  const sorted = [...people].sort((a, b) => {
    const aReceived = a.connection_status === 'pending' && a.requester_id !== user?.id ? 1 : 0;
    const bReceived = b.connection_status === 'pending' && b.requester_id !== user?.id ? 1 : 0;
    if (bReceived !== aReceived) return bReceived - aReceived;
    const aShared = sharedClasses(myClasses, a.classes_taking).length;
    const bShared = sharedClasses(myClasses, b.classes_taking).length;
    return bShared - aShared;
  });

  const hasRequests = connections?.pending_received?.length > 0;

  return (
    <div className="page" style={{ paddingTop: 40 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 6 }}>
          People
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>Find classmates, connect with people in your community.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28, gap: 0 }}>
        {[
          { id: 'discover', label: 'Discover' },
          { id: 'connections', label: hasRequests ? `Connections (${connections?.pending_received?.length} new)` : 'Connections' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13.5, fontWeight: tab === t.id ? 600 : 400,
            color: tab === t.id ? 'var(--primary)' : 'var(--muted)',
            borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
            fontFamily: 'var(--font-ui)', transition: 'color .15s',
          }}>
            {t.id === 'connections' && hasRequests ? (
              <span>{`Connections `}
                <span style={{ background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '1px 6px', marginLeft: 2 }}>
                  {connections.pending_received.length}
                </span>
              </span>
            ) : t.label}
          </button>
        ))}
      </div>

      {/* Discover tab */}
      {tab === 'discover' && (
        <>
          {/* Search */}
          <form onSubmit={handleSearch} style={{ marginBottom: 28 }}>
            <div style={{
              display: 'flex', background: '#fff',
              borderRadius: 999, overflow: 'hidden',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              maxWidth: 480,
            }}>
              <input
                type="text"
                placeholder="Search by name, major, or class..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, border: 'none', padding: '11px 20px',
                  fontSize: 13, outline: 'none', background: 'transparent',
                  color: 'var(--text)', fontFamily: 'var(--font-ui)',
                }}
              />
              <button type="submit" style={{
                background: 'var(--primary)', color: '#fff', border: 'none',
                padding: '0 20px', fontSize: 13, cursor: 'pointer', fontWeight: 600,
                fontFamily: 'var(--font-ui)',
              }}>
                Search
              </button>
            </div>
          </form>

          {loading ? (
            <div className="provider-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="card" style={{ padding: '20px', height: 140 }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F1F5F9', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 13, background: '#F1F5F9', borderRadius: 6, width: '55%', marginBottom: 8 }} />
                      <div style={{ height: 11, background: '#F1F5F9', borderRadius: 6, width: '40%' }} />
                    </div>
                  </div>
                  <div style={{ height: 11, background: '#F1F5F9', borderRadius: 6, width: '80%', marginBottom: 6 }} />
                  <div style={{ height: 11, background: '#F1F5F9', borderRadius: 6, width: '60%' }} />
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text)', marginBottom: 10 }}>
                Nobody here yet.
              </div>
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>Be the first to fill out your profile.</div>
            </div>
          ) : (
            <>
              {myClasses && sorted.some(p => sharedClasses(myClasses, p.classes_taking).length > 0) && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, fontWeight: 500 }}>
                  People with shared classes are shown first — highlighted in yellow.
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, fontWeight: 500 }}>
                {sorted.length} {sorted.length === 1 ? 'person' : 'people'}
              </div>
              <div className="provider-grid">
                {sorted.map(p => (
                  <PersonCard key={p.id} person={p} myClasses={myClasses} onUpdate={handleUpdate} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Connections tab */}
      {tab === 'connections' && (
        <ConnectionsPanel
          connections={connections}
          loading={connectionsLoading}
          onUpdate={(id, data) => {
            fetchConnections();
            setPeople(ps => ps.map(p => {
              if (p.id !== id) return p;
              if (!data) return { ...p, connection_id: null, connection_status: null, requester_id: null };
              return { ...p, connection_id: data.id, connection_status: data.status, requester_id: data.requester_id };
            }));
          }}
        />
      )}
    </div>
  );
}

function ConnectionsPanel({ connections, loading, onUpdate }) {
  const { user } = useAuth();

  async function accept(conn) {
    try {
      const { data } = await api.patch(`/people/connections/${conn.connection_id}`, {});
      onUpdate(conn.id, data);
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  }

  async function remove(conn) {
    try {
      await api.delete(`/people/connections/${conn.connection_id}`);
      onUpdate(conn.id, null);
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
  );

  const { accepted = [], pending_received = [], pending_sent = [] } = connections || {};

  if (!accepted.length && !pending_received.length && !pending_sent.length) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text)', marginBottom: 10 }}>
          No connections yet
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
          Head to Discover to find classmates and send requests.
        </div>
        <button onClick={() => {}} style={{
          background: 'var(--primary)', color: '#fff', border: 'none',
          padding: '10px 24px', borderRadius: 999, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--font-ui)',
        }}>
          Browse people
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Pending requests received */}
      {pending_received.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>
            Requests ({pending_received.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending_received.map(p => (
              <MiniPersonRow key={p.id} person={p}
                right={
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => accept(p)} style={{
                      fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 999,
                      background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-ui)',
                    }}>Accept</button>
                    <button onClick={() => remove(p)} style={{
                      fontSize: 12, fontWeight: 500, padding: '6px 12px', borderRadius: 999,
                      background: 'none', color: 'var(--muted)', border: '1px solid var(--border)',
                      cursor: 'pointer', fontFamily: 'var(--font-ui)',
                    }}>Decline</button>
                  </div>
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Accepted connections */}
      {accepted.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>
            My Connections ({accepted.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
            {accepted.map(p => (
              <MiniPersonRow key={p.id} person={p} link
                right={
                  <button onClick={e => { e.preventDefault(); remove(p); }} style={{
                    fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none',
                    cursor: 'pointer', padding: 0, fontFamily: 'var(--font-ui)',
                  }}>Remove</button>
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending sent */}
      {pending_sent.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>
            Sent Requests ({pending_sent.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending_sent.map(p => (
              <MiniPersonRow key={p.id} person={p}
                right={
                  <button onClick={() => remove(p)} style={{
                    fontSize: 12, fontWeight: 500, padding: '6px 12px', borderRadius: 999,
                    background: 'none', color: 'var(--muted)', border: '1px solid var(--border)',
                    cursor: 'pointer', fontFamily: 'var(--font-ui)',
                  }}>Cancel</button>
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniPersonRow({ person, right, link }) {
  const inner = (
    <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
      {mediaUrl(person.avatar_url) ? (
        <img src={mediaUrl(person.avatar_url)} alt={person.name}
          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} />
      ) : (
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: 'var(--accent)', color: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-ui)',
        }}>
          {initials(person.name)}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{person.name}</div>
        {person.major && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{person.major}</div>}
      </div>
      {right}
    </div>
  );

  if (link) {
    return <Link to={`/people/${person.id}`} style={{ textDecoration: 'none' }}>{inner}</Link>;
  }
  return inner;
}
