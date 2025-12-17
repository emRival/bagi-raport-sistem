import Joi from 'joi'

// Student validation schema
export const studentSchema = Joi.object({
    nis: Joi.string().trim().max(50).required()
        .messages({
            'string.empty': 'NIS tidak boleh kosong',
            'string.max': 'NIS maksimal 50 karakter',
            'any.required': 'NIS wajib diisi'
        }),
    name: Joi.string().trim().max(100).required()
        .messages({
            'string.empty': 'Nama tidak boleh kosong',
            'string.max': 'Nama maksimal 100 karakter',
            'any.required': 'Nama wajib diisi'
        }),
    class: Joi.string().trim().required()
        .messages({
            'string.empty': 'Kelas tidak boleh kosong',
            'any.required': 'Kelas wajib diisi'
        }),
    parent_name: Joi.string().trim().max(100).allow('', null).optional(),
    parent_phone: Joi.string().trim().pattern(/^[0-9]{10,15}$/).allow('', null).optional()
        .messages({
            'string.pattern.base': 'Format nomor telepon tidak valid (10-15 digit)'
        })
})

// Check-in validation schema
export const checkInSchema = Joi.object({
    student_id: Joi.number().integer().positive().optional(),
    nis: Joi.string().trim().optional(),
    parent_phone: Joi.string().trim().pattern(/^[0-9]{10,15}$/).allow('', null).optional()
}).or('student_id', 'nis').messages({
    'object.missing': 'Student ID atau NIS harus diisi'
})

// User validation schema
export const userSchema = Joi.object({
    username: Joi.string().trim().alphanum().min(3).max(30).required()
        .messages({
            'string.alphanum': 'Username hanya boleh huruf dan angka',
            'string.min': 'Username minimal 3 karakter',
            'string.max': 'Username maksimal 30 karakter',
            'any.required': 'Username wajib diisi'
        }),
    password: Joi.string().min(6).max(100).required()
        .messages({
            'string.min': 'Password minimal 6 karakter',
            'any.required': 'Password wajib diisi'
        }),
    name: Joi.string().trim().max(100).required()
        .messages({
            'any.required': 'Nama wajib diisi'
        }),
    role: Joi.string().valid('admin', 'teacher', 'satpam', 'tv').required()
        .messages({
            'any.only': 'Role harus admin, teacher, satpam, atau tv'
        }),
    assignedClass: Joi.string().trim().when('role', {
        is: 'teacher',
        then: Joi.required(),
        otherwise: Joi.optional().allow('', null)
    }).messages({
        'any.required': 'Kelas harus diisi untuk role teacher'
    })
})

// User update schema (password optional)
export const userUpdateSchema = Joi.object({
    username: Joi.string().trim().alphanum().min(3).max(30).optional(),
    password: Joi.string().min(6).max(100).optional().allow(''),
    name: Joi.string().trim().max(100).optional(),
    role: Joi.string().valid('admin', 'teacher', 'satpam', 'tv').optional(),
    assignedClass: Joi.string().trim().optional().allow('', null)
})

// Login validation schema
export const loginSchema = Joi.object({
    username: Joi.string().required().messages({
        'any.required': 'Username wajib diisi'
    }),
    password: Joi.string().required().messages({
        'any.required': 'Password wajib diisi'
    })
})

// Announcement validation schema
export const announcementSchema = Joi.object({
    text: Joi.string().trim().max(500).required()
        .messages({
            'string.empty': 'Teks pengumuman tidak boleh kosong',
            'string.max': 'Pengumuman maksimal 500 karakter',
            'any.required': 'Teks pengumuman wajib diisi'
        }),
    is_active: Joi.boolean().optional()
})

// Settings validation schema
export const settingsSchema = Joi.object({
    value: Joi.alternatives().try(
        Joi.string(),
        Joi.number(),
        Joi.boolean(),
        Joi.array(),
        Joi.object()
    ).required()
})

// Validation middleware factory
export function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        })

        if (error) {
            const errors = error.details.map(detail => detail.message)
            return res.status(400).json({
                error: 'Validation error',
                details: errors
            })
        }

        req.body = value
        next()
    }
}
