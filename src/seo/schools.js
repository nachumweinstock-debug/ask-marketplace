export const tutoringSubjects = [
  { slug: 'accounting', name: 'Accounting', description: 'financial accounting, managerial accounting, journal entries, and exam review' },
  { slug: 'finance', name: 'Finance', description: 'corporate finance, investments, valuation, Excel models, and problem sets' },
  { slug: 'economics', name: 'Economics', description: 'microeconomics, macroeconomics, graphs, models, and quantitative reasoning' },
  { slug: 'math', name: 'Math', description: 'calculus, statistics, algebra, and other quantitative coursework' },
  { slug: 'writing', name: 'Writing', description: 'essays, research papers, outlines, citations, and writing assignments' },
  { slug: 'exam-prep', name: 'Exam prep', description: 'midterm prep, final exam review, quizzes, and cumulative study plans' },
];

export const schoolSeoSubjects = [
  {
    slug: 'finance-tutors',
    shortSlug: 'finance',
    name: 'Finance',
    titleSubject: 'Finance Tutors',
    searchTerm: 'Finance',
    description: 'corporate finance, investments, valuation, Excel modeling, capital markets, and finance problem sets',
    tutoringCopy: 'Finance tutoring works best when students can slow down the formulas, connect concepts to real cases, and practice the exact style of problems they see in class. Ask Marketplace helps students find tutors for corporate finance, investments, valuation, Excel modeling, and exam review.',
    painPointCopy: 'Finance classes often combine theory, calculator work, spreadsheets, and fast exam pacing. A tutor can help turn confusing lecture notes into a practical study plan with targeted practice.',
    faqs: [
      ['What can a finance tutor help with?', 'A finance tutor can help with time value of money, valuation, investments, capital budgeting, Excel models, homework review, and exam preparation.'],
      ['Is finance tutoring useful for business school classes?', 'Yes. Finance tutoring is especially useful for business school core classes, upper-level electives, and students preparing for internship technical questions.'],
      ['Can I find online finance tutoring?', 'Tutor listings can support online, in-person, or hybrid sessions depending on the tutor availability.'],
    ],
  },
  {
    slug: 'accounting-tutors',
    shortSlug: 'accounting',
    name: 'Accounting',
    titleSubject: 'Accounting Tutors',
    searchTerm: 'Accounting',
    description: 'financial accounting, managerial accounting, journal entries, debits and credits, statements, and exam review',
    tutoringCopy: 'Accounting tutoring helps students build the foundation that later business courses rely on. Ask Marketplace connects students with help for journal entries, financial statements, managerial accounting, cost concepts, homework review, and test prep.',
    painPointCopy: 'Accounting can feel unforgiving because one missed concept can make an entire problem fall apart. A tutor can help students practice step by step until the logic becomes repeatable.',
    faqs: [
      ['What topics can an accounting tutor cover?', 'Accounting tutors can help with debits and credits, journal entries, adjusting entries, financial statements, managerial accounting, cost accounting, and exam review.'],
      ['Can tutoring help with introductory accounting?', 'Yes. Intro accounting is one of the most common tutoring needs because the course introduces a new way of thinking about transactions and statements.'],
      ['Can I get help before an accounting exam?', 'Yes. Tutors can review weak areas, walk through practice problems, and help organize a focused exam prep plan.'],
    ],
  },
  {
    slug: 'economics-tutors',
    shortSlug: 'economics',
    name: 'Economics',
    titleSubject: 'Economics Tutors',
    searchTerm: 'Economics',
    description: 'microeconomics, macroeconomics, graphs, models, problem sets, and quantitative economic reasoning',
    tutoringCopy: 'Economics tutoring helps students connect graphs, formulas, models, and written explanations. Ask Marketplace supports microeconomics, macroeconomics, intermediate theory, quantitative problem sets, and exam prep.',
    painPointCopy: 'Economics classes often move between intuition and math quickly. A tutor can help students understand what the model means before they memorize the answer pattern.',
    faqs: [
      ['What does an economics tutor help with?', 'Economics tutors can help with supply and demand, elasticity, consumer theory, producer theory, macro models, graphs, and quantitative problem sets.'],
      ['Can tutoring help with economics graphs?', 'Yes. Tutors can help students understand how to read, draw, shift, and explain economics graphs clearly.'],
      ['Is economics tutoring only for majors?', 'No. Tutoring can help majors, business students, and students taking economics as a requirement.'],
    ],
  },
  {
    slug: 'math-tutors',
    shortSlug: 'math',
    name: 'Math',
    titleSubject: 'Math Tutors',
    searchTerm: 'Math',
    description: 'calculus, statistics, algebra, quantitative methods, proofs, and problem-solving practice',
    tutoringCopy: 'Math tutoring gives students a place to work through problems carefully, catch gaps early, and prepare for quizzes and exams. Ask Marketplace helps students find support for calculus, statistics, algebra, quantitative methods, and related courses.',
    painPointCopy: 'Math courses build quickly, so small misunderstandings can become bigger issues before an exam. A tutor can help students diagnose the gap and practice the right problem types.',
    faqs: [
      ['What math subjects can tutors help with?', 'Math tutors can help with calculus, statistics, algebra, quantitative methods, business math, and course-specific problem sets.'],
      ['Can a math tutor help with exam prep?', 'Yes. Tutors can help organize formulas, practice representative problems, and review the concepts most likely to appear on exams.'],
      ['Is math tutoring available for non-STEM students?', 'Yes. Many students use math tutoring for business, economics, social science, and general education requirements.'],
    ],
  },
  {
    slug: 'writing-tutors',
    shortSlug: 'writing',
    name: 'Writing',
    titleSubject: 'Writing Tutors',
    searchTerm: 'Writing',
    description: 'essays, research papers, outlines, thesis development, citations, revisions, and writing assignments',
    tutoringCopy: 'Writing tutoring helps students turn ideas into clear, organized papers. Ask Marketplace supports outlines, thesis development, research papers, citations, revision, class essays, and writing-heavy assignments.',
    painPointCopy: 'College writing can be hard because the assignment is often broad and feedback arrives late. A tutor can help students clarify the argument, structure the paper, and revise with purpose.',
    faqs: [
      ['What can a writing tutor help with?', 'Writing tutors can help with brainstorming, outlines, thesis statements, essay structure, research papers, citations, editing, and revision planning.'],
      ['Will a writing tutor write my paper for me?', 'No. The goal is to help students improve their own work through feedback, structure, and revision support.'],
      ['Can writing tutoring help with non-English classes?', 'Yes. Writing support can help with papers in history, business, economics, humanities, social science, and other writing-heavy courses.'],
    ],
  },
];

