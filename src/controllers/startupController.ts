import { Request, Response } from 'express'
import prisma from '../config/db'
import { AuthRequest } from '../middleware/authMiddleware'
import { StartupStage, Role } from '@prisma/client'

export const STARTUP_CATEGORIES = [
  'FinTech',
  'HealthTech',
  'EdTech',
  'AgriTech',
  'AI & ML',
  'CleanTech & Sustainability',
  'SaaS & Enterprise',
  'Tourism & Hospitality',
  'Logistics & Supply Chain',
  'E-Commerce & Retail',
  'DeepTech & Hardware',
  'Social Impact',
] as const

export const STARTUP_STAGES = [
  { value: 'IDEATION', label: 'Ideation', desc: 'Concept, market research & validation', icon: '💡' },
  { value: 'PROTOTYPE', label: 'Prototype', desc: 'Wireframes, designs & proof of concept', icon: '🛠️' },
  { value: 'MVP', label: 'MVP', desc: 'Minimum Viable Product with core functionality', icon: '🚀' },
  { value: 'EARLY_TRACTION', label: 'Early Traction', desc: 'Beta users, customer feedback & initial revenue', icon: '📈' },
  { value: 'SCALING', label: 'Scaling', desc: 'Rapid market expansion & team scaling', icon: '🏢' },
] as const

// 1. Get Startup Metadata (Categories, Stages, Skill Presets)
export const getStartupMetadata = async (_req: Request, res: Response) => {
  return res.status(200).json({
    categories: STARTUP_CATEGORIES,
    stages: STARTUP_STAGES,
    suggestedSkills: [
      'React',
      'TypeScript',
      'Node.js',
      
      'Python',
      'TailwindCSS',
      'PostgreSQL',
      'Docker',
      'AWS',
      'UI/UX Design',
      'Next.js',
      'FastAPI',
      'Flutter',
      'Mobile Development',
      'Machine Learning',
      'Data Science',
      'Product Management',
      'Growth Marketing',
      'Business Development',
      'DevOps',
      'Cybersecurity',
    ],
  })
}

// 2. Create Startup Idea (Founders and Admins only)
export const createStartupIdea = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated: Please log in' })
    }

    if (req.user.role !== Role.FOUNDER && req.user.role !== Role.ADMIN) {
      return res.status(403).json({
        error: 'Forbidden: Only users with the FOUNDER role can create startup ideas.',
      })
    }

    const {
      title,
      tagline,
      description,
      category,
      stage,
      requiredSkills,
      targetMarket,
      websiteUrl,
      pitchDeckUrl,
      teamSize,
    } = req.body

    // Validations
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Startup title is required' })
    }
    if (!tagline || typeof tagline !== 'string' || !tagline.trim()) {
      return res.status(400).json({ error: 'Tagline is required' })
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Detailed description is required' })
    }
    if (!category || typeof category !== 'string' || !category.trim()) {
      return res.status(400).json({ error: 'Category selection is required' })
    }

    const validStages = Object.values(StartupStage)
    const selectedStage = stage && validStages.includes(stage) ? (stage as StartupStage) : StartupStage.IDEATION

    const skillsArray = Array.isArray(requiredSkills)
      ? requiredSkills.map((s: string) => String(s).trim()).filter(Boolean)
      : []

    const startup = await prisma.startupIdea.create({
      data: {
        founderId: req.user.id,
        title: title.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        category: category.trim(),
        stage: selectedStage,
        requiredSkills: skillsArray,
        targetMarket: targetMarket ? String(targetMarket).trim() : null,
        websiteUrl: websiteUrl ? String(websiteUrl).trim() : null,
        pitchDeckUrl: pitchDeckUrl ? String(pitchDeckUrl).trim() : null,
        teamSize: teamSize ? Number(teamSize) : 1,
        isActive: true,
      },
      include: {
        founder: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            location: true,
          },
        },
      },
    })

    return res.status(201).json({
      message: 'Startup idea published successfully!',
      startup,
    })
  } catch (error: any) {
    console.error('Error creating startup idea:', error)
    return res.status(500).json({ error: 'Failed to create startup idea', details: error.message })
  }
}

// 3. Get Authenticated Founder's Startup Ideas
export const getMyStartupIdeas = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' })
    }

    const startups = await prisma.startupIdea.findMany({
      where: { founderId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        founder: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            location: true,
          },
        },
      },
    })

    return res.status(200).json({ startups })
  } catch (error: any) {
    console.error('Error fetching founder startups:', error)
    return res.status(500).json({ error: 'Failed to fetch your startup ideas' })
  }
}

