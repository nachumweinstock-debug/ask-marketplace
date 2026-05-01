import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.uask.live',
      lastModified: new Date(),
    },
    {
      url: 'https://www.uask.live/tutors',
      lastModified: new Date(),
    },
    {
      url: 'https://www.uask.live/become-a-tutor',
      lastModified: new Date(),
    },
  ]
}
