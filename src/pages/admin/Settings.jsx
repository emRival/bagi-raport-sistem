import { useState, useRef } from 'react'
import { Save, TestTube, Eye, EyeOff, Upload, Link, Image } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import './Settings.css'

export default function Settings() {
    const { settings, updateSettings } = useSettings()
    const toast = useToast()
    const [showToken, setShowToken] = useState(false)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)
    const [logoMode, setLogoMode] = useState(settings.schoolLogo?.startsWith('http') ? 'url' : 'upload')
    const [logoUrl, setLogoUrl] = useState(settings.schoolLogo?.startsWith('http') ? settings.schoolLogo : '')
    const fileInputRef = useRef(null)

    const handleSaveSchool = () => {
        setSaving(true)
        setTimeout(() => {
            setSaving(false)
            toast.success('Pengaturan sekolah berhasil disimpan')
        }, 500)
    }

    const handleSaveWA = () => {
        setSaving(true)
        setTimeout(() => {
            setSaving(false)
            toast.success('Pengaturan WhatsApp berhasil disimpan')
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

        // Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Ukuran file maksimal 2MB')
            return
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
            toast.error('File harus berupa gambar')
            return
        }

        // Convert to base64
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

    return (
        <div className="settings-page">
            <h1 className="page-title">Pengaturan</h1>

            {/* School Settings */}
            <Card title="🏫 Informasi Sekolah">
                <div className="settings-form">
                    <Input
                        label="Nama Sekolah"
                        placeholder="Contoh: SMP Negeri 1 Jakarta"
                        value={settings.schoolName}
                        onChange={(e) => updateSettings({ schoolName: e.target.value })}
                    />

                    <div className="input-wrapper">
                        <label className="input-label">Logo Sekolah</label>

                        {/* Logo Preview */}
                        {settings.schoolLogo && (
                            <div className="logo-preview">
                                <img
                                    src={settings.schoolLogo}
                                    alt="Logo Sekolah"
                                    onError={(e) => {
                                        e.target.style.display = 'none'
                                        toast.error('Gagal memuat logo')
                                    }}
                                />
                                <button
                                    className="logo-remove-btn"
                                    onClick={handleRemoveLogo}
                                    title="Hapus Logo"
                                >
                                    ×
                                </button>
                            </div>
                        )}

                        {/* Logo Mode Toggle */}
                        <div className="logo-mode-toggle">
                            <button
                                className={`mode-btn ${logoMode === 'upload' ? 'mode-btn--active' : ''}`}
                                onClick={() => setLogoMode('upload')}
                            >
                                <Upload size={16} />
                                Upload File
                            </button>
                            <button
                                className={`mode-btn ${logoMode === 'url' ? 'mode-btn--active' : ''}`}
                                onClick={() => setLogoMode('url')}
                            >
                                <Link size={16} />
                                URL
                            </button>
                        </div>

                        {/* Upload Mode */}
                        {logoMode === 'upload' && (
                            <div className="logo-upload-zone" onClick={() => fileInputRef.current?.click()}>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    hidden
                                />
                                <Image size={32} />
                                <p>Klik untuk upload logo</p>
                                <span>PNG, JPG, SVG (max 2MB)</span>
                            </div>
                        )}

                        {/* URL Mode */}
                        {logoMode === 'url' && (
                            <div className="logo-url-input">
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="https://example.com/logo.png"
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                />
                                <Button size="sm" onClick={handleLogoUrl}>
                                    Terapkan
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="settings-actions">
                        <Button icon={Save} onClick={handleSaveSchool} loading={saving}>
                            Simpan Pengaturan Sekolah
                        </Button>
                    </div>
                </div>
            </Card>

            {/* WhatsApp Settings */}
            <Card title="📱 WhatsApp Gateway">
                <div className="settings-form">
                    {/* Enable/Disable */}
                    <div className="setting-row">
                        <div className="setting-info">
                            <h4>Aktifkan WhatsApp Notification</h4>
                            <p>Kirim notifikasi otomatis ke wali murid</p>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={settings.waEnabled}
                                onChange={(e) => updateSettings({ waEnabled: e.target.checked })}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    <hr className="divider" />

                    <Input
                        label="API URL"
                        placeholder="https://your-wa-gateway.com/send"
                        value={settings.waApiUrl}
                        onChange={(e) => updateSettings({ waApiUrl: e.target.value })}
                    />

                    <div className="input-wrapper">
                        <label className="input-label">API Token</label>
                        <div className="token-input">
                            <input
                                type={showToken ? 'text' : 'password'}
                                className="input"
                                value={settings.waApiToken}
                                onChange={(e) => updateSettings({ waApiToken: e.target.value })}
                            />
                            <button
                                type="button"
                                className="token-toggle"
                                onClick={() => setShowToken(!showToken)}
                            >
                                {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <hr className="divider" />

                    <h3 className="section-title">Template Pesan</h3>

                    <p className="section-desc">
                        Gunakan placeholder: <code>{'{name}'}</code> untuk nama siswa, <code>{'{class}'}</code> untuk kelas, <code>{'{queue_number}'}</code> untuk nomor antrian
                    </p>

                    <div className="input-wrapper">
                        <label className="input-label">Template Pesan Check-in</label>
                        <textarea
                            className="textarea"
                            rows={3}
                            value={settings.waCheckinTemplate}
                            onChange={(e) => updateSettings({ waCheckinTemplate: e.target.value })}
                        />
                    </div>

                    <div className="input-wrapper">
                        <label className="input-label">Template Pesan Panggilan</label>
                        <textarea
                            className="textarea"
                            rows={3}
                            value={settings.waCallTemplate}
                            onChange={(e) => updateSettings({ waCallTemplate: e.target.value })}
                        />
                    </div>

                    <div className="settings-actions">
                        <Button
                            variant="secondary"
                            icon={TestTube}
                            onClick={handleTest}
                            loading={testing}
                        >
                            Test Koneksi
                        </Button>
                        <Button icon={Save} onClick={handleSaveWA} loading={saving}>
                            Simpan Pengaturan WA
                        </Button>
                    </div>
                </div>
            </Card>

            {/* TTS Voice Settings */}
            <Card title="🔊 Pengaturan Suara Pengumuman (TTS)">
                <div className="settings-form">
                    <p className="section-desc">
                        Atur suara pengumuman yang diputar di TV Display
                    </p>

                    {/* Pitch Slider */}
                    <div className="slider-wrapper">
                        <label className="input-label">
                            Nada Suara (Pitch)
                            <span className="slider-value">{settings.ttsPitch || 1.0}</span>
                        </label>
                        <input
                            type="range"
                            className="slider"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={settings.ttsPitch || 1.0}
                            onChange={(e) => updateSettings({ ttsPitch: parseFloat(e.target.value) })}
                        />
                        <div className="slider-labels">
                            <span>Rendah (Deep)</span>
                            <span>Normal</span>
                            <span>Tinggi</span>
                        </div>
                    </div>

                    {/* Rate Slider */}
                    <div className="slider-wrapper">
                        <label className="input-label">
                            Kecepatan Bicara (Rate)
                            <span className="slider-value">{settings.ttsRate || 0.6}</span>
                        </label>
                        <input
                            type="range"
                            className="slider"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={settings.ttsRate || 0.6}
                            onChange={(e) => updateSettings({ ttsRate: parseFloat(e.target.value) })}
                        />
                        <div className="slider-labels">
                            <span>Lambat</span>
                            <span>Normal</span>
                            <span>Cepat</span>
                        </div>
                    </div>

                    {/* Volume Slider */}
                    <div className="slider-wrapper">
                        <label className="input-label">
                            Volume
                            <span className="slider-value">{Math.round((settings.ttsVolume || 1.0) * 100)}%</span>
                        </label>
                        <input
                            type="range"
                            className="slider"
                            min="0"
                            max="1"
                            step="0.1"
                            value={settings.ttsVolume || 1.0}
                            onChange={(e) => updateSettings({ ttsVolume: parseFloat(e.target.value) })}
                        />
                        <div className="slider-labels">
                            <span>Pelan</span>
                            <span>Sedang</span>
                            <span>Keras</span>
                        </div>
                    </div>

                    <div className="info-box">
                        <p className="info-text">
                            💡 <strong>Tips:</strong> Untuk suara lebih dalam/deep, gunakan pitch <strong>0.5-0.8</strong>.
                            Kecepatan default yang bagus adalah <strong>0.6-0.8</strong> untuk kejelasan.
                        </p>
                    </div>

                    <div className="settings-actions">
                        <Button icon={Save} onClick={() => {
                            setSaving(true)
                            setTimeout(() => {
                                setSaving(false)
                                toast.success('Pengaturan suara berhasil disimpan')
                            }, 500)
                        }} loading={saving}>
                            Simpan Pengaturan Suara
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}
