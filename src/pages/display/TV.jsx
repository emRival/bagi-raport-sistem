import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useAnnouncements } from '../../context/AnnouncementsContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { socketService } from '../../services/socket.js'
import { queueApi } from '../../services/api.js'
import {
  Volume2, VolumeX, LogOut, GraduationCap,
  Megaphone, Wifi, WifiOff, CheckCircle2,
  PhoneCall, Bell, Clock
} from 'lucide-react'
import { Button } from '@/components/ui-new/button'
import { cn } from '@/lib/utils'

function getDisplayFontSize(name) {
  const len = name?.length || 0
  if (len <= 8) return 'text-6xl sm:text-7xl md:text-8xl lg:text-9xl'
  if (len <= 15) return 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl'
  if (len <= 22) return 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl'
  if (len <= 30) return 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl'
  return 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl'
}

export default function TV() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { announcements, refreshAnnouncements } = useAnnouncements()
  const { settings, refreshSettings } = useSettings()

  const [localSettings, setLocalSettings] = useState(settings)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [connected, setConnected] = useState(false)
  const [stats, setStats] = useState({ byClass: [], totals: { waiting: 0, finished: 0, total: 0 } })
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeCalls, setActiveCalls] = useState({})
  const [onlineClasses, setOnlineClasses] = useState([])

  const [overlay, setOverlay] = useState(null)

  const [ttsQueue, setTtsQueue] = useState([])
  const [isSpeaking, setIsSpeaking] = useState(false)

  const soundEnabledRef = useRef(soundEnabled)
  const isSpeakingRef = useRef(isSpeaking)
  const ttsQueueRef = useRef(ttsQueue)
  const settingsRef = useRef(settings)

  useEffect(() => {
    setLocalSettings(settings)
    settingsRef.current = settings
  }, [settings])

  useEffect(() => { soundEnabledRef.current = soundEnabled }, [soundEnabled])
  useEffect(() => { isSpeakingRef.current = isSpeaking }, [isSpeaking])
  useEffect(() => { ttsQueueRef.current = ttsQueue }, [ttsQueue])

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

  useEffect(() => {
    refreshAnnouncements()
    refreshSettings()
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
    const u = new SpeechSynthesisUtterance('Suara diaktifkan')
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
  const activeAnnouncements = announcements.filter(a => a.is_active)

  return (
    <div className="min-h-[100dvh] bg-zinc-950 flex flex-col overflow-hidden font-sans text-zinc-100 selection:bg-amber-500/30">
      {/* ── HEADER ── */}
      <header className="relative z-20 px-6 lg:px-10 py-4 lg:py-5 flex items-center justify-between bg-zinc-900/90 border-b border-zinc-800/60 backdrop-blur-md">
        <div className="flex items-center gap-4 lg:gap-6">
          {schoolLogo ? (
            <div className="w-12 h-12 lg:w-14 lg:h-14 bg-zinc-900 p-1 rounded-2xl border border-zinc-700/50 flex items-center justify-center shrink-0">
              <img src={schoolLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-zinc-800 flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6 lg:w-7 lg:h-7 text-zinc-400" />
            </div>
          )}
          <div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-zinc-50 leading-none mb-0.5">
              ANTRIAN RAPORT
            </h1>
            <p className="text-xs lg:text-sm font-semibold text-zinc-500 leading-none">
              {schoolName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 lg:gap-6">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className={cn(
              'flex items-center gap-2 px-3 lg:px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300',
              connected
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
            )}>
              {connected ? (
                <><Wifi className="w-3.5 h-3.5" /> Terhubung</>
              ) : (
                <><WifiOff className="w-3.5 h-3.5" /> Putus</>
              )}
            </div>

            <button
              onClick={soundEnabled ? () => setSoundEnabled(false) : enableSound}
              className={cn(
                'flex items-center gap-2 px-3 lg:px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border transition-all duration-300',
                soundEnabled
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                  : 'bg-zinc-800/50 text-zinc-500 border-zinc-700/50 hover:bg-zinc-800'
              )}
            >
              {soundEnabled ? (
                <><Volume2 className="w-3.5 h-3.5" /> Suara ON</>
              ) : (
                <><VolumeX className="w-3.5 h-3.5" /> Suara OFF</>
              )}
            </button>

            <button
              onClick={() => { logout(); navigate('/login') }}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-10 bg-zinc-800 hidden sm:block" />

          <div className="text-right hidden sm:block">
            <div className="text-2xl lg:text-3xl font-black tabular-nums text-zinc-50 tracking-tighter leading-none">
              {formatTime(currentTime)}
            </div>
            <div className="text-[10px] lg:text-xs font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
              {formatDate(currentTime)}
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="relative z-10 flex-1 p-4 lg:p-6 xl:p-8 overflow-hidden flex flex-col">
        {classData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <GraduationCap className="w-16 h-16 text-zinc-700 mx-auto" />
              <p className="text-zinc-500 font-semibold text-lg">Belum ada kelas dikonfigurasi</p>
              <p className="text-zinc-700 text-sm">Atur kelas di menu Pengaturan</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4 xl:gap-5 auto-rows-max content-start">
            {classData.map((cls, idx) => {
              const isOnline = onlineClasses.includes(cls.id)
              const activeStudent = activeCalls[cls.id]
              const isActiveCall = !!activeStudent

              return (
                <div
                  key={cls.id}
                  className={cn(
                    'relative group rounded-2xl lg:rounded-3xl border transition-all duration-500 ease-out overflow-hidden',
                    'flex flex-col min-h-[160px] lg:min-h-[200px] xl:min-h-[220px]',
                    isActiveCall
                      ? 'bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-zinc-900 border-amber-500/40 scale-[1.02] lg:scale-[1.03] z-10 shadow-[0_0_40px_-8px_rgba(245,158,11,0.3)]'
                      : isOnline
                        ? 'bg-zinc-900/70 border-zinc-700/50 hover:border-zinc-600/50 shadow-sm'
                        : 'bg-zinc-900/40 border-zinc-800/30 opacity-50 grayscale-[0.6]'
                  )}
                >
                  {/* Online bar */}
                  {isActiveCall && (
                    <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
                  )}
                  {!isActiveCall && isOnline && (
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-emerald-500/40" />
                  )}

                  <div className="p-4 lg:p-5 xl:p-6 flex flex-col h-full relative z-10">
                    <div className="flex items-center justify-between mb-3 lg:mb-4">
                      <span className={cn(
                        'text-xs lg:text-sm font-bold tracking-wider uppercase',
                        isActiveCall ? 'text-amber-300' : 'text-zinc-400'
                      )}>
                        {cls.name}
                      </span>
                      <span className={cn(
                        'w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full shadow-sm transition-all duration-500',
                        isActiveCall
                          ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                          : isOnline
                            ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.3)]'
                            : 'bg-zinc-600'
                      )} />
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                      {isActiveCall ? (
                        <div className="text-center space-y-1.5">
                          <span className="inline-block text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-amber-400/80 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                            Dipanggil
                          </span>
                          <p className="text-lg lg:text-xl xl:text-2xl font-black leading-tight text-amber-50 break-words line-clamp-2">
                            {activeStudent}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl lg:text-5xl xl:text-6xl font-black tracking-tighter tabular-nums leading-none text-zinc-50 transition-all duration-300">
                            {cls.waiting}
                          </span>
                          <span className="text-[10px] lg:text-xs font-bold text-zinc-500 uppercase tracking-widest">
                            Antri
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 lg:mt-3 pt-3 lg:pt-3 border-t border-zinc-800/50 flex items-center gap-1.5">
                      <CheckCircle2 className={cn(
                        'w-3 h-3 lg:w-3.5 lg:h-3.5',
                        isActiveCall ? 'text-amber-400/60' : 'text-zinc-600'
                      )} />
                      <span className={cn(
                        'text-[10px] lg:text-xs font-bold tracking-wider',
                        isActiveCall ? 'text-amber-400/60' : 'text-zinc-600'
                      )}>
                        {cls.finished} Selesai
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ── ANNOUNCEMENT TICKER ── */}
      {activeAnnouncements.length > 0 && (
        <div className="relative z-20 border-t border-zinc-800/60 bg-zinc-900/90 backdrop-blur-md overflow-hidden h-12 lg:h-14 flex items-center">
          <div className="flex items-center h-full w-full">
            <div className="flex items-center gap-2 bg-amber-500/10 text-amber-400 px-4 lg:px-5 h-full z-10 font-black tracking-widest text-[10px] lg:text-xs uppercase shrink-0 border-r border-zinc-800/60">
              <Megaphone className="w-4 h-4" />
              INFO
            </div>
            <div className="flex-1 overflow-hidden relative">
              <div className="whitespace-nowrap animate-tv-marquee inline-block pl-[100%] will-change-transform">
                {activeAnnouncements.map((a, i) => (
                  <span key={a.id} className="inline-flex items-center mx-6 lg:mx-8 text-sm lg:text-base text-zinc-300 font-semibold tracking-tight">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50 mr-2.5 shrink-0" />
                    {a.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CALL OVERLAY ── */}
      {overlay && overlay.type === 'call' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 md:p-12 bg-zinc-950/90 backdrop-blur-2xl tv-overlay-enter">
          <div className="w-full max-w-[90vw] lg:max-w-[80vw] max-h-[90vh] rounded-3xl lg:rounded-[3rem] p-6 sm:p-10 lg:p-16 flex flex-col items-center justify-center text-center relative overflow-y-auto bg-zinc-900 border border-zinc-700/50 shadow-[0_40px_100px_rgba(0,0,0,0.5)] tv-content-enter">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

            <div className="space-y-5 sm:space-y-8 lg:space-y-10 w-full flex flex-col items-center">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.15)] tv-bell-ring">
                <PhoneCall className="w-6 h-6 sm:w-9 sm:h-9 lg:w-10 lg:h-10" />
              </div>

              <div className="space-y-2">
                <p className="text-xs sm:text-sm lg:text-base font-black text-zinc-500 uppercase tracking-[0.25em]">
                  Panggilan Ke Ruang
                </p>
                <span className="inline-block text-sm sm:text-lg lg:text-xl font-black text-amber-400 uppercase tracking-[0.15em] bg-amber-500/10 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full border border-amber-500/20">
                  {overlay.class}
                </span>
              </div>

              <p className={cn(
                'font-black tracking-tighter leading-[1.1] text-zinc-50 drop-shadow-sm break-words max-w-full',
                getDisplayFontSize(overlay.name)
              )}>
                {overlay.name}
              </p>

              <p className="text-sm sm:text-lg lg:text-xl text-amber-400 font-bold tracking-wide bg-amber-500/10 py-2 sm:py-3 px-5 sm:px-8 lg:px-10 rounded-full border border-amber-500/20 inline-flex items-center gap-2">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                Segera Menuju Ruang Kelas
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── ANNOUNCEMENT OVERLAY ── */}
      {overlay && overlay.type === 'announcement' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 md:p-12 bg-zinc-950/90 backdrop-blur-2xl tv-overlay-enter">
          <div className="w-full max-w-[90vw] lg:max-w-[80vw] max-h-[90vh] rounded-3xl lg:rounded-[3rem] p-6 sm:p-10 lg:p-16 flex flex-col items-center justify-center text-center bg-zinc-900 border border-zinc-700/50 shadow-[0_40px_100px_rgba(0,0,0,0.5)] tv-content-enter">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

            <div className="space-y-6 sm:space-y-8 lg:space-y-12 w-full flex flex-col items-center">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                <Megaphone className="w-6 h-6 sm:w-9 sm:h-9 lg:w-10 lg:h-10" />
              </div>

              <p className="text-xs sm:text-sm lg:text-base font-black text-zinc-500 uppercase tracking-[0.3em]">
                Pengumuman
              </p>

              <p className={cn(
                'font-black leading-tight tracking-tight text-zinc-50 max-w-4xl break-words',
                'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl'
              )}>
                {overlay.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── SOUND ACTIVATION ── */}
      {!soundEnabled && (
        <div
          onClick={enableSound}
          className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-[100] flex items-center justify-center cursor-pointer tv-overlay-enter"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 rounded-3xl lg:rounded-[2.5rem] p-8 sm:p-12 lg:p-14 max-w-md w-[90vw] text-center border border-zinc-700/50 shadow-2xl tv-content-enter"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-red-500/10 border-2 border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 lg:mb-8 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
              <VolumeX className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
            </div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-zinc-50 mb-2 tracking-tighter uppercase">
              Suara OFF
            </h3>
            <p className="text-zinc-500 mb-6 sm:mb-8 lg:mb-10 text-xs sm:text-sm lg:text-base font-bold uppercase tracking-widest">
              Klik tombol untuk mengaktifkan
            </p>
            <Button
              onClick={enableSound}
              className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 text-base sm:text-lg lg:text-xl py-4 sm:py-5 lg:py-6 font-black rounded-2xl lg:rounded-[1.5rem] transition-all duration-300 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40"
            >
              AKTIFKAN SUARA
            </Button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tv-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-tv-marquee {
          animation: tv-marquee 40s linear infinite;
        }

        @keyframes tv-overlay-enter {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes tv-content-enter {
          0% { opacity: 0; transform: scale(0.92) translateY(16px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes tv-bell-ring {
          0%, 100% { transform: rotate(0); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(-8deg); }
          20%, 40%, 60%, 80% { transform: rotate(8deg); }
        }

        .tv-overlay-enter { animation: tv-overlay-enter 0.3s ease-out; }
        .tv-content-enter { animation: tv-content-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .tv-bell-ring { animation: tv-bell-ring 1s ease-in-out; }

        @media (prefers-reduced-motion: reduce) {
          .animate-tv-marquee { animation: none; }
          .tv-overlay-enter { animation: none; }
          .tv-content-enter { animation: none; }
          .tv-bell-ring { animation: none; }
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
