import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
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
    MoreHorizontal,
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
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div className="flex h-screen bg-slate-50">
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
                "flex-1 flex flex-col min-h-screen",
                sidebarOpen ? "lg:ml-64" : "lg:ml-20"
            )}>
                {/* Top header - Desktop only */}
                <header className="hidden lg:flex h-16 bg-white border-b border-slate-200 items-center px-4 sm:px-6 shadow-sm">
                    <div className="flex-1" />
                    {user && (
                        <div className="flex items-center gap-3">
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

                {/* Mobile Top Bar with Logout Menu */}
                <header className="lg:hidden h-14 bg-white border-b border-slate-200 flex items-center px-4 shadow-sm relative">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-900">Bagi Raport</h1>
                        </div>
                    </div>
                    <div className="flex-1" />
                    {user && (
                        <div className="relative">
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm hover:scale-110 smooth-transition active:scale-95"
                            >
                                {user.name?.charAt(0).toUpperCase()}
                            </button>

                            {/* Dropdown Menu */}
                            {mobileMenuOpen && (
                                <>
                                    {/* Overlay to close menu */}
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setMobileMenuOpen(false)}
                                    />

                                    {/* Menu */}
                                    <div className="absolute right-0 top-12 w-56 bg-white rounded-lg shadow-2xl border border-slate-200 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="p-3 border-b border-slate-100">
                                            <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                                            <p className="text-xs text-slate-500">Administrator</p>
                                        </div>
                                        <div className="p-2">
                                            <button
                                                onClick={() => {
                                                    setMobileMenuOpen(false)
                                                    handleLogout()
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 smooth-transition"
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

                {/* Page content with bottom padding for mobile nav */}
                <main className="flex-1 pb-20 lg:pb-0">
                    <Outlet />
                </main>

                {/* Modern Bottom Navigation - Mobile Only */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl z-40">
                    <div className="flex items-center justify-around px-2 py-2 safe-bottom">
                        {mobileNavItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    cn(
                                        "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl smooth-transition min-w-[60px] relative",
                                        isActive
                                            ? "text-blue-600"
                                            : "text-slate-500"
                                    )
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <div className="absolute inset-0 bg-blue-50 rounded-xl animate-in fade-in zoom-in-95 duration-200"></div>
                                        )}
                                        <item.icon className={cn(
                                            "w-6 h-6 relative z-10 smooth-transition",
                                            isActive && "scale-110"
                                        )} />
                                        <span className={cn(
                                            "text-xs font-medium relative z-10",
                                            isActive && "font-semibold"
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
