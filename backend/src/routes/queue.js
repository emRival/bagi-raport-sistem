import express from 'express'
import db from '../db.js'
import logger from '../utils/logger.js'
import { checkInSchema, validate } from '../utils/validators.js'
import { checkInLimiter } from '../middleware/rateLimiter.js'
import { authMiddleware } from './auth.js'

const router = express.Router()

// Helper: Verify user can access queue entry (IDOR Protection)
// Admin/Satpam can access all, Teachers only their assigned class
const verifyQueueAccess = (req, res, next) => {
    const queueId = req.params.id
    const user = req.user

    // Admin and satpam can access everything
    if (user.role === 'admin' || user.role === 'satpam') {
        return next()
    }

    // For teachers, verify the queue entry belongs to their class
    if (user.role === 'teacher') {
        // Get teacher's assigned class from database
        const userData = db.prepare('SELECT assigned_class FROM users WHERE id = ?').get(user.id)

        if (!userData?.assigned_class) {
            return res.status(403).json({ error: 'Teacher tidak memiliki kelas yang ditugaskan' })
        }

        // Get queue entry's student class
        const queue = db.prepare(`
            SELECT s.class 
            FROM queue q 
            JOIN students s ON q.student_id = s.id 
            WHERE q.id = ?
        `).get(queueId)

        if (!queue) {
            return res.status(404).json({ error: 'Queue entry not found' })
        }

        if (queue.class !== userData.assigned_class) {
            logger.warn(`IDOR attempt: User ${user.id} tried to access queue ${queueId} of class ${queue.class}`)
            return res.status(403).json({ error: 'Anda hanya bisa mengakses antrian kelas Anda sendiri' })
        }
    }

    next()
}

// Helper to format phone number to international format (628xxx)
const formatPhoneNumber = (phone) => {
    if (!phone) return phone

    // Remove spaces, dashes, parentheses
    let formatted = phone.replace(/[\s\-\(\)]/g, '')

    // Convert 08xxx to 628xxx
    if (formatted.startsWith('08')) {
        formatted = '62' + formatted.substring(1)
    }
    // Remove + prefix if exists
    else if (formatted.startsWith('+62')) {
        formatted = formatted.substring(1)
    }

    return formatted
}

// Helper to get date/time in Indonesia timezone (WIB - Asia/Jakarta)
const getIndonesiaDate = () => {
    const now = new Date()
    return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) // YYYY-MM-DD format
}

const getIndonesiaDateTime = () => {
    const now = new Date()
    return now.toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).replace(' ', 'T')
}

