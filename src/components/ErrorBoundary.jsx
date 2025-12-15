import { Component } from 'react'
import PropTypes from 'prop-types'

class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        }
    }

    static getDerivedStateFromError(error) {
        // Update state so next render shows fallback UI
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        // Log error details
        console.error('🔥 React Error Boundary caught an error:', error)
        console.error('Error Info:', errorInfo)

        // Store error details in state
        this.setState({
            error,
            errorInfo
        })

        // TODO: Send to error tracking service (e.g., Sentry)
        // trackError(error, errorInfo)
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        })
    }

    render() {
        if (this.state.hasError) {
            // Render fallback UI
            return this.props.fallback ? (
                this.props.fallback(this.state.error, this.handleReset)
            ) : (
                <DefaultErrorFallback
                    error={this.state.error}
                    onReset={this.handleReset}
                />
            )
        }

        return this.props.children
    }
}

// Default fallback UI
function DefaultErrorFallback({ error, onReset }) {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '2rem'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '3rem',
                maxWidth: '500px',
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
                <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>⚠️</div>
                <h1 style={{
                    fontSize: '2rem',
                    marginBottom: '1rem',
                    color: '#1a202c'
                }}>
                    Oops! Ada yang Error
                </h1>
                <p style={{
                    color: '#4a5568',
                    marginBottom: '2rem',
                    lineHeight: '1.6'
                }}>
                    Terjadi kesalahan yang tidak terduga. Jangan khawatir, data Anda aman.
                </p>

                {error && import.meta.env.DEV && (
                    <details style={{
                        textAlign: 'left',
                        marginBottom: '2rem',
                        padding: '1rem',
                        background: '#f7fafc',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                    }}>
                        <summary style={{
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            marginBottom: '0.5rem',
                            color: '#e53e3e'
                        }}>
                            Error Details (Dev Mode)
                        </summary>
                        <pre style={{
                            overflow: 'auto',
                            color: '#2d3748'
                        }}>
                            {error.toString()}
                        </pre>
                    </details>
                )}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button
                        onClick={onReset}
                        style={{
                            padding: '0.75rem 2rem',
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#5a67d8'}
                        onMouseOut={(e) => e.target.style.background = '#667eea'}
                    >
                        Coba Lagi
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        style={{
                            padding: '0.75rem 2rem',
                            background: '#e2e8f0',
                            color: '#2d3748',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#cbd5e0'}
                        onMouseOut={(e) => e.target.style.background = '#e2e8f0'}
                    >
                        Kembali ke Beranda
                    </button>
                </div>
            </div>
        </div>
    )
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
    fallback: PropTypes.func
}

DefaultErrorFallback.propTypes = {
    error: PropTypes.object,
    onReset: PropTypes.func.isRequired
}

export default ErrorBoundary
