import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useAnnouncements } from '../../context/AnnouncementsContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { socketService } from '../../services/socket.js'
import { queueApi } from '../../services/api.js'
import { Volume2, Megaphone, VolumeX, Wifi, WifiOff } from 'lucide-react'

import { Badge } from '@/components/ui-new/badge'
import { Button } from '@/components/ui-new/button'

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

    const [ttsQueue, setTtsQueue] = useState([])
    const [isSpeaking, setIsSpeaking] = useState(false)
    const ttsQueueRef = useRef([])
    const isSpeakingRef = useRef(false)
    const soundEnabledRef = useRef(soundEnabled)

    useEffect(() => { soundEnabledRef.current = soundEnabled }, [soundEnabled])
    useEffect(() => { ttsQueueRef.current = ttsQueue; isSpeakingRef.current = isSpeaking }, [ttsQueue, isSpeaking])

    const speak = (item) => {
        const text = typeof item === 'string' ? item : item.text
        const overlay = typeof item === 'object' ? item.overlay : null

        if ('speechSynthesis' in window) {
            if (overlay) {
                if (overlay.type === 'call') setCallOverlay({ name: overlay.name, class: overlay.class })
                else if (overlay.type === 'announcement') setAnnouncementOverlay({ text: overlay.text })
            }

            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'id-ID'
            utterance.rate = settings.ttsRate || 0.6
            utterance.pitch = settings.ttsPitch || 1.0
            utterance.volume = settings.ttsVolume || 1.0

            const setVoice = () => {
                const voices = speechSynthesis.getVoices()
                if (voices.length > 0) {
                    const maleVoice = voices.find(v => v.lang.startsWith('id') && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('rizki') || v.name.toLowerCase().includes('standard-b'))) || voices.find(v => v.lang.startsWith('id')) || voices.find(v => !v.name.toLowerCase().includes('female'))
                    if (maleVoice) utterance.voice = maleVoice
                }
            }

            setVoice()
            if (speechSynthesis.getVoices().length === 0) {
                speechSynthesis.addEventListener('voiceschanged', setVoice, { once: true })
            }

            utterance.onend = () => {
                if (overlay) {
                    if (overlay.type === 'call') setCallOverlay(null)
                    else if (overlay.type === 'announcement') setAnnouncementOverlay(null)
                }
                setIsSpeaking(false)
                setTimeout(() => processQueue(), 500)
            }

            utterance.onerror = () => {
                setCallOverlay(null)
                setAnnouncementOverlay(null)
                setIsSpeaking(false)
                setTimeout(() => processQueue(), 500)
            }

            speechSynthesis.speak(utterance)
            setIsSpeaking(true)
        }
    }

    const addToQueue = (text, overlay = null) => setTtsQueue(prev => [...prev, overlay ? { text, overlay } : text])

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
        if (ttsQueue.length > 0 && !isSpeaking && soundEnabled) processQueue()
    }, [ttsQueue, isSpeaking, soundEnabled])

    const enableSound = () => {
        setSoundEnabled(true)
        localStorage.setItem('tv_sound_enabled', 'true')
    }

    useEffect(() => {
        const savedSound = localStorage.getItem('tv_sound_enabled')
        if (savedSound === 'true') setSoundEnabled(true)
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
            // Also update online classes if provided in stats
            if (data.onlineClasses) {
                setOnlineClasses(data.onlineClasses)
            }
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
            }
            fetchStats()
        }
        const handleStudentFinished = (data) => {
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
            console.log('Online status event:', data)
            if (Array.isArray(data)) {
                setOnlineClasses(data)
            } else if (data && data.onlineClasses) {
                setOnlineClasses(data.onlineClasses)
            } else {
                setOnlineClasses(prev => {
                    if (data.status === 'online') return Array.from(new Set([...prev, data.className]))
                    else return prev.filter(c => c !== data.className)
                })
            }
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
            timeout = setTimeout(() => { document.body.style.cursor = 'none' }, 5000)
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

    const formatDate = (date) => date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const formatTime = (date) => date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

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
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 shadow-sm z-10 sticky top-0">
                <div className="px-6 py-4 flex items-center justify-between gap-4">
                    {/* Left: Identity */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                        {schoolLogo && schoolLogo.trim() !== '' ? (
                            <img src={schoolLogo} alt="Logo" className="w-12 h-12 object-contain" />
                        ) : (
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md">
                                <span className="text-2xl">🎓</span>
                            </div>
                        )}
                        <div className="min-w-0">
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">ANTRIAN RAPORT</h1>
                            <p className="text-sm font-medium text-slate-500 truncate">{schoolName}</p>
                        </div>
                    </div>

                    {/* Right: Controls & Info */}
                    <div className="flex items-center gap-6 flex-shrink-0">
                        {/* Status Controls */}
                        <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                            <Badge
                                variant={connected ? "default" : "destructive"}
                                className={`${connected ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"} h-8 px-3 text-sm font-bold shadow-sm transition-all`}
                            >
                                {connected ? <><Wifi className="w-4 h-4 mr-1.5" />Online</> : <><WifiOff className="w-4 h-4 mr-1.5" />Offline</>}
                            </Badge>

                            <Button
                                size="sm"
                                variant={soundEnabled ? "default" : "outline"}
                                onClick={soundEnabled ? () => setSoundEnabled(false) : enableSound}
                                className={`h-8 font-bold text-xs ${soundEnabled ? "bg-blue-600 hover:bg-blue-700 shadow-md" : "border-slate-300 text-slate-600 hover:bg-slate-200"}`}
                            >
                                {soundEnabled ? <Volume2 className="w-4 h-4 mr-1.5" /> : <VolumeX className="w-4 h-4 mr-1.5" />}
                                {soundEnabled ? 'SUARA ON' : 'SUARA OFF'}
                            </Button>
                        </div>

                        {/* Divider */}
                        <div className="h-10 w-px bg-slate-200"></div>

                        {/* Time */}
                        <div className="text-right">
                            <div className="text-3xl font-black text-slate-900 tabular-nums leading-none tracking-tight">
                                {formatTime(currentTime)}
                            </div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">
                                {formatDate(currentTime)}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content - Full Height Grid */}
            <main className="flex-1 p-4 overflow-hidden flex flex-col">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 h-full content-start">
                    {classData.map(cls => {
                        const isOnline = onlineClasses.includes(cls.id)
                        const activeStudent = activeCalls[cls.id]
                        const isActiveCall = !!activeStudent

                        return (
                            <div
                                key={cls.id}
                                className={`
                                    relative flex flex-col bg-white rounded-xl shadow-sm border transition-all duration-300 overflow-hidden group
                                    ${isActiveCall
                                        ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-xl scale-[1.02] z-10'
                                        : isOnline
                                            ? 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                                            : 'border-slate-100 bg-slate-50 opacity-90 grayscale-[0.5]'
                                    }
                                `}
                            >
                                {/* Active Call Indicator */}
                                {isActiveCall && (
                                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 animate-shimmer bg-[length:200%_100%]"></div>
                                )}

                                {/* Card Header */}
                                <div className={`px-5 py-4 border-b flex justify-between items-center ${isActiveCall ? 'bg-blue-50/50 border-blue-100' : 'bg-transparent border-slate-100'}`}>
                                    <h2 className={`text-2xl font-black tracking-tight ${isActiveCall ? 'text-blue-700' : 'text-slate-800'}`}>
                                        {cls.name}
                                    </h2>
                                    {isOnline ? (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wide border border-emerald-200">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            Online
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wide">
                                            Offline
                                        </span>
                                    )}
                                </div>

                                {/* Card Body */}
                                <div className="flex-1 p-5 flex flex-col justify-center">
                                    {isActiveCall ? (
                                        <div className="text-center animate-in fade-in zoom-in duration-300">
                                            <div className="inline-flex items-center justify-center p-3 bg-blue-100 text-blue-600 rounded-full mb-3 animate-bounce">
                                                <Volume2 className="w-8 h-8" />
                                            </div>
                                            <div className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Sedang Dipanggil</div>
                                            <div className="text-xl font-bold text-slate-900 leading-tight line-clamp-2 px-2">
                                                {activeStudent}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`text-center space-y-2 ${!isOnline && 'opacity-50'}`}>
                                            {isOnline ? (
                                                <div className="text-slate-400 text-sm font-medium">Menunggu Antrian...</div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-2">
                                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                                                        <WifiOff className="w-5 h-5 text-slate-400" />
                                                    </div>
                                                    <div className="text-slate-400 text-sm font-medium">Guru Offline</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer - Stats */}
                                <div className="grid grid-cols-2 border-t border-slate-100 divide-x divide-slate-100 bg-slate-50/50">
                                    <div className="p-3 flex flex-col items-center justify-center hover:bg-orange-50/50 transition-colors">
                                        <div className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-0.5">Menunggu</div>
                                        <div className="text-2xl font-black text-slate-700 tabular-nums">{cls.waiting}</div>
                                    </div>
                                    <div className="p-3 flex flex-col items-center justify-center hover:bg-emerald-50/50 transition-colors">
                                        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Selesai</div>
                                        <div className="text-2xl font-black text-slate-700 tabular-nums">{cls.finished}</div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </main>

            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white shadow-lg py-2 px-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex-1 overflow-hidden">
                        {announcements.filter(a => a.is_active).length > 0 ? (
                            <div className="flex items-center gap-2">
                                <span className="text-lg">📢</span>
                                <div className="overflow-hidden">
                                    <div className="whitespace-nowrap animate-marquee">
                                        {announcements.filter(a => a.is_active).map((a, i, arr) => (
                                            <span key={a.id} className="inline-block mr-12">
                                                {a.text}{i < arr.length - 1 ? ' • ' : ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-sm">Selamat Datang di Sistem Antrian Bagi Raport</div>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-xs ml-4">
                        <span>Selesai: <strong className="text-lg">{stats.totals.finished}</strong></span>
                        <span>{onlineClasses.length > 0 ? '🟢' : '⚪'} {onlineClasses.length} Guru</span>
                    </div>
                </div>
            </footer>

            {/* Overlays */}
            {callOverlay && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="text-center p-10 bg-blue-600 rounded-2xl max-w-3xl border-4 border-yellow-400">
                        <Volume2 className="w-20 h-20 mx-auto text-white mb-4" />
                        <h2 className="text-3xl font-bold mb-4 text-yellow-300">🔔 PANGGILAN UNTUK WALI SISWA</h2>
                        <p className="text-5xl font-bold mb-3 text-white">{callOverlay.name}</p>
                        <p className="text-2xl font-semibold mb-4 text-blue-200">KELAS {callOverlay.class}</p>
                        <p className="text-xl text-white">Silakan menuju ruang kelas sekarang</p>
                    </div>
                </div>
            )}

            {announcementOverlay && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="text-center p-10 bg-orange-600 rounded-2xl max-w-3xl border-4 border-yellow-400">
                        <Megaphone className="w-20 h-20 mx-auto text-white mb-4" />
                        <h2 className="text-3xl font-bold mb-4 text-yellow-300">📢 PENGUMUMAN PENTING</h2>
                        <p className="text-2xl text-white">{announcementOverlay.text}</p>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
            `}</style>
        </div>
    )
}
