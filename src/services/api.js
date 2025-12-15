const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api'

// Get auth token from localStorage
const getToken = () => localStorage.getItem('auth_token')

// API helper
async function api(endpoint, options = {}) {
    const token = getToken()

    // Add timestamp to prevent caching for GET requests
    const url = new URL(`${API_URL}${endpoint}`, window.location.origin)
    if (options.method === 'GET' || !options.method) {
        url.searchParams.append('_t', Date.now())
    }

    const response = await fetch(url.toString(), {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers
        }
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(error.error || 'Request failed')
    }

    return response.json()
}

// Auth API
export const authApi = {
    login: (username, password) => api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    }),

    verify: () => api('/auth/verify')
}

// Students API
export const studentsApi = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString()
        return api(`/students${query ? `?${query}` : ''}`)
    },

    getById: (id) => api(`/students/${id}`),

    create: (data) => api('/students', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    update: (id, data) => api(`/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    delete: (id) => api(`/students/${id}`, { method: 'DELETE' }),

    import: (students) => api('/students/import', {
        method: 'POST',
        body: JSON.stringify({ students })
    })
}

// Queue API
export const queueApi = {
    getQueue: (params = {}) => {
        const query = new URLSearchParams(params).toString()
        return api(`/queue${query ? `?${query}` : ''}`)
    },

    getHistory: (params = {}) => {
        const query = new URLSearchParams(params).toString()
        return api(`/queue/history${query ? `?${query}` : ''}`)
    },

    getStats: () => api('/queue/stats'),

    getActivity: (limit = 20) => api(`/queue/activity?limit=${limit}`),

    checkIn: (data) => api('/queue/checkin', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    call: (id) => api(`/queue/${id}/call`, { method: 'POST' }),

    finish: (id) => api(`/queue/${id}/finish`, { method: 'POST' }),

    skip: (id) => api(`/queue/${id}/skip`, { method: 'POST' }),

    notify: (id, type) => api(`/queue/${id}/notify`, {
        method: 'POST',
        body: JSON.stringify({ type })
    }),

    reset: () => api('/queue/reset', { method: 'DELETE' })
}

// Settings API
export const settingsApi = {
    getAll: () => api('/settings'),

    update: (key, value) => api(`/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value })
    }),

    // User Management
    getUsers: () => api('/settings/users'),

    // Note: These endpoints need to be implemented in backend/routes/settings.js first
    createUser: (data) => api('/settings/users', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    updateUser: (id, data) => api(`/settings/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    deleteUser: (id) => api(`/settings/users/${id}`, {
        method: 'DELETE'
    }),

    getAnnouncements: () => api('/settings/announcements'),

    addAnnouncement: (text) => api('/settings/announcements', {
        method: 'POST',
        body: JSON.stringify({ text })
    }),

    updateAnnouncement: (id, data) => api(`/settings/announcements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    deleteAnnouncement: (id) => api(`/settings/announcements/${id}`, { method: 'DELETE' }),

    broadcastAnnouncement: (id) => api(`/settings/announcements/${id}/broadcast`, { method: 'POST' })
}

export default api
