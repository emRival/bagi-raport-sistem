import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { settingsApi } from '../services/api.js'
import { socketService } from '../services/socket.js'


const AnnouncementsContext = createContext(null)

export function AnnouncementsProvider({ children }) {
    const [announcements, setAnnouncements] = useState([])

    // Fetch announcements from API
    const fetchAnnouncements = useCallback(async () => {
        try {
            const data = await settingsApi.getAnnouncements()
            console.log('🔍 Debug Context: Fetched announcements:', data)
            setAnnouncements(data)
        } catch (error) {
            console.error('Failed to fetch announcements:', error)
        }
    }, [])

    useEffect(() => {
        // Initial fetch
        fetchAnnouncements()

        // Connect socket if not already
        // socketService.connect() // Usually handled by App/Layout or other components

        // Listen for updates
        const unsubUpdate = socketService.on('announcement-updated', () => {
            console.log('🔄 Announcements updated, refetching...')
            fetchAnnouncements()
        })

        return () => {
            unsubUpdate()
        }
    }, [fetchAnnouncements])

    const addAnnouncement = async (text, isActive = 1) => {
        try {
            // Note: API expects text and is_active, but currently addAnnouncement takes text
            // We can update API call or assume backend default
            // Let's rely on backend default or update implementation
            const newAnn = await settingsApi.addAnnouncement(text) // is_active default 1 in backend
            setAnnouncements(prev => [newAnn, ...prev])
            return newAnn
        } catch (error) {
            console.error('Failed to add announcement:', error)
            throw error
        }
    }

    const updateAnnouncement = async (id, data) => {
        try {
            const updated = await settingsApi.updateAnnouncement(id, data)
            setAnnouncements(prev => prev.map(a => a.id === id ? updated : a))
            return updated
        } catch (error) {
            console.error('Failed to update announcement:', error)
            throw error
        }
    }

    const removeAnnouncement = async (id) => {
        try {
            await settingsApi.deleteAnnouncement(id)
            setAnnouncements(prev => prev.filter(a => a.id !== id))
        } catch (error) {
            console.error('Failed to remove announcement:', error)
            throw error
        }
    }

    const broadcastAnnouncement = async (id) => {
        try {
            await settingsApi.broadcastAnnouncement(id)
        } catch (error) {
            console.error('Failed to broadcast announcement:', error)
            throw error
        }
    }

    return (
        <AnnouncementsContext.Provider value={{
            announcements,
            addAnnouncement,
            updateAnnouncement,
            removeAnnouncement,
            refreshAnnouncements: fetchAnnouncements,
            broadcastAnnouncement
        }}>
            {children}
        </AnnouncementsContext.Provider>
    )
}

export function useAnnouncements() {
    const context = useContext(AnnouncementsContext)
    if (!context) {
        throw new Error('useAnnouncements must be used within an AnnouncementsProvider')
    }
    return context
}
