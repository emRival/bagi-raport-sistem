import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check for existing session
        const token = localStorage.getItem('auth_token')
        if (token) {
            // Verify token with backend
            authApi.verify()
                .then(data => {
                    setUser(data.user)
                })
                .catch(() => {
                    // Token invalid, clear it
                    localStorage.removeItem('auth_token')
                    localStorage.removeItem('auth_user')
                })
                .finally(() => {
                    setLoading(false)
                })
        } else {
            setLoading(false)
        }
    }, [])

    const login = async (username, password) => {
        try {
            const data = await authApi.login(username, password)

            // Save token and user
            localStorage.setItem('auth_token', data.token)
            localStorage.setItem('auth_user', JSON.stringify(data.user))
            setUser(data.user)

            return { success: true, user: data.user }
        } catch (error) {
            return { success: false, error: error.message || 'Login gagal' }
        }
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
    }

    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
