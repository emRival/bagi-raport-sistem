import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { queueApi, studentsApi } from '../../services/api.js'
import { LogOut, Search, UserCheck, Clock, CheckCircle, RefreshCw } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import './CheckIn.css'

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

    // Fetch stats
    const fetchStats = async () => {
        try {
            const data = await queueApi.getStats()
            setStats(data)
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }

    // Fetch recent check-ins
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

        // Focus input
        inputRef.current?.focus()

        // Refresh every 30 seconds
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
                // Multiple results, show first match
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
        <div className="checkin-page">
            <header className="checkin-header">
                <div className="checkin-header__title">
                    {settings.schoolLogo && settings.schoolLogo.trim() !== '' ? (
                        <img
                            src={settings.schoolLogo}
                            alt="School Logo"
                            style={{ width: '48px', height: '48px', objectFit: 'contain', marginRight: '12px' }}
                        />
                    ) : (
                        <span style={{ fontSize: '2rem', marginRight: '12px' }}>🎓</span>
                    )}
                    <h1>Check-In Raport</h1>
                </div>
                <div className="checkin-header__actions">
                    <Button variant="ghost" icon={RefreshCw} onClick={() => { fetchStats(); fetchRecent(); }}>
                        Refresh
                    </Button>
                    <button className="logout-btn-sm" onClick={handleLogout} title="Logout">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="checkin-main">
                {/* Stats */}
                <div className="checkin-stats">
                    <div className="checkin-stat">
                        <Clock size={32} />
                        <div className="checkin-stat__content">
                            <span className="checkin-stat__value">{stats.totals.waiting}</span>
                            <span className="checkin-stat__label">Menunggu</span>
                        </div>
                    </div>
                    <div className="checkin-stat checkin-stat--success">
                        <CheckCircle size={32} />
                        <div className="checkin-stat__content">
                            <span className="checkin-stat__value">{stats.totals.finished}</span>
                            <span className="checkin-stat__label">Selesai</span>
                        </div>
                    </div>
                    <div className="checkin-stat checkin-stat--total">
                        <UserCheck size={32} />
                        <div className="checkin-stat__content">
                            <span className="checkin-stat__value">{stats.totals.total}</span>
                            <span className="checkin-stat__label">Total Hari Ini</span>
                        </div>
                    </div>
                </div>

                {/* Search Box */}
                <div className="checkin-search">
                    <h2>Scan atau Masukkan NIS Siswa</h2>
                    <div className="checkin-search__input-group">
                        <input
                            ref={inputRef}
                            type="text"
                            className="checkin-search__input"
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
                            variant="primary"
                            size="lg"
                            icon={Search}
                            onClick={handleSearch}
                            loading={loading && !searchResult}
                        >
                            Cari
                        </Button>
                    </div>
                </div>

                {/* Search Result */}
                {searchResult && (
                    <div className="checkin-result">
                        <div className="checkin-result__info">
                            <h3>{searchResult.name}</h3>
                            <p>NIS: {searchResult.nis}</p>
                            <p>Kelas: <strong>{searchResult.class}</strong></p>
                            <p>Wali: {searchResult.parent_name || '-'}</p>
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

                {/* Recent Check-ins */}
                <div className="checkin-recent">
                    <h3>Check-in Terbaru</h3>
                    <div className="checkin-recent__list">
                        {recentCheckins.length === 0 ? (
                            <p className="checkin-recent__empty">Belum ada check-in hari ini</p>
                        ) : (
                            recentCheckins.map(item => (
                                <div key={item.id} className="checkin-recent__item">
                                    <span className="checkin-recent__name">{item.name}</span>
                                    <span className="checkin-recent__class">{item.class}</span>
                                    <span className="checkin-recent__time">
                                        {new Date(item.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
