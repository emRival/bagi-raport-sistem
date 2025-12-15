import { useState } from 'react'
import { useAnnouncements } from '../../context/AnnouncementsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import { Save, Eye, EyeOff, Megaphone } from 'lucide-react'
import './AnnouncementSettings.css'

export default function AnnouncementSettings() {
    const { announcements, addAnnouncement, updateAnnouncement, removeAnnouncement, broadcastAnnouncement } = useAnnouncements()
    const toast = useToast()

    const [text, setText] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editText, setEditText] = useState('')
    const [sending, setSending] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!text.trim()) return

        setSending(true)
        try {
            await addAnnouncement(text)
            setText('')
            toast.success('Pengumuman berhasil ditambahkan')
        } catch (error) {
            toast.error('Gagal menambah pengumuman')
        } finally {
            setSending(false)
        }
    }

    const handleUpdate = async (id) => {
        if (!editText.trim()) return

        try {
            await updateAnnouncement(id, { text: editText })
            setEditingId(null)
            toast.success('Pengumuman diperbarui')
        } catch (error) {
            toast.error('Gagal memperbarui pengumuman')
        }
    }

    const handleToggle = async (id, currentStatus) => {
        try {
            const newStatus = currentStatus === 1 ? 0 : 1
            await updateAnnouncement(id, { is_active: newStatus })
            toast.success(`Pengumuman ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`)
        } catch (error) {
            toast.error('Gagal mengubah status')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Yakin ingin menghapus pengumuman ini?')) return

        try {
            await removeAnnouncement(id)
            toast.success('Pengumuman dihapus')
        } catch (error) {
            toast.error('Gagal menghapus pengumuman')
        }
    }

    const handleBroadcast = async (id) => {
        try {
            await broadcastAnnouncement(id)
            toast.success('Pengumuman disiarkan ke TV!')
        } catch (error) {
            toast.error('Gagal menyiarkan pengumuman')
        }
    }

    return (
        <div className="announcement-settings">
            <form onSubmit={handleSubmit} className="announcement-form">
                <Input
                    placeholder="Tulis pengumuman baru..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={sending}
                />
                <Button type="submit" loading={sending} icon={Save}>
                    Tambah
                </Button>
            </form>

            <div className="announcement-list">
                {announcements.length === 0 && (
                    <div className="empty-state">Belum ada pengumuman</div>
                )}

                {announcements.map(ann => (
                    <div key={ann.id} className={`announcement-item ${!ann.is_active ? 'inactive' : ''}`}>
                        <div className="announcement-content">
                            {editingId === ann.id ? (
                                <div className="edit-mode">
                                    <Input
                                        value={editText}
                                        onChange={e => setEditText(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="edit-actions">
                                        <Button size="sm" onClick={() => handleUpdate(ann.id)}>Simpan</Button>
                                        <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Batal</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="view-mode">
                                    <p className="announcement-text">{ann.text}</p>
                                    <span className="announcement-date">
                                        {new Date(ann.created_at).toLocaleDateString('id-ID', {
                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="announcement-actions">
                            <button
                                className="action-btn broadcast-btn"
                                onClick={() => handleBroadcast(ann.id)}
                                title="Siarkan (Popup di TV)"
                            >
                                <Megaphone size={18} />
                            </button>

                            <button
                                className={`action-btn toggle-btn ${ann.is_active ? 'active' : ''}`}
                                onClick={() => handleToggle(ann.id, ann.is_active)}
                                title={ann.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            >
                                {ann.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>

                            <button
                                className="action-btn edit-btn"
                                onClick={() => {
                                    setEditingId(ann.id)
                                    setEditText(ann.text)
                                }}
                                title="Edit"
                            >
                                <span className="icon-edit">✏️</span>
                            </button>

                            <button
                                className="action-btn delete-btn"
                                onClick={() => handleDelete(ann.id)}
                                title="Hapus"
                            >
                                <span className="icon-trash">🗑️</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
