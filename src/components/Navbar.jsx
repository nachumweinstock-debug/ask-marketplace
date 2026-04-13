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
      zIndex: 9999, background: 'rgba(22,22,26,0.90)',
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
  const [pendingBookings, setPendingBookings] = useState(0);
  const [toast, setToast] = useState(null);
  const dropRef = useRef(null);
  const prevUnreadRef = useRef(null);
  const path = location.pathname;

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
    if (!user) { setUnread(0); setNotifCount(0); return; }
    function poll() {
      api.get('/dm/unread').then(({ data }) => {
        const newCount = data.count;
        if (prevUnreadRef.current !== null && newCount > prevUnreadRef.current && data.latest) {
          const { sender_name, sender_avatar, body, is_system } = data.latest;
          const preview = is_system ? body : (body?.startsWith('enc:v1:') ? '🔒 Encrypted message' : body);
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
        setNotifCount(data.total);
        setPendingBookings(data.pending_bookings || 0);
      }).catch(() => {});
    }
    poll();
    const t = setInterval(poll, 10000);
    return () => clearInterval(t);
  }, [user?.id]);

  async function handleSignOut() {
    setDropOpen(false); setMobileOpen(false);
    await signOut(); navigate('/');
  }

  return (
    <>
      {toast && <DmToast toast={toast} onClose={() => setToast(null)} navigate={navigate} />}

      <nav style={{
        background: '#fff', borderBottom: '1.5px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 24px',
          height: 54, display: 'flex', alignItems: 'center', gap: 0,
        }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', marginRight: 20, flexShrink: 0 }}>
            <img src="/logo.png" alt="ASK" style={{ height: 36 }} />
          </Link>

          {/* ── DESKTOP: all links flat on one bar ── */}
          <div className="nav-desktop" style={{ flex:1, gap:0, alignItems:'stretch' }}>

            {/* Left cluster */}
            <div style={{ display:'flex', alignItems:'center', gap:2 }}>
              <FlatLink to="/browse" active={path.startsWith('/browse')}>Browse</FlatLink>
              <FlatLink to="/people" active={path.startsWith('/people')}>People</FlatLink>

              {user && (
                <>
                  <FlatLink to="/create-listing" active={path === '/create-listing'}>
                    + Post a service
                  </FlatLink>
                  <FlatLink to="/messages" active={path.startsWith('/messages')}>
                    <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                      Messages
                      {unread > 0 && <Badge n={unread} />}
                    </span>
                  </FlatLink>
                  <FlatLink to="/dashboard/student" active={path === '/dashboard/student'}>My Bookings</FlatLink>
                  {user.role === 'provider' && (
                    <FlatLink to="/dashboard/provider" active={path === '/dashboard/provider'}>
                      <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                        My Services
                        {pendingBookings > 0 && <Badge n={pendingBookings} color="#F59E0B" />}
                      </span>
                    </FlatLink>
                  )}
                  {user.is_admin && (
                    <FlatLink to="/admin" active={path.startsWith('/admin')} admin>Admin</FlatLink>
                  )}
                </>
              )}
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Right cluster */}
            <div style={{ display:'flex', alignItems:'center', gap:2 }}>
              {user ? (
                <>
                  {/* Tiny name + avatar dropdown for Profile + Sign out only */}
                  <div ref={dropRef} style={{ position:'relative' }}>
                    <button onClick={() => setDropOpen(o => !o)} style={{
                      display:'flex', alignItems:'center', gap:7, padding:'6px 10px',
                      background: dropOpen ? 'var(--bg)' : 'transparent',
                      border:'none', borderRadius:8, cursor:'pointer',
                      fontSize:13, fontWeight:600, color:'var(--text)',
                      fontFamily:'var(--font-ui)',
                      transition:'background .15s',
                    }}
                      onMouseEnter={e => { if (!dropOpen) e.currentTarget.style.background = 'var(--bg)'; }}
                      onMouseLeave={e => { if (!dropOpen) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{
                        width:26, height:26, borderRadius:'50%', flexShrink:0,
                        background:'var(--accent)', color:'var(--primary)',
                        border:'1.5px solid var(--border)', overflow:'hidden',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontWeight:700, fontSize:10, fontFamily:'var(--font-ui)',
                      }}>
                        {mediaUrl(user.avatar_url)
                          ? <img src={mediaUrl(user.avatar_url)} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                          : initials(user.name)}
                      </div>
                      <span style={{ maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {user.name.split(' ')[0]}
                      </span>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="var(--muted)">
                        <path d="M2 3.5l3 3 3-3" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      </svg>
                    </button>

                    {dropOpen && (
                      <div style={{
                        position:'absolute', right:0, top:42,
                        background:'#fff', border:'1.5px solid var(--border)',
                        borderRadius:12, padding:'4px 0',
                        minWidth:160, boxShadow:'0 8px 24px rgba(0,0,0,0.10)',
                        zIndex:100,
                      }}>
                        <MiniDropItem to="/account" onClick={() => setDropOpen(false)}>My Profile</MiniDropItem>
                        <div style={{ height:1, background:'var(--border)', margin:'4px 0' }}/>
                        <button onClick={handleSignOut} style={{
                          display:'block', width:'100%', textAlign:'left',
                          padding:'9px 16px', background:'none', border:'none',
                          fontSize:13, color:'#DC2626', cursor:'pointer',
                          fontFamily:'var(--font-ui)', fontWeight:500,
                        }}>Sign out</button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <FlatLink to="/login" active={path === '/login'}>Log in</FlatLink>
                  <Link to="/signup" style={{
                    marginLeft:6, background:'var(--primary)', color:'#fff',
                    padding:'8px 18px', borderRadius:8,
                    fontSize:13, fontWeight:700, textDecoration:'none',
                    letterSpacing:'0.1px', flexShrink:0,
                  }}>
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* ── MOBILE: messages + avatar + hamburger ── */}
          <div className="nav-mobile">
            {user && (
              <Link to="/messages" style={{
                position:'relative', display:'flex', alignItems:'center', justifyContent:'center',
                width:36, height:36, borderRadius:8, textDecoration:'none',
                background: path.startsWith('/messages') ? 'var(--accent)' : 'transparent',
                color: path.startsWith('/messages') ? 'var(--primary)' : 'var(--muted)',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                {unread > 0 && (
                  <span style={{
                    position:'absolute', top:3, right:3,
                    background:'#EF4444', color:'#fff', fontSize:8, fontWeight:700,
                    width:14, height:14, borderRadius:999, display:'flex',
                    alignItems:'center', justifyContent:'center', border:'1.5px solid #fff',
                  }}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
            )}
            <button onClick={() => setMobileOpen(o => !o)} aria-label="Menu" style={{
              background:'none', border:'none', cursor:'pointer',
              padding:'6px 2px', display:'flex', flexDirection:'column',
              gap:5, justifyContent:'center', alignItems:'center',
            }}>
              <span style={{ display:'block', width:20, height:2, background:'var(--text)', borderRadius:2, transition:'transform .2s,opacity .2s', transform: mobileOpen ? 'translateY(7px) rotate(45deg)' : 'none' }}/>
              <span style={{ display:'block', width:20, height:2, background:'var(--text)', borderRadius:2, opacity: mobileOpen ? 0 : 1, transition:'opacity .2s' }}/>
              <span style={{ display:'block', width:20, height:2, background:'var(--text)', borderRadius:2, transition:'transform .2s,opacity .2s', transform: mobileOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }}/>
            </button>
          </div>
        </div>

        {/* ── MOBILE DRAWER ── */}
        <div className={`nav-drawer${mobileOpen ? ' open' : ''}`}>
          <DrawerLink to="/browse" active={path.startsWith('/browse')} onClick={() => setMobileOpen(false)}>Browse</DrawerLink>
          <DrawerLink to="/people" active={path.startsWith('/people')} onClick={() => setMobileOpen(false)}>People</DrawerLink>
          {user ? (
            <>
              <DrawerLink to="/create-listing" active={path === '/create-listing'} onClick={() => setMobileOpen(false)}>+ Post a service</DrawerLink>
              <DrawerLink to="/messages" active={path.startsWith('/messages')} onClick={() => setMobileOpen(false)} badge={unread}>Messages</DrawerLink>
              <DrawerLink to="/dashboard/student" active={path === '/dashboard/student'} onClick={() => setMobileOpen(false)}>My Bookings</DrawerLink>
              {user.role === 'provider' && (
                <DrawerLink to="/dashboard/provider" active={path === '/dashboard/provider'} onClick={() => setMobileOpen(false)} badge={pendingBookings}>My Services</DrawerLink>
              )}
              <DrawerLink to="/account" active={path === '/account'} onClick={() => setMobileOpen(false)}>My Profile</DrawerLink>
              {user.is_admin && <DrawerLink to="/admin" active={path.startsWith('/admin')} onClick={() => setMobileOpen(false)}>Admin</DrawerLink>}
              <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', marginTop:4 }}>
                <button onClick={handleSignOut} style={{
                  width:'100%', background:'#FEF2F2', border:'1px solid #FECACA',
                  borderRadius:8, padding:'12px 16px', textAlign:'left',
                  fontSize:14, color:'#DC2626', cursor:'pointer',
                  fontFamily:'var(--font-ui)', fontWeight:600,
                }}>Sign out</button>
              </div>
            </>
          ) : (
            <>
              <DrawerLink to="/login" onClick={() => setMobileOpen(false)}>Log in</DrawerLink>
              <div style={{ padding:'12px 20px' }}>
                <Link to="/signup" onClick={() => setMobileOpen(false)} style={{
                  display:'block', background:'var(--primary)', color:'#fff',
                  borderRadius:8, padding:'13px 16px', textAlign:'center',
                  fontSize:15, fontWeight:700, textDecoration:'none',
                }}>Sign up</Link>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      {user && (
        <div className="nav-mobile nav-bottom-bar" style={{
          position:'fixed', bottom:0, left:0, right:0,
          background:'rgba(255,255,255,0.97)',
          backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
          borderTop:'1.5px solid var(--border)',
          zIndex:40,
          paddingBottom:'env(safe-area-inset-bottom,0px)',
        }}>
          {[
            { to:'/browse', label:'Browse', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
            { to:'/people', label:'People', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
            { to:'/messages', label:'Messages', badge: unread, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
            { to: user.role === 'provider' ? '/dashboard/provider' : '/dashboard/student', label:'My Stuff', badge: notifCount, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
            { to:'/account', label:'Profile', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
          ].map(({ to, label, icon, badge }) => {
            const active = to === '/messages' ? path.startsWith('/messages')
              : to.startsWith('/dashboard') ? path.startsWith('/dashboard')
              : to === '/account' ? path === '/account'
              : path.startsWith(to);
            return (
              <Link key={to} to={to} style={{
                flex:1, display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center',
                padding:'7px 0 5px', textDecoration:'none', gap:2,
                color: active ? 'var(--primary)' : 'var(--muted)',
                position:'relative',
              }}>
                <div style={{ position:'relative' }}>
                  {icon}
                  {badge > 0 && (
                    <span style={{
                      position:'absolute', top:-4, right:-5,
                      background:'#EF4444', color:'#fff', fontSize:8, fontWeight:700,
                      minWidth:13, height:13, borderRadius:999,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      padding:'0 2px', border:'1.5px solid #fff',
                    }}>
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span style={{ fontSize:9.5, fontWeight: active ? 700 : 500 }}>{label}</span>
                {active && <span style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:20, height:2.5, background:'var(--primary)', borderRadius:2 }}/>}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function Badge({ n, color = '#EF4444' }) {
  return (
    <span style={{
      background: color, color:'#fff', fontSize:9, fontWeight:800,
      minWidth:15, height:15, borderRadius:999,
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      padding:'0 3px', lineHeight:1,
    }}>
      {n > 9 ? '9+' : n}
    </span>
  );
}

function FlatLink({ to, active, admin, children }) {
  const base = {
    display:'flex', alignItems:'center', height:'100%', padding:'0 12px',
    fontSize:13, fontWeight: active ? 700 : 500, textDecoration:'none',
    whiteSpace:'nowrap', gap:6, borderBottom:'2.5px solid transparent',
    color: active ? 'var(--text)' : 'var(--muted)',
    transition:'color .12s, border-color .12s',
    ...(admin ? { color:'#92400E', fontWeight:700 } : {}),
  };
  if (active) base.borderBottomColor = 'var(--primary)';
  return (
    <Link to={to} style={base}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.color='var(--text)'; e.currentTarget.style.borderBottomColor='var(--border)'; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.color='var(--muted)'; e.currentTarget.style.borderBottomColor='transparent'; } }}
    >
      {children}
    </Link>
  );
}

function MiniDropItem({ to, onClick, children }) {
  return (
    <Link to={to} onClick={onClick} style={{
      display:'block', padding:'9px 16px', fontSize:13,
      color:'var(--text)', textDecoration:'none', fontWeight:500,
    }}
      onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
      onMouseLeave={e => e.currentTarget.style.background='none'}
    >
      {children}
    </Link>
  );
}

function DrawerLink({ to, active, onClick, badge, children }) {
  return (
    <Link to={to} onClick={onClick} style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'13px 20px', fontSize:15, textDecoration:'none',
      color: active ? 'var(--primary)' : 'var(--text)',
      background: active ? 'var(--accent)' : 'transparent',
      fontWeight: active ? 700 : 500,
      borderBottom:'1px solid var(--border)',
    }}>
      {children}
      {badge > 0 && <Badge n={badge} />}
    </Link>
  );
}
