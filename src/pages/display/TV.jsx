import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useAnnouncements } from '../../context/AnnouncementsContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { socketService } from '../../services/socket.js'
import { queueApi } from '../../services/api.js'
import { Volume2, Megaphone, VolumeX, Wifi, WifiOff, LogOut, GraduationCap, Clock as ClockIcon, CheckCircle2 } from 'lucide-react'
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
    const [overlay, setOverlay] = useState(null) 

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
    }, [settings])

    // Sync refs
    useEffect(() => { soundEnabledRef.current = soundEnabled }, [soundEnabled])
    useEffect(() => { isSpeakingRef.current = isSpeaking }, [isSpeaking])
    useEffect(() => { ttsQueueRef.current = ttsQueue }, [ttsQueue])

    // --- DATA FETCHING ---
    const fetchStats = async () => {
        try {
            const data = await queueApi.getStats()
            if (data) {
                setStats(data)
                if (data.onlineClasses && Array.isArray(data.onlineClasses)) {
                    setOnlineClasses(data.onlineClasses)
                }
            }
        } catch (error) {
            console.error('Fetch Stats Error:', error)
        }
    }

    // --- INITIALIZATION ---
    useEffect(() => {
        refreshAnnouncements()
        fetchStats()
        const interval = setInterval(fetchStats, 5000)
        const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000)

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
            socketService.register({ role: 'display' })
        }

        const handleDisconnect = () => setConnected(false)

        const handleTeacherStatus = (data) => {
            if (Array.isArray(data)) setOnlineClasses(data)
            else if (data && data.onlineClasses) setOnlineClasses(data.onlineClasses)
        }

        const handleCall = (data) => {
            setActiveCalls(prev => ({ ...prev, [data.className]: data.studentName }))
            fetchStats()

            if (soundEnabledRef.current) {
                const normalText = `Panggilan kepada wali siswa atas nama ${data.studentName}, kelas ${data.className}. Silakan menuju ruang kelas sekarang.`
                const repeatText = `Diulangi. Panggilan kepada wali siswa atas nama ${data.studentName}, kelas ${data.className}. Silakan menuju ruang kelas sekarang.`

                if (data.isRecall) {
                    addToQueue(repeatText, { type: 'call', name: data.studentName, class: data.className, isRepeat: true })
                } else {
                    addToQueue(normalText, { type: 'call', name: data.studentName, class: data.className })
                    setTimeout(() => {
                        addToQueue(repeatText, { type: 'call', name: data.studentName, class: data.className, isRepeat: true })
                    }, 100)
                }
            }
        }

        const handleFinished = (data) => {
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
            refreshAnnouncements()
            if (soundEnabledRef.current) {
                addToQueue(`Pengumuman penting. ${data.text}`, { type: 'announcement', text: data.text })
            }
        }

        const handleSettingsUpdate = (data) => {
            if (data && data.key && data.value !== undefined) {
                setLocalSettings(prev => {
                    const updated = { ...prev, [data.key]: data.value }
                    settingsRef.current = updated
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
    }, [refreshAnnouncements])

    // --- TTS LOGIC ---
    const addToQueue = (text, overlayData = null) => {
        setTtsQueue(prev => [...prev, { text, overlay: overlayData }])
    }

    const processQueue = useCallback(() => {
        if (isSpeakingRef.current || ttsQueueRef.current.length === 0) return

        const item = ttsQueueRef.current[0]
        setTtsQueue(prev => prev.slice(1))
        setIsSpeaking(true)
        isSpeakingRef.current = true 

        if (item.overlay) setOverlay(item.overlay)

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel()
            const currentSettings = settingsRef.current
            const utterance = new SpeechSynthesisUtterance(item.text)

            utterance.pitch = Number(currentSettings.ttsPitch || 1.0)
            utterance.rate = Number(currentSettings.ttsRate || 0.8)
            utterance.volume = Number(currentSettings.ttsVolume || 1.0)
            utterance.lang = 'id-ID'

            const voices = window.speechSynthesis.getVoices()
            const selectedVoice = voices.find(v => v.name === currentSettings.ttsVoice)
                || voices.find(v => v.lang.includes('id'))
                || voices[0]
            
            if (selectedVoice) utterance.voice = selectedVoice

            utterance.onend = () => {
                setTimeout(() => {
                    setOverlay(null)
                    setIsSpeaking(false)
                    isSpeakingRef.current = false
                }, 2000)
            }

            utterance.onerror = () => {
                setOverlay(null)
                setIsSpeaking(false)
                isSpeakingRef.current = false
            }

            setTimeout(() => window.speechSynthesis.speak(utterance), 100)
        } else {
            setTimeout(() => {
                setOverlay(null)
                setIsSpeaking(false)
                isSpeakingRef.current = false
            }, 5000)
        }
    }, [])

    useEffect(() => {
        if (ttsQueue.length > 0 && !isSpeaking) {
            processQueue()
        }
    }, [ttsQueue, isSpeaking, processQueue])

    const enableSound = () => {
        setSoundEnabled(true)
        const u = new SpeechSynthesisUtterance("Suara diaktifkan")
        u.lang = 'id-ID'
        window.speechSynthesis.speak(u)
    }

    const formatTime = (date) => date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const formatDate = (date) => date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    const classesList = localSettings?.classes || []
    const classData = classesList.map(cls => {
        const s = stats.byClass.find(i => i.class === cls) || { waiting: 0, finished: 0 }
        return { id: cls, name: `Kelas ${cls}`, waiting: s.waiting, finished: s.finished }
    })

    const schoolLogo = localSettings?.schoolLogo || ''
    const schoolName = localSettings?.schoolName || 'Sistem Antrian Bagi Raport'

    return (
        <div className="min-h-[100dvh] bg-slate-50 flex flex-col overflow-hidden font-sans text-slate-900 selection:bg-blue-100">
            {/* Header */}
            <header className="relative z-10 px-8 py-5 flex items-center justify-between border-b border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-5">
                    {schoolLogo ? (
                        <div className="w-16 h-16 bg-white p-1 rounded-2xl border border-slate-100 flex items-center justify-center">
                            <img src={schoolLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
                            <GraduationCap className="w-8 h-8 text-white" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none mb-1">ANTRIAN RAPORT</h1>
                        <p className="text-base font-bold text-slate-500">{schoolName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2 opacity-20 hover:opacity-100 transition-opacity">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={soundEnabled ? () => setSoundEnabled(false) : enableSound}
                            className={cn("h-10 font-bold", soundEnabled ? "text-emerald-600 border-emerald-200 bg-emerald-50" : "text-slate-400")}
                        >
                            {soundEnabled ? <Volume2 size={18} className="mr-2" /> : <VolumeX size={18} className="mr-2" />}
                            {soundEnabled ? 'SUARA ON' : 'SUARA OFF'}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { logout(); navigate('/login') }}>
                            <LogOut size={20} className="text-slate-400" />
                        </Button>
                    </div>

                    <div className="w-px h-12 bg-slate-200"></div>

                    <div className="text-right">
                        <div className="text-4xl font-black tabular-nums text-slate-900 tracking-tighter leading-none">
                            {formatTime(currentTime)}
                        </div>
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
                            {formatDate(currentTime)}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content - Class Bento Grid */}
            <main className="relative z-10 flex-1 p-8 overflow-hidden flex flex-col">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 h-full auto-rows-max content-start">
                    {classData.map(cls => {
                        const isOnline = onlineClasses.includes(cls.id)
                        const activeStudent = activeCalls[cls.id]
                        const isActiveCall = !!activeStudent

                        return (
                            <div
                                key={cls.id}
                                className={cn(
                                    "relative flex flex-col rounded-[2rem] border transition-all duration-500 ease-out overflow-hidden min-h-[180px]",
                                    isActiveCall
                                        ? "bg-blue-600 border-blue-500 shadow-[0_20px_50px_-12px_rgba(37,99,235,0.4)] scale-[1.03] z-20 text-white"
                                        : isOnline
                                            ? "bg-white border-slate-200 shadow-sm hover:border-blue-300"
                                            : "bg-slate-100/50 border-slate-200 opacity-60 grayscale-[0.5]"
                                )}
                            >
                                <div className="p-6 flex flex-col h-full relative z-10">
                                    <div className="flex items-center justify-between mb-4 border-b border-inherit pb-4 opacity-80">
                                        <div className="text-xl font-black tracking-tight uppercase">{cls.name}</div>
                                        <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", isActiveCall ? "bg-white animate-pulse" : isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                                    </div>

                                    <div className="flex-1 flex flex-col justify-center">
                                        {isActiveCall ? (
                                            <div className="animate-in fade-in zoom-in duration-300 text-center">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80 text-blue-100">Sedang Dipanggil</p>
                                                <p className="text-2xl font-black leading-tight line-clamp-2">{activeStudent}</p>
                                            </div>
                                        ) : (
                                            <div className="flex items-baseline gap-2">
                                                <div className="text-6xl font-black tracking-tighter tabular-nums leading-none text-slate-900">
                                                    {cls.waiting}
                                                </div>
                                                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Antri</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className={cn("h-2 w-full absolute bottom-0", isActiveCall ? "bg-white/20" : isOnline ? "bg-blue-500" : "bg-slate-300")} />
                            </div>
                        )
                    })}
                </div>
            </main>

            {/* Announcements Ticker */}
            {announcements.filter(a => a.is_active).length > 0 && (
                <div className="relative z-20 border-t border-slate-200 bg-white py-3 overflow-hidden shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] h-[60px] flex items-center">
                    <div className="flex items-center h-full">
                        <div className="flex items-center gap-3 bg-blue-600 text-white px-6 py-3 h-full z-20 font-black tracking-widest text-sm uppercase rounded-r-full shadow-lg">
                            <Megaphone className="w-5 h-5" />
                            INFO
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            <div className="whitespace-nowrap animate-marquee inline-block pl-[100%]">
                                {announcements.filter(a => a.is_active).map(a => (
                                    <span key={a.id} className="inline-flex items-center mx-8 text-xl text-slate-700 font-bold tracking-tight">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-3 shadow-sm"></span>
                                        {a.text}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Screen Call Overlay (Responsive & Auto-Resize) */}
            {overlay && overlay.type === 'call' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-white animate-in fade-in duration-300">
                    <div className="w-full h-full flex flex-col items-center justify-center text-center space-y-8">
                        <div className="inline-flex items-center justify-center p-8 bg-blue-50 text-blue-600 rounded-full animate-bounce-slow border-2 border-blue-100">
                            <Volume2 size={64} />
                        </div>
                        
                        <h2 className="text-4xl font-black text-slate-400 uppercase tracking-[0.3em]">
                            Panggilan Ke Ruang {overlay.class}
                        </h2>
                        
                        <div className={cn(
                            "font-black tracking-tighter leading-[1.1] text-slate-900 break-words w-full px-4",
                            overlay.name.length > 20 ? "text-7xl" : "text-[10rem]"
                        )}>
                            {overlay.name}
                        </div>
                        
                        <p className="text-4xl text-blue-600 font-black tracking-tight bg-blue-50 py-6 px-16 rounded-full inline-block border-2 border-blue-100">
                            Segera Menuju Ruang Kelas
                        </p>
                    </div>
                </div>
            )}

            {/* Announcement Overlay (Responsive & Auto-Resize) */}
            {overlay && overlay.type === 'announcement' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-12 bg-white animate-in fade-in duration-300">
                    <div className="w-full flex flex-col items-center justify-center text-center space-y-12">
                        <div className="inline-flex items-center justify-center p-10 bg-orange-50 text-orange-500 rounded-full border-2 border-orange-100">
                            <Megaphone size={80} className="animate-pulse" />
                        </div>
                        <h2 className="text-4xl font-black text-slate-400 uppercase tracking-[0.3em]">PENGUMUMAN</h2>
                        <div className={cn(
                            "font-black leading-tight tracking-tight text-slate-900 break-words w-full px-4",
                            overlay.text.length > 100 ? "text-4xl" : "text-7xl"
                        )}>
                            {overlay.text}
                        </div>
                    </div>
                </div>
            )}

            {/* Sound Activation Modal */}
            {!soundEnabled && (
                <div onClick={enableSound} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center cursor-pointer animate-in fade-in">
                    <div className="bg-white rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-16 max-w-xl w-[90vw] text-center shadow-2xl animate-bounce-slow border-b-8 border-blue-600">
                        <div className="w-20 h-20 sm:w-32 sm:h-32 bg-red-50 border-2 border-red-100 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-10 text-red-500 shadow-inner">
                            <VolumeX className="w-10 h-10 sm:w-16 sm:h-16" />
                        </div>
                        <h3 className="text-3xl sm:text-5xl font-black text-slate-900 mb-3 tracking-tighter uppercase">SUARA OFF</h3>
                        <p className="text-slate-500 mb-8 sm:mb-12 text-sm sm:text-xl font-bold uppercase tracking-widest">Klik Layar Untuk Mengaktifkan</p>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-lg sm:text-2xl py-6 sm:py-10 font-black shadow-2xl shadow-blue-600/30 rounded-[1.5rem] sm:rounded-[2rem]">
                            AKTIFKAN SEKARANG
                        </Button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
                .animate-marquee { animation: marquee 35s linear infinite; }
                @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
                .animate-bounce-slow { animation: bounce-slow 4s infinite ease-in-out; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    )
}
