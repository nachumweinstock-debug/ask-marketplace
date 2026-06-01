import { useEffect, useState } from 'react';
import api from '../api';
import { RowSkeleton } from '../components/Skeletons';
import SharePanel from '../components/SharePanel';
import ContactImporter from '../components/ContactImporter';
import { useAuth } from '../context/AuthContext';

export default function Referrals() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/referrals/mine')
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page" style={{ maxWidth: 760 }}><RowSkeleton rows={5} /></div>;

  return (
    <div className="page" style={{ maxWidth: 760 }}>

      {/* ── Refer a Friend hero ─────────────────────────────── */}
      <div style={{
        background: '#FFF1E8', border: '1.5px solid #F5D4BE',
        borderRadius: 20, padding: '32px 28px', marginBottom: 16,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: '#F15A24',
          fontFamily: 'var(--font-ui)', marginBottom: 12,
        }}>
          ✦ Refer a Friend
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 38, lineHeight: 1.05,
          marginBottom: 12, color: '#17130F',
        }}>
          Invite your classmates to ASK
        </h1>

        <p style={{
          fontSize: 14, lineHeight: 1.75, color: '#5F5A50',
          marginBottom: 20, maxWidth: 500,
        }}>
          ASK is a campus app to find OR offer tutoring, barbers, fitness and more. Share your personal link — when classmates sign up, you're credited.
        </p>

        {/* Invite link pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          background: '#fff', border: '1px solid #F5D4BE',
          borderRadius: 8, padding: '8px 14px', marginBottom: 18,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#5F5A50' }}>
            {data?.invite_url?.replace('https://', '') || '—'}
          </span>
        </div>

        <SharePanel referralCode={data?.code} university={user?.university} variant="light" />
      </div>

      {/* ── Stats row ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <Kpi label="Your code"      value={data?.code || '—'} mono />
        <Kpi label="Signups"        value={data?.successful_signups ?? 0} />
        <Kpi label="Bookings made"  value={data?.successful_bookings ?? 0} />
      </div>

      {/* ── How it works ────────────────────────────────────── */}
      <div className="card" style={{ padding: '22px 24px', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 14 }}>How it works</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            ['Share your link', 'Send it via WhatsApp, iMessage, or copy it — whatever works.'],
            ['They sign up', 'When someone uses your link, they\'re tracked as your referral.'],
            ['They book', 'See how many of your referrals actually make bookings on campus.'],
          ].map(([title, desc], i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 99, flexShrink: 0,
                background: '#EEF2FF', color: '#1B3A6B',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                marginTop: 1,
              }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Contact importer ────────────────────────────────── */}
      <div className="card" style={{ padding: '22px 24px', marginBottom: 16 }}>
        <ContactImporter referralCode={data?.code} university={user?.university} />
      </div>

      {/* ── Invited users list ──────────────────────────────── */}
      <div className="card" style={{ padding: '22px 24px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 4 }}>
          People you invited
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          {data?.invited_users?.length
            ? `${data.invited_users.length} classmate${data.invited_users.length === 1 ? '' : 's'} joined through your link.`
            : 'No one has signed up through your link yet.'}
        </p>

        {data?.invited_users?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.invited_users.map((u, idx) => (
              <div key={u.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: 12, padding: '13px 0',
                borderTop: idx === 0 ? 'none' : '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                    Joined {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: u.bookings > 0 ? '#1B3A6B' : 'var(--muted)', flexShrink: 0 }}>
                  {u.bookings > 0 ? `${u.bookings} booking${u.bookings === 1 ? '' : 's'}` : 'No bookings yet'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, mono }) {
  return (
    <div className="card" style={{ padding: '16px 18px', borderRadius: 14 }}>
      <div style={{
        fontSize: 10, fontWeight: 800, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        fontFamily: 'var(--font-ui)', marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-display)',
        fontSize: mono ? 16 : 30, fontWeight: mono ? 600 : 400,
        wordBreak: 'break-all', color: 'var(--text)',
      }}>
        {value}
      </div>
    </div>
  );
}
