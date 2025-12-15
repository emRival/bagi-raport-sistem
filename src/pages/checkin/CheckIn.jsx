import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { queueApi, studentsApi } from '../../services/api.js'
import { LogOut, Search, UserCheck, Clock, CheckCircle, RefreshCw, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui-new/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui-new/card'
import { Badge } from '@/components/ui-new/badge'

export default function CheckIn() {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const toast = useToast()
    const { settings } = useSettings()
    const [nis, setNis] = useState('')
    const [loading, setLoading] = useState(false)
    const [stats, setStats] = useState({ totals: { waiting: 0, finished: 0, total: 0 } })
    const [recentCheckins, setRecentCheckins] = useState([])
    const [searchResult, setSearchResult] = useState(null)
    const inputRef = useRef(null)

    const fetchStats = async () => {
        try {
            const data = await queueApi.getStats()
            setStats(data)
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }

    const fetchRecent = async () => {
        try {
            const data = await queueApi.getQueue()
            setRecentCheckins(data.slice(-10).reverse())
        } catch (error) {
            console.error('Error fetching recent:', error)
        }
    }

    useEffect(() => {
        fetchStats()
        fetchRecent()
        inputRef.current?.focus()

        const interval = setInterval(() => {
            fetchStats()
            fetchRecent()
        }, 30000)

        return () => clearInterval(interval)
    }, [])

    const handleSearch = async () => {
        if (!nis.trim()) {
            toast.error('Masukkan NIS siswa')
            return
        }

        setLoading(true)
        try {
            const students = await studentsApi.getAll({ search: nis.trim() })
            if (students.length === 0) {
                toast.error('Siswa tidak ditemukan')
                setSearchResult(null)
            } else if (students.length === 1) {
                setSearchResult(students[0])
            } else {
                const exact = students.find(s => s.nis === nis.trim())
                setSearchResult(exact || students[0])
            }
        } catch (error) {
            toast.error('Gagal mencari siswa')
        } finally {
            setLoading(false)
        }
    }

    const handleCheckIn = async () => {
        if (!searchResult) return

        setLoading(true)
        try {
            await queueApi.checkIn({ student_id: searchResult.id })
            toast.success(`${searchResult.name} berhasil check-in!`)
            setSearchResult(null)
            setNis('')
            inputRef.current?.focus()
            fetchStats()
            fetchRecent()
        } catch (error) {
            toast.error(error.message || 'Gagal check-in')
        } finally {
            setLoading(false)
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            if (searchResult) {
                handleCheckIn()
            } else {
                handleSearch()
            }
        }
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Professional Header */}
            <header className="bg-white border-b shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                                {settings.schoolLogo && settings.schoolLogo.trim() !== '' ? (
                                    <img
                                        src={settings.schoolLogo}
                                        alt="Logo"
                                        className="w-10 h-10 object-contain"
                                    />
                                ) : (
                                    <Users className="w-6 h-6 text-white" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">Check-In Raport</h1>
                                <p className="text-sm text-slate-500">Sistem Antrian Pengambilan Raport</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => { fetchStats(); fetchRecent(); }}>
                                <span className="hidden sm:inline">Refresh</span>
                            </Button>
                            <Button variant="outline" size="sm" icon={LogOut} onClick={handleLogout}>
                                <span className="hidden sm:inline">Logout</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Modern Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 animate-fade-in">
                    <Card className="hover-lift border-l-4 border-l-yellow-500">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600 mb-1">Menunggu</p>
                                    <p className="text-3xl font-bold text-slate-900">{stats.totals.waiting}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-yellow-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="hover-lift border-l-4 border-l-green-500">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600 mb-1">Selesai</p>
                                    <p className="text-3xl font-bold text-slate-900">{stats.totals.finished}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="hover-lift border-l-4 border-l-blue-500 sm:col-span-2 lg:col-span-1">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600 mb-1">Total Hari Ini</p>
                                    <p className="text-3xl font-bold text-slate-900">{stats.totals.total}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Premium Search Card */}
                <Card className="mb-8 shadow-lg animate-scale-in">
                    <CardHeader className="text-center pb-4">
                        <CardTitle className="text-2xl">Scan atau Masukkan NIS Siswa</CardTitle>
                        <CardDescription>Gunakan scanner barcode atau ketik manual</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className="w-full h-14 px-4 text-lg rounded-lg border-2 border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none smooth-transition shadow-sm"
                                    placeholder="Ketik NIS atau scan barcode..."
                                    value={nis}
                                    onChange={(e) => {
                                        setNis(e.target.value)
                                        setSearchResult(null)
                                    }}
                                    onKeyPress={handleKeyPress}
                                    autoFocus
                                />
                            </div>
                            <Button
                                size="lg"
                                icon={Search}
                                onClick={handleSearch}
                                loading={loading && !searchResult}
                                className="h-14 px-8 shadow-lg"
                            >
                                Cari Siswa
                            </Button>
                        </div>

                        {/* Professional Search Result */}
                        {searchResult && (
                            <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-md animate-scale-in">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                                                <UserCheck className="w-5 h-5 text-green-700" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900">{searchResult.name}</h3>
                                                <p className="text-sm text-slate-600">NIS: {searchResult.nis}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                                Kelas {searchResult.class}
                                            </Badge>
                                            {searchResult.parent_name && (
                                                <Badge variant="outline" className="text-slate-600">
                                                    Wali: {searchResult.parent_name}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="success"
                                        size="lg"
                                        icon={UserCheck}
                                        onClick={handleCheckIn}
                                        loading={loading}
                                        className="shadow-lg w-full sm:w-auto"
                                    >
                                        CHECK-IN SEKARANG
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Modern Recent Check-ins */}
                <Card className="shadow-lg animate-slide-in">
                    <CardHeader>
                        <CardTitle>Check-in Terbaru</CardTitle>
                        <CardDescription>10 check-in terakhir hari ini</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentCheckins.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p className="font-medium">Belum ada check-in hari ini</p>
                                <p className="text-sm">Check-in pertama akan muncul di sini</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recentCheckins.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg smooth-transition border border-slate-200"
                                        style={{ animationDelay: `${index * 0.05}s` }}
                                    >
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">{item.name}</p>
                                                <p className="text-sm text-slate-500">NIS: {item.nis || '-'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant="secondary" className="hidden sm:inline-flex">
                                                {item.class}
                                            </Badge>
                                            <span className="text-sm text-slate-600 font-medium">
                                                {new Date(item.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
