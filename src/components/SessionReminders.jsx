import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { fmtTime } from '../lib/slots';

export default function SessionReminders() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!user) { setItems([]); return; }
    let active = true;
    function load() {
      api.get('/reminders')
        .then(({ data }) => { if (active) setItems(Array.isArray(data) ? data : []); })
        .catch(() => {});
    }
    load();
    const t = setInterval(load, 60000);
    return () => { active = false; clearInterval(t); };
  }, [user?.id]);

  async function dismiss(bookingId) {
    setItems(list => list.filter(item => item.booking_id !== bookingId));
    try { await api.post(`/reminders/${bookingId}/dismiss`); } catch {}
  }

  if (!items.length) return null;

  return (
    <div style={{
      position: 'fixed', right: 18, bottom: 88, zIndex: 80,
      display: 'flex', flexDirection: 'column', gap: 10,
      width: 'min(360px, calc(100vw - 28px))',
    }}>
      {items.slice(0, 2).map(item => {
        const otherName = user?.role === 'provider' ? item.student_name : item.provider_name;
        return (
          <div key={item.booking_id} className="card" style={{
            padding: 14, borderRadius: 16, borderColor: '#BFDBFE',
            boxShadow: '0 12px 40px rgba(15,23,42,0.16)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1D4ED8' }}>
                  {item.reminder_state}
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)', marginTop: 3 }}>
                  Session with {otherName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  Today, {fmtTime(item.start_time)}-{fmtTime(item.end_time)}
                </div>
              </div>
              <button onClick={() => dismiss(item.booking_id)} aria-label="Dismiss reminder" style={{
                border: 'none', background: 'var(--gray-100)', borderRadius: 999,
                width: 28, height: 28, cursor: 'pointer',
              }}>
                x
              </button>
            </div>
            <Link to={`/chat/${item.booking_id}`} style={{
              display: 'inline-flex', marginTop: 10, borderRadius: 999, padding: '7px 12px',
              background: 'var(--text)', color: '#fff', textDecoration: 'none',
              fontSize: 12, fontWeight: 900,
            }}>
              Open session chat
            </Link>
          </div>
        );
      })}
    </div>
  );
}
