import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware'
import {
  getMyWorkspaces,
  getWorkspaceDetails,
  createNote,
  updateNote,
  deleteNote,
  togglePinNote,
  createAnnouncement,
  deleteAnnouncement,
  togglePinAnnouncement,
  uploadStartupFile,
  deleteStartupFile,
} from '../controllers/collaborationController'

const router = Router()

// All collaboration routes require authentication
router.use(authenticate)

// Workspace list and details
router.get('/my-workspaces', getMyWorkspaces)
router.get('/workspace/:startupIdeaId', getWorkspaceDetails)

// Notes routes
router.post('/workspace/:startupIdeaId/notes', createNote)
router.patch('/notes/:noteId', updateNote)
router.delete('/notes/:noteId', deleteNote)
router.patch('/notes/:noteId/pin', togglePinNote)

// Announcements routes
router.post('/workspace/:startupIdeaId/announcements', createAnnouncement)
router.delete('/announcements/:announcementId', deleteAnnouncement)
router.patch('/announcements/:announcementId/pin', togglePinAnnouncement)

// Files routes
router.post('/workspace/:startupIdeaId/files', uploadStartupFile)
router.delete('/files/:fileId', deleteStartupFile)

export default router
