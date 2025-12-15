import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import './Toast.css'

const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
}

export default function Toast({ type = 'info', message, onClose }) {
    const Icon = icons[type]

    return (
        <div className={`toast toast--${type}`} role="alert">
            <span className="toast__icon">
                <Icon size={20} />
            </span>
            <p className="toast__message">{message}</p>
            <button className="toast__close" onClick={onClose} aria-label="Close">
                <X size={16} />
            </button>
        </div>
    )
}
