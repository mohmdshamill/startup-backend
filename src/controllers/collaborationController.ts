import { Response } from 'express'
import fs from 'fs'
import path from 'path'
import prisma, { ApplicationStatus } from '../config/db'
import { AuthRequest } from '../middleware/authMiddleware'

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads/startup-files')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

/**
 * Helper to check if a user has access to a startup's collaboration workspace
 */
export const checkStartupAccess = async (startupIdeaId: string, userId: string, userRole?: string) => {
  if (userRole === 'ADMIN') {
    const startup = await prisma.startupIdea.findUnique({
      where: { id: startupIdeaId },
      include: {
        founder: {
          select: { id: true, name: true, email: true, role: true, avatar: true, phone: true, linkedinUrl: true },
        },
      },
    })
    return {
      hasAccess: !!startup,
      isFounder: startup?.founderId === userId,
      isTeamMember: true,
      roleInWorkspace: startup?.founderId === userId ? 'FOUNDER' : 'ADMIN',
      startup,
    }
  }

  const startup = await prisma.startupIdea.findUnique({
    where: { id: startupIdeaId },
    include: {
      founder: {
        select: { id: true, name: true, email: true, role: true, avatar: true, phone: true, linkedinUrl: true },
      },
    },
  })

  if (!startup) {
    return { hasAccess: false, isFounder: false, isTeamMember: false, roleInWorkspace: 'NONE', startup: null }
  }

  if (startup.founderId === userId) {
    return { hasAccess: true, isFounder: true, isTeamMember: false, roleInWorkspace: 'FOUNDER', startup }
  }

  // Check if accepted team member
  const acceptedApp = await prisma.teamApplication.findFirst({
    where: {
      startupIdeaId,
      candidateId: userId,
      status: ApplicationStatus.ACCEPTED,
    },
  })

  if (acceptedApp) {
    return {
      hasAccess: true,
      isFounder: false,
      isTeamMember: true,
      roleInWorkspace: 'TEAM_MEMBER',
      memberRoleApplied: acceptedApp.roleApplied,
      startup,
    }
  }

  return { hasAccess: false, isFounder: false, isTeamMember: false, roleInWorkspace: 'NONE', startup: null }
}

/**
 * 1. Get list of all workspaces the user has access to (as Founder or Accepted Team Member)
 * GET /api/collaboration/my-workspaces
 */
