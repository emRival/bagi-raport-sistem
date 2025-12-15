import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useAnnouncements } from '../../context/AnnouncementsContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { socketService } from '../../services/socket.js'
import { queueApi } from '../../services/api.js'
import { Volume2, Megaphone, VolumeX, Wifi, WifiOff, GraduationCap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui-new/card'
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
    const [schoolLogo, setSchoolLogo] = useState('')
    const [schoolName, setSchoolName] = useState('Sistem Antrian Bagi Raport')
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
                    const preferredVoice = voices.find(v =>
                        v.lang.startsWith('id') &&
                        (v.name.toLowerCase().includes('male') ||
                            v.name.toLowerCase().includes('rizki') ||
                            v.name.toLowerCase().includes('standard-b'))
                    ) || voices.find(v => v.lang.startsWith('id')) || voices[0]

                    if (preferredVoice) utterance.voice = preferredVoice
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
            setOnlineClasses(prev => {
                if (data.status === 'online') return Array.from(new Set([...prev, data.className]))
                else return prev.filter(c => c !== data.className)
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

    // Mouse hide for fullscreen
    useEffect(() => {
        let timeout
        const handleMouseMove = () => {
            document.body.style.cursor = 'default'
            clearTimeout(timeout)
            timeout = setTimeout(() => {
                document.body.style.cursor = 'none'
            }, 3000)
        }

        document.addEventListener('mousemove', handleMouseMove)
        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            clearTimeout(timeout)
            document.body.style.cursor = 'default'
        }
    }, [])

    const formatTime = (date) => {
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    const formatDate = (date) => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        return date.toLocaleDateString('id-ID', options)
    }

    return (
        <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex flex-col">
            {/* Header */}
            <header className="bg-white/90 backdrop-blur-sm shadow-md border-b border-slate-200">
                <div className="flex items-center justify-between px-6 py-3">
                    {/* Logo & Title */}
                    <div className="flex items-center gap-4">
                        {schoolLogo ? (
                            <img src={schoolLogo} alt="Logo" className="h-12 w-12 object-contain" />
                        ) : (
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <GraduationCap className="w-7 h-7 text-white" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">{schoolName}</h1>
                            <p className="text-sm text-slate-600">Sistem Antrian Raport</p>
                        </div>
                    </div>

                    {/* Stats & Controls */}
                    <div className="flex items-center gap-4">
                        {/* Stats */}
                        <div className="flex items-center gap-4">
                            <div className="text-center px-4 py-2 bg-orange-100 rounded-xl">
                                <div className="text-2xl font-bold text-orange-700">{stats.totals.waiting}</div>
                                <div className="text-xs text-orange-600 font-medium">Menunggu</div>
                            </div>
                            <div className="text-center px-4 py-2 bg-green-100 rounded-xl">
                                <div className="text-2xl font-bold text-green-700">{stats.totals.finished}</div>
                                <div className="text-xs text-green-600 font-medium">Selesai</div>
                            </div>
                        </div>

                        {/* Connection */}
                        <Badge className={connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {connected ? <Wifi className="w-3.5 h-3.5 mr-1" /> : <WifiOff className="w-3.5 h-3.5 mr-1" />}
                            {connected ? 'Online' : 'Offline'}
                        </Badge>

                        {/* Sound Toggle */}
                        <Button
                            onClick={() => soundEnabled ? setSoundEnabled(false) : enableSound()}
                            size="sm"
                            variant={soundEnabled ? 'default' : 'outline'}
                            icon={soundEnabled ? Volume2 : VolumeX}
                        >
                            {soundEnabled ? 'Suara ON' : 'Suara OFF'}
                        </Button>

                        {/* Time */}
                        <div className="text-right">
                            <div className="text-lg font-bold text-slate-900">{formatTime(currentTime)}</div>
                            <div className="text-xs text-slate-600">{formatDate(currentTime)}</div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-5 gap-3 auto-rows-min">
                    {stats.byClass.slice(0, 10).map((classData) => {
                        const isOnline = onlineClasses.includes(classData.class)
                        const activeCall = activeCalls[classData.class]
                        const hasActiveCall = Boolean(activeCall)

                        return (
                            <Card
                                key={classData.class}
                                className={`${hasActiveCall ? 'ring-2 ring-blue-500 bg-blue-50 animate-pulse' : 'bg-white'} shadow-md border-slate-200`}
                            >
                                <CardContent className="p-4">
                                    {/* Class Name */}
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-lg font-bold text-slate-900">{classData.class}</h3>
                                        {isOnline && (
                                            <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5">
                                                Online
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-orange-50 rounded-lg p-2 text-center border border-orange-200">
                                            <div className="text-xl font-bold text-orange-700">{classData.waiting}</div>
                                            <div className="text-[10px] text-orange-600 font-medium">Menunggu</div>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-2 text-center border border-green-200">
                                            <div className="text-xl font-bold text-green-700">{classData.finished}</div>
                                            <div className="text-[10px] text-green-600 font-medium">Selesai</div>
                                        </div>
                                    </div>

                                    {/* Active Call */}
                                    {hasActiveCall && (
                                        <div className="mt-3 bg-blue-100 rounded-lg p-2 border border-blue-300">
                                            <div className="flex items-center gap-1 text-blue-700 mb-1">
                                                <Volume2 className="w-3 h-3" />
                                                <span className="text-[10px] font-bold">DIPANGGIL</span>
                                            </div>
                                            <div className="text-xs font-semibold text-blue-900 truncate">{activeCall}</div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </main>

            {/* Ticker */}
            {announcements.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 py-2 overflow-hidden">
                    <div className="flex items-center gap-2 animate-marquee whitespace-nowrap">
                        <Megaphone className="w-4 h-4 text-white flex-shrink-0" />
                        {announcements.map((ann, index) => (
                            <span key={ann.id} className="text-white font-medium text-sm">
                                {ann.text}
                                {index < announcements.length - 1 && <span className="mx-12 text-white/60">•</span>}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Call Overlay */}
            {callOverlay && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                    <Card className="bg-white shadow-2xl border-4 border-blue-500 max-w-4xl w-full mx-8">
                        <CardContent className="p-12 text-center">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-100 mb-6 animate-bounce">
                                <Volume2 className="w-12 h-12 text-blue-600" />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">PANGGILAN UNTUK</h2>
                            <div className="text-6xl font-extrabold text-blue-600 mb-4">{callOverlay.name}</div>
                            <div className="text-2xl font-semibold text-slate-700 mb-6">Kelas {callOverlay.class}</div>
                            <div className="text-lg text-slate-600">Silakan menuju ruang kelas sekarang</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Announcement Overlay */}
            {announcementOverlay && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                    <Card className="bg-white shadow-2xl border-4 border-purple-500 max-w-4xl w-full mx-8">
                        <CardContent className="p-12 text-center">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-purple-100 mb-6 animate-pulse">
                                <Megaphone className="w-12 h-12 text-purple-600" />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-6">PENGUMUMAN PENTING</h2>
                            <div className="text-2xl font-semibold text-purple-700">{announcementOverlay.text}</div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
