import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Lock, User, Mail, LogOut } from 'lucide-react';
import { authenticateUser, getCurrentUser, logout, AdminUser } from '../lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    const authToken = sessionStorage.getItem('taxiassur_auth');
    const user = getCurrentUser();

    if (authToken === 'authenticated' && user) {
      setIsAuthenticated(true);
      setCurrentUser(user);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authenticateUser(email, password);

      if (result.success && result.user) {
        setIsAuthenticated(true);
        setCurrentUser(result.user);
        sessionStorage.setItem('taxiassur_auth', 'authenticated');
        sessionStorage.setItem('taxiassur_user', JSON.stringify(result.user));
        sessionStorage.setItem('taxiassur_permissions', JSON.stringify(result.permissions || []));
      } else {
        setError(result.error || 'Identifiants incorrects');
        setPassword('');
      }
    } catch (err) {
      setError('Erreur lors de la connexion');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setEmail('');
    setPassword('');
  };

  if (loading && !isAuthenticated) {
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
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
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

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-3">
                  <Mail className="inline mr-2" size={16} />
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 text-lg text-gray-900 bg-white placeholder-gray-500"
                  placeholder="votre@email.com"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-3">
                  <Lock className="inline mr-2" size={16} />
                  Mot de passe
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
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                    <span>Connexion...</span>
                  </div>
                ) : (
                  <>
                    <User className="inline mr-2" size={20} />
                    Se connecter
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 p-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-yellow-200 rounded-xl">
              <h3 className="text-lg font-bold text-orange-900 mb-3 flex items-center">
                <Lock className="mr-2" size={18} />
                Accès Master (mode de secours)
              </h3>
              <div className="space-y-2 text-yellow-800">
                <p className="text-sm">
                  Email: <code className="bg-yellow-100 px-2 py-1 rounded font-mono text-xs">master@taxiassur.com</code>
                </p>
                <p className="flex items-center justify-between">
                  <span className="font-medium text-sm">Mot de passe :</span>
                  <code className="bg-yellow-100 px-3 py-1 rounded-lg font-mono text-sm font-bold">
                    TaxiAssur2025!,&
                  </code>
                </p>
              </div>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Production :</strong> Changez ce mot de passe via la variable d'environnement
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
    <div>
      {currentUser && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-white font-bold text-sm">{currentUser.full_name}</p>
              <p className="text-gray-400 text-xs">{currentUser.email}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              currentUser.role === 'master'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
            }`}>
              {currentUser.role === 'master' ? '👑' : '👤'}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
              title="Déconnexion"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

export default AuthGuard;
