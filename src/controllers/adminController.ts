import { Response } from 'express'
import { Role } from '@prisma/client'
import prisma from '../config/db'
import { AuthRequest } from '../middleware/authMiddleware'

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.query

    let whereClause = {}
    if (role && Object.values(Role).includes(role as Role)) {
      whereClause = { role: role as Role }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        bio: true,
        skills: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return res.status(200).json({ count: users.length, users })
  } catch (error: any) {
    console.error('Admin getAllUsers error:', error)
    return res.status(500).json({ error: 'Failed to fetch users list' })
  }
}

export const updateUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { role } = req.body

    if (!role || !Object.values(Role).includes(role as Role)) {
      return res.status(400).json({
        error: `Invalid role specified. Allowed values: ${Object.values(Role).join(', ')}`,
      })
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: role as Role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return res.status(200).json({
      message: `User role updated successfully to ${role}`,
      user: updatedUser,
    })
  } catch (error: any) {
    console.error('Admin updateUserRole error:', error)
    return res.status(500).json({ error: 'Failed to update user role' })
  }
}

export const toggleUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { isActive } = req.body

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean value' })
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    })

    return res.status(200).json({
      message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser,
    })
  } catch (error: any) {
    console.error('Admin toggleUserStatus error:', error)
    return res.status(500).json({ error: 'Failed to update user account status' })
  }
}

export const getAdminStats = async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count()
    const foundersCount = await prisma.user.count({ where: { role: Role.FOUNDER } })
    const developersCount = await prisma.user.count({ where: { role: Role.DEVELOPER } })
    const designersCount = await prisma.user.count({ where: { role: Role.DESIGNER } })
    const investorsCount = await prisma.user.count({ where: { role: Role.INVESTOR } })
    const mentorsCount = await prisma.user.count({ where: { role: Role.MENTOR } })
    const adminsCount = await prisma.user.count({ where: { role: Role.ADMIN } })

    const totalStartups = await prisma.startupIdea.count()
    const verifiedStartups = await prisma.startupIdea.count({ where: { isVerified: true } })
    const totalReports = await prisma.report.count()
    const pendingReports = await prisma.report.count({ where: { status: 'PENDING' } })

    return res.status(200).json({
      stats: {
        totalUsers,
        founders: foundersCount,
        developers: developersCount,
        designers: designersCount,
        investors: investorsCount,
        mentors: mentorsCount,
        admins: adminsCount,
        totalStartups,
        verifiedStartups,
        totalReports,
        pendingReports,
      },
    })
  } catch (error: any) {
    console.error('Admin stats error:', error)
    return res.status(500).json({ error: 'Failed to compute admin stats' })
  }
}

export const getAllStartupsAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const startups = await prisma.startupIdea.findMany({
      include: {
        founder: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return res.status(200).json({ startups })
  } catch (error) {
    console.error('getAllStartupsAdmin error:', error)
    return res.status(500).json({ error: 'Failed to fetch startups' })
  }
}

export const toggleStartupVerification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { isVerified } = req.body

    const updated = await prisma.startupIdea.update({
      where: { id },
      data: { isVerified },
    })

    return res.status(200).json({ message: 'Startup verification toggled', startup: updated })
  } catch (error) {
    console.error('toggleStartupVerification error:', error)
    return res.status(500).json({ error: 'Failed to toggle verification' })
  }
}

export const getAllReports = async (req: AuthRequest, res: Response) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        reporter: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return res.status(200).json({ reports })
  } catch (error) {
    console.error('getAllReports error:', error)
    return res.status(500).json({ error: 'Failed to fetch reports' })
  }
}

export const updateReportStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const updated = await prisma.report.update({
      where: { id },
      data: { status },
    })

    return res.status(200).json({ message: 'Report status updated', report: updated })
  } catch (error) {
    console.error('updateReportStatus error:', error)
    return res.status(500).json({ error: 'Failed to update report status' })
  }
}
