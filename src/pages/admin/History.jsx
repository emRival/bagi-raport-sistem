import { useState, useEffect } from 'react'
import { History as HistoryIcon, Search, Clock, CheckCircle, XCircle, Phone, Filter } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { queueApi } from '../../services/api.js'
import './History.css'

export default function History() {
    const { settings } = useSettings()
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [classFilter, setClassFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const limit = 20

    const classes = settings.classes

    useEffect(() => {
        fetchHistory()
    }, [classFilter, page])

    const fetchHistory = async () => {
        try {
            setLoading(true)
            const params = { limit, offset: (page - 1) * limit }
            if (classFilter !== 'all') params.class = classFilter

            const result = await queueApi.getHistory(params)
            setHistory(result.data)
            setTotal(result.total)
        } catch (error) {
            console.error('Error fetching history:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredHistory = statusFilter === 'all'
        ? history
        : history.filter(h => h.status === statusFilter)

    const getStatusBadge = (status) => {
        switch (status) {
            case 'WAITING': return { label: 'Menunggu', color: 'warning' }
            case 'CALLED': return { label: 'Dipanggil', color: 'info' }
            case 'FINISHED': return { label: 'Selesai', color: 'success' }
            case 'SKIPPED': return { label: 'Dilewati', color: 'danger' }
            default: return { label: status, color: 'default' }
        }
    }

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
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
            <h1 className="page-title">
                <HistoryIcon size={28} />
                <span>Riwayat Antrian</span>
            </h1>

            {/* Filters */}
            <Card className="filter-card">
                <div className="filters">
                    <div className="filter-group">
                        <Filter size={18} />
                        <select
                            value={classFilter}
                            onChange={(e) => { setClassFilter(e.target.value); setPage(1) }}
                            className="filter-select"
                        >
                            <option value="all">Semua Kelas</option>
                            {classes.map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">Semua Status</option>
                            <option value="WAITING">Menunggu</option>
                            <option value="CALLED">Dipanggil</option>
                            <option value="FINISHED">Selesai</option>
                            <option value="SKIPPED">Dilewati</option>
                        </select>
                    </div>

                    <div className="filter-info">
                        Total: <strong>{total}</strong> data
                    </div>
                </div>
            </Card>

            {/* History Table */}
            <Card>
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner" />
                        <p>Memuat data...</p>
                    </div>
                ) : (
                    <>
                        <div className="table-container">
                            <table className="history-table">
                                <thead>
                                    <tr>
                                        <th>Tanggal</th>
                                        <th>NIS</th>
                                        <th>Nama Siswa</th>
                                        <th>Kelas</th>
                                        <th>Check-in</th>
                                        <th>Dipanggil</th>
                                        <th>Selesai</th>
                                        <th>Telepon</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" className="empty-row">
                                                Tidak ada data riwayat
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredHistory.map(item => {
                                            const status = getStatusBadge(item.status)
                                            return (
                                                <tr key={item.id}>
                                                    <td>{formatDate(item.date)}</td>
                                                    <td>{item.nis}</td>
                                                    <td className="student-name">{item.name}</td>
                                                    <td><span className="class-badge">{item.class}</span></td>
                                                    <td>{formatTime(item.check_in_time)}</td>
                                                    <td>{formatTime(item.called_time)}</td>
                                                    <td>{formatTime(item.finished_time)}</td>
                                                    <td>
                                                        {item.parent_phone ? (
                                                            <span className="phone-badge">
                                                                <Phone size={12} />
                                                                {item.parent_phone}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td>
                                                        <span className={`status-badge status-badge--${status.color}`}>
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="pagination-btn"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    ← Sebelumnya
                                </button>
                                <span className="pagination-info">
                                    Halaman {page} dari {totalPages}
                                </span>
                                <button
                                    className="pagination-btn"
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Selanjutnya →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </Card>
        </div>
    )
}
