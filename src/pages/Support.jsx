import { useEffect } from 'react';
import SupportChat, { PROMPTS, SHORTCUTS } from '../components/SupportChat';
import FAQAccordion from '../components/FAQAccordion';

export default function Support() {
  useEffect(() => {
    document.title = 'Support | Ask Marketplace';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'Get help from Ask Marketplace support for instruction, bookings, payments, instructor accounts, and technical issues.');
  }, []);

  return (
    <div className="page" style={{ maxWidth: 1040 }}>
      <div style={{ marginBottom: 26 }}>
        <div className="section-label" style={{ marginBottom: 10 }}>Support</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(42px, 8vw, 78px)', lineHeight: 0.95, color: 'var(--text)', marginBottom: 14 }}>
          Ask Support
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 18, maxWidth: 680, lineHeight: 1.55 }}>
          Get instant help with bookings, instructors, payments, accounts, and technical issues.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.8fr) minmax(320px, 1.2fr)', gap: 22, alignItems: 'start' }} className="support-page-grid">
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 10 }}>What do you need?</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
            Pick a shortcut or type your issue directly. If the bot cannot solve it, admins can review the conversation.
          </p>
          <div style={{ display: 'grid', gap: 9 }}>
            {SHORTCUTS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('ask-support-prefill', { detail: PROMPTS[label] }))}
                style={{
                  textAlign: 'left',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  background: '#fff',
                  padding: '12px 14px',
                  color: 'var(--text)',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <SupportChat />
      </div>
      <FAQAccordion
        title="Support FAQ"
        schemaId="support-faq-schema"
        faqs={[
          ['How fast does support respond?', 'The support bot answers immediately after a short typing delay. Admins can review conversations that need human help.'],
          ['Can support help with bookings?', 'Yes. Include the tutor name, date, time, and booking status so support can understand the issue.'],
          ['Can support help with refunds?', 'Yes. Payment or refund issues are marked for admin review because they usually need details from both sides.'],
          ['Can I report a technical problem?', 'Yes. Tell us the page, action, device, and any error message so we can reproduce it.'],
          ['Do I need an account to ask support?', 'No. You can start a support conversation without logging in, but adding your email helps admins follow up.'],
        ]}
      />
    </div>
  );
}
