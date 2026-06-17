import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { GraduationCap, Clock, Users, BellRing, CheckCircle2, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'

// Use a clean URL without /api for the socket connection
const SOCKET_URL = import.meta.env.PROD ? window.location.origin : 'http://localhost:3001'

export default function TrackQueue() {
    const { id } = useParams()
    const [searchParams, setSearchParams] = useSearchParams()
    
    const [nisInput, setNisInput] = useState(searchParams.get('nis') || '')
    const [queueData, setQueueData] = useState(null)
    const [schoolInfo, setSchoolInfo] = useState({ name: 'Sistem Antrian', logo: '' })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [socketConnected, setSocketConnected] = useState(false)

    useEffect(() => {
        fetch('/api/settings?_t=' + Date.now())
            .then(res => res.json())
            .then(data => {
                setSchoolInfo({
                    name: data.schoolName || 'Sistem Antrian',
                    logo: data.schoolLogo || ''
                })
            })
            .catch(console.error)
    }, [])

    const fetchQueueStatus = async (queueId, nis) => {
        setLoading(true)
        setError(null)
        try {
            let url = `/api/queue/public/track?`
            if (queueId) url += `id=${queueId}`
            else if (nis) url += `nis=${nis}`
            else {
                setLoading(false)
                return
            }

            const res = await fetch(url)
            if (!res.ok) throw new Error('Antrian tidak ditemukan. Periksa kembali NIS atau pastikan sudah check-in.')
            const data = await res.json()
            setQueueData(data)
        } catch (err) {
            setError(err.message)
            setQueueData(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (id || nisInput) {
            fetchQueueStatus(id, nisInput)
        } else {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        if (!queueData) return

        const socket = io(SOCKET_URL, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        })

        socket.on('connect', () => setSocketConnected(true))
        socket.on('disconnect', () => setSocketConnected(false))

        socket.on('queue-updated', () => {
            fetchQueueStatus(id, nisInput)
        })

        return () => socket.disconnect()
    }, [queueData?.id])

    const handleSearch = (e) => {
        e.preventDefault()
        if (nisInput.trim()) {
            setSearchParams({ nis: nisInput.trim() })
            fetchQueueStatus(null, nisInput.trim())
        }
    }

    if (loading && !queueData) {
        return (
            <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-6 selection:bg-blue-200">
                <div className="w-8 h-8 rounded-full border-[3px] border-slate-200 border-t-slate-800 animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center p-4 sm:p-8 pb-24 selection:bg-blue-200">
            {/* Minimalist Header */}
            <header className="w-full max-w-lg flex flex-col items-center mb-10 mt-4 sm:mt-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both">
                {schoolInfo.logo ? (
                    <img src={schoolInfo.logo} alt="" className="w-16 h-16 object-contain mb-5" />
                ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm mb-5">
                        <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                )}
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight text-center">{schoolInfo.name}</h1>
                <p className="text-sm text-slate-500 mt-1">Live Tracking Antrian</p>
            </header>

            <main className="w-full max-w-lg">
                {!queueData ? (
                    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 ease-out fill-mode-both">
                        <div className="text-center mb-8">
                            <h2 className="text-lg font-medium text-slate-900 mb-2">Cek Status</h2>
                            <p className="text-sm text-slate-500 leading-relaxed">Masukkan Nomor Induk Siswa (NIS) untuk melihat posisi antrian secara real-time.</p>
                        </div>
                        
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div className="space-y-1.5">
                                <label htmlFor="nis" className="text-xs font-medium text-slate-700 ml-1">NIS Siswa</label>
                                <input
                                    id="nis"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Contoh: 10123"
                                    className="w-full p-4 rounded-2xl bg-slate-50 border-0 focus:ring-2 focus:ring-slate-900 text-lg font-medium transition-shadow outline-none placeholder:text-slate-400 text-center"
                                    value={nisInput}
                                    onChange={(e) => setNisInput(e.target.value)}
                                />
                            </div>
                            
                            {error && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-medium text-center">
                                    {error}
                                </div>
                            )}
                            
                            <button
                                type="submit"
                                disabled={loading || !nisInput.trim()}
                                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-medium text-base transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {loading ? 'Mencari...' : 'Cari Antrian'}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-both">
                        
                        {/* Dynamic Status Banner */}
                        <div className={cn(
                            "px-5 py-4 rounded-3xl flex items-center justify-center gap-3 transition-colors duration-500 border",
                            queueData.status === 'WAITING' ? "bg-amber-50 text-amber-900 border-amber-200/50" :
                            queueData.status === 'CALLED' ? "bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-600/20" :
                            "bg-emerald-50 text-emerald-900 border-emerald-200/50"
                        )}>
                            {queueData.status === 'WAITING' && <Clock className="w-5 h-5" />}
                            {queueData.status === 'CALLED' && <BellRing className="w-5 h-5 animate-[ring_2s_ease-in-out_infinite]" />}
                            {queueData.status === 'FINISHED' && <CheckCircle2 className="w-5 h-5" />}
                            <span className="font-medium tracking-wide">
                                {queueData.status === 'WAITING' ? 'Dalam Antrian' :
                                 queueData.status === 'CALLED' ? 'Menuju Ruang Kelas' :
                                 'Selesai'}
                            </span>
                        </div>

                        {/* Bento Grid Layout */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Primary Number Card */}
                            <div className="col-span-2 bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
                                {/* Subtle mesh background hint */}
                                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-transparent to-transparent"></div>
                                
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-2 z-10">Nomor Anda</p>
                                <div className="text-8xl font-light text-slate-900 tracking-tighter z-10 mb-4 tabular-nums">
                                    {queueData.queue_number}
                                </div>
                                <div className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm font-medium z-10">
                                    Kelas {queueData.class}
                                </div>
                            </div>

                            {/* Identity Card */}
                            <div className="col-span-2 sm:col-span-1 bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500 mb-1">Siswa</p>
                                    <p className="text-lg font-medium text-slate-900 leading-tight">{queueData.name}</p>
                                </div>
                                <div className="mt-6 pt-4 border-t border-slate-50">
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Waktu Tiba</p>
                                    <p className="text-sm font-medium text-slate-700">
                                        {new Date(queueData.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>

                            {/* Dynamic Context Card (Queue Info) */}
                            {queueData.status === 'WAITING' && (
                                <div className="col-span-2 sm:col-span-1 bg-slate-900 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col justify-between relative overflow-hidden text-white">
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 mb-1">Sisa Antrian</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-light tabular-nums">{queueData.peopleAhead}</span>
                                            <span className="text-sm text-slate-400 font-medium">orang</span>
                                        </div>
                                    </div>
                                    <Users className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-800 opacity-50" />
                                </div>
                            )}

                            {queueData.status === 'CALLED' && (
                                <div className="col-span-2 sm:col-span-1 bg-blue-50 rounded-3xl p-6 border border-blue-100 flex flex-col justify-center">
                                    <p className="text-sm font-medium text-blue-900 leading-relaxed">
                                        Silakan masuk ke kelas. Guru wali kelas sedang menunggu.
                                    </p>
                                </div>
                            )}
                            
                            {queueData.status === 'FINISHED' && (
                                <div className="col-span-2 sm:col-span-1 bg-emerald-50 rounded-3xl p-6 border border-emerald-100 flex flex-col justify-center">
                                    <p className="text-sm font-medium text-emerald-900 leading-relaxed">
                                        Proses pembagian raport telah selesai. Terima kasih atas kehadirannya.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Reset Action */}
                        <div className="text-center pt-8">
                            <button 
                                onClick={() => { setQueueData(null); setSearchParams({}); setNisInput('') }} 
                                className="text-sm font-medium text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                Cek siswa lain
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Connection Indicator - Minimalist */}
            {queueData && (
                <div className={cn(
                    "fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-medium backdrop-blur-md border transition-all duration-500",
                    socketConnected 
                        ? "bg-white/80 text-slate-500 border-slate-200/50 shadow-sm opacity-50 hover:opacity-100" 
                        : "bg-red-50 text-red-600 border-red-200 shadow-md"
                )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", socketConnected ? "bg-emerald-500" : "bg-red-500 animate-pulse")} />
                    {socketConnected ? 'Live' : 'Mencoba terhubung...'}
                </div>
            )}
        </div>
    )
}