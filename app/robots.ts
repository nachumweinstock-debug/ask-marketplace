import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/login', '/signup', '/account', '/admin'],
    },
    sitemap: 'https://www.uask.live/sitemap.xml',
  }
}
