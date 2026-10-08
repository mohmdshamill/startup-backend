import { Response } from 'express'
import prisma from '../config/db'
import { AuthRequest } from '../middleware/authMiddleware'

/**
 * Sync user's existing applications and status changes to ensure notifications exist
 */
async function syncUserNotifications(userId: string) {
  try {
    // 1. Candidate's applications
    const candidateApps = await prisma.teamApplication.findMany({
      where: { candidateId: userId },
      include: {
        startupIdea: {
          select: { id: true, title: true },
        },
      },
    })

    for (const app of candidateApps) {
      const type = `STATUS_${app.status}`
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          type,
          title: { contains: app.startupIdea.title },
        },
      })

      if (!existing) {
        let title = `Application Update: ${app.startupIdea.title}`
        let message = `Your application for "${app.roleApplied}" at "${app.startupIdea.title}" is ${app.status.toLowerCase()}.`

        if (app.status === 'ACCEPTED') {
          title = `🎉 Application Accepted: ${app.startupIdea.title}`
          message = `Congratulations! The founder of "${app.startupIdea.title}" has accepted your application for the role "${app.roleApplied}".${app.founderFeedback ? ` Note: "${app.founderFeedback}"` : ''}`
        } else if (app.status === 'SHORTLISTED') {
          title = `⭐ Shortlisted: ${app.startupIdea.title}`
          message = `Good news! You have been shortlisted for "${app.roleApplied}" at "${app.startupIdea.title}".${app.founderFeedback ? ` Note: "${app.founderFeedback}"` : ''}`
        } else if (app.status === 'REVIEWING') {
          title = `👀 Under Review: ${app.startupIdea.title}`
          message = `The founder is reviewing your application for "${app.roleApplied}" at "${app.startupIdea.title}".`
        } else if (app.status === 'REJECTED') {
          title = `Application Status: ${app.startupIdea.title}`
          message = `Your application for "${app.roleApplied}" at "${app.startupIdea.title}" was not selected at this time.${app.founderFeedback ? ` Note: "${app.founderFeedback}"` : ''}`
        } else if (app.status === 'PENDING') {
          title = `Application Submitted: ${app.startupIdea.title}`
          message = `Your application for "${app.roleApplied}" at "${app.startupIdea.title}" was submitted and is pending review.`
        }

        await prisma.notification.create({
          data: {
            userId,
            type,
            title,
            message,
            link: '/recruitment',
            createdAt: app.reviewedAt || app.createdAt,
          },
        })
      }
    }

    // 2. Founder's received applications
    const founderStartups = await prisma.startupIdea.findMany({
      where: { founderId: userId },
      select: { id: true, title: true },
    })

    if (founderStartups.length > 0) {
      const founderStartupIds = founderStartups.map((s) => s.id)
      const receivedApps = await prisma.teamApplication.findMany({
        where: {
          startupIdeaId: { in: founderStartupIds },
        },
        include: {
          candidate: { select: { name: true } },
          startupIdea: { select: { title: true } },
        },
      })

      for (const rApp of receivedApps) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId,
            type: 'APPLICATION_RECEIVED',
            title: { contains: rApp.startupIdea.title },
            message: { contains: rApp.candidate.name },
          },
        })

        if (!existing) {
          await prisma.notification.create({
            data: {
              userId,
              type: 'APPLICATION_RECEIVED',
              title: `New Applicant for ${rApp.startupIdea.title}`,
              message: `${rApp.candidate.name} applied for "${rApp.roleApplied}" in your startup "${rApp.startupIdea.title}".`,
              link: '/recruitment',
              createdAt: rApp.createdAt,
            },
          })
        }
      }
    }
  } catch (err) {
    console.error('Error syncing notifications:', err)
  }
}

/**
 * 1. Get current user's notifications
 * GET /api/notifications
 */
export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized. Please sign in.' })
    }

    // Auto-sync any existing applications
    await syncUserNotifications(userId)

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    })

    return res.status(200).json({
      notifications,
      unreadCount,
    })
  } catch (err: any) {
    console.error('Error fetching notifications:', err)
    return res.status(500).json({ error: err.message || 'Failed to fetch notifications.' })
  }
}

/**
 * 2. Get unread notifications count
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' })
    }

    // Auto-sync any existing applications
    await syncUserNotifications(userId)

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    })

    return res.status(200).json({ unreadCount })
  } catch (err: any) {
    console.error('Error counting unread notifications:', err)
    return res.status(500).json({ error: err.message || 'Failed to get unread count.' })
  }
}

/**
 * 3. Mark single notification as read
 * PATCH /api/notifications/:id/read
 */
export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const { id } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' })
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
    })

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' })
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden.' })
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    })

    return res.status(200).json({
      message: 'Notification marked as read.',
      notification: updated,
    })
  } catch (err: any) {
    console.error('Error marking notification as read:', err)
    return res.status(500).json({ error: err.message || 'Failed to update notification.' })
  }
}

/**
 * 4. Mark all notifications as read for current user
 * PATCH /api/notifications/read-all
 */
export const markAllNotificationsAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' })
    }

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })

    return res.status(200).json({
      message: 'All notifications marked as read.',
    })
  } catch (err: any) {
    console.error('Error marking all notifications as read:', err)
    return res.status(500).json({ error: err.message || 'Failed to update notifications.' })
  }
}
