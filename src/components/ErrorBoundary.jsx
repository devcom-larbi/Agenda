import { Component } from 'react'

/**
 * ErrorBoundary — empêche qu'un crash de rendu (ex. donnée malformée, bloc IA
 * inattendu) ne laisse l'utilisateur sur un écran blanc, surtout en WebView mobile
 * où il n'y a pas de barre d'adresse pour recharger.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Visible dans les logs (et prêt à être branché à Sentry plus tard)
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    if (typeof window !== 'undefined') window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center px-8 text-center"
        style={{ background: 'var(--bg, #fff)', color: 'var(--text-1, #111)' }}
      >
        <div className="text-[40px] mb-3">😵‍💫</div>
        <h1 className="text-[18px] font-semibold mb-2">Une erreur est survenue</h1>
        <p className="text-[14px] mb-6 max-w-sm" style={{ color: 'var(--text-3, #888)' }}>
          L'application a rencontré un problème inattendu. Tes données sont en sécurité — recharge pour reprendre.
        </p>
        <button
          onClick={this.handleReload}
          className="px-5 py-2.5 rounded-full text-[14px] font-bold active:scale-95 transition-transform"
          style={{ background: 'var(--ink, #111)', color: 'var(--bg, #fff)' }}
        >
          Recharger l'application
        </button>
        {import.meta.env.DEV && this.state.error && (
          <pre className="mt-6 text-[11px] text-left max-w-full overflow-auto p-3 rounded-lg" style={{ background: 'var(--surface-1, #f3f3f3)', color: '#DC2626' }}>
            {String(this.state.error?.stack || this.state.error)}
          </pre>
        )}
      </div>
    )
  }
}
