import rateLimit from 'express-rate-limit'

// General API rate limiter - 1000 requests per 15 minutes
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased from 100 for production usage
    message: {
        error: 'Terlalu banyak request, silakan coba lagi nanti',
        retryAfter: '15 menit'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for local development
    skip: (req) => req.ip === '::1' || req.ip === '127.0.0.1'
})

// Strict rate limiter for authentication - 5 attempts per 15 minutes
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        error: 'Terlalu banyak percobaan login, silakan coba lagi nanti',
        retryAfter: '15 menit'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Only count failed attempts
})

// Check-in rate limiter - 30 requests per minute (per IP)
export const checkInLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: {
        error: 'Terlalu banyak check-in dalam waktu singkat',
        retryAfter: '1 menit'
    },
    standardHeaders: true,
    legacyHeaders: false
})

// Moderate rate limiter for data modification - 20 per minute
export const modifyLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: {
        error: 'Terlalu banyak perubahan data, mohon tunggu sebentar',
        retryAfter: '1 menit'
    },
    standardHeaders: true,
    legacyHeaders: false
})
