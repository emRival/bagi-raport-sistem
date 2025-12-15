import express from 'express'
import db from '../db.js'
import { authMiddleware } from './auth.js'
import bcrypt from 'bcryptjs'
import logger from '../utils/logger.js'
import { settingsSchema, userSchema, userUpdateSchema, validate } from '../utils/validators.js'
import { modifyLimiter } from '../middleware/rateLimiter.js'

const router = express.Router()

// Get all settings (Public)
router.get('/', (req, res) => {
    try {
        const settings = db.prepare('SELECT * FROM settings').all()
        const result = {}
        settings.forEach(s => {
            try {
                result[s.key] = JSON.parse(s.value)
            } catch {
                result[s.key] = s.value
            }
        })
        res.json(result)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Update setting (Protected)
router.put('/:key', authMiddleware, modifyLimiter, validate(settingsSchema), (req, res) => {
    try {
        const { value } = req.body
        const valueStr = typeof value === 'string' ? value : JSON.stringify(value)

        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(req.params.key, valueStr)
        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
})



// Get users (admin only)
router.get('/users', authMiddleware, (req, res) => {
    try {
        const users = db.prepare(`
            SELECT id, username, name, role, assigned_class, created_at 
            FROM users
        `).all()
        res.json(users)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Create user
router.post('/users', authMiddleware, modifyLimiter, validate(userSchema), async (req, res) => {
    try {
        const { username, password, name, role, assignedClass } = req.body

        // Hash password (need bcrypt import in this file? currently using db.js but bcrypt logic usually here or auth service)
        // db.js imports bcrypt but doesn't export it. Need to import bcryptjs here.
        // Wait, need to check if bcryptjs is imported. It wasn't. Will fix imports later.
        // Assuming simple insert for now or will assume bcrypt usage.

        // Let's rely on db.prepare execution. But we need to hash password first.
        // I will add bcryptjs import in next step. For now writing logic.

        // Verify username unique
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
        if (existing) return res.status(400).json({ error: 'Username already taken' })

        const hash = await bcrypt.hash(password, 10)

        db.prepare(`
            INSERT INTO users (username, password, name, role, assigned_class)
            VALUES (?, ?, ?, ?, ?)
        `).run(username, hash, name, role, assignedClass || null)

        res.json({ success: true })
    } catch (error) {
        logger.error('Create user error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Update user
router.put('/users/:id', authMiddleware, modifyLimiter, validate(userUpdateSchema), async (req, res) => {
    try {
        const { username, password, name, role, assignedClass } = req.body
        const userId = req.params.id

        if (password) {
            const hash = await bcrypt.hash(password, 10)
            db.prepare(`
                UPDATE users 
                SET username = ?, password = ?, name = ?, role = ?, assigned_class = ?
                WHERE id = ?
            `).run(username, hash, name, role, assignedClass || null, userId)
        } else {
            db.prepare(`
                UPDATE users 
                SET username = ?, name = ?, role = ?, assigned_class = ?
                WHERE id = ?
            `).run(username, name, role, assignedClass || null, userId)
        }
        res.json({ success: true })
    } catch (error) {
        logger.error('Update user error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Delete user
router.delete('/users/:id', authMiddleware, (req, res) => {
    try {
        const userId = req.params.id
        // Prevent deleting self? Frontend handles caution.
        db.prepare('DELETE FROM users WHERE id = ?').run(userId)
        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
})


// Broadcast announcement (Trigger Popup)
router.post('/announcements/:id/broadcast', (req, res) => {
    try {
        const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id)

        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' })
        }

        if (req.io) {
            logger.debug(`📢 Broadcasting announcement: ${announcement.text}`)
            req.io.emit('announcement', { text: announcement.text })
        }

        res.json({ success: true })
    } catch (error) {
        logger.error('Broadcast error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// ANNOUNCEMENTS
router.get('/announcements', (req, res) => {
    try {
        logger.debug('📢 API: Request received for /announcements')
        const announcements = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all()
        logger.debug('📢 API: Query Result:', JSON.stringify(announcements))
        res.json(announcements)
    } catch (error) {
        logger.error('📢 API: Error fetching announcements:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

router.post('/announcements', authMiddleware, (req, res) => {
    try {
        const { text, is_active = 1 } = req.body
        const result = db.prepare('INSERT INTO announcements (text, is_active) VALUES (?, ?)').run(text, is_active)

        // Return the created announcement
        const newAnn = db.prepare('SELECT * FROM announcements WHERE id = ?').get(result.lastInsertRowid)

        if (req.io) req.io.emit('announcement-updated')

        res.json(newAnn)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
})

router.put('/announcements/:id', authMiddleware, (req, res) => {
    try {
        const { text, is_active } = req.body

        // Build dynamic query
        const updates = []
        const params = []

        if (text !== undefined) {
            updates.push('text = ?')
            params.push(text)
        }

        if (is_active !== undefined) {
            updates.push('is_active = ?')
            params.push(is_active)
        }

        if (updates.length > 0) {
            params.push(req.params.id)
            db.prepare(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`).run(...params)

            if (req.io) req.io.emit('announcement-updated')
        }

        const updatedAnn = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id)
        res.json(updatedAnn)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
})

router.delete('/announcements/:id', authMiddleware, (req, res) => {
    try {
        db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id)
        if (req.io) req.io.emit('announcement-updated')
        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
})

export default router
