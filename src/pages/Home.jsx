import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FAQAccordion from '../components/FAQAccordion';
import SharePanel from '../components/SharePanel';
import api from '../api';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'tutor', label: 'Instructors' },
  { id: 'barber', label: 'Barbers' },
  { id: 'languages', label: 'Languages' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'other', label: 'Other' },
];

const COMMENTATOR_ARTICLE_URL =
  'https://yucommentator.org/2026/05/final-exams-begin-next-week-need-help-organizing-your-studying/';

const ACADEMIC_CATEGORIES = [
  {
    title: 'STEM instruction',
    copy: 'Pre-health, engineering, CS, data, math, and lab-heavy classes without the endless group chat scramble.',
    subjects: [
      ['Biology', '/browse?search=biology'],
      ['Chemistry', '/browse?search=chemistry'],
      ['Organic Chemistry', '/browse?search=organic+chemistry'],
      ['Physics', '/browse?search=physics'],
      ['Calculus', '/browse?search=calculus'],
      ['Statistics', '/browse?search=statistics'],
      ['Computer Science', '/browse?search=computer+science'],
      ['Engineering', '/browse?search=engineering'],
      ['Data Science', '/browse?search=data+science'],
    ],
  },
  {
    title: 'Business instruction',
    copy: 'Accounting, finance, economics, spreadsheets, test prep, and the classes where one missed concept wrecks the set.',
    subjects: [
      ['Accounting', '/browse?search=accounting'],
      ['Finance', '/browse?search=finance'],
      ['Economics', '/browse?search=economics'],
    ],
  },
  {
    title: 'Humanities instruction',
    copy: 'Writing, research, reading-heavy courses, and social science help with people who can actually explain the assignment.',
    subjects: [
      ['Psychology', '/browse?search=psychology'],
      ['Writing', '/browse?search=writing'],
      ['History', '/browse?search=history'],
      ['Political Science', '/browse?search=political+science'],
    ],
  },
];

// Light-mode share buttons for cream/orange backgrounds
function ReferralShareButtons({ referralCode, university }) {
  const [copied, setCopied] = useState(false);

  const code = String(referralCode || '').trim().toUpperCase();
  const link = code ? `https://uask.live/join/${encodeURIComponent(code)}` : '';

  function uniLabel(u) {
    if (!u) return 'your campus';
    const map = { 'Yeshiva University': 'YU', 'Stern College for Women': 'Stern' };
    return map[u] || u;
  }
  const text = link
    ? `Hey! ASK is a campus app to find OR offer tutoring, barbers, fitness and more at ${uniLabel(university)}. Sign up with my link: ${link}`
    : '';

  const waHref  = text ? `https://wa.me/?text=${encodeURIComponent(text)}` : '#';
  const smsHref = text ? `sms:?body=${encodeURIComponent(text)}` : '#';

  async function handleCopy() {
    if (!text) return;
    try {
      const { copyText } = await import('../lib/clipboard');
      await copyText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  }

  const btnBase = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '13px 20px', borderRadius: 12, fontSize: 14, fontWeight: 700,
    fontFamily: 'var(--font-ui)', cursor: 'pointer', textDecoration: 'none',
    transition: 'all .15s', border: 'none', whiteSpace: 'nowrap',
  };
  const primaryBtn = { ...btnBase, background: '#F15A24', color: '#fff' };
  const secondaryBtn = { ...btnBase, background: '#fff', color: '#17130F', border: '1.5px solid #E8E3DA' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <a href={smsHref} style={primaryBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          iMessage
        </a>
        <a href={waHref} target="_blank" rel="noopener noreferrer" style={secondaryBtn}>
          <svg width="16" height="16" viewBox="0 0 32 32"><path fill="currentColor" d="M16.02 3.2A12.7 12.7 0 0 0 5.05 22.3L3.2 28.8l6.68-1.75A12.66 12.66 0 0 0 16.02 28.6 12.7 12.7 0 1 0 16.02 3.2Zm0 23.25c-2.02 0-4-.58-5.7-1.67l-.4-.25-3.95 1.03 1.05-3.82-.27-.42a10.55 10.55 0 1 1 9.27 5.13Zm5.8-7.9c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.71.16-.21.31-.82 1.03-1 1.24-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.58-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.53-.71-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.08-1.11 2.64s1.14 3.07 1.3 3.28c.16.21 2.24 3.42 5.42 4.8.76.33 1.35.53 1.81.68.76.24 1.45.21 2 .13.61-.09 1.88-.77 2.15-1.51.27-.74.27-1.38.19-1.51-.08-.13-.29-.21-.61-.37Z"/></svg>
          WhatsApp
        </a>
      </div>
      <button type="button" onClick={handleCopy} disabled={!text} style={
        copied
          ? { ...secondaryBtn, background: '#F0FDF4', borderColor: '#BBF7D0', color: '#15803d' }
          : { ...secondaryBtn, justifyContent: 'center', opacity: text ? 1 : 0.5 }
      }>
        {copied ? (
          <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
        ) : (
          <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy message &amp; link</>
        )}
      </button>
    </div>
  );
}

function ReferralStrip() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState(null);

  useEffect(() => {
    api.get('/referrals/mine')
      .then(r => setReferralCode(r.data?.code || null))
      .catch(() => {});
  }, []);

  return (
    <section style={{
      background: '#FFF1E8',
      borderTop: '1px solid #F5D4BE',
      borderBottom: '1px solid #F5D4BE',
      padding: '44px 24px',
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,400px)',
        gap: 48, alignItems: 'center',
      }}
        className="referral-strip-grid"
      >
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#F15A24', fontFamily: 'var(--font-ui)',
            marginBottom: 12,
          }}>
            ✦ Refer a Friend
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,3.5vw,44px)',
            color: '#17130F', lineHeight: 1.05, margin: '0 0 14px',
          }}>
            Invite your classmates to ASK
          </h2>
          <p style={{ color: '#5F5A50', fontSize: 15, lineHeight: 1.7, maxWidth: 440, margin: 0 }}>
            ASK is a campus app to find OR offer tutoring, barbers, fitness and more. Share your personal link — when they sign up, you're credited.
          </p>
          {referralCode && (
            <div style={{
              marginTop: 16,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#fff', border: '1px solid #F5D4BE',
              borderRadius: 8, padding: '7px 14px',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#5F5A50' }}>
                uask.live/join/{referralCode.toLowerCase()}
              </span>
            </div>
          )}
        </div>

        <div>
          <ReferralShareButtons referralCode={referralCode} university={user?.university} />
        </div>
      </div>
    </section>
  );
}

