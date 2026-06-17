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
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/students', label: 'Siswa', icon: GraduationCap },
    { path: '/admin/queue', label: 'Antrian', icon: ClipboardList },
    { path: '/admin/history', label: 'History', icon: History },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
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

    // Map routes to labels and icons for the header
    const currentNavItem = [...navItems, ...mobileNavItems].find(item => location.pathname === item.path) || { label: 'Admin', icon: GraduationCap }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row overflow-x-hidden">
            {/* Desktop Sidebar - Hidden on Mobile */}
            <aside
                className={cn(
                    "hidden lg:flex fixed top-0 left-0 h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50 flex-col shadow-2xl smooth-transition z-30",
                    sidebarOpen ? "w-64" : "w-20"
                )}
            >
                {/* Header */}
                <div className="relative p-4 border-b border-slate-700/50">
                    <div className="flex items-center gap-3 justify-center">
                        {settings.schoolLogo ? (
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden">
                                <img src={settings.schoolLogo} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                <GraduationCap className="w-6 h-6 text-white" />
                            </div>
                        )}
                        {sidebarOpen && (
                            <div className="animate-fade-in min-w-0 flex-1">
                                <h1 className="text-white font-bold text-sm leading-tight break-words">
                                    {settings.schoolName || 'Bagi Raport'}
                                </h1>
                                <p className="text-slate-400 text-[10px] leading-tight mt-0.5">Sistem Antrian Raport</p>
                            </div>
                        )}
                    </div>

                    {/* Floating Arrow Button */}
                    <button
                        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 hover:text-white smooth-transition shadow-lg border border-slate-600 z-10"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        <ChevronLeft className={cn("w-4 h-4 smooth-transition", !sidebarOpen && "rotate-180")} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
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

                {/* Powered By Footer */}
                {sidebarOpen && (
                    <div className="px-4 py-2 border-t border-slate-700/30">
                        <p className="text-[10px] text-slate-500 text-center leading-tight">
                            Powered by <span className="text-blue-400 font-medium">Bagi Raport</span>
                        </p>
                        <p className="text-[9px] text-slate-600 text-center">
                            @em_rival
                        </p>
                    </div>
                )}

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

            {/* Main content - offset by sidebar width on desktop */}
            <div className={cn(
                "flex-1 flex flex-col min-h-screen w-full",
                sidebarOpen ? "lg:pl-64" : "lg:pl-20"
            )}>
                {/* Top header - Desktop only */}
                <header className="hidden lg:flex h-16 bg-white border-b border-slate-200 items-center px-6 shadow-sm z-20 sticky top-0 w-full">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <currentNavItem.icon className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900">{currentNavItem.label}</h1>
                    </div>
                    <div className="flex-1" />
                    {user && (
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
                            <div className="text-right">
                                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Administrator</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
                                {user.name?.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    )}
                </header>

                {/* Mobile Top Bar */}
                <header className="lg:hidden h-14 bg-white border-b border-slate-200 flex items-center px-4 shadow-sm relative z-20 sticky top-0 w-full">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {settings.schoolLogo ? (
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow border border-slate-100 overflow-hidden flex-shrink-0">
                                <img src={settings.schoolLogo} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                <GraduationCap className="w-5 h-5 text-white" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">
                                {settings.schoolName || 'Bagi Raport'}
                            </h1>
                            <p className="text-[10px] text-slate-500 font-medium truncate">{currentNavItem.label}</p>
                        </div>
                    </div>
                    <div className="flex-1" />
                    {user && (
                        <div className="relative flex-shrink-0">
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md active:scale-90 smooth-transition"
                            >
                                {user.name?.charAt(0).toUpperCase()}
                            </button>

                            {/* Dropdown Menu */}
                            {mobileMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40 bg-black/5" onClick={() => setMobileMenuOpen(false)} />
                                    <div className="absolute right-0 top-11 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                                        <div className="p-4 bg-slate-50 border-b border-slate-100">
                                            <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">Administrator</p>
                                        </div>
                                        <div className="p-2">
                                            <button
                                                onClick={() => {
                                                    setMobileMenuOpen(false)
                                                    handleLogout()
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 smooth-transition"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span className="text-sm font-bold">Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </header>

                {/* Page content with bottom padding for mobile nav */}
                <main className="flex-1 pb-24 lg:pb-0 overflow-x-hidden w-full">
                    <Outlet />
                </main>

                {/* Modern Bottom Navigation - Mobile Only */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40">
                    <div className="flex items-center justify-around px-2 py-3 safe-bottom max-w-lg mx-auto">
                        {mobileNavItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    cn(
                                        "flex flex-col items-center justify-center gap-1.5 px-3 py-1 rounded-xl smooth-transition min-w-[64px] relative",
                                        isActive
                                            ? "text-blue-600"
                                            : "text-slate-400 hover:text-slate-600"
                                    )
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <div className="absolute inset-x-1 inset-y-0 bg-blue-50 rounded-xl animate-in fade-in zoom-in-95 duration-200"></div>
                                        )}
                                        <item.icon className={cn(
                                            "w-5 h-5 relative z-10 smooth-transition",
                                            isActive && "scale-110"
                                        )} />
                                        <span className={cn(
                                            "text-[9px] font-bold relative z-10 tracking-tight",
                                            isActive && "text-blue-700"
                                        )}>
                                            {item.label}
                                        </span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </nav>
            </div>
        </div>
    )
}
