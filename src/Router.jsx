import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'

// Layouts
import AdminLayout from './components/layout/AdminLayout.jsx'

// Pages
import Login from './pages/auth/Login.jsx'
import AdminDashboard from './pages/admin/Dashboard.jsx'
import AdminUsers from './pages/admin/Users.jsx'
import AdminStudents from './pages/admin/Students.jsx'
import AdminSettings from './pages/admin/Settings.jsx'
import AdminClasses from './pages/admin/Classes.jsx'
import AdminHistory from './pages/admin/History.jsx'
import GuardCheckin from './pages/guard/Checkin.jsx'
import TeacherQueue from './pages/teacher/Queue.jsx'
import TeacherHistory from './pages/teacher/History.jsx'
import TV from './pages/display/TV.jsx'

// Protected Route wrapper
function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading, isAuthenticated } = useAuth()

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to role-appropriate page
        const roleRoutes = {
            admin: '/admin/dashboard',
            satpam: '/guard/checkin',
            teacher: '/teacher/queue',
            tv: '/display/tv',
        }
        return <Navigate to={roleRoutes[user.role] || '/login'} replace />
    }

    return children
}

// Public Route wrapper (redirect if already logged in)
function PublicRoute({ children }) {
    const { user, loading, isAuthenticated } = useAuth()

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
            </div>
        )
    }

    if (isAuthenticated) {
        const roleRoutes = {
            admin: '/admin/dashboard',
            satpam: '/guard/checkin',
            teacher: '/teacher/queue',
            tv: '/display/tv',
        }
        return <Navigate to={roleRoutes[user.role] || '/'} replace />
    }

    return children
}

export default function Router() {
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/login" element={
                <PublicRoute>
                    <Login />
                </PublicRoute>
            } />

            {/* Admin routes */}
            <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <AdminLayout />
                </ProtectedRoute>
            }>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="students" element={<AdminStudents />} />
                <Route path="history" element={<AdminHistory />} />
                <Route path="classes" element={<AdminClasses />} />
                <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Guard routes */}
            <Route path="/guard/checkin" element={
                <ProtectedRoute allowedRoles={['satpam']}>
                    <GuardCheckin />
                </ProtectedRoute>
            } />

            {/* Teacher routes */}
            <Route path="/teacher/queue" element={
                <ProtectedRoute allowedRoles={['teacher']}>
                    <TeacherQueue />
                </ProtectedRoute>
            } />
            <Route path="/teacher/history" element={
                <ProtectedRoute allowedRoles={['teacher']}>
                    <TeacherHistory />
                </ProtectedRoute>
            } />

            {/* Display routes */}
            <Route path="/display/tv" element={
                <ProtectedRoute allowedRoles={['tv']}>
                    <TV />
                </ProtectedRoute>
            } />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    )
}
