export const dynamic = 'force-static'

import { schools, schoolSubjectUrls, subjectUrls } from '../../src/seo/schools.js'
import { tutorUrls } from '../../src/seo/tutors.js'

export async function GET() {
  const baseUrl = 'https://www.uask.live'

  const urls = [
    '',
    '/support',
    '/tutors',
    '/become-a-tutor',
    ...schools.map((school) => `/schools/${school.slug}`),
    ...subjectUrls(),
    ...schoolSubjectUrls(),
    ...tutorUrls(),
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((path) => {
    return `  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>`
  })
  .join('\n')}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}
