import { useEffect, useState } from 'react';
import api from '../api';

const RANGE_OPTIONS = [
  ['today', 'Today'],
  ['7d', '7 days'],
  ['30d', '30 days'],
  ['90d', '90 days'],
  ['all', 'All time'],
];

function fmt(value) {
  return Number(value || 0).toLocaleString();
}

function money(value) {
  return `$${Math.round(Number(value || 0)).toLocaleString()}`;
}

function Kpi({ label, value, hint }) {
  return (
    <div className="card" style={{ padding: 18, minHeight: 106 }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1, marginTop: 12, color: 'var(--text)' }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{hint}</div>}
    </div>
  );
}

function Panel({ title, children, action }) {
  return (
    <section className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text)', margin: 0 }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function CountChart({ rows, valueKey, empty, color = 'linear-gradient(180deg, #111827 0%, #374151 100%)' }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey] || 0)));
  if (!rows.length) return <Empty text={empty || 'No data yet for this range.'} />;
  return (
    <div style={{ display: 'flex', alignItems: 'end', gap: 8, height: 176, paddingTop: 8 }}>
      {rows.map((row) => (
        <div key={row.day} title={`${row.day}: ${row[valueKey]}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 8, minWidth: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', textAlign: 'center', lineHeight: 1 }}>
            {fmt(row[valueKey])}
          </div>
          <div style={{
            height: `${Math.max(8, (Number(row[valueKey] || 0) / max) * 148)}px`,
            background: color,
            borderRadius: 6,
          }} />
          <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {String(row.day).slice(5)}
          </div>
        </div>
      ))}
    </div>
  );
}

function Funnel({ rows }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.count || 0)));
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {rows.map((row) => (
        <div key={row.step}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{row.step}</span>
            <span style={{ color: 'var(--muted)' }}>{fmt(row.count)}</span>
          </div>
          <div style={{ height: 10, borderRadius: 99, background: 'var(--gray-100)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.max(3, (Number(row.count || 0) / max) * 100)}%`, background: '#111827', borderRadius: 99 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ text }) {
  return <div style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>{text}</div>;
}

function Table({ columns, rows, empty = 'No rows yet.' }) {
  if (!rows?.length) return <Empty text={empty} />;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ textAlign: col.align || 'left', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 10px 10px', borderBottom: '1px solid var(--border)' }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || row.url || row.referrer || `${row.event_name}-${index}`}>
              {columns.map((col) => (
                <td key={col.key} style={{ padding: '12px 10px', borderBottom: '1px solid var(--border)', textAlign: col.align || 'left', color: 'var(--text)', verticalAlign: 'top' }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminAnalytics() {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const existing = document.querySelector('meta[name="robots"]');
    const previous = existing?.getAttribute('content');
    const tag = existing || document.createElement('meta');
    tag.setAttribute('name', 'robots');
    tag.setAttribute('content', 'noindex,nofollow');
    if (!existing) document.head.appendChild(tag);
    document.title = 'Analytics | Ask Marketplace Admin';
    return () => {
      if (previous) tag.setAttribute('content', previous);
      else tag.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api.get('/analytics/admin/summary', {
      params: { range },
    }).then(({ data }) => {
      if (!cancelled) setData(data);
    }).catch((err) => {
      if (!cancelled) setError(err.response?.data?.error || 'Failed to load analytics');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [range]);

  const business = data?.business || {};
  const kpis = business.kpis || {};

  return (
    <div className="admin-page" style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 18px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-end', marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Founder analytics</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 5vw, 48px)', color: 'var(--text)', lineHeight: 1, margin: 0 }}>
            Marketplace command center
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 8 }}>
            The numbers that matter: accounts, bookings, providers, messages, and what needs attention.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={range} onChange={(e) => setRange(e.target.value)} className="input" style={{ width: 130 }}>
            {RANGE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="card" style={{ padding: 16, color: '#B91C1C', background: '#FEF2F2', borderColor: '#FECACA', marginBottom: 18 }}>{error}</div>}

      {loading && !data ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div style={{ width: 28, height: 28, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
            <Kpi label="Accounts today" value={fmt(kpis.signups_today)} hint={`${fmt(kpis.signups_range)} in selected range`} />
            <Kpi label="Bookings today" value={fmt(kpis.bookings_today)} hint={`${fmt(kpis.bookings_range)} in selected range`} />
            <Kpi label="Pending bookings" value={fmt(kpis.pending_bookings)} hint={`${fmt(kpis.pending_time_requests)} pending time requests`} />
            <Kpi label="Booked value" value={money(kpis.booking_value_range)} hint="Estimated gross value in range" />
            <Kpi label="Providers" value={fmt(kpis.provider_accounts)} hint={`${fmt(kpis.listings)} active listings`} />
            <Kpi label="Open requests" value={fmt(kpis.open_help_wanted)} hint={`${fmt(kpis.available_slots)} open availability slots`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, marginBottom: 18 }}>
            <Panel title="Account creation by day">
              <CountChart rows={business.signupsByDay || []} valueKey="signups" empty="No accounts created in this range." color="linear-gradient(180deg, #16A34A 0%, #14532D 100%)" />
            </Panel>
            <Panel title="Bookings by day">
              <CountChart rows={business.bookingsByDay || []} valueKey="bookings" empty="No bookings in this range." color="linear-gradient(180deg, #2563EB 0%, #111827 100%)" />
            </Panel>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18, marginBottom: 18 }}>
            <Panel title="Booking status">
              <Funnel rows={[
                { step: 'Pending', count: kpis.pending_bookings || 0 },
                { step: 'Confirmed', count: kpis.confirmed_bookings || 0 },
                { step: 'Completed', count: kpis.completed_bookings || 0 },
                { step: 'Cancelled', count: kpis.cancelled_bookings || 0 },
              ]} />
            </Panel>
            <Panel title="Activity pulse">
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                  <span style={{ color: 'var(--muted)' }}>Total users</span><strong>{fmt(kpis.total_users)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                  <span style={{ color: 'var(--muted)' }}>Direct messages in range</span><strong>{fmt(kpis.messages_range)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                  <span style={{ color: 'var(--muted)' }}>Unread DMs</span><strong>{fmt(kpis.unread_dms)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                  <span style={{ color: 'var(--muted)' }}>Reviews</span><strong>{fmt(kpis.reviews_total)} · {kpis.average_rating || 0} avg</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Visitor → booking</span><strong>{kpis.booking_conversion_rate || 0}%</strong>
                </div>
              </div>
            </Panel>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 18, marginBottom: 18 }}>
            <Panel title="Needs attention: pending bookings">
              <Table
                columns={[
                  { key: 'student_name', label: 'Student' },
                  { key: 'provider_name', label: 'Provider' },
                  { key: 'date', label: 'Slot', render: (r) => `${r.date || 'TBD'} ${r.start_time || ''}` },
                  { key: 'created_at', label: 'Created', render: (r) => new Date(r.created_at).toLocaleDateString() },
                ]}
                rows={business.pendingBookings || []}
                empty="No pending bookings."
              />
            </Panel>
            <Panel title="Needs attention: time requests">
              <Table
                columns={[
                  { key: 'student_name', label: 'Student' },
                  { key: 'provider_name', label: 'Provider' },
                  { key: 'requested_date', label: 'Requested', render: (r) => `${r.requested_date} ${r.requested_time}` },
                  { key: 'created_at', label: 'Created', render: (r) => new Date(r.created_at).toLocaleDateString() },
                ]}
                rows={business.pendingTimeRequests || []}
                empty="No pending time requests."
              />
            </Panel>
          </div>

          <Panel title="Recent bookings">
            <Table
              columns={[
                { key: 'student_name', label: 'Student' },
                { key: 'provider_name', label: 'Provider' },
                { key: 'status', label: 'Status', render: (r) => <strong>{r.status}</strong> },
                { key: 'price_per_session', label: 'Value', align: 'right', render: (r) => money(r.price_per_session) },
                { key: 'created_at', label: 'Created', render: (r) => new Date(r.created_at).toLocaleString() },
              ]}
              rows={business.recentBookings || []}
              empty="No bookings yet."
            />
          </Panel>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 18, marginTop: 18 }}>
            <Panel title="Recent accounts">
              <Table
                columns={[
                  { key: 'name', label: 'Name', render: (r) => <span style={{ fontWeight: 700 }}>{r.name}</span> },
                  { key: 'email', label: 'Email', render: (r) => <span style={{ wordBreak: 'break-word' }}>{r.email}</span> },
                  { key: 'role', label: 'Role' },
                  { key: 'created_at', label: 'Created', render: (r) => new Date(r.created_at).toLocaleString() },
                ]}
                rows={business.recentSignups || []}
              />
            </Panel>
            <Panel title="Top providers">
              <Table
                columns={[
                  { key: 'name', label: 'Provider', render: (r) => <span style={{ fontWeight: 700 }}>{r.name}</span> },
                  { key: 'subcategory', label: 'Service', render: (r) => r.custom_category || r.subcategory || r.category },
                  { key: 'bookings', label: 'Bookings', align: 'right', render: (r) => fmt(r.bookings) },
                  { key: 'rating', label: 'Rating', align: 'right', render: (r) => r.rating ? Number(r.rating).toFixed(1) : '-' },
                ]}
                rows={business.topProviders || []}
              />
            </Panel>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 18, marginTop: 18 }}>
            <Panel title="Top categories">
              <Table
                columns={[
                  { key: 'category', label: 'Category', render: (r) => <span style={{ fontWeight: 700 }}>{r.category}</span> },
                  { key: 'listings', label: 'Listings', align: 'right', render: (r) => fmt(r.listings) },
                  { key: 'bookings', label: 'Bookings', align: 'right', render: (r) => fmt(r.bookings) },
                ]}
                rows={business.topCategories || []}
              />
            </Panel>
            <Panel title="Open help wanted">
              <Table
                columns={[
                  { key: 'title', label: 'Request', render: (r) => <span style={{ fontWeight: 700 }}>{r.title}</span> },
                  { key: 'user_name', label: 'User' },
                  { key: 'urgency', label: 'Urgency' },
                  { key: 'created_at', label: 'Created', render: (r) => new Date(r.created_at).toLocaleDateString() },
                ]}
                rows={business.openHelpWanted || []}
                empty="No open help-wanted requests."
              />
            </Panel>
          </div>

          <Panel title="Traffic snapshot" action={<span style={{ fontSize: 12, color: 'var(--muted)' }}>Still useful, just not the headline</span>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <Kpi label="Visitors" value={fmt(data?.kpis?.total_visitors)} hint={`${fmt(data?.kpis?.pageviews)} pageviews`} />
              <Kpi label="Searches" value={fmt(data?.eventCounts?.search_started)} hint="Tracked site searches" />
              <Kpi label="Profile views" value={fmt(data?.eventCounts?.tutor_profile_viewed)} hint="Instructor profile intent" />
              <Kpi label="Contact clicks" value={fmt(data?.eventCounts?.contact_tutor_clicked)} hint="Contact/book intent" />
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
