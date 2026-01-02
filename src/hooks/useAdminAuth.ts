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
    let mounted = true;

    const initAuth = async () => {
      if (mounted) {
        await checkAuth();
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event, 'Session:', !!session);

      if (!mounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        await loadAdminUser(session.user.email!);
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, loading: false, isAuthenticated: false });
      }
    });

    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('⚠️ Auth check timeout');
        setState(prev => ({ ...prev, loading: false }));
      }
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    try {
      console.log('🔍 Checking auth session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw sessionError;
      }

      console.log('✅ Session retrieved:', !!session);

      if (session?.user) {
        console.log('👤 User found, loading admin data...');
        await loadAdminUser(session.user.email!);
      } else {
        console.log('🚫 No session found');
        setState({ user: null, loading: false, isAuthenticated: false });
      }
    } catch (error) {
      console.error('❌ Error checking auth:', error);
      logger.error('Erreur lors de la vérification auth:', error);
      setState({ user: null, loading: false, isAuthenticated: false });
    }
  };

  const loadAdminUser = async (email: string) => {
    try {
      console.log('📧 Loading admin user for email:', email);

      // Créer une promesse de timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: admin_users query took too long')), 5000);
      });

      // Créer la requête
      const queryPromise = supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle();

      // Race entre la requête et le timeout
      const result = await Promise.race([queryPromise, timeoutPromise]);

      if ('error' in result && result.error) {
        console.error('❌ Error loading admin user:', result.error);
        throw result.error;
      }

      const adminUser = 'data' in result ? result.data : null;
      console.log('👤 Admin user data:', adminUser ? 'Found' : 'Not found');

      if (adminUser) {
        console.log('✅ Admin authenticated:', adminUser.full_name);
        setState({
          user: adminUser as AdminUser,
          loading: false,
          isAuthenticated: true,
        });
      } else {
        console.warn('⚠️ Admin user not found or inactive, signing out');
        await supabase.auth.signOut();
        setState({ user: null, loading: false, isAuthenticated: false });
      }
    } catch (error) {
      console.error('❌ Error in loadAdminUser:', error);
      logger.error('Erreur lors du chargement admin:', error);
      // Important: ne pas bloquer l'app - permettre d'afficher le formulaire
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
