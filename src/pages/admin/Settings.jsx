import { useState, useRef, useEffect } from 'react'
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
import { settingsApi } from '../../services/api'

export default function Settings() {
    const { settings, updateSettings } = useSettings()
    const toast = useToast()
    const [showToken, setShowToken] = useState(false)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)

    // Local state for form fields to avoid per-keystroke API calls
    const [localSettings, setLocalSettings] = useState(null)
    const [testPhone, setTestPhone] = useState('')

    // Initialize local settings from context
    useEffect(() => {
        if (settings && !localSettings) {
            setLocalSettings(settings)
        }
    }, [settings, localSettings])

    const [logoMode, setLogoMode] = useState(settings.schoolLogo?.startsWith('http') ? 'url' : 'upload')
    const [logoUrl, setLogoUrl] = useState(settings.schoolLogo?.startsWith('http') ? settings.schoolLogo : '')
    const [newClass, setNewClass] = useState('')
    const [draggedIndex, setDraggedIndex] = useState(null)
    const fileInputRef = useRef(null)

    if (!localSettings) return null

    const handleLocalChange = (updates) => {
        setLocalSettings(prev => ({ ...prev, ...updates }))
    }

    const handleSave = async (section, keys) => {
        setSaving(true)
        try {
            const updates = {}
            keys.forEach(key => {
                if (localSettings[key] !== undefined) {
                    updates[key] = localSettings[key]
                }
            })

            if (Object.keys(updates).length === 0) {
                toast.error('Tidak ada perubahan untuk disimpan')
                return
            }

            await updateSettings(updates)
            toast.success(`Pengaturan ${section} berhasil disimpan`)
        } catch (error) {
            console.error('Save error:', error)
            toast.error(`Gagal menyimpan pengaturan ${section}`)
        } finally {
            setSaving(false)
        }
    }

    const handleTest = async () => {
        if (!localSettings.waApiUrl) {
            toast.error('Masukan API URL terlebih dahulu')
            return
        }

        if (!testPhone.trim()) {
            toast.error('Masukan nomor telepon untuk pengetesan')
            return
        }

        setTesting(true)
        try {
            await settingsApi.testWaConnection(localSettings.waApiUrl, localSettings.waApiToken, testPhone)
            toast.success('Koneksi berhasil! Pesan test telah dikirim ke ' + testPhone)
        } catch (error) {
            console.error('Test error:', error)
            toast.error(error.message || 'Gagal terhubung ke WhatsApp Gateway')
        } finally {
            setTesting(false)
        }
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
            handleLocalChange({ schoolLogo: event.target.result })
            toast.success('Logo disiapkan. Klik Simpan untuk memperbarui.')
        }
        reader.readAsDataURL(file)
    }

    const handleLogoUrl = () => {
        if (!logoUrl.trim()) {
            toast.error('URL tidak boleh kosong')
            return
        }
        handleLocalChange({ schoolLogo: logoUrl })
        toast.success('URL Logo disiapkan. Klik Simpan untuk memperbarui.')
    }

    const handleRemoveLogo = () => {
        handleLocalChange({ schoolLogo: '' })
        setLogoUrl('')
        setLogoMode('upload')
    }

    const handleAddClass = () => {
        const className = newClass.trim().toUpperCase()
        if (!className) {
            toast.error('Nama kelas tidak boleh kosong')
            return
        }

        if (localSettings.classes.includes(className)) {
            toast.error('Kelas sudah ada')
            return
        }

        const updatedClasses = [...localSettings.classes, className]
        handleLocalChange({ classes: updatedClasses })
        setNewClass('')
    }

    const handleRemoveClass = (className) => {
        const updatedClasses = localSettings.classes.filter(c => c !== className)
        handleLocalChange({ classes: updatedClasses })
    }

    const moveClassUp = (index) => {
        if (index === 0) return
        const newClasses = [...localSettings.classes]
            ;[newClasses[index - 1], newClasses[index]] = [newClasses[index], newClasses[index - 1]]
        handleLocalChange({ classes: newClasses })
    }

    const moveClassDown = (index) => {
        if (index === localSettings.classes.length - 1) return
        const newClasses = [...localSettings.classes]
            ;[newClasses[index], newClasses[index + 1]] = [newClasses[index + 1], newClasses[index]]
        handleLocalChange({ classes: newClasses })
    }

    // Drag and drop handlers
    const handleDragStart = (e, index) => {
        setDraggedIndex(index)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/html', e.target.outerHTML)
        e.target.style.opacity = '0.5'
    }

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1'
        setDraggedIndex(null)
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDrop = (e, dropIndex) => {
        e.preventDefault()
        if (draggedIndex === null || draggedIndex === dropIndex) return

        const newClasses = [...localSettings.classes]
        const [draggedItem] = newClasses.splice(draggedIndex, 1)
        newClasses.splice(dropIndex, 0, draggedItem)
        handleLocalChange({ classes: newClasses })
        setDraggedIndex(null)
    }

    const handleTestSuara = () => {
        if (!('speechSynthesis' in window)) {
            toast.error('Browser Anda tidak mendukung fitur suara')
            return
        }

        // Cancel previous speech
        window.speechSynthesis.cancel()

        const text = 'M M G Mas Bahlil Ganteng, Buah Apa yang Manis BAHLIL'
        const utterance = new SpeechSynthesisUtterance(text)
        
        const pitch = parseFloat(localSettings.ttsPitch ?? 1.0)
        const rate = parseFloat(localSettings.ttsRate ?? 0.8)
        const volume = parseFloat(localSettings.ttsVolume ?? 1.0)

        utterance.lang = 'id-ID'
        utterance.pitch = pitch
        utterance.rate = rate
        utterance.volume = volume

        // Try to find a male voice
        const voices = window.speechSynthesis.getVoices()
        const voice = voices.find(v => v.lang.includes('id') && v.name.toLowerCase().includes('male')) 
                    || voices.find(v => v.lang.includes('id'))
        
        if (voice) utterance.voice = voice

        window.speechSynthesis.speak(utterance)
        toast.info(`Mencoba suara: Pitch ${pitch}, Speed ${rate}`)
    }

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
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
                                    value={localSettings.schoolName}
                                    onChange={(e) => handleLocalChange({ schoolName: e.target.value })}
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

                                {localSettings.schoolLogo && (
                                    <div className="mt-3 p-3 border rounded-lg bg-muted/50">
                                        <div className="flex items-center gap-3">
                                            <img src={localSettings.schoolLogo} alt="Logo" className="h-12 w-12 object-contain" />
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

                            <Button onClick={() => handleSave('sekolah', ['schoolName', 'schoolLogo'])} loading={saving} icon={Save}>
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
                                    Drag & drop atau gunakan tombol ↑ ↓ untuk mengubah urutan.
                                </p>
                                <div className="space-y-1">
                                    {localSettings.classes && localSettings.classes.length > 0 ? (
                                        localSettings.classes.map((className, index) => (
                                            <div
                                                key={className}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, index)}
                                                onDragEnd={handleDragEnd}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, index)}
                                                className={`flex items-center gap-2 p-2 bg-muted/50 rounded-lg border hover:bg-muted smooth-transition cursor-grab active:cursor-grabbing ${draggedIndex === index ? 'opacity-50 border-blue-400 bg-blue-50' : ''
                                                    } ${draggedIndex !== null && draggedIndex !== index ? 'border-dashed border-blue-300' : ''}`}
                                            >
                                                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
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
                                                        disabled={index === localSettings.classes.length - 1}
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

                            <Button onClick={() => handleSave('kelas', ['classes'])} loading={saving} icon={Save}>
                                Simpan Urutan Kelas
                            </Button>
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
                                    checked={localSettings.waEnabled}
                                    onCheckedChange={(checked) => handleLocalChange({ waEnabled: checked })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="waUrl">API URL</Label>
                                <Input
                                    id="waUrl"
                                    placeholder="https://wa-gateway.com/send"
                                    value={localSettings.waApiUrl}
                                    onChange={(e) => handleLocalChange({ waApiUrl: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="waToken">API Token</Label>
                                <div className="relative">
                                    <Input
                                        id="waToken"
                                        type={showToken ? 'text' : 'password'}
                                        value={localSettings.waApiToken}
                                        onChange={(e) => handleLocalChange({ waApiToken: e.target.value })}
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
                                        value={localSettings.waCheckinTemplate}
                                        onChange={(e) => handleLocalChange({ waCheckinTemplate: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="callTemplate">Panggilan</Label>
                                    <textarea
                                        id="callTemplate"
                                        className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                                        value={localSettings.waCallTemplate}
                                        onChange={(e) => handleLocalChange({ waCallTemplate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="testPhone">Nomor Telepon Test (Gunakan format 628xxx)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="testPhone"
                                            placeholder="Contoh: 628123456789"
                                            value={testPhone}
                                            onChange={(e) => setTestPhone(e.target.value)}
                                        />
                                        <Button variant="outline" onClick={handleTest} loading={testing} icon={TestTube} className="whitespace-nowrap">
                                            Test Koneksi
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic">
                                        * Pesan test akan dikirim langsung ke nomor ini untuk memvalidasi konfigurasi.
                                    </p>
                                </div>
                                <Button onClick={() => handleSave('WhatsApp', ['waEnabled', 'waApiUrl', 'waApiToken', 'waCheckinTemplate', 'waCallTemplate'])} loading={saving} icon={Save} className="w-full sm:w-auto">
                                    Simpan Semua Pengaturan WhatsApp
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
                                    <span className="text-sm font-medium">{localSettings.ttsPitch || 1.0}</span>
                                </div>
                                <Slider
                                    value={[localSettings.ttsPitch || 1.0]}
                                    onValueChange={(value) => handleLocalChange({ ttsPitch: value[0] })}
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
                                    <span className="text-sm font-medium">{localSettings.ttsRate || 0.6}</span>
                                </div>
                                <Slider
                                    value={[localSettings.ttsRate || 0.6]}
                                    onValueChange={(value) => handleLocalChange({ ttsRate: value[0] })}
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
                                    <span className="text-sm font-medium">{Math.round((localSettings.ttsVolume || 1.0) * 100)}%</span>
                                </div>
                                <Slider
                                    value={[localSettings.ttsVolume || 1.0]}
                                    onValueChange={(value) => handleLocalChange({ ttsVolume: value[0] })}
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

                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleTestSuara} icon={Volume2}>
                                    Test Suara
                                </Button>
                                <Button onClick={() => handleSave('suara', ['ttsPitch', 'ttsRate', 'ttsVolume'])} loading={saving} icon={Save}>
                                    Simpan
                                </Button>
                            </div>
                            </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

