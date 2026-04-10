import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BLUE = '#2B6CB0';

const CATEGORIES = [
  { id: 'tutor',        label: 'Tutors',   emoji: '📚', bg: '#EBF4FF' },
  { id: 'barber',       label: 'Barbers',  emoji: '✂️', bg: '#FDF2F8' },
  { id: 'hebrew tutor', label: 'Hebrew',   emoji: '✡️', bg: '#F0FFF4' },
  { id: 'tennis',       label: 'Tennis',   emoji: '🎾', bg: '#FFFBEB' },
  { id: 'other',        label: 'Other',    emoji: '💼', bg: '#F5F3FF' },
];

export default function Home() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (category) params.set('category', category);
    navigate(`/browse?${params}`);
  }

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(180deg, #EBF4FF 0%, #FAF8F5 100%)',
        padding: '44px 24px 52px',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, color: '#1A1A2E', marginBottom: 8, lineHeight: 1.3 }}>
          Services for the YU community
        </h1>
        <p style={{ fontSize: 14, color: '#64748B', marginBottom: 28 }}>
          Tutoring, barbers, Hebrew, tennis — offered by students, for students.
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearch} style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{
            display: 'flex', background: '#fff',
            borderRadius: 10, overflow: 'hidden', border: '1px solid #E2E8F0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, border: 'none', padding: '11px 16px',
                fontSize: 14, outline: 'none', background: 'transparent', color: '#1A1A2E',
              }}
            />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{
                border: 'none', borderLeft: '1px solid #E2E8F0',
                padding: '0 14px', fontSize: 13,
                background: '#F8FAFC', color: '#64748B', cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="">All categories</option>
              <option value="tutor">Tutors</option>
              <option value="barber">Barbers</option>
              <option value="hebrew tutor">Hebrew</option>
              <option value="tennis">Tennis</option>
              <option value="other">Other</option>
            </select>
            <button type="submit" style={{
              background: BLUE, color: '#fff', border: 'none',
              padding: '0 18px', fontSize: 13, cursor: 'pointer', fontWeight: 500,
            }}>
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px 48px' }}>

        {/* Categories */}
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.8px',
          color: '#64748B', textTransform: 'uppercase', margin: '28px 0 14px',
        }}>
          Browse by category
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {CATEGORIES.map(({ id, label, emoji, bg }) => (
            <button key={id} onClick={() => navigate(`/browse?category=${id}`)}
              style={{
                background: '#fff', border: '1px solid #E2E8F0',
                borderRadius: 10, padding: '14px 12px', textAlign: 'center',
                cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.boxShadow = '0 2px 8px rgba(43,108,176,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 8px', fontSize: 16,
              }}>
                {emoji}
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1A2E' }}>{label}</div>
            </button>
          ))}
        </div>

        {/* How it works */}
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.8px',
          color: '#64748B', textTransform: 'uppercase', margin: '32px 0 14px',
        }}>
          How it works
        </div>
        <div style={{
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10,
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        }}>
          {[
            { n: '1', title: 'Find someone', desc: 'Browse students offering services on campus.' },
            { n: '2', title: 'Pick a time', desc: 'Choose from their open slots — no back and forth.' },
            { n: '3', title: 'Pay & show up', desc: 'Zelle or Venmo them and you\'re done.' },
          ].map(({ n, title, desc }, i) => (
            <div key={n} style={{
              padding: '20px 18px', textAlign: 'center',
              borderLeft: i > 0 ? '1px solid #E2E8F0' : 'none',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: BLUE, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600, margin: '0 auto 10px',
              }}>{n}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        {!user && (
          <Link to="/create-listing" style={{
            display: 'block', marginTop: 20, padding: 12,
            background: BLUE, color: '#fff', borderRadius: 10,
            fontSize: 14, fontWeight: 500, textAlign: 'center', textDecoration: 'none',
          }}>
            + Post a listing
          </Link>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid #E2E8F0', background: '#fff',
        textAlign: 'center', padding: '16px 24px',
        fontSize: 12, color: '#94A3B8',
      }}>
        ASK · Yeshiva University Student Marketplace
      </div>
    </div>
  );
}
