import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useAnnouncements } from '../../context/AnnouncementsContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { socketService } from '../../services/socket.js'
import { queueApi } from '../../services/api.js'
import { Volume2, Megaphone, VolumeX, Wifi, WifiOff, LogOut, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui-new/button'
import { Badge } from '@/components/ui-new/badge'
import { cn } from '@/lib/utils'

export default function TV() {
    const navigate = useNavigate()
    const { logout } = useAuth()
    const { announcements, refreshAnnouncements } = useAnnouncements()
    const { settings, refreshSettings } = useSettings()

    // --- STATE ---
    const [localSettings, setLocalSettings] = useState(settings)
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
    const settingsRef = useRef(settings)

    // Sync local state when context/initial load happens
    useEffect(() => {
        setLocalSettings(settings)
        settingsRef.current = settings
        console.log('🔄 TV Initial Settings Loaded:', settings)
    }, [settings])

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
                const normalText = `Panggilan kepada wali siswa atas nama ${data.studentName}, kelas ${data.className}. Silakan menuju ruang kelas sekarang.`
                const repeatText = `Diulangi. Panggilan kepada wali siswa atas nama ${data.studentName}, kelas ${data.className}. Silakan menuju ruang kelas sekarang.`

                if (data.isRecall) {
                    // Recall button pressed - only play "diulangi" version once
                    addToQueue(repeatText, { type: 'call', name: data.studentName, class: data.className, isRepeat: true })
                } else {
                    // First call - play normal first, then "diulangi" version
                    addToQueue(normalText, { type: 'call', name: data.studentName, class: data.className })
                    // Add repeat version with slight delay identifier to prevent duplicate detection
                    setTimeout(() => {
                        addToQueue(repeatText, { type: 'call', name: data.studentName, class: data.className, isRepeat: true })
                    }, 100)
                }
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

        const handleSettingsUpdate = (data) => {
            console.log('📢 Incoming Socket Setting:', data)
            if (data && data.key && data.value !== undefined) {
                // Update local state to force re-render
                setLocalSettings(prev => {
                    const updated = { ...prev, [data.key]: data.value }
                    // Update Ref immediately for the TTS engine
                    settingsRef.current = updated
                    console.log(`⚡ TV Internal Sync: [${data.key}] is now [${data.value}]`)
                    return updated
                })
            }
        }

        socketService.on('connect', handleConnect)
        socketService.on('disconnect', handleDisconnect)
        socketService.on('online-status', handleTeacherStatus)
        socketService.on('student-called', handleCall)
        socketService.on('student-finished', handleFinished)
        socketService.on('announcement', handleAnnouncement)
        socketService.on('settings-updated', handleSettingsUpdate)

        return () => {
            socketService.off('connect', handleConnect)
            socketService.off('disconnect', handleDisconnect)
            socketService.off('online-status', handleTeacherStatus)
            socketService.off('student-called', handleCall)
            socketService.off('student-finished', handleFinished)
            socketService.off('announcement', handleAnnouncement)
            socketService.off('settings-updated', handleSettingsUpdate)
        }
    }, [refreshAnnouncements, refreshSettings])

    // --- DATA FETCHING ---
    const fetchStats = async () => {
        try {
            const data = await queueApi.getStats()
            if (data) {
                setStats(data)
                // Update onlineClasses from API to ensure state is correct on refresh
                if (data.onlineClasses && Array.isArray(data.onlineClasses) && data.onlineClasses.length > 0) {
                    setOnlineClasses(data.onlineClasses)
                }
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
        // Use Ref for consistency inside the function
        if (isSpeakingRef.current || ttsQueueRef.current.length === 0) return

        const item = ttsQueueRef.current[0]
        
        // Update state and ref immediately
        setTtsQueue(prev => prev.slice(1))
        setIsSpeaking(true)
        isSpeakingRef.current = true 

        // Show Overlay
        if (item.overlay) {
            setOverlay(item.overlay)
        }

        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel()

            // CRITICAL: Always read from Ref at the exact moment of speaking
            const currentSettings = settingsRef.current
            const utterance = new SpeechSynthesisUtterance(item.text)

            // Cast values to Number safely
            const pitch = Number(currentSettings.ttsPitch || 1.0)
            const rate = Number(currentSettings.ttsRate || 0.8)
            const volume = Number(currentSettings.ttsVolume || 1.0)

            utterance.lang = 'id-ID'
            utterance.pitch = pitch
            utterance.rate = rate
            utterance.volume = volume

            // Get available voices
            let voices = window.speechSynthesis.getVoices()
            
            // Selection logic
            let selectedVoice = voices.find(v => v.name === currentSettings.ttsVoice)
                || voices.find(v => v.lang.includes('id'))
                || voices[0]
            
            if (selectedVoice) {
                utterance.voice = selectedVoice
            }

            console.log(`🗣️ [TV] SPEAKING NOW: ${selectedVoice?.name} | P: ${pitch} | R: ${rate} | V: ${volume}`)

            utterance.onstart = () => {
                console.log('🏁 [TV] TTS Started')
            }

            utterance.onend = () => {
                console.log('✅ [TV] TTS Finished')
                setTimeout(() => {
                    setOverlay(null)
                    setIsSpeaking(false)
                    isSpeakingRef.current = false
                }, 2000)
            }

            utterance.onerror = (e) => {
                console.error('❌ [TV] TTS Error:', e)
                setOverlay(null)
                setIsSpeaking(false)
                isSpeakingRef.current = false
            }

            // Speak with a tiny delay to ensure cancel finished
            setTimeout(() => {
                window.speechSynthesis.speak(utterance)
            }, 100)
        } else {
            // Fallback if no TTS
            setTimeout(() => {
                setOverlay(null)
                setIsSpeaking(false)
                isSpeakingRef.current = false
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

    // Prepare Grid Data - use localSettings for real-time reactivity
    const classesList = localSettings?.classes || ['7A', '7B', '7C', '8A', '8B', '8C', '9A', '9B', '9C']
    const classData = classesList.map(cls => {
        const s = stats.byClass.find(i => i.class === cls) || { waiting: 0, finished: 0 }
        return { id: cls, name: `Kelas ${cls}`, waiting: s.waiting, finished: s.finished }
    })

    const schoolLogo = localSettings?.schoolLogo || ''
    const schoolName = localSettings?.schoolName || 'Sistem Antrian Bagi Raport'

    return (
        <div className="min-h-[100dvh] bg-slate-50 flex flex-col overflow-hidden font-sans text-slate-900 selection:bg-blue-100">
            {/* Header */}
            <header className="relative z-10 px-6 sm:px-10 py-5 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md shadow-sm">
                {/* Left: Identity */}
                <div className="flex items-center gap-4">
                    {schoolLogo ? (
                        <div className="w-16 h-16 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
                            <img src={schoolLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md border border-slate-100">
                            <GraduationCap className="w-8 h-8 text-white" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none mb-1 uppercase">ANTRIAN RAPORT</h1>
                        <p className="text-base font-semibold text-slate-500 tracking-wide">{schoolName}</p>
                    </div>
                </div>

                {/* Right: Controls & Time */}
                <div className="flex items-center gap-6">
                    {/* Controls (Hidden from public view, subtle on hover) */}
                    <div className="flex items-center gap-2 opacity-10 hover:opacity-100 transition-opacity duration-300">
                        <Button
                            size="sm"
                            variant={soundEnabled ? "default" : "outline"}
                            onClick={soundEnabled ? () => setSoundEnabled(false) : enableSound}
                            className={cn(
                                "h-10 px-4 rounded-xl font-bold tracking-wide transition-all shadow-sm",
                                soundEnabled 
                                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                            )}
                        >
                            {soundEnabled ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
                            {soundEnabled ? 'SUARA ON' : 'SUARA OFF'}
                        </Button>

                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                logout()
                                navigate('/login')
                            }}
                            className="h-10 w-10 p-0 rounded-xl bg-white text-red-500 hover:bg-red-50 border-red-100 shadow-sm"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="w-px h-12 bg-slate-200"></div>

                    {/* Clock */}
                    <div className="text-right">
                        <div className="text-4xl font-bold tabular-nums tracking-tight text-slate-800 leading-none">
                            {formatTime(currentTime)}
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {formatDate(currentTime)}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 p-6 sm:p-10 flex flex-col h-full overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 h-full auto-rows-max content-start">
                    {classData.map(cls => {
                        const isOnline = onlineClasses.includes(cls.id)
                        const activeStudent = activeCalls[cls.id]
                        const isActiveCall = !!activeStudent

                        return (
                            <div
                                key={cls.id}
                                className={cn(
                                    "relative flex flex-col rounded-3xl border transition-all duration-500 ease-out overflow-hidden min-h-[180px]",
                                    isActiveCall
                                        ? "bg-blue-600 border-blue-500 shadow-[0_20px_50px_-12px_rgba(37,99,235,0.5)] scale-[1.03] z-20"
                                        : isOnline
                                            ? "bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200"
                                            : "bg-slate-100 border-slate-200 opacity-60 grayscale-[0.3]"
                                )}
                            >
                                <div className="p-5 flex flex-col h-full relative z-10">
                                    <div className="flex items-center justify-between mb-4 border-b border-inherit pb-3 opacity-90">
                                        <div className={cn(
                                            "text-lg font-black tracking-tight",
                                            isActiveCall ? "text-white" : "text-slate-800"
                                        )}>
                                            {cls.name}
                                        </div>
                                        {/* Status Indicator */}
                                        <div className="flex items-center">
                                            <div className="relative flex h-3 w-3">
                                                {isOnline && !isActiveCall && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50"></span>}
                                                <span className={cn(
                                                    "relative inline-flex rounded-full h-3 w-3 shadow-sm",
                                                    isActiveCall ? "bg-white" : isOnline ? "bg-emerald-500" : "bg-slate-400"
                                                )}></span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col justify-center">
                                        {isActiveCall ? (
                                            <div className="animate-in fade-in zoom-in duration-300 text-center">
                                                <div className="inline-flex items-center justify-center p-3 bg-white/20 text-white rounded-full mb-3 animate-bounce">
                                                    <Volume2 className="w-8 h-8" />
                                                </div>
                                                <div className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1 drop-shadow-sm">Sedang Dipanggil</div>
                                                <div className="text-2xl font-black text-white leading-tight line-clamp-2 drop-shadow-md px-2">
                                                    {activeStudent}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={cn(
                                                "text-center space-y-2",
                                                !isOnline && "opacity-50"
                                            )}>
                                                {isOnline ? (
                                                    <div className="text-slate-400 text-sm font-medium">Menunggu Antrian...</div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-2">
                                                        <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-2 shadow-inner">
                                                            <WifiOff className="w-5 h-5 text-slate-500" />
                                                        </div>
                                                        <div className="text-slate-500 text-sm font-bold">Guru Offline</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 border-t border-inherit divide-x divide-inherit bg-slate-50/50">
                                    <div className={cn(
                                        "p-3 flex flex-col items-center justify-center transition-colors",
                                        isActiveCall ? "bg-blue-700/50 hover:bg-blue-700" : "hover:bg-orange-50/50"
                                    )}>
                                        <div className={cn("text-[10px] font-bold uppercase tracking-wider mb-0.5", isActiveCall ? "text-blue-200" : "text-orange-600")}>Menunggu</div>
                                        <div className={cn("text-2xl font-black tabular-nums", isActiveCall ? "text-white" : "text-slate-700")}>{cls.waiting}</div>
                                    </div>
                                    <div className={cn(
                                        "p-3 flex flex-col items-center justify-center transition-colors",
                                        isActiveCall ? "bg-blue-700/50 hover:bg-blue-700" : "hover:bg-emerald-50/50"
                                    )}>
                                        <div className={cn("text-[10px] font-bold uppercase tracking-wider mb-0.5", isActiveCall ? "text-blue-200" : "text-emerald-600")}>Selesai</div>
                                        <div className={cn("text-2xl font-black tabular-nums", isActiveCall ? "text-white" : "text-slate-700")}>{cls.finished}</div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </main>

            {/* Footer marquee */}
    return (
        <div className="min-h-[100dvh] bg-slate-50 flex flex-col overflow-hidden font-sans text-slate-900 selection:bg-blue-100">
            {/* Header */}
            <header className="relative z-10 px-6 sm:px-10 py-5 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md shadow-sm">
                {/* Left: Identity */}
                <div className="flex items-center gap-4">
                    {schoolLogo ? (
                        <div className="w-16 h-16 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
                            <img src={schoolLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md border border-slate-100">
                            <GraduationCap className="w-8 h-8 text-white" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none mb-1 uppercase">ANTRIAN RAPORT</h1>
                        <p className="text-base font-semibold text-slate-500 tracking-wide">{schoolName}</p>
                    </div>
                </div>

                {/* Right: Controls & Time */}
                <div className="flex items-center gap-6">
                    {/* Controls (Hidden from public view, subtle on hover) */}
                    <div className="flex items-center gap-2 opacity-10 hover:opacity-100 transition-opacity duration-300">
                        <Button
                            size="sm"
                            variant={soundEnabled ? "default" : "outline"}
                            onClick={soundEnabled ? () => setSoundEnabled(false) : enableSound}
                            className={cn(
                                "h-10 px-4 rounded-xl font-bold tracking-wide transition-all shadow-sm",
                                soundEnabled 
                                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                            )}
                        >
                            {soundEnabled ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
                            {soundEnabled ? 'SUARA ON' : 'SUARA OFF'}
                        </Button>

                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                logout()
                                navigate('/login')
                            }}
                            className="h-10 w-10 p-0 rounded-xl bg-white text-red-500 hover:bg-red-50 border-red-100 shadow-sm"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="w-px h-12 bg-slate-200"></div>

                    {/* Clock */}
                    <div className="text-right">
                        <div className="text-4xl font-bold tabular-nums tracking-tight text-slate-800 leading-none">
                            {formatTime(currentTime)}
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {formatDate(currentTime)}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 p-6 sm:p-10 flex flex-col h-full overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 h-full auto-rows-max content-start">
                    {classData.map(cls => {
                        const isOnline = onlineClasses.includes(cls.id)
                        const activeStudent = activeCalls[cls.id]
                        const isActiveCall = !!activeStudent

                        return (
                            <div
                                key={cls.id}
                                className={cn(
                                    "relative flex flex-col rounded-3xl border transition-all duration-500 ease-out overflow-hidden min-h-[180px]",
                                    isActiveCall
                                        ? "bg-blue-600 border-blue-500 shadow-[0_20px_50px_-12px_rgba(37,99,235,0.5)] scale-[1.03] z-20"
                                        : isOnline
                                            ? "bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200"
                                            : "bg-slate-100 border-slate-200 opacity-60 grayscale-[0.3]"
                                )}
                            >
                                <div className="p-5 flex flex-col h-full relative z-10">
                                    <div className="flex items-center justify-between mb-4 border-b border-inherit pb-3 opacity-90">
                                        <div className={cn(
                                            "text-lg font-black tracking-tight",
                                            isActiveCall ? "text-white" : "text-slate-800"
                                        )}>
                                            {cls.name}
                                        </div>
                                        {/* Status Indicator */}
                                        <div className="flex items-center">
                                            <div className="relative flex h-3 w-3">
                                                {isOnline && !isActiveCall && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50"></span>}
                                                <span className={cn(
                                                    "relative inline-flex rounded-full h-3 w-3 shadow-sm",
                                                    isActiveCall ? "bg-white" : isOnline ? "bg-emerald-500" : "bg-slate-400"
                                                )}></span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col justify-center">
                                        {isActiveCall ? (
                                            <div className="animate-in fade-in zoom-in duration-300">
                                                <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1.5 drop-shadow-sm">Sedang Dipanggil</p>
                                                <p className="text-2xl font-black text-white leading-tight line-clamp-2 drop-shadow-md">{activeStudent}</p>
                                            </div>
                                        ) : (
                                            <div className={cn(
                                                "flex items-baseline gap-2",
                                                !isOnline && "opacity-50"
                                            )}>
                                                <div className="text-6xl font-light tracking-tighter tabular-nums text-slate-800 leading-none">
                                                    {cls.waiting}
                                                </div>
                                                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest pb-1">
                                                    Antri
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Bottom Accent Line */}
                                <div className={cn(
                                    "h-2 w-full absolute bottom-0 transition-colors duration-500",
                                    isActiveCall ? "bg-white/30" : isOnline ? "bg-blue-500" : "bg-slate-300"
                                )}></div>
                            </div>
                        )
                    })}
                </div>
            </main>

            {/* Announcements Ticker */}
            {announcements.filter(a => a.is_active).length > 0 && (
                <div className="relative z-20 border-t border-slate-200 bg-white shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white z-10 pointer-events-none"></div>
                    <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white z-10 pointer-events-none"></div>
                    
                    <div className="flex items-center">
                        <div className="flex items-center gap-3 bg-blue-600 text-white px-8 py-5 z-20 font-black tracking-widest text-base shadow-xl uppercase">
                            <Megaphone className="w-6 h-6 animate-bounce-slow" />
                            INFORMASI
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            <div className="whitespace-nowrap animate-marquee inline-block">
                                {announcements.filter(a => a.is_active).map(a => (
                                    <span key={a.id} className="inline-flex items-center mx-16 text-2xl text-slate-700 font-semibold tracking-tight">
                                        <span className="w-3 h-3 rounded-full bg-blue-500 mr-5 shadow-sm"></span>
                                        {a.text}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cinematic Full Screen Overlay (Light/Clean version) */}
            {overlay && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-white/95 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className={cn(
                        "w-full max-w-6xl rounded-[3rem] p-20 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-[0_20px_100px_rgba(0,0,0,0.1)] animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 ease-out border-2",
                        overlay.type === 'call' 
                            ? "bg-white border-blue-100" 
                            : "bg-white border-orange-100"
                    )}>
                        
                        <div className="relative z-10 w-full">
                            {overlay.type === 'call' ? (
                                <div className="space-y-8">
                                    <div className="inline-flex items-center justify-center p-8 bg-blue-50 text-blue-600 rounded-full mb-6 shadow-inner animate-bounce-slow border border-blue-100">
                                        <Volume2 className="w-20 h-20" />
                                    </div>
                                    <h2 className="text-4xl font-bold text-slate-400 uppercase tracking-[0.2em]">
                                        Panggilan Ke Ruang {overlay.class}
                                    </h2>
                                    <div className="text-[7rem] font-black tracking-tighter leading-none text-slate-900 drop-shadow-sm py-4">
                                        {overlay.name}
                                    </div>
                                    <p className="text-3xl text-blue-600 font-bold tracking-tight mt-8 bg-blue-50 py-4 px-10 rounded-full inline-block border border-blue-100">
                                        Silakan menuju ke ruang kelas sekarang
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-10">
                                    <div className="inline-flex items-center justify-center p-8 bg-orange-50 text-orange-500 rounded-full mb-6 border border-orange-100">
                                        <Megaphone className="w-20 h-20 animate-pulse" />
                                    </div>
                                    <h2 className="text-3xl font-bold text-slate-400 uppercase tracking-[0.2em]">
                                        Pengumuman
                                    </h2>
                                    <div className="text-[5rem] font-black leading-tight tracking-tighter text-slate-900 max-w-5xl mx-auto drop-shadow-sm">
                                        {overlay.text}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Sound Activation Overlay */}
            {!soundEnabled && (
                <div
                    onClick={enableSound}
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center cursor-pointer animate-in fade-in duration-500 hover:bg-slate-900/70 transition-colors"
                >
                    <div className="bg-white rounded-3xl p-10 max-w-lg w-full mx-4 text-center shadow-2xl animate-bounce-slow">
                        <div className="w-24 h-24 bg-red-50 border border-red-100 rounded-full flex items-center justify-center mx-auto mb-8 text-red-500 shadow-inner">
                            <VolumeX className="w-12 h-12" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Suara Nonaktif</h3>
                        <p className="text-slate-500 mb-10 text-lg font-medium">
                            Klik di mana saja pada layar untuk mengaktifkan output suara.
                        </p>
                        <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-xl py-8 font-bold shadow-xl shadow-blue-600/20 rounded-2xl">
                            <Volume2 className="w-7 h-7 mr-3" />
                            Aktifkan Suara TV
                        </Button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 25s linear infinite;
                }
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s infinite ease-in-out;
                }
            `}</style>
        </div>
    )
}
