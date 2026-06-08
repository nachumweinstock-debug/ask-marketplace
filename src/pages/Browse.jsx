import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ProviderCard from '../components/ProviderCard';
import { trackEvent } from '../lib/analytics';
import FAQAccordion from '../components/FAQAccordion';
import { TutorCardSkeleton } from '../components/Skeletons';
import { hasSuggestion, suggestText } from '../lib/textSuggestions';
import { providerUrl } from '../lib/providerUrl';

function uniLabel(u) {
  if (!u) return 'your campus';
  const map = { 'Yeshiva University': 'YU', 'Stern College for Women': 'Stern' };
  return map[u] || u;
}

function BrowseShareButtons({ referralCode, university }) {
  const [copied, setCopied] = useState(false);
  const code = String(referralCode || '').trim().toUpperCase();
  const link = code ? `https://uask.live/join/${encodeURIComponent(code)}` : '';
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

  const base = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    padding: '11px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
    fontFamily: 'var(--font-ui)', cursor: 'pointer', textDecoration: 'none',
    transition: 'opacity .15s', border: 'none', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <a href={smsHref} style={{ ...base, background: '#F15A24', color: '#fff' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          iMessage
        </a>
        <a href={waHref} target="_blank" rel="noopener noreferrer" style={{ ...base, background: '#fff', color: '#17130F', border: '1.5px solid #E8E3DA' }}>
          <svg width="15" height="15" viewBox="0 0 32 32"><path fill="currentColor" d="M16.02 3.2A12.7 12.7 0 0 0 5.05 22.3L3.2 28.8l6.68-1.75A12.66 12.66 0 0 0 16.02 28.6 12.7 12.7 0 1 0 16.02 3.2Zm0 23.25c-2.02 0-4-.58-5.7-1.67l-.4-.25-3.95 1.03 1.05-3.82-.27-.42a10.55 10.55 0 1 1 9.27 5.13Zm5.8-7.9c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.71.16-.21.31-.82 1.03-1 1.24-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.58-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.53-.71-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.08-1.11 2.64s1.14 3.07 1.3 3.28c.16.21 2.24 3.42 5.42 4.8.76.33 1.35.53 1.81.68.76.24 1.45.21 2 .13.61-.09 1.88-.77 2.15-1.51.27-.74.27-1.38.19-1.51-.08-.13-.29-.21-.61-.37Z"/></svg>
          WhatsApp
        </a>
      </div>
      <button type="button" onClick={handleCopy} disabled={!text}
        style={copied
          ? { ...base, background: '#F0FDF4', color: '#15803d', border: '1.5px solid #BBF7D0' }
          : { ...base, background: '#fff', color: '#17130F', border: '1.5px solid #E8E3DA', opacity: text ? 1 : 0.5 }
        }
      >
        {copied
          ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
          : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy message &amp; link</>
        }
      </button>
    </div>
  );
}

function BrowseReferralBanner({ user }) {
  const [code, setCode] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.get('/referrals/mine')
      .then(r => setCode(r.data?.code || null))
      .catch(() => {});
  }, [user?.id]);

  if (!user || !code) return null;

  return (
    <div style={{
      background: '#FFF1E8',
      border: '1.5px solid #F5D4BE',
      borderRadius: 18, marginBottom: 22,
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,340px)',
        gap: 28, padding: '22px 26px', alignItems: 'center',
      }}
        className="referral-strip-grid"
      >
        <div>
          <div style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: '#F15A24',
            fontFamily: 'var(--font-ui)', marginBottom: 8,
          }}>
            ✦ Refer a Friend
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(18px, 2.4vw, 26px)',
            color: '#17130F', margin: '0 0 6px', lineHeight: 1.15,
          }}>
            Know someone who needs campus services?
          </h2>
          <p style={{ color: '#5F5A50', fontSize: 13, lineHeight: 1.6, margin: 0, maxWidth: 380 }}>
            Share your link — when they sign up you're credited.
          </p>
          <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#A09890' }}>
            uask.live/join/{code.toLowerCase()}
          </div>
        </div>

        <BrowseShareButtons referralCode={code} university={user?.university} />
      </div>
    </div>
  );
}

const EDIT_CATEGORIES = [
  { id: 'tutor',     label: 'Instruction'  },
  { id: 'barber',    label: 'Barber'    },
  { id: 'fitness',   label: 'Fitness'   },
  { id: 'languages', label: 'Languages' },
  { id: 'music',     label: 'Music'     },
  { id: 'torah',     label: 'Torah'     },
  { id: 'other',     label: 'Other'     },
];
const EDIT_SUBCATS = {
  tutor:     ['Math', 'Chemistry', 'Biology', 'Physics', 'Excel', 'Coding', 'English', 'History', 'Economics', 'SAT/ACT', 'Calculus', 'Statistics'],
  fitness:   ['Tennis', 'Golf', 'Basketball', 'Soccer', 'Baseball', 'Swimming', 'Squash', 'Yoga', 'Weightlifting', 'Running', 'Boxing', 'Volleyball'],
  languages: ['Hebrew', 'Ivrit', 'Spanish', 'French', 'Yiddish', 'Arabic', 'Russian', 'Mandarin', 'Italian', 'German'],
  music:     ['Guitar', 'Piano', 'Violin', 'Drums', 'Vocals', 'Bass', 'Ukulele', 'Flute', 'Music Theory', 'Saxophone'],
  torah:     ['Gemara', 'Halacha', 'Chumash', 'Mishna', 'Tefilla', 'Parsha', 'Tanach', 'Jewish History', 'Mussar', 'Chassidus'],
};
const CUSTOM_CAT_MAP = { torah: 'Torah Studies', languages: 'Languages', music: 'Music' };
const CAMPUS_OPTIONS = [
  { id: 'WILF', label: 'WILF' },
  { id: 'BEREN', label: 'BEREN' },
];

const BASE_FILTERS = [
  { id: 'all',          label: 'All'           },
  { id: 'tutor',        label: 'Tutors'        },
  { id: 'fitness',      label: 'Fitness'       },
  { id: 'barber',       label: 'Barbers'       },
  { id: 'languages',    label: 'Languages'     },
  { id: 'music',        label: 'Music'         },
  { id: 'Torah Studies',label: 'Torah Studies' },
];

const SUBCATEGORY_PARENT = new Set(['tutor', 'fitness', 'languages', 'music']);

