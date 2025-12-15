import { createContext, useContext, useState, useEffect } from 'react'
import { settingsApi } from '../services/api'

const SettingsContext = createContext(null)

const DEFAULT_SETTINGS = {
    // School Info
    schoolName: 'SMP Negeri 1 Jakarta',
    schoolLogo: '', // URL or base64

    // Classes
    classes: ['7A', '7B', '7C', '8A', '8B', '8C', '9A', '9B', '9C'],

    // WhatsApp Config
    waEnabled: false,
    waApiUrl: '',
    waApiToken: '',
    waCheckinTemplate: 'Selamat datang! Antrian untuk ananda {name} kelas {class} telah terdaftar.',
    waCallTemplate: 'Giliran Anda! Silakan masuk ke kelas {class} untuk mengambil raport ananda {name}.',
}

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS)
    const [loading, setLoading] = useState(true)

    // Load settings from API on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await settingsApi.getAll()
                setSettings(prev => ({ ...prev, ...data }))
            } catch (error) {
                console.error('Failed to load settings:', error)
            } finally {
                setLoading(false)
            }
        }
        loadSettings()
    }, [])

    const updateSettings = async (updates) => {
        // Optimistic update
        setSettings(prev => ({ ...prev, ...updates }))

        // Persist to backend
        try {
            const promises = Object.entries(updates).map(([key, value]) =>
                settingsApi.update(key, value)
            )
            await Promise.all(promises)
        } catch (error) {
            console.error('Failed to save settings:', error)
            // Revert on error? For now just log
        }
    }

    // Class management - wraps updateSettings
    const addClass = (className) => {
        if (!settings.classes.includes(className)) {
            const newClasses = [...settings.classes, className].sort()
            updateSettings({ classes: newClasses })
            return true
        }
        return false
    }

    const removeClass = (className) => {
        const newClasses = settings.classes.filter(c => c !== className)
        updateSettings({ classes: newClasses })
    }

    const updateClass = (oldName, newName) => {
        if (oldName === newName) return true
        if (settings.classes.includes(newName)) return false
        const newClasses = settings.classes.map(c => c === oldName ? newName : c).sort()
        updateSettings({ classes: newClasses })
        return true
    }

    const value = {
        settings,
        updateSettings,
        addClass,
        removeClass,
        updateClass,
        loading
    }

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    )
}

export function useSettings() {
    const context = useContext(SettingsContext)
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider')
    }
    return context
}
