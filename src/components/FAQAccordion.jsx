import { useEffect, useMemo, useState } from 'react';

export const DEFAULT_FAQS = [
  ['How does Ask Marketplace work?', 'Browse instructors and services, filter by subject or category, open a profile, choose a time, and send a booking request.'],
  ['How do I become an instructor?', 'Create an account, post a listing, add your subjects, pricing, session type, and availability, then respond when students book or message you.'],
  ['How do I choose the right instructor?', 'Ask shows trust signals like reviews, completed sessions, response rate, repeat bookings, and profile details so students can choose confidently.'],
  ['Can I book online sessions?', 'Yes. Use the Online filter or look for the online session badge on instructor cards and profiles.'],
  ['What happens if I cancel?', 'Cancel as early as possible and message the instructor. Refunds or payment issues depend on the timing, provider policy, and payment method.'],
];

export default function FAQAccordion({ title = 'Questions students ask', faqs = DEFAULT_FAQS, schemaId }) {
  const [open, setOpen] = useState(0);
  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }), [faqs]);

  useEffect(() => {
    if (!schemaId || typeof document === 'undefined') return;
    let script = document.getElementById(schemaId);
    if (!script) {
      script = document.createElement('script');
      script.id = schemaId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);
    return () => script?.remove();
  }, [jsonLd, schemaId]);

  return (
    <section style={{ marginTop: 48 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 4vw, 38px)', color: 'var(--text)', marginBottom: 16 }}>
        {title}
      </h2>
      <div className="card" style={{ padding: '0 24px', borderRadius: 14 }}>
        {faqs.map(([question, answer], i) => (
          <div key={question} itemScope itemProp="mainEntity" itemType="https://schema.org/Question" style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              style={{ width: '100%', padding: '19px 0', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, textAlign: 'left', fontFamily: 'var(--font-ui)' }}
            >
              <span itemProp="name" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', lineHeight: 1.4 }}>{question}</span>
              <span style={{ width: 25, height: 25, borderRadius: '50%', display: 'grid', placeItems: 'center', background: open === i ? 'var(--text)' : 'var(--gray-100)', color: open === i ? '#fff' : 'var(--text)', flexShrink: 0 }}>{open === i ? '-' : '+'}</span>
            </button>
            {open === i && (
              <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer" style={{ padding: '0 0 20px' }}>
                <p itemProp="text" style={{ margin: 0, fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
