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
    let authInitialized = false;

    const initAuth = async () => {
      if (!mounted) return;

      try {
        console.log('🔍 Checking auth session...');

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setState({ user: null, loading: false, isAuthenticated: false });
          return;
        }

        console.log('✅ Session retrieved:', !!session);
        authInitialized = true;

        if (session?.user) {
          console.log('👤 User found, loading admin data...');
          await loadAdminUser(session.user.email!);
        } else {
          console.log('🚫 No session found');
          setState({ user: null, loading: false, isAuthenticated: false });
        }
      } catch (error) {
        console.error('❌ Error in initAuth:', error);
        if (mounted) {
          setState({ user: null, loading: false, isAuthenticated: false });
        }
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
      if (mounted && !authInitialized) {
        console.warn('⚠️ Auth initialization timeout');
        setState(prev => ({ ...prev, loading: false }));
      }
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadAdminUser = async (email: string) => {
    try {
      console.log('📧 Loading admin user for email:', email);

      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('❌ Error loading admin user:', error);
        throw error;
      }

      console.log('👤 Admin user data:', adminUser ? 'Found' : 'Not found');

      if (adminUser) {
        console.log('✅ Admin authenticated:', adminUser.full_name);

        supabase
          .from('admin_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', adminUser.id)
          .then(() => console.log('📝 Last login updated'))
          .catch(err => console.warn('⚠️ Could not update last_login:', err));

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
