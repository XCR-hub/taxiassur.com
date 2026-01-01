import React from 'react';
import { LogOut } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminLogin from './AdminLogin';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading, isAuthenticated, signOut } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
