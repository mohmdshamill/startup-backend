import { Request, Response } from 'express'
import prisma from '../config/db'
import { AuthRequest } from '../middleware/authMiddleware'
import { Role } from '@prisma/client'

export const toggleFavoriteStartup = async (req: AuthRequest, res: Response) => {
  try {
    const investorId = req.user?.id
    const { startupIdeaId } = req.body

    if (!investorId || !startupIdeaId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const existing = await prisma.investorFavorite.findUnique({
      where: {
        investorId_startupIdeaId: { investorId, startupIdeaId },
      },
    })

    if (existing) {
      await prisma.investorFavorite.delete({ where: { id: existing.id } })
      return res.status(200).json({ message: 'Startup removed from favorites', isFavorite: false })
    }

    await prisma.investorFavorite.create({
      data: { investorId, startupIdeaId },
    })
    return res.status(201).json({ message: 'Startup added to favorites', isFavorite: true })
  } catch (error) {
    console.error('Error toggling favorite:', error)
    return res.status(500).json({ error: 'Failed to toggle favorite status' })
  }
}

export const getInvestorFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const investorId = req.user?.id
    if (!investorId) return res.status(401).json({ error: 'Unauthorized' })

    const favorites = await prisma.investorFavorite.findMany({
      where: { investorId },
      include: {
        startupIdea: {
          include: {
            founder: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return res.status(200).json({ favorites })
  } catch (error) {
    console.error('Error fetching favorites:', error)
    return res.status(500).json({ error: 'Failed to fetch favorites' })
  }
}

export const getStartupsForInvestors = async (req: AuthRequest, res: Response) => {
  try {
    const investorId = req.user?.id
    if (!investorId) return res.status(401).json({ error: 'Unauthorized' })

    const { category, stage, search } = req.query

    const whereClause: any = { isActive: true }
    if (category) whereClause.category = String(category)
    if (stage) whereClause.stage = String(stage)
    if (search) {
      whereClause.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
        { tagline: { contains: String(search), mode: 'insensitive' } },
      ]
    }

    const startups = await prisma.startupIdea.findMany({
      where: whereClause,
      include: {
        founder: {
          select: { id: true, name: true, avatar: true, email: true, linkedinUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get favorites to map "isFavorite"
    const favorites = await prisma.investorFavorite.findMany({
      where: { investorId },
      select: { startupIdeaId: true },
    })
    const favoriteSet = new Set(favorites.map((f) => f.startupIdeaId))

    const mappedStartups = startups.map((s) => ({
      ...s,
      isFavorite: favoriteSet.has(s.id),
    }))

    return res.status(200).json({ startups: mappedStartups })
  } catch (error) {
    console.error('Error fetching startups for investors:', error)
    return res.status(500).json({ error: 'Failed to fetch startups' })
  }
}
