import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware'
import {
  getWorkspaceTasks,
  createTask,
  updateTask,
  updateTaskAssignees,
  updateTaskStatus,
  deleteTask,
} from '../controllers/taskController'

const router = Router()

// All task routes require authentication
router.use(authenticate)

// Workspace task listing and creation
router.get('/workspace/:startupIdeaId', getWorkspaceTasks)
router.post('/workspace/:startupIdeaId', createTask)

// Individual task operations
router.patch('/:taskId', updateTask)
router.patch('/:taskId/assignees', updateTaskAssignees)
router.patch('/:taskId/status', updateTaskStatus)
router.delete('/:taskId', deleteTask)

export default router
