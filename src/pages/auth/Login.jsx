import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { GraduationCap, User, Lock } from 'lucide-react'
import { settingsApi } from '../../services/api.js'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import './Login.css'

export default function Login() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const toast = useToast()
    const [loading, setLoading] = useState(false)
    const [schoolLogo, setSchoolLogo] = useState('')
    const [schoolName, setSchoolName] = useState('Bagi Raport')

    const { register, handleSubmit, formState: { errors } } = useForm()

    // Load school settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await settingsApi.getAll()
                if (settings.schoolLogo) setSchoolLogo(settings.schoolLogo)
                if (settings.schoolName) setSchoolName(settings.schoolName)
            } catch (error) {
                console.error('Failed to load settings:', error)
            }
        }
        loadSettings()
    }, [])

    const onSubmit = async (data) => {
        setLoading(true)
        const result = await login(data.username, data.password)
        setLoading(false)

        if (result.success) {
            toast.success(`Selamat datang, ${result.user.name}!`)

            // Navigate based on role
            const roleRoutes = {
                admin: '/admin/dashboard',
                satpam: '/guard/checkin',
                guru: '/teacher/queue',
                display: '/display/tv',
            }
            navigate(roleRoutes[result.user.role] || '/')
        } else {
            toast.error(result.error)
        }
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <div className="login-logo">
                            {schoolLogo && schoolLogo.trim() !== '' ? (
                                <img
                                    src={schoolLogo}
                                    alt="School Logo"
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        objectFit: 'contain'
                                    }}
                                />
                            ) : (
                                <GraduationCap size={48} />
                            )}
                        </div>
                        <h1 className="login-title">{schoolName}</h1>
                        <p className="login-subtitle">Sistem Antrian Pengambilan Raport</p>
                    </div>

                    <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
                        <Input
                            label="Username"
                            placeholder="Masukkan username"
                            icon={User}
                            error={errors.username?.message}
                            {...register('username', { required: 'Username wajib diisi' })}
                        />

                        <Input
                            label="Password"
                            type="password"
                            placeholder="Masukkan password"
                            icon={Lock}
                            error={errors.password?.message}
                            {...register('password', { required: 'Password wajib diisi' })}
                        />

                        <Button
                            type="submit"
                            size="lg"
                            fullWidth
                            loading={loading}
                        >
                            Masuk
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}
