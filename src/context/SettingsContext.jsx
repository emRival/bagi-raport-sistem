import { createContext, useContext, useState, useEffect, useCallback } from 'react'
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
    waCheckinTemplate: `*👋 Assalamu'alaikum, Selamat Pagi!*
Bapak/Ibu *{parent_name}*,

Ananda *{name}* (Kelas {class}) telah berhasil check-in.
Nomor Antrian: *{queue_number}*
Waktu: {time}

🔗 *Pantau Antrian Secara Live:*
{tracking_link}

_Mohon menunggu giliran dipanggil._
Terima kasih. 🙏`,

    waCallTemplate: `*🔔 PANGGILAN ANTRIAN*
Bapak/Ibu *{parent_name}*,

Giliran ananda *{name}* (Kelas {class}) untuk pengambilan raport.
Silakan menuju ke ruang kelas sekarang.

_Terima kasih atas kesabarannya._ 🙏`,

    // TTS Config
    ttsPitch: 1.0,
    ttsRate: 0.8,
    ttsVolume: 1.0,
}

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS)
    const [loading, setLoading] = useState(true)

    // Load settings from API
    const loadSettings = useCallback(async () => {
        try {
            setLoading(true)
            const data = await settingsApi.getAll()
            setSettings(prev => ({ ...prev, ...data }))
            return data
        } catch (error) {
            console.error('Failed to load settings:', error)
            return null
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadSettings()
    }, [loadSettings])

    const updateSettings = async (updates) => {
        // Optimistic update
        setSettings(prev => ({ ...prev, ...updates }))

        // Persist to backend - Sequential to avoid rate limit spikes
        try {
            for (const [key, value] of Object.entries(updates)) {
                await settingsApi.update(key, value)
            }
        } catch (error) {
            console.error('Failed to save settings:', error)
            // Ideally re-fetch or revert here
            throw error
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
        loading,
        refreshSettings: loadSettings
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