export const getMyWorkspaces = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' })
    }

    // 1. Startups owned by user
    const ownedStartups = await prisma.startupIdea.findMany({
      where: { founderId: userId },
      include: {
        founder: {
          select: { id: true, name: true, email: true, avatar: true, role: true },
        },
        teamApplications: {
          where: { status: ApplicationStatus.ACCEPTED },
          select: { id: true },
        },
        startupNotes: { select: { id: true } },
        startupAnnouncements: { select: { id: true } },
        startupFiles: { select: { id: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // 2. Startups where user is accepted team member
    const joinedApplications = await prisma.teamApplication.findMany({
      where: {
        candidateId: userId,
        status: ApplicationStatus.ACCEPTED,
      },
      include: {
        startupIdea: {
          include: {
            founder: {
              select: { id: true, name: true, email: true, avatar: true, role: true },
            },
            teamApplications: {
              where: { status: ApplicationStatus.ACCEPTED },
              select: { id: true },
            },
            startupNotes: { select: { id: true } },
            startupAnnouncements: { select: { id: true } },
            startupFiles: { select: { id: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const formattedWorkspaces = [
      ...ownedStartups.map((s) => ({
        id: s.id,
        title: s.title,
        tagline: s.tagline,
        category: s.category,
        stage: s.stage,
        founder: s.founder,
        roleInWorkspace: 'FOUNDER',
        teamMemberCount: s.teamApplications.length + 1, // +1 for founder
        notesCount: s.startupNotes.length,
        announcementsCount: s.startupAnnouncements.length,
        filesCount: s.startupFiles.length,
        updatedAt: s.updatedAt,
      })),
      ...joinedApplications
        .filter((app) => app.startupIdea.founderId !== userId) // prevent duplicate if founder
        .map((app) => ({
          id: app.startupIdea.id,
          title: app.startupIdea.title,
          tagline: app.startupIdea.tagline,
          category: app.startupIdea.category,
          stage: app.startupIdea.stage,
          founder: app.startupIdea.founder,
          roleInWorkspace: 'TEAM_MEMBER',
          memberRole: app.roleApplied,
          teamMemberCount: app.startupIdea.teamApplications.length + 1,
          notesCount: app.startupIdea.startupNotes.length,
          announcementsCount: app.startupIdea.startupAnnouncements.length,
          filesCount: app.startupIdea.startupFiles.length,
          updatedAt: app.startupIdea.updatedAt,
        })),
    ]

    return res.status(200).json({
      count: formattedWorkspaces.length,
      workspaces: formattedWorkspaces,
    })
  } catch (err: any) {
    console.error('Error fetching user workspaces:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

/**
 * 2. Get complete Collaboration Workspace details for a startup
 * GET /api/collaboration/workspace/:startupIdeaId
 */
export const getWorkspaceDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const { startupIdeaId } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' })
    }

    const access = await checkStartupAccess(startupIdeaId, userId, userRole)
    if (!access.hasAccess || !access.startup) {
      return res.status(403).json({
        error: 'Access denied. You must be the founder or an accepted team member of this startup to view its workspace.',
      })
    }

    // Fetch full workspace components in parallel
    const [acceptedMembers, notes, announcements, files] = await Promise.all([
      // 1. Accepted Team Members
      prisma.teamApplication.findMany({
        where: {
          startupIdeaId,
          status: ApplicationStatus.ACCEPTED,
        },
        include: {
          candidate: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              role: true,
              bio: true,
              skills: true,
              location: true,
              githubUrl: true,
              linkedinUrl: true,
              website: true,
              availabilityStatus: true,
              availabilityHoursPerWeek: true,
              workPreference: true,
            },
          },
        },
        orderBy: { updatedAt: 'asc' },
      }),

      // 2. Notes
      prisma.startupNote.findMany({
        where: { startupIdeaId },
        include: {
          author: {
            select: { id: true, name: true, avatar: true, role: true },
          },
        },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      }),

      // 3. Announcements
      prisma.startupAnnouncement.findMany({
        where: { startupIdeaId },
        include: {
          author: {
            select: { id: true, name: true, avatar: true, role: true },
          },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      }),

      // 4. Shared Files
      prisma.startupFile.findMany({
        where: { startupIdeaId },
        include: {
          uploader: {
            select: { id: true, name: true, avatar: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // Format member list with Founder + Accepted Members
    const members = [
      {
        id: access.startup.founder.id,
        name: access.startup.founder.name,
        email: access.startup.founder.email,
        phone: access.startup.founder.phone,
        avatar: access.startup.founder.avatar,
        role: access.startup.founder.role,
        startupRole: 'Founder / Project Owner',
        isFounder: true,
        joinedAt: access.startup.createdAt,
        skills: access.startup.requiredSkills,
        linkedinUrl: access.startup.founder.linkedinUrl,
      },
      ...acceptedMembers.map((m) => ({
        id: m.candidate.id,
        name: m.candidate.name,
        email: m.candidate.email,
        phone: m.candidate.phone,
        avatar: m.candidate.avatar,
        role: m.candidate.role,
        startupRole: m.roleApplied,
        isFounder: false,
        joinedAt: m.updatedAt,
        skills: m.skills.length > 0 ? m.skills : m.candidate.skills,
        location: m.candidate.location,
        githubUrl: m.candidate.githubUrl,
        linkedinUrl: m.candidate.linkedinUrl,
        website: m.candidate.website,
        availabilityStatus: m.candidate.availabilityStatus,
        availabilityHoursPerWeek: m.availabilityHoursPerWeek,
      })),
    ]

    return res.status(200).json({
      startup: access.startup,
      userRoleInWorkspace: access.roleInWorkspace,
      isFounder: access.isFounder,
      stats: {
        totalMembers: members.length,
        totalNotes: notes.length,
        totalAnnouncements: announcements.length,
        totalFiles: files.length,
      },
      members,
      notes,
      announcements,
      files,
    })
  } catch (err: any) {
    console.error('Error fetching workspace details:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

/**
 * ============================================================================
 * NOTES ENDPOINTS
 * ============================================================================
 */

/**
 * Create a new team note
 * POST /api/collaboration/workspace/:startupIdeaId/notes
 */
export const createNote = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const { startupIdeaId } = req.params
    const { title, content, color, isPinned, tags } = req.body

    if (!userId) return res.status(401).json({ error: 'Unauthorized.' })
    if (!title || !content) {
      return res.status(400).json({ error: 'Note title and content are required.' })
    }

    const access = await checkStartupAccess(startupIdeaId, userId, userRole)
    if (!access.hasAccess) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this workspace.' })
    }

    const newNote = await prisma.startupNote.create({
      data: {
        startupIdeaId,
        authorId: userId,
        title: title.trim(),
        content: content.trim(),
        color: color || 'blue',
        isPinned: Boolean(isPinned),
        tags: Array.isArray(tags) ? tags : [],
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true },
        },
      },
    })

    return res.status(201).json({
      message: 'Note created successfully.',
      note: newNote,
    })
  } catch (err: any) {
    console.error('Error creating note:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

/**
 * Update an existing note
 * PATCH /api/collaboration/notes/:noteId
 */
export const updateNote = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const { noteId } = req.params
    const { title, content, color, isPinned, tags } = req.body

    if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

    const note = await prisma.startupNote.findUnique({
      where: { id: noteId },
      include: { startupIdea: true },
    })

    if (!note) return res.status(404).json({ error: 'Note not found.' })

    const access = await checkStartupAccess(note.startupIdeaId, userId, userRole)
    if (!access.hasAccess) {
      return res.status(403).json({ error: 'Forbidden: No access to this workspace.' })
    }

    const updatedNote = await prisma.startupNote.update({
      where: { id: noteId },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        content: content !== undefined ? content.trim() : undefined,
        color: color !== undefined ? color : undefined,
        isPinned: isPinned !== undefined ? Boolean(isPinned) : undefined,
        tags: Array.isArray(tags) ? tags : undefined,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true },
        },
      },
    })

    return res.status(200).json({
      message: 'Note updated successfully.',
      note: updatedNote,
    })
  } catch (err: any) {
    console.error('Error updating note:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

/**
 * Delete a note
 * DELETE /api/collaboration/notes/:noteId
 */
export const deleteNote = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const { noteId } = req.params

    if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

    const note = await prisma.startupNote.findUnique({
      where: { id: noteId },
      include: { startupIdea: true },
    })

    if (!note) return res.status(404).json({ error: 'Note not found.' })

    const isAuthor = note.authorId === userId
    const isFounder = note.startupIdea.founderId === userId
    const isAdmin = userRole === 'ADMIN'

    if (!isAuthor && !isFounder && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: You can only delete notes you created or your startup notes.' })
    }

    await prisma.startupNote.delete({
      where: { id: noteId },
    })

    return res.status(200).json({ message: 'Note deleted successfully.' })
  } catch (err: any) {
    console.error('Error deleting note:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

/**
 * Toggle pin status for a note
 * PATCH /api/collaboration/notes/:noteId/pin
 */
export const togglePinNote = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const { noteId } = req.params

    if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

    const note = await prisma.startupNote.findUnique({
      where: { id: noteId },
    })

    if (!note) return res.status(404).json({ error: 'Note not found.' })

    const access = await checkStartupAccess(note.startupIdeaId, userId, userRole)
    if (!access.hasAccess) return res.status(403).json({ error: 'Forbidden.' })

    const updated = await prisma.startupNote.update({
      where: { id: noteId },
      data: { isPinned: !note.isPinned },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true } },
      },
    })

    return res.status(200).json({ message: 'Pin toggled.', note: updated })
  } catch (err: any) {
    console.error('Error toggling pin:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

/**
 * ============================================================================
 * ANNOUNCEMENTS ENDPOINTS
 * ============================================================================
 */

/**
 * Create a team announcement
 * POST /api/collaboration/workspace/:startupIdeaId/announcements
 */
export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const { startupIdeaId } = req.params
    const { title, content, priority, isPinned } = req.body

    if (!userId) return res.status(401).json({ error: 'Unauthorized.' })
    if (!title || !content) {
      return res.status(400).json({ error: 'Announcement title and message are required.' })
    }

    const access = await checkStartupAccess(startupIdeaId, userId, userRole)
    if (!access.hasAccess || !access.startup) {
      return res.status(403).json({ error: 'Forbidden: No access to this workspace.' })
    }

    const announcement = await prisma.startupAnnouncement.create({
      data: {
        startupIdeaId,
        authorId: userId,
        title: title.trim(),
        content: content.trim(),
        priority: priority || 'NORMAL',
        isPinned: Boolean(isPinned),
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true },
        },
      },
    })

    // Notify all team members & founder (except the author)
    const acceptedMembers = await prisma.teamApplication.findMany({
      where: {
        startupIdeaId,
        status: ApplicationStatus.ACCEPTED,
      },
      select: { candidateId: true },
    })

    const recipientUserIds = new Set<string>()
    if (access.startup.founderId !== userId) {
      recipientUserIds.add(access.startup.founderId)
    }
    acceptedMembers.forEach((m) => {
      if (m.candidateId !== userId) {
        recipientUserIds.add(m.candidateId)
      }
    })

    const notificationsData = Array.from(recipientUserIds).map((recipientId) => ({
      userId: recipientId,
      type: 'NEW_ANNOUNCEMENT',
      title: `📣 ${access.startup?.title || 'Startup'}: ${title.trim()}`,
      message: `${req.user?.name || 'A team member'} posted a new announcement: "${title.trim()}"`,
      link: `/collaboration/${startupIdeaId}`,
    }))

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({
        data: notificationsData,
      }).catch((e) => console.error('Failed to notify team of announcement:', e))
    }

    return res.status(201).json({
      message: 'Announcement published successfully.',
      announcement,
    })
  } catch (err: any) {
    console.error('Error creating announcement:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

/**
 * Delete an announcement
 * DELETE /api/collaboration/announcements/:announcementId
 */
export const deleteAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const { announcementId } = req.params

    if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

    const announcement = await prisma.startupAnnouncement.findUnique({
      where: { id: announcementId },
      include: { startupIdea: true },
    })

    if (!announcement) return res.status(404).json({ error: 'Announcement not found.' })

    const isAuthor = announcement.authorId === userId
    const isFounder = announcement.startupIdea.founderId === userId
    const isAdmin = userRole === 'ADMIN'

    if (!isAuthor && !isFounder && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Cannot delete this announcement.' })
    }

    await prisma.startupAnnouncement.delete({
      where: { id: announcementId },
    })

    return res.status(200).json({ message: 'Announcement deleted successfully.' })
  } catch (err: any) {
    console.error('Error deleting announcement:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

/**
 * Toggle pin status for announcement
 * PATCH /api/collaboration/announcements/:announcementId/pin
 */
export const togglePinAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const { announcementId } = req.params

    if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

    const announcement = await prisma.startupAnnouncement.findUnique({
      where: { id: announcementId },
    })

    if (!announcement) return res.status(404).json({ error: 'Announcement not found.' })

    const access = await checkStartupAccess(announcement.startupIdeaId, userId, userRole)
    if (!access.hasAccess) return res.status(403).json({ error: 'Forbidden.' })

    const updated = await prisma.startupAnnouncement.update({
      where: { id: announcementId },
      data: { isPinned: !announcement.isPinned },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true } },
      },
    })

    return res.status(200).json({ message: 'Pin toggled.', announcement: updated })
  } catch (err: any) {
    console.error('Error toggling pin:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

/**
 * ============================================================================
 * FILE SHARING ENDPOINTS
 * ============================================================================
 */

/**
 * Upload and share a file in startup workspace
 * POST /api/collaboration/workspace/:startupIdeaId/files
 */
export const uploadStartupFile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const { startupIdeaId } = req.params
    const { fileName, fileData, fileUrl, fileSize, fileType, category, description } = req.body

    if (!userId) return res.status(401).json({ error: 'Unauthorized.' })
    if (!fileName) {
      return res.status(400).json({ error: 'File name is required.' })
    }

    const access = await checkStartupAccess(startupIdeaId, userId, userRole)
    if (!access.hasAccess) {
      return res.status(403).json({ error: 'Forbidden: No access to this workspace.' })
    }

    let finalFileUrl = fileUrl || ''

    // If base64 file data is uploaded directly
    if (fileData) {
      const sanitizedName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const filePath = path.join(uploadDir, sanitizedName)

      // Strip base64 prefix if present (e.g. data:application/pdf;base64,...)
      const base64Content = fileData.includes(';base64,')
        ? fileData.split(';base64,')[1]
        : fileData

      fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'))
      finalFileUrl = `http://localhost:5000/uploads/startup-files/${sanitizedName}`
    }

    if (!finalFileUrl) {
      return res.status(400).json({ error: 'Either fileData or fileUrl must be provided.' })
    }

    const newFile = await prisma.startupFile.create({
      data: {
        startupIdeaId,
        uploaderId: userId,
        fileName: fileName.trim(),
        fileUrl: finalFileUrl,
        fileSize: fileSize || 'Document',
        fileType: fileType || 'application/octet-stream',
        category: category || 'GENERAL',
        description: description?.trim() || null,
      },
      include: {
        uploader: {
          select: { id: true, name: true, avatar: true, role: true },
        },
      },
    })

    return res.status(201).json({
      message: 'File shared successfully.',
      file: newFile,
    })
  } catch (err: any) {
    console.error('Error uploading file:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

/**
 * Delete a shared file
 * DELETE /api/collaboration/files/:fileId
 */
export const deleteStartupFile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const { fileId } = req.params

    if (!userId) return res.status(401).json({ error: 'Unauthorized.' })

    const file = await prisma.startupFile.findUnique({
      where: { id: fileId },
      include: { startupIdea: true },
    })

    if (!file) return res.status(404).json({ error: 'File not found.' })

    const isUploader = file.uploaderId === userId
    const isFounder = file.startupIdea.founderId === userId
    const isAdmin = userRole === 'ADMIN'

    if (!isUploader && !isFounder && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: You can only delete files you uploaded or your startup files.' })
    }

    // Try deleting physical file if hosted locally
    if (file.fileUrl && file.fileUrl.includes('/uploads/startup-files/')) {
      const fileName = file.fileUrl.split('/uploads/startup-files/')[1]
      if (fileName) {
        const filePath = path.join(uploadDir, fileName)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      }
    }

    await prisma.startupFile.delete({
      where: { id: fileId },
    })

    return res.status(200).json({ message: 'File deleted successfully.' })
  } catch (err: any) {
    console.error('Error deleting file:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
