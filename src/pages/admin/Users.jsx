import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { settingsApi } from '../../services/api.js'
import './Users.css'

const ROLES = [
    { value: 'admin', label: 'Admin' },
    { value: 'satpam', label: 'Satpam' },
    { value: 'teacher', label: 'Wali Kelas' },
    { value: 'tv', label: 'TV Display' },
]

const CLASSES = ['7A', '7B', '7C', '8A', '8B', '8C', '9A', '9B', '9C']

export default function Users() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [modalOpen, setModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const toast = useToast()

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const data = await settingsApi.getUsers()
            // Map backend role names to frontend if needed, but looks like they match mostly
            // Backend roles: admin, satpam, teacher, tv
            // Frontend demo used: guru (now teacher), display (now tv)
            setUsers(data)
        } catch (error) {
            console.error('Error fetching users:', error)
            toast.error('Gagal mengambil data user')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.username.toLowerCase().includes(search.toLowerCase())
        const matchesRole = roleFilter === 'all' || user.role === roleFilter
        return matchesSearch && matchesRole
    })

    const handleCreate = () => {
        setEditingUser(null)
        setModalOpen(true)
    }

    const handleEdit = (user) => {
        setEditingUser(user)
        setModalOpen(true)
    }

    const handleDelete = async (user) => {
        if (confirm(`Hapus user ${user.name}?`)) {
            try {
                await settingsApi.deleteUser(user.id)
                toast.success('User berhasil dihapus')
                setUsers(users.filter(u => u.id !== user.id))
            } catch (error) {
                console.error('Failed to delete:', error)
                toast.error('Gagal menghapus user')
            }
        }
    }

    const handleSave = async (formData) => {
        try {
            if (editingUser) {
                await settingsApi.updateUser(editingUser.id, formData)
                toast.success('User berhasil diupdate')
            } else {
                await settingsApi.createUser(formData)
                toast.success('User berhasil ditambahkan')
            }
            setModalOpen(false)
            fetchUsers()
        } catch (error) {
            console.error('Failed to save:', error)
            toast.error(error.message || 'Gagal menyimpan user')
        }
    }

    return (
        <div className="users-page">
            <div className="page-header">
                <h1 className="page-title">Manajemen User</h1>
                <Button icon={Plus} onClick={handleCreate}>
                    Tambah User
                </Button>
            </div>

            <Card>
                <div className="users-filters">
                    <div className="search-wrapper">
                        <Input
                            placeholder="Cari user..."
                            icon={Search}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="role-filter"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="all">Semua Role</option>
                        {ROLES.map(role => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                    </select>
                </div>

                <div className="users-table-wrapper">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Nama</th>
                                <th>Role</th>
                                <th>Kelas</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id}>
                                    <td><code>{user.username}</code></td>
                                    <td>{user.name}</td>
                                    <td>
                                        <span className={`role-badge role-badge--${user.role}`}>
                                            {ROLES.find(r => r.value === user.role)?.label || user.role}
                                        </span>
                                    </td>
                                    <td>{user.assigned_class || user.assignedClass || '-'}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="icon-btn" onClick={() => handleEdit(user)} title="Edit">
                                                <Pencil size={16} />
                                            </button>
                                            <button className="icon-btn icon-btn--danger" onClick={() => handleDelete(user)} title="Hapus">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <UserModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                user={editingUser}
            />
        </div>
    )
}

function UserModal({ isOpen, onClose, onSave, user }) {
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        password: '',
        role: 'satpam',
        assignedClass: '',
    })

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username,
                name: user.name,
                password: '',
                role: user.role,
                assignedClass: user.assignedClass || user.assigned_class || '',
            })
        } else {
            setFormData({
                username: '',
                name: '',
                password: '',
                role: 'satpam',
                assignedClass: '',
            })
        }
    }, [user])

    const handleSubmit = (e) => {
        e.preventDefault()
        onSave(formData)
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Edit User' : 'Tambah User'}>
            <form className="user-form" onSubmit={handleSubmit}>
                <Input
                    label="Username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                />
                <Input
                    label="Nama Lengkap"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                />
                <Input
                    label={user ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!user}
                />
                <div className="input-wrapper">
                    <label className="input-label">Role</label>
                    <select
                        className="select-input"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                        {ROLES.map(role => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                    </select>
                </div>
                {formData.role === 'guru' && (
                    <div className="input-wrapper">
                        <label className="input-label">Kelas</label>
                        <select
                            className="select-input"
                            value={formData.assignedClass}
                            onChange={(e) => setFormData({ ...formData, assignedClass: e.target.value })}
                            required
                        >
                            <option value="">Pilih Kelas</option>
                            {CLASSES.map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="form-actions">
                    <Button variant="secondary" type="button" onClick={onClose}>Batal</Button>
                    <Button type="submit">{user ? 'Update' : 'Simpan'}</Button>
                </div>
            </form>
        </Modal>
    )
}
