import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { Role } from '@prisma/client'

export interface AuthUserPayload {
  id: string
  email: string
  name: string
  role: Role
}

export interface AuthRequest extends Request {
  user?: AuthUserPayload
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Access token missing or invalid' })
  }

  const token = authHeader.split(' ')[1]
  const jwtSecret = process.env.JWT_SECRET || 'startup-connect-kerala-jwt-secret-key-2026'

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthUserPayload
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' })
  }
}

export const authorizeRoles = (...allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Access restricted to roles: ${allowedRoles.join(', ')}`,
      })
    }

    next()
  }
}
