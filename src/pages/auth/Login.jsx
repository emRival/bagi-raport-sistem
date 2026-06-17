import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { GraduationCap, ArrowRight } from 'lucide-react'
import { settingsApi } from '../../services/api.js'

export default function Login() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const { refreshSettings } = useSettings()
    const toast = useToast()
    const [loading, setLoading] = useState(false)
    const [schoolLogo, setSchoolLogo] = useState('')
    const [schoolName, setSchoolName] = useState('Bagi Raport')

    const { register, handleSubmit, formState: { errors } } = useForm()

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
            refreshSettings()
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
        <div className="min-h-[100dvh] bg-slate-50 flex flex-col justify-center selection:bg-blue-200">
            {/* Minimalist Top Nav / Brand */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-700">
                    {schoolLogo ? (
                        <img src={schoolLogo} alt="Logo" className="w-8 h-8 object-contain" />
                    ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                            <GraduationCap className="w-4 h-4 text-white" />
                        </div>
                    )}
                    <span className="text-sm font-bold text-slate-900 tracking-tight">{schoolName}</span>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block animate-in fade-in slide-in-from-top-4 duration-700">
                    Sistem Antrian Terpadu
                </div>
            </div>

            {/* Main Content Centered */}
            <main className="w-full max-w-sm mx-auto px-6 py-12 relative z-10">
                <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both">
                    <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mb-2">Masuk ke sistem.</h1>
                    <p className="text-slate-500 text-sm">Gunakan kredensial yang diberikan oleh administrator sekolah.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 ease-out fill-mode-both">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5 ml-1">Username</label>
                            <input
                                type="text"
                                placeholder="guru7a"
                                className="w-full px-4 py-3.5 rounded-2xl bg-white border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all outline-none text-sm placeholder:text-slate-400 shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
                                {...register('username', { required: 'Username wajib diisi' })}
                            />
                            {errors.username && <p className="text-red-500 text-xs mt-1.5 ml-1 font-medium">{errors.username.message}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5 ml-1">Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="w-full px-4 py-3.5 rounded-2xl bg-white border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all outline-none text-sm placeholder:text-slate-400 shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
                                {...register('password', { required: 'Password wajib diisi' })}
                            />
                            {errors.password && <p className="text-red-500 text-xs mt-1.5 ml-1 font-medium">{errors.password.message}</p>}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full group relative flex items-center justify-center gap-2 px-4 py-4 mt-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                    >
                        <span>{loading ? 'Memverifikasi...' : 'Lanjutkan'}</span>
                        {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>
                </form>
            </main>

            {/* Decorative Background Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 flex justify-center items-center">
                <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-blue-100/50 blur-3xl opacity-60"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full bg-indigo-50/50 blur-3xl opacity-60"></div>
            </div>
        </div>
    )
}
