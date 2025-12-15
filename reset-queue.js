const db = require('./backend/src/db.js');
const { getIndonesiaDate } = require('./backend/src/utils/date.js');

try {
    console.log('🧹 Clearing Queue table...');
    db.prepare('DELETE FROM queue').run();
    console.log('✅ Queue cleared successfully.');
} catch (error) {
    console.error('❌ Error clearing queue:', error);
}
