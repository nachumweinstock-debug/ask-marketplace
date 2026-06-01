/**
 * Generates static pre-rendered HTML pages for every non-tutoring service
 * category offered on ASK Marketplace:
 *   /services/barber
 *   /services/fitness
 *   /services/tennis-lessons
 *   /services/guitar-lessons
 *   /services/piano-lessons
 *   /services/hebrew-tutor
 *   /services/gemara-tutor
 *   /services/torah-studies
 *   /services/spanish-tutor
 *   /services/french-tutor
 *   ... etc.
 *
 * These pages are crawlable HTML that redirect to the SPA with the right filters.
 */

import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root     = join(__dirname, '..');
const BASE_URL = 'https://www.uask.live';
const LASTMOD  = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';

// ── Service definitions ────────────────────────────────────────────────────────
const SERVICES = [
  // ── Barbers ─────────────────────────────────────────────────────────────────
  {
    slug: 'campus-barber',
    canonical: '/services/campus-barber',
    browseUrl: '/browse?category=barber',
    title: 'Campus Barber | Haircuts at Yeshiva University | ASK Marketplace',
    description: 'Book a student barber on campus at Yeshiva University. Fades, tapers, beard trims, and cuts — affordable YU campus haircuts from skilled students.',
    h1: 'Campus barbers at Yeshiva University',
    intro: 'Skip the salon and get a great haircut without leaving campus. ASK connects YU students with talented student barbers offering fades, tapers, beard trims, and classic cuts at affordable prices.',
    keywords: 'campus barber yeshiva university, yu campus haircut, yeshiva university barber, yu barber, college barber near me, student barber yu, wilf barber, beren barber',
    faq: [
      ['Where can I get a haircut on the Yeshiva University campus?', 'ASK Marketplace lists student barbers at YU who offer cuts on or near campus at WILF and BEREN.'],
      ['How much does a campus barber cost at YU?', 'Student barbers on ASK typically charge $15–$35, less than most local barbershops.'],
      ['What styles do campus barbers offer?', 'Most barbers offer fades, tapers, crew cuts, beard trims, and shape-ups. Check each listing for specifics.'],
      ['Can I book a campus haircut in advance?', 'Yes. Browse available barbers, pick a time slot, and book directly through ASK Marketplace.'],
      ['Do I need to provide my own supplies?', 'No. Student barbers bring their own clippers and tools.'],
    ],
    schema: {
      '@type': 'Service',
      name: 'Campus Barber Services',
      provider: { '@type': 'Organization', name: 'ASK Marketplace', url: BASE_URL },
      areaServed: 'Yeshiva University',
      description: 'Haircuts, fades, tapers, and beard trims offered by student barbers at Yeshiva University.',
      offers: { '@type': 'Offer', priceCurrency: 'USD', priceRange: '$15–$35' },
    },
    related: [
      { label: 'Browse all barbers', url: '/browse?category=barber' },
      { label: 'WILF campus barbers', url: '/browse?category=barber&campus=WILF' },
      { label: 'BEREN campus barbers', url: '/browse?category=barber&campus=BEREN' },
    ],
  },

  // ── Fitness ─────────────────────────────────────────────────────────────────
  {
    slug: 'personal-trainer',
    canonical: '/services/personal-trainer',
    browseUrl: '/browse?category=fitness',
    title: 'Personal Trainer at Yeshiva University | Campus Fitness | ASK Marketplace',
    description: 'Find a personal trainer or fitness coach at YU. Weight training, cardio, boxing, yoga, running, basketball, and more — book on-campus fitness sessions through ASK.',
    h1: 'Personal trainers and fitness coaches at Yeshiva University',
    intro: 'Get fit with a student personal trainer on campus. ASK connects YU students with certified and experienced fitness coaches offering weight training, cardio, boxing, yoga, and sport-specific coaching.',
    keywords: 'personal trainer yeshiva university, fitness coach yu, campus personal trainer, yu fitness, weightlifting coach yu, boxing classes yu, yoga instructor yu, basketball coach yu, tennis trainer yu, running coach yeshiva university',
    faq: [
      ['Are there personal trainers at Yeshiva University?', 'Yes. ASK Marketplace connects you with student personal trainers and fitness coaches at WILF and BEREN campuses.'],
      ['What types of fitness coaching are available at YU?', 'ASK offers weightlifting, cardio, boxing, yoga, basketball, tennis, soccer, running, and general fitness coaching.'],
      ['How much does a student personal trainer cost?', 'Rates typically range from $20–$60 per session depending on the trainer and type of session.'],
      ['Can I get one-on-one fitness coaching on campus?', 'Yes. Book individual sessions with a trainer who fits your goals and schedule.'],
      ['Do campus trainers provide workout plans?', 'Many do. Check each trainer\'s listing for what they include in sessions.'],
    ],
    schema: {
      '@type': 'Service',
      name: 'Personal Training & Fitness Coaching',
      provider: { '@type': 'Organization', name: 'ASK Marketplace', url: BASE_URL },
      areaServed: 'Yeshiva University',
      description: 'Personal training, fitness coaching, and sport-specific instruction by students at Yeshiva University.',
      offers: { '@type': 'Offer', priceCurrency: 'USD', priceRange: '$20–$60' },
    },
    related: [
      { label: 'Browse fitness coaches', url: '/browse?category=fitness' },
      { label: 'Tennis lessons at YU', url: '/services/tennis-lessons' },
      { label: 'Boxing training at YU', url: '/browse?category=fitness&search=boxing' },
    ],
  },

  // ── Tennis ──────────────────────────────────────────────────────────────────
  {
    slug: 'tennis-lessons',
    canonical: '/services/tennis-lessons',
    browseUrl: '/browse?category=fitness&search=tennis',
    title: 'Tennis Lessons at Yeshiva University | Campus Tennis Coaching | ASK Marketplace',
    description: 'Book private or group tennis lessons at Yeshiva University. Student tennis coaches at YU teach strokes, footwork, match strategy, and competitive play for all levels.',
    h1: 'Tennis lessons and coaching at Yeshiva University',
    intro: 'Improve your game without leaving campus. ASK connects YU students with skilled tennis coaches who teach groundstrokes, volleys, serves, footwork, and competitive match strategy for beginners through advanced players.',
    keywords: 'tennis lessons yeshiva university, tennis coach yu campus, yu tennis instruction, private tennis lessons yu, tennis for beginners yu, tennis coaching new york college, yeshiva university tennis',
    faq: [
      ['Can I get tennis lessons at Yeshiva University?', 'Yes. ASK Marketplace lists student tennis coaches at YU who offer private and group lessons on or near campus.'],
      ['What skill level are YU tennis coaches suited for?', 'Coaches work with all levels — complete beginners learning to hold a racket through competitive players working on match strategy.'],
      ['How long is a tennis lesson session?', 'Sessions are typically 45–60 minutes, though coaches can adjust length by request.'],
      ['Do I need my own equipment for tennis lessons?', 'Some coaches provide rackets for beginners. Check listings for equipment details.'],
      ['Where are tennis courts near Yeshiva University?', 'Several parks and courts are within walking distance of both the WILF and BEREN campuses.'],
    ],
    schema: {
      '@type': 'Service',
      name: 'Tennis Lessons',
      provider: { '@type': 'Organization', name: 'ASK Marketplace', url: BASE_URL },
      areaServed: 'Yeshiva University',
      description: 'Private and group tennis lessons for all skill levels by student coaches at Yeshiva University.',
      offers: { '@type': 'Offer', priceCurrency: 'USD', priceRange: '$25–$60' },
    },
    related: [
      { label: 'Browse tennis coaches', url: '/browse?category=fitness&search=tennis' },
      { label: 'All fitness coaches at YU', url: '/browse?category=fitness' },
      { label: 'Basketball coaching at YU', url: '/browse?category=fitness&search=basketball' },
    ],
  },

  // ── Languages ───────────────────────────────────────────────────────────────
  {
    slug: 'hebrew-tutor',
    canonical: '/services/hebrew-tutor',
    browseUrl: '/browse?category=languages&search=hebrew',
    title: 'Hebrew and Ivrit Tutor at Yeshiva University | ASK Marketplace',
    description: 'Find a Hebrew or Ivrit tutor at YU. Conversational Hebrew, biblical Hebrew, reading, writing, grammar, and exam prep — book a session through ASK Marketplace.',
    h1: 'Hebrew and Ivrit tutors at Yeshiva University',
    intro: 'Whether you\'re learning modern Ivrit for conversation or studying biblical Hebrew for class, ASK connects you with YU students who can help you read, write, speak, and understand Hebrew at any level.',
    keywords: 'hebrew tutor yeshiva university, ivrit tutor yu, biblical hebrew help, modern hebrew tutor, conversational hebrew yu, hebrew grammar tutor, yeshiva university language tutoring, learn hebrew campus',
    faq: [
      ['Can I find a Hebrew tutor at Yeshiva University?', 'Yes. ASK Marketplace lists students who tutor modern Hebrew (Ivrit) and biblical Hebrew at YU.'],
      ['What Hebrew topics can tutors help with?', 'Topics include conversational Ivrit, reading comprehension, grammar, biblical text, nikud (vowels), and exam prep.'],
      ['Do tutors specialize in modern or biblical Hebrew?', 'Both. Filter by the specific type when browsing, or message a tutor to confirm their specialty.'],
      ['Is Hebrew tutoring available online?', 'Many tutors offer Zoom sessions in addition to in-person help on campus.'],
      ['How much does Hebrew tutoring cost at YU?', 'Rates typically range $20–$50 per hour depending on the level and tutor.'],
    ],
    schema: {
      '@type': 'Service',
      name: 'Hebrew Tutoring',
      provider: { '@type': 'Organization', name: 'ASK Marketplace', url: BASE_URL },
      areaServed: 'Yeshiva University',
      description: 'Modern Hebrew (Ivrit) and biblical Hebrew tutoring by students at Yeshiva University.',
      offers: { '@type': 'Offer', priceCurrency: 'USD', priceRange: '$20–$50' },
    },
    related: [
      { label: 'Browse Hebrew tutors', url: '/browse?category=languages&search=hebrew' },
      { label: 'All language tutors at YU', url: '/browse?category=languages' },
      { label: 'Torah studies at YU', url: '/services/torah-studies' },
    ],
  },

  // ── Torah / Gemara ──────────────────────────────────────────────────────────
  {
    slug: 'torah-studies',
    canonical: '/services/torah-studies',
    browseUrl: '/browse?category=Torah Studies',
    title: 'Gemara and Torah Tutor at Yeshiva University | ASK Marketplace',
    description: 'Find a Gemara, Chumash, Halacha, or Tanach tutor at YU. Book Torah study sessions with knowledgeable Yeshiva University students through ASK Marketplace.',
    h1: 'Torah studies tutors at Yeshiva University',
    intro: 'Strengthen your learning with a study partner or tutor at YU. ASK connects students with experienced Torah learners who can help with Gemara, Chumash, Halacha, Mishna, Parsha, and more.',
    keywords: 'gemara tutor yeshiva university, torah tutor yu, chumash help yu, halacha tutor yeshiva, tanach tutor yu, jewish studies tutor, mishna tutor yeshiva, parsha yu, torah study partner, chavruta yu',
    faq: [
      ['Can I find a Gemara tutor at Yeshiva University?', 'Yes. ASK Marketplace connects YU students with experienced Gemara learners and tutors.'],
      ['What Torah subjects can tutors cover?', 'Subjects include Gemara, Chumash, Halacha, Mishna, Tanach, Tefilla, Parsha, Jewish history, and Mussar.'],
      ['Are Torah tutors experienced with Yeshiva University coursework?', 'Many tutors have specific experience with YU Beit Midrash curriculum and classes.'],
      ['Can I find a chavruta (study partner) through ASK?', 'Yes. Many learners on ASK offer regular chavruta sessions alongside structured tutoring.'],
      ['How much do Torah study sessions cost?', 'Rates typically range from $15–$45 per hour, though some learners offer sessions at no charge.'],
    ],
    schema: {
      '@type': 'Service',
      name: 'Torah Studies Tutoring',
      provider: { '@type': 'Organization', name: 'ASK Marketplace', url: BASE_URL },
      areaServed: 'Yeshiva University',
      description: 'Gemara, Chumash, Halacha, Mishna, and Tanach tutoring and chavruta learning at Yeshiva University.',
      offers: { '@type': 'Offer', priceCurrency: 'USD', priceRange: '$15–$45' },
    },
    related: [
      { label: 'Browse Torah tutors', url: '/browse?category=Torah Studies' },
      { label: 'Hebrew tutors at YU', url: '/services/hebrew-tutor' },
      { label: 'All YU tutors', url: '/browse' },
    ],
  },

  // ── Music ───────────────────────────────────────────────────────────────────
  {
    slug: 'guitar-lessons',
    canonical: '/services/guitar-lessons',
    browseUrl: '/browse?category=music&search=guitar',
    title: 'Guitar Lessons at Yeshiva University | Campus Music Instruction | ASK Marketplace',
    description: 'Book guitar lessons at YU from student musicians. Acoustic, electric, classical, and music theory — beginner through advanced on-campus guitar instruction.',
    h1: 'Guitar lessons at Yeshiva University',
    intro: 'Learn guitar without leaving campus. ASK connects YU students with experienced guitarists who teach acoustic, electric, and classical guitar for all skill levels, plus music theory and songwriting.',
    keywords: 'guitar lessons yeshiva university, guitar teacher yu campus, acoustic guitar lessons yu, electric guitar lessons yu, learn guitar yeshiva, music lessons yu, guitar instructor campus',
    faq: [
      ['Can I take guitar lessons at Yeshiva University?', 'Yes. ASK lists student guitar teachers at YU for private lessons on or near campus.'],
      ['What guitar styles are taught?', 'Acoustic, electric, classical, fingerpicking, chord-based playing, and music theory depending on the instructor.'],
      ['Are guitar lessons available for complete beginners?', 'Yes. Many instructors specialize in teaching students who have never touched a guitar.'],
      ['Do I need my own guitar for lessons?', 'Ideally yes, but some teachers can arrange to use their instrument for first sessions.'],
      ['How much do guitar lessons cost at YU?', 'Typical rates are $25–$55 per session.'],
    ],
    schema: {
      '@type': 'Service',
      name: 'Guitar Lessons',
      provider: { '@type': 'Organization', name: 'ASK Marketplace', url: BASE_URL },
      areaServed: 'Yeshiva University',
      description: 'Acoustic, electric, and classical guitar instruction by student musicians at Yeshiva University.',
      offers: { '@type': 'Offer', priceCurrency: 'USD', priceRange: '$25–$55' },
    },
    related: [
      { label: 'Browse guitar teachers', url: '/browse?category=music&search=guitar' },
      { label: 'Piano lessons at YU', url: '/services/piano-lessons' },
      { label: 'All music lessons at YU', url: '/browse?category=music' },
    ],
  },
  {
    slug: 'piano-lessons',
    canonical: '/services/piano-lessons',
    browseUrl: '/browse?category=music&search=piano',
    title: 'Piano Lessons at Yeshiva University | Campus Music Instruction | ASK Marketplace',
    description: 'Book piano lessons at YU. Student piano teachers at Yeshiva University teach classical, jazz, pop, and music theory for all levels through ASK Marketplace.',
    h1: 'Piano lessons at Yeshiva University',
    intro: 'Learn or improve piano on your schedule. ASK connects YU students with skilled piano teachers offering classical, pop, and jazz instruction plus sight-reading and theory for beginners through advanced players.',
    keywords: 'piano lessons yeshiva university, piano teacher yu, learn piano yu campus, classical piano lessons yu, piano instructor yeshiva, music teacher yu, keyboard lessons yu',
    faq: [
      ['Can I find piano lessons at Yeshiva University?', 'Yes. ASK Marketplace lists student piano teachers who offer lessons at YU.'],
      ['Do piano teachers at YU teach classical music?', 'Many do. Instructors vary — some focus on classical repertoire, others on pop, jazz, or theory fundamentals.'],
      ['Is sight-reading taught in piano lessons?', 'Many teachers include sight-reading as part of their instruction. Ask your instructor before booking.'],
      ['Are piano lessons available for adult beginners?', 'Absolutely. Several teachers specialize in working with adult beginners who have never played before.'],
      ['How much do piano lessons cost?', 'Typical rates are $25–$60 per session at YU.'],
    ],
    schema: {
      '@type': 'Service',
      name: 'Piano Lessons',
      provider: { '@type': 'Organization', name: 'ASK Marketplace', url: BASE_URL },
      areaServed: 'Yeshiva University',
      description: 'Classical, pop, and jazz piano instruction by student musicians at Yeshiva University.',
      offers: { '@type': 'Offer', priceCurrency: 'USD', priceRange: '$25–$60' },
    },
    related: [
      { label: 'Browse piano teachers', url: '/browse?category=music&search=piano' },
      { label: 'Guitar lessons at YU', url: '/services/guitar-lessons' },
      { label: 'All music lessons at YU', url: '/browse?category=music' },
    ],
  },
];

