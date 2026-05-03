import { useState } from 'react';
import { Link } from 'react-router-dom';

const FAQS = [
  {
    q: 'How do I book someone?',
    a: 'Browse listings, find who you need, select a time slot and hit Book. You\'ll get a confirmation email right after.',
  },
  {
    q: 'How do I pay?',
    a: 'Payment is handled directly between you and the provider via Venmo or Zelle after your session. No money goes through ASK.',
  },
  {
    q: 'What if I need to cancel?',
    a: 'Message the provider through the app as soon as possible to let them know. They\'ll appreciate the heads up.',
  },
  {
    q: 'How do I become a provider?',
    a: 'Create an account, go to My Stuff, and post a listing with your subject, price and availability. It takes about two minutes.',
  },
  {
    q: "Why doesn't it work on YU WiFi?",
    a: "New websites are automatically blocked by YU's network for 30 days. Use your mobile data to sign up — it works fine off WiFi.",
  },
  {
    q: 'Is it free?',
    a: 'Yes — completely free for students. Providers also join for free. ASK takes no commission.',
  },
  {
    q: 'Who can use ASK?',
    a: 'Anyone — whether you\'re looking for help or want to offer a service.',
  },
  {
    q: 'What subjects are available?',
    a: "Instruction, barbers, Hebrew, fitness, music and more. Can't find what you need? Use the request feature and we'll find someone for you.",
  },
];

function Item({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderBottom: '1px solid var(--border)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', fontFamily: 'var(--font-ui)',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{q}</span>
        <span style={{
          flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
          background: open ? 'var(--primary)' : 'var(--accent)',
          color: open ? '#fff' : 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700,
          transition: 'background .15s, color .15s',
        }}>
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <p style={{
          fontSize: 14, color: 'var(--muted)', lineHeight: 1.7,
          paddingBottom: 20, margin: 0,
        }}>
          {a}
        </p>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '60px 24px 100px' }}>
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 700,
          color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 12,
        }}>
          FAQ
        </h1>
        <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6 }}>
          Everything you need to know about ASK.{' '}
          <Link to="/help-wanted" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Still stuck? Post a request →
          </Link>
        </p>
      </div>

      <div className="card" style={{ padding: '0 28px' }}>
        {FAQS.map((f, i) => <Item key={i} q={f.q} a={f.a} />)}
      </div>

      <div style={{ textAlign: 'center', marginTop: 48, fontSize: 13, color: 'var(--muted)' }}>
        More questions?{' '}
        <a href="mailto:ask914142@gmail.com" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
          ask914142@gmail.com
        </a>
      </div>
    </div>
  );
}
