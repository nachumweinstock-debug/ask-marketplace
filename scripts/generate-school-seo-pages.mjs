import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  schools,
  schoolSeoSubjects,
  schoolSubjectUrl,
  schoolSubjectUrls,
  schoolUrl,
  subjectUrl,
  subjectUrls,
  tutoringSubjects,
} from '../src/seo/schools.js';

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

function schoolPageTitle(school) {
  return `${school.name} Tutoring | College Tutors for Accounting, Finance, Math, and More`;
}

function schoolPageDescription(school) {
  return `Find ${school.fullName} tutoring for ${school.strengths.slice(0, 5).join(', ')}, and exam prep. Ask Marketplace helps students connect with trusted college tutors fast.`;
}

function subjectPageTitle(school, subject) {
  return `${school.name} ${subject.titleSubject} | Ask Marketplace`;
}

function subjectPageDescription(school, subject) {
  return `Find ${subject.name.toLowerCase()} tutors for ${school.fullName} students. Get help with ${subject.description} through Ask Marketplace.`;
}

function generalSubjectPageTitle(subject) {
  return `${subject.titleSubject} for College Students | Ask Marketplace`;
}

function generalSubjectPageDescription(subject) {
  return `Find college ${subject.name.toLowerCase()} tutors for ${subject.description}. Ask Marketplace helps students connect with trusted academic support.`;
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

function faqJsonLd(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };
}

function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.path}`,
    })),
  };
}

function subjectFaqs(school, subject) {
  return [
    [
      `How do ${school.name} students find ${subject.name.toLowerCase()} tutors?`,
      `${school.name} students can browse tutors on Ask Marketplace, compare profiles, and look for help with ${subject.description}.`,
    ],
    [
      `Is ${subject.name.toLowerCase()} tutoring useful for ${school.fullName} classes?`,
      `Yes. ${school.fullName} students use tutoring to review class concepts, work through assignments, and prepare for exams in a way that fits ${school.name}'s academic pace.`,
    ],
    ...subject.faqs,
  ];
}

function generalSubjectFaqs(subject) {
  return [
    [
      `How do students find ${subject.name.toLowerCase()} tutors?`,
      `Students can browse Ask Marketplace for ${subject.name.toLowerCase()} tutors, compare listings, and look for support with ${subject.description}.`,
    ],
    [
      `What makes a good ${subject.name.toLowerCase()} tutor?`,
      `A strong tutor explains concepts clearly, adapts to the student's course, and gives practical feedback without taking over the student's own work.`,
    ],
    ...subject.faqs,
  ];
}

function renderHead({ title, description, canonical, keywords, imageAlt, jsonLd }) {
  return `    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta name="keywords" content="${esc(keywords.join(', '))}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:site_name" content="Ask Marketplace" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:image" content="${baseUrl}/og-image.png" />
    <meta property="og:image:alt" content="${esc(imageAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${baseUrl}/og-image.png" />
${jsonLd.map((item) => `    <script type="application/ld+json">${JSON.stringify(item)}</script>`).join('\n')}
    <style>
      body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111;background:#fff;line-height:1.6}
      main{max-width:1080px;margin:0 auto;padding:56px 24px 80px}
      h1{font-family:Georgia,serif;font-size:clamp(36px,7vw,70px);line-height:1;max-width:980px;margin:0 0 20px;letter-spacing:0}
      h2{font-family:Georgia,serif;font-size:32px;margin:0 0 16px;letter-spacing:0}
      h3{font-size:19px;margin:0 0 8px}
      p,li{color:#424242}
      a{color:#111;font-weight:800}
      .eyebrow{color:#ff5722;font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:12px;margin:0 0 12px}
      .intro{max-width:780px;font-size:18px}
      .actions{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0 36px}
      .actions a{display:inline-flex;min-height:44px;align-items:center;justify-content:center;padding:10px 18px;border-radius:8px;background:#111;color:#fff;text-decoration:none}
      .actions a+a{background:#fff;color:#111;border:1px solid #c4c4c4}
      .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin:24px 0 42px}
      article,.panel{border:1px solid #e0e0e0;border-radius:8px;padding:22px;background:#fff}
      .panel{margin:18px 0}
      .link-list{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
      .link-list a{border:1px solid #d7d7d7;border-radius:999px;padding:8px 12px;text-decoration:none}
      .faq article{margin-bottom:12px}
      .crumbs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:22px;font-size:14px}
      .crumbs a,.crumbs span{color:#666;font-weight:700;text-decoration:none}
      @media(max-width:720px){.grid{grid-template-columns:1fr}main{padding-top:32px}.intro{font-size:16px}.actions a{width:100%}}
    </style>`;
}

