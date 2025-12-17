import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { GraduationCap, User, Lock } from 'lucide-react'
import { settingsApi } from '../../services/api.js'
import { Button } from '@/components/ui-new/button'
import { Input } from '@/components/ui-new/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui-new/card'

export default function Login() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const { refreshSettings } = useSettings()
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

            // Refresh settings to get protected values (like WA template)
            refreshSettings()

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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="space-y-4">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                            {schoolLogo && schoolLogo.trim() !== '' ? (
                                <img
                                    src={schoolLogo}
                                    alt="School Logo"
                                    className="w-16 h-16 object-contain"
                                />
                            ) : (
                                <GraduationCap className="w-10 h-10 text-white" />
                            )}
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center">{schoolName}</CardTitle>
                    <CardDescription className="text-center">
                        Sistem Antrian Pengambilan Raport
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                </CardContent>
            </Card>
        </div>
    )
}
