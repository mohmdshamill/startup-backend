import { Router } from 'express'
import {
  applyToStartup,
  getMyApplications,
  getStartupApplications,
  getFounderAllApplications,
  updateApplicationStatus,
  withdrawApplication,
  getApplicationById,
} from '../controllers/applicationController'
import { authenticate } from '../middleware/authMiddleware'

const router = Router()

// All recruitment application routes require authentication
router.use(authenticate)

// Candidate routes
router.post('/', applyToStartup)
router.get('/my-applications', getMyApplications)
router.patch('/:id/withdraw', withdrawApplication)

// Founder routes
router.get('/founder/all', getFounderAllApplications)
router.get('/startup/:startupIdeaId', getStartupApplications)
router.patch('/:id/status', updateApplicationStatus)

// Shared single application detail
router.get('/:id', getApplicationById)

export default router
