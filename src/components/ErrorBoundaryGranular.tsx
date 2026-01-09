import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallbackUI?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  level?: 'component' | 'section' | 'page';
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

/**
 * Error Boundary Granulaire
 *
 * Permet d'isoler les erreurs au niveau composant/section/page
 * sans faire crasher toute l'application
 *
 * Usage:
 * <ErrorBoundaryGranular level="component" componentName="Dashboard">
 *   <Dashboard />
 * </ErrorBoundaryGranular>
 */
export class ErrorBoundaryGranular extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, componentName, level = 'component' } = this.props;

    // Log l'erreur
    logger.error(`[ErrorBoundary ${level}] Error in ${componentName || 'Unknown'}:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount
    });

    // Callback personnalisé
    if (onError) {
      onError(error, errorInfo);
    }

    this.setState({ errorInfo });
  }

  componentDidUpdate(prevProps: Props) {
    // Reset si les resetKeys changent
    if (this.state.hasError && this.props.resetKeys) {
      const hasKeyChanged = this.props.resetKeys.some(
        (key, index) => prevProps.resetKeys?.[index] !== key
      );

      if (hasKeyChanged) {
        this.reset();
      }
    }
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  retry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1
    }));
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallbackUI, level = 'component', componentName } = this.props;

    if (hasError && error) {
      // UI personnalisée fournie
      if (fallbackUI) {
        return fallbackUI;
      }

      // UI par défaut selon le niveau
      const isPage = level === 'page';
      const isSection = level === 'section';

      return (
        <div
          className={`
            ${isPage ? 'min-h-screen flex items-center justify-center bg-gray-50' : ''}
            ${isSection ? 'p-8 bg-white rounded-lg border-2 border-red-200' : ''}
            ${!isPage && !isSection ? 'p-4 bg-red-50 rounded border border-red-200' : ''}
          `}
        >
          <div className="max-w-md w-full text-center">
            <div className="mb-4 flex justify-center">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {isPage ? 'Erreur de chargement' : 'Erreur'}
            </h2>

            <p className="text-gray-600 mb-4">
              {componentName
                ? `Une erreur s'est produite dans ${componentName}`
                : "Une erreur s'est produite"
              }
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div className="mb-4 p-4 bg-gray-100 rounded text-left text-sm">
                <p className="font-mono text-red-600 mb-2">{error.message}</p>
                {error.stack && (
                  <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                    {error.stack}
                  </pre>
                )}
              </div>
            )}

            {retryCount < 3 && (
              <p className="text-sm text-gray-500 mb-4">
                Tentative {retryCount + 1}/3
              </p>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.retry}
                disabled={retryCount >= 3}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {retryCount >= 3 ? 'Limite atteinte' : 'Réessayer'}
              </button>

              {isPage && (
                <a
                  href="/"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Accueil
                </a>
              )}
            </div>

            {retryCount >= 3 && (
              <p className="mt-4 text-sm text-gray-600">
                Si le problème persiste, contactez le support.
              </p>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

// Hook pour utiliser ErrorBoundary avec les composants fonctionnels
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryGranular {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundaryGranular>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

export default ErrorBoundaryGranular;