const CATEGORY_SEO = {
  tutor:          { title: 'Tutors at Yeshiva University | ASK Marketplace', desc: 'Find tutors for finance, math, chemistry, biology, physics, economics, writing, and exam prep at YU.' },
  barber:         { title: 'Campus Barbers at Yeshiva University | ASK Marketplace', desc: 'Book a student barber at YU — fades, tapers, beard trims, and cuts at affordable prices on campus.' },
  fitness:        { title: 'Personal Trainers & Fitness Coaches at YU | ASK Marketplace', desc: 'Find personal trainers, tennis coaches, boxing instructors, yoga teachers, and fitness coaches at Yeshiva University.' },
  languages:      { title: 'Language Tutors at Yeshiva University | ASK Marketplace', desc: 'Hebrew, Ivrit, Spanish, French, Yiddish, Arabic, and other language tutors at YU — book a session through ASK.' },
  music:          { title: 'Music Lessons at Yeshiva University | ASK Marketplace', desc: 'Guitar, piano, violin, drums, vocals, and music theory lessons from student musicians at YU.' },
  'Torah Studies':{ title: 'Torah Studies & Gemara Tutors at YU | ASK Marketplace', desc: 'Find Gemara, Chumash, Halacha, Mishna, and Tanach tutors and chavruta partners at Yeshiva University.' },
};

const CONCIERGE_EXAMPLES = [
  'Need a calculus tutor before an exam',
  'Looking for a barber on WILF before Shabbos',
  'Need a Hebrew tutor for conversation practice',
  'Want tennis lessons on Sundays',
  'Need Excel help for a job interview',
];

const CONCIERGE_STOPWORDS = new Set([
  'need', 'looking', 'look', 'want', 'for', 'a', 'an', 'the', 'to', 'on', 'in', 'my',
  'who', 'can', 'with', 'before', 'after', 'this', 'that', 'and', 'or', 'please',
  'help', 'find', 'me', 'wanting', 'need', 'tonight', 'today', 'tomorrow', 'week',
]);

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function finderParamsFromPrompt(prompt) {
  const text = String(prompt || '').trim();
  const lower = text.toLowerCase();
  const next = { search: text };

  if (/\bbarber|haircut|fade|taper|beard\b/.test(lower)) next.category = 'barber';
  else if (/\btennis|trainer|fitness|workout|boxing|yoga|basketball|soccer|running|golf\b/.test(lower)) next.category = 'fitness';
  else if (/\bhebrew|spanish|french|arabic|language|ivrit|yiddish\b/.test(lower)) next.category = 'languages';
  else if (/\bguitar|piano|violin|drums|vocal|music\b/.test(lower)) next.category = 'music';
  else if (/\bgemara|halacha|chumash|torah|tanach|mishna\b/.test(lower)) next.category = 'Torah Studies';
  else if (/\btutor|math|excel|chemistry|biology|physics|coding|economics|history|english|calc|calculus|stats|finance|accounting|accountant|python|java|javascript|sql|data structures|algorithms|exam|test|quiz|midterm|final|homework|assignment|study|class|course|lesson|prep\b/.test(lower)) next.category = 'tutor';
  else if (/\bhelp me with|need help with|explain|study for|prepare for|prep for\b/.test(lower)) next.category = 'tutor';

  if (/\bonline|virtual|zoom\b/.test(lower)) next.session_type = 'zoom';
  else if (/\bin person|on campus|near me\b/.test(lower)) next.session_type = 'in-person';

  return next;
}

function conciergeText(provider) {
  return [
    provider.name,
    provider.title,
    provider.subcategory,
    provider.custom_category,
    provider.bio,
    provider.category,
    Array.isArray(provider.merged_services) ? provider.merged_services.join(' ') : '',
  ].filter(Boolean).join(' ').toLowerCase();
}

function conciergeSemanticCategory(prompt) {
  const parsed = finderParamsFromPrompt(prompt);
  if (parsed.category && parsed.category !== 'all') return parsed.category;
  const lower = String(prompt || '').toLowerCase();
  if (/\b(problem set|problemset|lecture|syllabus|exam|test|quiz|midterm|final|homework|assignment|class|course|topic|chapter|section)\b/.test(lower)) return 'tutor';
  if (/\bhelp me with|explain|understand|study for|prepare for|prep for\b/.test(lower)) return 'tutor';
  return 'all';
}

function conciergeTokens(prompt) {
  return String(prompt || '')
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .map(token => token.trim())
    .filter(token => token.length > 2 && !CONCIERGE_STOPWORDS.has(token));
}

function findConciergeMatches(prompt, rows) {
  const text = String(prompt || '').trim();
  if (!text) return [];

  const parsed = finderParamsFromPrompt(text);
  const targetCategory = String(parsed.category || conciergeSemanticCategory(text) || '').toLowerCase();
  const tokens = conciergeTokens(text);
  const semanticCategory = conciergeSemanticCategory(text);
  const lower = text.toLowerCase();

  return dedupeProvidersByUser(rows)
    .map(provider => {
      const haystack = conciergeText(provider);
      let score = 1;

      if (targetCategory && targetCategory !== 'all') {
        const category = String(provider.category || '').toLowerCase();
        const customCategory = String(provider.custom_category || '').toLowerCase();
        const subcategory = String(provider.subcategory || '').toLowerCase();
        const title = String(provider.title || '').toLowerCase();

        if (category === targetCategory) score += 10;
        if (customCategory.includes(targetCategory)) score += 8;
        if (subcategory.includes(lower) || lower.includes(subcategory)) score += 5;
        if (title.includes(targetCategory)) score += 3;
      }

      if (semanticCategory && semanticCategory !== 'all') {
        const category = String(provider.category || '').toLowerCase();
        const customCategory = String(provider.custom_category || '').toLowerCase();
        if (semanticCategory === 'tutor' && ['tutor', 'hebrew tutor'].includes(category)) score += 7;
        if (semanticCategory === 'fitness' && ['fitness', 'tennis'].includes(category)) score += 7;
        if (semanticCategory === 'languages' && (category === 'hebrew tutor' || customCategory.includes('language'))) score += 7;
        if (semanticCategory === 'music' && customCategory.includes('music')) score += 7;
        if (semanticCategory === 'Torah Studies' && customCategory.includes('torah')) score += 7;
      }

      for (const token of tokens) {
        if (haystack.includes(token)) score += 2;
      }

      if (/(\bexam\b|\btest\b|\bquiz\b|\bmidterm\b|\bfinal\b|\bhomework\b|\bassignment\b|\bstudy\b|\bclass\b|\bcourse\b|\blecture\b)/.test(lower)) {
        if (['tutor', 'hebrew tutor'].includes(String(provider.category || '').toLowerCase()) || String(provider.custom_category || '').toLowerCase().includes('language')) score += 6;
      }

      if (/(\bpython\b|\bjava\b|\bjavascript\b|\bsql\b|\bcoding\b|\bprogramming\b|\bdata structures\b|\balgorithms\b)/.test(lower)) {
        if (['tutor', 'hebrew tutor'].includes(String(provider.category || '').toLowerCase()) || String(provider.title || '').toLowerCase().includes('coding') || String(provider.subcategory || '').toLowerCase().includes('coding')) score += 7;
      }

      if (text.toLowerCase().includes('online') || text.toLowerCase().includes('zoom') || text.toLowerCase().includes('virtual')) {
        if (provider.session_type === 'zoom') score += 5;
      }

      if (text.toLowerCase().includes('on campus') || text.toLowerCase().includes('in person') || text.toLowerCase().includes('near me')) {
        if (provider.session_type !== 'zoom') score += 2;
      }

      if (text.toLowerCase().includes('tonight') || text.toLowerCase().includes('today') || text.toLowerCase().includes('this week') || text.toLowerCase().includes('before')) {
        if (provider.availability) score += 1;
      }

      return { provider, score };
    })
    .sort((a, b) => b.score - a.score || String(a.provider.name || '').localeCompare(String(b.provider.name || '')))
    .map(item => item.provider);
}

