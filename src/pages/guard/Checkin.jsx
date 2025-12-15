import { useState, useEffect, useRef } from 'react'
import { Search, CheckCircle, LogOut, ClipboardList, Clock, AlertCircle, UserCheck, Phone, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { queueApi, studentsApi } from '../../services/api.js'
import Button from '../../components/ui/Button.jsx'
import './Checkin.css'

export default function Checkin() {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { settings } = useSettings()
    const toast = useToast()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [parentPhone, setParentPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [checkingIn, setCheckingIn] = useState(false)
    const [stats, setStats] = useState({ waiting: 0, finished: 0, total: 0 })
    const [recentCheckins, setRecentCheckins] = useState([])
    const [checkedInIds, setCheckedInIds] = useState(new Set()) // Track already checked-in student IDs
    const inputRef = useRef(null)
    const phoneInputRef = useRef(null)

    // Fetch stats and recent
    const fetchData = async () => {
        try {
            const [statsData, queueData] = await Promise.all([
                queueApi.getStats(),
                queueApi.getQueue()
            ])
            setStats(statsData.totals || { waiting: 0, finished: 0, total: 0 })
            setRecentCheckins(queueData.slice(-5).reverse())
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
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [])

    // Search students
    useEffect(() => {
        if (query.length < 2) {
            setResults([])
            return
        }

        const timer = setTimeout(async () => {
            try {
                setLoading(true)
                console.log('🔍 Searching for:', query)
                const students = await studentsApi.getAll({ search: query })
                console.log('🔍 Search results:', students)
                // Add checked-in status to each student
                const studentsWithStatus = students.map(s => ({
                    ...s,
                    isCheckedIn: checkedInIds.has(s.id)
                }))
                setResults(studentsWithStatus.slice(0, 10))
            } catch (error) {
                console.error('❌ Search error:', error)
                setResults([])
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query, checkedInIds])

    const handleSelectStudent = (student) => {
        setSelectedStudent(student)
        setQuery('')
        setResults([])
        setParentPhone('')
        // Focus phone input after selection
        setTimeout(() => phoneInputRef.current?.focus(), 100)
    }

    const handleCheckin = async () => {
        if (!selectedStudent) return

        setCheckingIn(true)
        try {
            await queueApi.checkIn({
                student_id: selectedStudent.id,
                parent_phone: parentPhone || null
            })
            toast.success(`${selectedStudent.name} berhasil check-in!`)
            setSelectedStudent(null)
            setParentPhone('')
            inputRef.current?.focus()
            fetchData()
        } catch (error) {
            toast.error(error.message || 'Gagal check-in. Mungkin sudah check-in hari ini.')
        } finally {
            setCheckingIn(false)
        }
    }

    const handleUncheckin = async (id, name) => {
        if (!confirm(`Batalkan check-in untuk ${name}?`)) return

        try {
            await queueApi.delete(id)
            toast.success(`Check-in ${name} dibatalkan`)
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
        inputRef.current?.focus()
    }

    return (
        <div className="checkin-page">
            {/* Header */}
            <header className="checkin-header">
                <div className="checkin-logo">
                    {settings.schoolLogo && settings.schoolLogo.trim() !== '' ? (
                        <img
                            src={settings.schoolLogo}
                            alt="School Logo"
                            className="checkin-logo__img"
                            style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                        />
                    ) : (
                        <span className="checkin-logo__icon">🎓</span>
                    )}
                    <div className="checkin-title-group">
                        <h1>Check-In Raport</h1>
                        <p>{settings.schoolName}</p>
                        {user && (
                            <div className="checkin-user-badge">
                                <span className="checkin-user">ACTIVE: {user.name}</span>
                            </div>
                        )}
                    </div>
                </div>
                <button className="logout-btn" onClick={handleLogout}>
                    <LogOut size={24} />
                    <span>Keluar</span>
                </button>
            </header>

            {/* Stats Bar */}
            <div className="stats-bar">
                <div className="stats-bar__item">
                    <ClipboardList size={20} />
                    <span className="stats-bar__value">{stats.total}</span>
                    <span className="stats-bar__label">Total Hari Ini</span>
                </div>
                <div className="stats-bar__item stats-bar__item--warning">
                    <Clock size={20} />
                    <span className="stats-bar__value">{stats.waiting}</span>
                    <span className="stats-bar__label">Menunggu</span>
                </div>
                <div className="stats-bar__item stats-bar__item--success">
                    <CheckCircle size={20} />
                    <span className="stats-bar__value">{stats.finished}</span>
                    <span className="stats-bar__label">Selesai</span>
                </div>
            </div>

            {/* Main Content */}
            <main className="checkin-main">
                {selectedStudent ? (
                    /* Selected Student - Enter Phone */
                    <div className="selected-student">
                        <div className="selected-student__card">
                            <div className="selected-student__avatar">
                                {selectedStudent.name.charAt(0)}
                            </div>
                            <div className="selected-student__info">
                                <h2>{selectedStudent.name}</h2>
                                <p className="selected-student__class">Kelas {selectedStudent.class}</p>
                                <p className="selected-student__nis">NIS: {selectedStudent.nis}</p>
                                {selectedStudent.parent_name && (
                                    <p className="selected-student__parent">Wali: {selectedStudent.parent_name}</p>
                                )}
                            </div>
                        </div>

                        {/* Phone Input */}
                        <div className="phone-input-section">
                            <label className="phone-input-label">
                                <Phone size={20} />
                                <span>Nomor Telepon Wali (opsional)</span>
                            </label>
                            <input
                                ref={phoneInputRef}
                                type="tel"
                                className="phone-input"
                                placeholder="081234567890"
                                value={parentPhone}
                                onChange={(e) => {
                                    // Only allow numbers
                                    const value = e.target.value.replace(/\D/g, '')
                                    setParentPhone(value)
                                }}
                                onKeyPress={(e) => e.key === 'Enter' && handleCheckin()}
                            />
                            <p className="phone-input-hint">Untuk keperluan panggilan darurat</p>
                        </div>

                        <div className="selected-student__actions">
                            <Button
                                variant="success"
                                size="lg"
                                icon={UserCheck}
                                onClick={handleCheckin}
                                loading={checkingIn}
                                className="checkin-btn"
                            >
                                CHECK-IN SEKARANG
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={handleClearSelection}
                            >
                                Batal / Cari Lagi
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Search Box */
                    <div className="search-section">
                        <h2>Cari Siswa untuk Check-in</h2>
                        <p>Ketik nama atau NIS siswa</p>

                        <div className="search-box-large">
                            <Search size={24} />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Ketik nama atau NIS siswa..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                            />
                            {loading && <div className="search-loading" />}

                            {/* Search Results - inside search-box-large for absolute positioning */}
                            {results.length > 0 && (
                                <div className="search-results">
                                    {results.map(student => (
                                        <button
                                            key={student.id}
                                            className={`search-result-item ${student.isCheckedIn ? 'search-result-item--checked' : ''}`}
                                            onClick={() => handleSelectStudent(student)}
                                            disabled={student.isCheckedIn}
                                        >
                                            <div className={`search-result-item__avatar ${student.isCheckedIn ? 'search-result-item__avatar--checked' : ''}`}>
                                                {student.isCheckedIn ? '✓' : student.name.charAt(0)}
                                            </div>
                                            <div className="search-result-item__info">
                                                <span className="search-result-item__name">{student.name}</span>
                                                <span className="search-result-item__class">Kelas {student.class}</span>
                                            </div>
                                            {student.isCheckedIn ? (
                                                <span className="search-result-item__checked-badge">✓ Sudah Check-in</span>
                                            ) : (
                                                <span className="search-result-item__nis">{student.nis}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {query.length >= 2 && results.length === 0 && !loading && (
                                <div className="search-results no-results">
                                    <AlertCircle size={48} />
                                    <p>Siswa tidak ditemukan</p>
                                    <small>Pastikan nama atau NIS benar</small>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Recent Check-ins */}
                <div className="recent-checkins">
                    <h3>Check-in Terbaru</h3>
                    {recentCheckins.length === 0 ? (
                        <p className="recent-checkins__empty">Belum ada check-in hari ini</p>
                    ) : (
                        <div className="recent-checkins__list">
                            {recentCheckins.map(item => (
                                <div key={item.id} className="recent-checkins__item">
                                    <span className="recent-checkins__name">{item.name}</span>
                                    <span className="recent-checkins__class">{item.class}</span>
                                    <span className="recent-checkins__time">
                                        {new Date(item.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <button
                                        className="p-1 text-red-500 hover:bg-red-50 rounded ml-2"
                                        onClick={() => handleUncheckin(item.id, item.name)}
                                        title="Batalkan Check-in"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
