import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware'
import {
  getMyProfile,
  updatePersonalInfo,
  updateSkills,
  addEducation,
  updateEducation,
  deleteEducation,
  addExperience,
  updateExperience,
  deleteExperience,
  updateResume,
  addPortfolio,
  updatePortfolio,
  deletePortfolio,
  updateInterests,
  updateAvailability,
} from '../controllers/profileController'

const router = Router()

// All profile endpoints require authentication
router.use(authenticate)

// Get complete profile
router.get('/me', getMyProfile)

// Personal Info
router.put('/personal-info', updatePersonalInfo)

// Skills
router.put('/skills', updateSkills)

// Education
router.post('/education', addEducation)
router.put('/education/:id', updateEducation)
router.delete('/education/:id', deleteEducation)

// Experience
router.post('/experience', addExperience)
router.put('/experience/:id', updateExperience)
router.delete('/experience/:id', deleteExperience)

// Resume
router.put('/resume', updateResume)

// Portfolio
router.post('/portfolio', addPortfolio)
router.put('/portfolio/:id', updatePortfolio)
router.delete('/portfolio/:id', deletePortfolio)

// Interests
router.put('/interests', updateInterests)

// Availability
router.put('/availability', updateAvailability)

export default router
