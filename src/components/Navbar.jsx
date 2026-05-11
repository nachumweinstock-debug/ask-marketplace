import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';
import api from '../api';

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── iOS notification banner (slides from top) ─────────────────────────────────
function DmToast({ toast, onClose, navigate }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const showT = setTimeout(() => setVisible(true), 20);
    const hideT = setTimeout(() => { setVisible(false); setTimeout(onClose, 350); }, 5000);
    return () => { clearTimeout(showT); clearTimeout(hideT); };
  }, [toast, onClose]);

  if (!toast) return null;
  const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return (
    <div onClick={() => { navigate('/messages'); onClose(); }} style={{
      position: 'fixed', top: 12, left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : '-120%'})`,
      transition: 'transform 0.35s cubic-bezier(0.34,1.2,0.64,1)',
      zIndex: 9999, background: 'rgba(10,10,10,0.92)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 18, padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex', gap: 10, alignItems: 'center',
      cursor: 'pointer', width: 'clamp(280px,90vw,360px)', userSelect: 'none',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', fontFamily: 'var(--font-display)',
        fontSize: 14, fontWeight: 700, color: '#fff',
      }}>
        {mediaUrl(toast.avatar)
          ? <img src={mediaUrl(toast.avatar)} alt="" style={{ width:'100%',height:'100%',objectFit:'cover',borderRadius:10 }}/>
          : 'ASK'}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)', letterSpacing:'0.2px' }}>ASK · Messages</span>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)', flexShrink:0, marginLeft:8 }}>{timeStr}</span>
        </div>
        <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{toast.senderName}</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{toast.preview}</div>
      </div>
    </div>
  );
}

// ── Main Navbar ────────────────────────────────────────────────────────────────
export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropOpen, setDropOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [bookingNotifCount, setBookingNotifCount] = useState(0);
  const [pendingBookings, setPendingBookings] = useState(0);
  const [reminderCount, setReminderCount] = useState(0);
  const [igFollowed, setIgFollowed] = useState(() => localStorage.getItem('ask_followed_instagram') === '1');
  const [toast, setToast] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const dropRef = useRef(null);
  const prevUnreadRef = useRef(null);
  const path = location.pathname;
  const profileNeedsWork = !!user && (!user.avatar_url || !user.major || !user.interests || !igFollowed);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  }, []);

  useEffect(() => {
    function handle(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => { setMobileOpen(false); setDropOpen(false); }, [location.pathname]);

  useEffect(() => {
    function syncIgFollowed() {
      setIgFollowed(localStorage.getItem('ask_followed_instagram') === '1');
    }
    window.addEventListener('focus', syncIgFollowed);
    window.addEventListener('storage', syncIgFollowed);
    return () => {
      window.removeEventListener('focus', syncIgFollowed);
      window.removeEventListener('storage', syncIgFollowed);
    };
  }, []);

  // Scroll shadow
  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 100); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!user) { setUnread(0); setNotifCount(0); setBookingNotifCount(0); setReminderCount(0); return; }
    function poll() {
      api.get('/dm/unread').then(({ data }) => {
        const newCount = data.count;
        if (prevUnreadRef.current !== null && newCount > prevUnreadRef.current && data.latest) {
          const { sender_name, sender_avatar, body, is_system } = data.latest;
          const preview = is_system ? body : (body?.startsWith('enc:v1:') ? 'New message' : body);
          setToast({ senderName: sender_name, avatar: sender_avatar, preview });
          if (!document.hasFocus() && Notification.permission === 'granted') {
            const n = new Notification(sender_name || 'New message', { body: preview, icon: '/logo.png', tag: 'ask-dm', renotify: true });
            n.onclick = () => { window.focus(); window.location.href = '/messages'; n.close(); };
          }
        }
        prevUnreadRef.current = newCount;
        setUnread(newCount);
      }).catch(() => {});
      api.get('/bookings/notifications').then(({ data }) => {
        const bookingTotal = data.total || 0;
        setBookingNotifCount(bookingTotal);
        setPendingBookings(data.pending_bookings || 0);
      }).catch(() => {});
      api.get('/reminders').then(({ data }) => {
        const count = Array.isArray(data) ? data.length : 0;
        setReminderCount(count);
      }).catch(() => {});
    }
    poll();
    const t = setInterval(poll, 10000);
    return () => clearInterval(t);
  }, [user?.id]);

  useEffect(() => {
    setNotifCount((bookingNotifCount || 0) + (reminderCount || 0));
  }, [bookingNotifCount, reminderCount]);

  async function handleSignOut() {
    setDropOpen(false); setMobileOpen(false);
    await signOut(); navigate('/');
  }

  const navItems = [
    { to: '/browse', label: 'Browse', show: true },
    { to: '/find-a-tutor', label: 'Find Instructor', show: true },
    { to: '/saved-tutors', label: 'Saved', show: !!user },
    { to: '/people', label: 'People', show: true },
    { to: '/hangouts', label: 'Hangouts', show: true },
    { to: '/help-wanted', label: 'Help Wanted', show: true },
    { to: '/support', label: 'Support', show: true },
    { to: '/create-listing', label: 'Post', show: !!user },
    { to: '/messages', label: 'Messages', show: !!user, badge: unread },
    { to: '/dashboard/student', label: 'Bookings', show: !!user },
    { to: '/dashboard/provider', label: 'Services', show: !!user && user.role === 'provider', badge: pendingBookings, badgeColor: '#F59E0B' },
    { to: '/dashboard/analytics', label: 'Provider Analytics', show: !!user && user.role === 'provider' },
    { to: '/admin', label: 'Admin', show: !!user && user.is_admin, admin: true },
    { to: '/admin/support', label: 'Support Inbox', show: !!user && user.is_admin, admin: true },
    { to: '/admin/reviews', label: 'Reviews', show: !!user && user.is_admin, admin: true },
    { to: '/admin/analytics', label: 'Analytics', show: !!user && user.is_admin, admin: true },
  ].filter(i => i.show);

  function isActive(to) {
    if (to === '/create-listing') return path === to;
    if (to === '/dashboard/student') return path === to;
    if (to === '/dashboard/provider') return path === to;
    return path.startsWith(to);
  }

  return (
    <>
      {toast && <DmToast toast={toast} onClose={() => setToast(null)} navigate={navigate} />}

      <nav style={{
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${scrolled ? 'rgba(23,19,15,0.16)' : 'rgba(23,19,15,0.09)'}`,
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: scrolled ? '0 12px 34px -28px rgba(23,19,15,0.28)' : 'none',
        transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
      }}>
        <div className="nav-inner" style={{
          maxWidth: 1200, margin: '0 auto',
          height: 60, display: 'flex', alignItems: 'center',
        }}>
          {/* Wordmark */}
          <Link to="/" className="ask-cursor" style={{
            textDecoration: 'none', fontFamily: 'var(--font-display)',
            fontSize: 25, fontWeight: 850, color: 'var(--text)',
            marginRight: 30, flexShrink: 0,
            fontOpticalSizing: 'auto', letterSpacing: 0,
          }}>
            ASK
          </Link>

          {/* ── DESKTOP NAV ── */}
          <div className="nav-desktop" style={{ flex: 1, alignItems: 'stretch', gap: 0 }}>
            {/* Center: nav items */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {navItems.map(item => (
                <NavLink key={item.to} to={item.to} active={isActive(item.to)} admin={item.admin}>
                  {item.label}
                  {item.badge > 0 && <Badge n={item.badge} color={item.badgeColor} />}
                </NavLink>
              ))}
            </div>

            <div style={{ flex: 1 }} />

            {/* Right: auth */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {user ? (
                <div ref={dropRef} style={{ position: 'relative' }}>
                  <button onClick={() => setDropOpen(o => !o)} style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px',
                    background: dropOpen ? 'var(--gray-100)' : 'transparent',
                    border: 'none', borderRadius: 99, cursor: 'pointer',
                    transition: 'background .12s',
                    position: 'relative',
                  }}
                    onMouseEnter={e => { if (!dropOpen) e.currentTarget.style.background = 'var(--gray-100)'; }}
                    onMouseLeave={e => { if (!dropOpen) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--gray-200)', border: '1.5px solid var(--gray-100)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11,
                      color: 'var(--gray-700)',
                    }}>
                      {mediaUrl(user.avatar_url)
                        ? <img src={mediaUrl(user.avatar_url)} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                        : initials(user.name)}
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
                      color: 'var(--text)', maxWidth: 90,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {user.name.split(' ')[0]}
                    </span>
                    <svg width="10" height="6" viewBox="0 0 10 6" style={{ color: 'var(--muted)', flexShrink: 0 }}>
                      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                    {profileNeedsWork && <ProfileDot />}
                  </button>

                  {dropOpen && (
                    <div style={{
                      position: 'absolute', right: 0, top: 46,
                      background: '#fff', border: '1px solid var(--gray-200)',
                      borderRadius: 14, padding: '6px 0',
                      minWidth: 168, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      zIndex: 100, animation: 'slideDown 0.15s ease both',
                    }}>
                      <DropItem to="/account" onClick={() => setDropOpen(false)}>
                        My Profile {profileNeedsWork && <ProfileDot inline />}
                      </DropItem>
                      <DropItem to="/saved-tutors" onClick={() => setDropOpen(false)}>Saved Instructors</DropItem>
                      <DropItem to="/referrals" onClick={() => setDropOpen(false)}>Referrals</DropItem>
                      <div style={{ height: 1, background: 'var(--gray-100)', margin: '4px 0' }}/>
                      <button onClick={handleSignOut} style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '9px 16px', background: 'none', border: 'none',
                        fontSize: 13, color: 'var(--danger)', cursor: 'pointer',
                        fontFamily: 'var(--font-ui)', fontWeight: 500,
                      }}>Sign out</button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <NavLink to="/login" active={path === '/login'}>Log in</NavLink>
                  <Link to="/signup" style={{
                    marginLeft: 6, background: 'var(--text)', color: '#fff',
                    padding: '8px 18px', borderRadius: 99,
                    fontSize: 13, fontWeight: 600, textDecoration: 'none',
                    fontFamily: 'var(--font-ui)', flexShrink: 0,
                    transition: 'opacity 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* ── MOBILE: messages + hamburger ── */}
          <div className="nav-mobile">
            {user && (
              <Link to="/messages" style={{
                position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: 10, textDecoration: 'none',
                background: path.startsWith('/messages') ? 'var(--cream-100)' : 'transparent',
                color: path.startsWith('/messages') ? 'var(--ink-900)' : 'var(--ink-500)',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                {unread > 0 && (
                  <span style={{
                    position: 'absolute', top: 3, right: 3,
                    background: 'var(--accent)', color: '#fff', fontSize: 8, fontWeight: 700,
                    width: 14, height: 14, borderRadius: 999, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--cream-50)',
                  }}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
            )}
            <button onClick={() => setMobileOpen(o => !o)} aria-label="Menu" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 2px', display: 'flex', flexDirection: 'column',
              gap: 5, justifyContent: 'center', alignItems: 'center',
              width: 40, height: 40,
            }}>
              <span style={{ display:'block', width:20, height:2, background:'var(--ink-900)', borderRadius:2, transition:'transform .2s,opacity .2s', transform: mobileOpen ? 'translateY(7px) rotate(45deg)' : 'none' }}/>
              <span style={{ display:'block', width:20, height:2, background:'var(--ink-900)', borderRadius:2, opacity: mobileOpen ? 0 : 1, transition:'opacity .2s' }}/>
              <span style={{ display:'block', width:20, height:2, background:'var(--ink-900)', borderRadius:2, transition:'transform .2s,opacity .2s', transform: mobileOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }}/>
            </button>
          </div>
        </div>

        {/* ── MOBILE DRAWER ── */}
        <div className={`nav-drawer${mobileOpen ? ' open' : ''}`}>
          {navItems.map(item => (
            <DrawerLink key={item.to} to={item.to} active={isActive(item.to)} onClick={() => setMobileOpen(false)} badge={item.badge}>
              {item.label}
            </DrawerLink>
          ))}
          {user ? (
            <>
              <DrawerLink to="/account" active={path === '/account'} onClick={() => setMobileOpen(false)}>
                My Profile {profileNeedsWork && <ProfileDot inline />}
              </DrawerLink>
              <DrawerLink to="/saved-tutors" active={path === '/saved-tutors'} onClick={() => setMobileOpen(false)}>Saved Instructors</DrawerLink>
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--cream-200)', marginTop: 4 }}>
                <button onClick={handleSignOut} style={{
                  width: '100%', background: '#FEF2F2', border: '1px solid #FECACA',
                  borderRadius: 10, padding: '12px 16px', textAlign: 'left',
                  fontSize: 14, color: 'var(--danger)', cursor: 'pointer',
                  fontFamily: 'var(--font-ui)', fontWeight: 600,
                }}>Sign out</button>
              </div>
            </>
          ) : (
            <>
              <DrawerLink to="/login" onClick={() => setMobileOpen(false)}>Log in</DrawerLink>
              <div style={{ padding: '12px 20px' }}>
                <Link to="/signup" onClick={() => setMobileOpen(false)} style={{
                  display: 'block', background: 'var(--blue-600)', color: '#fff',
                  borderRadius: 10, padding: '13px 16px', textAlign: 'center',
                  fontSize: 15, fontWeight: 600, textDecoration: 'none',
                  fontFamily: 'var(--font-ui)',
                }}>Sign up</Link>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      {user && (
        <div className="nav-mobile nav-bottom-bar" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(251,249,246,0.97)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          borderTop: '1px solid var(--cream-200)',
          zIndex: 40,
          paddingBottom: 'env(safe-area-inset-bottom,0px)',
        }}>
          {[
            { to: '/browse', label: 'Browse', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
            { to: '/people', label: 'People', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
            { to: '/messages', label: 'Messages', badge: unread, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
            { to: user.role === 'provider' ? '/dashboard/provider' : '/dashboard/student', label: 'My Stuff', badge: notifCount, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
            { to: '/account', label: 'Profile', dot: profileNeedsWork, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
          ].map(({ to, label, icon, badge, dot }) => {
            const active = to === '/messages' ? path.startsWith('/messages')
              : to.startsWith('/dashboard') ? path.startsWith('/dashboard')
              : to === '/account' ? path === '/account'
              : path.startsWith(to);
            return (
              <Link key={to} to={to} style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '7px 0 5px', textDecoration: 'none', gap: 2,
                color: active ? 'var(--ink-900)' : 'var(--ink-500)',
                position: 'relative',
              }}>
                <div style={{ position: 'relative' }}>
                  {icon}
                  {badge > 0 && (
                    <span style={{
                      position: 'absolute', top: -4, right: -5,
                      background: 'var(--accent)', color: '#fff', fontSize: 8, fontWeight: 700,
                      minWidth: 13, height: 13, borderRadius: 999,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 2px', border: '1.5px solid var(--cream-50)',
                    }}>
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                  {dot && <ProfileDot />}
                </div>
                <span style={{ fontSize: 9.5, fontWeight: active ? 600 : 500, fontFamily: 'var(--font-ui)' }}>{label}</span>
                {active && <span style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:20, height:2.5, background:'var(--accent)', borderRadius:2 }}/>}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function ProfileDot({ inline = false }) {
  return (
    <span
      aria-label="Profile needs attention"
      style={inline ? {
        display: 'inline-block', width: 7, height: 7, borderRadius: 999,
        background: '#E11D48', marginLeft: 5, boxShadow: '0 0 0 2px #fff',
        verticalAlign: 'middle',
      } : {
        position: 'absolute', top: -2, right: -2,
        width: 9, height: 9, borderRadius: 999,
        background: '#E11D48', border: '2px solid #fff',
        boxShadow: '0 0 0 1px rgba(225,29,72,0.22)',
      }}
    />
  );
}

function Badge({ n, color = 'var(--accent)' }) {
  return (
    <span style={{
      background: color, color: '#fff', fontSize: 9, fontWeight: 700,
      minWidth: 15, height: 15, borderRadius: 999,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 3px', lineHeight: 1, marginLeft: 4,
    }}>
      {n > 9 ? '9+' : n}
    </span>
  );
}

function NavLink({ to, active, admin, children }) {
  return (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', height: '100%', padding: '0 10px',
      fontSize: 13, fontWeight: active ? 850 : 720, textDecoration: 'none',
      whiteSpace: 'nowrap', gap: 4,
      color: active ? 'var(--text)' : 'var(--muted)',
      fontFamily: 'var(--font-ui)',
      position: 'relative',
      transition: 'color .12s',
      ...(admin ? { color: '#7C2D12', fontWeight: 850 } : {}),
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text)'; }}
      onMouseLeave={e => { if (!active && !admin) e.currentTarget.style.color = 'var(--muted)'; }}
    >
      {children}
      {active && (
        <span style={{
          position: 'absolute', bottom: 0, left: 12, right: 12,
          height: 3, background: 'var(--orange)', borderRadius: 2,
        }} />
      )}
    </Link>
  );
}

function DropItem({ to, onClick, children }) {
  return (
    <Link to={to} onClick={onClick} style={{
      display: 'block', padding: '9px 16px', fontSize: 13,
      color: 'var(--ink-900)', textDecoration: 'none', fontWeight: 500,
      fontFamily: 'var(--font-ui)',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--cream-100)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      {children}
    </Link>
  );
}

function DrawerLink({ to, active, onClick, badge, children }) {
  return (
    <Link to={to} onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px', fontSize: 15, textDecoration: 'none',
      color: active ? 'var(--ink-900)' : 'var(--ink-700)',
      background: active ? 'var(--cream-100)' : 'transparent',
      fontWeight: active ? 600 : 500,
      borderBottom: '1px solid var(--cream-200)',
      fontFamily: 'var(--font-ui)',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {children}
        {active && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)' }} />}
      </span>
      {badge > 0 && <Badge n={badge} />}
    </Link>
  );
}
