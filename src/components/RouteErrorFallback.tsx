import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';

export default function RouteErrorFallback() {
  const error = useRouteError();

  console.error('Route error:', error);

  let errorMessage = 'Une erreur inattendue s\'est produite';
  let errorDetails = '';

  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || errorMessage;
    if (error.status === 404) {
      errorMessage = 'Page introuvable';
      errorDetails = 'La page que vous recherchez n\'existe pas.';
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
    if (error.message.includes('Minified React error #130')) {
      errorMessage = 'Erreur de chargement du composant';
      errorDetails = 'Un composant n\'a pas pu être chargé. Veuillez rafraîchir la page.';
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {errorMessage}
        </h1>

        {errorDetails && (
          <p className="text-gray-600 mb-6">
            {errorDetails}
          </p>
        )}

        {process.env.NODE_ENV === 'development' && error instanceof Error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
            <p className="text-xs text-red-800 font-mono break-all">
              {error.stack}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            to="/"
            className="block w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Retour à l'accueil
          </Link>

          <button
            onClick={() => window.location.reload()}
            className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Rafraîchir la page
          </button>

          <a
            href="tel:0180855786"
            className="block w-full border border-orange-600 text-orange-600 hover:bg-orange-50 font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Nous contacter : 01 80 85 57 86
          </a>
        </div>
      </div>
    </div>
  );
}
