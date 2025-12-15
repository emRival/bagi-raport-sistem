import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useAnnouncements } from '../../context/AnnouncementsContext.jsx'
import { socketService } from '../../services/socket.js'
import { queueApi, settingsApi } from '../../services/api.js'
import { Volume2, Megaphone, VolumeX, Wifi, WifiOff } from 'lucide-react'
import './TV.css'

export default function TV() {
    const navigate = useNavigate()
    const { logout } = useAuth()
    const { announcements, refreshAnnouncements } = useAnnouncements()

    const [soundEnabled, setSoundEnabled] = useState(false)
    const [connected, setConnected] = useState(false)
    const [callOverlay, setCallOverlay] = useState(null)
    const [announcementOverlay, setAnnouncementOverlay] = useState(null)
    const [stats, setStats] = useState({ byClass: [], totals: { waiting: 0, finished: 0, total: 0 } })
    const [currentTime, setCurrentTime] = useState(new Date())
    const [tickerIndex, setTickerIndex] = useState(0)
    const [schoolName, setSchoolName] = useState('Sistem Antrian Bagi Raport')
    const [schoolLogo, setSchoolLogo] = useState('')
    const [classes, setClasses] = useState(['7A', '7B', '7C', '8A', '8B', '8C', '9A', '9B', '9C'])
    const [activeCalls, setActiveCalls] = useState({}) // Track active calls per class
    const [onlineClasses, setOnlineClasses] = useState([]) // Track connected teachers

    // TTS Queue System
    const [ttsQueue, setTtsQueue] = useState([])
    const [isSpeaking, setIsSpeaking] = useState(false)
    const ttsQueueRef = useRef([])
    const isSpeakingRef = useRef(false)

    // Use ref to track soundEnabled so socket handlers always have current value
    const soundEnabledRef = useRef(soundEnabled)
    useEffect(() => {
        soundEnabledRef.current = soundEnabled
    }, [soundEnabled])

    // Update TTS queue refs when state changes
    useEffect(() => {
        ttsQueueRef.current = ttsQueue
        isSpeakingRef.current = isSpeaking
    }, [ttsQueue, isSpeaking])

    // Speak function (with queue support and overlay sync)
    const speak = (item) => {
        // Support both string (backward compat) and object { text, overlay }
        const text = typeof item === 'string' ? item : item.text
        const overlay = typeof item === 'object' ? item.overlay : null

        if ('speechSynthesis' in window) {
            // Show overlay when starting speech
            if (overlay) {
                if (overlay.type === 'call') {
                    setCallOverlay({ name: overlay.name, class: overlay.class })
                } else if (overlay.type === 'announcement') {
                    setAnnouncementOverlay({ text: overlay.text })
                }
            }

            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'id-ID'
            utterance.rate = 0.6
            utterance.pitch = 1.0  // Lower pitch for deeper voice
            utterance.volume = 1.0

            // Set voice after ensuring voices are loaded
            const setVoice = () => {
                const voices = speechSynthesis.getVoices()

                if (voices.length > 0) {
                    // Priority: Indonesian male > Indonesian any > Non-female
                    const maleVoice = voices.find(v =>
                        v.lang.startsWith('id') && (
                            v.name.toLowerCase().includes('male') ||
                            v.name.toLowerCase().includes('rizki') ||
                            v.name.toLowerCase().includes('standard-b')
                        )
                    ) || voices.find(v => v.lang.startsWith('id'))
                        || voices.find(v => !v.name.toLowerCase().includes('female'))

                    if (maleVoice) {
                        utterance.voice = maleVoice
                        console.log('🎤 Using voice:', maleVoice.name, `(${maleVoice.lang})`)
                    } else {
                        console.log('🎤 Using default voice, pitch:', utterance.pitch)
                    }
                }
            }

            // Try to set voice immediately
            setVoice()

            // If voices weren't loaded, wait for them
            if (speechSynthesis.getVoices().length === 0) {
                speechSynthesis.addEventListener('voiceschanged', setVoice, { once: true })
            }

            // Handle completion to process next in queue and clear overlay
            utterance.onend = () => {
                console.log('🎤 Speech ended, checking queue...')

                // Clear overlay when speech ends
                if (overlay) {
                    if (overlay.type === 'call') {
                        setCallOverlay(null)
                    } else if (overlay.type === 'announcement') {
                        setAnnouncementOverlay(null)
                    }
                }

                setIsSpeaking(false)
                // Process next item after a small delay
                setTimeout(() => {
                    processQueue()
                }, 500) // 500ms gap between announcements
            }

            utterance.onerror = (error) => {
                console.error('🎤 Speech error:', error)

                // Clear overlay on error too
                setCallOverlay(null)
                setAnnouncementOverlay(null)

                setIsSpeaking(false)
                setTimeout(() => {
                    processQueue()
                }, 500)
            }

            speechSynthesis.speak(utterance)
            setIsSpeaking(true)
            console.log('🎤 Speaking:', text.substring(0, 50) + '...')
        } else {
            console.warn('Speech synthesis not supported')
        }
    }

    // Add to queue (text and optional overlay)
    const addToQueue = (text, overlay = null) => {
        const displayText = typeof text === 'string' ? text : text.text
        console.log('➕ Adding to TTS queue:', displayText.substring(0, 50) + '...')
        setTtsQueue(prev => [...prev, overlay ? { text, overlay } : text])
    }

    // Process queue
    const processQueue = () => {
        // Use refs to get current values in async context
        if (isSpeakingRef.current) {
            console.log('🎤 Already speaking, skipping queue process')
            return
        }

        if (ttsQueueRef.current.length === 0) {
            console.log('📭 Queue is empty')
            return
        }

        const [nextItem, ...remaining] = ttsQueueRef.current
        const displayText = typeof nextItem === 'string' ? nextItem : nextItem.text
        console.log('▶️ Processing queue:', displayText.substring(0, 50) + '...', `(${remaining.length} remaining)`)
        setTtsQueue(remaining)
        speak(nextItem)
    }

    // Effect to process queue when it changes
    useEffect(() => {
        if (!isSpeaking && ttsQueue.length > 0) {
            processQueue()
        }
    }, [ttsQueue, isSpeaking])

    // Fetch settings and stats from database
    const fetchData = async () => {
        try {
            const [statsData, settings] = await Promise.all([
                queueApi.getStats(),
                settingsApi.getAll()
            ])
            setStats(statsData)
            if (statsData.activeCalls) {
                // Merge with existing overlay to avoid flickering but prioritize API
                setActiveCalls(prev => ({ ...prev, ...statsData.activeCalls }))
            }
            if (settings.schoolName) setSchoolName(settings.schoolName)
            if (settings.schoolLogo) setSchoolLogo(settings.schoolLogo)
            if (settings.classes) setClasses(settings.classes)
        } catch (error) {
            console.error('Error fetching TV data:', error)
        }
    }

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [])

    // Connect to WebSocket
    useEffect(() => {
        socketService.connect()
        socketService.register('tv')

        const unsubConnect = socketService.on('connect', () => {
            setConnected(true)
            socketService.register('tv')
            // Request initial status? Or just wait for update.
            // Good practice: server sends initial state on connection/register? 
            // Currently server only broadcasts on change. 
            // We should add a 'get-online-status' or server should emit it to new clients.
        })

        const unsubDisconnect = socketService.on('disconnect', () => {
            setConnected(false)
        })

        const unsubCall = socketService.on('student-called', (data) => {
            console.log('📞 TV: Student called:', data, 'Sound enabled:', soundEnabledRef.current)

            // Set active call for this class
            setActiveCalls(prev => ({ ...prev, [data.className]: data.studentName }))

            if (soundEnabledRef.current) {
                addToQueue(
                    `Panggilan untuk wali siswa ${data.studentName}, kelas ${data.className}. Silakan menuju ruang kelas.`,
                    { type: 'call', name: data.studentName, class: data.className }
                )
            }
        })

        const unsubFinish = socketService.on('student-finished', (data) => {
            console.log('✅ TV: Student finished:', data)
            // Remove from active calls
            setActiveCalls(prev => {
                const updated = { ...prev }
                // Only remove if it matches current student (in case replaced)
                if (updated[data.className] === data.studentName) {
                    delete updated[data.className]
                }
                return updated
            })
        })

        const unsubAnnouncement = socketService.on('announcement', (data) => {
            console.log('📢 TV: Announcement:', data, 'Sound enabled:', soundEnabledRef.current)
            // Refresh list to show in footer
            refreshAnnouncements()

            if (soundEnabledRef.current) {
                addToQueue(
                    `Pengumuman penting: ${data.text}`,
                    { type: 'announcement', text: data.text }
                )
            }
        })

        const unsubOnline = socketService.on('online-status', (classes) => {
            console.log('🟢 Online classes:', classes)
            setOnlineClasses(classes)
        })

        const unsubQueue = socketService.on('queue-updated', () => {
            console.log('🔄 Queue updated, refetching data...')
            fetchData()
        })

        return () => {
            unsubConnect()
            unsubDisconnect()
            unsubCall()
            unsubFinish()
            unsubAnnouncement()
            unsubOnline()
            unsubQueue()
        }
    }, [])

    const enableSound = () => {
        setSoundEnabled(true)
        addToQueue('Suara diaktifkan')
    }

    // Update clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    // Ticker animation
    useEffect(() => {
        if (announcements.length === 0) return
        const timer = setInterval(() => {
            setTickerIndex(prev => (prev + 1) % announcements.length)
        }, 8000)
        return () => clearInterval(timer)
    }, [announcements.length])

    // Hide cursor when idle
    useEffect(() => {
        let timeout
        const handleMouseMove = () => {
            document.body.style.cursor = 'default'
            clearTimeout(timeout)
            timeout = setTimeout(() => {
                document.body.style.cursor = 'none'
            }, 5000)
        }
        handleMouseMove()
        document.addEventListener('mousemove', handleMouseMove)
        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.body.style.cursor = 'default'
        }
    }, [])

    // Escape to logout
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                logout()
                navigate('/login')
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [logout, navigate])

    const formatDate = (date) => date.toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    const formatTime = (date) => date.toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    })

    // Build class data from stats
    const classData = classes.map(cls => {
        const classStats = stats.byClass.find(s => s.class === cls) || { waiting: 0, finished: 0 }
        return {
            id: cls,
            name: `Kelas ${cls}`,
            waiting: classStats.waiting || 0,
            finished: classStats.finished || 0
        }
    })

    return (
        <div className="tv-page">
            {/* Connection Status */}
            <div className={`tv-connection ${connected ? 'tv-connection--connected' : 'tv-connection--disconnected'}`}>
                {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
                <span>{connected ? 'Terhubung' : 'Tidak Terhubung'}</span>
            </div>

            {/* Sound Enable Button */}
            {!soundEnabled && (
                <button className="tv-sound-enable" onClick={enableSound}>
                    <VolumeX size={24} />
                    <span>Klik untuk Aktifkan Suara</span>
                </button>
            )}

            {soundEnabled && (
                <div className="tv-sound-indicator">
                    <Volume2 size={16} />
                    <span>Suara Aktif</span>
                </div>
            )}

            {/* Header */}
            <header className="tv-header">
                <div className="tv-header__title">
                    {schoolLogo && schoolLogo.trim() !== '' ? (
                        <img
                            src={schoolLogo}
                            alt="School Logo"
                            style={{
                                width: '80px',
                                height: '80px',
                                objectFit: 'contain',
                                marginBottom: '1rem'
                            }}
                        />
                    ) : (
                        <span style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎓</span>
                    )}
                    <h1>SISTEM ANTRIAN BAGI RAPORT</h1>
                    <p className="tv-header__school">{schoolName}</p>
                    <p className="tv-header__date">{formatDate(currentTime)}</p>
                </div>
            </header>



            {/* Grid */}
            <main className="tv-main">
                <div className="tv-grid">
                    {classData.map(cls => {
                        const waitingCount = cls.waiting
                        const finishedCount = cls.finished
                        // Check if teacher is online
                        const isOnline = onlineClasses.includes(cls.id)

                        // Debug log (temporary)
                        if (cls.id === '7A') {
                            console.log(`Checking 7A: onlineClasses=${JSON.stringify(onlineClasses)}, isOnline=${isOnline}`)
                        }

                        // Check if there is an active call for this class
                        const activeStudent = activeCalls[cls.id]

                        return (
                            <div
                                key={cls.id}
                                className={`tv-card ${isOnline ? 'tv-card--online' : 'tv-card--offline'} ${activeStudent ? 'tv-card--calling' : ''}`}
                            >
                                <div className="tv-card__header">
                                    <h2 className="tv-card__title">{cls.name}</h2>
                                    <span className={`tv-card__status ${isOnline ? 'tv-card__status--online' : 'tv-card__status--offline'}`}>
                                        {isOnline ? 'AKTIF' : 'OFFLINE'}
                                    </span>
                                </div>
                                <div className="tv-card__content">
                                    {activeStudent ? (
                                        <div className="tv-card__call">
                                            <span className="tv-card__badge">
                                                <Volume2 size={16} /> DIPANGGIL
                                            </span>
                                            <div className="tv-card__student">{activeStudent}</div>
                                        </div>
                                    ) : (
                                        <div className="tv-card__idle">
                                            {isOnline ? 'Menunggu Panggilan...' : 'Guru Belum Login'}
                                        </div>
                                    )}
                                </div>
                                <div className="tv-card__footer">
                                    <div className="tv-card__stat">
                                        <span className="tv-card__stat-icon warning">⏳</span>
                                        <div className="tv-card__stat-info">
                                            <span className="tv-card__stat-label">MENUNGGU</span>
                                            <span className="tv-card__stat-value">{waitingCount}</span>
                                        </div>
                                    </div>
                                    <div className="tv-card__stat-divider"></div>
                                    <div className="tv-card__stat">
                                        <span className="tv-card__stat-icon success">✓</span>
                                        <div className="tv-card__stat-info">
                                            <span className="tv-card__stat-label">SELESAI</span>
                                            <span className="tv-card__stat-value">{finishedCount}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </main>

            {/* Footer */}
            <footer className="tv-footer">
                <div className="tv-footer__time">
                    <span className="time-icon">🕐</span>
                    <span className="time-value">{formatTime(currentTime)}</span>
                </div>

                {/* Inline Ticker */}
                <div className="tv-footer__ticker">
                    {announcements.filter(a => a.is_active).length > 0 ? (
                        <div className="inline-ticker">
                            <span className="inline-ticker__icon">📢</span>
                            <div className="inline-ticker__content">
                                <div className="inline-ticker__text">
                                    {announcements.filter(a => a.is_active).map((a, i) => (
                                        <span key={a.id} className="ticker-item">
                                            {a.text} •
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="tv-footer__placeholder">
                            Selamat Datang di Sistem Antrian Bagi Raport
                        </div>
                    )}
                </div>

                <div className="tv-footer__total">
                    Selesai: <strong>{stats.totals.finished}</strong>
                    <span className="online-indicator">
                        {onlineClasses.length > 0 ? '🟢 Online' : '⚪ Offline'}
                    </span>
                </div>
            </footer>

            {/* Call Overlay */}
            {callOverlay && (
                <div className="call-overlay">
                    <div className="call-overlay__content">
                        <div className="call-overlay__icon">
                            <Volume2 size={64} />
                        </div>
                        <h2 className="call-overlay__title">🔔 PANGGILAN UNTUK WALI SISWA</h2>
                        <p className="call-overlay__name">{callOverlay.name}</p>
                        <p className="call-overlay__class">KELAS {callOverlay.class}</p>
                        <p className="call-overlay__message">Silakan menuju ruang kelas sekarang</p>
                    </div>
                </div>
            )}

            {/* Announcement Overlay */}
            {announcementOverlay && (
                <div className="announcement-overlay">
                    <div className="announcement-overlay__content">
                        <div className="announcement-overlay__icon">
                            <Megaphone size={64} />
                        </div>
                        <h2 className="announcement-overlay__title">📢 PENGUMUMAN PENTING</h2>
                        <p className="announcement-overlay__text">{announcementOverlay.text}</p>
                    </div>
                </div>
            )}
        </div>
    )
}
