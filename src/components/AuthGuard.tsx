import React, { useEffect, useState } from 'react';
import { LogOut, RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminLogin from './AdminLogin';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading, isAuthenticated, signOut } = useAdminAuth();
  const [isTimeout, setIsTimeout] = useState(false);
  const [startTime] = useState(() => performance.now());
  const [forceRecheck, setForceRecheck] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (loading) {
        console.error('⚠️ AuthGuard timeout: chargement trop long');
        setIsTimeout(true);
      }
    }, 15000);

    return () => window.clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    console.log('🔐 AuthGuard state:', { loading, isAuthenticated, hasUser: !!user });
  }, [loading, isAuthenticated, user]);

  useEffect(() => {
    if (!loading && (isAuthenticated || !user)) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      if (duration < 100) {
        console.log(`⚡ Fast auth: ${duration}ms`);
      } else if (duration < 1000) {
        console.log(`✅ Auth completed: ${duration}ms`);
      } else if (duration < 3000) {
        console.log(`⏱️ Auth completed: ${duration}ms`);
      } else {
        console.warn(`⚠️ Slow auth: ${duration}ms`);
      }
    }
  }, [loading, isAuthenticated, user, startTime]);

  if (isTimeout && loading) {
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-900 font-medium mb-1">Vérification en cours...</p>
          <p className="text-gray-600 text-sm">Connexion à votre compte</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={() => {
      console.log('✅ Login success, reloading page...');
      setForceRecheck(prev => prev + 1);
    }} />;
  }

  return (
    <>
      {children}
    </>
  );
};

export default AuthGuard;
