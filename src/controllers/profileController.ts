import { Response } from 'express'
import prisma from '../config/db'
import { AuthRequest } from '../middleware/authMiddleware'
import { AvailabilityStatus, WorkPreference } from '@prisma/client'

// 1. Get complete User Profile (all 8 sections)
export const getMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        education: {
          orderBy: { startDate: 'desc' },
        },
        experience: {
          orderBy: { startDate: 'desc' },
        },
        portfolioItems: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'User profile not found' })
    }

    // Omit sensitive password
    const { password, ...profileData } = user

    return res.status(200).json({ profile: profileData })
  } catch (error: any) {
    console.error('Error fetching profile:', error)
    return res.status(500).json({ error: 'Failed to fetch user profile' })
  }
}

// 2. Personal Information Update
export const updatePersonalInfo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' })

    const { name, phone, bio, avatar, location, website, githubUrl, linkedinUrl } = req.body

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name !== undefined ? name : undefined,
        phone: phone !== undefined ? phone : undefined,
        bio: bio !== undefined ? bio : undefined,
        avatar: avatar !== undefined ? avatar : undefined,
        location: location !== undefined ? location : undefined,
        website: website !== undefined ? website : undefined,
        githubUrl: githubUrl !== undefined ? githubUrl : undefined,
        linkedinUrl: linkedinUrl !== undefined ? linkedinUrl : undefined,
      },
    })

    const { password, ...userProfile } = updatedUser
    return res.status(200).json({ message: 'Personal information updated successfully', user: userProfile })
  } catch (error: any) {
    console.error('Error updating personal info:', error)
    return res.status(500).json({ error: 'Failed to update personal information' })
  }
}

// 3. Skills Update
export const updateSkills = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' })

    const { skills } = req.body // Array of strings

    if (!Array.isArray(skills)) {
      return res.status(400).json({ error: 'Skills must be an array of strings' })
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { skills },
    })

    return res.status(200).json({ message: 'Skills updated successfully', skills: updatedUser.skills })
  } catch (error: any) {
    console.error('Error updating skills:', error)
    return res.status(500).json({ error: 'Failed to update skills' })
  }
}

// 4. Education CRUD
export const addEducation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' })

    const { institution, degree, fieldOfStudy, startDate, endDate, isCurrent, description } = req.body

    if (!institution || !degree || !startDate) {
      return res.status(400).json({ error: 'Institution, degree, and start date are required' })
    }

    const education = await prisma.education.create({
      data: {
        userId: req.user.id,
        institution,
        degree,
        fieldOfStudy: fieldOfStudy || null,
        startDate: new Date(startDate),
        endDate: isCurrent ? null : (endDate ? new Date(endDate) : null),
        isCurrent: Boolean(isCurrent),
        description: description || null,
      },
    })

    return res.status(201).json({ message: 'Education record added', education })
  } catch (error: any) {
    console.error('Error adding education:', error)
    return res.status(500).json({ error: 'Failed to add education record' })
  }
}

export const updateEducation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' })
    const { id } = req.params
    const { institution, degree, fieldOfStudy, startDate, endDate, isCurrent, description } = req.body

    const existing = await prisma.education.findFirst({
      where: { id, userId: req.user.id },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Education record not found' })
    }

    const education = await prisma.education.update({
      where: { id },
      data: {
        institution: institution || existing.institution,
        degree: degree || existing.degree,
        fieldOfStudy: fieldOfStudy !== undefined ? fieldOfStudy : existing.fieldOfStudy,
        startDate: startDate ? new Date(startDate) : existing.startDate,
        endDate: isCurrent ? null : (endDate ? new Date(endDate) : existing.endDate),
        isCurrent: isCurrent !== undefined ? Boolean(isCurrent) : existing.isCurrent,
        description: description !== undefined ? description : existing.description,
      },
    })

    return res.status(200).json({ message: 'Education record updated', education })
  } catch (error: any) {
    console.error('Error updating education:', error)
    return res.status(500).json({ error: 'Failed to update education record' })
  }
}

export const deleteEducation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' })
    const { id } = req.params

    const existing = await prisma.education.findFirst({
      where: { id, userId: req.user.id },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Education record not found' })
    }

    await prisma.education.delete({ where: { id } })

    return res.status(200).json({ message: 'Education record deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting education:', error)
    return res.status(500).json({ error: 'Failed to delete education record' })
  }
}

// 5. Experience CRUD
export const addExperience = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' })

    const { title, company, location, startDate, endDate, isCurrent, description } = req.body

    if (!title || !company || !startDate) {
      return res.status(400).json({ error: 'Title, company, and start date are required' })
    }

    const experience = await prisma.experience.create({
      data: {
        userId: req.user.id,
        title,
        company,
        location: location || null,
        startDate: new Date(startDate),
        endDate: isCurrent ? null : (endDate ? new Date(endDate) : null),
        isCurrent: Boolean(isCurrent),
        description: description || null,
      },
    })

    return res.status(201).json({ message: 'Experience record added', experience })
  } catch (error: any) {
    console.error('Error adding experience:', error)
    return res.status(500).json({ error: 'Failed to add experience record' })
  }
}