// 4. Get All Startup Ideas (Public/Explore with Filters)
export const getAllStartupIdeas = async (req: Request, res: Response) => {
  try {
    const { category, stage, search, skill } = req.query

    const where: any = { isActive: true }

    if (category && typeof category === 'string' && category !== 'ALL') {
      where.category = category
    }

    if (stage && typeof stage === 'string' && stage !== 'ALL') {
      where.stage = stage as StartupStage
    }

    if (skill && typeof skill === 'string') {
      where.requiredSkills = {
        has: skill,
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim()
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { tagline: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ]
    }

    const startups = await prisma.startupIdea.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        founder: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            location: true,
          },
        },
      },
    })

    return res.status(200).json({ startups })
  } catch (error: any) {
    console.error('Error fetching all startup ideas:', error)
    return res.status(500).json({ error: 'Failed to load startup ideas' })
  }
}

// 5. Get Single Startup Idea by ID
export const getStartupIdeaById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const startup = await prisma.startupIdea.findUnique({
      where: { id },
      include: {
        founder: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            location: true,
            bio: true,
            linkedinUrl: true,
            website: true,
          },
        },
      },
    })

    if (!startup) {
      return res.status(404).json({ error: 'Startup idea not found' })
    }

    return res.status(200).json({ startup })
  } catch (error: any) {
    console.error('Error fetching startup idea details:', error)
    return res.status(500).json({ error: 'Failed to retrieve startup details' })
  }
}

// 6. Update Startup Details (Owner or Admin)
export const updateStartupIdea = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' })
    }

    const { id } = req.params
    const existing = await prisma.startupIdea.findUnique({
      where: { id },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Startup idea not found' })
    }

    // Verify ownership or ADMIN role
    if (existing.founderId !== req.user.id && req.user.role !== Role.ADMIN) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to edit this startup idea.' })
    }

    const {
      title,
      tagline,
      description,
      category,
      stage,
      requiredSkills,
      targetMarket,
      websiteUrl,
      pitchDeckUrl,
      teamSize,
      isActive,
    } = req.body

    const updateData: any = {}

    if (title !== undefined) updateData.title = String(title).trim()
    if (tagline !== undefined) updateData.tagline = String(tagline).trim()
    if (description !== undefined) updateData.description = String(description).trim()
    if (category !== undefined) updateData.category = String(category).trim()

    if (stage !== undefined) {
      const validStages = Object.values(StartupStage)
      if (validStages.includes(stage)) {
        updateData.stage = stage as StartupStage
      }
    }

    if (requiredSkills !== undefined && Array.isArray(requiredSkills)) {
      updateData.requiredSkills = requiredSkills.map((s: string) => String(s).trim()).filter(Boolean)
    }

    if (targetMarket !== undefined) updateData.targetMarket = targetMarket ? String(targetMarket).trim() : null
    if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl ? String(websiteUrl).trim() : null
    if (pitchDeckUrl !== undefined) updateData.pitchDeckUrl = pitchDeckUrl ? String(pitchDeckUrl).trim() : null
    if (teamSize !== undefined) updateData.teamSize = Number(teamSize)
    if (isActive !== undefined) updateData.isActive = Boolean(isActive)

    const updated = await prisma.startupIdea.update({
      where: { id },
      data: updateData,
      include: {
        founder: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            location: true,
          },
        },
      },
    })

    return res.status(200).json({
      message: 'Startup details updated successfully',
      startup: updated,
    })
  } catch (error: any) {
    console.error('Error updating startup idea:', error)
    return res.status(500).json({ error: 'Failed to update startup idea' })
  }
}

// 7. Delete Startup Idea (Owner or Admin)
export const deleteStartupIdea = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' })
    }

    const { id } = req.params
    const existing = await prisma.startupIdea.findUnique({
      where: { id },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Startup idea not found' })
    }

    // Verify ownership or ADMIN role
    if (existing.founderId !== req.user.id && req.user.role !== Role.ADMIN) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this startup idea.' })
    }

    await prisma.startupIdea.delete({
      where: { id },
    })

    return res.status(200).json({ message: 'Startup idea deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting startup idea:', error)
    return res.status(500).json({ error: 'Failed to delete startup idea' })
  }
}
