import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BLUE = '#2B6CB0';

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function navLink(to, label) {
    const active = location.pathname === to || location.pathname.startsWith(to + '/');
    return (
      <Link to={to} style={{
        fontSize: 13, color: active ? BLUE : '#64748B',
        fontWeight: active ? 600 : 400, textDecoration: 'none',
        transition: 'color 0.15s',
      }}>
        {label}
      </Link>
    );
  }

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    navigate('/');
  }

  return (
    <nav style={{
      background: '#fff',
      borderBottom: '1px solid #E2E8F0',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 6, background: BLUE,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, color: '#fff', letterSpacing: '-0.5px',
          }}>ASK</div>
          <div>
            <div style={{ color: '#1A1A2E', fontSize: 15, fontWeight: 600 }}>YU Services</div>
            <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 1 }}>Yeshiva University</div>
          </div>
        </Link>

        {/* Center nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {navLink('/browse', 'Browse')}
          {user && navLink('/dashboard/student', 'My Bookings')}
          {user?.role === 'provider' && navLink('/dashboard/provider', 'My Services')}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user ? (
            <>
              <Link to="/create-listing" style={{
                background: BLUE, color: '#fff', padding: '5px 14px',
                borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none',
              }}>
                + Post a listing
              </Link>

              {/* Avatar dropdown */}
              <div ref={dropRef} style={{ position: 'relative' }}>
                <button onClick={() => setOpen(o => !o)} style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: BLUE, color: '#fff',
                  border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, letterSpacing: 0.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {initials(user.name)}
                </button>

                {open && (
                  <div style={{
                    position: 'absolute', right: 0, top: 40,
                    background: '#fff', border: '1px solid #E2E8F0',
                    borderRadius: 10, padding: '6px 0',
                    minWidth: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    zIndex: 100,
                  }}>
                    {/* User info */}
                    <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>{user.name}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{user.email}</div>
                      {user.role === 'provider' && (
                        <div style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: '#EBF4FF', color: BLUE }}>
                          Provider
                        </div>
                      )}
                    </div>

                    {/* Links */}
                    <div style={{ padding: '6px 0' }}>
                      <DropItem to="/dashboard/student" label="My Bookings" onClick={() => setOpen(false)} />
                      {user.role === 'provider' && (
                        <DropItem to="/dashboard/provider" label="My Services" onClick={() => setOpen(false)} />
                      )}
                      {user.role === 'admin' && (
                        <DropItem to="/admin" label="Admin Dashboard" onClick={() => setOpen(false)} />
                      )}
                    </div>

                    {/* Sign out */}
                    <div style={{ borderTop: '1px solid #F1F5F9', padding: '6px 0 2px' }}>
                      <button onClick={handleSignOut} style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '8px 16px', background: 'none', border: 'none',
                        fontSize: 13, color: '#EF4444', cursor: 'pointer',
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
              <Link to="/login" style={{
                color: '#64748B', padding: '5px 14px', borderRadius: 6, fontSize: 12,
                fontWeight: 500, textDecoration: 'none', border: '1px solid #E2E8F0',
              }}>
                Log in
              </Link>
              <Link to="/signup" style={{
                background: BLUE, color: '#fff', padding: '5px 14px',
                borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none',
              }}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function DropItem({ to, label, onClick }) {
  return (
    <Link to={to} onClick={onClick} style={{
      display: 'block', padding: '8px 16px',
      fontSize: 13, color: '#1A1A2E', textDecoration: 'none',
    }}
      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      {label}
    </Link>
  );
}
