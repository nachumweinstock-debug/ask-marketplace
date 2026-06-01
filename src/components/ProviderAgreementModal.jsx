import { useState } from 'react';

export const PROVIDER_TERMS_VERSION = '2026-06-01';

const SECTIONS = [
  {
    title: '1. Independent Contractor',
    body: 'By listing services on ASK Marketplace you confirm that you operate as an independent contractor — not an employee, agent, or representative of ASK. You set your own hours, prices, and methods. ASK is a platform that connects you with clients, nothing more.',
  },
  {
    title: '2. Eligibility',
    body: 'You must be an enrolled student, faculty member, or staff at an affiliated institution to maintain an active listing. If you graduate, transfer, or otherwise lose affiliation you must remove your listing within 30 days.',
  },
  {
    title: '3. Accurate Listings',
    body: 'Your listing must truthfully describe your services, qualifications, and pricing. Misleading descriptions, inflated credentials, or deceptive pricing will result in immediate removal without warning.',
  },
  {
    title: '4. Service Quality & Professionalism',
    body: 'You agree to: show up on time for every confirmed booking; deliver services as described; respond to client messages within 24 hours; maintain a respectful and professional demeanor at all times; and cancel bookings with at least 24 hours\' notice except in genuine emergencies.',
  },
  {
    title: '5. No-Show Policy',
    body: 'Failing to appear for a confirmed booking without prior cancellation is a serious violation. First offence results in a warning. Repeat offences will result in listing suspension or permanent removal.',
  },
  {
    title: '6. Payment & Fees',
    body: 'ASK charges zero commission. You collect payment directly from clients via Zelle, Venmo, or another agreed method. All payment disputes are between you and your client — ASK has no obligation to mediate or compensate either party.',
  },
  {
    title: '7. Taxes',
    body: 'You are solely responsible for reporting and paying all applicable federal, state, and local taxes on income earned through this platform. ASK does not withhold taxes or issue tax forms. Consult a qualified tax professional about your specific obligations.',
  },
  {
    title: '8. Prohibited Services',
    body: 'You may not offer: (a) services that are illegal under any applicable law; (b) academic dishonesty services including writing papers, taking tests, or producing work meant to be submitted as a client\'s own; (c) services involving alcohol, controlled substances, weapons, or age-restricted content; (d) anything that violates your institution\'s student conduct policies.',
  },
  {
    title: '9. Prohibited Conduct',
    body: 'You may not: solicit or post fake reviews; contact clients outside the platform to circumvent our booking system; discriminate against clients on any protected basis; harass, threaten, or demean users; impersonate another person; or misrepresent your qualifications or experience.',
  },
  {
    title: '10. Content License',
    body: 'You grant ASK a non-exclusive, royalty-free, worldwide license to display your listing text, images, and profile information on the platform and in related marketing. You retain ownership of your content.',
  },
  {
    title: '11. Suspension & Removal',
    body: 'ASK may suspend or permanently remove your listing at any time for violations of these terms, excessive negative reviews, or conduct that harms the community. Where possible we will warn you first, but reserve the right to act immediately in serious cases.',
  },
  {
    title: '12. Limitation of Liability',
    body: 'ASK connects providers with clients but is not responsible for: disputes between providers and clients; quality or outcome of services; payment failures; personal injury or property damage arising from services rendered. Our total liability to you under any circumstances is limited to fees paid to us in the preceding 12 months — which is $0, since we charge none.',
  },
  {
    title: '13. Governing Law',
    body: 'This agreement is governed by the laws of New York State. Any dispute not resolved through our support team shall be submitted to binding arbitration in New York County, NY.',
  },
  {
    title: '14. Updates',
    body: 'We may update these terms as the platform evolves. When we do, we will notify you by email and require your re-acceptance before you can publish a new listing. Continuing to use existing listings after notice constitutes acceptance.',
  },
];

export default function ProviderAgreementModal({ onAccept, onCancel, loading }) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [checked, setChecked] = useState(false);

  function handleScroll(e) {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop - clientHeight < 40) setScrolledToBottom(true);
  }

  const canAccept = scrolledToBottom && checked;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(17,13,10,0.6)',
      backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 620, maxHeight: '90vh',
        background: '#fff', borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 28px 18px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: '#F15A24',
            fontFamily: 'var(--font-ui)', marginBottom: 8,
          }}>
            Before you post a listing
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 26, margin: 0, lineHeight: 1.1,
          }}>
            Provider Service Agreement
          </h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '8px 0 0', lineHeight: 1.5 }}>
            Read through the full agreement below. You must scroll to the bottom and check the box before you can post your listing.
          </p>
        </div>

        {/* Scrollable body */}
        <div
          onScroll={handleScroll}
          style={{
            flex: 1, overflowY: 'auto', padding: '24px 28px',
            display: 'flex', flexDirection: 'column', gap: 20,
          }}
        >
          <div style={{
            background: '#FFF1E8', border: '1px solid #F5D4BE',
            borderRadius: 12, padding: '14px 16px',
            fontSize: 13, color: '#5F5A50', lineHeight: 1.6,
          }}>
            <strong>ASK Marketplace — Provider Service Agreement</strong><br />
            Version: {PROVIDER_TERMS_VERSION} · Effective immediately upon acceptance
          </div>

          {SECTIONS.map((s, i) => (
            <div key={i}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#17130F',
                marginBottom: 6, fontFamily: 'var(--font-ui)',
              }}>
                {s.title}
              </div>
              <p style={{ fontSize: 13, color: '#5F5A50', margin: 0, lineHeight: 1.7 }}>
                {s.body}
              </p>
            </div>
          ))}

          {/* Scroll indicator */}
          {!scrolledToBottom && (
            <div style={{
              textAlign: 'center', fontSize: 12, color: 'var(--muted)',
              padding: '8px 0', fontStyle: 'italic',
            }}>
              ↓ Scroll to the bottom to continue
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '18px 28px 22px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
          background: '#FAFAF9',
        }}>
          {/* Checkbox */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            cursor: scrolledToBottom ? 'pointer' : 'not-allowed',
            marginBottom: 16, opacity: scrolledToBottom ? 1 : 0.45,
          }}>
            <input
              type="checkbox"
              checked={checked}
              disabled={!scrolledToBottom}
              onChange={e => setChecked(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, accentColor: '#F15A24', flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: '#17130F', lineHeight: 1.5 }}>
              I have read and agree to the ASK Marketplace Provider Service Agreement (version {PROVIDER_TERMS_VERSION}). I understand I am an independent contractor and am solely responsible for the services I provide.
            </span>
          </label>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1, padding: '12px 20px', borderRadius: 10,
                background: 'none', border: '1.5px solid var(--border)',
                fontSize: 14, fontWeight: 600, color: 'var(--muted)',
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
                touchAction: 'manipulation',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={!canAccept || loading}
              style={{
                flex: 2, padding: '12px 20px', borderRadius: 10,
                background: canAccept ? '#F15A24' : '#E8E3DA',
                color: canAccept ? '#fff' : '#A09890',
                border: 'none', cursor: canAccept ? 'pointer' : 'not-allowed',
                fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-ui)',
                transition: 'background .2s, color .2s',
                touchAction: 'manipulation',
              }}
            >
              {loading ? 'Saving…' : 'I agree — post my listing'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
