import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';
import api from '../api';

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropOpen, setDropOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [pendingBookings, setPendingBookings] = useState(0);
  const dropRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); setDropOpen(false); }, [location.pathname]);

  // Poll unread message count + notification badge
  useEffect(() => {
    if (!user) { setUnread(0); setNotifCount(0); return; }
    function poll() {
      api.get('/dm/unread').then(({ data }) => setUnread(data.count)).catch(() => {});
      api.get('/bookings/notifications').then(({ data }) => {
        setNotifCount(data.total);
        setPendingBookings(data.pending_bookings || 0);
      }).catch(() => {});
    }
    poll();
    const t = setInterval(poll, 30000);
    return () => clearInterval(t);
  }, [user?.id]);

  async function handleSignOut() {
    setDropOpen(false); setMobileOpen(false);
    await signOut();
    navigate('/');
  }

  return (
    <nav style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{
        maxWidth: 1080, margin: '0 auto', padding: '0 20px',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>

        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <img src="/logo.png" alt="ASK" style={{ height: 38 }} />
        </Link>

        {/* ── DESKTOP NAV ── */}
        <div className="nav-desktop">
          <NavLink to="/browse">Browse</NavLink>
          <NavLink to="/people">People</NavLink>

          {user ? (
            <>
              {user.is_admin ? (
                <Link to="/admin" style={{
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.3px',
                  color: '#92400E', textDecoration: 'none',
                  background: '#FEF3C7', border: '1px solid #FDE68A',
                  padding: '3px 10px', borderRadius: 999,
                }}>
                  Admin
                </Link>
              ) : null}

              <NavLink to="/create-listing">Post a service</NavLink>

              {/* Messages icon */}
              <Link to="/messages" title="Messages"
                style={{ position: 'relative', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {unread > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -5,
                    background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 700,
                    minWidth: 15, height: 15, borderRadius: 999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px', fontFamily: 'var(--font-ui)',
                  }}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>

              {/* Avatar dropdown */}
              <div ref={dropRef} style={{ position: 'relative' }}>
                <button onClick={() => setDropOpen(o => !o)} style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--accent)', color: 'var(--primary)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-ui)', overflow: 'hidden', padding: 0,
                  position: 'relative',
                }}>
                  {mediaUrl(user.avatar_url)
                    ? <img src={mediaUrl(user.avatar_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initials(user.name)}
                </button>
                {notifCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -2, right: -2,
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#EF4444', border: '2px solid var(--bg)',
                    pointerEvents: 'none',
                  }} />
                )}

                {dropOpen && (
                  <div style={{
                    position: 'absolute', right: 0, top: 40,
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '6px 0',
                    minWidth: 210, boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                    zIndex: 100, animation: 'slideDown 0.15s ease both',
                  }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--accent)', color: 'var(--primary)', overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-ui)',
                        border: '1px solid var(--border)',
                      }}>
                        {mediaUrl(user.avatar_url)
                          ? <img src={mediaUrl(user.avatar_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : initials(user.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                        {user.role === 'provider' && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: 'var(--accent)', color: 'var(--primary)', display: 'inline-block', marginTop: 4 }}>
                            Provider
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ padding: '6px 0' }}>
                      <DropItem to="/account" label="My Profile" onClick={() => setDropOpen(false)} />
                      <DropItem to="/people" label="People" onClick={() => setDropOpen(false)} />
                      <DropItem to="/messages" label="Messages" onClick={() => setDropOpen(false)} />
                      <DropItem to="/dashboard/student" label="My Bookings" onClick={() => setDropOpen(false)} />
                      {user.role === 'provider' && pendingBookings > 0 && (
                        <Link to="/dashboard/provider" onClick={() => setDropOpen(false)} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 16px', fontSize: 13, color: '#92400E', textDecoration: 'none',
                          background: '#FFFBEB',
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = '#FEF3C7'}
                          onMouseLeave={e => e.currentTarget.style.background = '#FFFBEB'}
                        >
                          <span>Pending Requests</span>
                          <span style={{
                            background: '#F59E0B', color: '#fff', fontSize: 10, fontWeight: 700,
                            minWidth: 18, height: 18, borderRadius: 999,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '0 4px',
                          }}>
                            {pendingBookings}
                          </span>
                        </Link>
                      )}
                      {user.role === 'provider' && (
                        <DropItem to="/dashboard/provider" label="My Services" onClick={() => setDropOpen(false)} />
                      )}
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', padding: '6px 0 2px' }}>
                      <button onClick={handleSignOut} style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '8px 16px', background: 'none', border: 'none',
                        fontSize: 13, color: '#DC2626', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                      }}>
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login">Log in</NavLink>
              <Link to="/signup" style={{
                background: 'var(--primary)', color: '#fff',
                padding: '7px 18px', borderRadius: 999,
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}>
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* ── MOBILE RIGHT (avatar + hamburger) ── */}
        <div className="nav-mobile">
          {user && (
            <Link to="/messages" title="Messages"
              style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '4px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {unread > 0 && (
                <span style={{
                  position: 'absolute', top: 0, right: 0,
                  background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 700,
                  minWidth: 14, height: 14, borderRadius: 999,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 2px',
                }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
          )}

          {user && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--accent)', color: 'var(--primary)',
                border: '1px solid var(--border)', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 11, fontFamily: 'var(--font-ui)',
              }}>
                {mediaUrl(user.avatar_url)
                  ? <img src={mediaUrl(user.avatar_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials(user.name)}
              </div>
              {notifCount > 0 && (
                <span style={{
                  position: 'absolute', top: -1, right: -1,
                  width: 9, height: 9, borderRadius: '50%',
                  background: '#EF4444', border: '2px solid var(--bg)',
                  pointerEvents: 'none',
                }} />
              )}
            </div>
          )}

          {/* Hamburger */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Menu"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 4px', display: 'flex', flexDirection: 'column',
              gap: 5, justifyContent: 'center', alignItems: 'center',
            }}
          >
            <span style={{
              display: 'block', width: 22, height: 2,
              background: 'var(--text)', borderRadius: 2,
              transition: 'transform 0.2s, opacity 0.2s',
              transform: mobileOpen ? 'translateY(7px) rotate(45deg)' : 'none',
            }} />
            <span style={{
              display: 'block', width: 22, height: 2,
              background: 'var(--text)', borderRadius: 2,
              opacity: mobileOpen ? 0 : 1, transition: 'opacity 0.2s',
            }} />
            <span style={{
              display: 'block', width: 22, height: 2,
              background: 'var(--text)', borderRadius: 2,
              transition: 'transform 0.2s, opacity 0.2s',
              transform: mobileOpen ? 'translateY(-7px) rotate(-45deg)' : 'none',
            }} />
          </button>
        </div>
      </div>

      {/* ── MOBILE DRAWER ── */}
      <div className={`nav-drawer${mobileOpen ? ' open' : ''}`}>
        <Link to="/browse" onClick={() => setMobileOpen(false)}>Browse</Link>
        <Link to="/people" onClick={() => setMobileOpen(false)}>People</Link>

        {user ? (
          <>
            {user.is_admin && (
              <Link to="/admin" onClick={() => setMobileOpen(false)}
                style={{ color: '#92400E', fontWeight: 700 }}>
                Admin
              </Link>
            )}
            <Link to="/create-listing" onClick={() => setMobileOpen(false)}>Post a service</Link>
            <Link to="/account" onClick={() => setMobileOpen(false)}>My Profile</Link>
            <Link to="/messages" onClick={() => setMobileOpen(false)}>Messages</Link>
            <Link to="/dashboard/student" onClick={() => setMobileOpen(false)}>My Bookings</Link>
            {user.role === 'provider' && (
              <Link to="/dashboard/provider" onClick={() => setMobileOpen(false)}>My Services</Link>
            )}
            <button onClick={handleSignOut} style={{ color: '#DC2626', fontWeight: 600 }}>Sign out</button>
          </>
        ) : (
          <>
            <Link to="/login" onClick={() => setMobileOpen(false)}>Log in</Link>
            <Link to="/signup" onClick={() => setMobileOpen(false)} style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

function NavLink({ to, children }) {
  return (
    <Link to={to} style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', textDecoration: 'none', transition: 'color .15s', whiteSpace: 'nowrap' }}
      onMouseEnter={e => e.target.style.color = 'var(--text)'}
      onMouseLeave={e => e.target.style.color = 'var(--muted)'}
    >
      {children}
    </Link>
  );
}

function DropItem({ to, label, onClick }) {
  return (
    <Link to={to} onClick={onClick} style={{
      display: 'block', padding: '8px 16px',
      fontSize: 13, color: 'var(--text)', textDecoration: 'none',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      {label}
    </Link>
  );
}