// ── HTML template ─────────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderPage(s) {
  const canonicalUrl = `${BASE_URL}${s.canonical}`;
  const jsonLdService = JSON.stringify({ '@context': 'https://schema.org', ...s.schema });
  const jsonLdFaq = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: s.faq.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  });
  const jsonLdBreadcrumb = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Services', item: `${BASE_URL}/browse` },
      { '@type': 'ListItem', position: 3, name: s.h1, item: canonicalUrl },
    ],
  });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(s.title)}</title>
    <meta name="description" content="${esc(s.description)}" />
    <meta name="keywords" content="${esc(s.keywords)}" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
    <link rel="canonical" href="${canonicalUrl}" />

    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="ASK Marketplace" />
    <meta property="og:title" content="${esc(s.title)}" />
    <meta property="og:description" content="${esc(s.description)}" />
    <meta property="og:image" content="${BASE_URL}/og-image.png" />
    <meta property="og:image:alt" content="${esc(s.h1)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(s.title)}" />
    <meta name="twitter:description" content="${esc(s.description)}" />
    <meta name="twitter:image" content="${BASE_URL}/og-image.png" />

    <script type="application/ld+json">${jsonLdService}</script>
    <script type="application/ld+json">${jsonLdFaq}</script>
    <script type="application/ld+json">${jsonLdBreadcrumb}</script>

    <style>
      body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111;background:#fff;line-height:1.6}
      main{max-width:1080px;margin:0 auto;padding:56px 24px 80px}
      h1{font-family:Georgia,serif;font-size:clamp(34px,6vw,64px);line-height:1.05;margin:0 0 20px}
      h2{font-family:Georgia,serif;font-size:28px;margin:40px 0 12px}
      h3{font-size:17px;margin:0 0 6px}
      p,li{color:#424242}
      a{color:#111;font-weight:700}
      .eyebrow{color:#F15A24;font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:12px;margin:0 0 12px;display:block}
      .intro{max-width:780px;font-size:18px;margin:0 0 28px}
      .actions{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 48px}
      .actions a{display:inline-flex;min-height:48px;align-items:center;justify-content:center;padding:12px 22px;border-radius:10px;background:#111;color:#fff;text-decoration:none;font-weight:700;font-size:15px}
      .actions a+a{background:#fff;color:#111;border:1.5px solid #c4c4c4}
      .faq{border-top:1px solid #e0e0e0;margin-top:8px}
      .faq article{border-bottom:1px solid #e0e0e0;padding:18px 0}
      .related{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
      .related a{border:1px solid #d7d7d7;border-radius:999px;padding:8px 14px;text-decoration:none;font-size:14px}
      .crumbs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px;font-size:14px}
      .crumbs a,.crumbs span{color:#666;font-weight:700;text-decoration:none}
      @media(max-width:720px){main{padding-top:32px}.intro{font-size:16px}.actions a{width:100%}}
    </style>
  </head>
  <body>
    <main>
      <nav aria-label="breadcrumb" class="crumbs">
        <a href="/">ASK Marketplace</a>
        <span>›</span>
        <a href="/browse">Browse services</a>
        <span>›</span>
        <span>${esc(s.h1)}</span>
      </nav>

      <span class="eyebrow">Campus services · Yeshiva University</span>
      <h1>${esc(s.h1)}</h1>
      <p class="intro">${esc(s.intro)}</p>

      <div class="actions">
        <a href="${esc(s.browseUrl)}">Find a ${esc(s.slug.replace(/-/g, ' '))} →</a>
        <a href="/browse">Browse all services</a>
      </div>

      <h2>Frequently asked questions</h2>
      <div class="faq">
        ${s.faq.map(([q, a]) => `
        <article>
          <h3>${esc(q)}</h3>
          <p>${esc(a)}</p>
        </article>`).join('')}
      </div>

      <h2>Related services at YU</h2>
      <div class="related">
        ${s.related.map(r => `<a href="${esc(r.url)}">${esc(r.label)}</a>`).join('\n        ')}
      </div>

      <p style="margin-top:48px;font-size:14px;color:#888">
        ASK Marketplace is a student-run campus marketplace at Yeshiva University. All service providers are students or recent graduates. <a href="/browse">Browse all listings →</a>
      </p>
    </main>
    <!-- SPA app loads after crawler is done -->
    <script>
      // Redirect to the SPA for interactive browsing
      if (typeof window !== 'undefined' && window.history) {
        // Keep the URL but let Vite serve the app
      }
    </script>
  </body>
</html>`;
}

// ── Generate pages ────────────────────────────────────────────────────────────
const servicesDir = join(root, 'public', 'services');
mkdirSync(servicesDir, { recursive: true });

const newUrls = [];

for (const s of SERVICES) {
  const dir = join(servicesDir, s.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), renderPage(s));
  console.log(`✓ /services/${s.slug}/index.html`);
  newUrls.push(`  <url>\n    <loc>${BASE_URL}${s.canonical}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
}

// ── Patch sitemap.xml ─────────────────────────────────────────────────────────
const sitemapPath = join(root, 'public', 'sitemap.xml');
let sitemap = readFileSync(sitemapPath, 'utf8');

// Remove old service entries if any, then add fresh ones before </urlset>
const marker = '<!-- generated-services -->';
if (sitemap.includes(marker)) {
  sitemap = sitemap.replace(/<!-- generated-services -->[\s\S]*?<!-- \/generated-services -->/, '');
}

sitemap = sitemap.replace(
  '</urlset>',
  `${marker}\n${newUrls.join('\n')}\n<!-- /generated-services -->\n</urlset>`
);

writeFileSync(sitemapPath, sitemap);
console.log(`\n✓ sitemap.xml patched with ${newUrls.length} new service URLs`);
console.log('\nDone! Run: npm run build to include in the dist.');
