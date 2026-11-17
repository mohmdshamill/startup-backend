import { Router } from 'express'
import {
  applyToStartup,
  getMyApplications,
  getStartupApplications,
  getFounderAllApplications,
  updateApplicationStatus,
  withdrawApplication,
  getApplicationById,
  applyAsInvestor,
  getMyInvestorApplications,
  withdrawInvestorApplication,
  getFounderInvestorApplications,
  updateInvestorApplicationStatus,
} from '../controllers/applicationController'
import { authenticate } from '../middleware/authMiddleware'

const router = Router()

// All recruitment application routes require authentication
router.use(authenticate)

// Candidate routes
router.post('/', applyToStartup)
router.get('/my-applications', getMyApplications)
router.patch('/:id/withdraw', withdrawApplication)

// Investor routes (must stay above '/:id')
router.post('/investor', applyAsInvestor)
router.get('/investor/my-applications', getMyInvestorApplications)
router.patch('/investor/:id/withdraw', withdrawInvestorApplication)
router.get('/investor/founder/all', getFounderInvestorApplications)
router.patch('/investor/:id/status', updateInvestorApplicationStatus)

// Founder routes
router.get('/founder/all', getFounderAllApplications)
router.get('/startup/:startupIdeaId', getStartupApplications)
router.patch('/:id/status', updateApplicationStatus)

// Shared single application detail
router.get('/:id', getApplicationById)

export default router
