import { Users, ClipboardList, Clock, CheckCircle, Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui-new/card'
import { Badge } from '@/components/ui-new/badge'
import { useSettings } from '../../context/SettingsContext.jsx'
import { socketService } from '../../services/socket.js'
import { queueApi, studentsApi } from '../../services/api.js'
import { useState, useEffect } from 'react'
import AnnouncementSettings from '../../components/admin/AnnouncementSettings.jsx'

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function Dashboard() {
    const { settings } = useSettings()
    const [stats, setStats] = useState({
        totals: { waiting: 0, called: 0, finished: 0, total: 0 },
        byClass: []
    })
    const [totalStudents, setTotalStudents] = useState(0)
    const [activities, setActivities] = useState([])

    useEffect(() => {
        socketService.connect()
        socketService.register('admin')
    }, [])

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

    const formatActivityTime = (activity) => {
        const time = activity.finished_time || activity.called_time || activity.check_in_time
        return new Date(time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }

    const getActivityLabel = (activity) => {
        if (activity.status === 'FINISHED') return 'Selesai'
        if (activity.status === 'CALLED') return 'Dipanggil'
        return 'Check-in'
    }

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white hover-lift animate-fade-in">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">Total Siswa</p>
                                <p className="text-4xl font-bold mt-2">{totalStudents}</p>
                            </div>
                            <Users className="w-12 h-12 opacity-80" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white hover-lift animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">Antrian Hari Ini</p>
                                <p className="text-4xl font-bold mt-2">{stats.totals.total}</p>
                            </div>
                            <ClipboardList className="w-12 h-12 opacity-80" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white hover-lift animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">Menunggu</p>
                                <p className="text-4xl font-bold mt-2">{stats.totals.waiting}</p>
                            </div>
                            <Clock className="w-12 h-12 opacity-80" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white hover-lift animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">Selesai</p>
                                <p className="text-4xl font-bold mt-2">{stats.totals.finished}</p>
                            </div>
                            <CheckCircle className="w-12 h-12 opacity-80" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bar Chart */}
                <Card className="lg:col-span-2 animate-slide-in">
                    <CardHeader>
                        <CardTitle>Statistik Antrian per Kelas</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                            <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                                <Clock size={48} className="mb-4" />
                                <p>Belum ada data antrian hari ini</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="animate-slide-in" style={{ animationDelay: '0.2s' }}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity size={20} />
                            Aktivitas Terbaru
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-[280px] overflow-y-auto">
                            {activities.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                                    <Activity size={32} className="mb-2" />
                                    <p className="text-sm">Belum ada aktivitas</p>
                                </div>
                            ) : (
                                activities.map(activity => (
                                    <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 smooth-transition">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{activity.student_name}</p>
                                            <p className="text-xs text-muted-foreground">Kelas {activity.class}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={activity.status === 'FINISHED' ? 'success' : 'warning'}>
                                                {getActivityLabel(activity)}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">{formatActivityTime(activity)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Announcement Section */}
            <Card className="animate-scale-in">
                <CardHeader>
                    <CardTitle>Pengumuman TV Display</CardTitle>
                    <p className="text-sm text-muted-foreground">Kelola pengumuman yang akan ditampilkan di TV</p>
                </CardHeader>
                <CardContent>
                    <AnnouncementSettings />
                </CardContent>
            </Card>
        </div>
    )
}