function renderSubjectCards(school) {
  return schoolSeoSubjects.map((subject) => `
        <article>
          <h3>${esc(subject.name)} tutoring</h3>
          <p>Get help with ${esc(subject.description)}, with support tailored to ${esc(school.name)} students.</p>
          <a href="${schoolSubjectUrl(school.slug, subject.slug)}">Explore ${esc(school.name)} ${esc(subject.name.toLowerCase())} tutors</a>
        </article>`).join('');
}

function renderSubjectCategoryCards() {
  const categories = ['STEM', 'Business', 'Humanities'];
  return categories.map((category) => {
    const subjects = schoolSeoSubjects.filter((subject) => subject.category === category);
    return `
        <article>
          <h3>${esc(category)} tutoring</h3>
          <p>${esc(subjects.map((subject) => subject.name).join(', '))}</p>
          <div class="link-list">
            ${subjects.map((subject) => `<a href="${subjectUrl(subject.slug)}">${esc(subject.name)}</a>`).join('\n            ')}
          </div>
        </article>`;
  }).join('');
}

function relatedSubjectLinks(subject, school) {
  return subject.relatedSubjects
    .map((slug) => schoolSeoSubjects.find((item) => item.slug === slug))
    .filter(Boolean)
    .map((item) => {
      const href = school ? schoolSubjectUrl(school.slug, item.slug) : subjectUrl(item.slug);
      return `<a href="${href}">${esc(item.name)} tutors</a>`;
    })
    .join('\n          ');
}

function renderGeneralSubjectCards(school) {
  return tutoringSubjects.map((subject) => `
        <article>
          <h3>${esc(subject.name)} tutoring</h3>
          <p>Get help with ${esc(subject.description)}, with support tailored to ${esc(school.name)} students.</p>
          <a href="/tutors?search=${encodeURIComponent(subject.name)}">Browse ${esc(subject.name.toLowerCase())} tutors</a>
        </article>`).join('');
}

function renderSchoolPage(school) {
  const canonical = `${baseUrl}${schoolUrl(school.slug)}`;
  const title = schoolPageTitle(school);
  const description = schoolPageDescription(school);
  const head = renderHead({
    title,
    description,
    canonical,
    keywords: school.keywords,
    imageAlt: `${school.fullName} tutoring on Ask Marketplace`,
    jsonLd: [
      organizationJsonLd(),
      faqJsonLd(school.faqs),
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: `${school.name} tutoring`, path: schoolUrl(school.slug) },
      ]),
    ],
  });

  return `<!doctype html>
<html lang="en">
  <head>
${head}
  </head>
  <body>
    <main>
      <nav class="crumbs"><a href="/">Home</a><span>/</span><span>${esc(school.name)} tutoring</span></nav>
      <p class="eyebrow">${esc(school.location)}</p>
      <h1>${esc(school.name)} Tutoring for Accounting, Finance, Math, Writing, and More</h1>
      <p class="intro">${esc(school.description)}</p>
      <div class="actions">
        <a href="/tutors">Find a tutor</a>
        <a href="/become-a-tutor">Become a tutor</a>
      </div>
      <section>
        <h2>Targeted tutoring at ${esc(school.name)}</h2>
        <div class="grid">${renderSubjectCards(school)}
        </div>
      </section>
      <section>
        <h2>Browse by academic area</h2>
        <div class="grid">${renderSubjectCategoryCards()}
        </div>
      </section>
      <section>
        <h2>More popular tutoring subjects at ${esc(school.name)}</h2>
        <div class="grid">${renderGeneralSubjectCards(school)}
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

function renderSubjectPage(school, subject) {
  const path = schoolSubjectUrl(school.slug, subject.slug);
  const canonical = `${baseUrl}${path}`;
  const title = subjectPageTitle(school, subject);
  const description = subjectPageDescription(school, subject);
  const faqs = subjectFaqs(school, subject);
  const keywords = [
    `${school.name} ${subject.name.toLowerCase()} tutor`,
    `${school.fullName} ${subject.name.toLowerCase()} tutoring`,
    `${school.name} ${subject.name.toLowerCase()} tutors`,
    ...subject.keywords,
    ...school.keywords,
  ];
  const programStrengths = school.strengths.slice(0, 4).join(', ');
  const head = renderHead({
    title,
    description,
    canonical,
    keywords,
    imageAlt: `${school.fullName} ${subject.name.toLowerCase()} tutoring on Ask Marketplace`,
    jsonLd: [
      organizationJsonLd(),
      faqJsonLd(faqs),
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: `${school.name} tutoring`, path: schoolUrl(school.slug) },
        { name: `${subject.name} tutors`, path },
      ]),
    ],
  });

  return `<!doctype html>
