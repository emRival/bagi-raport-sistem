import { useState, useEffect, useRef } from 'react'
import { Upload, Search, Pencil, Trash2, Download, FileSpreadsheet, Plus, Users as UsersIcon } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui-new/card'
import { Button } from '@/components/ui-new/button'
import { Input } from '@/components/ui-new/input'
import { Badge } from '@/components/ui-new/badge'
import { Checkbox } from '@/components/ui-new/checkbox'
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
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui-new/pagination'
import StudentModal from '../../components/admin/StudentModal.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { studentsApi } from '../../services/api'

const ITEMS_PER_PAGE = 10

export default function Students() {
    const { settings } = useSettings()
    const toast = useToast()
    const [students, setStudents] = useState([])
    const [search, setSearch] = useState('')
    const [classFilter, setClassFilter] = useState('all')
    const [uploading, setUploading] = useState(false)
    const [selectedIds, setSelectedIds] = useState([])
    const [modalOpen, setModalOpen] = useState(false)
    const [editStudent, setEditStudent] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const fileInputRef = useRef(null)

    const classes = settings.classes

    useEffect(() => {
        fetchStudents()
    }, [])

    const fetchStudents = async () => {
        try {
            const data = await studentsApi.getAll()
            setStudents(data)
        } catch (error) {
            console.error('Error fetching students:', error)
        }
    }

    const filteredStudents = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(search.toLowerCase()) ||
            student.nis?.toLowerCase().includes(search.toLowerCase())
        const matchesClass = classFilter === 'all' || student.class === classFilter
        return matchesSearch && matchesClass
    })

    // Pagination logic
    const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const paginatedStudents = filteredStudents.slice(startIndex, endIndex)

    const allSelected = paginatedStudents.length > 0 && paginatedStudents.every(s => selectedIds.includes(s.id))
    const someSelected = selectedIds.length > 0

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [search, classFilter])

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data, { type: 'array' })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]

            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

            const studentsData = jsonData.slice(1)
                .filter(row => row[0] && row[1])
                .map(row => ({
                    nis: String(row[0]).trim(),
                    name: String(row[1]).trim(),
                    class: row[2] ? String(row[2]).trim() : '',
                    parent_name: row[3] ? String(row[3]).trim() : '',
                    parent_phone: row[4] ? String(row[4]).trim() : ''
                }))

            if (studentsData.length === 0) {
                toast.error('File Excel tidak berisi data siswa')
                return
            }

            await studentsApi.import(studentsData)
            toast.success(`${studentsData.length} siswa berhasil diimport`)
            fetchStudents()
        } catch (error) {
            console.error('Import error:', error)
            toast.error('Gagal import: ' + error.message)
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleDelete = async (student) => {
        if (confirm(`Hapus siswa ${student.name}?`)) {
            try {
                await studentsApi.delete(student.id)
                setSelectedIds(selectedIds.filter(id => id !== student.id))
                toast.success('Siswa berhasil dihapus')
                fetchStudents()
            } catch (error) {
                toast.error('Gagal menghapus')
            }
        }
    }

    const handleBulkDelete = async () => {
        if (!confirm(`Hapus ${selectedIds.length} siswa terpilih?`)) return
        try {
            for (const id of selectedIds) {
                await studentsApi.delete(id)
            }
            toast.success(`${selectedIds.length} siswa berhasil dihapus`)
            setSelectedIds([])
            fetchStudents()
        } catch (error) {
            toast.error('Gagal menghapus')
        }
    }

    const handleDownloadTemplate = () => {
        const wb = XLSX.utils.book_new()
        const headers = ['NIS', 'Nama Siswa', 'Kelas', 'Nama Ortu', 'No. HP']
        const sampleData = [
            ['2024001', 'Ahmad Fadillah', '7A', 'Bapak Ahmad', '081234567890'],
            ['2024002', 'Siti Nurhaliza', '7A', 'Ibu Siti', '081234567891'],
            ['2024003', 'Budi Santoso', '7B', 'Bapak Budi', '081234567892']
        ]
        const wsData = [headers, ...sampleData]
        const ws = XLSX.utils.aoa_to_sheet(wsData)
        ws['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 8 }, { wch: 25 }, { wch: 15 }]
        XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa')
        XLSX.writeFile(wb, 'template_import_siswa.xlsx')
        toast.success('Template Excel berhasil didownload!')
    }

    const handleExport = () => {
        const wb = XLSX.utils.book_new()
        const headers = ['NIS', 'Nama Siswa', 'Kelas', 'Nama Ortu', 'No. HP']
        const data = students.map(s => [
            s.nis,
            s.name,
            s.class,
            s.parent_name || '',
            s.parent_phone || ''
        ])
        const wsData = [headers, ...data]
        const ws = XLSX.utils.aoa_to_sheet(wsData)
        ws['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 8 }, { wch: 25 }, { wch: 15 }]
        XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa')
        XLSX.writeFile(wb, `data_siswa_${new Date().toISOString().split('T')[0]}.xlsx`)
        toast.success('Data siswa berhasil diexport!')
    }

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(selectedIds.filter(id => !paginatedStudents.find(s => s.id === id)))
        } else {
            const newIds = paginatedStudents.map(s => s.id)
            setSelectedIds([...new Set([...selectedIds, ...newIds])])
        }
    }

    const renderPageNumbers = () => {
        const pages = []
        const maxVisible = 5

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i)
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i)
                pages.push('ellipsis')
                pages.push(totalPages)
            } else if (currentPage >= totalPages - 2) {
                pages.push(1)
                pages.push('ellipsis')
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
            } else {
                pages.push(1)
                pages.push('ellipsis')
                pages.push(currentPage - 1)
                pages.push(currentPage)
                pages.push(currentPage + 1)
                pages.push('ellipsis')
                pages.push(totalPages)
            }
        }

        return pages
    }

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
            {/* Header - Match pattern with Users/Dashboard */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Data Siswa</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {students.length} siswa terdaftar
                        {someSelected && ` • ${selectedIds.length} terpilih`}
                    </p>
                </div>
                <Button onClick={() => setModalOpen(true)} icon={Plus} className="w-full sm:w-auto">
                    Tambah Siswa
                </Button>
            </div>

            {/* Import/Export Card */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={handleDownloadTemplate}
                            icon={FileSpreadsheet}
                            className="flex-1 sm:flex-none"
                        >
                            Template Excel
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            loading={uploading}
                            icon={Upload}
                            className="flex-1 sm:flex-none"
                        >
                            Import Excel
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleExport}
                            icon={Download}
                            className="flex-1 sm:flex-none"
                        >
                            Export Excel
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Filters Card - Match Users pattern */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <Input
                                placeholder="Cari username atau nama..."
                                icon={Search}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={classFilter} onValueChange={setClassFilter}>
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
                    </div>
                </CardContent>
            </Card>

            {/* Bulk Actions Banner */}
            {someSelected && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-blue-600 text-white">{selectedIds.length} dipilih</Badge>
                            <div className="flex-1" />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleBulkDelete}
                                className="bg-white text-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Hapus
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Students Table - Match pattern */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Daftar Siswa</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={allSelected}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead>NIS</TableHead>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>Kelas</TableHead>
                                    <TableHead className="hidden sm:table-cell">Ortu</TableHead>
                                    <TableHead className="hidden md:table-cell">No. HP</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedStudents.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            {search || classFilter !== 'all' ? 'Tidak ada siswa ditemukan' : 'Belum ada data siswa'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedStudents.map(student => (
                                        <TableRow key={student.id} className="hover:bg-muted/50 smooth-transition">
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(student.id)}
                                                    onCheckedChange={(checked) => {
                                                        setSelectedIds(checked
                                                            ? [...selectedIds, student.id]
                                                            : selectedIds.filter(id => id !== student.id)
                                                        )
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">{student.nis}</TableCell>
                                            <TableCell className="font-medium">{student.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{student.class}</Badge>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                                                {student.parent_name || '-'}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                                {student.parent_phone || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setEditStudent(student)
                                                            setModalOpen(true)
                                                        }}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(student)}
                                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>

                {/* Pagination */}
                {filteredStudents.length > ITEMS_PER_PAGE && (
                    <CardContent className="p-4 border-t">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} students
                            </p>
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                        />
                                    </PaginationItem>
                                    {renderPageNumbers().map((page, idx) => (
                                        <PaginationItem key={idx}>
                                            {page === 'ellipsis' ? (
                                                <PaginationEllipsis />
                                            ) : (
                                                <PaginationLink
                                                    onClick={() => setCurrentPage(page)}
                                                    isActive={currentPage === page}
                                                    className="cursor-pointer"
                                                >
                                                    {page}
                                                </PaginationLink>
                                            )}
                                        </PaginationItem>
                                    ))}
                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </CardContent>
                )}
            </Card>

            <StudentModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false)
                    setEditStudent(null)
                }}
                onSuccess={() => {
                    fetchStudents()
                    setModalOpen(false)
                    setEditStudent(null)
                }}
                student={editStudent}
            />
        </div>
    )
}
