import { useState, useEffect, useRef } from 'react'
import { Search, CheckCircle, LogOut, ClipboardList, Clock, AlertCircle, UserCheck, Phone, Trash2, User, GraduationCap, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { queueApi, studentsApi } from '../../services/api.js'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui-new/card'
import { Button } from '@/components/ui-new/button'
import { Input } from '@/components/ui-new/input'
import { Badge } from '@/components/ui-new/badge'
import { AlertDialog } from '@/components/ui-new/alert-dialog'
import { cn } from '@/lib/utils'

export default function Checkin() {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { settings } = useSettings()
    const toast = useToast()
    
    // --- STATE ---
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [parentPhone, setParentPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [checkingIn, setCheckingIn] = useState(false)
    const [stats, setStats] = useState({ waiting: 0, finished: 0, total: 0 })
    const [recentCheckins, setRecentCheckins] = useState([])
    const [checkedInIds, setCheckedInIds] = useState(new Set())
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' })
    
    const inputRef = useRef(null)
    const phoneInputRef = useRef(null)

    // --- DATA FETCHING ---
    const fetchData = async () => {
        try {
            const [statsData, queueData] = await Promise.all([
                queueApi.getStats(),
                queueApi.getQueue()
            ])
            setStats(statsData.totals || { waiting: 0, finished: 0, total: 0 })
            // Get latest 10 checkins
            setRecentCheckins(queueData.slice().reverse().slice(0, 10))
            // Build set of checked-in student IDs for today
            const checkedIds = new Set(queueData.map(q => q.student_id))
            setCheckedInIds(checkedIds)
        } catch (error) {
            console.error('Error fetching data:', error)
        }
    }

    useEffect(() => {
        fetchData()
        inputRef.current?.focus()
        const interval = setInterval(fetchData, 10000) // Refresh every 10s
        return () => clearInterval(interval)
    }, [])

    // --- SEARCH LOGIC ---
    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([])
            return
        }

        const timer = setTimeout(async () => {
            try {
                setLoading(true)
                const students = await studentsApi.getAll({ search: query })
                // Add checked-in status to each student
                const studentsWithStatus = students.map(s => ({
                    ...s,
                    isCheckedIn: checkedInIds.has(s.id)
                }))
                setResults(studentsWithStatus.slice(0, 8))
            } catch (error) {
                console.error('Search error:', error)
                setResults([])
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query, checkedInIds])

    // --- HANDLERS ---
    const handleSelectStudent = (student) => {
        setSelectedStudent(student)
        setQuery('')
        setResults([])
        // If student already has a parent phone in database, pre-fill it
        setParentPhone(student.parent_phone || '')
        // Focus phone input after selection
        setTimeout(() => phoneInputRef.current?.focus(), 150)
    }

    const handleCheckin = async () => {
        if (!selectedStudent) return

        setCheckingIn(true)
        try {
            await queueApi.checkIn({
                student_id: selectedStudent.id,
                parent_phone: parentPhone || null
            })
            toast.success(`${selectedStudent.name} berhasil masuk antrian!`)
            handleClearSelection()
            fetchData()
        } catch (error) {
            toast.error(error.message || 'Gagal check-in')
        } finally {
            setCheckingIn(false)
        }
    }

    const handleUncheckin = async () => {
        try {
            await queueApi.remove(deleteModal.id)
            toast.success(`Check-in ${deleteModal.name} telah dibatalkan`)
            fetchData()
        } catch (error) {
            console.error('Error undoing checkin:', error)
            toast.error('Gagal membatalkan check-in')
        }
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const handleClearSelection = () => {
        setSelectedStudent(null)
        setParentPhone('')
        setQuery('')
        setTimeout(() => inputRef.current?.focus(), 100)
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pb-6">
            {/* Hardened Top Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {settings.schoolLogo ? (
                            <img src={settings.schoolLogo} alt="Logo" className="w-9 h-9 object-contain" />
                        ) : (
                            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                                <GraduationCap size={20} />
                            </div>
                        )}
                        <div>
                            <h1 className="text-sm font-bold text-slate-900 leading-tight">Check-In Raport</h1>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Pos Keamanan</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block text-right mr-2">
                            <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                            <p className="text-[10px] text-emerald-600 font-bold uppercase">Petugas Aktif</p>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={handleLogout}
                            className="text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                        >
                            <LogOut size={20} />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-4xl w-full mx-auto p-4 space-y-4">
                
                {/* Real-time Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                    <Card className="border-none shadow-sm bg-blue-600 text-white overflow-hidden relative">
                        <div className="absolute -right-2 -top-2 opacity-10">
                            <ClipboardList size={64} />
                        </div>
                        <CardContent className="p-3 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-tight opacity-80">Total</p>
                            <p className="text-2xl font-black">{stats.total}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-orange-500 text-white overflow-hidden relative">
                        <div className="absolute -right-2 -top-2 opacity-10">
                            <Clock size={64} />
                        </div>
                        <CardContent className="p-3 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-tight opacity-80">Antri</p>
                            <p className="text-2xl font-black">{stats.waiting}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-emerald-500 text-white overflow-hidden relative">
                        <div className="absolute -right-2 -top-2 opacity-10">
                            <CheckCircle size={64} />
                        </div>
                        <CardContent className="p-3 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-tight opacity-80">Selesai</p>
                            <p className="text-2xl font-black">{stats.finished}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Primary Action Card */}
                <Card className="shadow-md border-slate-200">
                    <CardContent className="p-6">
                        {!selectedStudent ? (
                            <div className="space-y-4">
                                <div className="text-center space-y-1 mb-4">
                                    <h2 className="text-xl font-black text-slate-900">Cari Nama Siswa</h2>
                                    <p className="text-sm text-slate-500 font-medium">Tanyakan nama atau NIS siswa yang datang</p>
                                </div>
                                
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={24} />
                                    <Input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="Ketik nama atau NIS..."
                                        className="pl-12 py-7 text-lg font-bold border-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all rounded-2xl"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                    />
                                    {loading && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>

                                {/* Dynamic Results Dropdown-like List */}
                                {results.length > 0 && (
                                    <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {results.map(student => (
                                            <button
                                                key={student.id}
                                                disabled={student.isCheckedIn}
                                                onClick={() => handleSelectStudent(student)}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all active:scale-[0.98]",
                                                    student.isCheckedIn 
                                                        ? "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed" 
                                                        : "bg-white border-slate-100 hover:border-blue-400 hover:bg-blue-50/30"
                                                )}
                                            >
                                                <div className="flex items-center gap-3 text-left">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-full flex items-center justify-center font-black",
                                                        student.isCheckedIn ? "bg-slate-200 text-slate-400" : "bg-blue-100 text-blue-700"
                                                    )}>
                                                        {student.isCheckedIn ? "✓" : student.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 leading-none">{student.name}</p>
                                                        <p className="text-xs font-medium text-slate-500 mt-1">Kelas {student.class} • NIS: {student.nis}</p>
                                                    </div>
                                                </div>
                                                {student.isCheckedIn && (
                                                    <Badge variant="secondary" className="bg-slate-200 text-slate-600 font-bold px-2 py-1">SUDAH CHECK-IN</Badge>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {query.length >= 2 && results.length === 0 && !loading && (
                                    <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 animate-pulse">
                                        <AlertCircle className="mx-auto text-slate-300 mb-2" size={48} />
                                        <p className="text-slate-500 font-bold">Siswa tidak ditemukan</p>
                                        <p className="text-xs text-slate-400">Pastikan ejaan nama sudah benar</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Selected Student Flow */
                            <div className="space-y-6 animate-in zoom-in-95 duration-300">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-3xl font-black shadow-lg shadow-blue-200">
                                            {selectedStudent.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedStudent.name}</h2>
                                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 font-black px-3">
                                                KELAS {selectedStudent.class}
                                            </Badge>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={handleClearSelection} className="rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500">
                                        <X size={24} />
                                    </Button>
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-5 space-y-4 border border-slate-100">
                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-slate-700 flex items-center gap-2 uppercase tracking-wide">
                                            <Phone size={16} className="text-blue-600" />
                                            Nomor WhatsApp Wali
                                        </label>
                                        <Input
                                            ref={phoneInputRef}
                                            type="tel"
                                            placeholder="Contoh: 081234567890"
                                            className="py-6 text-xl font-black tracking-widest border-2 focus-visible:ring-blue-500"
                                            value={parentPhone}
                                            onChange={(e) => setParentPhone(e.target.value.replace(/\D/g, ''))}
                                            onKeyPress={(e) => e.key === 'Enter' && handleCheckin()}
                                        />
                                        <p className="text-[11px] text-slate-500 font-medium italic">* Kosongkan jika tidak ada. Notifikasi akan dikirim ke nomor ini.</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <Button 
                                        className="py-8 text-xl font-black rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-[0.98]"
                                        onClick={handleCheckin}
                                        loading={checkingIn}
                                    >
                                        <UserCheck className="mr-2" size={28} />
                                        KONFIRMASI DATANG
                                    </Button>
                                    <Button variant="ghost" onClick={handleClearSelection} className="text-slate-500 font-bold">
                                        Cari Nama Lain
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent History Card */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-500">Check-in Terbaru</CardTitle>
                            <Badge variant="outline" className="text-[10px] font-bold text-slate-400">HARI INI</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="px-0">
                        {recentCheckins.length === 0 ? (
                            <div className="py-10 text-center space-y-2 opacity-40">
                                <User size={40} className="mx-auto text-slate-300" />
                                <p className="text-xs font-bold uppercase tracking-widest">Belum ada siswa datang</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {recentCheckins.map((item, index) => (
                                    <div key={item.id} className={cn(
                                        "flex items-center justify-between p-4 group animate-in slide-in-from-left-2 duration-300",
                                        index === 0 && "bg-blue-50/30"
                                    )}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs">
                                                {item.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 leading-none">{item.name}</p>
                                                <p className="text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-tight">
                                                    Kelas {item.class} • {new Date(item.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setDeleteModal({ open: true, id: item.id, name: item.name })}
                                            className="h-8 w-8 p-0 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full"
                                            title="Batalkan"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            <AlertDialog
                open={deleteModal.open}
                onOpenChange={(open) => setDeleteModal(prev => ({ ...prev, open }))}
                title="Batalkan Check-in?"
                description={`Apakah Anda yakin ingin membatalkan check-in untuk ${deleteModal.name}?`}
                confirmText="Ya, Batalkan"
                onConfirm={handleUncheckin}
            />
            
            {/* Footer Watermark */}
            <footer className="mt-auto py-4 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                    Powered by Bagi Raport • Secure Check-in V4
                </p>
            </footer>

            <style>{`
                .smooth-transition {
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .animate-shimmer {
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                    background-size: 200% 100%;
                    animation: shimmer 2s infinite;
                }
            `}</style>
        </div>
    )
}
