import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wifi, WifiOff, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { socketService } from '../../services/socket.js'

export default function TeacherHeader({ title = "Dashboard Antrian", subtitle, showConnection = true }) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [connected, setConnected] = useState(socketService.isConnected())

    useEffect(() => {
        setConnected(socketService.isConnected())
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
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
            <div className="px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
                {/* Title Section */}
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight truncate">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {showConnection && (
                        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${connected
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                            {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{connected ? 'Online' : 'Offline'}</span>
                        </div>
                    )}

                    {/* User - Desktop only */}
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                        <span className="text-sm font-medium text-slate-700">{user?.name}</span>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="p-2 hover:bg-slate-100 rounded-lg smooth-transition text-slate-600 hover:text-slate-900"
                        title="Keluar"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </header>
    )
}
