import { copyFileSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join, dirname, basename } from 'path'
import { mkdirSync } from 'fs'
import logger from './logger.js'

// Backup configuration from environment
const BACKUP_ENABLED = process.env.BACKUP_ENABLED === 'true'
const BACKUP_INTERVAL = parseInt(process.env.BACKUP_INTERVAL) || 86400000 // 24 hours
const BACKUP_RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS) || 7
const BACKUP_DIR = process.env.BACKUP_DIR || './backups'
const DB_PATH = process.env.DB_PATH || './data/database.sqlite'

let backupSchedule = null

/**
 * Create a backup of the database
 */
export async function performBackup() {
    if (!BACKUP_ENABLED) {
        logger.debug('Backup skipped: BACKUP_ENABLED is false')
        return null
    }

    try {
        // Ensure backup directory exists
        mkdirSync(BACKUP_DIR, { recursive: true })

        // Generate backup filename with timestamp
        const timestamp = new Date().toISOString()
            .replace(/[:.]/g, '-')
            .replace('T', '_')
            .split('.')[0] // Remove milliseconds

        const backupFilename = `raport-${timestamp}.db`
        const backupPath = join(BACKUP_DIR, backupFilename)

        // Copy database file
        copyFileSync(DB_PATH, backupPath)

        const stats = statSync(backupPath)
        logger.info(`💾 Database backup created: ${backupFilename} (${(stats.size / 1024).toFixed(2)} KB)`)

        // Clean old backups
        await cleanOldBackups()

        return backupPath
    } catch (error) {
        logger.error('❌ Backup failed:', error)
        return null
    }
}

/**
 * Clean old backups based on retention policy
 */
export async function cleanOldBackups() {
    if (!BACKUP_ENABLED) return

    try {
        const files = readdirSync(BACKUP_DIR)
        const backupFiles = files.filter(f => f.startsWith('raport-') && f.endsWith('.db'))

        // Sort by date (newest first)
        backupFiles.sort().reverse()

        const now = Date.now()
        const retentionMs = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000

        let deletedCount = 0

        for (const file of backupFiles) {
            const filePath = join(BACKUP_DIR, file)
            const stats = statSync(filePath)
            const age = now - stats.mtimeMs

            // Delete if older than retention period
            if (age > retentionMs) {
                unlinkSync(filePath)
                deletedCount++
                logger.debug(`🗑️  Deleted old backup: ${file}`)
            }
        }

        if (deletedCount > 0) {
            logger.info(`🗑️  Cleaned ${deletedCount} old backup(s)`)
        }
    } catch (error) {
        logger.error('❌ Failed to clean old backups:', error)
    }
}

/**
 * Start automated backup schedule
 */
export function startBackupSchedule() {
    if (!BACKUP_ENABLED) {
        logger.info('📦 Backup system: DISABLED')
        return
    }

    // Perform immediate backup on startup
    logger.info(`📦 Backup system: ENABLED
   Interval: ${BACKUP_INTERVAL / 1000 / 60 / 60} hours
   Retention: ${BACKUP_RETENTION_DAYS} days
   Directory: ${BACKUP_DIR}`)

    performBackup()

    // Schedule regular backups
    backupSchedule = setInterval(() => {
        logger.info('⏰ Running scheduled backup...')
        performBackup()
    }, BACKUP_INTERVAL)

    logger.info('✅ Backup schedule started')
}

/**
 * Stop backup schedule
 */
export function stopBackupSchedule() {
    if (backupSchedule) {
        clearInterval(backupSchedule)
        backupSchedule = null
        logger.info('⏸️  Backup schedule stopped')
    }
}

/**
 * List all available backups
 */
export function listBackups() {
    try {
        const files = readdirSync(BACKUP_DIR)
        const backupFiles = files
            .filter(f => f.startsWith('raport-') && f.endsWith('.db'))
            .map(f => {
                const filePath = join(BACKUP_DIR, f)
                const stats = statSync(filePath)
                return {
                    filename: f,
                    path: filePath,
                    size: stats.size,
                    created: stats.mtime
                }
            })
            .sort((a, b) => b.created - a.created) // Newest first

        return backupFiles
    } catch (error) {
        logger.error('Failed to list backups:', error)
        return []
    }
}

/**
 * Restore database from backup
 * WARNING: This will overwrite the current database!
 */
export async function restoreBackup(backupFilename) {
    try {
        const backupPath = join(BACKUP_DIR, backupFilename)

        // Verify backup exists
        if (!statSync(backupPath).isFile()) {
            throw new Error('Backup file not found')
        }

        // Create a backup of current database before restore
        const preRestoreBackup = await performBackup()

        // Restore from backup
        copyFileSync(backupPath, DB_PATH)

        logger.info(`♻️  Database restored from: ${backupFilename}`)
        logger.info(`💾 Pre-restore backup saved: ${basename(preRestoreBackup)}`)

        return true
    } catch (error) {
        logger.error('❌ Restore failed:', error)
        return false
    }
}

export default {
    performBackup,
    cleanOldBackups,
    startBackupSchedule,
    stopBackupSchedule,
    listBackups,
    restoreBackup
}
