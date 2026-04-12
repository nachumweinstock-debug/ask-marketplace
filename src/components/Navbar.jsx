import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    function handle(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    navigate('/');
  }

  return (
    <nav style={{
      background: 'var(--bg)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{
        maxWidth: 1080, margin: '0 auto', padding: '0 32px',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>

        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <img src="/logo.png" alt="ASK" style={{ height: 32 }} />
        </Link>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <NavLink to="/browse">Browse</NavLink>

          {/* Admin link — only visible to admins */}
          {user?.is_admin ? (
            <Link to="/admin" style={{
              fontSize: 12, fontWeight: 700, letterSpacing: '0.3px',
              color: '#92400E', textDecoration: 'none',
              background: '#FEF3C7', border: '1px solid #FDE68A',
              padding: '3px 10px', borderRadius: 999,
              transition: 'opacity .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Admin
            </Link>
          ) : null}

          {user ? (
            <>
              <NavLink to="/create-listing">Post a service</NavLink>

              {/* Avatar dropdown */}
              <div ref={dropRef} style={{ position: 'relative' }}>
                <button onClick={() => setOpen(o => !o)} style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--accent)', color: 'var(--primary)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-ui)', overflow: 'hidden', padding: 0,
                }}>
                  {mediaUrl(user.avatar_url) ? (
                    <img src={mediaUrl(user.avatar_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : initials(user.name)}
                </button>

                {open && (
                  <div style={{
                    position: 'absolute', right: 0, top: 40,
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '6px 0',
                    minWidth: 210, boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                    zIndex: 100,
                  }}>
                    {/* User info */}
                    <div style={{ padding: '12px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--accent)', color: 'var(--primary)', overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-ui)',
                        border: '1px solid var(--border)',
                      }}>
                        {mediaUrl(user.avatar_url) ? (
                          <img src={mediaUrl(user.avatar_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : initials(user.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                          {user.role === 'provider' && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: 'var(--accent)', color: 'var(--primary)' }}>
                              Provider
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Links */}
                    <div style={{ padding: '6px 0' }}>
                      <DropItem to="/account" label="My Profile" onClick={() => setOpen(false)} />
                      <DropItem to="/dashboard/student" label="My Bookings" onClick={() => setOpen(false)} />
                      {user.role === 'provider' && (
                        <DropItem to="/dashboard/provider" label="My Services" onClick={() => setOpen(false)} />
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', padding: '6px 0 2px' }}>
                      <button onClick={handleSignOut} style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '8px 16px', background: 'none', border: 'none',
                        fontSize: 13, color: '#DC2626', cursor: 'pointer',
                        fontFamily: 'var(--font-ui)',
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
                transition: 'opacity .15s',
              }}
                onMouseEnter={e => e.target.style.opacity = '0.88'}
                onMouseLeave={e => e.target.style.opacity = '1'}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, children }) {
  return (
    <Link to={to} style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', textDecoration: 'none', transition: 'color .15s' }}
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
      transition: 'background .1s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      {label}
    </Link>
  );
}
