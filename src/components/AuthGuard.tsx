import React, { useEffect, useState } from 'react';
import { LogOut, RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminLogin from './AdminLogin';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading, isAuthenticated, signOut } = useAdminAuth();
  const [timeout, setTimeout] = useState(false);
  const [startTime] = useState(() => performance.now());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (loading) {
        console.error('⚠️ AuthGuard timeout: chargement trop long');
        setTimeout(true);
      }
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    console.log('🔐 AuthGuard state:', { loading, isAuthenticated, hasUser: !!user });
  }, [loading, isAuthenticated, user]);

  useEffect(() => {
    if (!loading && (isAuthenticated || !user)) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      console.log(`⏱️ Auth initialization took: ${duration}ms`);

      if (duration > 3000) {
        console.warn('⚠️ Slow auth initialization detected:', duration + 'ms');
      }
    }
  }, [loading, isAuthenticated, user, startTime]);

  if (timeout && loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <RefreshCw className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Délai de connexion dépassé</h2>
          <p className="text-gray-600 mb-4">
            L'authentification prend trop de temps. Cela peut être dû à un problème de connexion ou à des données en cache.
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = '/backoffice';
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Vider le cache et réessayer
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={() => {}} />;
  }

  return (
    <div>
      {user && (
        <div className="fixed bottom-4 right-4 z-30 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 shadow-lg pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-white font-bold text-sm">{user.full_name}</p>
              <p className="text-gray-400 text-xs">{user.email}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              user.role === 'master'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
            }`}>
              {user.role === 'master' ? '👑' : '👤'}
            </span>
            <button
              onClick={signOut}
              className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
              title="Déconnexion"
              aria-label="Se déconnecter"
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
