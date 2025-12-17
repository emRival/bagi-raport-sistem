import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import db from '../db.js'
import logger from '../utils/logger.js'
import { loginSchema, validate } from '../utils/validators.js'

const router = express.Router()

// Load JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET
const NODE_ENV = process.env.NODE_ENV || 'development'

if (!JWT_SECRET) {
    if (NODE_ENV === 'production') {
        throw new Error('CRITICAL: JWT_SECRET must be set in production environment!')
    } else {
        logger.warn('⚠️  JWT_SECRET not set! Using insecure fallback for development only.')
    }
}

const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'dev-only-insecure-fallback-key-12345'
const JWT_EXPIRES = '24h'

// Login
router.post('/login', validate(loginSchema), (req, res) => {
    try {
        const { username, password } = req.body

        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)

        if (!user) {
            logger.warn(`Failed login attempt for user: ${username}`)
            return res.status(401).json({ error: 'Username atau password salah' })
        }

        const isValid = bcrypt.compareSync(password, user.password)

        if (!isValid) {
            logger.warn(`Failed login attempt for user: ${username} (invalid password)`)
            return res.status(401).json({ error: 'Username atau password salah' })
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            EFFECTIVE_JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        )

        logger.info(`User logged in: ${username} (${user.role})`)

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                assignedClass: user.assigned_class
            }
        })
    } catch (error) {
        logger.error('Login error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Verify token
router.get('/verify', (req, res) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token tidak ditemukan' })
    }

    const token = authHeader.split(' ')[1]

    try {
        const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET)
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id)

        if (!user) {
            return res.status(401).json({ error: 'User tidak ditemukan' })
        }

        res.json({
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                assignedClass: user.assigned_class
            }
        })
    } catch (error) {
        res.status(401).json({ error: 'Token tidak valid' })
    }
})

// Auth middleware
export function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token tidak ditemukan' })
    }

    const token = authHeader.split(' ')[1]

    try {
        const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET)
        req.user = decoded
        next()
    } catch (error) {
        res.status(401).json({ error: 'Token tidak valid' })
    }
}

// Admin only middleware
export function adminOnly(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Akses ditolak' })
    }
    next()
}

export default router
