import { Router } from 'express'
import {
  getStartupMetadata,
  createStartupIdea,
  getMyStartupIdeas,
  getAllStartupIdeas,
  getStartupIdeaById,
  updateStartupIdea,
  deleteStartupIdea,
} from '../controllers/startupController'
import { authenticate, authorizeRoles } from '../middleware/authMiddleware'
import { Role } from '@prisma/client'

const router = Router()

// Public / Discover endpoints
router.get('/metadata', getStartupMetadata)
router.get('/', getAllStartupIdeas)

// Authenticated founder endpoints
router.get('/my', authenticate, getMyStartupIdeas)
router.get('/:id', getStartupIdeaById)

// Role-protected creation (FOUNDER, ADMIN)
router.post('/', authenticate, authorizeRoles(Role.FOUNDER, Role.ADMIN), createStartupIdea)

// Owner or Admin modification endpoints
router.put('/:id', authenticate, updateStartupIdea)
router.delete('/:id', authenticate, deleteStartupIdea)

export default router
