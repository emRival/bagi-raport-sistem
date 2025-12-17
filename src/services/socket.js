import { io } from 'socket.io-client'

// Determine socket URL based on environment
const getSocketUrl = () => {
    // In production, use relative URL (same host)
    if (import.meta.env.PROD) {
        return window.location.origin
    }
    // In development, use localhost:3001
    return 'http://localhost:3001'
}

// Get auth token for authenticated socket connection
const getAuthToken = () => localStorage.getItem('auth_token')

// Create socket connection with auth
const socket = io(getSocketUrl(), {
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    transports: ['websocket', 'polling'],
    auth: {
        token: getAuthToken()
    }
})

// Update auth token on reconnect (in case user logged in after initial connection)
socket.on('reconnect_attempt', () => {
    socket.auth = { token: getAuthToken() }
})

// Connection status
let isConnected = false

// Callbacks for events
const callbacks = {
    'student-called': [],
    'student-finished': [],
    'announcement': [],
    'connect': [],
    'disconnect': [],
    'online-status': [],
    'queue-updated': [],
    'announcement-updated': [],
    'teachers-online': []
}

socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id)
    isConnected = true
    callbacks['connect'].forEach(cb => cb())
})

socket.on('disconnect', () => {
    console.log('❌ Socket disconnected')
    isConnected = false
    callbacks['disconnect'].forEach(cb => cb())
})

socket.on('student-called', (data) => {
    console.log('📞 Student called event:', data)
    callbacks['student-called'].forEach(cb => cb(data))
})

socket.on('announcement', (data) => {
    console.log('📢 Announcement event:', data)
    callbacks['announcement'].forEach(cb => cb(data))
})

socket.on('student-finished', (data) => {
    console.log('✅ Student finished event:', data)
    callbacks['student-finished'].forEach(cb => cb(data))
})

socket.on('queue-updated', (data) => {
    console.log('🔄 Queue updated event:', data)
    callbacks['queue-updated'].forEach(cb => cb(data))
})

socket.on('online-status', (data) => {
    console.log('🟢 Online status event:', data)
    if (callbacks['online-status']) {
        callbacks['online-status'].forEach(cb => cb(data))
    }
})

socket.on('announcement-updated', (data) => {
    console.log('📢 Announcement data updated')
    if (callbacks['announcement-updated']) {
        callbacks['announcement-updated'].forEach(cb => cb(data))
    }
})

// API
export const socketService = {
    connect: () => {
        if (!socket.connected) {
            socket.connect()
        }
    },

    disconnect: () => {
        socket.disconnect()
    },

    register: (data) => {
        if (socket.connected) {
            socket.emit('register', data)
        } else {
            // Queue it or it will be called on 'connect'
            socket.emit('register', data)
        }
    },

    callStudent: (studentName, className) => {
        socket.emit('call-student', { studentName, className, timestamp: Date.now() })
    },

    finishStudent: (studentName, className) => {
        socket.emit('finish-student', { studentName, className, timestamp: Date.now() })
    },

    broadcastAnnouncement: (text) => {
        socket.emit('broadcast-announcement', { text, timestamp: Date.now() })
    },

    on: (event, callback) => {
        if (callbacks[event]) {
            callbacks[event].push(callback)
        }
        return () => {
            if (callbacks[event]) {
                callbacks[event] = callbacks[event].filter(cb => cb !== callback)
            }
        }
    },

    off: (event, callback) => {
        if (callbacks[event]) {
            if (callback) {
                callbacks[event] = callbacks[event].filter(cb => cb !== callback)
            } else {
                callbacks[event] = []
            }
        }
    },

    getSocket: () => socket,

    isConnected: () => isConnected
}

export default socket