function HangoutsStrip() {
  const [count, setCount] = useState(null);
  useEffect(() => {
    api.get('/hangouts').then(({ data }) => setCount(data.length)).catch(() => {});
  }, []);

  return (
    <section style={{
      background: '#1B3A6B',
      padding: '36px 24px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', display: 'inline-block',
              boxShadow: '0 0 0 3px rgba(74,222,128,0.25)',
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#93C5FD', letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'var(--font-ui)' }}>
              Live now
            </span>
          </div>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(24px,4vw,36px)', color: '#FAF7F2', fontWeight: 400, margin: 0, lineHeight: 1.15 }}>
            🪩 StudyParty
          </h2>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, color: '#93C5FD', marginTop: 6 }}>
            {count === null
              ? "See who's studying right now — show up and join."
              : count === 0
              ? 'No sessions running yet — be the first one out.'
              : `${count} active session${count !== 1 ? 's' : ''} happening right now.`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/studyparty" style={{
            padding: '11px 24px', borderRadius: 99,
            background: '#FAF7F2', color: '#1B3A6B',
            fontSize: 14, fontWeight: 700, textDecoration: 'none',
            fontFamily: "'Outfit', sans-serif",
            transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            Join a session
          </Link>
          <Link to="/studyparty" state={{ openModal: true }} style={{
            padding: '11px 24px', borderRadius: 99,
            background: 'transparent', color: '#FAF7F2',
            border: '1.5px solid rgba(250,247,242,0.35)',
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
            fontFamily: "'Outfit', sans-serif",
            transition: 'border-color 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(250,247,242,0.7)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(250,247,242,0.35)'; }}
          >
            Start one
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');

  function submitSearch(e) {
    e.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/browse?search=${encodeURIComponent(trimmed)}` : '/browse');
  }

  return (
    <div className="home-shell">
      <section className="home-hero">
        <div className="fade-up">
          <div className="home-eyebrow">Live campus marketplace</div>
          <h1 className="home-title">
            Find tutors and services <span>on campus.</span>
          </h1>
          <p className="home-copy">
            Browse YU students offering tutoring, haircuts, fitness, Hebrew, and more. Filter by campus, format, price, and availability.
          </p>

          <div className="home-actions">
            <button className="ask-button-primary" onClick={() => navigate('/browse')}>
              Browse listings
            </button>
            <button
              className="ask-button-secondary"
              data-analytics-event="become_tutor_clicked"
              data-analytics-label="hero_post_service"
              onClick={() => navigate(user ? '/create-listing' : '/signup')}
            >
              Post a service
            </button>
          </div>

          <div className="home-search-panel">
            <form onSubmit={submitSearch}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try finance, calculus, barber, Hebrew..."
                aria-label="Search Ask Marketplace"
              />
              <button className="ask-button-primary" type="submit">Search</button>
            </form>
            <div className="home-proof-row" aria-label="Marketplace stats">
              <div><strong>24</strong><span>active listings</span></div>
              <div><strong>7</strong><span>service categories</span></div>
              <div><strong>0%</strong><span>platform commission</span></div>
            </div>
          </div>
        </div>

        <aside className="home-campus-panel fade-up-delay" aria-label="Browse campus options">
          <div>
            <div className="section-label">Campus marketplace</div>
            <h2>Pick the right place first.</h2>
            <p>
              Browse students by campus, online availability, or category without digging through unrelated posts.
            </p>
          </div>
          <div className="home-campus-actions">
            <button onClick={() => navigate('/browse?campus=WILF')}>WILF listings</button>
            <button onClick={() => navigate('/browse?campus=BEREN')}>BEREN listings</button>
            <button onClick={() => navigate('/browse?session_type=zoom')}>Online help</button>
            <button onClick={() => navigate(user ? '/create-listing' : '/signup')}>Post a service</button>
          </div>
        </aside>
      </section>

      <section className="home-section">
        <div className="home-section-inner">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'end', flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
              <div className="section-label">Browse by category</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 5vw, 58px)', lineHeight: 0.95, marginTop: 8 }}>
                Start with what you need.
              </h2>
            </div>
            <Link className="ask-button-secondary" to="/browse">Browse all listings</Link>
          </div>
          <div className="pill-row">
            {FILTERS.map(({ id, label }) => (
              <button
                key={id}
                className="home-category-pill"
                onClick={() => navigate(id === 'all' ? '/browse' : `/browse?category=${id}`)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {user && <ReferralStrip />}

      <HangoutsStrip />

      <section className="home-section" style={{ background: '#fff' }}>
        <div className="home-section-inner">
          <div className="section-label" style={{ marginBottom: 12 }}>College instruction</div>
          <div className="home-category-grid">
            {ACADEMIC_CATEGORIES.map((category) => (
              <section className="home-category-card" key={category.title}>
                <div>
                  <h2>{category.title}</h2>
                  <p>{category.copy}</p>
                </div>
                <div className="home-subject-links">
                  {category.subjects.map(([label, to]) => (
                    <Link key={to} to={to} className="home-category-pill">{label}</Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-inner" style={{ maxWidth: 920 }}>
          <FAQAccordion title="Ask Marketplace FAQ" schemaId="home-faq-schema" />
        </div>
      </section>

      <section className="home-section home-press-section">
        <div className="home-section-inner">
          <a
            className="home-press-link"
            href={COMMENTATOR_ARTICLE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="home-press-mark" aria-hidden="true">YU</div>
            <div className="home-press-copy">
              <div className="section-label">Featured in The YU Commentator</div>
              <h2>Ask was featured for helping students organize finals week.</h2>
              <p>Read the Commentator piece on finding study help before exams.</p>
            </div>
            <span>Read the article -&gt;</span>
          </a>
        </div>
      </section>

      <section className="home-section" style={{ background: '#17130F', color: '#fff' }}>
        <div className="home-section-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div className="section-label" style={{ color: '#F3C74F' }}>For providers</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 5vw, 60px)', lineHeight: 0.95, marginTop: 8 }}>
              Good at something?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.68)', maxWidth: 560, marginTop: 12, fontSize: 17 }}>
              Post the service, set your price, add availability, and let people book you without the back-and-forth.
            </p>
          </div>
          <Link
            to={user ? '/create-listing' : '/signup'}
            className="ask-button-primary"
            data-analytics-event="become_tutor_clicked"
            data-analytics-label="home_bottom_post_listing"
            style={{ background: '#fff', color: '#17130F', borderColor: '#fff' }}
          >
            Post a service
          </Link>
        </div>
      </section>

      <footer style={{
        borderTop: '1px solid var(--border)', background: '#F8F7F3',
        padding: '22px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>ASK</span>
        <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700 }}>
          Student marketplace for instruction and services.
        </span>
      </footer>
    </div>
  );
}