export const updateExperience = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' })
    const { id } = req.params
    const { title, company, location, startDate, endDate, isCurrent, description } = req.body

    const existing = await prisma.experience.findFirst({
      where: { id, userId: req.user.id },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Experience record not found' })
    }

    const experience = await prisma.experience.update({
      where: { id },
      data: {
        title: title || existing.title,
        company: company || existing.company,
        location: location !== undefined ? location : existing.location,
        startDate: startDate ? new Date(startDate) : existing.startDate,
        endDate: isCurrent ? null : (endDate ? new Date(endDate) : existing.endDate),
        isCurrent: isCurrent !== undefined ? Boolean(isCurrent) : existing.isCurrent,
        description: description !== undefined ? description : existing.description,
      },
    })

    return res.status(200).json({ message: 'Experience record updated', experience })
  } catch (error: any) {
    console.error('Error updating experience:', error)
    return res.status(500).json({ error: 'Failed to update experience record' })
  }
}

export const deleteExperience = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' })
    const { id } = req.params

    const existing = await prisma.experience.findFirst({
      where: { id, userId: req.user.id },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Experience record not found' })
    }

    await prisma.experience.delete({ where: { id } })

    return res.status(200).json({ message: 'Experience record deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting experience:', error)
    return res.status(500).json({ error: 'Failed to delete experience record' })
  }
}

// 6. Resume Update
export const updateResume = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' })

    const { resumeUrl, resumeFileName } = req.body

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        resumeUrl: resumeUrl !== undefined ? resumeUrl : undefined,
        resumeFileName: resumeFileName !== undefined ? resumeFileName : undefined,
        resumeUploadedAt: new Date(),
      },
    })

    return res.status(200).json({
      message: 'Resume information updated',
      resumeUrl: updatedUser.resumeUrl,
      resumeFileName: updatedUser.resumeFileName,
      resumeUploadedAt: updatedUser.resumeUploadedAt,
    })
  } catch (error: any) {
    console.error('Error updating resume:', error)
    return res.status(500).json({ error: 'Failed to update resume' })
  }
}

// 7. Portfolio CRUD
export const addPortfolio = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' })

    const { title, description, projectUrl, githubUrl, imageUrl, tags } = req.body

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required for portfolio items' })
    }

    const portfolioItem = await prisma.portfolioItem.create({
      data: {
        userId: req.user.id,
        title,
        description,
        projectUrl: projectUrl || null,
        githubUrl: githubUrl || null,
        imageUrl: imageUrl || null,
        tags: Array.isArray(tags) ? tags : [],
      },
    })

    return res.status(201).json({ message: 'Portfolio item added', portfolioItem })
  } catch (error: any) {
    console.error('Error adding portfolio item:', error)
    return res.status(500).json({ error: 'Failed to add portfolio item' })
  }
}

export const updatePortfolio = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' })
    const { id } = req.params
    const { title, description, projectUrl, githubUrl, imageUrl, tags } = req.body

    const existing = await prisma.portfolioItem.findFirst({
      where: { id, userId: req.user.id },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Portfolio item not found' })
    }

    const portfolioItem = await prisma.portfolioItem.update({
      where: { id },
      data: {
        title: title || existing.title,
        description: description !== undefined ? description : existing.description,
        projectUrl: projectUrl !== undefined ? projectUrl : existing.projectUrl,
        githubUrl: githubUrl !== undefined ? githubUrl : existing.githubUrl,
        imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
        tags: Array.isArray(tags) ? tags : existing.tags,
      },
    })

    return res.status(200).json({ message: 'Portfolio item updated', portfolioItem })
  } catch (error: any) {
    console.error('Error updating portfolio item:', error)
    return res.status(500).json({ error: 'Failed to update portfolio item' })
  }
}

export const deletePortfolio = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' })
    const { id } = req.params

    const existing = await prisma.portfolioItem.findFirst({
      where: { id, userId: req.user.id },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Portfolio item not found' })
    }

    await prisma.portfolioItem.delete({ where: { id } })

    return res.status(200).json({ message: 'Portfolio item deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting portfolio item:', error)
    return res.status(500).json({ error: 'Failed to delete portfolio item' })
  }
}

// 8. Interests Update
export const updateInterests = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' })

    const { interests } = req.body // Array of strings

    if (!Array.isArray(interests)) {
      return res.status(400).json({ error: 'Interests must be an array of strings' })
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { interests },
    })

    return res.status(200).json({ message: 'Interests updated successfully', interests: updatedUser.interests })
  } catch (error: any) {
    console.error('Error updating interests:', error)
    return res.status(500).json({ error: 'Failed to update interests' })
  }
}

// 9. Availability Update
export const updateAvailability = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' })

    const { availabilityStatus, availabilityHoursPerWeek, workPreference, noticePeriod } = req.body

    if (availabilityStatus && !Object.values(AvailabilityStatus).includes(availabilityStatus)) {
      return res.status(400).json({ error: 'Invalid availability status value' })
    }

    if (workPreference && !Object.values(WorkPreference).includes(workPreference)) {
      return res.status(400).json({ error: 'Invalid work preference value' })
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        availabilityStatus: availabilityStatus || undefined,
        availabilityHoursPerWeek: availabilityHoursPerWeek !== undefined ? Number(availabilityHoursPerWeek) : undefined,
        workPreference: workPreference || undefined,
        noticePeriod: noticePeriod !== undefined ? noticePeriod : undefined,
      },
    })

    return res.status(200).json({
      message: 'Availability settings updated successfully',
      availability: {
        availabilityStatus: updatedUser.availabilityStatus,
        availabilityHoursPerWeek: updatedUser.availabilityHoursPerWeek,
        workPreference: updatedUser.workPreference,
        noticePeriod: updatedUser.noticePeriod,
      },
    })
  } catch (error: any) {
    console.error('Error updating availability:', error)
    return res.status(500).json({ error: 'Failed to update availability' })
  }
}
