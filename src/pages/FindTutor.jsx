import { useState } from 'react';
import api from '../api';
import ProviderCard from '../components/ProviderCard';
import { TutorCardSkeleton } from '../components/Skeletons';
import { trackEvent } from '../lib/analytics';

const SUBJECTS = ['Accounting', 'Finance', 'Economics', 'Math', 'Calculus', 'Statistics', 'Biology', 'Chemistry', 'Physics', 'Computer Science', 'Writing', 'History'];

export default function FindTutor() {
  const [form, setForm] = useState({
    subject: 'Finance',
    course: '',
    urgency: 'this week',
    budget: '100',
    mode: 'all',
    style: 'patient and practical',
  });
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [searched, setSearched] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    trackEvent('ai_match_started', { subject: form.subject, urgency: form.urgency, mode: form.mode });
    try {
      const params = {
        category: 'tutor',
        search: form.course || form.subject,
        max_price: form.budget,
        session_type: form.mode === 'online' ? 'zoom' : form.mode === 'in-person' ? 'in-person' : 'all',
        sort: 'rating',
      };
      let { data } = await api.get('/providers', { params });
      if (!data?.length) {
        ({ data } = await api.get('/providers', { params: { category: 'tutor', search: form.subject, max_price: form.budget, sort: 'rating' } }));
      }
      const ranked = (data || []).map(provider => ({
        ...provider,
        matchScore:
          (provider.trust?.average_review_rating || provider.rating || 0) * 10 +
          (provider.trust?.response_rate || 0) / 4 +
          ((provider.subcategory || '').toLowerCase().includes(form.subject.toLowerCase()) ? 20 : 0),
      })).sort((a, b) => b.matchScore - a.matchScore).slice(0, 6);
      setMatches(ranked);
      trackEvent('ai_match_completed', { subject: form.subject, result_count: ranked.length });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 1120 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 22, alignItems: 'start' }}>
        <div className="card" style={{ padding: 24, borderRadius: 18, position: 'sticky', top: 84 }}>
          <div className="section-label">Instructor matching</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, lineHeight: 1, marginTop: 8 }}>Find the right instructor</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: '10px 0 18px' }}>
            Tell Ask what class you are stuck on and we will rank instructors by subject fit, ratings, availability, price, and response signals.
          </p>
          <form onSubmit={submit} style={{ display: 'grid', gap: 11 }}>
            <Field label="Subject">
              <input list="subjects" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} style={input} />
              <datalist id="subjects">{SUBJECTS.map(s => <option key={s} value={s} />)}</datalist>
            </Field>
            <Field label="Class or topic">
              <input value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))} placeholder="e.g. FIN 101, organic chem, Excel" style={input} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Budget">
                <input type="number" min="0" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} style={input} />
              </Field>
              <Field label="Urgency">
                <select value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))} style={input}>
                  <option>today</option>
                  <option>this week</option>
                  <option>before an exam</option>
                  <option>ongoing</option>
                </select>
              </Field>
            </div>
            <Field label="Mode">
              <select value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))} style={input}>
                <option value="all">Online or in-person</option>
                <option value="online">Online</option>
                <option value="in-person">In-person</option>
              </select>
            </Field>
            <Field label="Learning style">
              <input value={form.style} onChange={e => setForm(f => ({ ...f, style: e.target.value }))} style={input} />
            </Field>
            <button disabled={loading} style={{ border: 'none', borderRadius: 999, padding: '12px 18px', background: 'var(--text)', color: '#fff', fontWeight: 900, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Matching...' : 'Find instructors'}
            </button>
          </form>
        </div>

        <div>
          {loading ? (
            <div className="grid-cards">{Array.from({ length: 4 }).map((_, i) => <TutorCardSkeleton key={i} />)}</div>
          ) : matches.length > 0 ? (
            <>
              <div className="card" style={{ padding: 18, marginBottom: 14, borderRadius: 16 }}>
                <strong>Why these instructors?</strong>
                <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, marginTop: 5 }}>
                  Ranked for {form.subject}, within about ${form.budget}, with stronger trust signals and relevant specialties first.
                </p>
              </div>
              <div className="grid-cards">{matches.map(p => <ProviderCard key={p.id} provider={p} />)}</div>
            </>
          ) : searched ? (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>No exact matches yet</h2>
              <p style={{ color: 'var(--muted)', marginTop: 8 }}>Try a broader subject or higher budget. We also recommend browsing all instructors.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 48 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30 }}>Recommendations will show here</h2>
              <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginTop: 8 }}>This flow is lightweight and explainable for now, using your filters plus marketplace trust data.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <label style={{ display: 'grid', gap: 5, fontSize: 11, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}{children}</label>;
}

const input = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  fontFamily: 'var(--font-ui)',
  background: '#fff',
};
