import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function sharedClasses(myClasses, theirClasses) {
  if (!myClasses || !theirClasses) return [];
  const mine = myClasses.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
  const theirs = theirClasses.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
  return mine.filter(c => theirs.includes(c));
}

const CAT_LABELS = { tutor: 'TUTOR', barber: 'BARBER', 'hebrew tutor': 'HEBREW', tennis: 'FITNESS', fitness: 'FITNESS', other: 'OTHER' };

function MessageButton({ personId }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <button onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(user ? `/messages/${personId}` : '/login'); }}
      style={{
        fontSize: 13, fontWeight: 500, padding: '7px 16px', borderRadius: 10,
        background: 'transparent', color: 'var(--blue-600)',
        border: '1px solid var(--blue-600)', cursor: 'pointer',
        fontFamily: 'var(--font-ui)', flexShrink: 0,
        transition: 'all .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-600)'; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--blue-600)'; }}
    >
      Msg
    </button>
  );
}

function ConnectButton({ person, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  if (user?.id === person.id) return null;

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

  if (connected) {
    return (
      <span style={{
        fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500,
        color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 4,
        cursor: 'pointer',
      }} onClick={handleConnect} title="Remove connection">
        ✓ Connected
      </span>
    );
  }

  if (iReceived) return (
    <button onClick={handleConnect} disabled={loading} style={{
      fontSize: 13, fontWeight: 600, padding: '7px 18px', borderRadius: 10,
      background: 'var(--blue-600)', color: '#fff', border: 'none',
      cursor: 'pointer', fontFamily: 'var(--font-ui)', flexShrink: 0,
    }}>
      Accept
    </button>
  );

  if (iSent) return (
    <button onClick={handleConnect} disabled={loading} style={{
      fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 10,
      background: 'none', color: 'var(--ink-500)', border: '1px solid var(--cream-300)',
      cursor: 'pointer', fontFamily: 'var(--font-ui)', flexShrink: 0,
    }}>
      Pending
    </button>
  );

  return (
    <button onClick={handleConnect} disabled={loading} style={{
      fontSize: 13, fontWeight: 600, padding: '7px 18px', borderRadius: 10,
      background: 'var(--blue-600)', color: '#fff', border: 'none',
      cursor: 'pointer', fontFamily: 'var(--font-ui)', flexShrink: 0,
      transition: 'background .15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--blue-700)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--blue-600)'}
    >
      {loading ? '...' : '+ Connect'}
    </button>
  );
}

function PersonCard({ person, myClasses, onUpdate }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const shared = sharedClasses(myClasses, person.classes_taking);
  const catLabel = (person.custom_category || CAT_LABELS[person.category] || '').toUpperCase();

  return (
    <div
      onClick={() => navigate(`/people/${person.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--cream-50)',
        border: `1px solid ${hovered ? 'var(--blue-200)' : 'var(--cream-200)'}`,
        borderRadius: 16, padding: 22,
        boxShadow: hovered ? '0 12px 32px -12px rgba(59,130,246,0.12)' : 'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow .22s cubic-bezier(0.2,0.8,0.2,1), transform .22s cubic-bezier(0.2,0.8,0.2,1), border-color .22s cubic-bezier(0.2,0.8,0.2,1)',
        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      {/* Top row: avatar + name + actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flexShrink: 0 }}>
          {mediaUrl(person.avatar_url) ? (
            <img src={mediaUrl(person.avatar_url)} alt={person.name}
              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--cream-200)' }} />
          ) : (
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--blue-50)', border: '1px solid var(--blue-200)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16,
              color: 'var(--blue-600)',
            }}>
              {initials(person.name)}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
            fontSize: 20, fontWeight: 600, color: 'var(--ink-900)', lineHeight: 1.2,
          }}>
            {person.name}
          </div>
          {catLabel && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
              letterSpacing: '0.08em', color: 'var(--ink-500)', marginTop: 3,
            }}>
              {catLabel}
            </div>
          )}
          {!catLabel && person.major && (
            <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 2, fontFamily: 'var(--font-ui)' }}>
              {person.major}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
          <MessageButton personId={person.id} />
          <ConnectButton person={person} onUpdate={onUpdate} />
        </div>
      </div>

      {/* Shared classes badge */}
      {shared.length > 0 && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
          letterSpacing: '0.06em', color: '#92400E', background: '#FEF3C7',
          padding: '3px 10px', borderRadius: 999, display: 'inline-flex',
          alignSelf: 'flex-start',
        }}>
          {shared.length} SHARED {shared.length === 1 ? 'CLASS' : 'CLASSES'}
        </div>
      )}

      {/* Bio */}
      {person.user_bio && (
        <p style={{
          fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-700)',
          lineHeight: 1.55, margin: 0,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {person.user_bio}
        </p>
      )}

      {/* Classes pills */}
      {person.classes_taking && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {person.classes_taking.split(',').slice(0, 5).map(cls => {
            const c = cls.trim();
            const isShared = shared.includes(c.toLowerCase());
            return c ? (
              <span key={c} style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 999,
                background: isShared ? '#FEF3C7' : 'var(--cream-100)',
                color: isShared ? '#92400E' : 'var(--ink-500)',
                border: `1px solid ${isShared ? '#FDE68A' : 'var(--cream-200)'}`,
                fontWeight: isShared ? 600 : 400,
                fontFamily: 'var(--font-ui)',
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
  const debounceRef = useRef(null);

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

  function handleSearchInput(val) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPeople(val), 200);
  }

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
    if (tab === 'connections') fetchConnections();
  }

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
    <div className="page" style={{ paddingTop: 56 }}>

      {/* ── Hero ── */}
      <div style={{ marginBottom: 48 }} className="fade-up">
        <h1 style={{
          fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
          fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 600,
          color: 'var(--ink-900)', lineHeight: 1.05,
          letterSpacing: '-0.02em', marginBottom: 12,
        }}>
          Who's around.
        </h1>
        <p style={{
          fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 400,
          color: 'var(--ink-500)',
        }}>
          Classmates, collaborators, that one guy who fixes laptops.
        </p>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--cream-200)', marginBottom: 32, gap: 0 }}>
        {[
          { id: 'discover', label: 'Discover' },
          { id: 'connections', label: 'Connections' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: tab === t.id ? 600 : 400,
            color: tab === t.id ? 'var(--ink-900)' : 'var(--ink-500)',
            borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            fontFamily: 'var(--font-ui)', transition: 'color .15s',
            position: 'relative',
          }}>
            {t.label}
            {t.id === 'connections' && hasRequests && (
              <span style={{
                background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 700,
                borderRadius: 999, padding: '1px 6px', marginLeft: 6,
                verticalAlign: 'super',
              }}>
                {connections.pending_received.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Discover tab ── */}
      {tab === 'discover' && (
        <>
          {/* Search */}
          <form onSubmit={handleSearch} style={{ marginBottom: 32 }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'var(--cream-50)', border: '1px solid var(--cream-300)',
              borderRadius: 12, height: 52, overflow: 'hidden', maxWidth: 520,
            }}>
              <div style={{ padding: '0 0 0 18px', display: 'flex', alignItems: 'center', color: 'var(--ink-500)', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name, major, or class..."
                value={search}
                onChange={e => handleSearchInput(e.target.value)}
                style={{
                  flex: 1, border: 'none', padding: '0 16px', height: '100%',
                  fontSize: 14, outline: 'none', background: 'transparent',
                  color: 'var(--ink-900)', fontFamily: 'var(--font-ui)',
                }}
              />
            </div>
          </form>

          {loading ? (
            <div className="provider-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{
                  background: 'var(--cream-50)', border: '1px solid var(--cream-200)',
                  borderRadius: 16, padding: 22, height: 160,
                }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--cream-200)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 16, background: 'var(--cream-200)', borderRadius: 6, width: '55%', marginBottom: 8 }} />
                      <div style={{ height: 11, background: 'var(--cream-200)', borderRadius: 6, width: '35%' }} />
                    </div>
                  </div>
                  <div style={{ height: 12, background: 'var(--cream-200)', borderRadius: 6, width: '80%', marginBottom: 6 }} />
                  <div style={{ height: 12, background: 'var(--cream-200)', borderRadius: 6, width: '55%' }} />
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
                fontSize: 28, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 10,
              }}>
                Nobody here yet.
              </div>
              <div style={{ fontSize: 15, color: 'var(--ink-500)', fontFamily: 'var(--font-ui)' }}>
                Be the first to fill out your profile.
              </div>
            </div>
          ) : (
            <>
              <div style={{
                fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-500)',
                marginBottom: 20, fontWeight: 500,
              }}>
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

      {/* ── Connections tab ── */}
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
    <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--ink-500)', fontSize: 14, fontFamily: 'var(--font-ui)' }}>Loading...</div>
  );

  const { accepted = [], pending_received = [], pending_sent = [] } = connections || {};

  if (!accepted.length && !pending_received.length && !pending_sent.length) {
    return (
      <div style={{
        background: 'var(--cream-50)', border: '1px solid var(--cream-200)',
        borderRadius: 16, textAlign: 'center', padding: '64px 24px',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
          fontSize: 24, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 10,
        }}>
          No connections yet
        </div>
        <div style={{ fontSize: 15, color: 'var(--ink-500)', fontFamily: 'var(--font-ui)' }}>
          Head to Discover to find classmates and send requests.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {pending_received.length > 0 && (
        <div>
          <div className="section-label" style={{ marginBottom: 14 }}>
            Requests ({pending_received.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending_received.map(p => (
              <MiniPersonRow key={p.id} person={p}
                right={
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => accept(p)} style={{
                      fontSize: 13, fontWeight: 600, padding: '7px 18px', borderRadius: 10,
                      background: 'var(--blue-600)', color: '#fff', border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-ui)',
                    }}>Accept</button>
                    <button onClick={() => remove(p)} style={{
                      fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: 10,
                      background: 'none', color: 'var(--ink-500)', border: '1px solid var(--cream-300)',
                      cursor: 'pointer', fontFamily: 'var(--font-ui)',
                    }}>Decline</button>
                  </div>
                }
              />
            ))}
          </div>
        </div>
      )}

      {accepted.length > 0 && (
        <div>
          <div className="section-label" style={{ marginBottom: 14 }}>
            My Connections ({accepted.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {accepted.map(p => (
              <MiniPersonRow key={p.id} person={p} link
                right={
                  <button onClick={e => { e.preventDefault(); remove(p); }} style={{
                    fontSize: 12, color: 'var(--ink-500)', background: 'none', border: 'none',
                    cursor: 'pointer', padding: 0, fontFamily: 'var(--font-ui)',
                  }}>Remove</button>
                }
              />
            ))}
          </div>
        </div>
      )}

      {pending_sent.length > 0 && (
        <div>
          <div className="section-label" style={{ marginBottom: 14 }}>
            Sent Requests ({pending_sent.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending_sent.map(p => (
              <MiniPersonRow key={p.id} person={p}
                right={
                  <button onClick={() => remove(p)} style={{
                    fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 10,
                    background: 'none', color: 'var(--ink-500)', border: '1px solid var(--cream-300)',
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
    <div style={{
      background: 'var(--cream-50)', border: '1px solid var(--cream-200)',
      borderRadius: 14, padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 12,
      transition: 'border-color .15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--cream-300)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--cream-200)'}
    >
      {mediaUrl(person.avatar_url) ? (
        <img src={mediaUrl(person.avatar_url)} alt={person.name}
          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--cream-200)' }} />
      ) : (
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: 'var(--cream-100)', border: '1px solid var(--cream-300)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
          color: 'var(--ink-700)',
        }}>
          {initials(person.name)}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
          color: 'var(--ink-900)',
        }}>{person.name}</div>
        {person.major && <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 1, fontFamily: 'var(--font-ui)' }}>{person.major}</div>}
      </div>
      {right}
    </div>
  );

  if (link) return <Link to={`/people/${person.id}`} style={{ textDecoration: 'none' }}>{inner}</Link>;
  return inner;
}
