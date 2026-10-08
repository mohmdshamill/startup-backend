import { Response } from 'express'
import prisma, { ApplicationStatus, Role } from '../config/db'
import { AuthRequest } from '../middleware/authMiddleware'

/**
 * 1. Candidate applies to join a startup idea
 * POST /api/applications
 */
export const applyToStartup = async (req: AuthRequest, res: Response) => {
  try {
    const candidateId = req.user?.id
    if (!candidateId) {
      return res.status(401).json({ error: 'Unauthorized. Please sign in.' })
    }

    // Prevent users with FOUNDER role from applying to startup teams
    if (req.user?.role === Role.FOUNDER) {
      return res.status(403).json({
        error: 'Startup Founders cannot apply to join other startup teams. Founders can create and build their own startup teams.',
      })
    }

    const {
      startupIdeaId,
      roleApplied,
      pitchMessage,
      skills,
      availabilityHoursPerWeek,
      portfolioUrl,
      resumeUrl,
    } = req.body

    if (!startupIdeaId || !roleApplied || !pitchMessage) {
      return res.status(400).json({
        error: 'Missing required fields: startupIdeaId, roleApplied, and pitchMessage are required.',
      })
    }

    // Verify startup idea exists and is active
    const startupIdea = await prisma.startupIdea.findUnique({
      where: { id: startupIdeaId },
      include: {
        founder: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!startupIdea) {
      return res.status(404).json({ error: 'Startup idea not found.' })
    }

    if (!startupIdea.isActive) {
      return res.status(400).json({ error: 'This startup is currently not accepting applications.' })
    }

    // Prevent founder from applying to their own startup
    if (startupIdea.founderId === candidateId) {
      return res.status(400).json({ error: 'You cannot apply to your own startup idea.' })
    }

    // Check for existing application
    const existingApplication = await prisma.teamApplication.findUnique({
      where: {
        startupIdeaId_candidateId: {
          startupIdeaId,
          candidateId,
        },
      },
    })

    if (existingApplication) {
      if (existingApplication.status === ApplicationStatus.WITHDRAWN || existingApplication.status === ApplicationStatus.REJECTED) {
        // Allow re-applying if previously withdrawn or rejected
        const updated = await prisma.teamApplication.update({
          where: { id: existingApplication.id },
          data: {
            roleApplied,
            pitchMessage,
            skills: Array.isArray(skills) ? skills : [],
            availabilityHoursPerWeek: Number(availabilityHoursPerWeek) || 20,
            portfolioUrl: portfolioUrl || null,
            resumeUrl: resumeUrl || null,
            status: ApplicationStatus.PENDING,
            founderFeedback: null,
            reviewedAt: null,
          },
          include: {
            startupIdea: {
              select: { id: true, title: true, category: true, stage: true },
            },
          },
        })
        // Notify founder
        await prisma.notification.create({
          data: {
            userId: startupIdea.founderId,
            type: 'APPLICATION_RECEIVED',
            title: `New Applicant for ${startupIdea.title}`,
            message: `${req.user?.name || 'A candidate'} re-applied for the role "${roleApplied}" in your startup "${startupIdea.title}".`,
            link: '/recruitment',
          },
        }).catch((e) => console.error('Failed to create founder notification:', e))

        return res.status(200).json({
          message: 'Application re-submitted successfully.',
          application: updated,
        })
      }

      return res.status(400).json({
        error: `You have already applied for this startup idea. Current status: ${existingApplication.status}`,
        application: existingApplication,
      })
    }

    // Create new application
    const newApplication = await prisma.teamApplication.create({
      data: {
        startupIdeaId,
        candidateId,
        roleApplied,
        pitchMessage,
        skills: Array.isArray(skills) ? skills : [],
        availabilityHoursPerWeek: Number(availabilityHoursPerWeek) || 20,
        portfolioUrl: portfolioUrl || null,
        resumeUrl: resumeUrl || null,
        status: ApplicationStatus.PENDING,
      },
      include: {
        startupIdea: {
          select: {
            id: true,
            title: true,
            category: true,
            stage: true,
            founder: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    })

    // Notify founder
    await prisma.notification.create({
      data: {
        userId: startupIdea.founderId,
        type: 'APPLICATION_RECEIVED',
        title: `New Applicant for ${startupIdea.title}`,
        message: `${req.user?.name || 'A candidate'} applied for the role "${roleApplied}" in your startup "${startupIdea.title}".`,
        link: '/recruitment',
      },
    }).catch((e) => console.error('Failed to create founder notification:', e))

    return res.status(201).json({
      message: 'Application submitted successfully to startup team.',
      application: newApplication,
    })
  } catch (err: any) {
    console.error('Error applying to startup:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

/**
 * 2. Candidate views all their submitted applications
 * GET /api/applications/my-applications
 */
export const getMyApplications = async (req: AuthRequest, res: Response) => {
  try {
    const candidateId = req.user?.id
    if (!candidateId) {
      return res.status(401).json({ error: 'Unauthorized.' })
    }

    const applications = await prisma.teamApplication.findMany({
      where: { candidateId },
      include: {
        startupIdea: {
          include: {
            founder: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                role: true,
                location: true,
                linkedinUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return res.status(200).json({
      count: applications.length,
      applications,
    })
  } catch (err: any) {
    console.error('Error fetching candidate applications:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

/**
 * 3. Founder views applications for a specific startup idea
 * GET /api/applications/startup/:startupIdeaId
 */
export const getStartupApplications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const { startupIdeaId } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' })
    }

    const startupIdea = await prisma.startupIdea.findUnique({
      where: { id: startupIdeaId },
    })

    if (!startupIdea) {
      return res.status(404).json({ error: 'Startup idea not found.' })
    }

    // Only founder or admin can view applications
    if (startupIdea.founderId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: You are not the founder of this startup idea.' })
    }

    const applications = await prisma.teamApplication.findMany({
      where: { startupIdeaId },
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
            website: true,
            githubUrl: true,
            linkedinUrl: true,
            resumeUrl: true,
            resumeFileName: true,
            availabilityStatus: true,
            availabilityHoursPerWeek: true,
            workPreference: true,
            noticePeriod: true,
            experience: {
              orderBy: { startDate: 'desc' },
              take: 3,
            },
            education: {
              orderBy: { startDate: 'desc' },
              take: 2,
            },
            portfolioItems: {
              take: 3,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return res.status(200).json({
      startupTitle: startupIdea.title,
      startupStage: startupIdea.stage,
      count: applications.length,
      applications,
    })
  } catch (err: any) {
    console.error('Error fetching startup applications:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

/**
 * 4. Founder views all candidate applications across all their startup ideas
 * GET /api/applications/founder/all
 */
export const getFounderAllApplications = async (req: AuthRequest, res: Response) => {
  try {
    const founderId = req.user?.id
    if (!founderId) {
      return res.status(401).json({ error: 'Unauthorized.' })
    }

    // Get all startup ideas owned by this founder
    const myStartups = await prisma.startupIdea.findMany({
      where: { founderId },
      select: { id: true, title: true, category: true, stage: true },
    })

    const startupIds = myStartups.map((s) => s.id)

    if (startupIds.length === 0) {
      return res.status(200).json({
        totalApplications: 0,
        stats: {
          pending: 0,
          reviewing: 0,
          shortlisted: 0,
          accepted: 0,
          rejected: 0,
        },
        startups: [],
        applications: [],
      })
    }

    const applications = await prisma.teamApplication.findMany({
      where: {
        startupIdeaId: { in: startupIds },
      },
      include: {
        startupIdea: {
          select: {
            id: true,
            title: true,
            category: true,
            stage: true,
          },
        },
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
            website: true,
            githubUrl: true,
            linkedinUrl: true,
            resumeUrl: true,
            resumeFileName: true,
            availabilityStatus: true,
            availabilityHoursPerWeek: true,
            workPreference: true,
            noticePeriod: true,
            experience: {
              orderBy: { startDate: 'desc' },
              take: 3,
            },
            education: {
              orderBy: { startDate: 'desc' },
              take: 2,
            },
            portfolioItems: {
              take: 3,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate status breakdown
    const stats = {
      pending: applications.filter((a) => a.status === ApplicationStatus.PENDING).length,
      reviewing: applications.filter((a) => a.status === ApplicationStatus.REVIEWING).length,
      shortlisted: applications.filter((a) => a.status === ApplicationStatus.SHORTLISTED).length,
      accepted: applications.filter((a) => a.status === ApplicationStatus.ACCEPTED).length,
      rejected: applications.filter((a) => a.status === ApplicationStatus.REJECTED).length,
    }

    return res.status(200).json({
      totalApplications: applications.length,
      stats,
      startups: myStartups,
      applications,
    })
  } catch (err: any) {
    console.error('Error fetching founder all applications:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

/**
 * 5. Founder updates candidate application status (Accept, Reject, Shortlist, Review)
 * PATCH /api/applications/:id/status
 */
export const updateApplicationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const { id } = req.params
    const { status, founderFeedback } = req.body

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' })
    }

    if (!status || !Object.values(ApplicationStatus).includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${Object.values(ApplicationStatus).join(', ')}`,
      })
    }

    // Retrieve application and verify ownership
    const application = await prisma.teamApplication.findUnique({
      where: { id },
      include: {
        startupIdea: true,
        candidate: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' })
    }

    if (application.startupIdea.founderId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to manage this application.' })
    }

    const updated = await prisma.teamApplication.update({
      where: { id },
      data: {
        status: status as ApplicationStatus,
        founderFeedback: founderFeedback !== undefined ? founderFeedback : application.founderFeedback,
        reviewedAt: new Date(),
      },
      include: {
        startupIdea: {
          select: { id: true, title: true, stage: true, category: true },
        },
        candidate: {
          select: { id: true, name: true, email: true, avatar: true, role: true },
        },
      },
    })

    // Create notification for the applicant candidate
    let notifTitle = `Application Update: ${application.startupIdea.title}`
    let notifMessage = `Your application for "${application.roleApplied}" at "${application.startupIdea.title}" has been updated to ${status}.`

    if (status === 'ACCEPTED') {
      notifTitle = `🎉 Application Accepted: ${application.startupIdea.title}`
      notifMessage = `Congratulations! The founder of "${application.startupIdea.title}" has accepted your application for the role "${application.roleApplied}".${founderFeedback ? ` Note: "${founderFeedback}"` : ''}`
    } else if (status === 'SHORTLISTED') {
      notifTitle = `⭐ Shortlisted: ${application.startupIdea.title}`
      notifMessage = `Good news! You have been shortlisted for "${application.roleApplied}" at "${application.startupIdea.title}".${founderFeedback ? ` Note: "${founderFeedback}"` : ''}`
    } else if (status === 'REVIEWING') {
      notifTitle = `👀 Under Review: ${application.startupIdea.title}`
      notifMessage = `The founder is now reviewing your application for "${application.roleApplied}" at "${application.startupIdea.title}".`
    } else if (status === 'REJECTED') {
      notifTitle = `Application Status: ${application.startupIdea.title}`
      notifMessage = `Thank you for applying. Your application for "${application.roleApplied}" at "${application.startupIdea.title}" was not selected at this time.${founderFeedback ? ` Note: "${founderFeedback}"` : ''}`
    }

    await prisma.notification.create({
      data: {
        userId: application.candidateId,
        type: `STATUS_${status}`,
        title: notifTitle,
        message: notifMessage,
        link: '/recruitment',
      },
    }).catch((e) => console.error('Failed to create candidate notification:', e))

    return res.status(200).json({
      message: `Candidate application status updated to ${status}.`,
      application: updated,
    })
  } catch (err: any) {
    console.error('Error updating application status:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

/**
 * 6. Candidate withdraws their application
 * PATCH /api/applications/:id/withdraw
 */
export const withdrawApplication = async (req: AuthRequest, res: Response) => {
  try {
    const candidateId = req.user?.id
    const { id } = req.params

    if (!candidateId) {
      return res.status(401).json({ error: 'Unauthorized.' })
    }

    const application = await prisma.teamApplication.findUnique({
      where: { id },
      include: {
        startupIdea: true,
      },
    })

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' })
    }

    if (application.candidateId !== candidateId) {
      return res.status(403).json({ error: 'Forbidden: You can only withdraw your own applications.' })
    }

    if (application.status === ApplicationStatus.ACCEPTED) {
      return res.status(400).json({
        error: 'Cannot withdraw an already accepted offer directly. Please contact the startup founder.',
      })
    }

    const updated = await prisma.teamApplication.update({
      where: { id },
      data: {
        status: ApplicationStatus.WITHDRAWN,
      },
    })

    // Notify founder
    await prisma.notification.create({
      data: {
        userId: application.startupIdea.founderId,
        type: 'APPLICATION_WITHDRAWN',
        title: 'Application Withdrawn',
        message: `${req.user?.name || 'A candidate'} withdrew their application for "${application.roleApplied}" at "${application.startupIdea.title}".`,
        link: '/recruitment',
      },
    }).catch((e) => console.error('Failed to create founder notification:', e))

    return res.status(200).json({
      message: 'Application withdrawn successfully.',
      application: updated,
    })
  } catch (err: any) {
    console.error('Error withdrawing application:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}

/**
 * 7. Get single application detail
 * GET /api/applications/:id
 */
export const getApplicationById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const { id } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' })
    }

    const application = await prisma.teamApplication.findUnique({
      where: { id },
      include: {
        startupIdea: {
          include: {
            founder: {
              select: { id: true, name: true, email: true, avatar: true, role: true, location: true },
            },
          },
        },
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
            website: true,
            githubUrl: true,
            linkedinUrl: true,
            resumeUrl: true,
            resumeFileName: true,
            availabilityStatus: true,
            availabilityHoursPerWeek: true,
            workPreference: true,
            noticePeriod: true,
            experience: true,
            education: true,
            portfolioItems: true,
          },
        },
      },
    })

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' })
    }

    // Only the candidate or startup founder or admin can view
    if (
      application.candidateId !== userId &&
      application.startupIdea.founderId !== userId &&
      userRole !== 'ADMIN'
    ) {
      return res.status(403).json({ error: 'Forbidden: Access denied.' })
    }

    return res.status(200).json({ application })
  } catch (err: any) {
    console.error('Error fetching application detail:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
