import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui-new/card'
import { Badge } from '@/components/ui-new/badge'
import { GraduationCap, Clock, Users, BellRing, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Use a clean URL without /api for the socket connection
const SOCKET_URL = import.meta.env.PROD ? window.location.origin : 'http://localhost:3001'

export default function TrackQueue() {
    const { id } = useParams() // Optional specific queue ID
    const [searchParams, setSearchParams] = useSearchParams()
    
    // We can search by NIS or Queue ID
    const [nisInput, setNisInput] = useState(searchParams.get('nis') || '')
    const [queueData, setQueueData] = useState(null)
    const [schoolInfo, setSchoolInfo] = useState({ name: 'Bagi Raport', logo: '' })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [socketConnected, setSocketConnected] = useState(false)

    // Fetch school info for branding
    useEffect(() => {
        fetch('/api/settings?_t=' + Date.now())
            .then(res => res.json())
            .then(data => {
                setSchoolInfo({
                    name: data.schoolName || 'Bagi Raport',
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
            if (!res.ok) throw new Error('Data antrian tidak ditemukan. Pastikan Anda sudah check-in.')
            const data = await res.json()
            setQueueData(data)
        } catch (err) {
            setError(err.message)
            setQueueData(null)
        } finally {
            setLoading(false)
        }
    }

    // Initial load
    useEffect(() => {
        if (id || nisInput) {
            fetchQueueStatus(id, nisInput)
        } else {
            setLoading(false)
        }
    }, [id])

    // Socket Connection for Real-time updates
    useEffect(() => {
        if (!queueData) return

        const socket = io(SOCKET_URL, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        })

        socket.on('connect', () => setSocketConnected(true))
        socket.on('disconnect', () => setSocketConnected(false))

        socket.on('queue-updated', () => {
            // Re-fetch data to get latest status and people ahead
            fetchQueueStatus(id, nisInput)
        })

        return () => socket.disconnect()
    }, [queueData?.id]) // Re-run if queue ID changes

    const handleSearch = (e) => {
        e.preventDefault()
        if (nisInput.trim()) {
            setSearchParams({ nis: nisInput.trim() })
            fetchQueueStatus(null, nisInput.trim())
        }
    }

    if (loading && !queueData) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-500 font-medium">Memuat data antrian...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 pb-20">
            {/* Header */}
            <div className="w-full max-w-md flex flex-col items-center mb-8 mt-6">
                {schoolInfo.logo ? (
                    <img src={schoolInfo.logo} alt="Logo" className="w-20 h-20 object-contain mb-4 shadow-lg rounded-2xl bg-white p-2" />
                ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg mb-4">
                        <GraduationCap className="w-10 h-10 text-white" />
                    </div>
                )}
                <h1 className="text-2xl font-black text-slate-900 tracking-tight text-center">{schoolInfo.name}</h1>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Live Tracking Antrian</p>
            </div>

            <div className="w-full max-w-md w-full space-y-4">
                {!queueData ? (
                    <Card className="shadow-xl border-none ring-1 ring-slate-200">
                        <CardHeader>
                            <CardTitle className="text-center">Cek Status Antrian</CardTitle>
                            <CardDescription className="text-center">Masukkan NIS siswa yang telah melakukan Check-in di gerbang.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSearch} className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Masukkan NIS Siswa..."
                                    className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-center text-xl font-black tracking-wider transition-all outline-none"
                                    value={nisInput}
                                    onChange={(e) => setNisInput(e.target.value)}
                                />
                                {error && (
                                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium text-center border border-red-100">
                                        {error}
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading || !nisInput.trim()}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-lg shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Mencari...' : 'CEK SEKARANG'}
                                </button>
                            </form>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Status Banner */}
                        <div className={cn(
                            "p-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg",
                            queueData.status === 'WAITING' ? "bg-orange-500 text-white" :
                            queueData.status === 'CALLED' ? "bg-blue-600 text-white animate-pulse" :
                            "bg-emerald-500 text-white"
                        )}>
                            {queueData.status === 'WAITING' && <Clock className="w-6 h-6" />}
                            {queueData.status === 'CALLED' && <BellRing className="w-6 h-6" />}
                            {queueData.status === 'FINISHED' && <CheckCircle2 className="w-6 h-6" />}
                            <span className="font-black text-lg tracking-wide uppercase">
                                {queueData.status === 'WAITING' ? 'Harap Menunggu' :
                                 queueData.status === 'CALLED' ? 'Giliran Anda Tiba!' :
                                 'Selesai'}
                            </span>
                        </div>

                        {/* Main Info Card */}
                        <Card className="shadow-xl border-none ring-1 ring-slate-200 overflow-hidden relative">
                            {/* Decorative background circle */}
                            <div className="absolute -right-16 -top-16 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
                            
                            <CardContent className="p-6 relative">
                                <div className="text-center mb-6">
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Nomor Antrian</p>
                                    <div className="text-7xl font-black text-slate-900 tracking-tighter">
                                        {queueData.queue_number}
                                    </div>
                                    <Badge variant="outline" className="mt-3 text-sm px-4 py-1 border-blue-200 text-blue-700 bg-blue-50 font-black">
                                        KELAS {queueData.class}
                                    </Badge>
                                </div>

                                <div className="space-y-4 border-t border-slate-100 pt-6">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Siswa</p>
                                        <p className="text-xl font-bold text-slate-900">{queueData.name}</p>
                                        <p className="text-sm font-medium text-slate-500">NIS: {queueData.nis}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Waktu Check-in</p>
                                        <p className="text-base font-bold text-slate-900">
                                            {new Date(queueData.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Info / Estimation Card */}
                        {queueData.status === 'WAITING' && (
                            <Card className="shadow-md border-none bg-slate-800 text-white">
                                <CardContent className="p-5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Siswa di Depan Anda</p>
                                        <p className="text-3xl font-black text-white">{queueData.peopleAhead}</p>
                                    </div>
                                    <Users className="w-12 h-12 text-slate-600" />
                                </CardContent>
                            </Card>
                        )}
                        
                        {queueData.status === 'CALLED' && (
                            <Card className="shadow-md border-none bg-blue-50 border border-blue-200">
                                <CardContent className="p-5 text-center">
                                    <h3 className="text-blue-900 font-black text-lg mb-2">Segera Menuju Ruang Kelas</h3>
                                    <p className="text-blue-700 text-sm font-medium">Guru wali kelas Anda sudah menunggu di ruangan untuk membagikan raport.</p>
                                </CardContent>
                            </Card>
                        )}

                        <div className="text-center pt-4">
                            <button onClick={() => { setQueueData(null); setSearchParams({}); setNisInput('') }} className="text-sm font-bold text-slate-500 hover:text-slate-900 underline underline-offset-4">
                                Cek NIS Lain
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Connection Status Indicator */}
            {queueData && (
                <div className={cn(
                    "fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg backdrop-blur-md border transition-colors",
                    socketConnected 
                        ? "bg-emerald-50/80 text-emerald-700 border-emerald-200" 
                        : "bg-red-50/80 text-red-700 border-red-200 animate-pulse"
                )}>
                    {socketConnected ? '🟢 Live Sync Aktif' : '🔴 Terputus - Mencoba Hubung Ulang...'}
                </div>
            )}
        </div>
    )
}