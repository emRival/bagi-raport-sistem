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
import './AdminLayout.css'

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
        <div className="admin-layout">
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? '' : 'sidebar--collapsed'} ${mobileOpen ? 'sidebar--mobile-open' : ''}`}>
                <div className="sidebar__header">
                    <div className="sidebar__logo">
                        <GraduationCap size={28} />
                        {sidebarOpen && <span>Bagi Raport</span>}
                    </div>
                    <button
                        className="sidebar__toggle sidebar__toggle--desktop"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        className="sidebar__toggle sidebar__toggle--mobile"
                        onClick={() => setMobileOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="sidebar__nav">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                            }
                            onClick={() => setMobileOpen(false)}
                        >
                            <item.icon size={20} />
                            {sidebarOpen && <span>{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar__footer">
                    <button className="sidebar__link sidebar__logout" onClick={handleLogout}>
                        <LogOut size={20} />
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className="admin-main">
                <header className="admin-header">
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setMobileOpen(true)}
                    >
                        <Menu size={24} />
                    </button>
                    <div className="admin-header__spacer" />
                    <div className="admin-header__user">
                        <span className="admin-header__name">{user?.name}</span>
                        <span className="admin-header__role">Administrator</span>
                    </div>
                </header>

                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