function listingSummary(provider) {
  return provider.title || provider.subcategory || provider.custom_category ||
    { tutor: 'Instruction', barber: 'Haircuts', 'hebrew tutor': 'Hebrew Instruction', fitness: 'Fitness', tennis: 'Fitness' }[provider.category] || provider.category;
}

function dedupeProvidersByUser(rows) {
  const grouped = new Map();

  for (const provider of rows) {
    const key = String(provider.user_id || provider.username || provider.id);
    const current = grouped.get(key);
    const service = listingSummary(provider);
    const numericPrice = Number(provider.price_per_session);

    if (!current) {
      grouped.set(key, {
        ...provider,
        merged_listing_count: 1,
        merged_services: service ? [service] : [],
        merged_min_price: Number.isFinite(numericPrice) && numericPrice > 0 ? numericPrice : null,
      });
      continue;
    }

    current.merged_listing_count += 1;
    if (service && !current.merged_services.includes(service)) current.merged_services.push(service);
    if (Number.isFinite(numericPrice) && numericPrice > 0) {
      current.merged_min_price = current.merged_min_price === null ? numericPrice : Math.min(current.merged_min_price, numericPrice);
    }

    const currentScore = Number(current.review_count || 0) * 10 + Number(current.rating || 0);
    const nextScore = Number(provider.review_count || 0) * 10 + Number(provider.rating || 0);
    if (nextScore > currentScore) {
      Object.assign(current, {
        ...provider,
        merged_listing_count: current.merged_listing_count,
        merged_services: current.merged_services,
        merged_min_price: current.merged_min_price,
      });
    }
  }

  return Array.from(grouped.values());
}

function TextSuggestion({ value, onApply }) {
  if (!value || !hasSuggestion(value)) return null;
  const suggestion = suggestText(value);
  return (
    <button type="button" onClick={() => onApply(suggestion)} style={{
      marginTop: 7,
      border: '1px solid #BFDBFE',
      background: '#EFF6FF',
      color: '#1D4ED8',
      borderRadius: 999,
      padding: '5px 10px',
      fontSize: 11.5,
      fontWeight: 800,
      cursor: 'pointer',
      fontFamily: 'var(--font-ui)',
    }}>
      Apply spelling suggestion: {suggestion.slice(0, 70)}{suggestion.length > 70 ? '...' : ''}
    </button>
  );
}

