import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'
import bcrypt from 'bcryptjs'
import logger from './utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load database path from environment or use default
const DB_PATH = process.env.DB_PATH || join(__dirname, '../data/database.sqlite')
const dataDir = dirname(DB_PATH)

// Ensure the data directory exists
try {
    mkdirSync(dataDir, { recursive: true })
    logger.info(`📂 Database directory: ${dataDir}`)
} catch (err) {
    if (err.code !== 'EEXIST') {
        logger.error('❌ Failed to create data directory:', err)
        throw err
    }
}

logger.info(`📂 Active Database Path: ${DB_PATH}`)
const db = new Database(DB_PATH)

// Enable foreign keys
db.pragma('journal_mode = WAL')

// Initialize tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'tv', 'satpam')),
        assigned_class TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nis TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        class TEXT NOT NULL,
        parent_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        parent_phone TEXT,
        status TEXT NOT NULL DEFAULT 'WAITING' CHECK(status IN ('WAITING', 'CALLED', 'FINISHED', 'SKIPPED')),
        check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        called_time DATETIME,
        finished_time DATETIME,
        called_by INTEGER,
        date DATE DEFAULT (date('now')),
        queue_number INTEGER,
        FOREIGN KEY(student_id) REFERENCES students(id),
        FOREIGN KEY(called_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        user_id INTEGER,
        student_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
`)

// Seed default data if empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get()
if (userCount.count === 0) {
    logger.info('🌱 Seeding default data...')

    const hashedPassword = bcrypt.hashSync('password', 10)

    // Default users
    const insertUser = db.prepare(`
        INSERT INTO users (username, password, name, role, assigned_class)
        VALUES (?, ?, ?, ?, ?)
    `)

    insertUser.run('admin', hashedPassword, 'Administrator', 'admin', null)
    insertUser.run('satpam', hashedPassword, 'Satpam', 'satpam', null)
    insertUser.run('guru', hashedPassword, 'Wali Kelas 7A', 'teacher', '7A')
    insertUser.run('guru7b', hashedPassword, 'Wali Kelas 7B', 'teacher', '7B')
    insertUser.run('guru8a', hashedPassword, 'Wali Kelas 8A', 'teacher', '8A')
    insertUser.run('tv', hashedPassword, 'TV Display', 'tv', null)

    // Default settings
    const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    insertSetting.run('schoolName', 'IDN Boarding School')
    insertSetting.run('schoolLogo', 'https://play-lh.googleusercontent.com/0B503CqG8lLyTKtb1Brnxe2CWcSRPZ74aOE5gG984l6CS7NIUqeuWEgc3DIZmgEiBuVx')
    insertSetting.run('classes', JSON.stringify(['7A', '7B', '7C', '8A', '8B', '8C', '9A', '9B', '9C']))

    // Sample students (no phone)
    const insertStudent = db.prepare(`
        INSERT INTO students (nis, name, class, parent_name)
        VALUES (?, ?, ?, ?)
    `)

    const sampleStudents = [
        ['2024001', 'Ahmad Fadillah', '7A', 'Bapak Ahmad'],
        ['2024002', 'Budi Santoso', '7A', 'Ibu Budi'],
        ['2024003', 'Citra Dewi', '7A', 'Bapak Citra'],
        ['2024004', 'Dani Pratama', '7A', 'Ibu Dani'],
        ['2024005', 'Eka Putri', '7B', 'Bapak Eka'],
        ['2024006', 'Fajar Ramadhan', '7B', 'Ibu Fajar'],
        ['2024007', 'Gita Nuraini', '8A', 'Bapak Gita'],
        ['2024008', 'Hadi Wijaya', '8A', 'Ibu Hadi'],
    ]

    sampleStudents.forEach(s => insertStudent.run(...s))

    logger.info('✅ Default data seeded successfully')
}

export default db
