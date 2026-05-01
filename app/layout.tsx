import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.uask.live'),
  title: {
    default: 'Ask Marketplace | College Tutoring Made Simple',
    template: '%s | Ask Marketplace',
  },
  description:
    'Find trusted college tutors for finance, accounting, math, economics, writing, and more. Ask Marketplace helps students connect with tutors fast.',
  keywords: [
    'college tutoring',
    'college tutor marketplace',
    'Yeshiva University tutoring',
    'YU tutor',
    'finance tutor',
    'accounting tutor',
    'economics tutor',
    'math tutor',
    'writing tutor',
    'online college tutoring',
    'peer tutoring',
    'college exam prep',
  ],
  authors: [{ name: 'Ask Marketplace' }],
  creator: 'Ask Marketplace',
  publisher: 'Ask Marketplace',
  alternates: {
    canonical: 'https://www.uask.live',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: 'https://www.uask.live',
    siteName: 'Ask Marketplace',
    title: 'Ask Marketplace | College Tutoring Made Simple',
    description:
      'Find trusted college tutors for finance, accounting, math, economics, writing, and more.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Ask Marketplace college tutoring platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ask Marketplace | College Tutoring Made Simple',
    description:
      'Find trusted college tutors for finance, accounting, math, economics, writing, and more.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Ask Marketplace',
              url: 'https://www.uask.live',
              logo: 'https://www.uask.live/logo.png',
              sameAs: [],
              description:
                'Ask Marketplace helps college students find trusted tutors for finance, accounting, math, economics, writing, and more.',
            }),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Ask Marketplace',
              url: 'https://www.uask.live',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://www.uask.live/tutors?search={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        {children}
      </body>
    </html>
  )
}
