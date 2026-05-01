import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  schoolSeoSubjects,
  schools,
} from '../../../src/seo/schools.js'
import { getSeoTutorBySlug, seoTutors } from '../../../src/seo/tutors.js'

type Props = {
  params: { slug: string }
}

export function generateStaticParams() {
  return seoTutors.map((tutor) => ({ slug: tutor.slug }))
}

export function generateMetadata({ params }: Props): Metadata {
  const tutor = getSeoTutorBySlug(params.slug)
  if (!tutor) return {}

  const subjects = tutor.subjects
    .map((slug) => schoolSeoSubjects.find((subject) => subject.slug === slug)?.name)
    .filter(Boolean)
    .slice(0, 3)
    .join(', ')
  const schoolNames = tutor.schools
    .map((slug) => schools.find((school) => school.slug === slug)?.name)
    .filter(Boolean)
    .join(' and ')
  const title = `${tutor.name} | ${tutor.title} | Ask Marketplace`
  const description = `${tutor.name} tutors ${subjects} for ${schoolNames} students. View bio, courses, tutoring style, availability, reviews, and FAQs.`
  const canonical = `https://www.uask.live/tutors/${tutor.slug}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'profile',
      url: canonical,
      siteName: 'Ask Marketplace',
      title,
      description,
      images: [
        {
          url: tutor.profileImage,
          width: 1200,
          height: 630,
          alt: `${tutor.name} tutor profile on Ask Marketplace`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [tutor.profileImage],
    },
  }
}

export default function TutorProfileSeoPage({ params }: Props) {
  const tutor = getSeoTutorBySlug(params.slug)
  if (!tutor) notFound()

  const tutorSubjects = tutor.subjects
    .map((slug) => schoolSeoSubjects.find((subject) => subject.slug === slug))
    .filter(Boolean)
  const tutorSchools = tutor.schools
    .map((slug) => schools.find((school) => school.slug === slug))
    .filter(Boolean)

  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: tutor.name,
    url: `https://www.uask.live/tutors/${tutor.slug}`,
    image: `https://www.uask.live${tutor.profileImage}`,
    description: tutor.bio,
    jobTitle: 'College tutor',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: tutor.rating,
      reviewCount: tutor.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    knowsAbout: tutorSubjects.map((subject) => subject.name),
    alumniOf: tutorSchools.map((school) => school.fullName),
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: tutor.faqs.map(([question, answer]) => ({
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
        name: 'Tutors',
        item: 'https://www.uask.live/tutors',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: tutor.name,
        item: `https://www.uask.live/tutors/${tutor.slug}`,
      },
    ],
  }

  const reviewJsonLd = tutor.testimonials.map((testimonial) => ({
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Person',
      name: tutor.name,
      url: `https://www.uask.live/tutors/${tutor.slug}`,
    },
    author: {
      '@type': 'Person',
      name: testimonial.name,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: testimonial.rating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: testimonial.text,
  }))

  return (
    <main>
      {[personJsonLd, faqJsonLd, breadcrumbJsonLd, ...reviewJsonLd].map((jsonLd, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ))}

      <nav>
        <Link href="/">Home</Link> / <Link href="/tutors">Tutors</Link> / {tutor.name}
      </nav>

      <section>
        <p>{tutorSubjects.map((subject) => subject.name).join(' / ')}</p>
        <h1>
          {tutor.name}: {tutor.title}
        </h1>
        <p>{tutor.bio}</p>
      </section>

      <section>
        <h2>Subjects</h2>
        {tutorSubjects.map((subject) => (
          <Link key={subject.slug} href={`/subjects/${subject.slug}`}>
            {subject.name} tutors
          </Link>
        ))}
      </section>

      <section>
        <h2>School tutoring pages</h2>
        {tutorSchools.flatMap((school) =>
          tutorSubjects.map((subject) => (
            <Link key={`${school.slug}-${subject.slug}`} href={`/schools/${school.slug}/${subject.slug}`}>
              {school.name} {subject.name.toLowerCase()} tutors
            </Link>
          )),
        )}
      </section>

      <section>
        <h2>Reviews</h2>
        <p>
          {tutor.rating} / 5 from {tutor.reviewCount} reviews
        </p>
        {tutor.testimonials.map((testimonial) => (
          <article key={testimonial.name}>
            <h3>{testimonial.name}</h3>
            <p>{testimonial.text}</p>
          </article>
        ))}
      </section>

      <section>
        <h2>{tutor.name} tutoring FAQ</h2>
        {tutor.faqs.map(([question, answer]) => (
          <article key={question}>
            <h3>{question}</h3>
            <p>{answer}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
