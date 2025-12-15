import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Exact same logic as db.js
const dbPath = path.join(__dirname, 'backend/data/database.sqlite')

console.log('🔍 Debugging DB at:', dbPath)
console.log('File exists?', fs.existsSync(dbPath))

try {
    const db = new Database(dbPath)
    const rows = db.prepare('SELECT * FROM announcements').all()
    console.log('📊 Row count:', rows.length)
    console.log('📄 Data:', JSON.stringify(rows, null, 2))
} catch (e) {
    console.error('❌ Error:', e)
}
