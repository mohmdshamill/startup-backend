import { Router } from 'express'
import { Role } from '@prisma/client'
import {
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
  getAdminStats,
  getAllStartupsAdmin,
  toggleStartupVerification,
  getAllReports,
  updateReportStatus
} from '../controllers/adminController'
import { authenticate, authorizeRoles } from '../middleware/authMiddleware'

const router = Router()

// All admin routes require JWT authentication and ADMIN role access
router.use(authenticate, authorizeRoles(Role.ADMIN))

router.get('/users', getAllUsers)
router.put('/users/:id/role', updateUserRole)
router.put('/users/:id/status', toggleUserStatus)
router.get('/stats', getAdminStats)

router.get('/startups', getAllStartupsAdmin)
router.put('/startups/:id/verify', toggleStartupVerification)

router.get('/reports', getAllReports)
router.put('/reports/:id/status', updateReportStatus)

export default router
