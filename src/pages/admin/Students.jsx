import { useState, useEffect, useRef } from 'react'
import { Upload, Search, Pencil, Trash2, Download, FileSpreadsheet, CheckSquare, Square, XCircle, Plus } from 'lucide-react'
import * as XLSX from 'xlsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import StudentModal from '../../components/admin/StudentModal.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { studentsApi } from '../../services/api.js'
import './Students.css'

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
    const fileInputRef = useRef(null)

    const classes = settings.classes

    // Fetch students from API
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

    const allSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.includes(s.id))
    const someSelected = selectedIds.length > 0

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data, { type: 'array' })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]

            // Convert to JSON with header row
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

            // Skip header row and map to student objects
            const studentsData = jsonData.slice(1)
                .filter(row => row[0] && row[1]) // Must have NIS and Name
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
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new()

        // Header row
        const headers = ['NIS', 'Nama Siswa', 'Kelas', 'Nama Ortu', 'No. HP']

        // Sample data
        const sampleData = [
            ['2024001', 'Ahmad Fadillah', '7A', 'Bapak Ahmad', '081234567890'],
            ['2024002', 'Siti Nurhaliza', '7A', 'Ibu Siti', '081234567891'],
            ['2024003', 'Budi Santoso', '7B', 'Bapak Budi', '081234567892']
        ]

        // Combine headers and data
        const wsData = [headers, ...sampleData]

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(wsData)

        // Set column widths
        ws['!cols'] = [
            { wch: 10 },  // NIS
            { wch: 25 },  // Nama Siswa
            { wch: 8 },   // Kelas
            { wch: 25 },  // Nama Ortu
            { wch: 15 }   // No. HP
        ]

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa')

        // Generate Excel file and download
        XLSX.writeFile(wb, 'template_import_siswa.xlsx')

        toast.success('Template Excel berhasil didownload!')
    }

    const handleExport = () => {
        // Create workbook
        const wb = XLSX.utils.book_new()

        // Header row
        const headers = ['NIS', 'Nama Siswa', 'Kelas', 'Nama Ortu', 'No. HP']

        // Student data
        const data = students.map(s => [
            s.nis,
            s.name,
            s.class,
            s.parent_name || '',
            s.parent_phone || ''
        ])

        // Combine headers and data
        const wsData = [headers, ...data]

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(wsData)

        // Set column widths
        ws['!cols'] = [
            { wch: 10 },
            { wch: 25 },
            { wch: 8 },
            { wch: 25 },
            { wch: 15 }
        ]

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa')

        // Generate and download
        XLSX.writeFile(wb, `data_siswa_${new Date().toISOString().split('T')[0]}.xlsx`)

        toast.success('Data siswa berhasil diexport!')
    }

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(selectedIds.filter(id => !filteredStudents.find(s => s.id === id)))
        } else {
            const newIds = [...new Set([...selectedIds, ...filteredStudents.map(s => s.id)])]
            setSelectedIds(newIds)
        }
    }

    const toggleSelect = (studentId) => {
        if (selectedIds.includes(studentId)) {
            setSelectedIds(selectedIds.filter(id => id !== studentId))
        } else {
            setSelectedIds([...selectedIds, studentId])
        }
    }

    const openAddModal = () => {
        setEditStudent(null)
        setModalOpen(true)
    }

    const openEditModal = (student) => {
        setEditStudent(student)
        setModalOpen(true)
    }

    return (
        <div className="students-page">
            <h1 className="page-title">Data Siswa</h1>

            {/* Import/Export Card */}
            <Card className="import-card">
                <div className="import-actions">
                    <div className="import-group">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".csv,.xlsx,.xls"
                            hidden
                        />
                        <Button
                            variant="primary"
                            icon={Upload}
                            onClick={() => fileInputRef.current?.click()}
                            loading={uploading}
                        >
                            Import Excel
                        </Button>
                        <Button variant="secondary" icon={Download} onClick={handleDownloadTemplate}>
                            Template
                        </Button>
                    </div>
                    <div className="import-group">
                        <Button variant="success" icon={FileSpreadsheet} onClick={handleExport}>
                            Export
                        </Button>
                        <Button variant="primary" icon={Plus} onClick={openAddModal}>
                            Tambah Siswa
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Filters */}
            <Card className="filter-card">
                <div className="filters">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Cari nama atau NIS..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <select
                        value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value)}
                        className="class-select"
                    >
                        <option value="all">Semua Kelas</option>
                        {classes.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>

                    {someSelected && (
                        <div className="bulk-actions">
                            <span className="selected-count">{selectedIds.length} dipilih</span>
                            <Button variant="danger" size="sm" icon={Trash2} onClick={handleBulkDelete}>
                                Hapus
                            </Button>
                            <Button variant="ghost" size="sm" icon={XCircle} onClick={() => setSelectedIds([])}>
                                Batal
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* Students Table */}
            <Card>
                <div className="table-container">
                    <table className="students-table">
                        <thead>
                            <tr>
                                <th className="th-checkbox" onClick={toggleSelectAll}>
                                    {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                </th>
                                <th>NIS</th>
                                <th>Nama Siswa</th>
                                <th>Kelas</th>
                                <th>Nama Orang Tua</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="empty-row">
                                        {students.length === 0 ? 'Belum ada data siswa' : 'Tidak ada siswa yang cocok'}
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map(student => (
                                    <tr key={student.id} className={selectedIds.includes(student.id) ? 'selected' : ''}>
                                        <td className="td-checkbox" onClick={() => toggleSelect(student.id)}>
                                            {selectedIds.includes(student.id) ?
                                                <CheckSquare size={18} /> :
                                                <Square size={18} />
                                            }
                                        </td>
                                        <td>{student.nis}</td>
                                        <td className="student-name">{student.name}</td>
                                        <td><span className="class-badge">{student.class}</span></td>
                                        <td>{student.parent_name || '-'}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="action-btn edit" title="Edit" onClick={() => openEditModal(student)}>
                                                    <Pencil size={16} />
                                                </button>
                                                <button className="action-btn delete" title="Hapus" onClick={() => handleDelete(student)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="table-footer">
                    <span>Menampilkan {filteredStudents.length} dari {students.length} siswa</span>
                </div>
            </Card>

            {/* Add/Edit Modal */}
            <StudentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                student={editStudent}
                onSuccess={fetchStudents}
            />
        </div>
    )
}
