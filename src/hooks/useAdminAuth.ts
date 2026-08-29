import { useCallback, useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import {
  NATIVE_ADMIN_AUTHENTICATED_EVENT,
  NATIVE_ADMIN_TOKEN_KEY,
  nativeAdminLogout,
  nativeAdminSession,
} from '@/lib/native-admin-auth';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'master' | 'collaborator';
  is_active: boolean;
}

interface Permission {
  permission_type: string;
  can_view?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}

interface AdminAuthState {
  user: AdminUser | null;
  permissions: Permission[];
  loading: boolean;
  isAuthenticated: boolean;
}

let globalAuthState: AdminAuthState | null = null;

function clearLocalAuth() {
  localStorage.removeItem(NATIVE_ADMIN_TOKEN_KEY);
  localStorage.removeItem('taxiassur_user');
  localStorage.removeItem('taxiassur_permissions');
  localStorage.removeItem('taxiassur-auth');
  localStorage.removeItem('taxiassur-admin-session');
}

function cachedAuthState(): AdminAuthState {
  if (!localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY)) return { user: null, permissions: [], loading: true, isAuthenticated: false };
  try {
    const user = JSON.parse(localStorage.getItem('taxiassur_user') || 'null') as AdminUser | null;
    const permissions = JSON.parse(localStorage.getItem('taxiassur_permissions') || '[]') as Permission[];
    if (user?.id && user.email) return { user, permissions: Array.isArray(permissions) ? permissions : [], loading: true, isAuthenticated: false };
  } catch { /* invalid cache is handled by the live session check */ }
  return { user: null, permissions: [], loading: true, isAuthenticated: false };
}

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>(() => globalAuthState || cachedAuthState());

  const updateState = useCallback((next: AdminAuthState) => {
    globalAuthState = next;
    setState(next);
  }, []);

  useEffect(() => {
    const acceptLogin = (event: Event) => {
      const data = (event as CustomEvent<{ user?: AdminUser; permissions?: Permission[] }>).detail;
      if (!data?.user) return;
      const user = { ...data.user, cachedAt: Date.now() } as AdminUser;
      const permissions = Array.isArray(data.permissions) ? data.permissions : [];
      updateState({ user, permissions, loading: false, isAuthenticated: true });
    };
    window.addEventListener(NATIVE_ADMIN_AUTHENTICATED_EVENT, acceptLogin);
    return () => window.removeEventListener(NATIVE_ADMIN_AUTHENTICATED_EVENT, acceptLogin);
  }, [updateState]);

  useEffect(() => {
    let mounted = true;
    const cachedUser = state.user;
    const cachedPermissions = state.permissions;
    if (globalAuthState?.isAuthenticated) {
      setState(globalAuthState);
      return () => { mounted = false; };
    }

    nativeAdminSession()
      .then((data) => {
        if (!mounted) return;
        const user = { ...data.user, cachedAt: Date.now() } as AdminUser;
        const permissions = Array.isArray(data.permissions) ? data.permissions as Permission[] : [];
        localStorage.setItem('taxiassur_user', JSON.stringify(user));
        localStorage.setItem('taxiassur_permissions', JSON.stringify(permissions));
        updateState({ user, permissions, loading: false, isAuthenticated: true });
      })
      .catch((error: Error & { status?: number }) => {
        if (!mounted) return;
        const rejected = error.status === 401 || error.message === 'invalid_session';
        if (rejected || !cachedUser) {
          clearLocalAuth();
          updateState({ user: null, permissions: [], loading: false, isAuthenticated: false });
          return;
        }
        logger.warn('Validation de session temporairement indisponible; session locale conservée.', error);
        updateState({ user: cachedUser, permissions: cachedPermissions, loading: false, isAuthenticated: true });
      });

    return () => { mounted = false; };
    // Do not depend on state: a rejected session updates state and would start
    // another request immediately, eventually rate-limiting the back-office.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateState]);

  const signOut = useCallback(async () => {
    try {
      await nativeAdminLogout();
    } catch (error) {
      logger.error('Erreur lors de la déconnexion native:', error);
    } finally {
      clearLocalAuth();
      sessionStorage.clear();
      globalAuthState = null;
      setState({ user: null, permissions: [], loading: false, isAuthenticated: false });
      window.location.href = '/backoffice';
    }
  }, []);

  const hasPermission = useCallback(async (
    permissionType: string,
    action: 'view' | 'edit' | 'delete' = 'view',
  ): Promise<boolean> => {
    if (!state.user) return false;
    if (state.user.role === 'master') return true;
    const permission = state.permissions.find((item) => item.permission_type === permissionType);
    return Boolean(permission?.[`can_${action}` as keyof Permission]);
  }, [state.permissions, state.user]);

  return { ...state, signOut, hasPermission, isMaster: state.user?.role === 'master' };
}
