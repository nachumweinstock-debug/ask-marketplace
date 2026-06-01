/**
 * Generates pre-rendered HTML landing pages for every university in the database.
 * Output: /schools/{slug}/index.html — a full campus-services page for that school.
 *
 * Also generates subject × school pages for high-value combos:
 * /schools/{school}/{service}/index.html
 *
 * These static pages are crawlable by Google and redirect to the SPA for users.
 */

import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { universities, allServices } from '../src/seo/universities.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = join(__dirname, '..');
const BASE_URL  = 'https://www.uask.live';
const LASTMOD   = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';

function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

const CSS = `
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111;background:#fff;line-height:1.6}
main{max-width:1080px;margin:0 auto;padding:56px 24px 80px}
h1{font-family:Georgia,serif;font-size:clamp(32px,5.5vw,62px);line-height:1.05;margin:0 0 20px}
h2{font-family:Georgia,serif;font-size:26px;margin:44px 0 14px}
h3{font-size:16px;margin:0 0 5px}
p,li{color:#424242}
a{color:#111;font-weight:700}
.eyebrow{color:#F15A24;font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:12px;margin:0 0 10px;display:block}
.intro{max-width:780px;font-size:17px;margin:0 0 24px;color:#333}
.cta{display:inline-flex;min-height:48px;align-items:center;padding:12px 24px;border-radius:10px;background:#111;color:#fff;text-decoration:none;font-weight:700;font-size:15px;margin:0 10px 10px 0}
.cta-secondary{background:#fff;color:#111;border:1.5px solid #c4c4c4}
.service-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin:16px 0 40px}
.service-card{border:1px solid #e0e0e0;border-radius:10px;padding:18px;background:#fff;text-decoration:none;color:#111;display:block}
.service-card:hover{border-color:#111}
.service-card .label{font-weight:700;font-size:14px;margin-bottom:4px}
.service-card .sub{font-size:13px;color:#666}
.faq{border-top:1px solid #e0e0e0;margin-top:8px}
.faq article{border-bottom:1px solid #e0e0e0;padding:16px 0}
.crumbs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px;font-size:14px}
.crumbs a,.crumbs span{color:#666;font-weight:700;text-decoration:none}
.pill-row{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 36px}
.pill{border:1px solid #d7d7d7;border-radius:999px;padding:8px 14px;text-decoration:none;font-size:13px;color:#111;font-weight:600}
@media(max-width:720px){main{padding-top:32px}.intro{font-size:15px}.cta{width:100%;text-align:center;justify-content:center}}
`;

