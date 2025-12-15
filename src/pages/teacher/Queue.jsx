import { useState, useEffect, useRef } from 'react'
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
    History as HistoryIcon
} from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import TeacherHeader from '../../components/layout/TeacherHeader.jsx'
import './Queue.css'

export default function Queue() {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const toast = useToast()
    const [queue, setQueue] = useState([])
    const [loading, setLoading] = useState({})
    const [connected, setConnected] = useState(false)

    const className = user?.assignedClass || '7A'
    // Filter out FINISHED status from the main view
    const waitingQueue = queue.filter(q => q.status === 'WAITING')
    const calledQueue = queue.filter(q => q.status === 'CALLED')
    // We can also have a separate list for finished if needed, but for now just exclude them from these lists which populate the UI
    const finishedQueue = queue.filter(q => q.status === 'FINISHED')

    // Fetch queue from API
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

        // WebSocket connection
        socketService.connect()
        socketService.register({ role: 'teacher', className })
    }, [className]) // Re-run if className changes

    useEffect(() => {
        const unsubConnect = socketService.on('connect', () => {
            setConnected(true)
            socketService.register({ role: 'teacher', className })
        })

        const unsubDisconnect = socketService.on('disconnect', () => {
            setConnected(false)
        })

        // Listen for updates
        const unsubCalled = socketService.on('student-called', () => {
            fetchQueue()
        })

        // Listen for new check-ins potentially? Backend might not emit queue-updated but lets handle it if it does
        // Or if we need to listen to generic updates.
        // Based on previous code, we just poll. But let's keep polling + event listening.

        // Refresh queue periodically
        const interval = setInterval(fetchQueue, 30000)

        return () => {
            unsubConnect()
            unsubDisconnect()
            unsubCalled()
            clearInterval(interval)
        }
    }, [className])

    const handleCall = async (item) => {
        setLoading({ ...loading, [item.id]: 'call' })
        try {
            const result = await queueApi.call(item.id)

            // Update local state
            setQueue(queue.map(q =>
                q.id === item.id ? { ...q, status: 'CALLED' } : q
            ))

            // Broadcast via WebSocket for TV Display
            if (result.broadcast) {
                socketService.callStudent(result.broadcast.studentName, result.broadcast.className)
            }

            toast.success(`Memanggil ${item.name} `)
        } catch (error) {
            toast.error('Gagal memanggil: ' + error.message)
        } finally {
            setLoading({ ...loading, [item.id]: null })
        }
    }

    const handleRecall = async (item) => {
        // Use call API again to trigger WA and update status/time
        setLoading({ ...loading, [item.id]: 'call' })
        try {
            const result = await queueApi.call(item.id)

            // Broadcast via WebSocket
            if (result.broadcast) {
                socketService.callStudent(result.broadcast.studentName, result.broadcast.className)
            }
            toast.success(`Memanggil ulang ${item.name} `)
        } catch (error) {
            toast.error('Gagal memanggil ulang: ' + error.message)
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
            // For teacher page, manual notification should always use 'call' template (Panggilan)
            // regardless of status, as the teacher intends to notify/call the parent.
            const type = 'call'
            await queueApi.notify(item.id, type)
            toast.success(`Notifikasi Panggilan dikirim ke ${item.name} `)
        } catch (error) {
            toast.error('Gagal kirim notifikasi: ' + error.message)
        } finally {
            setLoading({ ...loading, [item.id]: null })
        }
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div className="queue-page">
            {/* Header */}
            {/* Header */}
            <TeacherHeader
                subtitle={`Kelas ${className}`}
            />

            <main className="queue-main">
                {/* Stats */}
                <div className="queue-stats">
                    <div className="stat-card stat-card--waiting">
                        <div className="stat-icon-wrapper">
                            <Clock />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{waitingQueue.length}</span>
                            <span className="stat-label">Menunggu</span>
                        </div>
                    </div>
                    <div className="stat-card stat-card--called">
                        <div className="stat-icon-wrapper">
                            <CheckCircle />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{calledQueue.length}</span>
                            <span className="stat-label">Dipanggil</span>
                        </div>
                    </div>
                </div>

                {/* Queue List */}
                <div className="queue-list-header">
                    <h2 className="section-title">Daftar Antrian ({waitingQueue.length + calledQueue.length})</h2>
                    <button
                        className="history-btn"
                        onClick={() => navigate('/teacher/history')}
                    >
                        <HistoryIcon size={16} />
                        <span>Riwayat Selesai</span>
                    </button>
                </div>

                <div className="queue-list">
                    {queue.filter(q => q.status !== 'FINISHED').length === 0 ? (
                        <div className="queue-empty">
                            <CheckCircle size={48} />
                            <p>Tidak ada antrian aktif untuk kelas {className}</p>
                            <small>Siswa akan muncul setelah check-in oleh satpam</small>
                        </div>
                    ) : (
                        queue.filter(q => q.status !== 'FINISHED').map((item, index) => (
                            <div
                                key={item.id}
                                className={`queue-card ${item.status === 'CALLED' ? 'queue-card--called' : ''}`}
                            >
                                <div className="queue-card__number">
                                    #{item.queue_number}
                                </div>
                                <div className="queue-card__info">
                                    <h3 className="queue-card__name">{item.name}</h3>
                                    <div className="queue-card__details">
                                        <div className="detail-item">
                                            <Phone size={14} />
                                            <span>{item.parent_phone || '-'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <Clock size={14} />
                                            <span>{new Date(item.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        {item.status === 'CALLED' && (
                                            <div className="detail-item" style={{ color: 'var(--success-600)', fontWeight: 600 }}>
                                                <Volume2 size={14} />
                                                <span>DIPANGGIL</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="queue-card__actions">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        icon={MessageSquare}
                                        onClick={() => handleNotify(item)}
                                        loading={loading[item.id] === 'notify'}
                                        disabled={loading[item.id]}
                                        title="Kirim WA Manual"
                                    >
                                        WA
                                    </Button>

                                    {item.status === 'WAITING' ? (
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            icon={Volume2}
                                            onClick={() => handleCall(item)}
                                            loading={loading[item.id] === 'call'}
                                            disabled={loading[item.id]}
                                        >
                                            Panggil
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                icon={RotateCcw}
                                                onClick={() => handleRecall(item)}
                                                loading={loading[item.id] === 'call'}
                                                disabled={loading[item.id]}
                                            >
                                                Ulang
                                            </Button>
                                            <Button
                                                variant="success"
                                                size="sm"
                                                icon={Check}
                                                onClick={() => handleFinish(item)}
                                                loading={loading[item.id] === 'finish'}
                                                disabled={loading[item.id]}
                                            >
                                                Selesai
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    )
}
