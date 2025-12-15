import { useState, useEffect } from 'react'
import Modal from '../ui/Modal.jsx'
import Input from '../ui/Input.jsx'
import Button from '../ui/Button.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { studentsApi } from '../../services/api.js'
import { useToast } from '../../context/ToastContext.jsx'
import { Save } from 'lucide-react'
import './StudentModal.css'

export default function StudentModal({ isOpen, onClose, student, onSuccess }) {
    const { settings } = useSettings()
    const toast = useToast()
    const [loading, setLoading] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        nis: '',
        name: '',
        class: '',
        parent_name: ''
    })

    // Populate form on open/change
    useEffect(() => {
        if (isOpen) {
            if (student) {
                setFormData({
                    nis: student.nis || '',
                    name: student.name || '',
                    class: student.class || settings.classes[0] || '7A',
                    parent_name: student.parent_name || ''
                })
            } else {
                // Reset for new student
                setFormData({
                    nis: '',
                    name: '',
                    class: settings.classes[0] || '7A',
                    parent_name: ''
                })
            }
        }
    }, [isOpen, student, settings.classes])

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.nis || !formData.name || !formData.class) {
            toast.error('Mohon lengkapi NIS, Nama, dan Kelas')
            return
        }

        setLoading(true)
        try {
            if (student) {
                // Edit mode
                await studentsApi.update(student.id, formData)
                toast.success('Data siswa berhasil diperbarui')
            } else {
                // Add mode
                await studentsApi.create(formData)
                toast.success('Siswa baru berhasil ditambahkan')
            }
            onSuccess()
            onClose()
        } catch (error) {
            console.error('Submit error:', error)
            toast.error(error.message || 'Gagal menyimpan data siswa')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={student ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
        >
            <form onSubmit={handleSubmit} className="student-form-layout">
                <Input
                    label="NIS"
                    placeholder="Contoh: 2024001"
                    value={formData.nis}
                    onChange={e => setFormData(prev => ({ ...prev, nis: e.target.value }))}
                    disabled={loading}
                    autoFocus
                />

                <Input
                    label="Nama Lengkap"
                    placeholder="Nama siswa"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={loading}
                />

                <div className="form-group">
                    <label className="form-label">Kelas</label>
                    <select
                        className="form-select"
                        value={formData.class}
                        onChange={e => setFormData(prev => ({ ...prev, class: e.target.value }))}
                        disabled={loading}
                    >
                        {settings.classes.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>
                </div>

                <Input
                    label="Nama Orang Tua / Wali"
                    placeholder="Nama orang tua"
                    value={formData.parent_name}
                    onChange={e => setFormData(prev => ({ ...prev, parent_name: e.target.value }))}
                    disabled={loading}
                />

                <Input
                    label="Nomor Telepon Wali (Opsional)"
                    type="tel"
                    placeholder="08xxxxxxxxxxx"
                    value={formData.parent_phone}
                    onChange={e => {
                        // Only allow numbers
                        const value = e.target.value.replace(/\D/g, '')
                        setFormData(prev => ({ ...prev, parent_phone: value }))
                    }}
                    disabled={loading}
                />

                <div className="modal-actions">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Batal
                    </Button>
                    <Button
                        type="submit"
                        loading={loading}
                        icon={Save}
                    >
                        {student ? 'Simpan Perubahan' : 'Simpan Siswa'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
