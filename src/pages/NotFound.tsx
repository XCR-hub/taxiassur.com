import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft, AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-50 px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Page introuvable</h2>
          <p className="text-lg text-gray-600 mb-8">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all shadow-lg"
          >
            <Home className="w-5 h-5" />
            Retour à l'accueil
          </Link>

          <Link
            to="/admin/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition-all shadow-lg"
          >
            <Search className="w-5 h-5" />
            Espace administrateur
          </Link>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-800 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Page précédente
          </button>
        </div>

        <div className="mt-12 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Pages populaires :</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <Link to="/assurance-taxi" className="text-orange-600 hover:text-orange-700 hover:underline">
              Assurance Taxi
            </Link>
            <Link to="/assurance-taxi-vtc" className="text-orange-600 hover:text-orange-700 hover:underline">
              Assurance Taxi VTC
            </Link>
            <Link to="/devis" className="text-orange-600 hover:text-orange-700 hover:underline">
              Demander un devis
            </Link>
            <Link to="/contact" className="text-orange-600 hover:text-orange-700 hover:underline">
              Nous contacter
            </Link>
            <Link to="/faq" className="text-orange-600 hover:text-orange-700 hover:underline">
              Questions fréquentes
            </Link>
            <Link to="/blog" className="text-orange-600 hover:text-orange-700 hover:underline">
              Blog et actualités
            </Link>
          </div>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>Besoin d'aide ? Contactez-nous au <strong className="text-orange-600">01 80 85 57 86</strong></p>
        </div>
      </div>
    </div>
  );
}
