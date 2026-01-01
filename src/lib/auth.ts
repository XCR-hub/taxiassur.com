import { supabase } from './supabase';
import { logger } from '@/lib/logger';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'master' | 'collaborator';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_type: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const MASTER_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'TaxiAssur2025!,&';

const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const authenticateUser = async (
  email: string,
  password: string
): Promise<{ success: boolean; user?: AdminUser; permissions?: UserPermission[]; error?: string }> => {
  try {
    if (password === MASTER_PASSWORD) {
      const masterUser: AdminUser = {
        id: 'master',
        email: 'master@taxiassur.com',
        full_name: 'Administrateur Master',
        role: 'master',
        is_active: true,
        created_at: new Date().toISOString()
      };

      return {
        success: true,
        user: masterUser,
        permissions: []
      };
    }

    const passwordHash = await hashPassword(password);

    const { data: users, error: userError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .eq('password_hash', passwordHash)
      .eq('is_active', true)
      .maybeSingle();

    if (userError) {
      logger.error('Database error:', userError);
      return { success: false, error: 'Erreur de base de données' };
    }

    if (!users) {
      return { success: false, error: 'Email ou mot de passe incorrect' };
    }

    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', users.id);

    await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', users.id);

    return {
      success: true,
      user: users,
      permissions: permissions || []
    };
  } catch (error) {
    logger.error('Authentication error:', error);
    return { success: false, error: 'Erreur lors de l\'authentification' };
  }
};

export const getCurrentUser = (): AdminUser | null => {
  const userStr = sessionStorage.getItem('taxiassur_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const getCurrentPermissions = (): UserPermission[] => {
  const permsStr = sessionStorage.getItem('taxiassur_permissions');
  if (!permsStr) return [];
  try {
    return JSON.parse(permsStr);
  } catch {
    return [];
  }
};

export const hasPermission = (permissionType: string, action: 'view' | 'edit' | 'delete' = 'view'): boolean => {
  const user = getCurrentUser();
  if (!user) return false;

  if (user.role === 'master') return true;

  const permissions = getCurrentPermissions();
  const perm = permissions.find(p => p.permission_type === permissionType);

  if (!perm) return false;

  switch (action) {
    case 'view':
      return perm.can_view;
    case 'edit':
      return perm.can_edit;
    case 'delete':
      return perm.can_delete;
    default:
      return false;
  }
};

export const logout = () => {
  sessionStorage.removeItem('taxiassur_auth');
  sessionStorage.removeItem('taxiassur_user');
  sessionStorage.removeItem('taxiassur_permissions');
};
