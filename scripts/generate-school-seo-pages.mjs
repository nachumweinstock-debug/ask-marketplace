import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { schools, schoolUrl, tutoringSubjects } from '../src/seo/schools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const baseUrl = 'https://www.uask.live';
const lastmod = '2026-05-01T00:00:00.000Z';

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function pageTitle(school) {
  return `${school.name} Tutoring | College Tutors for Accounting, Finance, Math, and More`;
}

function pageDescription(school) {
  return `Find ${school.fullName} tutoring for ${school.strengths.slice(0, 5).join(', ')}, and exam prep. Ask Marketplace helps students connect with trusted college tutors fast.`;
}

function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Ask Marketplace',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    sameAs: [],
    description: 'Ask Marketplace helps college students find trusted tutors across universities.',
  };
}

function faqJsonLd(school) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: school.faqs.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };
}

function renderSubjectCards(school) {
  return tutoringSubjects.map((subject) => `
        <article>
          <h3>${esc(subject.name)} tutoring</h3>
          <p>Get help with ${esc(subject.description)}, with support tailored to ${esc(school.name)} students.</p>
          <a href="/tutors?search=${encodeURIComponent(subject.name)}">Browse ${esc(subject.name.toLowerCase())} tutors</a>
        </article>`).join('');
}

function renderSchoolPage(school) {
  const canonical = `${baseUrl}${schoolUrl(school.slug)}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(pageTitle(school))}</title>
    <meta name="description" content="${esc(pageDescription(school))}" />
    <meta name="keywords" content="${esc(school.keywords.join(', '))}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:site_name" content="Ask Marketplace" />
    <meta property="og:title" content="${esc(pageTitle(school))}" />
    <meta property="og:description" content="${esc(pageDescription(school))}" />
    <meta property="og:image" content="${baseUrl}/og-image.png" />
    <meta property="og:image:alt" content="${esc(`${school.fullName} tutoring on Ask Marketplace`)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(pageTitle(school))}" />
    <meta name="twitter:description" content="${esc(pageDescription(school))}" />
    <meta name="twitter:image" content="${baseUrl}/og-image.png" />
    <script type="application/ld+json">${JSON.stringify(organizationJsonLd())}</script>
    <script type="application/ld+json">${JSON.stringify(faqJsonLd(school))}</script>
    <style>
      body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111;background:#fff;line-height:1.6}
      main{max-width:1080px;margin:0 auto;padding:56px 24px 80px}
      h1{font-family:Georgia,serif;font-size:clamp(38px,7vw,72px);line-height:.98;max-width:940px;margin:0 0 20px}
      h2{font-family:Georgia,serif;font-size:32px;margin:0 0 16px}
      h3{font-size:19px;margin:0 0 8px}
      p,li{color:#424242}
      a{color:#111;font-weight:800}
      .eyebrow{color:#ff5722;font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:12px;margin:0 0 12px}
      .intro{max-width:760px;font-size:18px}
      .actions{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0 36px}
      .actions a{display:inline-flex;min-height:44px;align-items:center;justify-content:center;padding:10px 18px;border-radius:8px;background:#111;color:#fff;text-decoration:none}
      .actions a+a{background:#fff;color:#111;border:1px solid #c4c4c4}
      .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin:24px 0 42px}
      article,.panel{border:1px solid #e0e0e0;border-radius:8px;padding:22px;background:#fff}
      .panel{margin:18px 0}
      .faq article{margin-bottom:12px}
      @media(max-width:720px){.grid{grid-template-columns:1fr}main{padding-top:32px}.intro{font-size:16px}}
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">${esc(school.location)}</p>
      <h1>${esc(school.name)} Tutoring for Accounting, Finance, Math, Writing, and More</h1>
      <p class="intro">${esc(school.description)}</p>
      <div class="actions">
        <a href="/tutors">Find a tutor</a>
        <a href="/become-a-tutor">Become a tutor</a>
      </div>
      <section>
        <h2>Popular tutoring subjects at ${esc(school.name)}</h2>
        <div class="grid">${renderSubjectCards(school)}
        </div>
      </section>
      <section class="panel">
        <h2>Why ${esc(school.name)} students use tutoring</h2>
        <ul>${school.painPoints.map((point) => `<li>${esc(point)}</li>`).join('')}</ul>
      </section>
      <section class="panel">
        <h2>Program strengths</h2>
        <p>${esc(school.strengths.join(', '))}</p>
      </section>
      <section class="faq">
        <h2>${esc(school.name)} tutoring FAQ</h2>
        ${school.faqs.map(([question, answer]) => `<article><h3>${esc(question)}</h3><p>${esc(answer)}</p></article>`).join('\n        ')}
      </section>
    </main>
  </body>
</html>
`;
}

function writeSchoolPages() {
  for (const school of schools) {
    const dir = join(root, 'public', 'schools', school.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), renderSchoolPage(school));
  }
}

function writeSitemap() {
  const paths = [
    '',
    '/tutors',
    '/become-a-tutor',
    ...schools.map((school) => schoolUrl(school.slug)),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`).join('\n')}
</urlset>
`;
  writeFileSync(join(root, 'public', 'sitemap.xml'), sitemap);
}

writeSchoolPages();
writeSitemap();
console.log(`Generated ${schools.length} school pages and sitemap.xml`);