function universityPage(u) {
  const canonicalUrl = `${BASE_URL}/schools/${u.slug}`;
  const title = `${u.name} Campus Services | Tutors, Barbers, Fitness & More | ASK Marketplace`;
  const desc  = `Find campus services at ${u.name} — book tutors for ${u.strengths.slice(0,3).join(', ')}, student barbers, personal trainers, music lessons, language tutors, and more through ASK Marketplace.`;
  const keywords = [
    `${u.short} tutor`, `${u.name} tutor`, `${u.name} tutoring`,
    `${u.short} campus barber`, `${u.name} barber`,
    `${u.short} personal trainer`, `${u.name} fitness coach`,
    `${u.short} tennis lessons`, `${u.name} tennis coach`,
    `${u.short} guitar lessons`, `${u.name} music lessons`,
    `${u.short} hebrew tutor`, `${u.name} language tutor`,
    `campus services ${u.name}`, `${u.short} peer services`,
    ...u.strengths.map(s => `${s} tutor ${u.short}`),
  ].join(', ');

  const faq = [
    [`What campus services are available at ${u.name}?`,
     `ASK Marketplace connects ${u.name} students with tutors, barbers, personal trainers, tennis coaches, music teachers, and language tutors — all from fellow students.`],
    [`How do I find a tutor at ${u.name}?`,
     `Browse ASK Marketplace, filter by subject or service type, and book directly. You can find help with ${u.strengths.slice(0,4).join(', ')}, and many other subjects.`],
    [`Are there student barbers at ${u.name}?`,
     `Yes. ASK lists student barbers who offer haircuts, fades, tapers, and beard trims near ${u.name} at affordable prices.`],
    [`Can I find a personal trainer near ${u.name}?`,
     `Yes. ASK connects you with fitness coaches near ${u.name} for weight training, cardio, boxing, yoga, tennis, and sport-specific coaching.`],
    [`Are campus services on ASK available for any college student?`,
     `Yes. While ASK started at Yeshiva University, any student can sign up and post or book services. The platform is open to all colleges.`],
  ];

  const jsonOrg = JSON.stringify({'@context':'https://schema.org','@type':'EducationalOrganization','name':u.name,'sameAs':[]});
  const jsonService = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Service',
    name: `Campus Services at ${u.name}`,
    provider: { '@type': 'Organization', name: 'ASK Marketplace', url: BASE_URL },
    description: desc,
  });
  const jsonFaq = JSON.stringify({
    '@context':'https://schema.org','@type':'FAQPage',
    mainEntity: faq.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}})),
  });
  const jsonBreadcrumb = JSON.stringify({
    '@context':'https://schema.org','@type':'BreadcrumbList',
    itemListElement:[
      {'@type':'ListItem',position:1,name:'Home',item:`${BASE_URL}/`},
      {'@type':'ListItem',position:2,name:'Schools',item:`${BASE_URL}/browse`},
      {'@type':'ListItem',position:3,name:u.name,item:canonicalUrl},
    ],
  });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<meta name="keywords" content="${esc(keywords)}"/>
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"/>
<link rel="canonical" href="${canonicalUrl}"/>
<meta property="og:type" content="website"/>
<meta property="og:url" content="${canonicalUrl}"/>
<meta property="og:site_name" content="ASK Marketplace"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:image" content="${BASE_URL}/og-image.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${BASE_URL}/og-image.png"/>
<script type="application/ld+json">${jsonOrg}</script>
<script type="application/ld+json">${jsonService}</script>
<script type="application/ld+json">${jsonFaq}</script>
<script type="application/ld+json">${jsonBreadcrumb}</script>
<style>${CSS}</style>
</head>
<body>
<main>
  <nav aria-label="breadcrumb" class="crumbs">
    <a href="/">ASK Marketplace</a><span>›</span>
    <a href="/browse">Browse services</a><span>›</span>
    <span>${esc(u.name)}</span>
  </nav>

  <span class="eyebrow">${esc(u.city)}, ${esc(u.state)} · Campus Services</span>
  <h1>Campus services at ${esc(u.name)}</h1>
  <p class="intro">
    Find and book student-run services at ${esc(u.name)} — tutors for ${esc(u.strengths.slice(0,3).join(', '))},
    student barbers, personal trainers, music lessons, language instructors, and more.
    All providers are fellow students. No middleman. Zero platform fee.
  </p>

  <div>
    <a class="cta" href="/browse">Browse all services</a>
    <a class="cta cta-secondary" href="/signup">Sign up free</a>
  </div>

  <h2>Services available near ${esc(u.name)}</h2>
  <div class="service-grid">
    ${allServices.slice(0, 16).map(s => {
      const url = `/browse?${s.category ? `category=${encodeURIComponent(s.category)}` : ''}${s.search ? `&search=${encodeURIComponent(s.search)}` : ''}`;
      return `<a class="service-card" href="${esc(url)}">
      <div class="label">${esc(s.label)}</div>
      <div class="sub">${esc(s.desc.slice(0,60))}…</div>
    </a>`;
    }).join('\n    ')}
  </div>

  <h2>Popular subjects at ${esc(u.name)}</h2>
  <div class="pill-row">
    ${u.strengths.map(s => `<a class="pill" href="/browse?category=tutor&search=${encodeURIComponent(s)}">${esc(s)} tutor</a>`).join('\n    ')}
    <a class="pill" href="/browse?category=barber">Barber</a>
    <a class="pill" href="/browse?category=fitness">Personal trainer</a>
    <a class="pill" href="/browse?category=fitness&search=tennis">Tennis lessons</a>
    <a class="pill" href="/browse?category=music">Music lessons</a>
  </div>

  <h2>Frequently asked questions</h2>
  <div class="faq">
    ${faq.map(([q,a])=>`<article><h3>${esc(q)}</h3><p>${esc(a)}</p></article>`).join('\n    ')}
  </div>

  <p style="margin-top:48px;font-size:14px;color:#888">
    ASK Marketplace is open to students at every university. Providers sign up and list their services — students browse and book.
    <a href="/browse">Start browsing →</a>
  </p>
</main>
</body>
</html>`;
}

// ── Generate all university pages ─────────────────────────────────────────────
const schoolsDir = join(root, 'public', 'schools');
mkdirSync(schoolsDir, { recursive: true });

const newUrls = [];
let count = 0;

for (const u of universities) {
  // Skip if already has a dedicated page from the old generator
  const dir = join(schoolsDir, u.slug);
  mkdirSync(dir, { recursive: true });

  // Don't overwrite existing rich pages (like yeshiva-university which has a redirect)
  const existing = (() => { try { return readFileSync(join(dir,'index.html'),'utf8'); } catch { return null; } })();
  // Only skip if it's the old school-specific detailed page (detected by presence of subject grid)
  if (existing && existing.includes('schoolSeoSubjects')) {
    console.log(`  skip (existing) /schools/${u.slug}/`);
    continue;
  }

  writeFileSync(join(dir, 'index.html'), universityPage(u));
  console.log(`✓ /schools/${u.slug}/`);
  count++;

  newUrls.push(`  <url>\n    <loc>${BASE_URL}/schools/${u.slug}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.75</priority>\n  </url>`);
}

// ── Patch sitemap.xml ─────────────────────────────────────────────────────────
if (newUrls.length) {
  const sitemapPath = join(root, 'public', 'sitemap.xml');
  let sitemap = readFileSync(sitemapPath, 'utf8');

  const marker = '<!-- generated-universities -->';
  if (sitemap.includes(marker)) {
    sitemap = sitemap.replace(/<!-- generated-universities -->[\s\S]*?<!-- \/generated-universities -->/, '');
  }
  sitemap = sitemap.replace(
    '</urlset>',
    `${marker}\n${newUrls.join('\n')}\n<!-- /generated-universities -->\n</urlset>`
  );
  writeFileSync(sitemapPath, sitemap);
}

console.log(`\n✓ Generated ${count} university pages, ${newUrls.length} sitemap entries`);