<html lang="en">
  <head>
${head}
  </head>
  <body>
    <main>
      <nav class="crumbs"><a href="/">Home</a><span>/</span><a href="${schoolUrl(school.slug)}">${esc(school.name)} tutoring</a><span>/</span><span>${esc(subject.name)} tutors</span></nav>
      <p class="eyebrow">${esc(school.location)} ${esc(subject.name)} tutoring</p>
      <h1>${esc(school.name)} ${esc(subject.titleSubject)} for College Courses and Exam Prep</h1>
      <p class="intro">${esc(school.description)} For ${esc(subject.name.toLowerCase())}, students can use Ask Marketplace to find focused help with ${esc(subject.description)}.</p>
      <div class="actions">
        <a href="/tutors?search=${encodeURIComponent(subject.searchTerm)}">Find ${esc(subject.name.toLowerCase())} tutors</a>
        <a href="/become-a-tutor">Become a tutor</a>
      </div>
      <section class="panel">
        <h2>${esc(subject.name)} tutoring for ${esc(school.fullName)} students</h2>
        <p>${esc(subject.tutoringCopy)}</p>
        <p>${esc(school.name)} students often balance ${esc(school.painPoints.slice(0, 3).join(', '))}. Subject-specific tutoring can make review sessions more practical because the tutor can focus on the coursework, examples, and pace students are actually dealing with.</p>
      </section>
      <section class="panel">
        <h2>Why students look for ${esc(subject.name.toLowerCase())} help</h2>
        <p>${esc(subject.painPointCopy)}</p>
        <p>At ${esc(school.name)}, strong fits often connect to ${esc(programStrengths)}. Students can use tutoring for weekly support, assignment review, or focused prep before a midterm, final, quiz, presentation, or paper deadline.</p>
      </section>
      <section>
        <h2>Common ${esc(subject.name.toLowerCase())} tutoring goals</h2>
        <div class="grid">
          <article><h3>Understand the course</h3><p>Break down lectures, readings, formulas, models, or assignment instructions into clear next steps.</p></article>
          <article><h3>Practice with feedback</h3><p>Work through problems, drafts, cases, or review questions with someone who can catch mistakes early.</p></article>
          <article><h3>Prepare for exams</h3><p>Build a focused study plan around the topics most likely to matter for quizzes, midterms, and finals.</p></article>
          <article><h3>Stay consistent</h3><p>Use tutoring to keep up during busy weeks, especially when classes, work, clubs, or internships overlap.</p></article>
        </div>
      </section>
      <section class="panel">
        <h2>Related tutoring pages for ${esc(school.name)}</h2>
        <div class="link-list">
          ${relatedSubjectLinks(subject, school)}
          <a href="${schoolUrl(school.slug)}">All ${esc(school.name)} tutoring</a>
          <a href="${subjectUrl(subject.slug)}">General ${esc(subject.name.toLowerCase())} tutoring</a>
        </div>
      </section>
      <section class="faq">
        <h2>${esc(school.name)} ${esc(subject.name.toLowerCase())} tutoring FAQ</h2>
        ${faqs.map(([question, answer]) => `<article><h3>${esc(question)}</h3><p>${esc(answer)}</p></article>`).join('\n        ')}
      </section>
    </main>
  </body>
