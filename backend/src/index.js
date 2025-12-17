import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { Server } from 'socket.io'
import logger from './utils/logger.js'
import { generalLimiter, authLimiter } from './middleware/rateLimiter.js'
import { startBackupSchedule } from './utils/backup.js'

// Import database (initializes tables)
import './db.js'

// Import routes
import authRouter, { authMiddleware } from './routes/auth.js'
import studentsRouter from './routes/students.js'
import queueRouter from './routes/queue.js'
import settingsRouter from './routes/settings.js'

// Environment configuration with defaults
const PORT = process.env.PORT || 3001
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'
const NODE_ENV = process.env.NODE_ENV || 'development'

const app = express()
const httpServer = createServer(app)

// Socket.io setup
// Restart trigger 1
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
    }
})

// Security headers with helmet
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for easier frontend integration
    crossOriginEmbedderPolicy: false,
}))

// Middleware
app.set('trust proxy', 1) // For rate limiting behind reverse proxy
app.use(express.json())
app.use(cors({
    origin: CORS_ORIGIN,
    credentials: true
}))

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter)

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Middleware to attach io to req
app.use((req, res, next) => {
    req.io = io
    next()
})

// Routes (with specific rate limiters)
app.use('/api/auth', authLimiter, authRouter)
app.use('/api/students', authMiddleware, studentsRouter)
app.use('/api/queue', authMiddleware, queueRouter)
app.use('/api/settings', settingsRouter)

// Socket.io connections
const clients = {
    tv: new Map(),
    teacher: new Map(),
    admin: new Map()
}

io.on('connection', (socket) => {
    logger.debug(`🔌 Client connected: ${socket.id}`)

    socket.on('register', (data) => {
        logger.debug('🔍 Raw register data received:', data, 'Type:', typeof data)
        // Handle both string (old) and object (new) formats for backward compatibility
        const role = typeof data === 'string' ? data : data.role
        const className = typeof data === 'object' ? data.className : null

        socket.role = role
        socket.className = className

        if (clients[role]) {
            clients[role].set(socket.id, socket)
        }
        logger.info(`📝 ${socket.id} registered as: ${role}${className ? ` (${className})` : ''}`)

        // If teacher connects/disconnects, broadcast online classes to TV
        if (role === 'teacher' && className) {
            broadcastOnlineClasses()
        }
        // If TV connects, send current status immediately
        if (role === 'tv') {
            broadcastOnlineClasses()
        }
    })

    socket.on('call-student', (data) => {
        logger.info(`📞 Call student:`, data)
        io.emit('student-called', data)
    })

    socket.on('finish-student', (data) => {
        logger.info(`✅ Finish student:`, data)
        io.emit('student-finished', data)
    })

    socket.on('broadcast-announcement', (data) => {
        logger.info(`📢 Broadcast announcement:`, data)
        io.emit('announcement', data)
    })

    socket.on('disconnect', () => {
        logger.debug(`❌ Client disconnected: ${socket.id}`)
        logger.debug(`   Role: ${socket.role}, Class: ${socket.className}`)

        if (socket.role && clients[socket.role]) {
            const wasDeleted = clients[socket.role].delete(socket.id)
            logger.debug(`   Removed from ${socket.role} list: ${wasDeleted}`)
            logger.debug(`   Remaining ${socket.role} clients: ${clients[socket.role].size}`)

            // If teacher disconnects, broadcast update
            if (socket.role === 'teacher' && socket.className) {
                logger.debug(`   Broadcasting update for terminated teacher session...`)
                broadcastOnlineClasses()
            }
        } else {
            logger.warn('   ⚠️ No role found or client list missing for this socket.')
        }
    })

    // Helper to broadcast online classes
    const broadcastOnlineClasses = () => {
        const onlineClasses = []
        clients['teacher'].forEach((socket) => {
            if (socket.className && !onlineClasses.includes(socket.className)) {
                onlineClasses.push(socket.className)
            }
        })
        logger.debug('📡 Broadcasting online classes:', onlineClasses)
        io.emit('online-status', onlineClasses)
    }
})

// Start server
httpServer.listen(PORT, () => {
    logger.info(`
🚀 Bagi Raport Backend Server
   
   API:       http://localhost:${PORT}/api
   WebSocket: http://localhost:${PORT}
   Health:    http://localhost:${PORT}/api/health
   
   Environment: ${NODE_ENV}
   CORS Origin: ${CORS_ORIGIN}
`)

    // Start automated backup system
    startBackupSchedule()
})

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, closing server gracefully...')
    httpServer.close(() => {
        logger.info('Server closed')
        process.exit(0)
    })
})

export { io }
