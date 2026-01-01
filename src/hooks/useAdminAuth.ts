import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'master' | 'collaborator';
  is_active: boolean;
}

interface AdminAuthState {
  user: AdminUser | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    loading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug('Auth state changed:', event);

      if (event === 'SIGNED_IN' && session?.user) {
        await loadAdminUser(session.user.email!);
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, loading: false, isAuthenticated: false });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await loadAdminUser(session.user.email!);
      } else {
        setState({ user: null, loading: false, isAuthenticated: false });
      }
    } catch (error) {
      logger.error('Erreur lors de la vérification auth:', error);
      setState({ user: null, loading: false, isAuthenticated: false });
    }
  };

  const loadAdminUser = async (email: string) => {
    try {
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (adminUser) {
        setState({
          user: adminUser as AdminUser,
          loading: false,
          isAuthenticated: true,
        });
      } else {
        await supabase.auth.signOut();
        setState({ user: null, loading: false, isAuthenticated: false });
      }
    } catch (error) {
      logger.error('Erreur lors du chargement admin:', error);
      setState({ user: null, loading: false, isAuthenticated: false });
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setState({ user: null, loading: false, isAuthenticated: false });
    } catch (error) {
      logger.error('Erreur lors de la déconnexion:', error);
    }
  };

  const hasPermission = async (permissionType: string, action: 'view' | 'edit' | 'delete' = 'view'): Promise<boolean> => {
    if (!state.user) return false;

    if (state.user.role === 'master') return true;

    try {
      const { data, error } = await supabase.rpc('has_permission', {
        p_user_id: state.user.id,
        p_permission_type: permissionType,
        p_action: action,
      });

      if (error) throw error;
      return data || false;
    } catch (error) {
      logger.error('Erreur lors de la vérification permission:', error);
      return false;
    }
  };

  return {
    ...state,
    signOut,
    hasPermission,
    isMaster: state.user?.role === 'master',
  };
}