// Get today's queue for a class
router.get('/', (req, res) => {
    try {
        const { class: cls, date } = req.query
        const targetDate = date || getIndonesiaDate()

        let query = `
            SELECT q.*, s.nis, s.name, s.class, s.parent_name
            FROM queue q
            JOIN students s ON q.student_id = s.id
            WHERE q.date = ?
        `
        const params = [targetDate]

        if (cls) {
            query += ' AND s.class = ?'
            params.push(cls)
        }

        query += ' ORDER BY q.check_in_time ASC'

        const queue = db.prepare(query).all(...params)
        res.json(queue)
    } catch (error) {
        logger.error('Get queue error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Get queue history (all dates)
router.get('/history', (req, res) => {
    try {
        const { class: cls, limit = 100, offset = 0 } = req.query

        let query = `
            SELECT q.*, s.nis, s.name, s.class, s.parent_name
            FROM queue q
            JOIN students s ON q.student_id = s.id
            WHERE q.status = 'FINISHED'
        `
        const params = []

        if (cls) {
            query += ' AND s.class = ?'
            params.push(cls)
        }

        query += ' ORDER BY q.check_in_time DESC LIMIT ? OFFSET ?'
        params.push(parseInt(limit), parseInt(offset))

        const history = db.prepare(query).all(...params)

        // Get total count
        let countQuery = `SELECT COUNT(*) as total FROM queue q JOIN students s ON q.student_id = s.id WHERE q.status = 'FINISHED'`
        const countParams = []
        if (cls) {
            countQuery += ' AND s.class = ?'
            countParams.push(cls)
        }
        const total = db.prepare(countQuery).get(...countParams)

        res.json({ data: history, total: total.total })
    } catch (error) {
        logger.error('Get history error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Get queue stats
router.get('/stats', (req, res) => {
    try {
        const today = getIndonesiaDate()

        const byClass = db.prepare(`
            SELECT 
                s.class, 
                COUNT(*) as total,
                SUM(CASE WHEN q.status = 'WAITING' THEN 1 ELSE 0 END) as waiting,
                SUM(CASE WHEN q.status = 'CALLED' THEN 1 ELSE 0 END) as called,
                SUM(CASE WHEN q.status = 'FINISHED' THEN 1 ELSE 0 END) as finished
            FROM queue q
            JOIN students s ON q.student_id = s.id
            WHERE q.date = ?
            GROUP BY s.class
        `).all(today)

        const totals = db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN q.status = 'WAITING' THEN 1 ELSE 0 END) as waiting,
                SUM(CASE WHEN q.status = 'FINISHED' THEN 1 ELSE 0 END) as finished
            FROM queue q
            WHERE q.date = ?
        `).get(today)

        // Get active calls (latest called student per class that hasn't finished)
        // Actually, logic is: status = 'CALLED'. If multiple are called, we technically should show them?
        // But usually one per class. Let's get all 'CALLED' students.
        const activeCalls = db.prepare(`
            SELECT s.class, s.name
            FROM queue q
            JOIN students s ON q.student_id = s.id
            WHERE q.date = ? AND q.status = 'CALLED'
            ORDER BY q.called_time ASC
        `).all(today)

        logger.debug('📊 Stats Active Calls Query Result:', activeCalls)

        const activeCallsMap = activeCalls.reduce((acc, curr) => {
            acc[curr.class] = curr.name
            return acc
        }, {})

        res.json({
            byClass,
            totals,
            activeCalls: activeCallsMap
        })
    } catch (error) {
        logger.error('Stats error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Get recent activity
router.get('/activity', (req, res) => {
    try {
        const { limit = 20 } = req.query

        // Get recent queue activities
        const activities = db.prepare(`
            SELECT 
                q.id,
                'queue' as type,
                q.status,
                q.check_in_time,
                q.called_time,
                q.finished_time,
                s.name as student_name,
                s.class,
                u.name as called_by_name
            FROM queue q
            JOIN students s ON q.student_id = s.id
            LEFT JOIN users u ON q.called_by = u.id
            ORDER BY 
                COALESCE(q.finished_time, q.called_time, q.check_in_time) DESC
            LIMIT ?
        `).all(parseInt(limit))

        res.json(activities)
    } catch (error) {
        logger.error('Get activity error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Check-in student with phone number
router.post('/checkin', checkInLimiter, validate(checkInSchema), (req, res) => {
    try {
        const { student_id, nis, parent_phone } = req.body
        logger.debug('🚀 DEBUG: Processing Checkin... V3')
        const today = getIndonesiaDate()

        let studentId = student_id

        // If NIS provided, find student
        if (nis && !studentId) {
            const student = db.prepare('SELECT id FROM students WHERE nis = ?').get(nis)
            if (!student) {
                return res.status(404).json({ error: 'Siswa tidak ditemukan' })
            }
            studentId = student.id
        }

        if (!studentId) {
            return res.status(400).json({ error: 'Student ID atau NIS diperlukan' })
        }

        // Check if already in queue today
        const existing = db.prepare(`
            SELECT * FROM queue WHERE student_id = ? AND date = ?
        `).get(studentId, today)

        if (existing) {
            return res.status(400).json({ error: 'Siswa sudah terdaftar dalam antrian hari ini' })
        }

        // Fetch student to get class info
        const studentData = db.prepare('SELECT class FROM students WHERE id = ?').get(studentId)
        if (!studentData) {
            return res.status(404).json({ error: 'Data siswa tidak ditemukan' })
        }

        // Calculate queue number for this class today
        const queueCount = db.prepare(`
            SELECT COUNT(*) as count 
            FROM queue q
            JOIN students s ON q.student_id = s.id
            WHERE q.date = ? AND s.class = ?
        `).get(today, studentData.class)

        const nextQueueNumber = queueCount.count + 1

        const result = db.prepare(`
            INSERT INTO queue (student_id, parent_phone, status, date, check_in_time, queue_number)
            VALUES (?, ?, 'WAITING', ?, ?, ?)
        `).run(studentId, parent_phone || null, today, getIndonesiaDateTime(), nextQueueNumber)

        const queue = db.prepare(`
            SELECT q.*, s.nis, s.name, s.class, s.parent_name
            FROM queue q
            JOIN students s ON q.student_id = s.id
            WHERE q.id = ?
        `).get(result.lastInsertRowid)

        // Emit socket event to update TV
        if (req.io) {
            req.io.emit('queue-updated')
        }

        res.status(201).json(queue);

        // Send WhatsApp Notification (Async)
        (async () => {
            try {
                // Check if WA is enabled and parent phone exists
                if (!parent_phone) return

                const waSettings = db.prepare(`
                    SELECT * FROM settings 
                    WHERE key IN ('waEnabled', 'waApiUrl', 'waApiToken', 'waCheckinTemplate')
                `).all()

                const settingsMap = waSettings.reduce((acc, curr) => {
                    try {
                        acc[curr.key] = JSON.parse(curr.value)
                    } catch {
                        acc[curr.key] = curr.value
                    }
                    return acc
                }, {})

                if (!settingsMap.waEnabled || !settingsMap.waApiUrl) {
                    logger.debug('WA Skipped: Missing settings or disabled', settingsMap)
                    return
                }

                // Calculate queue number for this class today
                const queueCount = db.prepare(`
                    SELECT COUNT(*) as count 
                    FROM queue q
                    JOIN students s ON q.student_id = s.id
                    WHERE q.date = ? AND s.class = ?
                `).get(today, queue.class)

                const queueNumber = queueCount.count

                // Prepare message
                const defaultCheckin = `*👋 Assalamu'alaikum, Selamat Pagi!*
Bapak/Ibu *{parent_name}*,

Ananda *{name}* (Kelas {class}) telah berhasil check-in.
Nomor Antrian: *{queue_number}*
Waktu: {time}

_Mohon menunggu giliran dipanggil._
Terima kasih. 🙏`

                let message = settingsMap.waCheckinTemplate || defaultCheckin
                message = message
                    .replace(/{name}/g, queue.name)
                    .replace(/{class}/g, queue.class)
                    .replace(/{nis}/g, queue.nis || '-')
                    .replace(/{parent_name}/g, queue.parent_name || 'Wali')
                    .replace(/{queue_number}/g, queueNumber)
                    .replace(/{date}/g, today)
                    .replace(/{time}/g, getIndonesiaDateTime().split('T')[1].substring(0, 5))

                logger.debug('Sending WA to', parent_phone, 'Message:', message)

                // Format phone number to international format (628xxx)
                const formattedPhone = formatPhoneNumber(parent_phone)
                logger.debug('Formatted phone:', formattedPhone)

                // Send to WhatsApp API
                const response = await fetch(settingsMap.waApiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': settingsMap.waApiToken
                    },
                    body: JSON.stringify({
                        phone: formattedPhone,
                        message: message,
                    })
                })

                const responseText = await response.text()
                logger.debug('WA Response Status:', response.status)
                logger.debug('WA Response Body:', responseText)

                try {
                    const result = JSON.parse(responseText)
                    logger.debug('WA Notification result:', result)
                } catch (e) {
                    logger.debug('WA Response is not JSON')
                }
            } catch (error) {
                logger.error('Error sending WA notification:', error)
            }
        })()
    } catch (error) {
        logger.error('Check-in error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Call student (Protected + IDOR Check)
router.post('/:id/call', authMiddleware, verifyQueueAccess, (req, res) => {
    try {
        const userId = req.user?.id

        const indonesiaTime = getIndonesiaDateTime()
        db.prepare(`
            UPDATE queue 
            SET status = 'CALLED', called_time = ?, called_by = ?
            WHERE id = ?
        `).run(indonesiaTime, userId, req.params.id)

        const queue = db.prepare(`
            SELECT q.*, s.nis, s.name, s.class, s.parent_name
            FROM queue q
            JOIN students s ON q.student_id = s.id
            WHERE q.id = ?
        `).get(req.params.id)

        res.json({
            queue,
            broadcast: {
                type: 'CALL',
                studentName: queue.name,
                className: queue.class
            }
        });

        if (req.io) {
            req.io.emit('queue-updated')
        }

        // Send WhatsApp Notification (Async)
        (async () => {
            try {
                logger.debug('Attempting auto-call WA for queue ID:', req.params.id)

                // Re-fetch queue to get phone
                const queueData = db.prepare('SELECT parent_phone FROM queue WHERE id = ?').get(req.params.id)
                logger.debug('Queue data for WA:', queueData)

                // Check if WA is enabled and parent phone exists
                if (!queueData?.parent_phone) {
                    logger.debug('WA Call Skipped: No phone')
                    return
                }

                const waSettings = db.prepare(`
                    SELECT * FROM settings 
                    WHERE key IN ('waEnabled', 'waApiUrl', 'waApiToken', 'waCallTemplate')
                `).all()

                const settingsMap = waSettings.reduce((acc, curr) => {
                    try {
                        acc[curr.key] = JSON.parse(curr.value)
                    } catch {
                        acc[curr.key] = curr.value
                    }
                    return acc
                }, {})

                logger.debug('WA Settings for Call:', settingsMap)

                if (!settingsMap.waEnabled || !settingsMap.waApiUrl) {
                    logger.debug('WA Call Skipped: Disabled or missing URL')
                    return
                }

                // Prepare message
                const defaultCall = `*🔔 PANGGILAN ANTRIAN*
Bapak/Ibu *{parent_name}*,

Giliran ananda *{name}* (Kelas {class}) untuk pengambilan raport.
Silakan menuju ke ruang kelas sekarang.

_Terima kasih atas kesabarannya._ 🙏`

                let message = settingsMap.waCallTemplate || defaultCall
                message = message
                    .replace(/{name}/g, queue.name)
                    .replace(/{class}/g, queue.class)
                    .replace(/{nis}/g, queue.nis || '-')
                    .replace(/{parent_name}/g, queue.parent_name || 'Wali')
                    .replace(/{queue_number}/g, queue.queue_number || '-')
                    .replace(/{date}/g, getIndonesiaDate())
                    .replace(/{time}/g, getIndonesiaDateTime().split('T')[1].substring(0, 5))

                logger.debug('Sending WA Call to:', queueData.parent_phone, 'Message:', message)

                // Format phone number to international format
                const formattedPhone = formatPhoneNumber(queueData.parent_phone)
                logger.debug('Formatted phone:', formattedPhone)

                // Send to WhatsApp API
                const response = await fetch(settingsMap.waApiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': settingsMap.waApiToken || ''
                    },
                    body: JSON.stringify({
                        phone: formattedPhone,
                        message: message
                    })
                })

                const responseText = await response.text()
                logger.debug('WA Call Response:', response.status, responseText)
            } catch (error) {
                logger.error('Error sending WA notification:', error)
            }
        })()
    } catch (error) {
        logger.error('Call error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Cancel call (Revert to WAITING) (Protected + IDOR Check)
router.post('/:id/cancel', authMiddleware, verifyQueueAccess, (req, res) => {
    try {
        db.prepare(`
            UPDATE queue 
            SET status = 'WAITING', called_time = NULL, called_by = NULL, finished_time = NULL
            WHERE id = ?
        `).run(req.params.id)

        const queue = db.prepare('SELECT * FROM queue WHERE id = ?').get(req.params.id)

        if (req.io) {
            req.io.emit('queue-updated')
        }

        res.json(queue)
    } catch (error) {
        logger.error('Cancel call error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Manual notify (Protected + IDOR Check)
router.post('/:id/notify', authMiddleware, verifyQueueAccess, (req, res) => {
    try {
        const { type, customMessage } = req.body
        const queue = db.prepare(`
            SELECT q.*, s.nis, s.name, s.class, s.parent_name
            FROM queue q
            JOIN students s ON q.student_id = s.id
            WHERE q.id = ?
        `).get(req.params.id)

        if (!queue) {
            return res.status(404).json({ error: 'Not found' })
        }

        // Return early response
        res.json({ success: true, message: 'Notification queued' });

        // Async send
        (async () => {
            try {
                logger.debug('Attempting Manual WA for queue ID:', req.params.id, 'Type:', type)

                if (!queue.parent_phone) {
                    logger.debug('Manual WA Skipped: No phone')
                    return
                }

                const waSettings = db.prepare(`
                    SELECT * FROM settings 
                    WHERE key IN ('waEnabled', 'waApiUrl', 'waApiToken', 'waCheckinTemplate', 'waCallTemplate')
                `).all()

                const settingsMap = waSettings.reduce((acc, curr) => {
                    try {
                        acc[curr.key] = JSON.parse(curr.value)
                    } catch {
                        acc[curr.key] = curr.value
                    }
                    return acc
                }, {})

                logger.debug('WA Settings for Manual:', settingsMap)

                if (!settingsMap.waEnabled || !settingsMap.waApiUrl) {
                    logger.debug('Manual WA Skipped: Disabled or missing URL')
                    return
                }

                let message = customMessage
                if (!message) {
                    if (type === 'checkin') {
                        // Calculate queue number
                        const today = getIndonesiaDate()
                        const queueCount = db.prepare(`
                            SELECT COUNT(*) as count 
                            FROM queue q
                            JOIN students s ON q.student_id = s.id
                            WHERE q.date = ? AND s.class = ?
                        `).get(today, queue.class)

                        message = settingsMap.waCheckinTemplate || 'Halo {name}...'
                        message = message.replace(/{queue_number}/g, queueCount.count)
                    } else if (type === 'call') {
                        message = settingsMap.waCallTemplate || 'Halo {name}...'
                    }
                }

                if (!message) {
                    logger.debug('Manual WA Skipped: Empty message')
                    return
                }

                message = message
                    .replace(/{name}/g, queue.name)
                    .replace(/{class}/g, queue.class)
                    .replace(/{nis}/g, queue.nis || '-')
                    .replace(/{parent_name}/g, queue.parent_name || 'Wali')
                    .replace(/{queue_number}/g, queue.queue_number || '-')
                    .replace(/{date}/g, getIndonesiaDate())
                    .replace(/{time}/g, getIndonesiaDateTime().split('T')[1].substring(0, 5))

                logger.debug('Sending Manual WA to:', queue.parent_phone, 'Message:', message)

                // Format phone number
                const formattedPhone = formatPhoneNumber(queue.parent_phone)
                logger.debug('Formatted phone:', formattedPhone)

                const response = await fetch(settingsMap.waApiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': settingsMap.waApiToken || ''
                    },
                    body: JSON.stringify({
                        phone: formattedPhone,
                        message: message,
                    })
                })

                const responseText = await response.text()
                logger.debug('Manual WA Response:', response.status, responseText)

            } catch (error) {
                logger.error('Error sending manual notification:', error)
            }
        })()

    } catch (error) {
        logger.error('Notify error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Mark as finished (Protected + IDOR Check)
router.post('/:id/finish', authMiddleware, verifyQueueAccess, (req, res) => {
    try {
        logger.debug('🏁 Finish request for ID:', req.params.id)
        const indonesiaTime = getIndonesiaDateTime()
        const runResult = db.prepare(`
            UPDATE queue 
            SET status = 'FINISHED', finished_time = ?
            WHERE id = ?
        `).run(indonesiaTime, req.params.id)

        logger.debug('🏁 Finish DB Update Result:', runResult)

        const queue = db.prepare('SELECT q.*, s.name, s.class FROM queue q JOIN students s ON q.student_id = s.id WHERE q.id = ?').get(req.params.id)

        // Broadcast real-time update to all clients (TV, teacher, admin)
        if (req.io) {
            req.io.emit('queue-updated')
            req.io.emit('student-finished', {
                studentName: queue.name,
                className: queue.class
            })
            logger.debug('📡 Socket emitted: queue-updated, student-finished')
        }

        res.json({
            queue,
            broadcast: {
                type: 'FINISH',
                studentName: queue.name,
                className: queue.class
            }
        })
    } catch (error) {
        logger.error('Finish error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Skip student (Protected + IDOR Check)
router.post('/:id/skip', authMiddleware, verifyQueueAccess, (req, res) => {
    try {
        db.prepare(`
            UPDATE queue 
            SET status = 'SKIPPED'
            WHERE id = ?
        `).run(req.params.id)

        const queue = db.prepare('SELECT * FROM queue WHERE id = ?').get(req.params.id)

        if (req.io) {
            req.io.emit('queue-updated')
        }

        res.json(queue)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Revert finished (Return FINISHED to CALLED) - Admin only
router.post('/:id/revert-finish', authMiddleware, verifyQueueAccess, (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Hanya admin yang dapat mengembalikan status selesai' })
        }

        const queue = db.prepare('SELECT * FROM queue WHERE id = ?').get(req.params.id)

        if (!queue) {
            return res.status(404).json({ error: 'Queue entry not found' })
        }

        if (queue.status !== 'FINISHED') {
            return res.status(400).json({ error: 'Hanya bisa mengembalikan status dari FINISHED' })
        }

        db.prepare(`
            UPDATE queue 
            SET status = 'CALLED', finished_time = NULL
            WHERE id = ?
        `).run(req.params.id)

        const updatedQueue = db.prepare('SELECT * FROM queue WHERE id = ?').get(req.params.id)

        logger.info(`Admin ${req.user.username} reverted queue ${req.params.id} from FINISHED to CALLED`)

        if (req.io) {
            req.io.emit('queue-updated')
        }

        res.json(updatedQueue)
    } catch (error) {
        logger.error('Revert finish error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Uncheckin (Delete queue item) (Protected)
router.delete('/:id', authMiddleware, (req, res) => {
    try {
        db.prepare('DELETE FROM queue WHERE id = ?').run(req.params.id)

        if (req.io) {
            req.io.emit('queue-updated')
        }

        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Reset queue (admin only) (Protected)
router.delete('/reset', authMiddleware, (req, res) => {
    try {
        const today = getIndonesiaDate()
        db.prepare('DELETE FROM queue WHERE date = ?').run(today)

        if (req.io) {
            req.io.emit('queue-updated')
        }

        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
})

export default router
