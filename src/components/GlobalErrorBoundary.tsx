import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Global Error Boundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // React Error #300: Rendered more hooks - auto-recover
    if (error.message.includes('Minified React error #300') ||
        error.message.includes('Rendered more hooks') ||
        error.message.includes('Rendered fewer hooks')) {
      console.error('[GlobalErrorBoundary] Hook rendering error detected - auto-reloading in 1s');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      return;
    }

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      });
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Une erreur s'est produite
              </h1>

              <p className="text-gray-600 mb-6">
                Nous sommes désolés pour ce désagrément. Notre équipe a été notifiée et travaille à résoudre ce problème.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <h3 className="text-sm font-semibold text-red-800 mb-2">
                  Détails de l'erreur (mode développement)
                </h3>
                <p className="text-xs text-red-700 font-mono mb-2 break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <details className="text-xs text-red-600 mt-2">
                    <summary className="cursor-pointer font-semibold">Stack trace</summary>
                    <pre className="mt-2 overflow-auto max-h-40 bg-red-100 p-2 rounded">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={this.handleReset}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Retour à l'accueil
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Rafraîchir la page
              </button>

              <Link
                to="/contact"
                className="sm:col-span-2 block text-center w-full border border-orange-600 text-orange-600 hover:bg-orange-50 font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Contacter le support
              </Link>

              <a
                href="tel:0180855786"
                className="sm:col-span-2 block text-center w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Appeler : 01 80 85 57 86
              </a>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Besoin d'aide immédiate ?</strong> Notre équipe est disponible du lundi au vendredi de 9h à 18h pour vous accompagner dans votre démarche d'assurance taxi.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
