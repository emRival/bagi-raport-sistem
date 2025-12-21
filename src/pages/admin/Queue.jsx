import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { socketService } from '../../services/socket.js'
import { queueApi } from '../../services/api.js'
import {
    Clock,
    CheckCircle,
    Phone,
    Volume2,
    RotateCcw,
    Check,
    MessageSquare,
    XCircle,
    Users,
    Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui-new/card'
import { Button } from '@/components/ui-new/button'
import { Badge } from '@/components/ui-new/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui-new/select'

export default function AdminQueue() {
    const { user } = useAuth()
    const { settings } = useSettings()
    const toast = useToast()
    const [queue, setQueue] = useState([])
    const [loading, setLoading] = useState({})
    const [selectedClass, setSelectedClass] = useState('all')

    const classes = settings.classes || []

    // Filter queue by selected class
    const filteredQueue = selectedClass === 'all'
        ? queue
        : queue.filter(q => q.class === selectedClass)

    const waitingQueue = filteredQueue.filter(q => q.status === 'WAITING')
    const calledQueue = filteredQueue.filter(q => q.status === 'CALLED')

    const fetchQueue = async () => {
        try {
            const params = selectedClass !== 'all' ? { class: selectedClass } : {}
            const data = await queueApi.getQueue(params)
            setQueue(data)
        } catch (error) {
            console.error('Error fetching queue:', error)
        }
    }

    useEffect(() => {
        fetchQueue()
    }, [selectedClass])

    useEffect(() => {
        socketService.connect()
        socketService.register('admin')

        const unsubCalled = socketService.on('student-called', fetchQueue)
        const unsubFinished = socketService.on('student-finished', fetchQueue)
        const unsubUpdated = socketService.on('queue-updated', fetchQueue)

        const interval = setInterval(fetchQueue, 30000)

        return () => {
            unsubCalled()
            unsubFinished()
            unsubUpdated()
            clearInterval(interval)
        }
    }, [selectedClass])

    const handleCall = async (item) => {
        setLoading({ ...loading, [item.id]: 'call' })
        try {
            const result = await queueApi.call(item.id)
            fetchQueue()
            if (result.broadcast) {
                socketService.callStudent(result.broadcast.studentName, result.broadcast.className)
            }
            toast.success(`Memanggil ${item.name}`)
        } catch (error) {
            toast.error('Gagal memanggil: ' + error.message)
        } finally {
            setLoading({ ...loading, [item.id]: null })
        }
    }

    const handleRecall = async (item) => {
        setLoading({ ...loading, [item.id]: 'recall' })
        try {
            const result = await queueApi.call(item.id)
            if (result.broadcast) {
                socketService.callStudent(result.broadcast.studentName, result.broadcast.className)
            }
            toast.success(`Memanggil ulang ${item.name}`)
        } catch (error) {
            toast.error('Gagal memanggil ulang')
        } finally {
            setLoading({ ...loading, [item.id]: null })
        }
    }

    const handleFinish = async (item) => {
        setLoading({ ...loading, [item.id]: 'finish' })
        try {
            await queueApi.finish(item.id)
            fetchQueue()
            toast.success(`${item.name} selesai`)
        } catch (error) {
            toast.error('Gagal menyelesaikan')
        } finally {
            setLoading({ ...loading, [item.id]: null })
        }
    }

    const handleSkip = async (item) => {
        setLoading({ ...loading, [item.id]: 'skip' })
        try {
            await queueApi.skip(item.id)
            fetchQueue()
            toast.success(`${item.name} dilewati`)
        } catch (error) {
            toast.error('Gagal melewati')
        } finally {
            setLoading({ ...loading, [item.id]: null })
        }
    }

    const handleCancelCall = async (item) => {
        setLoading({ ...loading, [item.id]: 'cancel' })
        try {
            await queueApi.cancelCall(item.id)
            fetchQueue()
            toast.success(`Panggilan ${item.name} dibatalkan`)
        } catch (error) {
            toast.error('Gagal membatalkan panggilan')
        } finally {
            setLoading({ ...loading, [item.id]: null })
        }
    }

    const handleNotify = async (item, type) => {
        setLoading({ ...loading, [item.id]: 'notify' })
        try {
            await queueApi.notify(item.id, type)
            toast.success(`Notifikasi terkirim ke wali ${item.name}`)
        } catch (error) {
            toast.error('Gagal mengirim notifikasi')
        } finally {
            setLoading({ ...loading, [item.id]: null })
        }
    }

    const formatTime = (dateStr) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between min-h-[48px]">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Kelola Antrian</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Admin dapat mengelola antrian semua kelas
                    </p>
                </div>
            </div>

            {/* Filter Card */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <Filter className="w-5 h-5 text-muted-foreground" />
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger className="w-full sm:w-64">
                                <SelectValue placeholder="Pilih Kelas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Kelas</SelectItem>
                                {classes.map(cls => (
                                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex gap-2 ml-auto">
                            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                                <Clock className="w-3 h-3 mr-1" /> {waitingQueue.length} Menunggu
                            </Badge>
                            <Badge variant="outline" className="text-blue-600 border-blue-300">
                                <Phone className="w-3 h-3 mr-1" /> {calledQueue.length} Dipanggil
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Queue Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Waiting Queue */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Clock className="w-5 h-5 text-yellow-500" />
                            Menunggu ({waitingQueue.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {waitingQueue.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Tidak ada antrian menunggu</p>
                            </div>
                        ) : (
                            waitingQueue.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center font-bold text-sm">
                                                {index + 1}
                                            </span>
                                            <div>
                                                <p className="font-semibold">{item.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.class} • NIS: {item.nis}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {formatTime(item.check_in_time)}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <Button
                                            size="sm"
                                            onClick={() => handleCall(item)}
                                            loading={loading[item.id] === 'call'}
                                            icon={Phone}
                                            className="flex-1"
                                        >
                                            Panggil
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleSkip(item)}
                                            loading={loading[item.id] === 'skip'}
                                            icon={XCircle}
                                        >
                                            Skip
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Called Queue */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Phone className="w-5 h-5 text-blue-500" />
                            Dipanggil ({calledQueue.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {calledQueue.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Phone className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Tidak ada yang sedang dipanggil</p>
                            </div>
                        ) : (
                            calledQueue.map((item) => (
                                <div
                                    key={item.id}
                                    className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <p className="font-semibold">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.class} • NIS: {item.nis}
                                            </p>
                                        </div>
                                        <Badge className="bg-blue-100 text-blue-700">
                                            Dipanggil {formatTime(item.called_time)}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        <Button
                                            size="sm"
                                            onClick={() => handleFinish(item)}
                                            loading={loading[item.id] === 'finish'}
                                            icon={CheckCircle}
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                        >
                                            Selesai
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleRecall(item)}
                                            loading={loading[item.id] === 'recall'}
                                            icon={Volume2}
                                        >
                                            Ulang
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleNotify(item, 'call')}
                                            loading={loading[item.id] === 'notify'}
                                            icon={MessageSquare}
                                        >
                                            WA
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleCancelCall(item)}
                                            loading={loading[item.id] === 'cancel'}
                                            icon={RotateCcw}
                                        >
                                            Batal
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
