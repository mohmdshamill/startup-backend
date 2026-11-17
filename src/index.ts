import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
// CVs are uploaded as base64 data URLs (up to 10MB files), so allow large JSON bodies
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))

// Import routes
import adminRoutes from './routes/adminRoutes'
import applicationRoutes from './routes/applicationRoutes'
import authRoutes from './routes/authRoutes'
import collaborationRoutes from './routes/collaborationRoutes'
import investorRoutes from './routes/investorRoutes'
import matchingRoutes from './routes/matchingRoutes'
import notificationRoutes from './routes/notificationRoutes'
import profileRoutes from './routes/profileRoutes'
import startupRoutes from './routes/startupRoutes'
import taskRoutes from './routes/taskRoutes'

app.use('/api/admin', adminRoutes)
app.use('/api/applications', applicationRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/collaboration', collaborationRoutes)
app.use('/api/investors', investorRoutes)
app.use('/api/matching', matchingRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/startups', startupRoutes)
app.use('/api/tasks', taskRoutes)

// Always answer errors with JSON (never the default HTML page)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  const status = err.status || err.statusCode || 500
  res.status(status).json({
    error: err.type === 'entity.too.large' ? 'File is too large to upload.' : err.message || 'Internal server error',
  })
})

const PORT =process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
