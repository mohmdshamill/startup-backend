import { Response } from 'express'
import prisma, { AvailabilityStatus } from '../config/db'
import { AuthRequest } from '../middleware/authMiddleware'

/**
 * Normalizes an array of skills (lowercased and trimmed)
 */
function normalizeSkills(skills: string[] | null | undefined): string[] {
  if (!Array.isArray(skills)) return []
  return skills.map((s) => s.trim().toLowerCase()).filter(Boolean)
}

/**
 * Calculates skill matching score and details between candidate skills and startup required skills
 */
function calculateMatchScore(
  candidateSkills: string[],
  requiredSkills: string[],
  candidateInterests: string[] = [],
  startupCategory: string = '',
  availabilityStatus?: string
) {
  const normCandidate = normalizeSkills(candidateSkills)
  const normRequired = normalizeSkills(requiredSkills)
  const normInterests = normalizeSkills(candidateInterests)
  const normCategory = startupCategory.trim().toLowerCase()

  if (normRequired.length === 0) {
    // If startup has no specific skills listed, base match on general availability
    return {
      matchScore: 60,
      matchedSkills: candidateSkills || [],
      missingSkills: [],
      matchRating: 'GOOD_FIT' as const,
    }
  }

  // Find exact and substring matches
  const matchedOriginal: string[] = []
  const missingOriginal: string[] = []

  requiredSkills.forEach((reqSkill) => {
    const normReq = reqSkill.trim().toLowerCase()
    const isMatched = normCandidate.some(
      (cSkill) => cSkill === normReq || cSkill.includes(normReq) || normReq.includes(cSkill)
    )
    if (isMatched) {
      matchedOriginal.push(reqSkill)
    } else {
      missingOriginal.push(reqSkill)
    }
  })

  // Calculate base score from skill percentage (weight: 80%)
  const skillRatio = matchedOriginal.length / normRequired.length
  let score = skillRatio * 80

  // Category & interest affinity bonus (weight: 10%)
  if (normCategory && normInterests.some((int) => normCategory.includes(int) || int.includes(normCategory))) {
    score += 10
  }

  // Availability bonus (weight: 10%)
  if (
    availabilityStatus === AvailabilityStatus.AVAILABLE_FULLTIME ||
    availabilityStatus === AvailabilityStatus.AVAILABLE_PARTTIME ||
    availabilityStatus === AvailabilityStatus.OPEN_TO_OFFERS
  ) {
    score += 10
  }

  // Clamped match score rounded to integer
  const finalScore = Math.min(100, Math.max(10, Math.round(score)))

  let matchRating: 'SUPER_MATCH' | 'GREAT_FIT' | 'GOOD_FIT' | 'PARTIAL_MATCH' = 'PARTIAL_MATCH'
  if (finalScore >= 85) matchRating = 'SUPER_MATCH'
  else if (finalScore >= 70) matchRating = 'GREAT_FIT'
  else if (finalScore >= 50) matchRating = 'GOOD_FIT'

  return {
    matchScore: finalScore,
    matchedSkills: matchedOriginal,
    missingSkills: missingOriginal,
    matchRating,
  }
}

/**
 * 1. Recommend relevant startups for the authenticated candidate
 * GET /api/matching/startups-for-me
 */
