import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          background: '#0d0d0f', color: '#e2e2e2',
          fontFamily: 'JetBrains Mono, monospace', padding: 32, textAlign: 'center',
        }}>
          <div style={{ color: '#ff5555', fontSize: '1.4rem', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: 2 }}>
            ⚠ App Error
          </div>
          <pre style={{
            color: '#888', fontSize: '0.78rem', maxWidth: 640,
            overflow: 'auto', background: '#161618', padding: 16,
            borderRadius: 6, border: '1px solid #ffffff10', textAlign: 'left',
          }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#f5a623', color: '#0d0d0f', border: 'none',
              padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit',
              fontWeight: 700, letterSpacing: 1, fontSize: '0.75rem',
            }}
          >
            RELOAD
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
