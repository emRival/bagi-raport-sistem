import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
        methods: ['GET', 'POST']
    }
})

// Store connected clients
const clients = {
    tv: new Set(),
    teacher: new Set(),
    admin: new Set()
}

io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`)

    // Client registers their role
    socket.on('register', (role) => {
        socket.role = role
        if (clients[role]) {
            clients[role].add(socket.id)
        }
        console.log(`📝 ${socket.id} registered as: ${role}`)
        console.log(`📊 Connected clients:`, {
            tv: clients.tv.size,
            teacher: clients.teacher.size,
            admin: clients.admin.size
        })
    })

    // Teacher calls a student - broadcast to TV
    socket.on('call-student', (data) => {
        console.log(`📞 Call student:`, data)
        io.emit('student-called', data)
    })

    // Admin broadcasts announcement - send to TV
    socket.on('broadcast-announcement', (data) => {
        console.log(`📢 Broadcast announcement:`, data)
        io.emit('announcement', data)
    })

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`)
        if (socket.role && clients[socket.role]) {
            clients[socket.role].delete(socket.id)
        }
    })
})

const PORT = 3001

httpServer.listen(PORT, () => {
    console.log(`
🚀 WebSocket Server running on http://localhost:${PORT}
   
   Waiting for connections...
   - TV Display will register as 'tv'
   - Teachers will register as 'teacher'
   - Admins will register as 'admin'
`)
})
