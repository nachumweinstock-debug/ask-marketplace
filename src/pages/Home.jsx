import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FAQAccordion from '../components/FAQAccordion';
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
      ['Biology', '/subjects/biology-tutors'],
      ['Chemistry', '/subjects/chemistry-tutors'],
      ['Organic Chemistry', '/subjects/organic-chemistry-tutors'],
      ['Physics', '/subjects/physics-tutors'],
      ['Calculus', '/subjects/calculus-tutors'],
      ['Statistics', '/subjects/statistics-tutors'],
      ['Computer Science', '/subjects/computer-science-tutors'],
      ['Engineering', '/subjects/engineering-tutors'],
      ['Data Science', '/subjects/data-science-tutors'],
    ],
  },
  {
    title: 'Business instruction',
    copy: 'Accounting, finance, economics, spreadsheets, test prep, and the classes where one missed concept wrecks the set.',
    subjects: [
      ['Accounting', '/subjects/accounting-tutors'],
      ['Finance', '/subjects/finance-tutors'],
      ['Economics', '/subjects/economics-tutors'],
    ],
  },
  {
    title: 'Humanities instruction',
    copy: 'Writing, research, reading-heavy courses, and social science help with people who can actually explain the assignment.',
    subjects: [
      ['Psychology', '/subjects/psychology-tutors'],
      ['Writing', '/subjects/writing-tutors'],
      ['History', '/subjects/history-tutors'],
      ['Political Science', '/subjects/political-science-tutors'],
    ],
  },
];

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
            <Link className="ask-button-secondary" to="/browse">View everything</Link>
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
                  {category.subjects.map(([label, href]) => (
                    <a key={href} href={href}>{label}</a>
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
