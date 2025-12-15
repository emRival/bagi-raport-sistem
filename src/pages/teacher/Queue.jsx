import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
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
    History as HistoryIcon,
    XCircle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui-new/card'
import { Button } from '@/components/ui-new/button'
import { Badge } from '@/components/ui-new/badge'
import TeacherHeader from '../../components/layout/TeacherHeader.jsx'

export default function Queue() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const toast = useToast()
    const [queue, setQueue] = useState([])
    const [loading, setLoading] = useState({})
    const [connected, setConnected] = useState(false)

    const className = user?.assignedClass || '7A'
    const waitingQueue = queue.filter(q => q.status === 'WAITING')
    const calledQueue = queue.filter(q => q.status === 'CALLED')

    const fetchQueue = async () => {
        try {
            const data = await queueApi.getQueue({ class: className })
            setQueue(data)
        } catch (error) {
            console.error('Error fetching queue:', error)
        }
    }

    useEffect(() => {
        fetchQueue()
        // Socket connection handled by TeacherLayout
    }, [className])

    useEffect(() => {
        const unsubCalled = socketService.on('student-called', () => {
            fetchQueue()
        })

        const interval = setInterval(fetchQueue, 30000)

        return () => {
            unsubCalled()
            clearInterval(interval)
        }
    }, [className])

    const handleCall = async (item) => {
        setLoading({ ...loading, [item.id]: 'call' })
        try {
            const result = await queueApi.call(item.id)
            setQueue(queue.map(q =>
                q.id === item.id ? { ...q, status: 'CALLED' } : q
            ))
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
        setLoading({ ...loading, [item.id]: 'call' })
        try {
            const result = await queueApi.call(item.id)
            if (result.broadcast) {
                socketService.callStudent(result.broadcast.studentName, result.broadcast.className)
            }
            toast.success(`Memanggil ulang ${item.name}`)
        } catch (error) {
            toast.error('Gagal memanggil ulang: ' + error.message)
        } finally {
            setLoading({ ...loading, [item.id]: null })
        }
    }

    const handleCancelCall = async (item) => {
        setLoading({ ...loading, [item.id]: 'call' })
        try {
            await queueApi.cancelCall(item.id)
            setQueue(queue.map(q =>
                q.id === item.id ? { ...q, status: 'WAITING' } : q
            ))
            toast.success(`Panggilan ${item.name} dibatalkan`)
        } catch (error) {
            toast.error('Gagal membatalkan: ' + error.message)
        } finally {
            setLoading({ ...loading, [item.id]: null })
        }
    }

    const handleFinish = async (item) => {
        setLoading({ ...loading, [item.id]: 'finish' })
        try {
            await queueApi.finish(item.id)
            setQueue(queue.filter(q => q.id !== item.id))
            socketService.finishStudent(item.name, item.class)
            toast.success(`${item.name} selesai`)
        } catch (error) {
            toast.error('Gagal: ' + error.message)
        } finally {
            setLoading({ ...loading, [item.id]: null })
        }
    }

    const handleNotify = async (item) => {
        setLoading({ ...loading, [item.id]: 'notify' })
        try {
            await queueApi.notify(item.id, 'call')
            toast.success(`Notifikasi dikirim ke ${item.name}`)
        } catch (error) {
            toast.error('Gagal kirim notifikasi: ' + error.message)
        } finally {
            setLoading({ ...loading, [item.id]: null })
        }
    }

    const activeQueue = queue.filter(q => q.status !== 'FINISHED')

    return (
        <div className="min-h-screen bg-slate-50">
            <TeacherHeader subtitle={`Kelas ${className}`} />

            <main className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <Card>
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
                                    <Clock className="w-6 h-6 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-2xl sm:text-3xl font-bold text-slate-900">{waitingQueue.length}</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">Menunggu</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl sm:text-3xl font-bold text-slate-900">{calledQueue.length}</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">Dipanggil</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Queue Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-slate-900">
                        Daftar Antrian ({activeQueue.length})
                    </h2>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/teacher/history')}
                        icon={HistoryIcon}
                    >
                        Riwayat
                    </Button>
                </div>

                {/* Queue List */}
                <div className="space-y-3">
                    {activeQueue.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 sm:p-12 text-center">
                                <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-green-500 mb-4" />
                                <p className="text-lg font-medium text-slate-900 mb-2">
                                    Tidak ada antrian aktif
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Siswa kelas {className} akan muncul setelah check-in
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        activeQueue.map((item) => (
                            <Card key={item.id} className={item.status === 'CALLED' ? 'border-blue-300 bg-blue-50/50' : ''}>
                                <CardContent className="p-4">
                                    <div className="flex gap-3 flex-col sm:flex-row">
                                        {/* Queue Number - Smaller on mobile */}
                                        <div className="flex-shrink-0">
                                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                                <span className="text-white font-bold text-lg sm:text-xl">#{item.queue_number}</span>
                                            </div>
                                        </div>

                                        {/* Info - Flex column */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1 truncate">{item.name}</h3>
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground mb-3">
                                                <div className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    <span className="truncate max-w-[120px]">{item.parent_phone || '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span>
                                                        {new Date(item.check_in_time).toLocaleTimeString('id-ID', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                {item.status === 'CALLED' && (
                                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 h-5 text-[10px] px-1.5">
                                                        <Volume2 className="w-3 h-3 mr-1" />
                                                        DIPANGGIL
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Actions - Horizontal on mobile, Vertical on desktop */}
                                            <div className="flex gap-2 sm:hidden">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleNotify(item)}
                                                    loading={loading[item.id] === 'notify'}
                                                    disabled={!!loading[item.id] || !item.parent_phone}
                                                    icon={MessageSquare}
                                                    title={item.parent_phone ? "Kirim WA ke " + item.parent_phone : "Nomor HP tidak tersedia"}
                                                >
                                                    WA
                                                </Button>

                                                {item.status === 'WAITING' ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleCall(item)}
                                                        loading={loading[item.id] === 'call'}
                                                        disabled={!!loading[item.id]}
                                                        icon={Volume2}
                                                        className="flex-1"
                                                    >
                                                        Panggil
                                                    </Button>
                                                ) : (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleCancelCall(item)}
                                                            loading={loading[item.id] === 'call'}
                                                            disabled={!!loading[item.id]}
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                            icon={XCircle}
                                                        >
                                                            Batal
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleRecall(item)}
                                                            loading={loading[item.id] === 'call'}
                                                            disabled={!!loading[item.id]}
                                                            icon={RotateCcw}
                                                        >
                                                            Ulang
                                                        </Button>
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            onClick={() => handleFinish(item)}
                                                            loading={loading[item.id] === 'finish'}
                                                            disabled={!!loading[item.id]}
                                                            icon={Check}
                                                            className="bg-green-600 hover:bg-green-700 flex-1"
                                                        >
                                                            Selesai
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions Desktop - Vertical on right, fixed width */}
                                        <div className="hidden sm:flex flex-col gap-2 w-[120px]">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleNotify(item)}
                                                loading={loading[item.id] === 'notify'}
                                                disabled={!!loading[item.id] || !item.parent_phone}
                                                icon={MessageSquare}
                                                title={item.parent_phone ? "Kirim WA ke " + item.parent_phone : "Nomor HP tidak tersedia"}
                                                className="w-full"
                                            >
                                                WA
                                            </Button>

                                            {item.status === 'WAITING' ? (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleCall(item)}
                                                    loading={loading[item.id] === 'call'}
                                                    disabled={!!loading[item.id]}
                                                    icon={Volume2}
                                                    className="w-full"
                                                >
                                                    Panggil
                                                </Button>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleCancelCall(item)}
                                                        loading={loading[item.id] === 'call'}
                                                        disabled={!!loading[item.id]}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 w-full mb-2"
                                                        icon={XCircle}
                                                    >
                                                        Batal
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRecall(item)}
                                                        loading={loading[item.id] === 'call'}
                                                        disabled={!!loading[item.id]}
                                                        icon={RotateCcw}
                                                        className="w-full"
                                                    >
                                                        Ulang
                                                    </Button>
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        onClick={() => handleFinish(item)}
                                                        loading={loading[item.id] === 'finish'}
                                                        disabled={!!loading[item.id]}
                                                        icon={Check}
                                                        className="bg-green-600 hover:bg-green-700 w-full"
                                                    >
                                                        Selesai
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </main>
        </div>
    )
}
