import Database from 'better-sqlite3';
import path from 'path';

const dbPath = '/Users/macbook/Downloads/bagi-raport-system/backend/data/database.sqlite';

try {
    console.log(`🔌 Connecting to database at: ${dbPath}`);
    const db = new Database(dbPath);

    console.log('🧹 Clearing Queue table...');
    const info = db.prepare('DELETE FROM queue').run();
    console.log(`✅ Queue cleared successfully. Rows affected: ${info.changes}`);

    // Optional: Reset sequence if needed (usually handled by date/class logic, but good to be clean)
    // db.prepare('DELETE FROM sqlite_sequence WHERE name="queue"').run();

} catch (error) {
    console.error('❌ Error clearing queue:', error);
}
