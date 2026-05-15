import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';

const CAT_LABELS = { tutor: 'Instructor', barber: 'Barber', 'hebrew tutor': 'Hebrew Instructor', tennis: 'Tennis', other: 'Other' };

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function sharedClasses(mine, theirs) {
  if (!mine || !theirs) return [];
  const a = mine.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
  const b = theirs.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
  return a.filter(c => b.includes(c));
}

function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: { background: 'var(--cream-100)', color: 'var(--ink-700)', border: '1px solid var(--cream-300)' },
    blue: { background: 'var(--accent)', color: 'var(--primary)', border: '1px solid rgba(37,99,235,.18)' },
    green: { background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' },
    amber: { background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' },
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11.5, fontWeight: 800, padding: '5px 10px', borderRadius: 999,
      fontFamily: 'var(--font-ui)', ...tones[tone],
    }}>
      {children}
    </span>
  );
}

function Avatar({ person, size = 108 }) {
  return mediaUrl(person.avatar_url) ? (
    <img src={mediaUrl(person.avatar_url)} alt={person.name}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '3px solid #fff', boxShadow: '0 10px 28px rgba(15,23,42,.12)' }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--accent)', color: 'var(--primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.32, fontFamily: 'var(--font-ui)',
      border: '3px solid #fff', boxShadow: '0 10px 28px rgba(15,23,42,.12)',
    }}>
      {initials(person.name)}
    </div>
  );
}

