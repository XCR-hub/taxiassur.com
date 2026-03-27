import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Car, Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-6">
      <Helmet>
        <title>Page introuvable | TaxiAssur</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Cette page n'existe pas ou a été déplacée." />
      </Helmet>
      <div className="max-w-lg w-full text-center">

        {/* Animated taxi icon */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="w-32 h-32 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center animate-pulse">
              <Car className="w-10 h-10 text-amber-400" />
            </div>
          </div>
          <div className="absolute -top-2 -right-2 w-10 h-10 bg-red-500/20 border border-red-500/40 rounded-full flex items-center justify-center">
            <span className="text-red-400 font-black text-sm">!</span>
          </div>
        </div>

        {/* 404 number */}
        <div className="mb-4">
          <span className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 leading-none">
            404
          </span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          Page introuvable
        </h1>

        <p className="text-gray-400 text-base mb-2 leading-relaxed">
          Cette page n'existe pas ou a ete deplacee.
        </p>

        {location.pathname !== '/' && (
          <p className="text-gray-600 text-sm mb-8 font-mono bg-gray-800/60 rounded-lg px-4 py-2 inline-block">
            {location.pathname}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/20"
          >
            <Home className="w-4 h-4" />
            Accueil
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-semibold rounded-xl border border-gray-700 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Page precedente
          </button>
          <Link
            to="/devis-assurance-taxi"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-semibold rounded-xl border border-gray-700 transition-all duration-200"
          >
            <Search className="w-4 h-4" />
            Obtenir un devis
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-12 border-t border-gray-800 pt-8">
          <p className="text-gray-600 text-xs uppercase tracking-wider mb-4">Pages populaires</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: 'Assurance Taxi', href: '/assurance-taxi' },
              { label: 'Devis Gratuit', href: '/devis-assurance-taxi' },
              { label: 'FAQ', href: '/faq' },
              { label: 'Contact', href: '/contact' },
              { label: 'Blog', href: '/blog' },
            ].map(link => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm text-gray-500 hover:text-amber-400 transition-colors underline underline-offset-2"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
