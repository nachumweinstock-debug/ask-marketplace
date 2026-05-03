import type { MetadataRoute } from 'next'
import { schools, schoolSubjectUrls, subjectUrls } from '../src/seo/schools.js'
import { tutorUrls } from '../src/seo/tutors.js'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.uask.live'
  const legalPages = [
    '/legal',
    '/terms',
    '/privacy',
    '/cookies',
    '/refund-policy',
    '/community-guidelines',
  ]

  return [
    '',
    '/support',
    '/find-a-tutor',
    ...legalPages,
    '/tutors',
    '/become-a-tutor',
    ...schools.map((school) => `/schools/${school.slug}`),
    ...subjectUrls(),
    ...schoolSubjectUrls(),
    ...tutorUrls(),
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    ...(legalPages.includes(path)
      ? {
          changeFrequency: 'monthly' as const,
          priority: 0.5,
        }
      : {}),
  }))
}