export const getRecommendedStartupsForMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized. Please sign in.' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        skills: true,
        interests: true,
        role: true,
        availabilityStatus: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' })
    }

    // Fetch all active startups (excluding user's own startups)
    const startups = await prisma.startupIdea.findMany({
      where: {
        isActive: true,
        founderId: { not: userId },
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
        teamApplications: {
          where: { candidateId: userId },
          select: { id: true, status: true, roleApplied: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Compute matching score for each startup
    const scoredStartups = startups.map((startup) => {
      const match = calculateMatchScore(
        user.skills || [],
        startup.requiredSkills || [],
        user.interests || [],
        startup.category,
        user.availabilityStatus
      )

      const existingApp = startup.teamApplications[0] || null

      return {
        ...startup,
        teamApplications: undefined, // cleaner payload
        existingApplication: existingApp,
        matchScore: match.matchScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        matchRating: match.matchRating,
      }
    })

    // Sort startups primarily by matchScore descending, then by creation date
    scoredStartups.sort((a, b) => b.matchScore - a.matchScore)

    return res.status(200).json({
      candidateSkills: user.skills || [],
      totalRecommendations: scoredStartups.length,
      startups: scoredStartups,
    })
  } catch (err: any) {
    console.error('Error in getRecommendedStartupsForMe:', err)
    return res.status(500).json({ error: err.message || 'Failed to get recommendations.' })
  }
}

/**
 * 2. Recommend suitable candidates for a specific startup idea owned by founder
 * GET /api/matching/candidates-for-startup/:startupIdeaId
 */
export const getRecommendedCandidatesForStartup = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const { startupIdeaId } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized. Please sign in.' })
    }

    const startup = await prisma.startupIdea.findUnique({
      where: { id: startupIdeaId },
      include: {
        teamApplications: {
          select: { candidateId: true, status: true, roleApplied: true },
        },
      },
    })

    if (!startup) {
      return res.status(404).json({ error: 'Startup idea not found.' })
    }

    // Verify ownership
    if (startup.founderId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: You do not own this startup idea.' })
    }

    // Fetch all active candidates (excluding the founder themself)
    const candidates = await prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: startup.founderId },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        bio: true,
        skills: true,
        interests: true,
        location: true,
        website: true,
        githubUrl: true,
        linkedinUrl: true,
        resumeUrl: true,
        availabilityStatus: true,
        availabilityHoursPerWeek: true,
        workPreference: true,
        experience: {
          orderBy: { startDate: 'desc' },
          take: 2,
        },
        education: {
          orderBy: { startDate: 'desc' },
          take: 1,
        },
      },
    })

    const appMap = new Map(startup.teamApplications.map((a) => [a.candidateId, a]))

    const scoredCandidates = candidates.map((candidate) => {
      const match = calculateMatchScore(
        candidate.skills || [],
        startup.requiredSkills || [],
        candidate.interests || [],
        startup.category,
        candidate.availabilityStatus
      )

      const existingApp = appMap.get(candidate.id) || null

      return {
        ...candidate,
        existingApplication: existingApp,
        matchScore: match.matchScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        matchRating: match.matchRating,
      }
    })

    // Sort by match score descending
    scoredCandidates.sort((a, b) => b.matchScore - a.matchScore)

    return res.status(200).json({
      startup: {
        id: startup.id,
        title: startup.title,
        category: startup.category,
        stage: startup.stage,
        requiredSkills: startup.requiredSkills,
      },
      totalCandidates: scoredCandidates.length,
      candidates: scoredCandidates,
    })
  } catch (err: any) {
    console.error('Error in getRecommendedCandidatesForStartup:', err)
    return res.status(500).json({ error: err.message || 'Failed to get candidate recommendations.' })
  }
}

/**
 * 3. General skill matching search / explorer
 * POST /api/matching/explore
 * Body: { skills: string[], category?: string, role?: string }
 */
export const exploreSkillMatching = async (req: AuthRequest, res: Response) => {
  try {
    const { skills, category, role } = req.body
    const searchSkills = Array.isArray(skills) ? skills : []

    // 1. Matching candidates
    const candidates = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(role && role !== 'ALL' ? { role: role as any } : {}),
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
        bio: true,
        skills: true,
        location: true,
        availabilityStatus: true,
        workPreference: true,
      },
      take: 40,
    })

    const scoredCandidates = candidates
      .map((c) => {
        const match = calculateMatchScore(c.skills || [], searchSkills, [], category || '')
        return {
          ...c,
          matchScore: match.matchScore,
          matchedSkills: match.matchedSkills,
          missingSkills: match.missingSkills,
          matchRating: match.matchRating,
        }
      })
      .filter((c) => searchSkills.length === 0 || c.matchScore >= 40)
      .sort((a, b) => b.matchScore - a.matchScore)

    // 2. Matching startups
    const startups = await prisma.startupIdea.findMany({
      where: {
        isActive: true,
        ...(category && category !== 'ALL' ? { category } : {}),
      },
      include: {
        founder: {
          select: { id: true, name: true, avatar: true, location: true },
        },
      },
      take: 40,
    })

    const scoredStartups = startups
      .map((s) => {
        const match = calculateMatchScore(searchSkills, s.requiredSkills || [], [], s.category)
        return {
          ...s,
          matchScore: match.matchScore,
          matchedSkills: match.matchedSkills,
          missingSkills: match.missingSkills,
          matchRating: match.matchRating,
        }
      })
      .filter((s) => searchSkills.length === 0 || s.matchScore >= 40)
      .sort((a, b) => b.matchScore - a.matchScore)

    return res.status(200).json({
      searchedSkills: searchSkills,
      candidates: scoredCandidates,
      startups: scoredStartups,
    })
  } catch (err: any) {
    console.error('Error in exploreSkillMatching:', err)
    return res.status(500).json({ error: err.message || 'Failed to explore skill matching.' })
  }
}
