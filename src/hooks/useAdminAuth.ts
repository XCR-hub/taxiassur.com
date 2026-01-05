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
  const lastLoadEmailRef = React.useRef<string>('');
  const loadTimestampRef = React.useRef<number>(0);

  const loadAdminUser = React.useCallback(async (email: string) => {
    const startTime = Date.now();

    // Éviter les appels dupliqués dans les 60 secondes
    const now = Date.now();
    if (
      isLoadingUserRef.current ||
      (lastLoadEmailRef.current === email && now - loadTimestampRef.current < 60000)
    ) {
      console.log('⏳ Skipping duplicate load request');
      return;
    }

    isLoadingUserRef.current = true;
    lastLoadEmailRef.current = email;
    loadTimestampRef.current = now;

    // AbortController pour annuler vraiment la requête
    const abortController = new AbortController();

    try {
      console.log('📧 Loading admin user for email:', email);

      // Timeout réduit à 10 secondes (beaucoup plus raisonnable)
      const timeoutId = setTimeout(() => {
        console.error('⏱️ Admin load timeout after 10s, aborting...');
        abortController.abort();
      }, 10000);

      // Requête avec timeout réel
      const { data: adminUser, error } = await Promise.race([
        supabase
          .from('admin_users')
          .select('id, email, full_name, role, is_active')
          .eq('email', email)
          .eq('is_active', true)
          .abortSignal(abortController.signal)
          .maybeSingle(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Admin user load timeout')), 10000)
        )
      ]);

      clearTimeout(timeoutId);

      const loadTime = Date.now() - startTime;
      if (loadTime > 5000) {
        console.warn(`⚠️ Slow auth: ${loadTime}ms`);
      }

      if (error) {
        if (error.message === 'AbortError' || error.message.includes('abort')) {
          console.error('❌ Request aborted due to timeout');
          setState({ user: null, loading: false, isAuthenticated: false });
          return;
        }
        console.error('❌ Error loading admin user:', error);
        setState({ user: null, loading: false, isAuthenticated: false });
        return;
      }

      console.log('👤 Admin user data:', adminUser ? 'Found' : 'Not found');

      if (adminUser) {
        console.log('✅ Admin authenticated:', adminUser.full_name);

        // Sauvegarder l'utilisateur dans localStorage avec timestamp
        const userCache = {
          ...adminUser,
          cachedAt: Date.now()
        };
        localStorage.setItem('taxiassur_user', JSON.stringify(userCache));

        // Update last_login de manière asynchrone (ne pas bloquer)
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
    } catch (error: any) {
      const loadTime = Date.now() - startTime;

      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        console.error(`❌ Timeout after ${loadTime}ms, stopping request`);
      } else {
        console.error('❌ Error in loadAdminUser:', error);
        logger.error('Erreur lors du chargement admin:', error);
      }

      setState({ user: null, loading: false, isAuthenticated: false });
    } finally {
      isLoadingUserRef.current = false;
      abortController.abort(); // S'assurer que la requête est annulée
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
            // Cache valide 7 JOURS (comme la session)
            const cacheAge = Date.now() - (user.cachedAt || 0);
            const sevenDays = 7 * 24 * 60 * 60 * 1000;

            if (cacheAge < sevenDays) {
              console.log('✅ User found in cache:', user.full_name, '(age:', Math.round(cacheAge / 60000), 'min)');
              return user;
            } else {
              console.log('⏰ Cached user expired after 7 days, will refresh');
              localStorage.removeItem('taxiassur_user');
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ Error reading cached user:', e);
        localStorage.removeItem('taxiassur_user');
      }
      return null;
    };

    const validateCachedSession = () => {
      try {
        // Vérifier d'abord la clé standard de Supabase
        const supabaseKey = `sb-${import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
        let stored = localStorage.getItem(supabaseKey);

        // Fallback sur notre clé custom
        if (!stored || stored === 'null' || stored === 'undefined') {
          stored = localStorage.getItem('taxiassur-auth');
        }

        if (!stored || stored === 'null' || stored === 'undefined') return null;

        const parsed = JSON.parse(stored);
        if (!parsed?.access_token || !parsed?.expires_at) return null;

        const expiresAt = parsed.expires_at * 1000;
        const timeUntilExpiry = expiresAt - Date.now();

        // AMÉLIORATION : Accepter les sessions jusqu'à 30 min expirées
        // (le keep-alive va les rafraîchir automatiquement)
        if (timeUntilExpiry < -30 * 60 * 1000) {
          console.log('🔄 Session expired >30min, will re-authenticate');
          localStorage.removeItem('taxiassur-auth');
          localStorage.removeItem('taxiassur_user');
          return null;
        }

        if (timeUntilExpiry < 0) {
          console.log('⏰ Session expired, will be refreshed by keep-alive');
        } else {
          console.log(`✅ Valid session (expires in ${Math.round(timeUntilExpiry / 60000)} min)`);
        }

        return parsed;
      } catch (e) {
        console.warn('⚠️ Error parsing cached session:', e);
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
          console.log('⚡ Using cached user (fast path)');
          setState({
            user: cachedUser,
            loading: false,
            isAuthenticated: true,
          });
          authInitialized = true;
          // Vérifier quand même la session en arrière-plan (pas de await)
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session && mounted) {
              console.warn('⚠️ Background check: session expired, requesting login');
              setState({ user: null, loading: false, isAuthenticated: false });
            }
          });
          return;
        }

        // TOUJOURS vérifier avec Supabase, même si pas de cache
        console.log('🔍 Verifying session with Supabase...');

        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Session check timeout')), 8000)
          )
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

      if (!mounted) return;

      // Sauvegarder la session dans le cache à chaque changement
      if (session) {
        localStorage.setItem('taxiassur-auth', JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          user: session.user
        }));
      }

      // Charger l'utilisateur lors du SIGNED_IN initial
      if (event === 'SIGNED_IN' && session?.user) {
        await loadAdminUser(session.user.email!);
      } else if (event === 'TOKEN_REFRESHED') {
        // Sur refresh token, mettre à jour le timestamp du cache utilisateur
        console.log('🔄 Token refreshed, updating cache timestamp');
        const userStr = localStorage.getItem('taxiassur_user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            user.cachedAt = Date.now();
            localStorage.setItem('taxiassur_user', JSON.stringify(user));
          } catch (e) {
            console.warn('⚠️ Could not update cache timestamp:', e);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('taxiassur-auth');
        localStorage.removeItem('taxiassur_user');
        setState({ user: null, loading: false, isAuthenticated: false });
      }
      // Ignorer les autres événements (USER_UPDATED, etc.)
    });

    const timeout = setTimeout(() => {
      if (mounted && !authInitialized) {
        console.warn('⚠️ Auth initialization timeout (15s) - showing login');
        setState({ user: null, loading: false, isAuthenticated: false });
      }
    }, 15000);

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
