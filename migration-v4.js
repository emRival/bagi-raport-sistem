
import db from './backend/src/db.js'

console.log('Running migration: Adding queue_number to queue table...')

try {
    // Add column if not exists
    const tableInfo = db.pragma('table_info(queue)')
    const hasQueueNumber = tableInfo.some(col => col.name === 'queue_number')

    if (!hasQueueNumber) {
        db.exec('ALTER TABLE queue ADD COLUMN queue_number INTEGER')
        console.log('✅ Added queue_number column')
    } else {
        console.log('ℹ️ queue_number column already exists')
    }

    // Optional: Backfill existing data for today?
    // User asked to "fix" checkin order, implying new checkins or existing ones. 
    // Let's keep it simple: alter table first. Backfilling requires complex logic per class per date.

    console.log('Migration completed successfully')
} catch (error) {
    console.error('Migration failed:', error)
}
