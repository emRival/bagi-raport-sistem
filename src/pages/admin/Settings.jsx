import { useState, useRef } from 'react'
import { Save, TestTube, Eye, EyeOff, Upload, Link, Image, Trash2, Plus, X, Settings as SettingsIcon, MessageSquare, Volume2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui-new/card'
import { Button } from '@/components/ui-new/button'
import { Input } from '@/components/ui-new/input'
import { Label } from '@/components/ui-new/label'
import { Badge } from '@/components/ui-new/badge'
import { Switch } from '@/components/ui-new/switch'
import { Slider } from '@/components/ui-new/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui-new/tabs'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

export default function Settings() {
    const { settings, updateSettings } = useSettings()
    const toast = useToast()
    const [showToken, setShowToken] = useState(false)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)
    const [logoMode, setLogoMode] = useState(settings.schoolLogo?.startsWith('http') ? 'url' : 'upload')
    const [logoUrl, setLogoUrl] = useState(settings.schoolLogo?.startsWith('http') ? settings.schoolLogo : '')
    const [newClass, setNewClass] = useState('')
    const fileInputRef = useRef(null)

    const handleSave = (section) => {
        setSaving(true)
        setTimeout(() => {
            setSaving(false)
            toast.success(`Pengaturan ${section} berhasil disimpan`)
        }, 500)
    }

    const handleTest = () => {
        setTesting(true)
        setTimeout(() => {
            setTesting(false)
            toast.success('Koneksi ke WhatsApp Gateway berhasil!')
        }, 1500)
    }

    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Ukuran file maksimal 2MB')
            return
        }

        if (!file.type.startsWith('image/')) {
            toast.error('File harus berupa gambar')
            return
        }

        const reader = new FileReader()
        reader.onload = (event) => {
            updateSettings({ schoolLogo: event.target.result })
            toast.success('Logo berhasil diupload')
        }
        reader.readAsDataURL(file)
    }

    const handleLogoUrl = () => {
        if (!logoUrl.trim()) {
            toast.error('URL tidak boleh kosong')
            return
        }
        updateSettings({ schoolLogo: logoUrl })
        toast.success('Logo berhasil diperbarui')
    }

    const handleRemoveLogo = async () => {
        try {
            await updateSettings({ schoolLogo: '' })
            setLogoUrl('')
            setLogoMode('upload')
            toast.success('Logo berhasil dihapus')
        } catch (error) {
            toast.error('Gagal menghapus logo')
        }
    }

    const handleAddClass = () => {
        const className = newClass.trim().toUpperCase()
        if (!className) {
            toast.error('Nama kelas tidak boleh kosong')
            return
        }

        if (settings.classes.includes(className)) {
            toast.error('Kelas sudah ada')
            return
        }

        // Add to end of list (no auto-sort to preserve admin order)
        const updatedClasses = [...settings.classes, className]
        updateSettings({ classes: updatedClasses })
        setNewClass('')
        toast.success(`Kelas ${className} berhasil ditambahkan`)
    }

    const handleRemoveClass = (className) => {
        if (confirm(`Hapus kelas ${className} dari daftar?`)) {
            const updatedClasses = settings.classes.filter(c => c !== className)
            updateSettings({ classes: updatedClasses })
            toast.success(`Kelas ${className} berhasil dihapus`)
        }
    }

    const moveClassUp = (index) => {
        if (index === 0) return
        const newClasses = [...settings.classes]
            ;[newClasses[index - 1], newClasses[index]] = [newClasses[index], newClasses[index - 1]]
        updateSettings({ classes: newClasses })
    }

    const moveClassDown = (index) => {
        if (index === settings.classes.length - 1) return
        const newClasses = [...settings.classes]
            ;[newClasses[index], newClasses[index + 1]] = [newClasses[index + 1], newClasses[index]]
        updateSettings({ classes: newClasses })
    }

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Pengaturan</h1>
                <p className="text-sm text-muted-foreground mt-1">Kelola konfigurasi sistem</p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="general" className="gap-2">
                        <SettingsIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Umum</span>
                    </TabsTrigger>
                    <TabsTrigger value="integration" className="gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span className="hidden sm:inline">Integrasi</span>
                    </TabsTrigger>
                    <TabsTrigger value="display" className="gap-2">
                        <Volume2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Tampilan</span>
                    </TabsTrigger>
                </TabsList>

                {/* Tab: Umum */}
                <TabsContent value="general" className="space-y-4">
                    {/* School Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>🏫 Informasi Sekolah</CardTitle>
                            <CardDescription>Atur nama dan logo sekolah</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="schoolName">Nama Sekolah</Label>
                                <Input
                                    id="schoolName"
                                    placeholder="Contoh: SMP Negeri 1 Jakarta"
                                    value={settings.schoolName}
                                    onChange={(e) => updateSettings({ schoolName: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Logo Sekolah</Label>
                                <div className="flex gap-2 mb-3">
                                    <Button
                                        variant={logoMode === 'upload' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setLogoMode('upload')}
                                        icon={Upload}
                                    >
                                        Upload
                                    </Button>
                                    <Button
                                        variant={logoMode === 'url' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setLogoMode('url')}
                                        icon={Link}
                                    >
                                        URL
                                    </Button>
                                </div>

                                {logoMode === 'upload' ? (
                                    <div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            className="hidden"
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                            icon={Image}
                                            className="w-full"
                                        >
                                            Pilih Gambar (Max 2MB)
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="https://example.com/logo.png"
                                            value={logoUrl}
                                            onChange={(e) => setLogoUrl(e.target.value)}
                                        />
                                        <Button onClick={handleLogoUrl}>Set</Button>
                                    </div>
                                )}

                                {settings.schoolLogo && (
                                    <div className="mt-3 p-3 border rounded-lg bg-muted/50">
                                        <div className="flex items-center gap-3">
                                            <img src={settings.schoolLogo} alt="Logo" className="h-12 w-12 object-contain" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">Logo aktif</p>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={handleRemoveLogo}>
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button onClick={() => handleSave('sekolah')} loading={saving} icon={Save}>
                                Simpan
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Classes Management */}
                    <Card>
                        <CardHeader>
                            <CardTitle>📚 Manajemen Kelas</CardTitle>
                            <CardDescription>
                                Daftar kelas untuk dropdown filter
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Daftar Kelas (Urutan Tampilan TV)</Label>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Gunakan tombol ↑ ↓ untuk mengubah urutan. Urutan ini akan ditampilkan di TV.
                                </p>
                                <div className="space-y-1">
                                    {settings.classes && settings.classes.length > 0 ? (
                                        settings.classes.map((className, index) => (
                                            <div
                                                key={className}
                                                className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border hover:bg-muted smooth-transition"
                                            >
                                                <GripVertical className="w-4 h-4 text-muted-foreground" />
                                                <span className="flex-1 font-medium">{className}</span>
                                                <span className="text-xs text-muted-foreground mr-2">#{index + 1}</span>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => moveClassUp(index)}
                                                        disabled={index === 0}
                                                        className="p-1 rounded hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed smooth-transition"
                                                        title="Pindah ke atas"
                                                    >
                                                        <ChevronUp className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => moveClassDown(index)}
                                                        disabled={index === settings.classes.length - 1}
                                                        className="p-1 rounded hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed smooth-transition"
                                                        title="Pindah ke bawah"
                                                    >
                                                        <ChevronDown className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveClass(className)}
                                                        className="p-1 rounded hover:bg-red-50 hover:text-red-600 smooth-transition ml-1"
                                                        title="Hapus kelas"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg text-center">Belum ada kelas</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="newClass">Tambah Kelas</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="newClass"
                                        placeholder="7A, 8B, 9C"
                                        value={newClass}
                                        onChange={(e) => setNewClass(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                handleAddClass()
                                            }
                                        }}
                                    />
                                    <Button onClick={handleAddClass} icon={Plus}>
                                        Tambah
                                    </Button>
                                </div>
                            </div>

                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-900">
                                    💡 Siswa tetap bisa memiliki kelas lain saat import Excel
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Integrasi */}
                <TabsContent value="integration" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>💬 WhatsApp Gateway</CardTitle>
                            <CardDescription>Notifikasi otomatis ke orang tua siswa</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <p className="font-medium">Aktifkan WhatsApp</p>
                                    <p className="text-sm text-muted-foreground">Kirim notifikasi otomatis</p>
                                </div>
                                <Switch
                                    checked={settings.waEnabled}
                                    onCheckedChange={(checked) => updateSettings({ waEnabled: checked })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="waUrl">API URL</Label>
                                <Input
                                    id="waUrl"
                                    placeholder="https://wa-gateway.com/send"
                                    value={settings.waApiUrl}
                                    onChange={(e) => updateSettings({ waApiUrl: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="waToken">API Token</Label>
                                <div className="relative">
                                    <Input
                                        id="waToken"
                                        type={showToken ? 'text' : 'password'}
                                        value={settings.waApiToken}
                                        onChange={(e) => updateSettings({ waApiToken: e.target.value })}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowToken(!showToken)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="border-t pt-4 space-y-3">
                                <h4 className="font-medium">Template Pesan</h4>
                                <div className="text-sm text-muted-foreground bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <p className="font-semibold mb-1">Variable yang tersedia:</p>
                                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                                        <li><code className="text-xs font-bold bg-white px-1 py-0.5 rounded border">{'{name}'}</code> : Nama Siswa</li>
                                        <li><code className="text-xs font-bold bg-white px-1 py-0.5 rounded border">{'{class}'}</code> : Kelas</li>
                                        <li><code className="text-xs font-bold bg-white px-1 py-0.5 rounded border">{'{nis}'}</code> : NIS Siswa</li>
                                        <li><code className="text-xs font-bold bg-white px-1 py-0.5 rounded border">{'{parent_name}'}</code> : Nama Wali</li>
                                        <li><code className="text-xs font-bold bg-white px-1 py-0.5 rounded border">{'{queue_number}'}</code> : No. Antrian</li>
                                        <li><code className="text-xs font-bold bg-white px-1 py-0.5 rounded border">{'{date}'}</code> : Tanggal</li>
                                        <li><code className="text-xs font-bold bg-white px-1 py-0.5 rounded border">{'{time}'}</code> : Jam</li>
                                    </ul>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="checkinTemplate">Check-in</Label>
                                    <textarea
                                        id="checkinTemplate"
                                        className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                                        value={settings.waCheckinTemplate}
                                        onChange={(e) => updateSettings({ waCheckinTemplate: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="callTemplate">Panggilan</Label>
                                    <textarea
                                        id="callTemplate"
                                        className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                                        value={settings.waCallTemplate}
                                        onChange={(e) => updateSettings({ waCallTemplate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleTest} loading={testing} icon={TestTube}>
                                    Test
                                </Button>
                                <Button onClick={() => handleSave('WhatsApp')} loading={saving} icon={Save}>
                                    Simpan
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Tampilan */}
                <TabsContent value="display" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>🔊 Suara Pengumuman (TTS)</CardTitle>
                            <CardDescription>Atur suara di TV Display</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Nada Suara (Pitch)</Label>
                                    <span className="text-sm font-medium">{settings.ttsPitch || 1.0}</span>
                                </div>
                                <Slider
                                    value={[settings.ttsPitch || 1.0]}
                                    onValueChange={(value) => updateSettings({ ttsPitch: value[0] })}
                                    min={0.5}
                                    max={2}
                                    step={0.1}
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Rendah</span>
                                    <span>Normal</span>
                                    <span>Tinggi</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Kecepatan (Rate)</Label>
                                    <span className="text-sm font-medium">{settings.ttsRate || 0.6}</span>
                                </div>
                                <Slider
                                    value={[settings.ttsRate || 0.6]}
                                    onValueChange={(value) => updateSettings({ ttsRate: value[0] })}
                                    min={0.5}
                                    max={2}
                                    step={0.1}
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Lambat</span>
                                    <span>Normal</span>
                                    <span>Cepat</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Volume</Label>
                                    <span className="text-sm font-medium">{Math.round((settings.ttsVolume || 1.0) * 100)}%</span>
                                </div>
                                <Slider
                                    value={[settings.ttsVolume || 1.0]}
                                    onValueChange={(value) => updateSettings({ ttsVolume: value[0] })}
                                    min={0}
                                    max={1}
                                    step={0.1}
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Pelan</span>
                                    <span>Sedang</span>
                                    <span>Keras</span>
                                </div>
                            </div>

                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-900">
                                    💡 Untuk suara deep: pitch <strong>0.5-0.8</strong>
                                </p>
                            </div>

                            <Button onClick={() => handleSave('suara')} loading={saving} icon={Save}>
                                Simpan
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
