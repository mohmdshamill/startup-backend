import { PrismaClient, Role, ApplicationStatus, StartupStage, TaskStatus, TaskPriority } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ADMIN_PASSWORD = 'Admin@9072'
const DEFAULT_PASSWORD = 'Test@1234'

const USERS = [
  { email: 'admin@startupconnect.com', name: 'System Admin', role: Role.ADMIN, password: ADMIN_PASSWORD, bio: 'Platform administrator.', location: 'Kochi, Kerala' },
  { email: 'founder1@startupconnect.com', name: 'Anjali Menon', role: Role.FOUNDER, bio: 'Serial founder building AgriTech products.', skills: ['Product', 'Strategy', 'Fundraising'], location: 'Kochi, Kerala' },
  { email: 'founder2@startupconnect.com', name: 'Rahul Nair', role: Role.FOUNDER, bio: 'Founder focused on health and wellness technology.', skills: ['Business', 'Operations'], location: 'Thiruvananthapuram, Kerala' },
  { email: 'investor1@startupconnect.com', name: 'Vikram Shah', role: Role.INVESTOR, bio: 'Angel investor backing early-stage Indian startups.', location: 'Bengaluru, Karnataka' },
  { email: 'developer1@startupconnect.com', name: 'Arjun Das', role: Role.DEVELOPER, bio: 'Full stack developer, 4 years of experience.', skills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript'], githubUrl: 'https://github.com/arjun-das', location: 'Kozhikode, Kerala' },
  { email: 'designer1@startupconnect.com', name: 'Meera Pillai', role: Role.DESIGNER, bio: 'Product designer focused on mobile UX.', skills: ['Figma', 'UI/UX', 'Branding'], location: 'Kochi, Kerala' },
  { email: 'mentor1@startupconnect.com', name: 'Dr. Suresh Kumar', role: Role.MENTOR, bio: 'Startup mentor and former CTO with 20 years of experience.', skills: ['Mentoring', 'Architecture', 'Go-to-market'], location: 'Chennai, Tamil Nadu' },
  { email: 'user@startupconnect.com', name: 'Sneha Joseph', role: Role.DEVELOPER, bio: 'Recent graduate looking for a startup to join.', skills: ['Python', 'Data Analysis'], location: 'Thrissur, Kerala' },
]

const STARTUPS = [
  {
    founderEmail: 'founder1@startupconnect.com',
    title: 'FarmLink',
    tagline: 'Connecting farmers directly to buyers',
    description:
      'FarmLink is a mobile marketplace that lets small farmers in Kerala sell produce directly to restaurants and retailers, with transparent pricing and logistics support.',
    category: 'AgriTech',
    stage: StartupStage.MVP,
    requiredSkills: ['React Native', 'Node.js', 'UI/UX', 'Growth Marketing'],
    targetMarket: 'Small farmers and urban retailers in South India',
    teamSize: 3,
    isVerified: true,
  },
  {
    founderEmail: 'founder2@startupconnect.com',
    title: 'MediTrack',
    tagline: 'Simple health records for every family',
    description:
      "MediTrack stores a family's prescriptions, reports and appointment reminders in one secure app, and shares them with doctors in one tap.",
    category: 'HealthTech',
    stage: StartupStage.PROTOTYPE,
    requiredSkills: ['Flutter', 'Python', 'Product Design'],
    targetMarket: 'Urban families and clinics',
    teamSize: 2,
    isVerified: false,
  },
]

async function main() {
  console.log('Seeding database...')

  // ── Users ──────────────────────────────────────────────────────────────
  const users: Record<string, { id: string; name: string }> = {}
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password ?? DEFAULT_PASSWORD, 10)
    const { password: _password, ...rest } = u as any
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { password: hash, role: u.role, name: u.name, isActive: true },
      create: { ...rest, password: hash },
    })
    users[u.email] = { id: user.id, name: user.name }
  }

  // ── Startups ───────────────────────────────────────────────────────────
  const startups: Record<string, string> = {}
  for (const s of STARTUPS) {
    const { founderEmail, ...data } = s
    const founderId = users[founderEmail].id
    const existing = await prisma.startupIdea.findFirst({ where: { founderId, title: s.title } })
    const startup = existing ?? (await prisma.startupIdea.create({ data: { ...data, founderId } }))
    startups[s.title] = startup.id
  }
  const farmLink = startups['FarmLink']
  const mediTrack = startups['MediTrack']

  // ── Team applications ──────────────────────────────────────────────────
  const teamApps = [
    { startup: farmLink, who: 'developer1@startupconnect.com', role: 'Full Stack Developer', pitch: 'I have built two marketplace apps with React and Node.js and would love to own the FarmLink backend and mobile app.', skills: ['React', 'Node.js', 'PostgreSQL'], hours: 25, status: ApplicationStatus.ACCEPTED, feedback: 'Welcome aboard! Your experience is exactly what we need.' },
    { startup: farmLink, who: 'designer1@startupconnect.com', role: 'Lead UI/UX & Product Designer', pitch: 'I design mobile-first products for non-technical users and can shape the FarmLink experience end to end.', skills: ['Figma', 'UI/UX'], hours: 20, status: ApplicationStatus.SHORTLISTED, feedback: null },
    { startup: mediTrack, who: 'user@startupconnect.com', role: 'Backend Node / Python Engineer', pitch: 'I am a recent graduate with strong Python skills and want to help build the MediTrack backend and reports parser.', skills: ['Python', 'Data Analysis'], hours: 30, status: ApplicationStatus.PENDING, feedback: null },
    { startup: mediTrack, who: 'mentor1@startupconnect.com', role: 'Advisor / Mentor', pitch: 'I can advise on architecture, data privacy and early go-to-market for health products.', skills: ['Mentoring', 'Architecture'], hours: 5, status: ApplicationStatus.REVIEWING, feedback: null },
  ]
  for (const a of teamApps) {
    const candidateId = users[a.who].id
    const data = {
      roleApplied: a.role,
      pitchMessage: a.pitch,
      skills: a.skills,
      availabilityHoursPerWeek: a.hours,
      status: a.status,
      founderFeedback: a.feedback,
      reviewedAt: a.status === ApplicationStatus.PENDING ? null : new Date(),
    }
    await prisma.teamApplication.upsert({
      where: { startupIdeaId_candidateId: { startupIdeaId: a.startup, candidateId } },
      update: data,
      create: { startupIdeaId: a.startup, candidateId, ...data },
    })
  }

  // ── Investor applications & favorites ──────────────────────────────────
  const investorId = users['investor1@startupconnect.com'].id
  const investorApps = [
    { startup: farmLink, amount: 500000, status: ApplicationStatus.ACCEPTED, message: 'I invest in agritech and believe FarmLink can reach thousands of farmers. I would like to put in a seed amount and help with distribution contacts.', feedback: 'Thank you Vikram, we are excited to have you.' },
    { startup: mediTrack, amount: 250000, status: ApplicationStatus.PENDING, message: 'Healthcare records are a strong market. I want to back MediTrack at the prototype stage and support the team.', feedback: null },
  ]
  for (const a of investorApps) {
    const exists = await prisma.investorApplication.findFirst({ where: { startupIdeaId: a.startup, investorId } })
    if (!exists) {
      await prisma.investorApplication.create({
        data: {
          startupIdeaId: a.startup,
          investorId,
          pitchMessage: a.message,
          investmentAmount: a.amount,
          currency: 'INR',
          status: a.status,
          founderFeedback: a.feedback,
          reviewedAt: a.status === ApplicationStatus.PENDING ? null : new Date(),
        },
      })
    }
  }
  for (const startupIdeaId of [farmLink, mediTrack]) {
    await prisma.investorFavorite.upsert({
      where: { investorId_startupIdeaId: { investorId, startupIdeaId } },
      update: {},
      create: { investorId, startupIdeaId },
    })
  }

  // ── Team workspace data (only if the startup has none yet) ─────────────
  const founder1 = users['founder1@startupconnect.com'].id
  const developer = users['developer1@startupconnect.com'].id

  if ((await prisma.startupAnnouncement.count({ where: { startupIdeaId: farmLink } })) === 0) {
    await prisma.startupAnnouncement.create({
      data: { startupIdeaId: farmLink, authorId: founder1, title: 'Welcome to the FarmLink team', content: 'Kick-off call on Monday at 10 AM. Please review the product brief before then.', priority: 'IMPORTANT', isPinned: true },
    })
  }
  if ((await prisma.startupNote.count({ where: { startupIdeaId: farmLink } })) === 0) {
    await prisma.startupNote.create({
      data: { startupIdeaId: farmLink, authorId: founder1, title: 'MVP scope', content: 'Farmer onboarding, product listing, buyer ordering, and basic payments. Logistics comes in phase 2.', color: 'blue', isPinned: true, tags: ['mvp', 'planning'] },
    })
  }
  if ((await prisma.task.count({ where: { startupIdeaId: farmLink } })) === 0) {
    const tasks = [
      { title: 'Design farmer onboarding flow', status: TaskStatus.COMPLETED, priority: TaskPriority.HIGH, progress: 100, tags: ['design'] },
      { title: 'Build product listing API', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, progress: 60, tags: ['backend'] },
      { title: 'Set up payment gateway', status: TaskStatus.PENDING, priority: TaskPriority.MEDIUM, progress: 0, tags: ['backend', 'payments'] },
    ]
    for (const t of tasks) {
      const task = await prisma.task.create({
        data: { ...t, startupIdeaId: farmLink, creatorId: founder1, deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
      })
      await prisma.taskAssignee.create({ data: { taskId: task.id, userId: developer } })
    }
  }

  // ── Notifications ──────────────────────────────────────────────────────
  if ((await prisma.notification.count({ where: { userId: founder1 } })) === 0) {
    await prisma.notification.createMany({
      data: [
        { userId: founder1, type: 'APPLICATION_RECEIVED', title: 'New Applicant for FarmLink', message: 'Meera Pillai applied for the role "Lead UI/UX & Product Designer".' },
        { userId: founder1, type: 'INVESTOR_APPLICATION_RECEIVED', title: 'New Investor Interest: FarmLink', message: 'Vikram Shah applied to invest INR 5,00,000 in "FarmLink".' },
        { userId: users['founder2@startupconnect.com'].id, type: 'INVESTOR_APPLICATION_RECEIVED', title: 'New Investor Interest: MediTrack', message: 'Vikram Shah applied to invest INR 2,50,000 in "MediTrack".' },
        { userId: investorId, type: 'STATUS_ACCEPTED', title: 'Investment Application ACCEPTED: FarmLink', message: 'The founder of "FarmLink" accepted your investor application.' },
      ],
    })
  }

  // ── Report (so the admin dashboard has data) ───────────────────────────
  if ((await prisma.report.count()) === 0) {
    await prisma.report.create({
      data: { reporterId: users['user@startupconnect.com'].id, targetType: 'STARTUP', targetId: mediTrack, reason: 'Needs verification', details: 'Sample report so the admin dashboard has data.', status: 'PENDING' },
    })
  }

  console.log('\nSeed complete. Login accounts:\n')
  console.table(USERS.map((u) => ({ role: u.role, email: u.email, password: u.password ?? DEFAULT_PASSWORD })))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
