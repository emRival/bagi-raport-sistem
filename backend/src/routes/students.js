import express from 'express'
import db from '../db.js'
import logger from '../utils/logger.js'
import { studentSchema, validate } from '../utils/validators.js'
import { modifyLimiter } from '../middleware/rateLimiter.js'

const router = express.Router()

// Get all students (with optional filters)
router.get('/', (req, res) => {
    try {
        const { class: cls, search } = req.query
        let query = 'SELECT * FROM students WHERE 1=1'
        const params = []

        if (cls) {
            query += ' AND class = ?'
            params.push(cls)
        }

        if (search) {
            query += ' AND (name LIKE ? OR nis LIKE ?)'
            params.push(`%${search}%`, `%${search}%`)
        }

        query += ' ORDER BY class, name'

        const students = db.prepare(query).all(...params)
        res.json(students)
    } catch (error) {
        logger.error('Get students error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Get student by ID
router.get('/:id', (req, res) => {
    try {
        const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id)
        if (!student) {
            return res.status(404).json({ error: 'Student not found' })
        }
        res.json(student)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Create student (no phone - phone is entered at check-in)
router.post('/', modifyLimiter, validate(studentSchema), (req, res) => {
    try {
        const { nis, name, class: cls, parent_name } = req.body

        const result = db.prepare(`
            INSERT INTO students (nis, name, class, parent_name)
            VALUES (?, ?, ?, ?)
        `).run(nis, name, cls, parent_name || null)

        const student = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid)
        logger.info(`Student created: ${name} (${nis})`)
        res.status(201).json(student)
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'NIS sudah terdaftar' })
        }
        logger.error('Create student error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Update student
router.put('/:id', modifyLimiter, validate(studentSchema), (req, res) => {
    try {
        const { nis, name, class: cls, parent_name } = req.body

        db.prepare(`
            UPDATE students 
            SET nis = ?, name = ?, class = ?, parent_name = ?
            WHERE id = ?
        `).run(nis, name, cls, parent_name, req.params.id)

        const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id)
        res.json(student)
    } catch (error) {
        logger.error('Update student error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Delete student
router.delete('/:id', (req, res) => {
    try {
        const studentId = req.params.id

        const deleteStudent = db.transaction(() => {
            // Delete dependencies first
            db.prepare('DELETE FROM queue WHERE student_id = ?').run(studentId)
            db.prepare('DELETE FROM activity WHERE student_id = ?').run(studentId)

            // Delete student
            db.prepare('DELETE FROM students WHERE id = ?').run(studentId)
        })

        deleteStudent()
        logger.info(`Student ${studentId} deleted (and cascading dependencies)`)
        res.json({ success: true })
    } catch (error) {
        logger.error('Delete student error:', error)
        res.status(500).json({ error: error.message || 'Internal server error' })
    }
})

// Bulk import students (no phone)
router.post('/import', (req, res) => {
    try {
        const { students } = req.body

        if (!Array.isArray(students)) {
            return res.status(400).json({ error: 'Data siswa harus berupa array' })
        }

        const insert = db.prepare(`
            INSERT OR REPLACE INTO students (nis, name, class, parent_name)
            VALUES (?, ?, ?, ?)
        `)

        const insertMany = db.transaction((items) => {
            for (const s of items) {
                insert.run(s.nis, s.name, s.class, s.parent_name || null)
            }
        })

        insertMany(students)
        res.json({ success: true, count: students.length })
    } catch (error) {
        logger.error('Import error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

export default router
