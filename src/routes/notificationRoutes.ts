import { Router } from 'express'
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controllers/notificationController'
import { authenticate } from '../middleware/authMiddleware'

const router = Router()

// All notification routes require authentication
router.use(authenticate)

router.get('/', getMyNotifications)
router.get('/unread-count', getUnreadCount)
router.patch('/read-all', markAllNotificationsAsRead)
router.patch('/:id/read', markNotificationAsRead)

export default router
