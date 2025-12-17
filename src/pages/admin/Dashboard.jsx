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
        <div className="min-h-screen w-full overflow-x-hidden bg-slate-50">
            <div className="w-full max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
                <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>

                {/* Stats Grid - Mobile First */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
                    <Card className="w-full bg-gradient-to-br from-blue-500 to-blue-600 text-white animate-fade-in">
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-xs sm:text-sm opacity-90">Total Siswa</p>
                                    <p className="text-2xl sm:text-4xl font-bold mt-1 sm:mt-2">{totalStudents}</p>
                                </div>
                                <Users className="w-8 h-8 sm:w-12 sm:h-12 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="w-full bg-gradient-to-br from-purple-500 to-purple-600 text-white animate-fade-in">
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-xs sm:text-sm opacity-90">Antrian Hari Ini</p>
                                    <p className="text-2xl sm:text-4xl font-bold mt-1 sm:mt-2">{stats.totals?.total ?? 0}</p>
                                </div>
                                <ClipboardList className="w-8 h-8 sm:w-12 sm:h-12 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="w-full bg-gradient-to-br from-yellow-500 to-orange-500 text-white animate-fade-in">
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-xs sm:text-sm opacity-90">Menunggu</p>
                                    <p className="text-2xl sm:text-4xl font-bold mt-1 sm:mt-2">{stats.totals?.waiting ?? 0}</p>
                                </div>
                                <Clock className="w-8 h-8 sm:w-12 sm:h-12 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="w-full bg-gradient-to-br from-green-500 to-emerald-600 text-white animate-fade-in">
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-xs sm:text-sm opacity-90">Selesai</p>
                                    <p className="text-2xl sm:text-4xl font-bold mt-1 sm:mt-2">{stats.totals?.finished ?? 0}</p>
                                </div>
                                <CheckCircle className="w-8 h-8 sm:w-12 sm:h-12 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Row - Stack on Mobile */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
                    {/* Bar Chart - Mobile Optimized */}
                    <Card className="lg:col-span-2 animate-slide-in overflow-hidden">
                        <CardHeader>
                            <CardTitle className="text-base sm:text-lg">Statistik Antrian per Kelas</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 sm:p-6">
                            {classData.some(d => d.total > 0) ? (
                                <div className="w-full overflow-x-auto -mx-2 sm:mx-0">
                                    <div className="min-w-[400px]">
                                        <ResponsiveContainer width="100%" height={250}>
                                            <BarChart data={classData} margin={{ top: 10, right: 5, left: -20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                                <XAxis dataKey="class" tick={{ fill: '#6B7280', fontSize: 11 }} />
                                                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'white',
                                                        border: '1px solid #E5E7EB',
                                                        borderRadius: '8px',
                                                        fontSize: '11px'
                                                    }}
                                                />
                                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                                <Bar dataKey="waiting" name="Menunggu" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="finished" name="Selesai" fill="#10B981" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[250px] sm:h-[280px] text-muted-foreground">
                                    <Clock size={32} className="sm:w-12 sm:h-12 mb-3 sm:mb-4" />
                                    <p className="text-sm sm:text-base">Belum ada data antrian hari ini</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Activity - Mobile Optimized */}
                    <Card className="animate-slide-in" style={{ animationDelay: '0.2s' }}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <Activity size={18} className="sm:w-5 sm:h-5" />
                                Aktivitas Terbaru
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 sm:space-y-3 max-h-[250px] sm:max-h-[280px] overflow-y-auto">
                                {activities.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-[180px] sm:h-[200px] text-muted-foreground">
                                        <Activity size={24} className="sm:w-8 sm:h-8 mb-2" />
                                        <p className="text-xs sm:text-sm">Belum ada aktivitas</p>
                                    </div>
                                ) : (
                                    activities.map(activity => (
                                        <div key={activity.id} className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg hover:bg-muted/50 smooth-transition gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-xs sm:text-sm truncate">{activity.student_name}</p>
                                                <p className="text-xs text-muted-foreground">Kelas {activity.class}</p>
                                            </div>
                                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                                <Badge variant={activity.status === 'FINISHED' ? 'success' : 'warning'} className="text-xs">
                                                    {getActivityLabel(activity)}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatActivityTime(activity)}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Announcement Section - Mobile Optimized */}
                <Card className="animate-scale-in">
                    <CardHeader>
                        <CardTitle className="text-base sm:text-lg">Pengumuman TV Display</CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground">Kelola pengumuman yang akan ditampilkan di TV</p>
                    </CardHeader>
                    <CardContent>
                        <AnnouncementSettings />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
