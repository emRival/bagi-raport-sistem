import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { queueApi, studentsApi } from '../../services/api.js'
import { LogOut, Search, UserCheck, Clock, CheckCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui-new/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui-new/card'
import { Input } from '@/components/ui-new/input'
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
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950">
            {/* Header */}
            <header className="bg-white/10 backdrop-blur-md border-b border-white/20 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {settings.schoolLogo && settings.schoolLogo.trim() !== '' ? (
                            <img
                                src={settings.schoolLogo}
                                alt="School Logo"
                                className="w-12 h-12 object-contain"
                            />
                        ) : (
                            <span className="text-4xl">🎓</span>
                        )}
                        <h1 className="text-2xl font-bold text-white">Check-In Raport</h1>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" icon={RefreshCw} onClick={() => { fetchStats(); fetchRecent(); }} className="text-white hover:bg-white/10">
                            Refresh
                        </Button>
                        <Button variant="destructive" icon={LogOut} onClick={handleLogout}>
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-white/95">
                        <CardContent className="flex items-center gap-4 p-6">
                            <Clock className="w-12 h-12 text-yellow-600" />
                            <div>
                                <div className="text-4xl font-bold">{stats.totals.waiting}</div>
                                <div className="text-sm text-muted-foreground">Menunggu</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/95">
                        <CardContent className="flex items-center gap-4 p-6">
                            <CheckCircle className="w-12 h-12 text-green-600" />
                            <div>
                                <div className="text-4xl font-bold">{stats.totals.finished}</div>
                                <div className="text-sm text-muted-foreground">Selesai</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/95">
                        <CardContent className="flex items-center gap-4 p-6">
                            <UserCheck className="w-12 h-12 text-blue-600" />
                            <div>
                                <div className="text-4xl font-bold">{stats.totals.total}</div>
                                <div className="text-sm text-muted-foreground">Total Hari Ini</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search Box */}
                <Card className="bg-white/95">
                    <CardHeader>
                        <CardTitle className="text-center">Scan atau Masukkan NIS Siswa</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-3">
                            <input
                                ref={inputRef}
                                type="text"
                                className="flex-1 h-12 px-4 text-lg rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="Ketik NIS atau scan barcode..."
                                value={nis}
                                onChange={(e) => {
                                    setNis(e.target.value)
                                    setSearchResult(null)
                                }}
                                onKeyPress={handleKeyPress}
                                autoFocus
                            />
                            <Button
                                size="lg"
                                icon={Search}
                                onClick={handleSearch}
                                loading={loading && !searchResult}
                            >
                                Cari
                            </Button>
                        </div>

                        {/* Search Result */}
                        {searchResult && (
                            <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                                <div>
                                    <h3 className="text-xl font-bold">{searchResult.name}</h3>
                                    <p className="text-sm text-muted-foreground">NIS: {searchResult.nis}</p>
                                    <p className="text-sm">Kelas: <strong>{searchResult.class}</strong></p>
                                    <p className="text-sm text-muted-foreground">Wali: {searchResult.parent_name || '-'}</p>
                                </div>
                                <Button
                                    variant="success"
                                    size="lg"
                                    icon={UserCheck}
                                    onClick={handleCheckIn}
                                    loading={loading}
                                >
                                    CHECK-IN
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Check-ins */}
                <Card className="bg-white/95">
                    <CardHeader>
                        <CardTitle>Check-in Terbaru</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentCheckins.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">Belum ada check-in hari ini</p>
                        ) : (
                            <div className="space-y-2">
                                {recentCheckins.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                        <span className="font-medium">{item.name}</span>
                                        <div className="flex gap-2">
                                            <Badge>{item.class}</Badge>
                                            <span className="text-sm text-muted-foreground">
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
