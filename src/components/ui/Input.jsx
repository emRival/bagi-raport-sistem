import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import './Input.css'

const Input = forwardRef(function Input({
    label,
    error,
    type = 'text',
    icon: Icon,
    iconPosition = 'left',
    className = '',
    ...props
}, ref) {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

    const wrapperClasses = [
        'input-wrapper',
        error && 'input-wrapper--error',
        Icon && `input-wrapper--icon-${iconPosition}`,
        className,
    ].filter(Boolean).join(' ')

    return (
        <div className={wrapperClasses}>
            {label && <label className="input-label">{label}</label>}
            <div className="input-container">
                {Icon && iconPosition === 'left' && (
                    <span className="input-icon input-icon--left">
                        <Icon size={18} />
                    </span>
                )}
                <input
                    ref={ref}
                    type={inputType}
                    className="input"
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        className="input-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
                {Icon && iconPosition === 'right' && !isPassword && (
                    <span className="input-icon input-icon--right">
                        <Icon size={18} />
                    </span>
                )}
            </div>
            {error && <p className="input-error">{error}</p>}
        </div>
    )
})

export default Input
