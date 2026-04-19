import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface in the console; a proper error-reporting service would hook in here.
    console.error('ErrorBoundary caught an error', error, info)
  }

  private handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[40vh] flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h2 className="text-2xl font-semibold text-slate-800 mb-3">發生錯誤</h2>
            <p className="text-sm text-slate-600 mb-4 font-mono break-words">
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded bg-slate-800 text-white text-sm"
            >
              重試
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
