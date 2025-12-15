import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { socketService } from '../../services/socket'

export default function TeacherLayout() {
    const { user } = useAuth()
    const className = user?.assignedClass || '7A'

    useEffect(() => {
        // Connect & Register immediately
        socketService.connect()
        socketService.register({ role: 'teacher', className })

        // Re-register on connect
        const handleConnect = () => {
            console.log('Teacher Connected, Registering as', className)
            socketService.register({ role: 'teacher', className })
        }

        socketService.on('connect', handleConnect)

        // Heartbeat to ensure server knows we're here (every 30s)
        const interval = setInterval(() => {
            if (socketService.isConnected()) {
                console.log('💓 Heartbeat: Registering presence')
                socketService.register({ role: 'teacher', className })
            }
        }, 30000)

        // Cleanup
        return () => {
            socketService.off('connect', handleConnect)
            clearInterval(interval)
            socketService.disconnect()
        }
    }, [className])

    return <Outlet />
}
