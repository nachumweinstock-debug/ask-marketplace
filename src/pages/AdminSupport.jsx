import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const STATUS_COLORS = {
  open: ['#EFF6FF', '#1D4ED8'],
  bot_answered: ['#F0FDF4', '#166534'],
  needs_admin: ['#FEF2F2', '#B91C1C'],
  closed: ['#F3F4F6', '#4B5563'],
};

function StatusBadge({ status }) {
  const [bg, color] = STATUS_COLORS[status] || STATUS_COLORS.open;
  return <span style={{ background: bg, color, borderRadius: 999, padding: '3px 9px', fontSize: 11, fontWeight: 800 }}>{status}</span>;
}

export default function AdminSupport() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Support Conversations | Ask Admin';
    api.get('/support/admin/conversations')
      .then(({ data }) => setRows(data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load support conversations'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}>Loading support...</div>;

  return (
    <div className="admin-page" style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'end', marginBottom: 22 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Customer support</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 44, color: 'var(--text)', lineHeight: 1 }}>Support inbox</h1>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>Review bot conversations and step in when needed.</p>
        </div>
      </div>

      {error && <div className="card" style={{ padding: 16, color: '#B91C1C', background: '#FEF2F2', borderColor: '#FECACA', marginBottom: 16 }}>{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {rows.length === 0 ? (
          <div style={{ padding: 32, color: 'var(--muted)' }}>No support conversations yet.</div>
        ) : rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => navigate(`/admin/support/${row.id}`)}
            style={{
              width: '100%',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              background: '#fff',
              padding: '16px 18px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 14,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                <strong style={{ color: 'var(--text)' }}>{row.topic || 'Support'}</strong>
                <StatusBadge status={row.status} />
                {row.user_email && <span style={{ color: 'var(--muted)', fontSize: 12 }}>{row.user_email}</span>}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.last_message || 'No messages yet'}
              </div>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
              {new Date(row.created_at).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export { StatusBadge };