export default function UserProfile() {
  const { id, username } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connLoading, setConnLoading] = useState(false);

  useEffect(() => {
    const path = username ? `/people/u/${username}` : `/people/${id}`;
    api.get(path)
      .then(({ data }) => setPerson(data))
      .catch(() => navigate('/people'))
      .finally(() => setLoading(false));
  }, [id, username, navigate]);

  useEffect(() => {
    if (me && person?.id === me.id) navigate('/account', { replace: true });
  }, [me, person?.id, navigate]);

  async function handleConnect() {
    if (!me) return navigate('/login');
    setConnLoading(true);
    try {
      const status = person.connection_status;
      const iReceived = status === 'pending' && person.requester_id !== me.id;
      const connected = status === 'accepted';
      const iSent = status === 'pending' && person.requester_id === me.id;

      if (!status) {
        const { data } = await api.post('/people/connections', { receiver_id: person.id });
        setPerson(p => ({ ...p, connection_id: data.id, connection_status: data.status, requester_id: data.requester_id }));
      } else if (iReceived) {
        const { data } = await api.patch(`/people/connections/${person.connection_id}`, {});
        setPerson(p => ({ ...p, connection_status: 'accepted', connection_id: data.id }));
      } else if (connected || iSent) {
        await api.delete(`/people/connections/${person.connection_id}`);
        setPerson(p => ({ ...p, connection_id: null, connection_status: null, requester_id: null }));
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally {
      setConnLoading(false);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
  if (!person) return null;

  const myClasses = me?.classes_taking || '';
  const shared = sharedClasses(myClasses, person.classes_taking);
  const classes = (person.classes_taking || '').split(',').map(c => c.trim()).filter(Boolean);
  const catLabel = person.custom_category || CAT_LABELS[person.category] || null;
  const status = person.connection_status;
  const iReceived = status === 'pending' && person.requester_id !== me?.id;
  const iSent = status === 'pending' && person.requester_id === me?.id;
  const connected = status === 'accepted';
  const canAct = me && me.id !== person.id;
  const price = Number(person.price_per_session || 0);

  return (
    <div className="page" style={{ maxWidth: 1040 }}>
      <Link to="/people" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
      >
        ← Back to people
      </Link>

      <section className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ minHeight: 86, background: 'linear-gradient(135deg, var(--cream-100), #fff 58%, var(--accent))', borderBottom: '1px solid var(--border)' }} />
        <div style={{ padding: '0 28px 28px', display: 'flex', gap: 24, alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 22, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: -54 }}>
            <Avatar person={person} />
            <div style={{ paddingTop: 54, minWidth: 240 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {catLabel && <Pill tone="blue">{catLabel}</Pill>}
                {shared.length > 0 && <Pill tone="amber">{shared.length} shared {shared.length === 1 ? 'class' : 'classes'}</Pill>}
                {connected && <Pill tone="green">Connected</Pill>}
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--text)', letterSpacing: '-0.3px', lineHeight: 1.05, marginBottom: 8 }}>
                {person.name}
              </h1>
              <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
                {person.major || 'ASK member'}{person.username ? ` / @${person.username}` : ''}
              </div>
            </div>
          </div>

          {canAct && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginLeft: 'auto' }}>
              <button onClick={() => navigate(`/messages/${person.id}`)} style={{
                padding: '11px 18px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
                background: '#fff', color: 'var(--text)', border: '1.5px solid var(--border)',
              }}>
                Message
              </button>
              <button onClick={handleConnect} disabled={connLoading} style={{
                padding: '11px 18px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                cursor: connLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-ui)', flexShrink: 0,
                ...(connected
                  ? { background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }
                  : iReceived
                  ? { background: 'var(--primary)', color: '#fff', border: 'none' }
                  : iSent
                  ? { background: 'none', color: 'var(--muted)', border: '1px solid var(--border)' }
                  : { background: 'var(--primary)', color: '#fff', border: 'none' }),
              }}>
                {connLoading ? '...'
                  : connected ? 'Connected'
                  : iReceived ? 'Accept Request'
                  : iSent ? 'Request Sent'
                  : '+ Connect'}
              </button>
            </div>
          )}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 16 }}>
        <div style={{ display: 'grid', gap: 16 }}>
          {person.user_bio && (
            <section className="card" style={{ padding: 24 }}>
              <div className="section-label" style={{ marginBottom: 12 }}>About</div>
              <p style={{ fontSize: 15, color: 'var(--text)', margin: 0, lineHeight: 1.7, maxWidth: 680 }}>
                {person.user_bio}
              </p>
            </section>
          )}

          {(person.major || classes.length > 0) && (
            <section className="card" style={{ padding: 24 }}>
              <div className="section-label" style={{ marginBottom: 16 }}>Academics</div>
              {person.major && (
                <div style={{ marginBottom: classes.length ? 18 : 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800, marginBottom: 5 }}>Major</div>
                  <div style={{ fontSize: 15, color: 'var(--text)', fontWeight: 650 }}>{person.major}</div>
                </div>
              )}
              {classes.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800, marginBottom: 10 }}>Classes</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {classes.map(cls => {
                      const isShared = shared.includes(cls.toLowerCase());
                      return (
                        <span key={cls} style={{
                          fontSize: 12, padding: '6px 10px', borderRadius: 999,
                          background: isShared ? '#FEF3C7' : 'var(--bg)',
                          color: isShared ? '#92400E' : 'var(--muted)',
                          border: `1px solid ${isShared ? '#FDE68A' : 'var(--border)'}`,
                          fontWeight: isShared ? 800 : 600,
                        }}>
                          {isShared ? `Shared: ${cls}` : cls}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {person.mutual_connections?.length > 0 && (
            <section className="card" style={{ padding: 24 }}>
              <div className="section-label" style={{ marginBottom: 16 }}>Mutual Connections</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {person.mutual_connections.map(m => (
                  <Link key={m.id} to={`/people/${m.id}`} style={{
                    display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
                    padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)',
                  }}>
                    {mediaUrl(m.avatar_url) ? (
                      <img src={mediaUrl(m.avatar_url)} alt={m.name}
                        style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} />
                    ) : (
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: 'var(--accent)', color: 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-ui)',
                      }}>
                        {initials(m.name)}
                      </div>
                    )}
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside style={{ display: 'grid', gap: 16, alignSelf: 'start' }}>
          <section className="card" style={{ padding: 22 }}>
            <div className="section-label" style={{ marginBottom: 16 }}>Snapshot</div>
            <div style={{ display: 'grid', gap: 12 }}>
              <Snapshot label="Role" value={person.role === 'provider' ? 'Provider' : 'Student'} />
              <Snapshot label="Major" value={person.major || 'Not listed'} />
              <Snapshot label="Shared classes" value={shared.length ? String(shared.length) : 'None yet'} />
              {catLabel && <Snapshot label="Service" value={catLabel} />}
            </div>
          </section>

          {person.provider_profile_id && (
            <section className="card" style={{ padding: 22 }}>
              <div className="section-label" style={{ marginBottom: 14 }}>Service</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <Pill tone="blue">{catLabel}</Pill>
                {price > 0 && (
                  <strong style={{ fontSize: 18, color: 'var(--text)' }}>${price}<span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>/session</span></strong>
                )}
              </div>
              {person.listing_bio && (
                <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.65, margin: '0 0 16px' }}>
                  {person.listing_bio}
                </p>
              )}
              {person.rating > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                  <span style={{ color: '#F59E0B' }}>★</span>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{person.rating.toFixed(1)}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {person.review_count} review{person.review_count !== 1 ? 's' : ''}</span>
                </div>
              )}
              <Link to={`/providers/${person.provider_profile_id}`} style={{
                display: 'block', textAlign: 'center', background: 'var(--primary)', color: '#fff',
                padding: '11px 16px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                textDecoration: 'none',
              }}>
                View listing
              </Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Snapshot({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline' }}>
      <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>{label}</span>
      <strong style={{ fontSize: 13, color: 'var(--text)', textAlign: 'right', overflowWrap: 'anywhere' }}>{value}</strong>
    </div>
  );
}
