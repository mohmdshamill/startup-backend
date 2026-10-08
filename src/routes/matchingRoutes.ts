import { Router } from 'express'
import {
  getRecommendedStartupsForMe,
  getRecommendedCandidatesForStartup,
  exploreSkillMatching,
} from '../controllers/matchingController'
import { authenticate } from '../middleware/authMiddleware'

const router = Router()

// All skill matching routes require authentication
router.use(authenticate)

// 1. Candidate gets matching startups recommendations
router.get('/startups-for-me', getRecommendedStartupsForMe)

// 2. Founder gets matching candidates recommendations for their startup idea
router.get('/candidates-for-startup/:startupIdeaId', getRecommendedCandidatesForStartup)

// 3. Dynamic skill matching explorer
router.post('/explore', exploreSkillMatching)

export default router
