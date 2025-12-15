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

    // --- STATE ---
    const [soundEnabled, setSoundEnabled] = useState(false)
    const [connected, setConnected] = useState(false)
    const [stats, setStats] = useState({ byClass: [], totals: { waiting: 0, finished: 0, total: 0 } })
    const [currentTime, setCurrentTime] = useState(new Date())
    const [activeCalls, setActiveCalls] = useState({})
    const [onlineClasses, setOnlineClasses] = useState([])

    // Overlays
    const [overlay, setOverlay] = useState(null) // { type: 'call'|'announcement', data: ... }

    // TTS Queue
    const [ttsQueue, setTtsQueue] = useState([])
    const [isSpeaking, setIsSpeaking] = useState(false)

    // Refs for use inside callbacks
    const soundEnabledRef = useRef(soundEnabled)
    const isSpeakingRef = useRef(isSpeaking)
    const ttsQueueRef = useRef(ttsQueue)

    // Sync refs
    useEffect(() => { soundEnabledRef.current = soundEnabled }, [soundEnabled])
    useEffect(() => { isSpeakingRef.current = isSpeaking }, [isSpeaking])
    useEffect(() => { ttsQueueRef.current = ttsQueue }, [ttsQueue])

    // --- INITIALIZATION ---
    useEffect(() => {
        refreshAnnouncements()

        // Initial Fetch
        fetchStats()
        const interval = setInterval(fetchStats, 5000) // Faster polling (5s)
        const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000)

        // Socket Connection
        socketService.connect()
        socketService.register({ role: 'display' })

        return () => {
            clearInterval(interval)
            clearInterval(timeInterval)
            socketService.disconnect()
        }
    }, [])

    // --- SOCKET EVENT HANDLERS ---
    useEffect(() => {
        const handleConnect = () => {
            setConnected(true)
            console.log('TV Connected')
            socketService.register({ role: 'display' })
        }

        const handleDisconnect = () => {
            setConnected(false)
            console.log('TV Disconnected')
        }

        const handleTeacherStatus = (data) => {
            console.log('Online Status Update:', data)
            // Handle both array ['7A'] and object { onlineClasses: ['7A'] } formats
            if (Array.isArray(data)) {
                setOnlineClasses(data)
            } else if (data && data.onlineClasses) {
                setOnlineClasses(data.onlineClasses)
            } else if (data && data.status) {
                // Fallback for single updates
                setOnlineClasses(prev => {
                    if (data.status === 'online') return [...new Set([...prev, data.className])]
                    return prev.filter(c => c !== data.className)
                })
            }
        }

        const handleCall = (data) => {
            console.log('Student Called:', data)
            setActiveCalls(prev => ({ ...prev, [data.className]: data.studentName }))
            fetchStats()

            if (soundEnabledRef.current) {
                const text = `Panggilan untuk wali siswa ${data.studentName}, kelas ${data.className}. Silakan menuju ruang kelas sekarang.`
                addToQueue(text, { type: 'call', name: data.studentName, class: data.className })
            }
        }

        const handleFinished = (data) => {
            console.log('Student Finished:', data)
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
            console.log('Announcement:', data)
            refreshAnnouncements()
            if (soundEnabledRef.current) {
                const text = `Pengumuman penting. ${data.text}`
                addToQueue(text, { type: 'announcement', text: data.text })
            }
        }

        socketService.on('connect', handleConnect)
        socketService.on('disconnect', handleDisconnect)
        socketService.on('online-status', handleTeacherStatus)
        socketService.on('student-called', handleCall)
        socketService.on('student-finished', handleFinished)
        socketService.on('announcement-created', handleAnnouncement)

        return () => {
            socketService.off('connect', handleConnect)
            socketService.off('disconnect', handleDisconnect)
            socketService.off('online-status', handleTeacherStatus)
            socketService.off('student-called', handleCall)
            socketService.off('student-finished', handleFinished)
            socketService.off('announcement-created', handleAnnouncement)
        }
    }, [refreshAnnouncements])

    // --- DATA FETCHING ---
    const fetchStats = async () => {
        try {
            const data = await queueApi.getStats()
            if (data) {
                setStats(data)
                // Only update onlineClasses from API if it explicitly returns it
                // and we haven't received a socket update recently? 
                // For now, let's trust the socket for online status to avoid conflicts
                // if (data.onlineClasses) setOnlineClasses(data.onlineClasses)
            }
        } catch (error) {
            console.error('Fetch Stats Error:', error)
        }
    }

    // --- TTS LOGIC ---
    const addToQueue = (text, overlayData = null) => {
        // Prevent duplicates in queue
        setTtsQueue(prev => {
            const isDuplicate = prev.some(item => item.text === text)
            if (isDuplicate) return prev
            return [...prev, { text, overlay: overlayData }]
        })
    }

    const processQueue = () => {
        if (isSpeakingRef.current || ttsQueueRef.current.length === 0) return

        const item = ttsQueueRef.current[0]
        setTtsQueue(prev => prev.slice(1))
        setIsSpeaking(true)

        // Show Overlay
        if (item.overlay) {
            setOverlay(item.overlay)
        }

        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(item.text)
            utterance.lang = 'id-ID'
            utterance.rate = settings.ttsRate || 0.8
            utterance.pitch = settings.ttsPitch || 1.0

            // Voice selection logic
            const voices = speechSynthesis.getVoices()
            const maleVoice = voices.find(v => v.lang.includes('id') && v.name.toLowerCase().includes('male'))
                || voices.find(v => v.lang.includes('id'))
            if (maleVoice) utterance.voice = maleVoice

            utterance.onend = () => {
                setTimeout(() => {
                    setOverlay(null)
                    setIsSpeaking(false)
                }, 2000) // Keep overlay for 2s after speech ends
            }

            utterance.onerror = () => {
                setOverlay(null)
                setIsSpeaking(false)
            }

            speechSynthesis.speak(utterance)
        } else {
            // Fallback if no TTS
            setTimeout(() => {
                setOverlay(null)
                setIsSpeaking(false)
            }, 5000)
        }
    }

    useEffect(() => {
        if (ttsQueue.length > 0 && !isSpeaking) {
            processQueue()
        }
    }, [ttsQueue, isSpeaking])

    // --- RENDER HELPERS ---
    const formatTime = (date) => date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const formatDate = (date) => date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    const enableSound = () => {
        setSoundEnabled(true)
        localStorage.setItem('tv_sound_enabled', 'true')
        // Test sound
        const u = new SpeechSynthesisUtterance("Suara diaktifkan")
        u.lang = 'id-ID'
        speechSynthesis.speak(u)
    }

    // Prepare Grid Data
    const classesList = settings.classes || ['7A', '7B', '7C', '8A', '8B', '8C', '9A', '9B', '9C']
    const classData = classesList.map(cls => {
        const s = stats.byClass.find(i => i.class === cls) || { waiting: 0, finished: 0 }
        return { id: cls, name: `Kelas ${cls}`, waiting: s.waiting, finished: s.finished }
    })

    const schoolLogo = settings.schoolLogo || ''
    const schoolName = settings.schoolName || 'Sistem Antrian Bagi Raport'

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 shadow-sm z-10 sticky top-0">
                <div className="px-6 py-4 flex items-center justify-between gap-4">
                    {/* Left: Identity */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                        {schoolLogo ? (
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

                        <div className="h-10 w-px bg-slate-200"></div>

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

            {/* Main Content */}
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
                                {isActiveCall && (
                                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 animate-shimmer bg-[length:200%_100%]"></div>
                                )}

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

            {/* Footer marquee */}
            <footer className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white shadow-lg py-2 px-6 z-20">
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

            {/* Full Screen Overlays */}
            {overlay && overlay.type === 'call' && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 animate-in fade-in duration-300">
                    <div className="text-center p-12 bg-blue-600 rounded-3xl max-w-4xl w-full border-8 border-yellow-400 shadow-2xl animate-in zoom-in-50 duration-300">
                        <Volume2 className="w-32 h-32 mx-auto text-white mb-8 animate-bounce" />
                        <h2 className="text-4xl font-black mb-6 text-yellow-300 tracking-wider">🔔 PANGGILAN WALI SISWA</h2>
                        <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-sm border border-white/20">
                            <p className="text-6xl font-black mb-4 text-white drop-shadow-lg">{overlay.name}</p>
                            <p className="text-4xl font-bold text-blue-100">KELAS {overlay.class}</p>
                        </div>
                        <p className="text-2xl text-white mt-8 font-medium">Silakan menuju meja guru</p>
                    </div>
                </div>
            )}

            {overlay && overlay.type === 'announcement' && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 animate-in fade-in duration-300">
                    <div className="text-center p-12 bg-orange-600 rounded-3xl max-w-4xl w-full border-8 border-yellow-400 shadow-2xl animate-in zoom-in-50 duration-300">
                        <Megaphone className="w-32 h-32 mx-auto text-white mb-8 animate-bounce" />
                        <h2 className="text-4xl font-black mb-6 text-yellow-300 tracking-wider">📢 PENGUMUMAN</h2>
                        <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-sm border border-white/20">
                            <p className="text-4xl font-bold text-white leading-relaxed">{overlay.text}</p>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
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
