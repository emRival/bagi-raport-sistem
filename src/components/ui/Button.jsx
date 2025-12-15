import './Button.css'

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    loading = false,
    disabled = false,
    icon: Icon,
    iconPosition = 'left',
    fullWidth = false,
    onClick,
    className = '',
    ...props
}) {
    const classNames = [
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        fullWidth && 'btn--full',
        loading && 'btn--loading',
        className,
    ].filter(Boolean).join(' ')

    return (
        <button
            type={type}
            className={classNames}
            disabled={disabled || loading}
            onClick={onClick}
            {...props}
        >
            {loading && (
                <span className="btn__spinner" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" className="animate-spin">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                </span>
            )}
            {Icon && iconPosition === 'left' && !loading && <Icon size={size === 'sm' ? 16 : 18} />}
            <span>{children}</span>
            {Icon && iconPosition === 'right' && !loading && <Icon size={size === 'sm' ? 16 : 18} />}
        </button>
    )
}
