import { useState } from 'react'
import { useAnnouncements } from '../../context/AnnouncementsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { Button } from '@/components/ui-new/button'
import { Input } from '@/components/ui-new/input'
import { Label } from '@/components/ui-new/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui-new/dialog'
import { Save, Eye, EyeOff, Megaphone, Plus } from 'lucide-react'

export default function AnnouncementSettings() {
    const { announcements, addAnnouncement, updateAnnouncement, removeAnnouncement, broadcastAnnouncement } = useAnnouncements()
    const toast = useToast()

    const [text, setText] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editText, setEditText] = useState('')
    const [sending, setSending] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!text.trim()) return

        setSending(true)
        try {
            await addAnnouncement(text)
            setText('')
            setModalOpen(false)
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
        <div className="space-y-4">
            {/* Beautiful Add Button with Modal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    {announcements.length} pengumuman tersimpan
                </p>
                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                    <DialogTrigger asChild>
                        <button className="group relative px-6 py-3 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl smooth-transition hover:scale-105 active:scale-95">
                            <div className="flex items-center gap-2">
                                <Plus className="w-5 h-5 group-hover:rotate-90 smooth-transition" />
                                <span>Tambah Pengumuman</span>
                            </div>
                            <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 smooth-transition"></div>
                        </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] max-w-[95vw] mx-4">
                        <DialogHeader className="space-y-2">
                            <DialogTitle className="text-lg sm:text-xl">Tambah Pengumuman Baru</DialogTitle>
                            <DialogDescription className="text-sm">
                                Buat pengumuman yang akan ditampilkan di TV Display
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-3 py-3">
                                <div className="space-y-2">
                                    <Label htmlFor="announcement" className="text-sm">Teks Pengumuman</Label>
                                    <textarea
                                        id="announcement"
                                        className="flex min-h-[100px] sm:min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Ketik pengumuman Anda di sini..."
                                        value={text}
                                        onChange={(e) => setText(e.target.value)}
                                        disabled={sending}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {text.length} karakter
                                    </p>
                                </div>
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setModalOpen(false)}
                                    disabled={sending}
                                    className="w-full sm:w-auto"
                                >
                                    Batal
                                </Button>
                                <Button type="submit" loading={sending} icon={Save} className="w-full sm:w-auto">
                                    Simpan
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Announcements List */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {announcements.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                        <p className="text-muted-foreground font-medium">Belum ada pengumuman</p>
                        <p className="text-sm text-muted-foreground mt-1">Klik tombol di atas untuk membuat pengumuman pertama</p>
                    </div>
                )}

                {announcements.map(ann => (
                    <div key={ann.id} className={`p-3 rounded-lg border ${!ann.is_active ? 'bg-muted/30 opacity-60' : 'bg-background hover:bg-muted/30 smooth-transition'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                {editingId === ann.id ? (
                                    <div className="space-y-2">
                                        <textarea
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={editText}
                                            onChange={e => setEditText(e.target.value)}
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => handleUpdate(ann.id)}>Simpan</Button>
                                            <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Batal</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm line-clamp-2 mb-1">{ann.text}</p>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(ann.created_at).toLocaleDateString('id-ID', {
                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-1 flex-shrink-0">
                                <button
                                    className="p-2 rounded hover:bg-blue-100 text-blue-600 smooth-transition"
                                    onClick={() => handleBroadcast(ann.id)}
                                    title="Siarkan (Popup di TV)"
                                >
                                    <Megaphone size={18} />
                                </button>

                                <button
                                    className={`p-2 rounded hover:bg-green-100 smooth-transition ${ann.is_active ? 'text-green-600' : 'text-gray-400'}`}
                                    onClick={() => handleToggle(ann.id, ann.is_active)}
                                    title={ann.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                >
                                    {ann.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>

                                <button
                                    className="p-2 rounded hover:bg-orange-100 text-orange-600 smooth-transition"
                                    onClick={() => {
                                        setEditingId(ann.id)
                                        setEditText(ann.text)
                                    }}
                                    title="Edit"
                                >
                                    <span>✏️</span>
                                </button>

                                <button
                                    className="p-2 rounded hover:bg-red-100 text-red-600 smooth-transition"
                                    onClick={() => handleDelete(ann.id)}
                                    title="Hapus"
                                >
                                    <span>🗑️</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
