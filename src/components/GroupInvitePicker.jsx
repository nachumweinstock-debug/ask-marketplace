import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { mediaUrl } from '../lib/media';

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function GroupInvitePicker({ selected, onChange, maxGroupSize }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchUsers('');
  }, []);

  async function fetchUsers(q) {
    setLoading(true);
    try {
      const { data } = await api.get('/people', { params: q ? { search: q } : {} });
      // Show accepted connections first, then everyone else
      const accepted = data.filter(u => u.connection_status === 'accepted');
      const others = data.filter(u => u.connection_status !== 'accepted');
      setUsers(q ? data : [...accepted, ...others]);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  function handleSearch(val) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(val), 250);
  }

  function toggle(userId) {
    if (selected.includes(userId)) {
      onChange(selected.filter(id => id !== userId));
    } else {
      if (selected.length >= maxGroupSize - 1) return;
      onChange([...selected, userId]);
    }
  }

  const canAdd = selected.length < maxGroupSize - 1;

  return (
    <div>
      <div style={{
        fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontFamily: 'var(--font-ui)',
      }}>
        Invite people ({selected.length} selected · up to {maxGroupSize - 1} guests)
      </div>

      <input
        value={search}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Search by name..."
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '8px 12px', borderRadius: 8,
          border: '1.5px solid var(--border)', fontSize: 13,
          fontFamily: 'var(--font-ui)', background: 'var(--card)',
          outline: 'none', color: 'var(--text)', marginBottom: 8,
        }}
        onFocus={e => e.target.style.borderColor = 'var(--ink-900)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />

      <div style={{
        maxHeight: 220, overflowY: 'auto',
        border: '1px solid var(--border)', borderRadius: 10,
        background: 'var(--card)',
      }}>
        {loading && (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>Loading…</div>
        )}
        {!loading && users.length === 0 && (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>No users found</div>
        )}
        {!loading && users.map((u, i) => {
          const isSelected = selected.includes(u.id);
          const isConnection = u.connection_status === 'accepted';
          const disabled = !isSelected && !canAdd;
          return (
            <div key={u.id} onClick={() => !disabled && toggle(u.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              background: isSelected ? '#F0F9FF' : 'transparent',
              opacity: disabled ? 0.4 : 1,
              transition: 'background .1s',
            }}>
              {/* Avatar */}
              {mediaUrl(u.avatar_url) ? (
                <img src={mediaUrl(u.avatar_url)} alt={u.name}
                  style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg,#FDE68A,#F59E0B)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13, color: '#fff', fontFamily: 'var(--font-display)',
                }}>
                  {initials(u.name)}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {u.name}
                  {isConnection && (
                    <span style={{ fontSize: 10, fontWeight: 600, background: '#DBEAFE', color: '#1D4ED8', borderRadius: 4, padding: '1px 5px' }}>
                      Connected
                    </span>
                  )}
                </div>
                {u.major && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{u.major}</div>}
              </div>
              {/* Checkbox */}
              <div style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                border: `2px solid ${isSelected ? 'var(--ink-900)' : 'var(--gray-300)'}`,
                background: isSelected ? 'var(--ink-900)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .1s',
              }}>
                {isSelected && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
