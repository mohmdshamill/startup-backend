import { Response } from 'express'
import prisma from '../config/db'
import { AuthRequest } from '../middleware/authMiddleware'
import { checkStartupAccess } from './collaborationController'

/**
 * Helper: resolve workspace access or return 403
 */
async function resolveAccess(req: AuthRequest, res: Response, startupIdeaId: string) {
  const userId = req.user!.id
  const userRole = req.user!.role as string
  const access = await checkStartupAccess(startupIdeaId, userId, userRole)
  if (!access.hasAccess) {
    res.status(403).json({ error: 'Access denied: not a member of this workspace' })
    return null
  }
  return access
}

/**
 * GET /api/tasks/workspace/:startupIdeaId
 * Return all tasks for a workspace, with assignees populated
 */
export const getWorkspaceTasks = async (req: AuthRequest, res: Response) => {
  try {
    const { startupIdeaId } = req.params
    const access = await resolveAccess(req, res, startupIdeaId)
    if (!access) return

    const tasks = await prisma.task.findMany({
      where: { startupIdeaId },
      include: {
        creator: { select: { id: true, name: true, avatar: true, role: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, avatar: true, role: true, email: true } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
    })

    res.json({ tasks })
  } catch (err) {
    console.error('getWorkspaceTasks error:', err)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
}

/**
 * POST /api/tasks/workspace/:startupIdeaId
 * Create a new task; only founders and accepted team members can create
 */
export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const { startupIdeaId } = req.params
    const userId = req.user!.id

    const access = await resolveAccess(req, res, startupIdeaId)
    if (!access) return

    const { title, description, priority, deadline, tags, assigneeIds } = req.body

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Task title is required' })
    }

    const task = await prisma.task.create({
      data: {
        startupIdeaId,
        creatorId: userId,
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || 'MEDIUM',
        deadline: deadline ? new Date(deadline) : null,
        tags: Array.isArray(tags) ? tags : [],
        status: 'PENDING',
        progress: 0,
        assignees: {
          create: Array.isArray(assigneeIds)
            ? assigneeIds.map((uid: string) => ({ userId: uid }))
            : [],
        },
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true, role: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, avatar: true, role: true, email: true } },
          },
        },
      },
    })

    res.status(201).json({ task, message: 'Task created successfully' })
  } catch (err) {
    console.error('createTask error:', err)
    res.status(500).json({ error: 'Failed to create task' })
  }
}

/**
 * PATCH /api/tasks/:taskId
 * Update task: title, description, status, priority, deadline, progress, tags
 */
export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params
    const userId = req.user!.id
    const userRole = req.user!.role as string

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignees: { select: { userId: true } } },
    })

    if (!task) return res.status(404).json({ error: 'Task not found' })

    // Check access
    const access = await checkStartupAccess(task.startupIdeaId, userId, userRole)
    if (!access.hasAccess) return res.status(403).json({ error: 'Access denied' })

    const { title, description, status, priority, deadline, progress, tags } = req.body

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(progress !== undefined && { progress: Math.min(100, Math.max(0, Number(progress))) }),
        ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true, role: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, avatar: true, role: true, email: true } },
          },
        },
      },
    })

    res.json({ task: updated, message: 'Task updated successfully' })
  } catch (err) {
    console.error('updateTask error:', err)
    res.status(500).json({ error: 'Failed to update task' })
  }
}

/**
 * PATCH /api/tasks/:taskId/assignees
 * Replace assignee list for a task (founders/admins only)
 */
export const updateTaskAssignees = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params
    const userId = req.user!.id
    const userRole = req.user!.role as string

    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task) return res.status(404).json({ error: 'Task not found' })

    const access = await checkStartupAccess(task.startupIdeaId, userId, userRole)
    if (!access.hasAccess) return res.status(403).json({ error: 'Access denied' })

    // Only founder / admin can reassign
    if (access.roleInWorkspace !== 'FOUNDER' && access.roleInWorkspace !== 'ADMIN') {
      return res.status(403).json({ error: 'Only founders can manage assignees' })
    }

    const { assigneeIds } = req.body
    if (!Array.isArray(assigneeIds)) {
      return res.status(400).json({ error: 'assigneeIds must be an array' })
    }

    // Replace all assignees
    await prisma.taskAssignee.deleteMany({ where: { taskId } })

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        assignees: {
          create: assigneeIds.map((uid: string) => ({ userId: uid })),
        },
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true, role: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, avatar: true, role: true, email: true } },
          },
        },
      },
    })

    res.json({ task: updated, message: 'Assignees updated' })
  } catch (err) {
    console.error('updateTaskAssignees error:', err)
    res.status(500).json({ error: 'Failed to update assignees' })
  }
}

/**
 * DELETE /api/tasks/:taskId
 * Delete a task; only creator or founder/admin can delete
 */
export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params
    const userId = req.user!.id
    const userRole = req.user!.role as string

    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task) return res.status(404).json({ error: 'Task not found' })

    const access = await checkStartupAccess(task.startupIdeaId, userId, userRole)
    if (!access.hasAccess) return res.status(403).json({ error: 'Access denied' })

    // Must be creator, founder, or admin
    if (
      task.creatorId !== userId &&
      access.roleInWorkspace !== 'FOUNDER' &&
      access.roleInWorkspace !== 'ADMIN'
    ) {
      return res.status(403).json({ error: 'Only the task creator or founder can delete this task' })
    }

    await prisma.task.delete({ where: { id: taskId } })

    res.json({ message: 'Task deleted successfully' })
  } catch (err) {
    console.error('deleteTask error:', err)
    res.status(500).json({ error: 'Failed to delete task' })
  }
}

/**
 * PATCH /api/tasks/:taskId/status
 * Quick status/progress update (any workspace member)
 */
export const updateTaskStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params
    const userId = req.user!.id
    const userRole = req.user!.role as string

    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task) return res.status(404).json({ error: 'Task not found' })

    const access = await checkStartupAccess(task.startupIdeaId, userId, userRole)
    if (!access.hasAccess) return res.status(403).json({ error: 'Access denied' })

    const { status, progress } = req.body

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(status !== undefined && { status }),
        ...(progress !== undefined && { progress: Math.min(100, Math.max(0, Number(progress))) }),
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true, role: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, avatar: true, role: true, email: true } },
          },
        },
      },
    })

    res.json({ task: updated, message: 'Status updated' })
  } catch (err) {
    console.error('updateTaskStatus error:', err)
    res.status(500).json({ error: 'Failed to update task status' })
  }
}