export const schools = [
  {
    slug: 'nyu',
    name: 'NYU',
    fullName: 'New York University',
    location: 'New York, NY',
    description: 'NYU students balance demanding classes, internships, clubs, and city life. Ask Marketplace helps students find peer tutoring for Stern, CAS, Tandon, and other NYU programs without wasting time searching group chats.',
    strengths: ['Stern business courses', 'economics', 'math', 'writing seminars', 'computer science', 'pre-health coursework'],
    painPoints: ['fast-paced quantitative classes', 'large lectures', 'internship-heavy schedules', 'midterm clustering'],
    keywords: ['NYU tutoring', 'NYU tutor', 'Stern finance tutor', 'NYU accounting tutor', 'NYU economics tutor'],
    faqs: [
      ['What subjects can NYU students find tutors for?', 'NYU students can look for help in accounting, finance, economics, math, writing, computer science, and exam prep.'],
      ['Is Ask Marketplace only for business classes at NYU?', 'No. Business tutoring is common, but the marketplace can support any class where students want peer help.'],
      ['Can NYU students become tutors?', 'Yes. Students who are strong in a course can create a listing and offer tutoring to classmates.'],
    ],
  },
  {
    slug: 'baruch',
    name: 'Baruch',
    fullName: 'Baruch College',
    location: 'New York, NY',
    description: 'Baruch students often need practical, focused tutoring for Zicklin business courses, accounting sequences, finance classes, economics, statistics, and writing-heavy requirements.',
    strengths: ['accounting', 'finance', 'economics', 'statistics', 'business writing', 'Excel'],
    painPoints: ['competitive business prerequisites', 'accounting sequence pressure', 'commuter schedules', 'evening study constraints'],
    keywords: ['Baruch tutoring', 'Baruch accounting tutor', 'Zicklin tutor', 'Baruch finance tutor'],
    faqs: [
      ['What tutoring is most useful for Baruch students?', 'Many Baruch students look for accounting, finance, economics, statistics, Excel, and writing help.'],
      ['Can tutors help with Zicklin prerequisites?', 'Yes. Peer tutors can support prerequisite review, homework practice, and exam preparation.'],
      ['Is online tutoring available for Baruch students?', 'Tutors can offer in-person, online, or hybrid sessions depending on their listing.'],
    ],
  },
  {
    slug: 'columbia',
    name: 'Columbia',
    fullName: 'Columbia University',
    location: 'New York, NY',
    description: 'Columbia students manage rigorous Core requirements, quantitative courses, writing demands, and major-specific workloads. Ask Marketplace helps them connect with tutors who understand intense academic pacing.',
    strengths: ['Core writing', 'economics', 'calculus', 'statistics', 'computer science', 'pre-med sciences'],
    painPoints: ['dense reading loads', 'proof-heavy math', 'research writing', 'competitive STEM classes'],
    keywords: ['Columbia tutoring', 'Columbia tutor', 'Columbia economics tutor', 'Columbia writing tutor'],
    faqs: [
      ['What Columbia classes can tutoring help with?', 'Tutoring can help with economics, math, statistics, writing, Core papers, computer science, and science prerequisites.'],
      ['Can Columbia tutors help with writing?', 'Yes. Writing support can include outlines, thesis clarity, structure, citation planning, and revision.'],
      ['How should Columbia students choose a tutor?', 'Students should look for subject fit, course familiarity, availability, and clear communication style.'],
    ],
  },
  {
    slug: 'cornell',
    name: 'Cornell',
    fullName: 'Cornell University',
    location: 'Ithaca, NY',
    description: 'Cornell courses can move quickly, especially in engineering, business, economics, math, and writing-heavy majors. Ask Marketplace gives students a direct way to find peer academic support.',
    strengths: ['engineering math', 'Dyson business courses', 'economics', 'statistics', 'writing', 'pre-med sciences'],
    painPoints: ['large STEM lectures', 'challenging prelims', 'problem set workload', 'major-specific grading pressure'],
    keywords: ['Cornell tutoring', 'Cornell tutor', 'Cornell economics tutor', 'Cornell math tutor'],
    faqs: [
      ['What makes Cornell tutoring different?', 'Cornell students often need help preparing for prelims, managing problem sets, and reviewing dense course material.'],
      ['Can tutoring help with Cornell prelims?', 'Yes. Tutors can help students organize review, practice problems, and clarify weak topics before prelims.'],
      ['Can Cornell students tutor other students?', 'Yes. Strong students can list tutoring services and offer sessions around their schedule.'],
    ],
  },
  {
    slug: 'michigan',
    name: 'Michigan',
    fullName: 'University of Michigan',
    location: 'Ann Arbor, MI',
    description: 'Michigan students across Ross, LSA, engineering, economics, math, and writing courses can use Ask Marketplace to find focused tutoring from peers who understand campus academics.',
    strengths: ['Ross business courses', 'economics', 'engineering math', 'statistics', 'writing', 'computer science'],
    painPoints: ['large lectures', 'competitive prerequisites', 'project-heavy courses', 'exam-heavy semesters'],
    keywords: ['Michigan tutoring', 'UMich tutor', 'Ross tutor', 'Michigan finance tutor'],
    faqs: [
      ['What subjects are common for Michigan tutoring?', 'Common subjects include finance, accounting, economics, math, statistics, writing, and computer science.'],
      ['Can Ross students find business tutors?', 'Yes. Tutors can list support for finance, accounting, Excel, business analytics, and related courses.'],
      ['Is Ask Marketplace useful outside Ross?', 'Yes. The school pages support broad academic tutoring, not only business classes.'],
    ],
  },
  {
    slug: 'ucla',
    name: 'UCLA',
    fullName: 'University of California, Los Angeles',
    location: 'Los Angeles, CA',
    description: 'UCLA students juggle competitive majors, STEM sequences, writing requirements, and packed schedules. Ask Marketplace helps students find tutoring for tough courses and exam prep.',
    strengths: ['economics', 'math', 'statistics', 'pre-med sciences', 'writing', 'business economics'],
    painPoints: ['impacted classes', 'large lectures', 'quarter-system pace', 'exam compression'],
    keywords: ['UCLA tutoring', 'UCLA tutor', 'UCLA economics tutor', 'UCLA math tutor'],
    faqs: [
      ['Why do UCLA students use tutoring?', 'The quarter system moves quickly, so tutoring can help students stay current and prepare before exams.'],
      ['What UCLA subjects fit Ask Marketplace?', 'Economics, math, statistics, writing, science prerequisites, and business economics are strong fits.'],
      ['Can tutors offer remote sessions?', 'Yes. Tutor listings can support online, in-person, or both.'],
    ],
  },
  {
    slug: 'usc',
    name: 'USC',
    fullName: 'University of Southern California',
    location: 'Los Angeles, CA',
    description: 'USC students in Marshall, Dornsife, Viterbi, and other programs can use Ask Marketplace for peer tutoring in business, quantitative courses, writing, and exam prep.',
    strengths: ['Marshall business courses', 'finance', 'accounting', 'economics', 'engineering math', 'writing'],
    painPoints: ['business prerequisites', 'networking and internship schedules', 'technical project load', 'exam preparation'],
    keywords: ['USC tutoring', 'USC tutor', 'Marshall finance tutor', 'USC accounting tutor'],
    faqs: [
      ['What USC programs are strong fits for tutoring?', 'Marshall business, Dornsife economics, Viterbi quantitative courses, writing, and exam prep are strong fits.'],
      ['Can USC students become tutors?', 'Yes. Students can create listings and offer subject-specific tutoring.'],
      ['Does Ask Marketplace support finance tutoring at USC?', 'Yes. Tutors can offer support in finance, accounting, valuation, Excel, and related coursework.'],
    ],
  },
  {
    slug: 'indiana',
    name: 'Indiana',
    fullName: 'Indiana University Bloomington',
    location: 'Bloomington, IN',
    description: 'Indiana students, especially those in Kelley and large prerequisite courses, can use Ask Marketplace to find tutoring for business, economics, math, writing, and exam prep.',
    strengths: ['Kelley business courses', 'accounting', 'finance', 'economics', 'statistics', 'writing'],
    painPoints: ['Kelley prerequisites', 'large intro classes', 'case and project work', 'exam-heavy weeks'],
    keywords: ['Indiana tutoring', 'IU tutor', 'Kelley tutor', 'Indiana accounting tutor'],
    faqs: [
      ['Can Kelley students find tutors?', 'Yes. Tutors can support accounting, finance, economics, statistics, and other business classes.'],
      ['What tutoring helps Indiana students most?', 'Focused help before exams, problem-set review, writing support, and business prerequisite support are common.'],
      ['Can IU students offer tutoring?', 'Yes. Students can list their tutoring services and availability.'],
    ],
  },
  {
    slug: 'ut-austin',
    name: 'UT Austin',
    fullName: 'The University of Texas at Austin',
    location: 'Austin, TX',
    description: 'UT Austin students in McCombs, engineering, economics, math, and writing-intensive courses can use Ask Marketplace to find practical academic support.',
    strengths: ['McCombs business courses', 'finance', 'accounting', 'engineering math', 'economics', 'writing'],
    painPoints: ['competitive majors', 'large lectures', 'technical coursework', 'exam and project overlap'],
    keywords: ['UT Austin tutoring', 'UT tutor', 'McCombs tutor', 'UT Austin finance tutor'],
    faqs: [
      ['What UT Austin subjects can tutors support?', 'Tutors can support finance, accounting, economics, math, writing, statistics, and engineering prerequisites.'],
      ['Is Ask Marketplace only for McCombs?', 'No. McCombs is a strong fit, but the platform supports students across majors.'],
      ['Can UT Austin students book tutoring quickly?', 'Students can browse listings, compare subjects, and book based on tutor availability.'],
    ],
  },
  {
    slug: 'rutgers',
    name: 'Rutgers',
    fullName: 'Rutgers University',
    location: 'New Brunswick, NJ',
    description: 'Rutgers students across business, economics, STEM, writing, and large prerequisite courses can use Ask Marketplace to find peer tutoring that fits their schedule.',
    strengths: ['business courses', 'accounting', 'finance', 'economics', 'statistics', 'writing'],
    painPoints: ['multi-campus schedules', 'large lectures', 'commuting between classes', 'exam-heavy prerequisites'],
    keywords: ['Rutgers tutoring', 'Rutgers tutor', 'Rutgers accounting tutor', 'Rutgers finance tutor'],
    faqs: [
      ['What Rutgers tutoring subjects are supported?', 'Accounting, finance, economics, math, statistics, writing, and exam prep are all strong fits.'],
      ['Can Rutgers students find tutors by subject?', 'Yes. School pages connect students to subject-focused tutoring paths.'],
      ['Can Rutgers students become tutors?', 'Yes. Students can create listings and offer help in courses they know well.'],
    ],
  },
  {
    slug: 'northeastern',
    name: 'Northeastern',
    fullName: 'Northeastern University',
    location: 'Boston, MA',
    description: 'Northeastern students often balance co-ops, classes, and project work. Ask Marketplace helps them find tutoring for business, economics, math, writing, and technical courses.',
    strengths: ['D’Amore-McKim business courses', 'finance', 'accounting', 'economics', 'computer science', 'writing'],
    painPoints: ['co-op schedule conflicts', 'project-based classes', 'fast semesters', 'quantitative prerequisites'],
    keywords: ['Northeastern tutoring', 'Northeastern tutor', 'D’Amore-McKim tutor', 'Northeastern finance tutor'],
    faqs: [
      ['Why is tutoring useful for Northeastern students?', 'Co-op and class schedules can be demanding, so focused peer help can keep coursework manageable.'],
      ['What Northeastern subjects fit Ask Marketplace?', 'Business, accounting, finance, economics, math, writing, and computer science all fit well.'],
      ['Can tutoring work around co-op schedules?', 'Tutors can set availability that works for evenings, weekends, or remote sessions.'],
    ],
  },
  {
    slug: 'bu',
    name: 'BU',
    fullName: 'Boston University',
    location: 'Boston, MA',
    description: 'BU students in Questrom, CAS, engineering, communications, and writing-heavy courses can use Ask Marketplace to find tutors for challenging classes and exam prep.',
    strengths: ['Questrom business courses', 'finance', 'accounting', 'economics', 'statistics', 'writing'],
    painPoints: ['large courses', 'business core workload', 'writing requirements', 'exam clusters'],
    keywords: ['BU tutoring', 'Boston University tutor', 'Questrom tutor', 'BU finance tutor'],
    faqs: [
      ['What BU programs are strong fits for tutoring?', 'Questrom business, economics, statistics, writing, math, and exam prep are strong fits.'],
      ['Can BU students offer peer tutoring?', 'Yes. Students can create tutor listings and accept bookings.'],
      ['Does Ask Marketplace support writing help at BU?', 'Yes. Tutors can help with structure, outlines, research papers, and revision.'],
    ],
  },
  {
    slug: 'uf',
    name: 'UF',
    fullName: 'University of Florida',
    location: 'Gainesville, FL',
    description: 'UF students across business, economics, STEM, writing, and exam-heavy majors can use Ask Marketplace to connect with peer tutors who understand college coursework.',
    strengths: ['Warrington business courses', 'accounting', 'finance', 'economics', 'math', 'pre-health sciences'],
    painPoints: ['large lectures', 'competitive prerequisites', 'STEM sequences', 'exam-heavy semesters'],
    keywords: ['UF tutoring', 'University of Florida tutor', 'UF accounting tutor', 'UF finance tutor'],
    faqs: [
      ['What UF subjects can tutors help with?', 'Tutors can support accounting, finance, economics, math, writing, science prerequisites, and exam prep.'],
      ['Can Warrington students find tutoring?', 'Yes. Business subjects like finance, accounting, and economics are core marketplace use cases.'],
      ['Can UF students become tutors?', 'Yes. Students can create listings and help peers in courses they know well.'],
    ],
  },
  {
    slug: 'fsu',
    name: 'FSU',
    fullName: 'Florida State University',
    location: 'Tallahassee, FL',
    description: 'FSU students in business, economics, math, writing, and science prerequisites can use Ask Marketplace to find focused tutoring and exam prep support.',
    strengths: ['business courses', 'finance', 'accounting', 'economics', 'statistics', 'writing'],
    painPoints: ['large classes', 'business prerequisites', 'exam prep pressure', 'writing-heavy requirements'],
    keywords: ['FSU tutoring', 'Florida State tutor', 'FSU accounting tutor', 'FSU finance tutor'],
    faqs: [
      ['What FSU subjects are best for tutoring?', 'Accounting, finance, economics, math, statistics, writing, and exam prep are strong fits.'],
      ['Can FSU students tutor other students?', 'Yes. Students can list subjects, availability, and session type.'],
      ['How can tutoring help before exams?', 'Tutors can review problem areas, organize practice, and help students focus study time.'],
    ],
  },
  {
    slug: 'yeshiva-university',
    name: 'Yeshiva University',
    fullName: 'Yeshiva University',
    location: 'New York, NY',
    description: 'Yeshiva University students can use Ask Marketplace to find trusted peer tutoring for Sy Syms business courses, accounting, finance, economics, math, writing, and exam prep.',
    strengths: ['Sy Syms business courses', 'accounting', 'finance', 'economics', 'math', 'writing'],
    painPoints: ['dual curriculum schedules', 'business prerequisites', 'tight exam windows', 'commuter and campus scheduling'],
    keywords: ['Yeshiva University tutoring', 'YU tutor', 'Sy Syms tutor', 'YU accounting tutor', 'YU finance tutor'],
    faqs: [
      ['How do Yeshiva University students find tutors on Ask Marketplace?', 'Students can browse tutors by subject, compare profiles, and book help for accounting, finance, economics, math, writing, and exam prep.'],
      ['Can YU students offer tutoring on Ask Marketplace?', 'Yes. Students who are strong in a subject can create a tutor listing and share availability for other students to book.'],
      ['What subjects are available for Yeshiva University tutoring?', 'Ask Marketplace supports tutoring for accounting, finance, economics, math, writing, exam prep, and other college courses.'],
    ],
  },
];

export function getSchoolBySlug(slug) {
  return schools.find((school) => school.slug === slug);
}

export function getSchoolSeoSubjectBySlug(slug) {
  return schoolSeoSubjects.find((subject) => subject.slug === slug);
}

export function schoolUrl(slug) {
  return `/schools/${slug}`;
}

export function schoolSubjectUrl(schoolSlug, subjectSlug) {
  return `/schools/${schoolSlug}/${subjectSlug}`;
}

export function schoolSubjectUrls() {
  return schools.flatMap((school) =>
    schoolSeoSubjects.map((subject) => schoolSubjectUrl(school.slug, subject.slug))
  );
}
