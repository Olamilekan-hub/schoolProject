// src/app.ts - Main Express Server
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { createServer } from 'https'
import { readFileSync } from 'fs'
import { Server as SocketIOServer } from 'socket.io'
import path from 'path'

import { config } from './config/env'
import { prisma } from './config/database'
import { errorHandler, notFound } from './middleware/errorHandler'
import { logger } from './utils/logger'

// Route imports
import authRoutes from './routes/auth'
import studentRoutes from './routes/students'
import courseRoutes from './routes/courses'
import attendanceRoutes from './routes/attendance'
import biometricRoutes from './routes/biometric'
import dashboardRoutes from './routes/dashboard'
import reportsRoutes from './routes/reports'

const app = express()

// Trust proxy for proper IP detection
app.set('trust proxy', 1)

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}))

// CORS configuration
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())
app.use(compression())

// Logging middleware
if (config.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }))
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    database: 'connected' // We'll add actual DB health check later
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/courses', courseRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/biometric', biometricRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/reports', reportsRoutes)

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Error handling middleware
app.use(notFound)
app.use(errorHandler)

// Create HTTPS server
const server = createServer({
  key: readFileSync(config.SSL_KEY_PATH),
  cert: readFileSync(config.SSL_CERT_PATH)
}, app)

// Socket.IO setup for real-time features
const io = new SocketIOServer(server, {
  cors: {
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
})

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  if (token) {
    // TODO: Verify JWT token
    // For now, just allow connection
    next()
  } else {
    next(new Error('Authentication error'))
  }
})

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`)
  
  socket.on('join-session', (sessionId) => {
    socket.join(`session-${sessionId}`)
    logger.info(`Socket ${socket.id} joined session ${sessionId}`)
  })
  
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`)
  })
})

// Make io available globally for emitting events
app.set('io', io)

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    logger.info('Process terminated')
  })
  await prisma.$disconnect()
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  server.close(() => {
    logger.info('Process terminated')
  })
  await prisma.$disconnect()
})

// Start server
const PORT = config.PORT || 5000
server.listen(PORT, () => {
  logger.info(`🚀 Server running on https://localhost:${PORT}`)
  logger.info(`📊 Environment: ${config.NODE_ENV}`)
  logger.info(`🔒 CORS Origin: ${config.CORS_ORIGIN}`)
})

export default app