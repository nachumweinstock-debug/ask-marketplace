import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';

const CAT_LABELS = { tutor: 'Tutor', barber: 'Barber', 'hebrew tutor': 'Hebrew Tutor', tennis: 'Tennis', other: 'Other' };

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function sharedClasses(mine, theirs) {
  if (!mine || !theirs) return [];
  const a = mine.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
  const b = theirs.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
  return a.filter(c => b.includes(c));
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
  }, [id, username]);

  // Redirect to own account page if logged in and viewing own profile
  useEffect(() => {
    if (me && person?.id === me.id) navigate('/account', { replace: true });
  }, [me, person?.id]);

  // When not logged in, UserProfile works as read-only — no redirect needed

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
  const catLabel = person.custom_category || CAT_LABELS[person.category] || null;
  const status = person.connection_status;
  const iReceived = status === 'pending' && person.requester_id !== me?.id;
  const iSent = status === 'pending' && person.requester_id === me?.id;
  const connected = status === 'accepted';

  return (
    <div className="page" style={{ maxWidth: 760 }}>

      <Link to="/people" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none', display: 'inline-block', marginBottom: 28 }}
        onMouseEnter={e => e.target.style.color = 'var(--text)'}
        onMouseLeave={e => e.target.style.color = 'var(--muted)'}
      >
        ← Back to people
      </Link>

      {/* Profile card */}
      <div className="card" style={{ padding: '32px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Avatar */}
          {mediaUrl(person.avatar_url) ? (
            <img src={mediaUrl(person.avatar_url)} alt={person.name}
              style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--border)' }} />
          ) : (
            <div style={{
              width: 88, height: 88, borderRadius: '50%', flexShrink: 0,
              background: 'var(--accent)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 30, fontFamily: 'var(--font-ui)',
            }}>
              {initials(person.name)}
            </div>
          )}

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)', letterSpacing: '-0.3px', marginBottom: 4 }}>
                  {person.name}
                </h1>
                {person.major && (
                  <div style={{ fontSize: 14, color: 'var(--muted)' }}>{person.major}</div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {catLabel && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: 'var(--accent)', color: 'var(--primary)' }}>
                      {catLabel}
                    </span>
                  )}
                  {shared.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: '#FEF3C7', color: '#92400E' }}>
                      {shared.length} shared {shared.length === 1 ? 'class' : 'classes'}
                    </span>
                  )}
                  {connected && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: '#F0FDF4', color: '#166534' }}>
                      Connected ✓
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {me && me.id !== person.id && (
                  <button onClick={() => navigate(`/messages/${person.id}`)} style={{
                    padding: '9px 22px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-ui)',
                    background: 'var(--bg)', color: 'var(--text)', border: '1.5px solid var(--border)',
                  }}>
                    Message
                  </button>
                )}
                {me && me.id !== person.id && (
                  <button onClick={handleConnect} disabled={connLoading} style={{
                    padding: '9px 22px', borderRadius: 999, fontSize: 13, fontWeight: 600,
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
                      : connected ? 'Connected ✓'
                      : iReceived ? 'Accept Request'
                      : iSent ? 'Request Sent'
                      : '+ Connect'}
                  </button>
                )}
              </div>
            </div>

            {person.user_bio && (
              <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 16, lineHeight: 1.65, maxWidth: 520 }}>
                {person.user_bio}
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: person.provider_profile_id ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr', gap: 16 }}>

        {/* Academics */}
        {(person.major || person.classes_taking) && (
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>
              Academics
            </div>
            {person.major && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>Major</div>
                <div style={{ fontSize: 14, color: 'var(--text)' }}>{person.major}</div>
              </div>
            )}
            {person.classes_taking && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>Classes</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {person.classes_taking.split(',').map(cls => {
                    const c = cls.trim();
                    const isShared = shared.includes(c.toLowerCase());
                    return c ? (
                      <span key={c} style={{
                        fontSize: 11.5, padding: '3px 10px', borderRadius: 999,
                        background: isShared ? '#FEF3C7' : 'var(--bg)',
                        color: isShared ? '#92400E' : 'var(--muted)',
                        border: `1px solid ${isShared ? '#FDE68A' : 'var(--border)'}`,
                        fontWeight: isShared ? 700 : 400,
                      }}>
                        {isShared ? `★ ${c}` : c}
                      </span>
                    ) : null;
                  })}
                </div>
                {shared.length > 0 && (
                  <div style={{ fontSize: 11.5, color: '#92400E', marginTop: 10, fontWeight: 500 }}>
                    ★ You share {shared.length} {shared.length === 1 ? 'class' : 'classes'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Provider listing */}
        {person.provider_profile_id && (
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>
              Offers a Service
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: 'var(--accent)', color: 'var(--primary)' }}>
                {catLabel}
              </span>
              {person.price_per_session > 0 && (
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  ${person.price_per_session}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>/session</span>
                </span>
              )}
            </div>
            {person.listing_bio && (
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
                {person.listing_bio}
              </p>
            )}
            {person.rating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <span style={{ color: '#F59E0B' }}>★</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{person.rating.toFixed(1)}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {person.review_count} review{person.review_count !== 1 ? 's' : ''}</span>
              </div>
            )}
            <Link to={`/providers/${person.provider_profile_id}`} style={{
              display: 'inline-block', background: 'var(--primary)', color: '#fff',
              padding: '8px 20px', borderRadius: 999, fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
            }}>
              View listing →
            </Link>
          </div>
        )}
      </div>

      {/* Mutual connections */}
      {person.mutual_connections?.length > 0 && (
        <div className="card" style={{ padding: '24px', marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>
            Mutual Connections
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {person.mutual_connections.map(m => (
              <Link key={m.id} to={`/people/${m.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                {mediaUrl(m.avatar_url) ? (
                  <img src={mediaUrl(m.avatar_url)} alt={m.name}
                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} />
                ) : (
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--accent)', color: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-ui)',
                  }}>
                    {initials(m.name)}
                  </div>
                )}
                <span style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500 }}>{m.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
