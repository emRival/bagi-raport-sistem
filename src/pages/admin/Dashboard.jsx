import { Users, ClipboardList, Clock, CheckCircle, Activity, Wifi, WifiOff } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui-new/card'
import { Badge } from '@/components/ui-new/badge'
import { useSettings } from '../../context/SettingsContext.jsx'
import { socketService } from '../../services/socket.js'
import { queueApi, studentsApi } from '../../services/api.js'
import { useState, useEffect, useCallback } from 'react'
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
    const [onlineTeachers, setOnlineTeachers] = useState([])

    // Fetch data function
    const fetchData = useCallback(async () => {
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
    }, [])

    // Connect socket and register as admin
    useEffect(() => {
        socketService.connect()
        socketService.register('admin')
    }, [])

    // Listen for realtime updates via socket
    useEffect(() => {
        const socket = socketService.getSocket()
        if (!socket) return

        // Listen for queue updates -> refresh stats
        const handleQueueUpdate = () => {
            fetchData()
        }

        // Listen for teacher online status
        const handleTeachersOnline = (teachers) => {
            setOnlineTeachers(teachers || [])
        }

        // Listen for student events
        const handleStudentCalled = () => fetchData()
        const handleStudentFinished = () => fetchData()

        socket.on('queue-updated', handleQueueUpdate)
        socket.on('teachers-online', handleTeachersOnline)
        socket.on('student-called', handleStudentCalled)
        socket.on('student-finished', handleStudentFinished)

        return () => {
            socket.off('queue-updated', handleQueueUpdate)
            socket.off('teachers-online', handleTeachersOnline)
            socket.off('student-called', handleStudentCalled)
            socket.off('student-finished', handleStudentFinished)
        }
    }, [fetchData])

    // Initial fetch and backup polling (reduced interval)
    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 60000) // Backup poll every 60s
        return () => clearInterval(interval)
    }, [fetchData])

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
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between min-h-[48px]">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-1">Ringkasan sistem antrian</p>
                </div>
            </div>

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

            {/* Teacher Online Status */}
            <Card className="animate-slide-in" style={{ animationDelay: '0.3s' }}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Wifi size={18} className="sm:w-5 sm:h-5 text-green-500" />
                        Guru Online
                        <Badge className="ml-2 bg-green-100 text-green-700">{onlineTeachers.length} aktif</Badge>
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Status guru wali kelas yang sedang aktif dalam sistem
                    </p>
                </CardHeader>
                <CardContent>
                    {onlineTeachers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <WifiOff size={32} className="mb-3 opacity-50" />
                            <p className="text-sm">Tidak ada guru yang sedang online</p>
                            <p className="text-xs mt-1">Guru akan muncul saat mereka membuka halaman antrian</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {onlineTeachers.map((teacher, index) => (
                                <div
                                    key={`${teacher.id}-${index}`}
                                    className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 smooth-transition"
                                >
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                                            {teacher.name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{teacher.name}</p>
                                        <p className="text-xs text-green-700">Kelas {teacher.className}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

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
    )
}
