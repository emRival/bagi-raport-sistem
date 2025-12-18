import { useState, useEffect } from 'react'
import { History as HistoryIcon, Search, Clock, CheckCircle, XCircle, Phone, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui-new/card'
import { Badge } from '@/components/ui-new/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui-new/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui-new/table'
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui-new/pagination'
import { useSettings } from '../../context/SettingsContext.jsx'
import { queueApi } from '../../services/api.js'

const ITEMS_PER_PAGE = 20

export default function History() {
    const { settings } = useSettings()
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [classFilter, setClassFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)

    const classes = settings.classes

    useEffect(() => {
        fetchHistory()
    }, [classFilter, page])

    const fetchHistory = async () => {
        try {
            setLoading(true)
            const params = { limit: ITEMS_PER_PAGE, offset: (page - 1) * ITEMS_PER_PAGE }
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
        const configs = {
            'WAITING': { label: 'Menunggu', className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
            'CALLED': { label: 'Dipanggil', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
            'FINISHED': { label: 'Selesai', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
            'SKIPPED': { label: 'Dilewati', className: 'bg-red-100 text-red-700 hover:bg-red-100' }
        }
        const config = configs[status] || { label: status, className: '' }

        return (
            <Badge className={`${config.className} border-0`}>
                {config.label}
            </Badge>
        )
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

    const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between min-h-[48px]">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Riwayat Antrian</h1>
                    <p className="text-sm text-muted-foreground mt-1">{total} total entri</p>
                </div>
            </div>

            {/* Filters Card */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Select value={classFilter} onValueChange={(value) => { setClassFilter(value); setPage(1) }}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Filter Kelas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Kelas</SelectItem>
                                {classes.map(cls => (
                                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Filter Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="WAITING">Menunggu</SelectItem>
                                <SelectItem value="CALLED">Dipanggil</SelectItem>
                                <SelectItem value="FINISHED">Selesai</SelectItem>
                                <SelectItem value="SKIPPED">Dilewati</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* History Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Daftar Riwayat</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>NIS</TableHead>
                                    <TableHead>Nama Siswa</TableHead>
                                    <TableHead>Kelas</TableHead>
                                    <TableHead className="hidden md:table-cell">Check-in</TableHead>
                                    <TableHead className="hidden md:table-cell">Dipanggil</TableHead>
                                    <TableHead className="hidden lg:table-cell">Selesai</TableHead>
                                    <TableHead className="hidden lg:table-cell">Telepon</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                <span className="text-muted-foreground">Memuat data...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredHistory.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                            Tidak ada data riwayat
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredHistory.map(item => (
                                        <TableRow key={item.id} className="hover:bg-muted/50 smooth-transition">
                                            <TableCell className="text-sm">{formatDate(item.date)}</TableCell>
                                            <TableCell className="font-mono text-sm">{item.nis}</TableCell>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{item.class}</Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                                {formatTime(item.check_in_time)}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                                {formatTime(item.called_time)}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                                                {formatTime(item.finished_time)}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                                                {item.parent_phone ? (
                                                    <div className="flex items-center gap-1">
                                                        <Phone className="w-3 h-3" />
                                                        {item.parent_phone}
                                                    </div>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>

                {/* Pagination */}
                {totalPages > 1 && !loading && (
                    <CardContent className="p-4 border-t">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-muted-foreground">
                                Halaman {page} dari {totalPages} • Total {total} entri
                            </p>
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                        />
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationLink isActive className="cursor-default">
                                            {page}
                                        </PaginationLink>
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    )
}
