import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Yeshiva University Tutoring for Accounting, Finance, Math, and More',
  description:
    'Find Yeshiva University tutoring help for accounting, finance, economics, math, writing, and exam prep through Ask Marketplace.',
  alternates: {
    canonical: 'https://www.uask.live/yeshiva-university-tutoring',
  },
}

const faqs = [
  {
    question: 'How do Yeshiva University students find tutors on Ask Marketplace?',
    answer:
      'Students can browse tutors by subject, compare profiles, and book help for accounting, finance, economics, math, writing, and exam prep.',
  },
  {
    question: 'Can YU students offer tutoring on Ask Marketplace?',
    answer:
      'Yes. Students who are strong in a subject can create a tutor listing and share availability for other students to book.',
  },
  {
    question: 'What subjects are available for Yeshiva University tutoring?',
    answer:
      'Ask Marketplace supports tutoring for accounting, finance, economics, math, writing, exam prep, and other college courses.',
  },
]

export default function YeshivaUniversityTutoringPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <section>
        <h1>Yeshiva University Tutoring for Accounting, Finance, Math, and More</h1>
        <p>
          Ask Marketplace helps YU students find trusted peer tutoring quickly, whether
          they need help before an exam, support during a tough course, or a steady tutor
          for the semester.
        </p>
        <div>
          <Link href="/tutors">Find a tutor</Link>
          <Link href="/become-a-tutor">Become a tutor</Link>
        </div>
      </section>

      <section>
        <h2>Accounting Tutoring</h2>
        <p>Get help with financial accounting, managerial accounting, homework, and exam review.</p>
      </section>
      <section>
        <h2>Finance Tutoring</h2>
        <p>Find support for corporate finance, investments, valuation, and finance problem sets.</p>
      </section>
      <section>
        <h2>Economics Tutoring</h2>
        <p>Work with tutors on microeconomics, macroeconomics, graphs, models, and test prep.</p>
      </section>
      <section>
        <h2>Math Tutoring</h2>
        <p>Connect with tutors for calculus, statistics, algebra, and quantitative coursework.</p>
      </section>
      <section>
        <h2>Writing Tutoring</h2>
        <p>Improve essays, research papers, outlines, citations, and class writing assignments.</p>
      </section>
      <section>
        <h2>Exam Prep</h2>
        <p>Prepare for midterms, finals, quizzes, and cumulative exams with focused peer help.</p>
      </section>

      <section>
        <h2>FAQ</h2>
        {faqs.map((faq) => (
          <article key={faq.question}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