</html>
`;
}

function renderGeneralSubjectPage(subject) {
  const path = subjectUrl(subject.slug);
  const canonical = `${baseUrl}${path}`;
  const title = generalSubjectPageTitle(subject);
  const description = generalSubjectPageDescription(subject);
  const faqs = generalSubjectFaqs(subject);
  const matchingSchools = schools.filter((school) =>
    school.strengths.join(' ').toLowerCase().includes(subject.shortSlug.replaceAll('-', ' ')) ||
    school.description.toLowerCase().includes(subject.shortSlug.replaceAll('-', ' ')) ||
    school.keywords.join(' ').toLowerCase().includes(subject.shortSlug.replaceAll('-', ' '))
  );
  const featuredSchools = (matchingSchools.length ? matchingSchools : schools).slice(0, 8);
  const head = renderHead({
    title,
    description,
    canonical,
    keywords: subject.keywords,
    imageAlt: `${subject.name} tutoring on Ask Marketplace`,
    jsonLd: [
      organizationJsonLd(),
      faqJsonLd(faqs),
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: `${subject.name} tutors`, path },
      ]),
    ],
  });

  return `<!doctype html>
<html lang="en">
  <head>
${head}
  </head>
  <body>
    <main>
      <nav class="crumbs"><a href="/">Home</a><span>/</span><span>${esc(subject.name)} tutors</span></nav>
      <p class="eyebrow">${esc(subject.category)} tutoring</p>
      <h1>${esc(subject.titleSubject)} for College Students</h1>
      <p class="intro">${esc(subject.tutoringCopy)}</p>
      <div class="actions">
        <a href="/tutors?search=${encodeURIComponent(subject.searchTerm)}">Find ${esc(subject.name.toLowerCase())} tutors</a>
        <a href="/become-a-tutor">Become a tutor</a>
      </div>
      <section class="panel">
        <h2>Why students look for ${esc(subject.name.toLowerCase())} help</h2>
        <p>${esc(subject.painPointCopy)}</p>
        <ul>${subject.painPoints.map((point) => `<li>${esc(point)}</li>`).join('')}</ul>
      </section>
      <section>
        <h2>Common ${esc(subject.name.toLowerCase())} tutoring goals</h2>
        <div class="grid">
          <article><h3>Understand the material</h3><p>Turn lectures, readings, formulas, code, labs, or source material into a clearer study path.</p></article>
          <article><h3>Practice with feedback</h3><p>Work through assignments, problems, drafts, or projects with targeted feedback on what to improve.</p></article>
          <article><h3>Prepare for exams</h3><p>Review weak areas, build a practice plan, and focus study time before quizzes, midterms, and finals.</p></article>
          <article><h3>Stay on pace</h3><p>Use tutoring to keep moving during busy weeks when multiple classes and deadlines overlap.</p></article>
        </div>
      </section>
      <section class="panel">
        <h2>Related subjects</h2>
        <div class="link-list">
          ${relatedSubjectLinks(subject)}
        </div>
      </section>
      <section class="panel">
        <h2>${esc(subject.name)} tutoring by school</h2>
        <div class="link-list">
          ${featuredSchools.map((school) => `<a href="${schoolSubjectUrl(school.slug, subject.slug)}">${esc(school.name)} ${esc(subject.name.toLowerCase())} tutors</a>`).join('\n          ')}
        </div>
      </section>
      <section class="faq">
        <h2>${esc(subject.name)} tutoring FAQ</h2>
        ${faqs.map(([question, answer]) => `<article><h3>${esc(question)}</h3><p>${esc(answer)}</p></article>`).join('\n        ')}
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

    for (const subject of schoolSeoSubjects) {
      const subjectDir = join(root, 'public', 'schools', school.slug, subject.slug);
      mkdirSync(subjectDir, { recursive: true });
      writeFileSync(join(subjectDir, 'index.html'), renderSubjectPage(school, subject));
    }
  }
}

function writeGeneralSubjectPages() {
  for (const subject of schoolSeoSubjects) {
    const dir = join(root, 'public', 'subjects', subject.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), renderGeneralSubjectPage(subject));
  }
}

function writeSitemap() {
  const paths = [
    '',
    '/tutors',
    '/become-a-tutor',
    ...schools.map((school) => schoolUrl(school.slug)),
    ...subjectUrls(),
    ...schoolSubjectUrls(),
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

writeGeneralSubjectPages();
writeSchoolPages();
writeSitemap();
console.log(`Generated ${schools.length} school pages, ${subjectUrls().length} general subject pages, ${schoolSubjectUrls().length} school subject pages, and sitemap.xml`);
