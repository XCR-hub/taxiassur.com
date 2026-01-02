import { supabase } from './supabase';

export type Permission =
  | 'leads:read'
  | 'leads:write'
  | 'leads:delete'
  | 'users:read'
  | 'users:write'
  | 'users:delete'
  | 'settings:read'
  | 'settings:write'
  | 'analytics:read'
  | 'content:read'
  | 'content:write'
  | 'content:delete'
  | 'campaigns:read'
  | 'campaigns:write'
  | 'campaigns:delete';

export type Role = 'admin' | 'manager' | 'agent' | 'viewer';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'leads:read',
    'leads:write',
    'leads:delete',
    'users:read',
    'users:write',
    'users:delete',
    'settings:read',
    'settings:write',
    'analytics:read',
    'content:read',
    'content:write',
    'content:delete',
    'campaigns:read',
    'campaigns:write',
    'campaigns:delete',
  ],
  manager: [
    'leads:read',
    'leads:write',
    'users:read',
    'settings:read',
    'analytics:read',
    'content:read',
    'content:write',
    'campaigns:read',
    'campaigns:write',
  ],
  agent: [
    'leads:read',
    'leads:write',
    'analytics:read',
    'content:read',
  ],
  viewer: [
    'leads:read',
    'analytics:read',
    'content:read',
  ],
};

export class RBAC {
  private currentUser: { id: string; role: Role } | null = null;

  async initialize(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new Error('User not found');
    }

    this.currentUser = data as { id: string; role: Role };
  }

  hasPermission(permission: Permission): boolean {
    if (!this.currentUser) return false;

    const permissions = ROLE_PERMISSIONS[this.currentUser.role];
    return permissions.includes(permission);
  }

  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }

  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(p => this.hasPermission(p));
  }

  hasRole(role: Role): boolean {
    return this.currentUser?.role === role;
  }

  hasAnyRole(roles: Role[]): boolean {
    if (!this.currentUser) return false;
    return roles.includes(this.currentUser.role);
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  canAccessResource(resourceType: string, action: 'read' | 'write' | 'delete'): boolean {
    const permission = `${resourceType}:${action}` as Permission;
    return this.hasPermission(permission);
  }

  async assignRole(userId: string, role: Role): Promise<void> {
    if (!this.hasPermission('users:write')) {
      throw new Error('Permission denied');
    }

    const { error } = await supabase
      .from('admin_users')
      .update({ role })
      .eq('id', userId);

    if (error) throw error;
  }

  async getUserRole(userId: string): Promise<Role | null> {
    const { data, error } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) return null;
    return data.role;
  }

  async listUsersByRole(role: Role): Promise<any[]> {
    if (!this.hasPermission('users:read')) {
      throw new Error('Permission denied');
    }

    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('role', role);

    if (error) throw error;
    return data || [];
  }

  getPermissions(): Permission[] {
    if (!this.currentUser) return [];
    return ROLE_PERMISSIONS[this.currentUser.role];
  }

  getCurrentRole(): Role | null {
    return this.currentUser?.role || null;
  }
}

export const rbac = new RBAC();

export function RequirePermission({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  if (!rbac.hasPermission(permission)) {
    return null;
  }
  return <>{children}</>;
}

export function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  if (!rbac.hasRole(role)) {
    return null;
  }
  return <>{children}</>;
}
