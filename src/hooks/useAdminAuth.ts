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

// Cache global partagé entre toutes les instances du hook
let globalAuthState: AdminAuthState | null = null;
let globalAuthInitialized = false;

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>(() => {
    // Utiliser le cache global SI déjà initialisé
    if (globalAuthInitialized && globalAuthState) {
      console.log('⚡ Using global auth cache (instant)');
      return globalAuthState;
    }

    // Sinon, essayer le localStorage
    try {
      const userStr = localStorage.getItem('taxiassur_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user && user.id) {
          const cacheAge = Date.now() - (user.cachedAt || 0);
          const sevenDays = 7 * 24 * 60 * 60 * 1000;

          if (cacheAge < sevenDays) {
            console.log('⚡ Fast init from localStorage');
            return {
              user: user,
              loading: false,
              isAuthenticated: true,
            };
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Error reading cached user:', e);
    }

    return {
      user: null,
      loading: true,
      isAuthenticated: false,
    };
  });

  const isLoadingUserRef = React.useRef(false);
  const lastLoadEmailRef = React.useRef<string>('');
  const loadTimestampRef = React.useRef<number>(0);

  const updateGlobalState = (newState: AdminAuthState) => {
    globalAuthState = newState;
    globalAuthInitialized = true;
    setState(newState);
  };

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

    const abortController = new AbortController();

    try {
      console.log('📧 Loading admin user for email:', email);

      const timeoutId = setTimeout(() => {
        console.error('⏱️ Admin load timeout after 10s, aborting...');
        abortController.abort();
      }, 10000);

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
          updateGlobalState({ user: null, loading: false, isAuthenticated: false });
          return;
        }
        console.error('❌ Error loading admin user:', error);
        updateGlobalState({ user: null, loading: false, isAuthenticated: false });
        return;
      }

      console.log('👤 Admin user data:', adminUser ? 'Found' : 'Not found');

      if (adminUser) {
        console.log('✅ Admin authenticated:', adminUser.full_name);

        const userCache = {
          ...adminUser,
          cachedAt: Date.now()
        };
        localStorage.setItem('taxiassur_user', JSON.stringify(userCache));

        // Update last_login async (ne pas bloquer)
        supabase
          .from('admin_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', adminUser.id)
          .then(() => console.log('📝 Last login updated'))
          .catch(err => console.warn('⚠️ Could not update last_login:', err));

        updateGlobalState({
          user: adminUser as AdminUser,
          loading: false,
          isAuthenticated: true,
        });
      } else {
        console.warn('⚠️ Admin user not found or inactive');
        updateGlobalState({ user: null, loading: false, isAuthenticated: false });
      }
    } catch (error: any) {
      const loadTime = Date.now() - startTime;

      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        console.error(`❌ Timeout after ${loadTime}ms, stopping request`);
      } else {
        console.error('❌ Error in loadAdminUser:', error);
        logger.error('Erreur lors du chargement admin:', error);
      }

      updateGlobalState({ user: null, loading: false, isAuthenticated: false });
    } finally {
      isLoadingUserRef.current = false;
      abortController.abort();
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Si déjà authentifié via le cache global, ne rien faire
    if (globalAuthInitialized && globalAuthState?.isAuthenticated) {
      console.log('✅ Already authenticated via global cache');
      return;
    }

    const getCachedUser = () => {
      try {
        const userStr = localStorage.getItem('taxiassur_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user && user.id) {
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
        const supabaseKey = `sb-${import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
        let stored = localStorage.getItem(supabaseKey);

        if (!stored || stored === 'null' || stored === 'undefined') {
          stored = localStorage.getItem('taxiassur-auth');
        }

        if (!stored || stored === 'null' || stored === 'undefined') return null;

        const parsed = JSON.parse(stored);
        if (!parsed?.access_token) return null;

        if (parsed.expires_at) {
          const expiresAt = parsed.expires_at * 1000;
          const timeUntilExpiry = expiresAt - Date.now();

          if (timeUntilExpiry < -7 * 24 * 60 * 60 * 1000) {
            console.log('🔄 Session expired >7 days, will re-authenticate');
            localStorage.removeItem('taxiassur-auth');
            localStorage.removeItem('taxiassur_user');
            return null;
          }

          if (timeUntilExpiry < 0) {
            console.log('⏰ Session technique expirée mais cache valide - keep-alive actif');
          } else {
            console.log(`✅ Session active (expire dans ${Math.round(timeUntilExpiry / 60000)} min)`);
          }
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

        const cachedUser = getCachedUser();
        const cachedSession = validateCachedSession();

        // FAST PATH : Si on a un utilisateur en cache ET une session, utiliser directement
        if (cachedUser && cachedSession) {
          console.log('⚡ Using cached user (ULTRA fast path)');
          updateGlobalState({
            user: cachedUser,
            loading: false,
            isAuthenticated: true,
          });
          return; // STOP ICI - pas de vérification Supabase
        }

        // Seulement si pas de cache : vérifier avec Supabase
        console.log('🔍 No valid cache, verifying with Supabase...');

        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Session check timeout')), 5000)
          )
        ]).catch(err => {
          console.warn('⚠️ Session check timeout');
          return { data: { session: null }, error: null };
        });

        const { data: { session }, error: sessionError } = result as any;

        if (!mounted) return;

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          updateGlobalState({ user: null, loading: false, isAuthenticated: false });
          return;
        }

        console.log('✅ Session verified:', !!session);

        if (session?.user) {
          console.log('👤 User found, loading admin data...');
          await loadAdminUser(session.user.email!);
        } else {
          console.log('🚫 No session found');
          updateGlobalState({ user: null, loading: false, isAuthenticated: false });
        }
      } catch (error) {
        console.error('❌ Error in initAuth:', error);
        if (mounted) {
          updateGlobalState({ user: null, loading: false, isAuthenticated: false });
        }
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event);

      if (!mounted) return;

      if (session) {
        localStorage.setItem('taxiassur-auth', JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          user: session.user
        }));
      }

      if (event === 'SIGNED_IN' && session?.user) {
        await loadAdminUser(session.user.email!);
      } else if (event === 'TOKEN_REFRESHED') {
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
        globalAuthState = null;
        globalAuthInitialized = false;
        updateGlobalState({ user: null, loading: false, isAuthenticated: false });
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadAdminUser]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();

      localStorage.removeItem('taxiassur-auth');
      localStorage.removeItem('taxiassur_user');
      localStorage.removeItem('taxiassur_permissions');
      sessionStorage.clear();

      globalAuthState = null;
      globalAuthInitialized = false;

      updateGlobalState({ user: null, loading: false, isAuthenticated: false });

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
