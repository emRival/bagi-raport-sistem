import { Users, ClipboardList, Clock, CheckCircle, Megaphone, Plus, Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useAnnouncements } from '../../context/AnnouncementsContext.jsx'
import { socketService } from '../../services/socket.js'
import { queueApi, studentsApi } from '../../services/api.js'
import { useState, useEffect } from 'react'
import Modal from '../../components/ui/Modal.jsx'
import Input from '../../components/ui/Input.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import AnnouncementSettings from '../../components/admin/AnnouncementSettings.jsx'
import './Dashboard.css'

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function Dashboard() {
    const { settings } = useSettings()
    const { announcements, addAnnouncement, removeAnnouncement } = useAnnouncements()
    const toast = useToast()
    const [modalOpen, setModalOpen] = useState(false)
    const [newAnnouncement, setNewAnnouncement] = useState('')

    // Real stats from API
    const [stats, setStats] = useState({
        totals: { waiting: 0, called: 0, finished: 0, total: 0 },
        byClass: []
    })
    const [totalStudents, setTotalStudents] = useState(0)
    const [activities, setActivities] = useState([])

    // Connect to WebSocket
    useEffect(() => {
        socketService.connect()
        socketService.register('admin')
    }, [])

    // Fetch data from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, students, activityData] = await Promise.all([
                    queueApi.getStats(),
                    studentsApi.getAll(),
                    queueApi.getActivity(10)
                ])
                setStats(statsData)
                setTotalStudents(students.length)
                setActivities(activityData)
            } catch (error) {
                console.error('Error fetching data:', error)
            }
        }
        fetchData()
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [])

    // Build class data for charts
    const classData = settings.classes.map((cls) => {
        const classStats = stats.byClass.find(s => s.class === cls) || { waiting: 0, called: 0, finished: 0 }
        return {
            class: cls,
            waiting: classStats.waiting || 0,
            called: classStats.called || 0,
            finished: classStats.finished || 0,
            total: (classStats.waiting || 0) + (classStats.called || 0) + (classStats.finished || 0)
        }
    })

    const pieData = [
        { name: 'Menunggu', value: stats.totals.waiting, color: '#F59E0B' },
        { name: 'Dipanggil', value: stats.totals.called, color: '#6366F1' },
        { name: 'Selesai', value: stats.totals.finished, color: '#10B981' },
    ].filter(d => d.value > 0)

    const handleAddAnnouncement = () => {
        if (!newAnnouncement.trim()) {
            toast.error('Pengumuman tidak boleh kosong')
            return
        }
        addAnnouncement(newAnnouncement.trim())
        toast.success('Pengumuman berhasil ditambahkan')
        setNewAnnouncement('')
        setModalOpen(false)
    }

    const handleBroadcast = (announcement) => {
        socketService.broadcastAnnouncement(announcement.text)
        toast.success('Pengumuman dikirim ke TV Display!')
    }

    const formatActivityTime = (activity) => {
        const time = activity.finished_time || activity.called_time || activity.check_in_time
        return new Date(time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }

    const getActivityLabel = (activity) => {
        if (activity.status === 'FINISHED') return 'Selesai'
        if (activity.status === 'CALLED') return 'Dipanggil'
        return 'Check-in'
    }

    const getActivityColor = (activity) => {
        if (activity.status === 'FINISHED') return 'success'
        if (activity.status === 'CALLED') return 'warning'
        return 'info'
    }

    return (
        <div className="dashboard">
            <h1 className="page-title">Dashboard</h1>

            {/* Stats Cards */}
            <div className="stats-grid">
                <Card className="stat-card stat-card--primary">
                    <div className="stat-card__icon">
                        <Users size={24} />
                    </div>
                    <div className="stat-card__content">
                        <span className="stat-card__value">{totalStudents}</span>
                        <span className="stat-card__label">Total Siswa</span>
                    </div>
                </Card>

                <Card className="stat-card stat-card--warning">
                    <div className="stat-card__icon">
                        <ClipboardList size={24} />
                    </div>
                    <div className="stat-card__content">
                        <span className="stat-card__value">{stats.totals.total}</span>
                        <span className="stat-card__label">Antrian Hari Ini</span>
                    </div>
                </Card>

                <Card className="stat-card stat-card--info">
                    <div className="stat-card__icon">
                        <Clock size={24} />
                    </div>
                    <div className="stat-card__content">
                        <span className="stat-card__value">{stats.totals.waiting}</span>
                        <span className="stat-card__label">Menunggu</span>
                    </div>
                </Card>

                <Card className="stat-card stat-card--success">
                    <div className="stat-card__icon">
                        <CheckCircle size={24} />
                    </div>
                    <div className="stat-card__content">
                        <span className="stat-card__value">{stats.totals.finished}</span>
                        <span className="stat-card__label">Selesai</span>
                    </div>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="charts-row">
                {/* Bar Chart - Antrian per Kelas */}
                <Card title="Statistik Antrian per Kelas" className="class-stats-card">
                    {classData.some(d => d.total > 0) ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={classData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="class" tick={{ fill: '#6B7280' }} />
                                <YAxis tick={{ fill: '#6B7280' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="waiting" name="Menunggu" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="finished" name="Selesai" fill="#10B981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-chart">
                            <Clock size={48} />
                            <p>Belum ada data antrian hari ini</p>
                        </div>
                    )}
                </Card>

                {/* Recent Activity */}
                <Card title="Aktivitas Terbaru" icon={Activity} className="activity-card">
                    <div className="activity-list">
                        {activities.length === 0 ? (
                            <div className="empty-activity">
                                <Activity size={32} />
                                <p>Belum ada aktivitas hari ini</p>
                            </div>
                        ) : (
                            activities.map(activity => (
                                <div key={activity.id} className="activity-item">
                                    <div className={`activity-item__badge activity-item__badge--${getActivityColor(activity)}`}>
                                        {getActivityLabel(activity)}
                                    </div>
                                    <div className="activity-item__info">
                                        <span className="activity-item__name">{activity.student_name}</span>
                                        <span className="activity-item__class">Kelas {activity.class}</span>
                                    </div>
                                    <span className="activity-item__time">{formatActivityTime(activity)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* Announcement Section */}
            <div className="mb-6">
                <Card title="Pengumuman TV Display" subtitle="Kelola pengumuman yang akan ditampilkan di TV">
                    <AnnouncementSettings />
                </Card>
            </div>
        </div>
    )
}
