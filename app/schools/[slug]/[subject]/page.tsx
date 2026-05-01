import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getSchoolBySlug,
  getSchoolSeoSubjectBySlug,
  schoolSeoSubjects,
  schools,
} from '../../../../src/seo/schools.js'

type Props = {
  params: { slug: string; subject: string }
}

export function generateStaticParams() {
  return schools.flatMap((school) =>
    schoolSeoSubjects.map((subject) => ({
      slug: school.slug,
      subject: subject.slug,
    })),
  )
}

export function generateMetadata({ params }: Props): Metadata {
  const school = getSchoolBySlug(params.slug)
  const subject = getSchoolSeoSubjectBySlug(params.subject)
  if (!school || !subject) return {}

  const title = `${school.name} ${subject.titleSubject} | Ask Marketplace`
  const description = `Find ${subject.name.toLowerCase()} tutors for ${school.fullName} students. Get help with ${subject.description} through Ask Marketplace.`
  const canonical = `https://www.uask.live/schools/${school.slug}/${subject.slug}`

  return {
    title,
    description,
    keywords: [
      `${school.name} ${subject.name.toLowerCase()} tutor`,
      `${school.fullName} ${subject.name.toLowerCase()} tutoring`,
      `${school.name} ${subject.name.toLowerCase()} tutors`,
      ...subject.keywords,
      ...school.keywords,
    ],
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
          alt: `${school.fullName} ${subject.name.toLowerCase()} tutoring on Ask Marketplace`,
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

export default function SchoolSubjectTutoringPage({ params }: Props) {
  const school = getSchoolBySlug(params.slug)
  const subject = getSchoolSeoSubjectBySlug(params.subject)
  if (!school || !subject) notFound()

  const faqs = [
    [
      `How do ${school.name} students find ${subject.name.toLowerCase()} tutors?`,
      `${school.name} students can browse tutors on Ask Marketplace, compare profiles, and look for help with ${subject.description}.`,
    ],
    [
      `Is ${subject.name.toLowerCase()} tutoring useful for ${school.fullName} classes?`,
      `Yes. ${school.fullName} students use tutoring to review class concepts, work through assignments, and prepare for exams in a way that fits ${school.name}'s academic pace.`,
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
        name: `${school.name} tutoring`,
        item: `https://www.uask.live/schools/${school.slug}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${subject.name} tutors`,
        item: `https://www.uask.live/schools/${school.slug}/${subject.slug}`,
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
        <Link href="/">Home</Link> / <Link href={`/schools/${school.slug}`}>{school.name} tutoring</Link> /{' '}
        {subject.name} tutors
      </nav>

      <section>
        <p>
          {school.location} {subject.name} tutoring
        </p>
        <h1>
          {school.name} {subject.titleSubject} for College Courses and Exam Prep
        </h1>
        <p>
          {school.description} For {subject.name.toLowerCase()}, students can use Ask
          Marketplace to find focused help with {subject.description}.
        </p>
        <div>
          <Link href={`/tutors?search=${encodeURIComponent(subject.searchTerm)}`}>
            Find {subject.name.toLowerCase()} tutors
          </Link>
          <Link href="/become-a-tutor">Become a tutor</Link>
        </div>
      </section>

      <section>
        <h2>
          {subject.name} tutoring for {school.fullName} students
        </h2>
        <p>{subject.tutoringCopy}</p>
        <p>
          {school.name} students often balance {school.painPoints.slice(0, 3).join(', ')}.
          Subject-specific tutoring can make review sessions more practical because the tutor
          can focus on the coursework, examples, and pace students are actually dealing with.
        </p>
      </section>

      <section>
        <h2>Related tutoring pages for {school.name}</h2>
        {schoolSeoSubjects
          .filter((item) => subject.relatedSubjects.includes(item.slug))
          .map((item) => (
            <Link key={item.slug} href={`/schools/${school.slug}/${item.slug}`}>
              {item.name} tutors
            </Link>
          ))}
        <Link href={`/subjects/${subject.slug}`}>General {subject.name.toLowerCase()} tutoring</Link>
      </section>

      <section>
        <h2>
          {school.name} {subject.name.toLowerCase()} tutoring FAQ
        </h2>
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
