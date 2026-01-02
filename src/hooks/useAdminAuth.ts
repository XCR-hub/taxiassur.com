import React, { useState, useEffect } from 'react';
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

  const isLoadingUserRef = React.useRef(false);

  const loadAdminUser = React.useCallback(async (email: string) => {
    if (isLoadingUserRef.current) {
      console.log('⏳ Already loading user, skipping...');
      return;
    }

    isLoadingUserRef.current = true;

    try {
      console.log('📧 Loading admin user for email:', email);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Admin user load timeout')), 2000);
      });

      const userPromise = supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle();

      const { data: adminUser, error } = await Promise.race([
        userPromise,
        timeoutPromise
      ]) as any;

      if (error) {
        console.error('❌ Error loading admin user:', error);
        setState({ user: null, loading: false, isAuthenticated: false });
        return;
      }

      console.log('👤 Admin user data:', adminUser ? 'Found' : 'Not found');

      if (adminUser) {
        console.log('✅ Admin authenticated:', adminUser.full_name);

        // Sauvegarder l'utilisateur dans localStorage pour éviter de redemander
        localStorage.setItem('taxiassur_user', JSON.stringify(adminUser));

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
        console.warn('⚠️ Admin user not found or inactive');
        setState({ user: null, loading: false, isAuthenticated: false });
      }
    } catch (error) {
      console.error('❌ Error in loadAdminUser:', error);
      logger.error('Erreur lors du chargement admin:', error);
      setState({ user: null, loading: false, isAuthenticated: false });
    } finally {
      isLoadingUserRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let authInitialized = false;

    // Vérifier si l'utilisateur est déjà en cache local (ne pas redemander à chaque navigation)
    const getCachedUser = () => {
      try {
        const userStr = localStorage.getItem('taxiassur_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user && user.id) {
            console.log('✅ User found in cache:', user.full_name);
            return user;
          }
        }
      } catch (e) {
        console.warn('⚠️ Error reading cached user:', e);
      }
      return null;
    };

    const validateCachedSession = () => {
      try {
        const stored = localStorage.getItem('taxiassur-auth');
        if (!stored || stored === 'null' || stored === 'undefined') return null;

        const parsed = JSON.parse(stored);
        if (!parsed?.access_token || !parsed?.expires_at) return null;

        const expiresAt = parsed.expires_at * 1000;
        if (Date.now() >= expiresAt) {
          console.log('🔄 Session expired, clearing cache');
          localStorage.removeItem('taxiassur-auth');
          localStorage.removeItem('taxiassur_user');
          return null;
        }

        return parsed;
      } catch (e) {
        console.warn('⚠️ Error parsing cached session:', e);
        localStorage.removeItem('taxiassur-auth');
        return null;
      }
    };

    const initAuth = async () => {
      if (!mounted) return;

      try {
        console.log('🔍 Checking auth session...');

        // AMÉLIORATION 1 : Vérifier d'abord le cache utilisateur local
        const cachedUser = getCachedUser();
        const cachedSession = validateCachedSession();

        // Si on a un utilisateur en cache ET une session valide, utiliser directement
        if (cachedUser && cachedSession) {
          console.log('⚡ Using cached user, no server check needed');
          setState({
            user: cachedUser,
            loading: false,
            isAuthenticated: true,
          });
          authInitialized = true;
          return;
        }

        // Si pas de session valide, afficher login immédiatement
        if (!cachedSession) {
          console.log('⚡ No valid cached session, showing login immediately');
          setState({ user: null, loading: false, isAuthenticated: false });
          authInitialized = true;
          return;
        }

        // Sinon vérifier avec Supabase (mais avec timeout plus long)
        console.log('✅ Valid session found, verifying with Supabase...');

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Session check timeout')), 5000); // 5s au lieu de 2s
        });

        const sessionPromise = supabase.auth.getSession();

        const result = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]).catch(err => {
          console.warn('⚠️ Session check timeout, using cached session');
          return { data: { session: cachedSession }, error: null };
        });

        const { data: { session }, error: sessionError } = result as any;

        if (!mounted) return;

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setState({ user: null, loading: false, isAuthenticated: false });
          return;
        }

        console.log('✅ Session verified:', !!session);
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
          console.log('⚡ Showing login form immediately');
          setState({ user: null, loading: false, isAuthenticated: false });
        }
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event, 'Session:', !!session);

      if (!mounted || isLoadingUserRef.current) return;

      if (event === 'SIGNED_IN' && session?.user) {
        await loadAdminUser(session.user.email!);
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, loading: false, isAuthenticated: false });
      }
    });

    const timeout = setTimeout(() => {
      if (mounted && !authInitialized) {
        console.warn('⚠️ Auth initialization timeout - showing login');
        setState({ user: null, loading: false, isAuthenticated: false });
      }
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      authListener.subscription.unsubscribe();
    };
  }, [loadAdminUser]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();

      // Nettoyer tous les caches
      localStorage.removeItem('taxiassur-auth');
      localStorage.removeItem('taxiassur_user');
      localStorage.removeItem('taxiassur_permissions');
      sessionStorage.clear();

      setState({ user: null, loading: false, isAuthenticated: false });

      // Rediriger vers login
      window.location.href = '/backoffice';
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
