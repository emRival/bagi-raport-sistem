import { useState } from 'react'
import { Plus, Pencil, Trash2, GraduationCap, Check, X } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Modal from '../../components/ui/Modal.jsx'
import './Classes.css'

export default function Classes() {
    const { settings, addClass, removeClass, updateClass } = useSettings()
    const toast = useToast()
    const [modalOpen, setModalOpen] = useState(false)
    const [editingClass, setEditingClass] = useState(null)
    const [newClassName, setNewClassName] = useState('')

    const handleAdd = () => {
        setEditingClass(null)
        setNewClassName('')
        setModalOpen(true)
    }

    const handleEdit = (className) => {
        setEditingClass(className)
        setNewClassName(className)
        setModalOpen(true)
    }

    const handleDelete = (className) => {
        if (confirm(`Hapus kelas ${className}? Pastikan tidak ada siswa di kelas ini.`)) {
            removeClass(className)
            toast.success(`Kelas ${className} berhasil dihapus`)
        }
    }

    const handleSave = () => {
        const trimmed = newClassName.trim().toUpperCase()

        if (!trimmed) {
            toast.error('Nama kelas tidak boleh kosong')
            return
        }

        if (editingClass) {
            // Update existing
            if (updateClass(editingClass, trimmed)) {
                toast.success(`Kelas berhasil diubah menjadi ${trimmed}`)
                setModalOpen(false)
            } else {
                toast.error('Nama kelas sudah ada')
            }
        } else {
            // Add new
            if (addClass(trimmed)) {
                toast.success(`Kelas ${trimmed} berhasil ditambahkan`)
                setModalOpen(false)
            } else {
                toast.error('Kelas sudah ada')
            }
        }
    }

    return (
        <div className="classes-page">
            <div className="page-header">
                <h1 className="page-title">Manajemen Kelas</h1>
                <Button icon={Plus} onClick={handleAdd}>
                    Tambah Kelas
                </Button>
            </div>

            <Card>
                <div className="classes-grid">
                    {settings.classes.length === 0 ? (
                        <div className="no-classes">
                            <GraduationCap size={48} />
                            <p>Belum ada kelas. Klik "Tambah Kelas" untuk menambahkan.</p>
                        </div>
                    ) : (
                        settings.classes.map(cls => (
                            <div key={cls} className="class-item">
                                <div className="class-item__icon">
                                    <GraduationCap size={24} />
                                </div>
                                <span className="class-item__name">{cls}</span>
                                <div className="class-item__actions">
                                    <button
                                        className="icon-btn"
                                        onClick={() => handleEdit(cls)}
                                        title="Edit"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        className="icon-btn icon-btn--danger"
                                        onClick={() => handleDelete(cls)}
                                        title="Hapus"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingClass ? 'Edit Kelas' : 'Tambah Kelas'}
            >
                <div className="class-form">
                    <Input
                        label="Nama Kelas"
                        placeholder="Contoh: 7A, 8B, 9C"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                    <p className="class-form__hint">
                        Gunakan format singkat seperti 7A, 7B, 8A, dll.
                    </p>
                    <div className="form-actions">
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleSave}>
                            {editingClass ? 'Simpan' : 'Tambah'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
