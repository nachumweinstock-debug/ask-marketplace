import { Link } from 'react-router-dom';

export const LEGAL_LAST_UPDATED = 'May 2, 2026';
export const TERMS_VERSION = '2026-05-02';
export const PRIVACY_VERSION = '2026-05-02';

const pages = {
  terms: {
    title: 'Terms of Service',
    description: 'The rules for using Ask Marketplace as a student, instructor, or visitor.',
    sections: [
      ['Acceptance of terms', 'By creating an account, browsing listings, posting a listing, booking an instructor or service, or otherwise using Ask Marketplace, you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the platform.'],
      ['What Ask Marketplace does', 'Ask Marketplace helps students find instructors and other services, review listings, message providers, and request or coordinate sessions. We provide the marketplace tools; instructors, providers, and students are responsible for their own conduct and arrangements.'],
      ['Student accounts', 'Students must provide accurate account information, keep login credentials secure, and use the platform only for lawful, respectful, and academically honest purposes.'],
      ['Instructor accounts', 'Instructors must describe their services truthfully, keep availability current, honor confirmed sessions, and communicate clearly with students. Instructors are responsible for any qualifications, pricing, tax, payment, and scheduling information they provide.'],
      ['Instructor responsibility and independence', 'Instructors are independent users of the platform. Ask Marketplace does not employ instructors, supervise sessions, or guarantee any instructor’s credentials, conduct, availability, or results.'],
      ['Bookings', 'Booking requests may be pending, confirmed, completed, or cancelled. A booking is not final until accepted or confirmed through the platform or by clear communication between the student and provider.'],
      ['Payments', 'Unless a specific in-platform payment feature is provided, payments are handled directly between students and providers. Users are responsible for confirming price, payment method, and timing before a session.'],
      ['Cancellations and refunds', 'Cancellation, rescheduling, and refund outcomes depend on the timing, provider policy, and facts of the situation. Ask Marketplace may review disputes, but direct payments may need to be resolved between the student, provider, and payment provider.'],
      ['Prohibited conduct', 'You may not harass users, impersonate others, create fake accounts, submit fraudulent listings, scrape the platform, interfere with security, spam users, or use Ask Marketplace for illegal activity.'],
      ['Academic integrity', 'Ask Marketplace is for tutoring, studying, explanation, and academic support. Users may not request or provide cheating, plagiarism, exam answers, unauthorized assignment completion, or any service that violates a school policy.'],
      ['No guarantee of grades or outcomes', 'We do not guarantee grades, admissions results, test scores, course outcomes, instructor availability, or any particular academic or financial result.'],
      ['Platform availability', 'We work to keep Ask Marketplace available, but we may update, pause, restrict, or discontinue parts of the platform at any time. Bugs, downtime, and third-party service issues may occur.'],
      ['Account suspension/removal', 'We may suspend, restrict, or remove accounts, listings, messages, or content if we believe there is misuse, fraud, safety risk, policy violation, or legal exposure.'],
      ['Limitation of liability', 'To the maximum extent allowed by law, Ask Marketplace is not liable for indirect, incidental, special, consequential, or punitive damages, or for disputes between students and providers.'],
      ['Dispute resolution', 'If a dispute arises, contact support first so we can try to help. Any legal dispute will be handled under applicable law and venue rules unless a required consumer protection rule says otherwise.'],
      ['Changes to terms', 'We may update these terms as the marketplace grows. The Last updated date shows when the page changed. Continued use after changes means you accept the updated terms.'],
      ['Contact', 'Questions about these terms can be sent to support@uask.live.'],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    description: 'How Ask Marketplace collects, uses, stores, and protects information.',
    sections: [
      ['Information we collect', 'We collect information you provide directly, information created through marketplace activity, and limited technical information needed to run, secure, and improve the platform.'],
      ['Account information', 'Account information may include name, email, password hash, phone number, university, username, role, profile details, and account settings.'],
      ['Instructor profile information', 'Instructor profile information may include bio, subjects, courses, pricing, availability, profile images, payment handles, reviews, and listing details.'],
      ['Booking and session information', 'We process booking requests, availability, session status, messages, timestamps, and related support context so students and providers can coordinate.'],
      ['Payment information', 'Ask Marketplace generally does not process direct payment details unless an in-platform payment feature is added. Users may share payment handles such as Venmo or Zelle for coordination.'],
      ['Support messages', 'If you contact support or use the support chat, we store conversation messages, email if provided, status, topic, and related account identifiers so admins can help.'],
      ['Device, analytics, and cookie data', 'We collect privacy-conscious analytics such as page views, event names, referrers, UTM parameters, browser/device type, session identifiers, and approximate region if available from infrastructure.'],
      ['How we use information', 'We use information to create accounts, show profiles, process bookings, send notifications, provide support, improve search and SEO pages, prevent abuse, debug issues, and operate the marketplace.'],
      ['Who we share information with', 'We share information only as needed to operate the platform, show marketplace activity to relevant users, use service providers, comply with law, protect safety, or with your direction.'],
      ['Payment processors', 'If payment integrations are added, payment processors may receive transaction information according to their own terms and privacy policies.'],
      ['Service providers', 'We may use hosting, email, SMS, analytics, database, authentication, and operational vendors that process information for Ask Marketplace.'],
      ['Legal or safety reasons', 'We may disclose information if required by law, to protect users, investigate fraud or security issues, enforce policies, or respond to valid legal requests.'],
      ['Data retention', 'We keep information while your account is active and as needed for platform operations, support, security, legal compliance, backups, and legitimate business records.'],
      ['Security', 'We use practical safeguards such as authentication, password hashing, access controls, and operational monitoring. No online service can guarantee perfect security.'],
      ['User privacy choices', 'You can update account details, limit optional profile information, manage cookies in your browser, and contact support for account or privacy requests.'],
      ['Student and provider rights', 'Depending on applicable law, you may have rights to access, correct, delete, or receive a copy of certain personal information. Contact support to make a request.'],
      ['Children/minors note', 'Ask Marketplace is intended for college and university users. Minors should use the platform only with appropriate permission and in compliance with applicable rules.'],
      ['Contact', 'Privacy questions can be sent to support@uask.live.'],
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    description: 'How Ask Marketplace uses cookies and similar local storage.',
    sections: [
      ['Essential cookies', 'Essential cookies and local storage help keep the site working, maintain secure sessions, remember cookie acknowledgement, and support core navigation.'],
      ['Analytics cookies', 'Analytics identifiers help us understand traffic, page performance, search behavior, and conversion flows without collecting passwords or sensitive form fields.'],
      ['Authentication/session cookies', 'Authentication tokens or session data keep you logged in and allow the app to show the correct student, provider, or admin experience.'],
      ['Preference cookies', 'Preference storage may remember UI choices, dismissed banners, and non-sensitive settings so the app feels consistent when you return.'],
      ['Managing cookies', 'You can block, delete, or limit cookies in your browser settings. Some platform features may not work correctly if essential cookies or storage are disabled.'],
    ],
  },
  refunds: {
    title: 'Refund and Cancellation Policy',
    description: 'How cancellations, rescheduling, no-shows, and refund reviews work.',
    sections: [
      ['Cancellation window', 'Students and providers should cancel as early as possible. If a provider posts or communicates a cancellation policy, users should review it before booking.'],
      ['Rescheduling', 'If timing no longer works, message the other person through Ask Marketplace and propose a new time. Rescheduling is usually the cleanest outcome when both sides agree.'],
      ['No-shows', 'If a student or provider does not show up, document what happened in messages and contact support with the booking, time, and relevant details.'],
      ['Instructor cancellations', 'If an instructor cancels, they should notify the student promptly and help reschedule when possible. Repeated unreliable behavior may affect listing visibility or account standing.'],
      ['Refund review process', 'For payment disputes, send support the provider name, booking date and time, amount, payment method, screenshots if relevant, and what outcome you are requesting.'],
      ['Payment processing timing', 'Direct payments through Venmo, Zelle, cash, or other external services may be subject to that provider’s timing and rules. Ask Marketplace may not be able to reverse external payments directly.'],
      ['Contact support', 'For refund or cancellation help, contact support@uask.live or use the Ask Support chat.'],
    ],
  },
  guidelines: {
    title: 'Community Guidelines',
    description: 'The behavior standards for students, instructors, providers, and marketplace users.',
    sections: [
      ['Respectful communication', 'Be direct, respectful, and clear. Treat students, providers, and admins like real people trying to coordinate quickly.'],
      ['No harassment', 'Harassment, threats, hate, sexual pressure, stalking, bullying, or abusive messages are not allowed.'],
      ['No cheating or academic dishonesty', 'Do not request or provide exam answers, plagiarism, unauthorized assignment completion, or any conduct that violates academic rules.'],
      ['No off-platform payment circumvention', 'Do not use Ask Marketplace to mislead users, dodge agreed terms, or pressure people into unsafe or deceptive payment arrangements.'],
      ['No fraud, fake accounts, or impersonation', 'Do not create fake accounts, impersonate students or providers, post false credentials, manipulate reviews, or misrepresent services.'],
      ['Instructor professionalism', 'Instructors should be prepared, punctual, honest about skill level, transparent about price, and responsive about availability and cancellations.'],
      ['Student responsibility', 'Students should share accurate needs, show up on time, communicate changes, and use tutoring as learning support rather than replacement work.'],
      ['Reporting violations', 'Report problems through support with usernames, listing links, booking details, screenshots if helpful, and a clear description of what happened.'],
      ['Enforcement actions', 'Ask Marketplace may warn, restrict, suspend, remove listings, close accounts, or take other action when guidelines are violated.'],
    ],
  },
};

const legalLinks = [
  ['/terms', 'Terms of Service'],
  ['/privacy', 'Privacy Policy'],
  ['/cookies', 'Cookie Policy'],
  ['/refund-policy', 'Refund and Cancellation Policy'],
  ['/community-guidelines', 'Community Guidelines'],
  ['/support', 'Support'],
];

function setMeta(title, description) {
  if (typeof document === 'undefined') return;
  document.title = `${title} | Ask Marketplace`;
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', description);
}

function LegalShell({ children, kicker = 'Legal' }) {
  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '54px 20px 96px' }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
          {kicker}
        </div>
        {children}
      </div>
    </div>
  );
}

