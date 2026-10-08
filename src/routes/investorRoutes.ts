import { Router } from 'express'
import {
  toggleFavoriteStartup,
  getInvestorFavorites,
  getStartupsForInvestors,
} from '../controllers/investorController'
import { authenticate, authorizeRoles } from '../middleware/authMiddleware'
import { Role } from '@prisma/client'

const router = Router()

// All routes require INVESTOR (or ADMIN) role
router.use(authenticate, authorizeRoles(Role.INVESTOR, Role.ADMIN))

// GET /api/investors/startups - Browse startups tailored for investors
router.get('/startups', getStartupsForInvestors)

// GET /api/investors/favorites - List investor's favorite startups
router.get('/favorites', getInvestorFavorites)

// POST /api/investors/favorites/toggle - Toggle favorite status
router.post('/favorites/toggle', toggleFavoriteStartup)

export default router
