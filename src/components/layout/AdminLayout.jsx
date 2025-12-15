import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    BookOpen,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronLeft,
    History,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/users', label: 'Manajemen User', icon: Users },
    { path: '/admin/students', label: 'Data Siswa', icon: GraduationCap },
    { path: '/admin/history', label: 'Riwayat Antrian', icon: History },
    { path: '/admin/classes', label: 'Manajemen Kelas', icon: BookOpen },
    { path: '/admin/settings', label: 'Pengaturan', icon: Settings },
]

export default function AdminLayout() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [mobileOpen, setMobileOpen] = useState(false)

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-in fade-in duration-200"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Modern Sidebar */}
            <aside
                className={cn(
                    "fixed lg:sticky top-0 left-0 z-50 h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50 flex flex-col shadow-2xl smooth-transition",
                    // Desktop: collapsible width
                    "lg:w-64 lg:translate-x-0",
                    sidebarOpen ? "lg:w-64" : "lg:w-20",
                    // Mobile: drawer with max-width
                    "w-72 max-w-[80vw]",
                    mobileOpen
                        ? "translate-x-0 animate-in slide-in-from-left duration-300"
                        : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        {sidebarOpen && (
                            <div className="animate-fade-in">
                                <h1 className="text-white font-bold text-lg whitespace-nowrap">Bagi Raport</h1>
                                <p className="text-slate-400 text-xs">Admin Panel</p>
                            </div>
                        )}
                    </div>
                    <button
                        className="hidden lg:flex w-8 h-8 rounded-lg items-center justify-center hover:bg-slate-700/50 text-slate-400 hover:text-white smooth-transition"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        <ChevronLeft className={cn("w-5 h-5 smooth-transition", !sidebarOpen && "rotate-180")} />
                    </button>
                    <button
                        className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-700/50 text-slate-400 hover:text-white smooth-transition"
                        onClick={() => setMobileOpen(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-lg smooth-transition group relative overflow-hidden",
                                    isActive
                                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                                        : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon className={cn("w-5 h-5 flex-shrink-0 smooth-transition", isActive && "scale-110")} />
                                    {sidebarOpen && (
                                        <span className="font-medium text-sm whitespace-nowrap animate-fade-in">
                                            {item.label}
                                        </span>
                                    )}
                                    {isActive && (
                                        <div className="absolute inset-0 bg-white/10 rounded-lg animate-pulse"></div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-slate-700/50 space-y-2">
                    {sidebarOpen && user && (
                        <div className="px-3 py-2 bg-slate-700/30 rounded-lg mb-2 animate-fade-in">
                            <p className="text-white text-sm font-medium truncate">{user.name}</p>
                            <p className="text-slate-400 text-xs">Administrator</p>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-slate-400 hover:bg-red-500/20 hover:text-red-400 smooth-transition group"
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0 group-hover:scale-110 smooth-transition" />
                        {sidebarOpen && <span className="font-medium text-sm">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 shadow-sm">
                    <button
                        className="lg:hidden p-2 rounded-lg hover:bg-slate-100 smooth-transition"
                        onClick={() => setMobileOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex-1" />
                    {user && (
                        <div className="hidden sm:flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                                <p className="text-xs text-slate-500">Administrator</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
                                {user.name?.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    )}
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