function Section({ title, body }) {
  return (
    <section style={{ padding: '22px 0', borderTop: '1px solid var(--border)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 3vw, 30px)', lineHeight: 1.12, color: 'var(--text)', marginBottom: 10 }}>
        {title}
      </h2>
      <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text-secondary)', maxWidth: 760 }}>
        {body}
      </p>
    </section>
  );
}

export function LegalDocument({ type }) {
  const page = pages[type];
  setMeta(page.title, page.description);

  return (
    <LegalShell>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(42px, 8vw, 76px)', lineHeight: 0.96, color: 'var(--text)', marginBottom: 14 }}>
        {page.title}
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--muted)', maxWidth: 720, marginBottom: 14 }}>
        {page.description}
      </p>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 34 }}>
        Last updated: <strong style={{ color: 'var(--text)' }}>{LEGAL_LAST_UPDATED}</strong>
      </p>
      <div className="card" style={{ padding: '10px 28px', borderRadius: 12 }}>
        {page.sections.map(([title, body]) => (
          <Section key={title} title={title} body={body} />
        ))}
      </div>
    </LegalShell>
  );
}

export function LegalHub() {
  setMeta('Legal', 'Ask Marketplace legal policies, privacy information, refund rules, community guidelines, and support.');

  return (
    <LegalShell kicker="Ask Marketplace">
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(44px, 8vw, 82px)', lineHeight: 0.96, color: 'var(--text)', marginBottom: 14 }}>
        Legal
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--muted)', maxWidth: 720, marginBottom: 12 }}>
        Native Ask Marketplace policies for students, instructors, bookings, support, privacy, cookies, and community standards.
      </p>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 34 }}>
        Last updated: <strong style={{ color: 'var(--text)' }}>{LEGAL_LAST_UPDATED}</strong>
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
        {legalLinks.map(([to, label]) => (
          <Link key={to} to={to} className="card" style={{
            display: 'block', padding: 22, borderRadius: 12, color: 'var(--text)', textDecoration: 'none',
            transition: 'transform .15s, border-color .15s, box-shadow .15s',
          }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55 }}>
              Review the current Ask Marketplace {label.toLowerCase()}.
            </div>
          </Link>
        ))}
      </div>
    </LegalShell>
  );
}
