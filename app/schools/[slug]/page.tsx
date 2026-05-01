import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSchoolBySlug, schools, tutoringSubjects } from '../../../src/seo/schools.js'

type Props = {
  params: { slug: string }
}

export function generateStaticParams() {
  return schools.map((school) => ({ slug: school.slug }))
}

export function generateMetadata({ params }: Props): Metadata {
  const school = getSchoolBySlug(params.slug)
  if (!school) return {}

  const title = `${school.name} Tutoring | College Tutors for Accounting, Finance, Math, and More`
  const description = `Find ${school.fullName} tutoring for ${school.strengths.slice(0, 5).join(', ')}, and exam prep. Ask Marketplace helps students connect with trusted college tutors fast.`
  const canonical = `https://www.uask.live/schools/${school.slug}`

  return {
    title,
    description,
    keywords: school.keywords,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: 'Ask Marketplace',
      title,
      description,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: `${school.fullName} tutoring on Ask Marketplace`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
  }
}

export default function SchoolTutoringPage({ params }: Props) {
  const school = getSchoolBySlug(params.slug)
  if (!school) notFound()

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Ask Marketplace',
    url: 'https://www.uask.live',
    logo: 'https://www.uask.live/logo.png',
    description: 'Ask Marketplace helps college students find trusted tutors across universities.',
  }

  const faqJsonLd = {
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
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section>
        <p>{school.location}</p>
        <h1>{school.name} Tutoring for Accounting, Finance, Math, Writing, and More</h1>
        <p>{school.description}</p>
        <div>
          <Link href="/tutors">Find a tutor</Link>
          <Link href="/become-a-tutor">Become a tutor</Link>
        </div>
      </section>

      <section>
        <h2>Popular tutoring subjects at {school.name}</h2>
        {tutoringSubjects.map((subject) => (
          <article key={subject.slug}>
            <h3>{subject.name} tutoring</h3>
            <p>
              Get help with {subject.description}, with support tailored to {school.name}
              students.
            </p>
            <Link href={`/tutors?search=${encodeURIComponent(subject.name)}`}>
              Browse {subject.name.toLowerCase()} tutors
            </Link>
          </article>
        ))}
      </section>

      <section>
        <h2>Why {school.name} students use tutoring</h2>
        <ul>
          {school.painPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Program strengths</h2>
        <p>{school.strengths.join(', ')}</p>
      </section>

      <section>
        <h2>{school.name} tutoring FAQ</h2>
        {school.faqs.map(([question, answer]) => (
          <article key={question}>
            <h3>{question}</h3>
            <p>{answer}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
