import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { Role } from '@prisma/client'
import prisma from '../config/db'
import { AuthRequest } from '../middleware/authMiddleware'

const JWT_SECRET = process.env.JWT_SECRET || 'startup-connect-kerala-jwt-secret-key-2026'

const VALID_ROLES = Object.values(Role)

// 1. Register User
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone, role } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, name, and password are required' })
    }

    if (role && !VALID_ROLES.includes(role as Role)) {
      return res.status(400).json({
        error: `Invalid role specified. Valid roles are: ${VALID_ROLES.join(', ')}`,
      })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email address already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const userRole = (role as Role) || Role.DEVELOPER

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        phone: phone || null,
        role: userRole,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        bio: true,
        skills: true,
        avatar: true,
        createdAt: true,
      },
    })


    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.status(201).json({
      message: 'User registered successfully',
      user,
      token,
    })
  } catch (error: any) {
    console.error('Registration error:', error)
    return res.status(500).json({ error: 'Internal server error during user registration' })
  }
}

// 2. Login User
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact Admin.' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        bio: user.bio,
        skills: user.skills,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      token,
    })

  } catch (error: any) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Internal server error during login' })
  }
}

// 3. Logout User
export const logout = async (req: AuthRequest, res: Response) => {
  try {
    // In JWT stateless auth, logout is handled client-side by clearing stored tokens.
    return res.status(200).json({ message: 'Logout successful' })
  } catch (error: any) {
    return res.status(500).json({ error: 'Logout failed' })
  }
}

// 4. Forgot Password
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // Return 200 for security to prevent user enumeration
      return res.status(200).json({
        message: 'If an account exists with this email, a password reset link has been generated.',
      })
    }

    // Clean up old reset tokens for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiry

    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt,
      },
    })

    return res.status(200).json({
      message: 'Password reset token generated successfully',
      resetToken, // Returned for testing / email simulation
      expiresAt,
    })
  } catch (error: any) {
    console.error('Forgot password error:', error)
    return res.status(500).json({ error: 'Error generating password reset request' })
  }
}

// 5. Reset Password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' })
    }

    const resetTokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!resetTokenRecord || resetTokenRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: resetTokenRecord.userId },
      data: { password: hashedPassword },
    })

    // Consume the reset token
    await prisma.passwordResetToken.delete({ where: { id: resetTokenRecord.id } })

    return res.status(200).json({ message: 'Password has been reset successfully' })
  } catch (error: any) {
    console.error('Reset password error:', error)
    return res.status(500).json({ error: 'Error resetting password' })
  }
}

// 6. Get Current User Profile
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        bio: true,
        skills: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'User profile not found' })
    }

    return res.status(200).json({ user })
  } catch (error: any) {
    return res.status(500).json({ error: 'Error fetching profile' })
  }
}
