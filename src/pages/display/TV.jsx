import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useAnnouncements } from '../../context/AnnouncementsContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { socketService } from '../../services/socket.js'
import { queueApi } from '../../services/api.js'
import { Volume2, Megaphone, VolumeX, Wifi, WifiOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui-new/card'
import { Badge } from '@/components/ui-new/badge'

export default function TV() {
    const navigate = useNavigate()
    const { logout } = useAuth()
    const { announcements, refreshAnnouncements } = useAnnouncements()
    const { settings } = useSettings()

    const [soundEnabled, setSoundEnabled] = useState(false)
    const [connected, setConnected] = useState(false)
    const [callOverlay, setCallOverlay] = useState(null)
    const [announcementOverlay, setAnnouncementOverlay] = useState(null)
    const [stats, setStats] = useState({ byClass: [], totals: { waiting: 0, finished: 0, total: 0 } })
    const [currentTime, setCurrentTime] = useState(new Date())
    const [schoolName, setSchoolName] = useState('Sistem Antrian Bagi Raport')
    const [schoolLogo, setSchoolLogo] = useState('')
    const [classes, setClasses] = useState(['7A', '7B', '7C', '8A', '8B', '8C', '9A', '9B', '9C'])
    const [activeCalls, setActiveCalls] = useState({})
    const [onlineClasses, setOnlineClasses] = useState([])

    // TTS Queue System
    const [ttsQueue, setTtsQueue] = useState([])
    const [isSpeaking, setIsSpeaking] = useState(false)
    const ttsQueueRef = useRef([])
    const isSpeakingRef = useRef(false)

    const soundEnabledRef = useRef(soundEnabled)
    useEffect(() => {
        soundEnabledRef.current = soundEnabled
    }, [soundEnabled])

    useEffect(() => {
        ttsQueueRef.current = ttsQueue
        isSpeakingRef.current = isSpeaking
    }, [ttsQueue, isSpeaking])

    // Speak function
    const speak = (item) => {
        const text = typeof item === 'string' ? item : item.text
        const overlay = typeof item === 'object' ? item.overlay : null

        if ('speechSynthesis' in window) {
            if (overlay) {
                if (overlay.type === 'call') {
                    setCallOverlay({ name: overlay.name, class: overlay.class })
                } else if (overlay.type === 'announcement') {
                    setAnnouncementOverlay({ text: overlay.text })
                }
            }

            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'id-ID'
            utterance.rate = settings.ttsRate || 0.6
            utterance.pitch = settings.ttsPitch || 1.0
            utterance.volume = settings.ttsVolume || 1.0

            const setVoice = () => {
                const voices = speechSynthesis.getVoices()
                if (voices.length > 0) {
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
                    }
                }
            }

            setVoice()
            if (speechSynthesis.getVoices().length === 0) {
                speechSynthesis.addEventListener('voiceschanged', setVoice, { once: true })
            }

            utterance.onend = () => {
                if (overlay) {
                    if (overlay.type === 'call') {
                        setCallOverlay(null)
                    } else if (overlay.type === 'announcement') {
                        setAnnouncementOverlay(null)
                    }
                }
                setIsSpeaking(false)
                setTimeout(() => {
                    processQueue()
                }, 500)
            }

            utterance.onerror = (error) => {
                console.error('Speech error:', error)
                setCallOverlay(null)
                setAnnouncementOverlay(null)
                setIsSpeaking(false)
                setTimeout(() => {
                    processQueue()
                }, 500)
            }

            speechSynthesis.speak(utterance)
            setIsSpeaking(true)
        }
    }

    const addToQueue = (text, overlay = null) => {
        setTtsQueue(prev => [...prev, overlay ? { text, overlay } : text])
    }

    const processQueue = () => {
        const currentQueue = ttsQueueRef.current
        const speaking = isSpeakingRef.current

        if (currentQueue.length > 0 && !speaking) {
            const nextItem = currentQueue[0]
            setTtsQueue(prev => prev.slice(1))
            speak(nextItem)
        }
    }

    useEffect(() => {
        if (ttsQueue.length > 0 && !isSpeaking && soundEnabled) {
            processQueue()
        }
    }, [ttsQueue, isSpeaking, soundEnabled])

    const enableSound = () => {
        setSoundEnabled(true)
        localStorage.setItem('tv_sound_enabled', 'true')
    }

    useEffect(() => {
        const savedSound = localStorage.getItem('tv_sound_enabled')
        if (savedSound === 'true') {
            setSoundEnabled(true)
        }
    }, [])

    useEffect(() => {
        refreshAnnouncements()
        setSchoolName(settings.schoolName || 'Sistem Antrian Bagi Raport')
        setSchoolLogo(settings.schoolLogo || '')
        setClasses(settings.classes || ['7A', '7B', '7C', '8A', '8B', '8C', '9A', '9B', '9C'])
    }, [settings, refreshAnnouncements])

    const fetchStats = async () => {
        try {
            const data = await queueApi.getStats()
            setStats(data)
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }

    useEffect(() => {
        fetchStats()
        const interval = setInterval(fetchStats, 10000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        socketService.connect()
        socketService.register({ role: 'display' })

        const handleConnect = () => {
            setConnected(true)
            socketService.register({ role: 'display' })
        }

        const handleDisconnect = () => setConnected(false)

        const handleStudentCalled = (data) => {
            if (soundEnabledRef.current) {
                setActiveCalls(prev => ({ ...prev, [data.className]: data.studentName }))
                const text = `Panggilan untuk wali siswa ${data.studentName}, kelas ${data.className}. Silakan menuju ruang kelas sekarang.`
                addToQueue(text, { type: 'call', name: data.studentName, class: data.className })
                // Don't clear - keep until student finished
            }
            fetchStats()
        }

        const handleStudentFinished = (data) => {
            // Clear active call for this class when student finishes
            if (data && data.className) {
                setActiveCalls(prev => {
                    const newCalls = { ...prev }
                    delete newCalls[data.className]
                    return newCalls
                })
            }
            fetchStats()
        }

        const handleAnnouncement = (data) => {
            if (soundEnabledRef.current) {
                const text = `Pengumuman penting. ${data.text}`
                addToQueue(text, { type: 'announcement', text: data.text })
            }
            refreshAnnouncements()
        }

        const handleTeacherStatusUpdate = (data) => {
            setOnlineClasses(prev => {
                if (data.status === 'online') {
                    return Array.from(new Set([...prev, data.className]))
                } else {
                    return prev.filter(c => c !== data.className)
                }
            })
        }

        socketService.on('connect', handleConnect)
        socketService.on('disconnect', handleDisconnect)
        socketService.on('student-called', handleStudentCalled)
        socketService.on('student-finished', handleStudentFinished)
        socketService.on('announcement-created', handleAnnouncement)
        socketService.on('teacher-status-update', handleTeacherStatusUpdate)

        return () => {
            socketService.off('connect', handleConnect)
            socketService.off('disconnect', handleDisconnect)
            socketService.off('student-called', handleStudentCalled)
            socketService.off('student-finished', handleStudentFinished)
            socketService.off('announcement-created', handleAnnouncement)
            socketService.off('teacher-status-update', handleTeacherStatusUpdate)
        }
    }, [refreshAnnouncements])

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

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
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
            {/* Connection & Sound - Top Corners */}
            <div className={`fixed top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-xs z-50 shadow-lg ${connected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span>{connected ? 'Online' : 'Offline'}</span>
            </div>

            {!soundEnabled && (
                <button onClick={enableSound} className="fixed top-3 right-3 flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 smooth-transition z-50 font-semibold text-sm shadow-lg animate-pulse">
                    <VolumeX className="w-4 h-4" />
                    <span>🔊 Suara Aktif</span>
                </button>
            )}

            {soundEnabled && (
                <div className="fixed top-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-semibold z-50 shadow-lg">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Suara Aktif</span>
                </div>
            )}

            {/* Header */}
            <header className="text-center py-8 px-4 border-b border-white/10 bg-black/20 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto">
                    {schoolLogo && schoolLogo.trim() !== '' ? (
                        <img src={schoolLogo} alt="School Logo" className="w-20 h-20 mx-auto mb-4 object-contain" />
                    ) : (
                        <span className="text-6xl block mb-4">🎓</span>
                    )}
                    <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
                        SISTEM ANTRIAN BAGI RAPORT
                    </h1>
                    <p className="text-2xl md:text-3xl font-semibold text-blue-200 mb-1">{schoolName}</p>
                    <p className="text-lg text-blue-300/80">{formatDate(currentTime)}</p>
                </div>
            </header>

            {/* Grid - 5 columns, auto rows */}
            <main className="max-w-[1800px] mx-auto p-6">
                <div className="grid grid-cols-5 gap-4 auto-rows-fr">
                    {classData.map(cls => {
                        const isOnline = onlineClasses.includes(cls.id)
                        const activeStudent = activeCalls[cls.id]

                        return (
                            <Card
                                key={cls.id}
                                className={`overflow-hidden border-2 smooth-transition ${activeStudent
                                        ? 'border-yellow-400 bg-yellow-500/10 shadow-xl shadow-yellow-500/20 animate-pulse'
                                        : isOnline
                                            ? 'border-green-500/50 bg-slate-800/80'
                                            : 'border-slate-700/50 bg-slate-900/50'
                                    }`}
                            >
                                <CardContent className="p-5">
                                    {/* Header with Badge */}
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-2xl font-bold text-white">{cls.name}</h2>
                                        <Badge className={`text-xs font-bold ${isOnline ? 'bg-green-500 hover:bg-green-500 text-white' : 'bg-slate-600 hover:bg-slate-600 text-slate-300'}`}>
                                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                                        </Badge>
                                    </div>

                                    {/* Content */}
                                    <div className="mb-4 min-h-[80px] flex items-center justify-center">
                                        {activeStudent ? (
                                            <div className="text-center">
                                                <Badge className="bg-yellow-500 hover:bg-yellow-500 text-black font-bold mb-2 px-3 py-1.5 text-sm">
                                                    <Volume2 className="w-4 h-4 mr-1.5 inline" />
                                                    DIPANGGIL
                                                </Badge>
                                                <div className="text-2xl font-bold text-white mt-2 leading-tight">{activeStudent}</div>
                                            </div>
                                        ) : (
                                            <div className="text-center text-slate-400 text-base">
                                                {isOnline ? 'Menunggu Panggilan...' : 'Guru Belum Login'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 rounded-lg bg-orange-900/40 border border-orange-600/40">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-2xl">⏳</span>
                                                <span className="text-[10px] text-orange-300 font-bold uppercase">Menunggu</span>
                                            </div>
                                            <div className="text-3xl font-bold text-white text-center">{cls.waiting}</div>
                                        </div>
                                        <div className="p-3 rounded-lg bg-green-900/40 border border-green-600/40">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-2xl">✓</span>
                                                <span className="text-[10px] text-green-300 font-bold uppercase">Selesai</span>
                                            </div>
                                            <div className="text-3xl font-bold text-white text-center">{cls.finished}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </main>

            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm border-t border-white/10 py-3 px-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    {/* Time */}
                    <div className="flex items-center gap-3 text-2xl font-bold">
                        <span>🕐</span>
                        <span>{formatTime(currentTime)}</span>
                    </div>

                    {/* Ticker */}
                    <div className="flex-1 overflow-hidden">
                        {announcements.filter(a => a.is_active).length > 0 ? (
                            <div className="flex items-center gap-3">
                                <span className="text-2xl flex-shrink-0">📢</span>
                                <div className="overflow-hidden">
                                    <div className="animate-marquee whitespace-nowrap">
                                        {announcements.filter(a => a.is_active).map((a) => (
                                            <span key={a.id} className="mx-8 text-lg">{a.text}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-slate-400">
                                Selamat Datang di Sistem Antrian Bagi Raport
                            </div>
                        )}
                    </div>

                    {/* Total */}
                    <div className="flex items-center gap-4 text-lg">
                        <span>Selesai: <strong className="text-2xl">{stats.totals.finished}</strong></span>
                        <span className="flex items-center gap-2">
                            {onlineClasses.length > 0 ? '🟢' : '⚪'}
                            <span>{onlineClasses.length} Guru</span>
                        </span>
                    </div>
                </div>
            </footer>

            {/* Call Overlay */}
            {callOverlay && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
                    <div className="text-center p-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-2xl max-w-3xl mx-4 border-4 border-white/30">
                        <div className="mb-6">
                            <Volume2 className="w-24 h-24 mx-auto text-white animate-pulse" />
                        </div>
                        <h2 className="text-4xl font-bold mb-6 text-yellow-300">🔔 PANGGILAN UNTUK WALI SISWA</h2>
                        <p className="text-6xl font-bold mb-4">{callOverlay.name}</p>
                        <p className="text-3xl font-semibold mb-6 text-blue-200">KELAS {callOverlay.class}</p>
                        <p className="text-2xl text-blue-100">Silakan menuju ruang kelas sekarang</p>
                    </div>
                </div>
            )}

            {/* Announcement Overlay */}
            {announcementOverlay && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
                    <div className="text-center p-12 bg-gradient-to-br from-orange-600 to-red-700 rounded-2xl shadow-2xl max-w-3xl mx-4 border-4 border-white/30">
                        <div className="mb-6">
                            <Megaphone className="w-24 h-24 mx-auto text-white animate-pulse" />
                        </div>
                        <h2 className="text-4xl font-bold mb-6 text-yellow-300">📢 PENGUMUMAN PENTING</h2>
                        <p className="text-3xl leading-relaxed">{announcementOverlay.text}</p>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    display: inline-block;
                    animation: marquee 30s linear infinite;
                }
            `}</style>
        </div>
    )
}
{/* Compact indicators */ }
<div className={`fixed top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs z-50 ${connected ? 'bg-green-600/90 text-white' : 'bg-red-600/90 text-white'}`}>
    {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
    <span>{connected ? 'Online' : 'Offline'}</span>
</div>

{
    !soundEnabled && (
        <button onClick={enableSound} className="fixed top-3 right-3 flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 smooth-transition z-50 font-semibold text-sm shadow-lg animate-pulse">
            <VolumeX className="w-4 h-4" />
            <span>Aktifkan Suara</span>
        </button>
    )
}

{
    soundEnabled && (
        <div className="fixed top-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-blue-600/90 text-white rounded-lg text-xs font-medium z-50">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Suara Aktif</span>
        </div>
    )
}

{/* Compact Header */ }
<header className="flex-shrink-0 py-4 px-6 border-b border-white/10 bg-black/30 backdrop-blur-sm">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
            {schoolLogo && schoolLogo.trim() !== '' ? (
                <img src={schoolLogo} alt="Logo" className="w-12 h-12 object-contain" />
            ) : (
                <span className="text-4xl">🎓</span>
            )}
            <div className="text-left">
                <h1 className="text-xl font-bold text-white">SISTEM ANTRIAN BAGI RAPORT</h1>
                <p className="text-sm text-blue-300">{schoolName}</p>
            </div>
        </div>
        <div className="text-right">
            <p className="text-sm text-slate-300">{formatDate(currentTime)}</p>
            <p className="text-2xl font-bold text-white">{formatTime(currentTime)}</p>
        </div>
    </div>
</header>

{/* Fullscreen Grid */ }
<main className="flex-1 overflow-hidden p-4">
    <div className="h-full grid grid-cols-3 gap-4">
        {classData.map(cls => {
            const isOnline = onlineClasses.includes(cls.id)
            const activeStudent = activeCalls[cls.id]

            return (
                <Card
                    key={cls.id}
                    className={`flex flex-col overflow-hidden border-2 smooth-transition ${activeStudent
                        ? 'border-yellow-400 bg-yellow-500/10 shadow-xl shadow-yellow-500/20'
                        : isOnline
                            ? 'border-green-500/30 bg-slate-800/50'
                            : 'border-slate-700/50 bg-slate-900/50'
                        }`}
                >
                    <CardContent className="p-4 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-3 flex-shrink-0">
                            <h2 className="text-xl font-bold text-white">{cls.name}</h2>
                            <Badge className={`text-xs ${isOnline ? 'bg-green-500 hover:bg-green-500 text-white' : 'bg-slate-700 hover:bg-slate-700 text-slate-400'}`}>
                                {isOnline ? 'ONLINE' : 'OFFLINE'}
                            </Badge>
                        </div>

                        <div className="flex-1 flex items-center justify-center min-h-0">
                            {activeStudent ? (
                                <div className="text-center">
                                    <div className="mb-3 flex justify-center">
                                        <Badge className="bg-yellow-500 hover:bg-yellow-500 text-black font-bold px-3 py-1.5 text-sm animate-pulse">
                                            <Volume2 className="w-4 h-4 mr-1.5" />
                                            DIPANGGIL
                                        </Badge>
                                    </div>
                                    <div className="text-2xl font-bold text-white leading-tight">{activeStudent}</div>
                                </div>
                            ) : (
                                <div className="text-center text-slate-500 text-sm">
                                    {isOnline ? 'Menunggu Panggilan...' : 'Guru Belum Login'}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 flex-shrink-0 mt-3">
                            <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-yellow-900/30 border border-yellow-700/30">
                                <span className="text-2xl">⏳</span>
                                <div className="flex-1">
                                    <div className="text-[10px] text-yellow-300/80 font-medium uppercase">Menunggu</div>
                                    <div className="text-xl font-bold text-white">{cls.waiting}</div>
                                </div>
                            </div>
                            <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-green-900/30 border border-green-700/30">
                                <span className="text-2xl">✓</span>
                                <div className="flex-1">
                                    <div className="text-[10px] text-green-300/80 font-medium uppercase">Selesai</div>
                                    <div className="text-xl font-bold text-white">{cls.finished}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )
        })}
    </div>
</main>

{/* Compact Footer */ }
<footer className="flex-shrink-0 bg-black/30 backdrop-blur-sm border-t border-white/10 py-2 px-6">
    <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-sm">
        <div className="flex-1 overflow-hidden">
            {announcements.filter(a => a.is_active).length > 0 ? (
                <div className="flex items-center gap-2">
                    <span className="text-lg flex-shrink-0">📢</span>
                    <div className="overflow-hidden">
                        <div className="animate-marquee whitespace-nowrap text-sm">
                            {announcements.filter(a => a.is_active).map((a) => (
                                <span key={a.id} className="mx-6">{a.text}</span>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-slate-400 text-sm text-center">
                    Selamat Datang di Sistem Antrian Bagi Raport
                </div>
            )}
        </div>

        <div className="flex items-center gap-3 text-sm flex-shrink-0">
            <span>Selesai: <strong className="text-lg">{stats.totals.finished}</strong></span>
            <span className="flex items-center gap-1.5">
                {onlineClasses.length > 0 ? '🟢' : '⚪'}
                <span className="text-xs">{onlineClasses.length} Guru</span>
            </span>
        </div>
    </div>
</footer>

{/* Call Overlay */ }
{
    callOverlay && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
            <div className="text-center p-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-2xl max-w-3xl mx-4 border-4 border-white/30">
                <div className="mb-6">
                    <Volume2 className="w-20 h-20 mx-auto text-white animate-pulse" />
                </div>
                <h2 className="text-3xl font-bold mb-4 text-yellow-300">🔔 PANGGILAN UNTUK WALI SISWA</h2>
                <p className="text-5xl font-bold mb-3">{callOverlay.name}</p>
                <p className="text-2xl font-semibold mb-4 text-blue-200">KELAS {callOverlay.class}</p>
                <p className="text-xl text-blue-100">Silakan menuju ruang kelas sekarang</p>
            </div>
        </div>
    )
}

{/* Announcement Overlay */ }
{
    announcementOverlay && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
            <div className="text-center p-12 bg-gradient-to-br from-orange-600 to-red-700 rounded-2xl shadow-2xl max-w-3xl mx-4 border-4 border-white/30">
                <div className="mb-6">
                    <Megaphone className="w-20 h-20 mx-auto text-white animate-pulse" />
                </div>
                <h2 className="text-3xl font-bold mb-4 text-yellow-300">📢 PENGUMUMAN PENTING</h2>
                <p className="text-2xl leading-relaxed">{announcementOverlay.text}</p>
            </div>
        </div>
    )
}

<style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    display: inline-block;
                    animation: marquee 30s linear infinite;
                }
            `}</style>
        </div >
    )
}
