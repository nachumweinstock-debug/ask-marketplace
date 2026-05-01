import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getSchoolSeoSubjectBySlug,
  schoolSeoSubjects,
  schools,
} from '../../../src/seo/schools.js'

type Props = {
  params: { subject: string }
}

export function generateStaticParams() {
  return schoolSeoSubjects.map((subject) => ({ subject: subject.slug }))
}

export function generateMetadata({ params }: Props): Metadata {
  const subject = getSchoolSeoSubjectBySlug(params.subject)
  if (!subject) return {}

  const title = `${subject.titleSubject} for College Students | Ask Marketplace`
  const description = `Find college ${subject.name.toLowerCase()} tutors for ${subject.description}. Ask Marketplace helps students connect with trusted academic support.`
  const canonical = `https://www.uask.live/subjects/${subject.slug}`

  return {
    title,
    description,
    keywords: subject.keywords,
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
          alt: `${subject.name} tutoring on Ask Marketplace`,
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

export default function GeneralSubjectPage({ params }: Props) {
  const subject = getSchoolSeoSubjectBySlug(params.subject)
  if (!subject) notFound()

  const faqs = [
    [
      `How do students find ${subject.name.toLowerCase()} tutors?`,
      `Students can browse Ask Marketplace for ${subject.name.toLowerCase()} tutors, compare listings, and look for support with ${subject.description}.`,
    ],
    [
      `What makes a good ${subject.name.toLowerCase()} tutor?`,
      `A strong tutor explains concepts clearly, adapts to the student's course, and gives practical feedback without taking over the student's own work.`,
    ],
    ...subject.faqs,
  ]

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
    mainEntity: faqs.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.uask.live',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: `${subject.name} tutors`,
        item: `https://www.uask.live/subjects/${subject.slug}`,
      },
    ],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav>
        <Link href="/">Home</Link> / {subject.name} tutors
      </nav>

      <section>
        <p>{subject.category} tutoring</p>
        <h1>{subject.titleSubject} for College Students</h1>
        <p>{subject.tutoringCopy}</p>
        <div>
          <Link href={`/tutors?search=${encodeURIComponent(subject.searchTerm)}`}>
            Find {subject.name.toLowerCase()} tutors
          </Link>
          <Link href="/become-a-tutor">Become a tutor</Link>
        </div>
      </section>

      <section>
        <h2>Related subjects</h2>
        {schoolSeoSubjects
          .filter((item) => subject.relatedSubjects.includes(item.slug))
          .map((item) => (
            <Link key={item.slug} href={`/subjects/${item.slug}`}>
              {item.name} tutors
            </Link>
          ))}
      </section>

      <section>
        <h2>{subject.name} tutoring by school</h2>
        {schools.slice(0, 8).map((school) => (
          <Link key={school.slug} href={`/schools/${school.slug}/${subject.slug}`}>
            {school.name} {subject.name.toLowerCase()} tutors
          </Link>
        ))}
      </section>

      <section>
        <h2>{subject.name} tutoring FAQ</h2>
        {faqs.map(([question, answer]) => (
          <article key={question}>
            <h3>{question}</h3>
            <p>{answer}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
