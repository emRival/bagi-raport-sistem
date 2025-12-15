import { useState, useEffect } from 'react'
import { CheckCircle, Phone, ArrowLeft, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { queueApi } from '../../services/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui-new/card'
import { Button } from '@/components/ui-new/button'
import { Badge } from '@/components/ui-new/badge'
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
import TeacherHeader from '../../components/layout/TeacherHeader.jsx'

const ITEMS_PER_PAGE = 20

export default function TeacherHistory() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const toast = useToast()
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const className = user?.assignedClass || '7A'

    useEffect(() => {
        fetchHistory()
    }, [page])

    const fetchHistory = async () => {
        try {
            setLoading(true)
            const params = {
                limit: ITEMS_PER_PAGE,
                offset: (page - 1) * ITEMS_PER_PAGE,
                class: className,
                status: 'FINISHED'
            }
            const result = await queueApi.getHistory(params)
            setHistory(result.data)
            setTotal(result.total)
        } catch (error) {
            console.error('Error fetching history:', error)
        } finally {
            setLoading(false)
        }
    }

}

const handleUndo = async (item) => {
    if (!confirm(`Kembalikan ${item.name} ke antrian?`)) return

    try {
        await queueApi.cancelCall(item.id)
        setHistory(history.filter(h => h.id !== item.id))
        setTotal(t => t - 1)
        toast.success(`${item.name} dikembalikan ke antrian`)
    } catch (error) {
        console.error('Error undoing:', error)
        toast.error('Gagal mengembalikan ke antrian')
    }
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
    <div className="min-h-screen bg-slate-50">
        <TeacherHeader
            title="Riwayat Selesai"
            subtitle={`Kelas ${className}`}
        />

        <main className="p-4 sm:p-6 space-y-4 animate-fade-in">
            {/* Back Button */}
            <Button
                variant="outline"
                onClick={() => navigate('/teacher/queue')}
                icon={ArrowLeft}
            >
                Kembali ke Antrian
            </Button>

            {/* History Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Siswa Selesai ({total})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Siswa</TableHead>
                                    <TableHead className="hidden sm:table-cell">Check-in</TableHead>
                                    <TableHead className="hidden md:table-cell">Dipanggil</TableHead>
                                    <TableHead>Selesai</TableHead>
                                    <TableHead className="hidden lg:table-cell">Wali Murid</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                <span className="text-muted-foreground">Memuat data...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : history.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12">
                                            <CheckCircle className="w-12 h-12 mx-auto text-green-500 opacity-20 mb-3" />
                                            <p className="text-muted-foreground">Belum ada riwayat siswa selesai</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    history.map(item => (
                                        <TableRow key={item.id} className="hover:bg-muted/50 smooth-transition">
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{item.name}</p>
                                                    <p className="text-xs text-muted-foreground">#{item.queue_number || '-'}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                                                {formatTime(item.check_in_time)}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                                {formatTime(item.called_time)}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium">
                                                {formatTime(item.finished_time)}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <div className="text-sm">
                                                    <p className="font-medium">{item.parent_name || '-'}</p>
                                                    {item.parent_phone && (
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                            <Phone className="w-3 h-3" />
                                                            {item.parent_phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">
                                                    Selesai
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleUndo(item)}
                                                    title="Kembalikan ke antrian"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-orange-600"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
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
                                Halaman {page} dari {totalPages} • Total {total} siswa
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
        </main>
    </div>
)
}
