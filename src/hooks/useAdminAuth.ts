import { useCallback, useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { nativeAdminLogout, nativeAdminSession } from '@/lib/native-admin-auth';

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
  localStorage.removeItem('taxiassur_user');
  localStorage.removeItem('taxiassur_permissions');
  localStorage.removeItem('taxiassur-auth');
  localStorage.removeItem('taxiassur-admin-session');
}

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>(() => globalAuthState || {
    user: null,
    permissions: [],
    loading: true,
    isAuthenticated: false,
  });

  const updateState = useCallback((next: AdminAuthState) => {
    globalAuthState = next;
    setState(next);
  }, []);

  useEffect(() => {
    let mounted = true;
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
      .catch(() => {
        if (!mounted) return;
        clearLocalAuth();
        updateState({ user: null, permissions: [], loading: false, isAuthenticated: false });
      });

    return () => { mounted = false; };
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
