import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useAnnouncements } from '../../context/AnnouncementsContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { socketService } from '../../services/socket.js'
import { queueApi } from '../../services/api.js'
import { Volume2, Megaphone, VolumeX, Wifi, WifiOff } from 'lucide-react'

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
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
            {/* Status */}
            <div className={`fixed top-3 left-3 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg z-50 ${connected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                {connected ? <><Wifi className="w-3.5 h-3.5 inline mr-1" />Online</> : <><WifiOff className="w-3.5 h-3.5 inline mr-1" />Offline</>}
            </div>

            {!soundEnabled ? (
                <button onClick={enableSound} className="fixed top-3 right-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg z-50 font-semibold text-sm animate-pulse">
                    <VolumeX className="w-4 h-4 inline mr-1" />Aktifkan Suara
                </button>
            ) : (
                <div className="fixed top-3 right-3 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg z-50">
                    <Volume2 className="w-3.5 h-3.5 inline mr-1" />Suara Aktif
                </div>
            )}

            {/* Header */}
            <header className="bg-white shadow-md border-b-4 border-blue-600 py-3 px-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {schoolLogo && schoolLogo.trim() !== '' ? (
                            <img src={schoolLogo} alt="Logo" className="w-12 h-12 object-contain" />
                        ) : (
                            <span className="text-3xl">🎓</span>
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">SISTEM ANTRIAN BAGI RAPORT</h1>
                            <p className="text-xs text-gray-600">{schoolName}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-600">{formatDate(currentTime)}</p>
                        <p className="text-xl font-bold text-gray-900">{formatTime(currentTime)}</p>
                    </div>
                </div>
            </header>

            {/* Grid 5 Columns */}
            <main className="max-w-[1800px] mx-auto p-4">
                <div className="grid grid-cols-5 gap-3">
                    {classData.map(cls => {
                        const isOnline = onlineClasses.includes(cls.id)
                        const activeStudent = activeCalls[cls.id]

                        return (
                            <div key={cls.id} className={`bg-white rounded-lg shadow-md border-2 ${activeStudent ? 'border-yellow-400 shadow-yellow-200' : isOnline ? 'border-green-400' : 'border-gray-300'}`}>
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h2 className="text-lg font-bold text-gray-900">{cls.name}</h2>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isOnline ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                                        </span>
                                    </div>

                                    <div className="mb-3 min-h-[60px] flex items-center justify-center">
                                        {activeStudent ? (
                                            <div className="text-center">
                                                <div className="mb-1 inline-flex items-center gap-1 bg-yellow-400 text-black px-2 py-1 rounded font-bold text-xs">
                                                    <Volume2 className="w-3 h-3" />DIPANGGIL
                                                </div>
                                                <div className="text-base font-bold text-gray-900 mt-1">{activeStudent}</div>
                                            </div>
                                        ) : (
                                            <div className="text-center text-gray-500 text-xs">{isOnline ? 'Menunggu Panggilan...' : 'Guru Belum Login'}</div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 rounded bg-orange-100 border border-orange-300">
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <span className="text-sm">⏳</span>
                                                <span className="text-[9px] text-orange-700 font-bold">MENUNGGU</span>
                                            </div>
                                            <div className="text-2xl font-bold text-orange-700 text-center">{cls.waiting}</div>
                                        </div>
                                        <div className="p-2 rounded bg-green-100 border border-green-300">
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <span className="text-sm">✓</span>
                                                <span className="text-[9px] text-green-700 font-bold">SELESAI</span>
                                            </div>
                                            <div className="text-2xl font-bold text-green-700 text-center">{cls.finished}</div>
                                        </div>
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
