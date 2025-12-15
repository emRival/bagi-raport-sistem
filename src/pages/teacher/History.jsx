import { useState, useEffect } from 'react'
import { History as HistoryIcon, Search, Clock, CheckCircle, XCircle, Phone, ArrowLeft, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { queueApi } from '../../services/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import TeacherHeader from '../../components/layout/TeacherHeader.jsx'
import './History.css'

export default function TeacherHistory() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const limit = 20
    const className = user?.assignedClass || '7A'

    useEffect(() => {
        fetchHistory()
    }, [page])

    const fetchHistory = async () => {
        try {
            setLoading(true)
            // Force filter by teacher's class
            const params = { limit, offset: (page - 1) * limit, class: className, status: 'FINISHED' }

            const result = await queueApi.getHistory(params)
            setHistory(result.data)
            setTotal(result.total)
        } catch (error) {
            console.error('Error fetching history:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatTime = (dateStr) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const totalPages = Math.ceil(total / limit)

    return (
        <div className="history-page">
            <TeacherHeader
                title={`Riwayat Selesai`}
                subtitle={`Kelas ${className}`}
            />

            <div className="history-container">
                <div className="history-toolbar">
                    <button
                        className="back-btn"
                        onClick={() => navigate('/teacher/queue')}
                        title="Kembali ke Antrian"
                    >
                        <ArrowLeft size={20} />
                        <span style={{ marginLeft: '8px', fontSize: '14px', fontWeight: 500 }}>Kembali</span>
                    </button>
                </div>

                <div className="history-card">
                    {loading ? (
                        <div className="history-empty">
                            <div className="loading-spinner" />
                            <p>Memuat data...</p>
                        </div>
                    ) : (
                        <>
                            <div className="table-responsive">
                                <table className="history-table">
                                    <thead>
                                        <tr>
                                            <th>Siswa</th>
                                            <th>Check-in</th>
                                            <th>Dipanggil</th>
                                            <th>Selesai</th>
                                            <th>Wali Murid</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.length === 0 ? (
                                            <tr>
                                                <td colSpan="6">
                                                    <div className="history-empty">
                                                        <CheckCircle size={48} style={{ opacity: 0.2 }} />
                                                        <p>Belum ada riwayat siswa selesai hari ini</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            history.map(item => (
                                                <tr key={item.id}>
                                                    <td>
                                                        <div className="student-name">{item.name}</div>
                                                        <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                                                            #{item.queue_number || '-'}
                                                        </div>
                                                    </td>
                                                    <td>{formatTime(item.check_in_time)}</td>
                                                    <td>{formatTime(item.called_time)}</td>
                                                    <td>{formatTime(item.finished_time)}</td>
                                                    <td>
                                                        <div className="parent-info">
                                                            <span>{item.parent_name || '-'}</span>
                                                            {item.parent_phone && (
                                                                <div className="parent-phone">
                                                                    <Phone size={10} />
                                                                    {item.parent_phone}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="status-badge status-badge--success">
                                                            Selesai
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button
                                        className="pagination-btn"
                                        disabled={page === 1}
                                        onClick={() => setPage(p => p - 1)}
                                    >
                                        &larr; Sebelumnya
                                    </button>
                                    <span className="pagination-info">
                                        Hal. {page} / {totalPages}
                                    </span>
                                    <button
                                        className="pagination-btn"
                                        disabled={page === totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                    >
                                        Selanjutnya &rarr;
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
