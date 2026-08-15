import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { getSupabaseUrl } from '@/lib/env';
import { supabaseRestFetch } from '@/lib/supabase-rest';
import { NATIVE_ADMIN_TOKEN_KEY, nativeAdminLogout, nativeAdminSession } from '@/lib/native-admin-auth';

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

    try {
      const userStr = localStorage.getItem('taxiassur_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user && user.id) {
          const cacheAge = Date.now() - (user.cachedAt || 0);
          const sevenDays = 7 * 24 * 60 * 60 * 1000;

          if (cacheAge < sevenDays) {
            if (user.role === 'master') {
              return { user, loading: false, isAuthenticated: true };
            }
            const permsStr = localStorage.getItem('taxiassur_permissions');
            try {
              const perms = permsStr ? JSON.parse(permsStr) : [];
              if (Array.isArray(perms) && perms.length > 0) {
                return { user, loading: false, isAuthenticated: true };
              }
            } catch {}
          }
        }
      }
    } catch (e) {
      console.warn('Error reading cached user:', e);
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

  const loadAdminUser = React.useCallback(async (email: string, accessToken?: string) => {
    const now = Date.now();
    if (
      isLoadingUserRef.current ||
      (lastLoadEmailRef.current === email && now - loadTimestampRef.current < 60000)
    ) {
      return;
    }

    isLoadingUserRef.current = true;
    lastLoadEmailRef.current = email;
    loadTimestampRef.current = now;

    try {
      const normalizedEmail = email.toLowerCase();
      const userPath = '/rest/v1/admin_users?select=id,email,full_name,role,is_active&email=ilike.' + encodeURIComponent(normalizedEmail) + '&is_active=eq.true&limit=1';

      const res = await Promise.race([
        supabaseRestFetch(userPath, {}, { accessToken, retryWithAnonOnAuthError: true }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Admin user load timeout')), 8000)
        )
      ]);

      if (!res.ok) {
        throw new Error('Admin user load failed HTTP ' + res.status);
      }

      const rows = await res.json();
      const adminUser = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

      if (adminUser) {
        let perms: any[] = [];
        try {
          const permsRes = await supabaseRestFetch('/rest/v1/user_permissions?select=id,user_id,permission_type,can_view,can_edit,can_delete&user_id=eq.' + adminUser.id, {}, {
            accessToken,
            retryWithAnonOnAuthError: true,
          });
          if (permsRes.ok) {
            const permsData = await permsRes.json();
            if (Array.isArray(permsData)) {
              perms = permsData;
            }
          }
        } catch {
          perms = [];
        }

        localStorage.setItem('taxiassur_permissions', JSON.stringify(perms));
        const userCache = { ...adminUser, cachedAt: Date.now() };
        localStorage.setItem('taxiassur_user', JSON.stringify(userCache));

        supabaseRestFetch('/rest/v1/admin_users?id=eq.' + adminUser.id, {
          method: 'PATCH',
          body: JSON.stringify({ last_login: new Date().toISOString() })
        }, { accessToken, retryWithAnonOnAuthError: false }).catch(() => {});

        updateGlobalState({ user: adminUser as AdminUser, loading: false, isAuthenticated: true });
      } else {
        updateGlobalState({ user: null, loading: false, isAuthenticated: false });
      }
    } catch (err: any) {
      logger.error('Erreur loadAdminUser:', err);
      updateGlobalState({ user: null, loading: false, isAuthenticated: false });
    } finally {
      isLoadingUserRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    if (globalAuthInitialized && globalAuthState?.isAuthenticated) {
      const cachedAt = Number((globalAuthState.user as AdminUser & { cachedAt?: number } | null)?.cachedAt || 0);
      if (cachedAt && Date.now() - cachedAt < 5 * 60 * 1000) return;
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
        const supabaseProjectRef = getSupabaseUrl()?.split('//')[1]?.split('.')[0];
        const supabaseKey = supabaseProjectRef ? `sb-${supabaseProjectRef}-auth-token` : 'taxiassur-auth';
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

          if (timeUntilExpiry < 0) {
            console.log('⏰ Session token expired, letting Supabase auto-refresh...');
            return null;
          }

          console.log(`✅ Session active (expire dans ${Math.round(timeUntilExpiry / 60000)} min)`);
        }

        return parsed;
      } catch (e) {
        console.warn('⚠️ Error parsing cached session:', e);
        return null;
      }
    };

    const initAuth = async () => {
      if (!mounted) return;

      if (localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY)) {
        try {
          const native = await nativeAdminSession();
          const nativeUser = { ...native.user, cachedAt: Date.now() } as AdminUser;
          localStorage.setItem('taxiassur_user', JSON.stringify(nativeUser));
          updateGlobalState({ user: nativeUser, loading: false, isAuthenticated: true });
          return;
        } catch {
          localStorage.removeItem(NATIVE_ADMIN_TOKEN_KEY);
          localStorage.removeItem('taxiassur_user');
        }
      }

      let usingCachedUser = false;
      try {
        console.log('🔍 Checking auth session...');

        const cachedUser = getCachedUser();
        const cachedSession = validateCachedSession();

        if (cachedUser && cachedSession) {
          let canUseCachedUser = cachedUser.role === 'master';
          if (!canUseCachedUser) {
            const permsStr = localStorage.getItem('taxiassur_permissions');
            try {
              const perms = permsStr ? JSON.parse(permsStr) : [];
              canUseCachedUser = Array.isArray(perms) && perms.length > 0;
            } catch {}
          }

          if (canUseCachedUser) {
            updateGlobalState({ user: cachedUser, loading: false, isAuthenticated: true });
            usingCachedUser = true;
          }
        }

        // Toujours verifier Supabase en arriere-plan pour eviter les sessions obsoletes.
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
          if (!usingCachedUser) updateGlobalState({ user: null, loading: false, isAuthenticated: false });
          return;
        }

        console.log('✅ Session verified:', !!session);

        if (session?.user) {
          console.log('👤 User found, loading admin data...');
          await loadAdminUser(session.user.email!, session.access_token);
        } else {
          console.log('🚫 No session found');
          if (!usingCachedUser) updateGlobalState({ user: null, loading: false, isAuthenticated: false });
        }
      } catch (error) {
        console.error('❌ Error in initAuth:', error);
        if (mounted) {
          if (!usingCachedUser) updateGlobalState({ user: null, loading: false, isAuthenticated: false });
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
        await loadAdminUser(session.user.email!, session.access_token);
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
      if (localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY)) await nativeAdminLogout();
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
