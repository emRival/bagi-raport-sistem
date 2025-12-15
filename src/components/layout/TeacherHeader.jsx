import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wifi, WifiOff, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { socketService } from '../../services/socket.js'
import './TeacherHeader.css'

export default function TeacherHeader({ title = "Dashboard Antrian", subtitle, showConnection = true }) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [connected, setConnected] = useState(socketService.isConnected())

    useEffect(() => {
        // Initial check
        setConnected(socketService.isConnected())

        // Listen for status changes
        const onConnect = () => setConnected(true)
        const onDisconnect = () => setConnected(false)

        socketService.on('connect', onConnect)
        socketService.on('disconnect', onDisconnect)

        return () => {
            socketService.off('connect', onConnect)
            socketService.off('disconnect', onDisconnect)
        }
    }, [])

    const handleLogout = () => {
        socketService.disconnect()
        logout()
        navigate('/login')
    }

    return (
        <header className="teacher-header">
            <div className="teacher-header__info">
                <h1>{title}</h1>
                {subtitle && <span className="teacher-header__subtitle">{subtitle}</span>}
            </div>
            <div className="teacher-header__actions">
                {showConnection && (
                    <div className={`connection-badge ${connected ? 'connection-badge--connected' : 'connection-badge--disconnected'}`}>
                        {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
                        <span>{connected ? 'Online' : 'Offline'}</span>
                    </div>
                )}
                <div className="teacher-header__user">
                    <span>{user?.name}</span>
                </div>
                <button className="logout-btn-sm" onClick={handleLogout} title="Keluar">
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    )
}
