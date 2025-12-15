import './Card.css'

export default function Card({
    children,
    title,
    subtitle,
    padding = 'md',
    shadow = 'md',
    className = '',
    headerAction,
    ...props
}) {
    const classNames = [
        'card',
        `card--padding-${padding}`,
        `card--shadow-${shadow}`,
        className,
    ].filter(Boolean).join(' ')

    return (
        <div className={classNames} {...props}>
            {(title || headerAction) && (
                <div className="card__header">
                    <div className="card__titles">
                        {title && <h3 className="card__title">{title}</h3>}
                        {subtitle && <p className="card__subtitle">{subtitle}</p>}
                    </div>
                    {headerAction && <div className="card__action">{headerAction}</div>}
                </div>
            )}
            <div className="card__body">{children}</div>
        </div>
    )
}
