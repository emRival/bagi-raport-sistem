import { createContext, useContext, useCallback, useEffect, useRef } from 'react'

const BroadcastContext = createContext(null)

// Channel name for cross-tab communication
const CHANNEL_NAME = 'bagi-raport-tv-channel'

export function BroadcastProvider({ children }) {
    const channelRef = useRef(null)
    const listenersRef = useRef([])

    // Initialize BroadcastChannel
    useEffect(() => {
        channelRef.current = new BroadcastChannel(CHANNEL_NAME)

        channelRef.current.onmessage = (event) => {
            console.log('📡 BroadcastChannel received:', event.data)
            listenersRef.current.forEach(listener => listener(event.data))
        }

        return () => {
            channelRef.current?.close()
        }
    }, [])

    // Subscribe to broadcasts
    const subscribe = useCallback((callback) => {
        listenersRef.current.push(callback)
        return () => {
            listenersRef.current = listenersRef.current.filter(l => l !== callback)
        }
    }, [])

    // Broadcast a call to TV display
    const broadcastCall = useCallback((studentName, className) => {
        const message = {
            id: Date.now(),
            type: 'CALL',
            studentName,
            className,
            timestamp: new Date().toISOString(),
        }
        console.log('📢 Broadcasting call:', message)
        channelRef.current?.postMessage(message)
    }, [])

    // Broadcast an announcement to TV display
    const broadcastAnnouncement = useCallback((text) => {
        const message = {
            id: Date.now(),
            type: 'ANNOUNCEMENT',
            text,
            timestamp: new Date().toISOString(),
        }
        console.log('📢 Broadcasting announcement:', message)
        channelRef.current?.postMessage(message)
    }, [])

    const value = {
        broadcastCall,
        broadcastAnnouncement,
        subscribe,
    }

    return (
        <BroadcastContext.Provider value={value}>
            {children}
        </BroadcastContext.Provider>
    )
}

export function useBroadcast() {
    const context = useContext(BroadcastContext)
    if (!context) {
        throw new Error('useBroadcast must be used within a BroadcastProvider')
    }
    return context
}
