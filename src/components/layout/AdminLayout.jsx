import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    Settings,
    LogOut,
    ChevronLeft,
    History,
    ClipboardList,
    Menu
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/students', label: 'Siswa', icon: GraduationCap },
    { path: '/admin/queue', label: 'Antrian', icon: ClipboardList },
    { path: '/admin/history', label: 'History', icon: History },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
]

const mobileNavItems = [
    { path: '/admin/dashboard', label: 'Dasbor', icon: LayoutDashboard },
    { path: '/admin/students', label: 'Siswa', icon: GraduationCap },
    { path: '/admin/queue', label: 'Antri', icon: ClipboardList },
    { path: '/admin/history', label: 'Riwayat', icon: History },
    { path: '/admin/settings', label: 'Setting', icon: Settings },
]

export default function AdminLayout() {
    const { user, logout } = useAuth()
    const { settings } = useSettings()
    const navigate = useNavigate()
    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const currentNavItem = [...navItems, ...mobileNavItems].find(item => location.pathname === item.path) || { label: 'Admin', icon: GraduationCap }

    return (
        <div className="min-h-[100dvh] bg-slate-50 flex flex-col lg:flex-row overflow-x-hidden font-sans text-slate-900 selection:bg-slate-200">
            {/* Minimalist Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden lg:flex fixed top-0 left-0 h-[100dvh] bg-white border-r border-slate-200 flex-col transition-[width] duration-300 ease-in-out z-30",
                    sidebarOpen ? "w-64" : "w-20"
                )}
            >
                {/* Header Brand */}
                <div className="relative h-16 flex items-center px-4 border-b border-slate-100">
                    <div className="flex items-center gap-3 overflow-hidden w-full">
                        {settings.schoolLogo ? (
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                                <img src={settings.schoolLogo} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
                                <GraduationCap className="w-4 h-4 text-white" />
                            </div>
                        )}
                        <div className={cn(
                            "flex flex-col min-w-0 transition-opacity duration-200",
                            sidebarOpen ? "opacity-100" : "opacity-0"
                        )}>
                            <span className="text-sm font-bold tracking-tight truncate">{settings.schoolName || 'Bagi Raport'}</span>
                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest truncate">Admin Panel</span>
                        </div>
                    </div>

                    <button
                        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm z-10"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        <ChevronLeft className={cn("w-3 h-3 transition-transform duration-300", !sidebarOpen && "rotate-180")} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto no-scrollbar">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                                    isActive
                                        ? "bg-slate-100/80 text-slate-900"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon className={cn(
                                        "w-5 h-5 flex-shrink-0 transition-colors",
                                        isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                                    )} />
                                    <span className={cn(
                                        "text-sm font-medium whitespace-nowrap transition-opacity duration-200",
                                        sidebarOpen ? "opacity-100" : "opacity-0 hidden"
                                    )}>
                                        {item.label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User Footer */}
                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={handleLogout}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors group",
                            !sidebarOpen && "justify-center"
                        )}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        <span className={cn(
                            "text-sm font-medium whitespace-nowrap transition-opacity duration-200",
                            sidebarOpen ? "opacity-100" : "opacity-0 hidden"
                        )}>
                            Logout
                        </span>
                    </button>
                </div>
            </aside>

            {/* Main content - offset by sidebar width on desktop */}
            <div className={cn(
                "flex-1 flex flex-col min-h-[100dvh] w-full lg:w-auto transition-[margin] duration-300 ease-in-out",
                sidebarOpen ? "lg:ml-64" : "lg:ml-20"
            )}>
                {/* Minimalist Top Header - Desktop only */}
                <header className="hidden lg:flex h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 items-center px-8 z-20 sticky top-0">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-semibold tracking-tight">{currentNavItem.label}</h1>
                    </div>
                    <div className="flex-1" />
                    {user && (
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-semibold">{user.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Administrator</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                                {user.name?.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    )}
                </header>

                {/* Mobile Top Bar */}
                <header className="lg:hidden h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/50 flex items-center px-4 z-20 sticky top-0">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {settings.schoolLogo ? (
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                                <img src={settings.schoolLogo} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
                                <GraduationCap className="w-4 h-4 text-white" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h1 className="text-sm font-semibold leading-tight truncate">{settings.schoolName || 'Bagi Raport'}</h1>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest truncate">{currentNavItem.label}</p>
                        </div>
                    </div>
                    
                    {user && (
                        <div className="relative flex-shrink-0">
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm active:scale-95 transition-transform"
                            >
                                <Menu className="w-4 h-4" />
                            </button>

                            {/* Minimalist Dropdown Menu */}
                            {mobileMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)} />
                                    <div className="absolute right-0 top-10 w-48 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden py-1">
                                        <div className="px-4 py-3 border-b border-slate-50 mb-1">
                                            <p className="text-sm font-semibold truncate">{user.name}</p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Administrator</p>
                                        </div>
                                        <div className="px-1">
                                            <button
                                                onClick={() => {
                                                    setMobileMenuOpen(false)
                                                    handleLogout()
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span className="text-sm font-medium">Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </header>

                {/* Page content */}
                <main className="flex-1 pb-24 lg:pb-8 overflow-x-hidden w-full">
                    <Outlet />
                </main>

                {/* Modern Floating Bottom Navigation - Mobile Only */}
                <nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-slate-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.08)] z-40 rounded-full px-2 py-1.5 flex items-center gap-1 w-auto max-w-[95vw] overflow-x-auto no-scrollbar">
                    {mobileNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                cn(
                                    "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-full transition-all duration-300 relative min-w-[64px]",
                                    isActive ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <div className="absolute inset-0 bg-slate-100 rounded-full -z-10 animate-in fade-in zoom-in-95 duration-200"></div>
                                    )}
                                    <item.icon className={cn(
                                        "w-5 h-5 transition-transform duration-300",
                                        isActive && "scale-110"
                                    )} />
                                    <span className={cn(
                                        "text-[9px] font-semibold tracking-tight",
                                        isActive && "text-slate-900"
                                    )}>
                                        {item.label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </div>
        </div>
    )
}
