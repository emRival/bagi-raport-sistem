import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, Shield, UserCog, Users as UsersIcon, Tv, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui-new/card'
import { Button } from '@/components/ui-new/button'
import { Input } from '@/components/ui-new/input'
import { Label } from '@/components/ui-new/label'
import { Badge } from '@/components/ui-new/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui-new/dialog'
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
import { useToast } from '../../context/ToastContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { settingsApi } from '../../services/api.js'

const ROLES = [
    { value: 'admin', label: 'Admin', icon: Shield, color: 'bg-red-100 text-red-700' },
    { value: 'satpam', label: 'Satpam', icon: UserCog, color: 'bg-blue-100 text-blue-700' },
    { value: 'teacher', label: 'Wali Kelas', icon: UsersIcon, color: 'bg-green-100 text-green-700' },
    { value: 'tv', label: 'TV Display', icon: Tv, color: 'bg-purple-100 text-purple-700' },
]


const ITEMS_PER_PAGE = 10

export default function Users() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [modalOpen, setModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const toast = useToast()

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const data = await settingsApi.getUsers()
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

    // Pagination logic
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [search, roleFilter])

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
            // Remove empty password from payload
            const payload = { ...formData }
            if (!payload.password || payload.password.trim() === '') {
                delete payload.password
            }

            if (editingUser) {
                await settingsApi.updateUser(editingUser.id, payload)
                toast.success('User berhasil diupdate')
            } else {
                await settingsApi.createUser(payload)
                toast.success('User berhasil ditambahkan')
            }
            setModalOpen(false)
            fetchUsers()
        } catch (error) {
            console.error('Failed to save:', error)
            toast.error(error.message || 'Gagal menyimpan user')
        }
    }

    const getRoleBadge = (role) => {
        const roleConfig = ROLES.find(r => r.value === role)
        if (!roleConfig) return <Badge>{role}</Badge>

        const Icon = roleConfig.icon

        // Map role to hover color that matches its background
        const hoverColor = {
            'bg-red-100 text-red-700': 'hover:bg-red-100',
            'bg-blue-100 text-blue-700': 'hover:bg-blue-100',
            'bg-green-100 text-green-700': 'hover:bg-green-100',
            'bg-purple-100 text-purple-700': 'hover:bg-purple-100',
        }[roleConfig.color] || ''

        return (
            <Badge className={`${roleConfig.color} ${hoverColor} border-0`}>
                <Icon className="w-3 h-3 mr-1" />
                {roleConfig.label}
            </Badge>
        )
    }

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Manajemen User</h1>
                <p className="text-sm text-muted-foreground mt-1">{users.length} user terdaftar</p>
            </div>

            {/* Filters Card */}
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
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Filter Role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Role</SelectItem>
                                {ROLES.map(role => (
                                    <SelectItem key={role.value} value={role.value}>
                                        {role.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleCreate} icon={Plus} className="w-full sm:w-auto">
                            Tambah User
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Daftar User</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Kelas</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Tidak ada user ditemukan
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedUsers.map(user => (
                                        <TableRow key={user.id} className="hover:bg-muted/50 smooth-transition">
                                            <TableCell className="font-mono text-sm">{user.username}</TableCell>
                                            <TableCell className="font-medium">{user.name}</TableCell>
                                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                                            <TableCell>{user.assigned_class || user.assignedClass || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(user)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(user)}
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
                {filteredUsers.length > ITEMS_PER_PAGE && (
                    <CardContent className="p-4 border-t">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
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
    const { settings } = useSettings()
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        password: '',
        role: 'satpam',
        assignedClass: '',
    })
    const [saving, setSaving] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    // Reset form when modal opens or user changes
    useEffect(() => {
        if (isOpen) {
            if (user) {
                setFormData({
                    username: user.username,
                    name: user.name,
                    password: '',
                    role: user.role,
                    assignedClass: user.assignedClass || user.assigned_class || '',
                })
            } else {
                // Reset to empty form for new user
                setFormData({
                    username: '',
                    name: '',
                    password: '',
                    role: 'satpam',
                    assignedClass: '',
                })
            }
            setShowPassword(false) // Reset password visibility
        }
    }, [isOpen, user])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            await onSave(formData)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] w-[95vw]">
                <DialogHeader className="space-y-2">
                    <DialogTitle className="text-lg sm:text-xl">
                        {user ? 'Edit User' : 'Tambah User Baru'}
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                        {user ? 'Perbarui informasi user' : 'Buat user baru untuk sistem'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                            disabled={saving}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Nama Lengkap</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            disabled={saving}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">
                            {user ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}
                        </Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required={!user}
                                disabled={saving}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 smooth-transition"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })} disabled={saving}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ROLES.map(role => (
                                    <SelectItem key={role.value} value={role.value}>
                                        {role.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {formData.role === 'teacher' && (
                        <div className="space-y-2">
                            <Label htmlFor="class">Kelas</Label>
                            <Select value={formData.assignedClass} onValueChange={(value) => setFormData({ ...formData, assignedClass: value })} disabled={saving}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Kelas" />
                                </SelectTrigger>
                                <SelectContent>
                                    {settings.classes.map(cls => (
                                        <SelectItem key={cls} value={cls}>
                                            {cls}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <DialogFooter className="gap-2 sm:gap-0 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={saving}
                            className="w-full sm:w-auto"
                        >
                            Batal
                        </Button>
                        <Button type="submit" loading={saving} className="w-full sm:w-auto">
                            {user ? 'Update' : 'Simpan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