export default function Browse() {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [subcategory, setSubcategory] = useState(searchParams.get('subcategory') || 'all');
  const [sort, setSort] = useState(searchParams.get('sort') || 'rating');
  const [sessionType, setSessionType] = useState(searchParams.get('session_type') || 'all');
  const [campus, setCampus] = useState(searchParams.get('campus') || 'all');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [minRating, setMinRating] = useState(searchParams.get('min_rating') || '');
  const [availability, setAvailability] = useState(searchParams.get('availability') || 'all');
  const [savedIds, setSavedIds] = useState(new Set());
  const [customCats, setCustomCats] = useState([]);
  const [subcats, setSubcats] = useState([]);
  const debounceRef = useRef(null);
  const skipSubcatReset = useRef(false);
  const [editModal, setEditModal] = useState(null); // { profileId, isAdminEdit, form }
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [conciergePrompt, setConciergePrompt] = useState(searchParams.get('search') || '');
  const [conciergeSubmittedPrompt, setConciergeSubmittedPrompt] = useState('');
  const [conciergeAnswer, setConciergeAnswer] = useState('');
  const [conciergeSearching, setConciergeSearching] = useState(false);
  const conciergeDebounceRef = useRef(null);
  // Dynamic meta per category for SEO
  useEffect(() => {
    const seo = CATEGORY_SEO[category];
    const search = searchParams.get('search') || '';
    if (seo) {
      document.title = seo.title;
      document.querySelector('meta[name="description"]')?.setAttribute('content', seo.desc);
    } else if (search) {
      document.title = `"${search}" at Yeshiva University | ASK Marketplace`;
    } else {
      document.title = 'Browse Campus Services at Yeshiva University | ASK Marketplace';
    }
    return () => {
      document.title = 'ASK Marketplace | Tutors, Barbers, Fitness & More at Yeshiva University';
    };
  }, [category, searchParams]);

  useEffect(() => {
    api.get('/providers/categories')
      .then(({ data }) => setCustomCats(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (conciergeDebounceRef.current) clearTimeout(conciergeDebounceRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!user) { setSavedIds(new Set()); return; }
    api.get('/saved-tutors/ids')
      .then(({ data }) => setSavedIds(new Set(data)))
      .catch(() => setSavedIds(new Set()));
  }, [user?.id]);

  useEffect(() => {
    if (skipSubcatReset.current) {
      skipSubcatReset.current = false;
      // Still refresh the sibling-subcategory list for the new category, but keep selected subcategory
      if (SUBCATEGORY_PARENT.has(category)) {
        api.get('/providers/subcategories', { params: { category } })
          .then(({ data }) => setSubcats(data))
          .catch(() => setSubcats([]));
      }
      return;
    }
    setSubcategory('all');
    if (!SUBCATEGORY_PARENT.has(category)) { setSubcats([]); return; }
    api.get('/providers/subcategories', { params: { category } })
      .then(({ data }) => setSubcats(data))
      .catch(() => setSubcats([]));
  }, [category]);

  useEffect(() => { fetchProviders(); }, [category, subcategory, sort, sessionType, campus, minPrice, maxPrice, minRating, availability]);

  function syncParams(next = {}) {
    const state = {
      search,
      category,
      subcategory,
      sort,
      session_type: sessionType,
      campus,
      min_price: minPrice,
      max_price: maxPrice,
      min_rating: minRating,
      availability,
      ...next,
    };
    const p = {};
    for (const [key, value] of Object.entries(state)) {
      if (!value || value === 'all') continue;
      if (key === 'sort' && value === 'rating') continue;
      p[key] = value;
    }
    setSearchParams(p);
  }

  // Search-on-type with debounce
  function handleSearchInput(val) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val.trim().length >= 2) {
        trackEvent('search_started', { query_length: val.trim().length, category, subcategory, session_type: sessionType });
      }
      fetchProviders(val);
    }, 200);
  }

  function shouldAutoTriggerConcierge(prompt) {
    const text = String(prompt || '').trim();
    if (text.length < 3) return false;
    const next = finderParamsFromPrompt(text);
    if (next.category || next.session_type) return true;
    return /\b(calculus|math|excel|barber|haircut|tutor|tutoring|hebrew|english|guitar|piano|tennis|fitness|workout|music|gemara|halacha|chumash|statistics|stats|chemistry|biology|physics|coding|economics|history)\b/i.test(text);
  }

  function handleConciergeInput(val) {
    setConciergePrompt(val);
    setConciergeAnswer('');
    if (conciergeDebounceRef.current) clearTimeout(conciergeDebounceRef.current);
    if (!shouldAutoTriggerConcierge(val)) return;
    conciergeDebounceRef.current = setTimeout(() => {
      handleConciergeSubmit(val);
    }, 450);
  }

  async function fetchProviders(searchVal, overrides = {}) {
    setLoading(true);
    try {
      const params = {};
      const nextCategory = overrides.category ?? category;
      const nextSubcategory = overrides.subcategory ?? subcategory;
      const nextSessionType = overrides.session_type ?? sessionType;
      const nextCampus = overrides.campus ?? campus;
      const nextMinPrice = overrides.min_price ?? minPrice;
      const nextMaxPrice = overrides.max_price ?? maxPrice;
      const nextMinRating = overrides.min_rating ?? minRating;
      const nextAvailability = overrides.availability ?? availability;
      if (nextCategory !== 'all') params.category = nextCategory;
      if (nextSubcategory !== 'all') params.subcategory = nextSubcategory;
      if (nextSessionType !== 'all') params.session_type = nextSessionType;
      if (nextCampus !== 'all') params.campus = nextCampus;
      if (nextMinPrice) params.min_price = nextMinPrice;
      if (nextMaxPrice) params.max_price = nextMaxPrice;
      if (nextMinRating) params.min_rating = nextMinRating;
      if (nextAvailability !== 'all') params.availability = nextAvailability;
      const q = searchVal !== undefined ? searchVal : (overrides.search ?? search);
      if (q) params.search = q;
      params.sort = overrides.sort ?? sort;
      const { data } = await api.get('/providers', { params });
      setProviders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteOwn(providerId) {
    if (!confirm('Delete your listing? This removes all your availability, bookings, and reviews. Cannot be undone.')) return;
    try {
      await api.delete(`/providers/${providerId}`);
      await refreshUser();
      setProviders(ps => ps.filter(p => p.id !== providerId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete listing');
    }
  }

  async function openEdit(profileId, isAdminEdit = false) {
    try {
      const { data } = await api.get(`/providers/${profileId}`);
      const CUSTOM_TO_CAT = { 'Torah Studies': 'torah', 'Languages': 'languages', 'Music': 'music' };
      const cat = CUSTOM_TO_CAT[data.custom_category] || data.category || 'other';
      setEditError('');
      setEditModal({
        profileId,
        isAdminEdit,
        form: {
          category: cat,
          custom_category: data.custom_category || '',
          subcategory: data.subcategory || '',
          bio: data.bio || '',
          price_per_session: data.price_per_session ?? '',
          zelle: data.zelle || '',
          venmo: data.venmo || '',
          session_type: data.session_type || 'in-person',
          campus: data.campus || 'WILF',
        },
      });
    } catch { alert('Failed to load listing'); }
  }

  async function saveEdit(e) {
    e.preventDefault();
    setEditError(''); setEditLoading(true);
    const { profileId, isAdminEdit, form } = editModal;
    const isCustom = !!CUSTOM_CAT_MAP[form.category];
    const body = {
      category: isCustom ? 'other' : form.category,
      custom_category: isCustom ? CUSTOM_CAT_MAP[form.category] : (form.category === 'other' ? form.custom_category : ''),
      subcategory: ['tutor', 'fitness', 'torah', 'languages', 'music'].includes(form.category) ? form.subcategory : '',
      bio: form.bio,
      price_per_session: form.price_per_session === '' ? 0 : Number(form.price_per_session),
      zelle: form.zelle,
      venmo: form.venmo,
      session_type: form.session_type,
      campus: form.session_type === 'zoom' ? null : form.campus,
    };
    try {
      const { data } = await api[isAdminEdit ? 'put' : 'put'](
        isAdminEdit ? `/admin/listings/${profileId}` : `/providers/${profileId}`,
        body
      );
      setProviders(ps => ps.map(p => p.id === profileId ? { ...p, ...data } : p));
      setEditModal(null);
    } catch (err) {
      setEditError(err.response?.data?.error || 'Save failed');
    } finally {
      setEditLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) {
      trackEvent('search_started', { query_length: search.trim().length, category, subcategory, session_type: sessionType, submitted: true });
    }
    syncParams({ search });
    fetchProviders(search);
  }

  async function handleConciergeSubmit(prompt) {
    const text = String(prompt || '').trim();
    if (!text) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setConciergePrompt(text);
    setConciergeSubmittedPrompt(text);
    setConciergeSearching(true);
    trackEvent('concierge_prompt_submitted', {
      prompt: text,
      prompt_length: text.length,
      detected_category: finderParamsFromPrompt(text).category || 'all',
    });
    try {
      const { data } = await api.post('/providers/concierge', { text });
      const nextSearch = String(data?.search || text).trim();
      const nextCategory = data?.category || 'all';
      const nextSubcategory = data?.subcategory || 'all';
      const nextSessionType = data?.session_type || 'all';
      const nextCampus = data?.campus || (nextSessionType === 'zoom' ? 'all' : campus);

      setConciergeAnswer(String(data?.answer || ''));
      setSearch(nextSearch);
      setCategory(nextCategory);
      setSubcategory(nextSubcategory || 'all');
      setSessionType(nextSessionType);
      if (nextSessionType === 'zoom') setCampus('all');

      syncParams({
        search: nextSearch,
        category: nextCategory,
        subcategory: nextSubcategory || 'all',
        session_type: nextSessionType,
        campus: nextCampus,
      });

      if (data?.should_search !== false) {
        await fetchProviders(nextSearch, {
          search: nextSearch,
          category: nextCategory,
          subcategory: nextSubcategory || 'all',
          session_type: nextSessionType,
          campus: nextCampus,
        });
      }
    } catch (err) {
      const fallback = finderParamsFromPrompt(text);
      const nextSearch = fallback.search || text;
      const nextCategory = fallback.category || 'all';
      const nextSessionType = fallback.session_type || 'all';
      const nextCampus = nextSessionType === 'zoom' ? 'all' : campus;
      setConciergeAnswer('I’m narrowing the search and pulling the closest providers.');
      setSearch(nextSearch);
      setCategory(nextCategory);
      setSubcategory('all');
      setSessionType(nextSessionType);
      if (nextSessionType === 'zoom') setCampus('all');
      syncParams({
        search: nextSearch,
        category: nextCategory,
        subcategory: 'all',
        session_type: nextSessionType,
        campus: nextCampus,
      });
      try {
        await fetchProviders(nextSearch, {
          search: nextSearch,
          category: nextCategory,
          subcategory: 'all',
          session_type: nextSessionType,
          campus: nextCampus,
        });
      } catch (fallbackErr) {
        console.error(fallbackErr || err);
      }
    } finally {
      setConciergeSearching(false);
    }
  }

  function handleCategory(cat) {
    setCategory(cat);
    setSubcategory('all');
    syncParams({ category: cat, subcategory: 'all' });
  }

  function handleSubcategory(sub) {
    setSubcategory(sub);
    syncParams({ subcategory: sub });
  }

  // Called when a subject pill on a card is clicked — sets category + subcategory atomically
  function handleTagClick(listing) {
    const sub = listing.subcategory;
    if (!sub) return;
    // Map DB category to the filter-bar category id
    const CAT_ID = {
      tutor: 'tutor', barber: 'barber',
      fitness: 'fitness', tennis: 'fitness',
      'hebrew tutor': 'languages',
    };
    let cat = CAT_ID[listing.category] || 'all';
    if (listing.custom_category) {
      const cc = listing.custom_category.toLowerCase();
      if (cc === 'music') cat = 'music';
      else if (cc === 'torah studies') cat = 'torah';
      else if (cc === 'languages') cat = 'languages';
    }
    skipSubcatReset.current = true;
    setCategory(cat);
    setSubcategory(sub);
    syncParams({ category: cat, subcategory: sub });
    // fetchProviders is triggered automatically by the [category, subcategory] effect
  }

  function handleSessionType(st) {
    setSessionType(st);
    const nextCampus = st === 'zoom' ? 'all' : campus;
    if (st === 'zoom') setCampus('all');
    syncParams({ session_type: st, campus: nextCampus });
  }

  function handleCampus(nextCampus) {
    setCampus(nextCampus);
    syncParams({ campus: nextCampus });
  }

  function handleSort(s) {
    setSort(s);
    syncParams({ sort: s });
  }

  function handleSavedChange(id, next) {
    setSavedIds(prev => {
      const copy = new Set(prev);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }

  const baseIds = new Set(BASE_FILTERS.map(f => f.id.toLowerCase()));
  const allFilters = [...BASE_FILTERS, ...customCats.filter(c => !baseIds.has(c.toLowerCase())).map(c => ({ id: c, label: c }))];
  const sitewideSaleActive = providers.some(p => p.first_time_discount_scope === 'sitewide');
  const visibleProviders = dedupeProvidersByUser(providers);
  const conciergeMatches = useMemo(
    () => findConciergeMatches(conciergePrompt || conciergeSubmittedPrompt, visibleProviders).slice(0, 3),
    [conciergePrompt, conciergeSubmittedPrompt, visibleProviders]
  );
  const conciergePromptLabel = conciergeSubmittedPrompt || conciergePrompt || 'Tell ASK what you need in plain English.';
  const campusName = campus === 'BEREN' ? 'BEREN' : campus === 'WILF' ? 'WILF' : '';
  const emptyTitle = campusName
    ? `No ${campusName} listings yet.`
    : 'No listings match those filters.';
  const emptyCopy = campusName
    ? `Try WILF, online, or any campus while ${campusName} listings start coming in.`
    : 'Try a broader category, a wider price range, or a different format.';

  return (
    <div className="page" style={{ paddingTop: 26 }}>

      {/* ── Concierge hero ── */}
      <div
        id="ask-concierge"
        style={{
          position: 'relative',
          marginBottom: 30,
          border: '1px solid rgba(27,58,107,0.10)',
          borderRadius: 30,
          background: 'linear-gradient(180deg, #FFFDF8 0%, #FFF8EE 100%)',
          boxShadow: '0 24px 60px rgba(27,58,107,0.08)',
          padding: '28px 28px 24px',
          overflow: 'hidden',
          scrollMarginTop: 112,
        }}>
        <div style={{ position: 'absolute', right: -40, top: -54, width: 180, height: 180, borderRadius: '50%', background: 'rgba(201,168,76,0.18)', filter: 'blur(56px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: 36, bottom: -50, width: 150, height: 150, borderRadius: '50%', background: 'rgba(27,58,107,0.08)', filter: 'blur(56px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(255,255,255,0.85), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.65), transparent 58%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ padding: '6px 12px', borderRadius: 999, background: '#1B3A6B', color: '#fff', fontSize: 11, fontWeight: 950, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Ask Concierge
          </div>
          <div style={{ padding: '5px 10px', borderRadius: 999, border: '1px solid rgba(27,58,107,0.12)', background: 'rgba(255,255,255,0.68)', color: 'rgba(27,58,107,0.74)', fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', backdropFilter: 'blur(8px)' }}>
            Plain-English search
          </div>
        </div>
        <div style={{ position: 'relative', maxWidth: 860, marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 4.2vw, 58px)', lineHeight: 0.94, color: '#112345', letterSpacing: '-0.04em', marginBottom: 10 }}>
            Ask it like a person. Get the right providers.
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.72, color: '#7A6E65', fontWeight: 400, maxWidth: 760 }}>
            Say what you need in plain English. ASK will pull the search toward the right service, format, and campus context without making you fight filters.
          </div>
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <input
            type="text"
            value={conciergePrompt}
            onChange={(e) => handleConciergeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConciergeSubmit(conciergePrompt); }}
            placeholder="Need a calculus tutor who can meet on campus this week"
            style={{
              flex: '1 1 360px',
              border: '1px solid rgba(27,58,107,0.12)',
              borderRadius: 18,
              padding: '16px 18px',
              fontSize: 15,
              outline: 'none',
              fontFamily: 'var(--font-ui)',
              background: '#fff',
              color: '#17130F',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.8), inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          />
          <button
            type="button"
            onClick={() => handleConciergeSubmit(conciergePrompt)}
            style={{
              border: 'none',
              borderRadius: 18,
              padding: '15px 20px',
              background: '#1B3A6B',
              color: '#fff',
              fontSize: 13,
              fontWeight: 900,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              boxShadow: '0 14px 30px rgba(27,58,107,0.18)',
            }}
          >
            Find providers
          </button>
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {CONCIERGE_EXAMPLES.map(example => (
            <button
              key={example}
              type="button"
              onClick={() => handleConciergeSubmit(example)}
              style={{
                border: '1px solid rgba(27,58,107,0.10)',
                borderRadius: 999,
                padding: '9px 13px',
                background: 'rgba(255,255,255,0.82)',
                color: '#1B3A6B',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.7)',
              }}
            >
              {example}
            </button>
          ))}
        </div>

        <div style={{
          position: 'relative',
          marginTop: 20,
          borderRadius: 24,
          border: '1px solid rgba(27,58,107,0.10)',
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(12px)',
          padding: 18,
          boxShadow: '0 18px 50px rgba(27,58,107,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#112345', fontWeight: 800, fontSize: 13 }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: conciergeSearching ? '#C9A84C' : '#22C55E', boxShadow: conciergeSearching ? '0 0 0 6px rgba(201,168,76,0.16)' : '0 0 0 6px rgba(34,197,94,0.14)' }} />
              {conciergeSearching ? 'ASK is searching...' : conciergePrompt.trim() ? 'ASK is matching providers' : 'Try a question above'}
            </div>
            {conciergePrompt.trim() && (
              <div style={{ color: '#7A6E65', fontSize: 13, fontWeight: 500 }}>
                for “{conciergePromptLabel}”
              </div>
            )}
          </div>

          <div style={{ color: '#5F5A50', fontSize: 14, lineHeight: 1.65, marginBottom: conciergeMatches.length ? 14 : 0 }}>
            {conciergeSearching
              ? 'Tuning toward the best-fit category, service, and campus signals.'
              : conciergePrompt.trim()
                ? (conciergeMatches.length
                  ? `I found ${conciergeMatches.length} strong match${conciergeMatches.length !== 1 ? 'es' : ''}. The closest options are below.`
                  : 'No exact match yet. Try widening the request or changing the service words.')
                : 'Type a request like “Need a calculus tutor tonight” or tap one of the examples.'}
            {!conciergeSearching && conciergeAnswer ? ` ${conciergeAnswer}` : ''}
          </div>

          {conciergeMatches.length > 0 && (
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {conciergeMatches.map(provider => {
                const href = providerUrl(provider.name, provider.id, provider.username);
                return (
                  <Link
                    key={provider.user_id || provider.username || provider.id}
                    to={href}
                    onClick={() => trackEvent('concierge_result_clicked', {
                      prompt: conciergePrompt || conciergeSubmittedPrompt || '',
                      provider_id: provider.id,
                      provider_name: provider.name,
                      provider_category: provider.category,
                      provider_subcategory: provider.subcategory || provider.custom_category || '',
                    })}
                    style={{
                      textDecoration: 'none',
                      borderRadius: 18,
                      border: '1px solid rgba(27,58,107,0.10)',
                      background: '#fff',
                      padding: 14,
                      color: '#112345',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      boxShadow: '0 12px 28px rgba(27,58,107,0.06)',
                    }}
                  >
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: '#1B3A6B',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-display)',
                      fontSize: 17,
                      flexShrink: 0,
                    }}>
                      {initials(provider.name)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, lineHeight: 1.05, marginBottom: 4, color: '#112345' }}>
                        {provider.name}
                      </div>
                      <div style={{ color: '#7A6E65', fontSize: 12.5, lineHeight: 1.4 }}>
                        {(provider.merged_services?.[0] || provider.subcategory || provider.custom_category || 'Campus service')}
                      </div>
                      <div style={{ marginTop: 6, color: '#1B3A6B', fontSize: 13, fontWeight: 700 }}>
                        {provider.merged_min_price ? `$${provider.merged_min_price}` : 'Ask'}
                        <span style={{ color: '#7A6E65', fontWeight: 500 }}> per session</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BrowseReferralBanner user={user} />

      {/* ── Header row ── */}
      <div className="browse-header" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 18, flexWrap: 'wrap', gap: 14,
        borderBottom: '1px solid var(--border)', paddingBottom: 18,
      }}>
        <div>
          <div className="section-label" style={{ marginBottom: 7 }}>Marketplace</div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
            fontSize: 'clamp(36px, 7vw, 70px)', fontWeight: 760,
            color: 'var(--text)', lineHeight: 1.05,
            letterSpacing: 0,
          }}>
            Find the right person.
          </h1>
          {!loading && (
            <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 7, fontFamily: 'var(--font-ui)', fontWeight: 650 }}>
              {visibleProviders.length} provider{visibleProviders.length !== 1 ? 's' : ''}
              {providers.length !== visibleProviders.length ? ` across ${providers.length} listing${providers.length !== 1 ? 's' : ''}` : ''}
            </p>
          )}
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2 }}>
          {[
            { id: 'rating', label: 'Top rated' },
            { id: 'newest', label: 'Newest' },
            { id: 'price_asc', label: 'Price ↑' },
          ].map(s => (
            <button key={s.id} onClick={() => handleSort(s.id)} style={{
              padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 800,
              border: 'none',
              background: sort === s.id ? 'var(--text)' : 'transparent',
              color: sort === s.id ? '#fff' : 'var(--muted)',
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
              boxShadow: 'none',
              transition: 'all .12s',
            }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {sitewideSaleActive && (
        <div className="sale-ribbon" style={{
          position: 'relative',
          marginBottom: 18,
          borderRadius: 14,
          padding: '20px 22px',
          color: '#fff',
          boxShadow: '0 24px 60px rgba(124,58,237,0.32), 0 0 0 1px rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          overflow: 'hidden',
        }}>
          <div className="sale-aurora-bg" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 950, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.75, marginBottom: 4 }}>
              Campus sale — live now
            </div>
            <div className="sale-headline" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, lineHeight: 1.0, letterSpacing: '-0.5px' }}>
              15% off every listing
            </div>
          </div>
          <div style={{
            position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
          }}>
            <div className="sale-badge-pill" style={{
              fontSize: 13, fontWeight: 900,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 999, padding: '9px 16px',
              letterSpacing: '0.02em',
            }}>
              Applied at booking
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <form onSubmit={handleSearch} style={{
          display: 'flex', alignItems: 'center',
          background: '#fff',
          border: '1px solid rgba(23,19,15,0.14)',
          borderRadius: 8, height: 56, overflow: 'hidden',
          maxWidth: 720,
          boxShadow: '0 14px 38px rgba(23,19,15,0.07)',
        }}>
          <div style={{ padding: '0 0 0 16px', display: 'flex', alignItems: 'center', color: 'var(--muted)', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search tutors, barbers, fitness..."
            value={search}
            onChange={e => handleSearchInput(e.target.value)}
            style={{
              flex: 1, border: 'none', padding: '0 14px', height: '100%',
              fontSize: 15, outline: 'none', background: 'transparent',
              color: 'var(--text)', fontFamily: 'var(--font-ui)',
              fontWeight: 650,
            }}
          />
        </form>
      </div>

      {/* ── Session type filter ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'Any' },
          { id: 'in-person', label: 'In-person' },
          { id: 'zoom', label: 'Online' },
          { id: 'both', label: 'Both' },
        ].map(({ id, label }) => {
          const active = sessionType === id;
          return (
            <button key={id} onClick={() => handleSessionType(id)} style={{
              padding: '8px 13px', borderRadius: 8, fontSize: 13, fontWeight: active ? 800 : 700,
              border: `1px solid ${active ? 'var(--text)' : 'var(--gray-200)'}`,
              background: active ? 'var(--text)' : '#fff',
              color: active ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all .12s', fontFamily: 'var(--font-ui)',
              whiteSpace: 'nowrap',
            }}>
              {label}
            </button>
          );
        })}
      </div>

      {sessionType !== 'zoom' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', fontFamily: 'var(--font-ui)', marginRight: 2 }}>
            Campus
          </span>
          {[{ id: 'all', label: 'Any campus' }, ...CAMPUS_OPTIONS].map(({ id, label }) => {
            const active = campus === id;
            return (
              <button key={id} onClick={() => handleCampus(id)} style={{
                padding: '8px 13px', borderRadius: 8, fontSize: 13, fontWeight: active ? 800 : 700,
                border: `1px solid ${active ? 'var(--text)' : 'var(--gray-200)'}`,
                background: active ? 'var(--text)' : '#fff',
                color: active ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all .12s', fontFamily: 'var(--font-ui)',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Advanced filters ── */}
      <div className="card" style={{ padding: 14, marginBottom: 18, borderRadius: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'end' }}>
          <label style={filterLabel}>
            Min price
            <input type="number" min="0" placeholder="$0" value={minPrice} onChange={e => { setMinPrice(e.target.value); syncParams({ min_price: e.target.value }); }} style={filterInput} />
          </label>
          <label style={filterLabel}>
            Max price
            <input type="number" min="0" placeholder="Any" value={maxPrice} onChange={e => { setMaxPrice(e.target.value); syncParams({ max_price: e.target.value }); }} style={filterInput} />
          </label>
          <label style={filterLabel}>
            Rating
            <select value={minRating} onChange={e => { setMinRating(e.target.value); syncParams({ min_rating: e.target.value }); }} style={filterInput}>
              <option value="">Any rating</option>
              <option value="4.5">4.5+</option>
              <option value="4">4.0+</option>
              <option value="3">3.0+</option>
            </select>
          </label>
          <label style={filterLabel}>
            Availability
            <select value={availability} onChange={e => { setAvailability(e.target.value); syncParams({ availability: e.target.value }); }} style={filterInput}>
              <option value="all">Any</option>
              <option value="open">Open slots only</option>
            </select>
          </label>
        </div>
      </div>

      {/* ── Category filters ── */}
      <div style={{ marginBottom: subcats.length > 0 ? 12 : 28, overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
          {allFilters.map(({ id, label }) => {
            const active = category === id;
            return (
              <button key={id} onClick={() => handleCategory(id)} style={{
                padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 800,
                border: `1px solid ${active ? 'var(--text)' : 'var(--gray-200)'}`,
                background: active ? 'var(--text)' : '#fff',
                color: active ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all .12s',
                fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap',
              }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Subcategory pills ── */}
      {subcats.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
          {[{ id: 'all', label: 'All' }, ...subcats.map(s => ({ id: s, label: s }))].map(({ id, label }) => {
            const active = subcategory === id;
            return (
              <button key={id} onClick={() => handleSubcategory(id)} style={{
                padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: active ? 800 : 700,
                border: `1px solid ${active ? 'var(--text)' : 'var(--gray-200)'}`,
                background: active ? 'var(--text)' : 'transparent',
                color: active ? '#fff' : 'var(--muted)',
                cursor: 'pointer', transition: 'all .1s', fontFamily: 'var(--font-ui)',
              }}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        /* ── Aurora sale banner ─────────────────────────────── */
        @keyframes auroraShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes auroraPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.85; }
        }
        .sale-aurora-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(270deg,
            #7C3AED, #EC4899, #06B6D4, #10B981, #F59E0B, #EC4899, #7C3AED
          );
          background-size: 600% 600%;
          animation: auroraShift 7s ease infinite, auroraPulse 3.5s ease-in-out infinite;
          pointer-events: none;
        }
        .sale-headline {
          background: linear-gradient(135deg, #fff 0%, #FDE68A 50%, #fff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: saleHeadlineShimmer 2.4s linear infinite;
        }
        @keyframes saleHeadlineShimmer {
          from { background-position: 200% center; }
          to   { background-position: -200% center; }
        }
        /* ── Pricing control dots ─── */
        .pricing-dot-live {
          display: inline-block;
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 0 0 rgba(16,185,129,0.7);
          animation: pricingPingGreen 1.4s ease-out infinite;
          flex-shrink: 0;
        }
        .pricing-dot-surge {
          display: inline-block;
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #F97316;
          box-shadow: 0 0 0 0 rgba(249,115,22,0.7);
          animation: pricingPingOrange 1.4s ease-out infinite;
          flex-shrink: 0;
        }
        @keyframes pricingPingGreen {
          0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.7); }
          70%  { box-shadow: 0 0 0 7px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
        @keyframes pricingPingOrange {
          0%   { box-shadow: 0 0 0 0 rgba(249,115,22,0.7); }
          70%  { box-shadow: 0 0 0 7px rgba(249,115,22,0); }
          100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sale-aurora-bg { animation: none; }
          .sale-headline { animation: none; -webkit-text-fill-color: #fff; }
          .pricing-dot-live, .pricing-dot-surge { animation: none; }
        }
        @media (max-width: 560px) {
          .browse-header { align-items: flex-start; flex-direction: column; gap: 10px; }
          .browse-header > div:last-child { align-self: flex-start; }
        }
      `}</style>

      {/* ── Results ── */}
      {loading ? (
        <div className="provider-grid">
          {[...Array(6)].map((_, i) => (
            <TutorCardSkeleton key={i} />
          ))}
        </div>
      ) : visibleProviders.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '64px 20px',
          border: '1px solid var(--border)',
          borderRadius: 12,
          background: '#fff',
          boxShadow: '0 16px 45px rgba(23,19,15,0.06)',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 999,
            margin: '0 auto 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#FFF7ED',
            color: '#C2410C',
            fontSize: 20,
            fontWeight: 900,
          }}>
            ?
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto', fontSize: 30, fontWeight: 760, color: 'var(--text)', marginBottom: 8 }}>
            {emptyTitle}
          </div>
          <div style={{ fontSize: 15, color: 'var(--muted)', fontFamily: 'var(--font-ui)', maxWidth: 460, margin: '0 auto 20px', lineHeight: 1.5 }}>
            {emptyCopy}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {campus !== 'all' && (
              <button type="button" onClick={() => handleCampus('all')} style={emptyActionButton}>
                Any campus
              </button>
            )}
            {campus !== 'WILF' && sessionType !== 'zoom' && (
              <button type="button" onClick={() => handleCampus('WILF')} style={emptyActionButton}>
                WILF
              </button>
            )}
            {sessionType !== 'zoom' && (
              <button type="button" onClick={() => handleSessionType('zoom')} style={emptyActionButton}>
                Online
              </button>
            )}
            <button type="button" onClick={() => {
              setCategory('all');
              setSubcategory('all');
              setMinPrice('');
              setMaxPrice('');
              setMinRating('');
              setAvailability('all');
              setCampus('all');
              syncParams({
                category: 'all',
                subcategory: 'all',
                min_price: '',
                max_price: '',
                min_rating: '',
                availability: 'all',
                campus: 'all',
              });
            }} style={{ ...emptyActionButton, background: 'var(--text)', color: '#fff', borderColor: 'var(--text)' }}>
              Reset filters
            </button>
          </div>
        </div>
      ) : (
        <div className="provider-grid">
          {visibleProviders.map(p => (
            <ProviderCard
              key={p.user_id || p.id}
              provider={p}
              isOwn={!!user && user.id === p.user_id}
              isAdmin={!!user?.is_admin}
              saved={savedIds.has(p.id)}
              onSavedChange={handleSavedChange}
              onTagClick={handleTagClick}
              onDelete={user && user.id === p.user_id ? () => handleDeleteOwn(p.id) : undefined}
              onEdit={
                user?.is_admin
                  ? () => openEdit(p.id, true)
                  : user && user.id === p.user_id
                    ? () => openEdit(p.id, false)
                    : undefined
              }
            />
          ))}
        </div>
      )}

      <FAQAccordion
        title="Tutor search FAQ"
        schemaId="browse-faq-schema"
        faqs={[
          ['How do I find the right tutor?', 'Use subject, price, rating, format, and availability filters to narrow the marketplace, then open profiles to compare schedule and reviews.'],
          ['Can I message before booking?', 'Yes. Open a tutor profile and message them before requesting a session.'],
          ['Can I book online sessions?', 'Yes. Use the Online filter to find tutors who offer Zoom or remote sessions.'],
          ['Why do no tutors match my filters?', 'Some filters can be restrictive together. Try widening price or switching availability to any.'],
          ['Can I save tutors for later?', 'Yes. Tap the heart on a card or profile to save tutors, then open Saved from your account.'],
        ]}
      />

      {/* Edit listing modal */}
      {editModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
        }} onClick={e => { if (e.target === e.currentTarget) setEditModal(null); }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, padding: '28px 28px 24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Edit Listing</div>
              <button onClick={() => setEditModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', padding: 4 }}>✕</button>
            </div>
            <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Category</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {EDIT_CATEGORIES.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => setEditModal(m => ({ ...m, form: { ...m.form, category: c.id, subcategory: '', custom_category: '' } }))}
                      style={{
                        padding: '5px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                        fontFamily: 'var(--font-ui)', border: '1.5px solid',
                        borderColor: editModal.form.category === c.id ? 'var(--primary)' : 'var(--border)',
                        background: editModal.form.category === c.id ? 'var(--accent)' : '#fff',
                        color: editModal.form.category === c.id ? 'var(--primary)' : 'var(--text)',
                      }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {editModal.form.category === 'other' && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Service name</label>
                  <input value={editModal.form.custom_category}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, custom_category: e.target.value } }))}
                    placeholder="e.g. Photography, Golf Lessons…"
                    spellCheck="true"
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
                  />
                  <TextSuggestion value={editModal.form.custom_category} onApply={value => setEditModal(m => ({ ...m, form: { ...m.form, custom_category: value } }))} />
                </div>
              )}

              {EDIT_SUBCATS[editModal.form.category] && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>
                    {{ tutor: 'Subject', languages: 'Language', music: 'Instrument', fitness: 'Sport', torah: 'Topic' }[editModal.form.category]}
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                    {EDIT_SUBCATS[editModal.form.category].map(s => (
                      <button key={s} type="button"
                        onClick={() => setEditModal(m => ({ ...m, form: { ...m.form, subcategory: m.form.subcategory === s ? '' : s } }))}
                        style={{
                          padding: '3px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                          fontFamily: 'var(--font-ui)', border: '1.5px solid',
                          borderColor: editModal.form.subcategory === s ? 'var(--primary)' : 'var(--border)',
                          background: editModal.form.subcategory === s ? 'var(--accent)' : '#fff',
                          color: editModal.form.subcategory === s ? 'var(--primary)' : 'var(--text)',
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <input value={editModal.form.subcategory}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, subcategory: e.target.value } }))}
                    placeholder="Or type your own…"
                    spellCheck="true"
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
                  />
                  <TextSuggestion value={editModal.form.subcategory} onApply={value => setEditModal(m => ({ ...m, form: { ...m.form, subcategory: value } }))} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Description</label>
                <textarea value={editModal.form.bio}
                  onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, bio: e.target.value } }))}
                  rows={4} required
                  spellCheck="true"
                  style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <TextSuggestion value={editModal.form.bio} onApply={value => setEditModal(m => ({ ...m, form: { ...m.form, bio: value } }))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Price / session ($)</label>
                  <input type="number" min="0" max="10000" value={editModal.form.price_per_session}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, price_per_session: e.target.value } }))}
                    placeholder="0"
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Session type</label>
                  <select value={editModal.form.session_type}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, session_type: e.target.value, campus: e.target.value === 'zoom' ? 'WILF' : (m.form.campus || 'WILF') } }))}
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', background: '#fff', boxSizing: 'border-box' }}>
                    <option value="in-person">In-person</option>
                    <option value="zoom">Zoom</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              {editModal.form.session_type !== 'zoom' && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Campus</label>
                  <select value={editModal.form.campus || 'WILF'}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, campus: e.target.value } }))}
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', background: '#fff', boxSizing: 'border-box' }}>
                    {CAMPUS_OPTIONS.map(({ id, label }) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Zelle</label>
                  <input value={editModal.form.zelle}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, zelle: e.target.value } }))}
                    placeholder="Phone or email"
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Venmo</label>
                  <input value={editModal.form.venmo}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, venmo: e.target.value } }))}
                    placeholder="@handle"
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {editError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: '#DC2626' }}>
                  {editError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setEditModal(null)} style={{
                  border: '1.5px solid var(--border)', background: 'none', color: 'var(--muted)',
                  borderRadius: 999, padding: '9px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                }}>
                  Cancel
                </button>
                <button type="submit" disabled={editLoading} style={{
                  background: editLoading ? '#93C5FD' : 'var(--primary)', color: '#fff', border: 'none',
                  borderRadius: 999, padding: '9px 24px', fontSize: 13, fontWeight: 600,
                  cursor: editLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)',
                }}>
                  {editLoading ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const filterLabel = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 11,
  fontWeight: 800,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const filterInput = {
  height: 38,
  border: '1.5px solid var(--border)',
  borderRadius: 10,
  background: '#fff',
  color: 'var(--text)',
  padding: '0 10px',
  fontSize: 13,
  fontFamily: 'var(--font-ui)',
  outline: 'none',
  textTransform: 'none',
  letterSpacing: 0,
  fontWeight: 600,
};

const emptyActionButton = {
  border: '1px solid var(--border)',
  background: '#fff',
  color: 'var(--text)',
  borderRadius: 999,
  padding: '9px 14px',
  fontSize: 13,
  fontWeight: 850,
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
};
