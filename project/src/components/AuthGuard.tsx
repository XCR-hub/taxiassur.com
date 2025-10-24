import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Lock, User } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Mot de passe par défaut (à changer en production)
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'taxiassur2024';

  useEffect(() => {
    // Vérifier si déjà authentifié (session)
    const authToken = sessionStorage.getItem('taxiassur_auth');
    if (authToken === 'authenticated') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('taxiassur_auth', 'authenticated');
    } else {
      setError('Mot de passe incorrect');
      setPassword('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('taxiassur_auth');
    setPassword('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mx-auto h-16 w-16 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <Shield className="text-black" size={32} />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Backoffice TaxiAssur
              </h1>
              <p className="text-gray-600">
                Accès réservé aux administrateurs
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-3">
                  <Lock className="inline mr-2" size={16} />
                  Mot de passe administrateur
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 text-lg text-gray-900 bg-white placeholder-gray-500"
                    placeholder="Entrez le mot de passe"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-600 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="font-medium">{error}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-lg"
              >
                <User className="inline mr-2" size={20} />
                Se connecter
              </button>
            </form>

            {/* Default Credentials Info */}
            <div className="mt-8 p-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-yellow-200 rounded-xl">
              <h3 className="text-lg font-bold text-orange-900 mb-3 flex items-center">
                <Lock className="mr-2" size={18} />
                Informations de connexion
              </h3>
              <div className="space-y-2 text-yellow-800">
                <p className="flex items-center justify-between">
                  <span className="font-medium">Mot de passe :</span>
                  <code className="bg-yellow-100 px-3 py-1 rounded-lg font-mono text-lg font-bold">
                    taxiassur2024
                  </code>
                </p>
              </div>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>⚠️ Production :</strong> Changez ce mot de passe via la variable d'environnement 
                  <code className="bg-amber-100 px-1 rounded mx-1">VITE_ADMIN_PASSWORD</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>{children}</>
  );
};

export default AuthGuard;