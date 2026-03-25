import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Shield, Mail, CheckCircle, XCircle, Trash2, Search,
  RefreshCw, Key, Send, AlertTriangle, X, Copy, Link, Eye,
  CreditCard as Edit3, Clock, Crown, User, Lock, ChevronRight,
  Activity, Zap, BarChart2, Globe, Settings2, Share2, TrendingUp, Database
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'master' | 'collaborator';
  is_active: boolean;
  created_at: string;
  last_login?: string;
  mfa_enabled?: boolean;
}

interface UserPermission {
  id: string;
  user_id: string;
  permission_type: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface PermissionTemplate {
  type: string;
  label: string;
  description: string;
  color: string;
  gradient: string;
  Icon: React.FC<{ size?: number; className?: string }>;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  { type: 'crm_leads', label: 'CRM & Leads', description: 'Prospects et clients', color: '#3b82f6', gradient: 'from-blue-600 to-blue-400', Icon: Users },
  { type: 'marketplace', label: 'Marketplace', description: 'Transactions', color: '#f59e0b', gradient: 'from-amber-600 to-amber-400', Icon: Database },
  { type: 'content_ia', label: 'Contenu & IA', description: 'Generation de contenu', color: '#ec4899', gradient: 'from-pink-600 to-pink-400', Icon: Zap },
  { type: 'seo', label: 'SEO', description: 'Referencement', color: '#10b981', gradient: 'from-emerald-600 to-emerald-400', Icon: TrendingUp },
  { type: 'analytics', label: 'Analytics', description: 'Statistiques', color: '#06b6d4', gradient: 'from-cyan-600 to-cyan-400', Icon: BarChart2 },
  { type: 'backlinks', label: 'Backlinks', description: 'Gestion backlinks', color: '#a855f7', gradient: 'from-purple-600 to-purple-400', Icon: Globe },
  { type: 'social_media', label: 'Reseaux Sociaux', description: 'Social media', color: '#f97316', gradient: 'from-orange-600 to-orange-400', Icon: Share2 },
  { type: 'settings', label: 'Parametres', description: 'Configuration', color: '#64748b', gradient: 'from-slate-600 to-slate-400', Icon: Settings2 },
];

type PermMap = { [key: string]: { view: boolean; edit: boolean; delete: boolean } };

function getRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Jamais';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 2) return "A l'instant";
  if (minutes < 60) return `${minutes}min`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#ec4899'];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; size?: 'sm' | 'md' }> = ({ checked, onChange, size = 'md' }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex items-center rounded-full transition-all duration-200 focus:outline-none shrink-0 ${
      size === 'sm' ? 'w-8 h-4' : 'w-11 h-6'
    }`}
    style={{
      background: checked
        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
        : 'rgba(75,85,99,0.8)',
      boxShadow: checked ? '0 0 10px rgba(245,158,11,0.35)' : 'none'
    }}
  >
    <span className={`inline-block rounded-full bg-white shadow-md transition-transform duration-200 ${
      size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
    } ${checked ? (size === 'sm' ? 'translate-x-4' : 'translate-x-6') : 'translate-x-0.5'}`} />
  </button>
);

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [permissions, setPermissions] = useState<{ [userId: string]: UserPermission[] }>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'master' | 'collaborator'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userPermissions, setUserPermissions] = useState<PermMap>({});
  const [savingPerms, setSavingPerms] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [manualLinkData, setManualLinkData] = useState<{ email: string; link: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', full_name: '', role: 'collaborator' as 'master' | 'collaborator' });
  const [newUserPermissions, setNewUserPermissions] = useState<PermMap>({});

  useEffect(() => { loadUsers(); }, []);

  const showToast = (type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const restBase = import.meta.env.VITE_SUPABASE_URL || 'https://drohhxrkoequjphvabvq.supabase.co';
  const restKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const restHeaders = { 'apikey': restKey, 'Authorization': `Bearer ${restKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

  const restGet = async (table: string, query = '') => {
    const res = await fetch(`${restBase}/rest/v1/${table}?${query}`, { headers: restHeaders });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const restPost = async (table: string, body: any) => {
    const res = await fetch(`${restBase}/rest/v1/${table}`, { method: 'POST', headers: restHeaders, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const restPatch = async (table: string, query: string, body: any) => {
    const res = await fetch(`${restBase}/rest/v1/${table}?${query}`, { method: 'PATCH', headers: restHeaders, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const restDelete = async (table: string, query: string) => {
    const res = await fetch(`${restBase}/rest/v1/${table}?${query}`, { method: 'DELETE', headers: restHeaders });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  };

  const fetchUsersDirect = async (): Promise<AdminUser[]> => {
    return restGet('admin_users', 'select=*&order=created_at.desc');
  };

  const fetchPermissionsDirect = async (userIds: string[]): Promise<UserPermission[]> => {
    const ids = userIds.map(id => `"${id}"`).join(',');
    try { return await restGet('user_permissions', `select=*&user_id=in.(${ids})`); } catch { return []; }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);

      const usersData = await fetchUsersDirect();
      setUsers(usersData || []);

      const permissionsMap: { [userId: string]: UserPermission[] } = {};
      if (usersData && usersData.length > 0) {
        const allPerms = await fetchPermissionsDirect(usersData.map(u => u.id));
        for (const user of usersData) {
          permissionsMap[user.id] = allPerms.filter(p => p.user_id === user.id);
        }
      }

      setPermissions(permissionsMap);
      if (selectedUser) {
        const updated = (usersData || []).find(u => u.id === selectedUser.id);
        if (updated) setSelectedUser(updated);
      }
    } catch (error: any) {
      console.error('loadUsers error:', error);
      logger.error('Error loading users:', error);
      showToast('error', 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const openUserDetail = useCallback((user: AdminUser) => {
    setSelectedUser(user);
    const perms = permissions[user.id] || [];
    const map: PermMap = {};
    PERMISSION_TEMPLATES.forEach(t => {
      const p = perms.find(x => x.permission_type === t.type);
      map[t.type] = { view: p?.can_view || false, edit: p?.can_edit || false, delete: p?.can_delete || false };
    });
    setUserPermissions(map);
  }, [permissions]);

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    try {
      setSavingPerms(true);
      await restDelete('user_permissions', `user_id=eq.${selectedUser.id}`);
      const toInsert = Object.entries(userPermissions)
        .filter(([, perms]) => perms.view || perms.edit || perms.delete)
        .map(([permType, perms]) => ({
          user_id: selectedUser.id, permission_type: permType,
          can_view: perms.view, can_edit: perms.edit, can_delete: perms.delete
        }));
      if (toInsert.length > 0) {
        await restPost('user_permissions', toInsert);
      }
      showToast('success', 'Permissions enregistrees');
      await loadUsers();
    } catch (err) {
      logger.error('Save perms error:', err);
      showToast('error', 'Erreur sauvegarde permissions');
    } finally { setSavingPerms(false); }
  };

  const handleToggleActive = async (userId: string, current: boolean) => {
    try {
      await restPatch('admin_users', `id=eq.${userId}`, { is_active: !current });
      showToast('success', current ? 'Utilisateur desactive' : 'Utilisateur active');
      await loadUsers();
    } catch {
      showToast('error', 'Erreur changement statut');
    }
  };

  const invokeEdgeFunction = async (name: string, body: any) => {
    const res = await fetch(`${restBase}/functions/v1/${name}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${restKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const handleResendInvite = async (user: AdminUser) => {
    try {
      setSending(true);
      const data = await invokeEdgeFunction('invite-admin-user', {
        email: user.email, full_name: user.full_name, role: user.role, permissions: [], force_resend: true
      });
      if (!data?.success) { showToast('error', data?.error || 'Erreur'); return; }
      if (!data.email_sent && data.action_link) { setManualLinkData({ email: user.email, link: data.action_link }); return; }
      showToast('success', `Invitation renvoyee a ${user.email}`);
    } catch (err) {
      showToast('error', "Erreur lors du renvoi");
    } finally { setSending(false); }
  };

  const handleResetPassword = async (user: AdminUser) => {
    try {
      setSending(true);
      const res = await fetch(`${restBase}/auth/v1/recover`, {
        method: 'POST',
        headers: { 'apikey': restKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      if (!res.ok) { showToast('error', 'Erreur envoi email'); return; }
      showToast('success', `Email de reinitialisation envoye`);
    } catch (err) {
      showToast('error', "Erreur lors de la reinitialisation");
    } finally { setSending(false); }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      setDeleting(true);
      const data = await invokeEdgeFunction('invite-admin-user', {
        action: 'delete', user_id: selectedUser.id, email: selectedUser.email
      });
      if (!data?.success) { showToast('error', data?.error || 'Erreur suppression'); return; }
      showToast('success', `${selectedUser.full_name} supprime`);
      setShowDeleteModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err) {
      showToast('error', 'Erreur lors de la suppression');
    } finally { setDeleting(false); }
  };

  const handleInviteUser = async () => {
    if (!newUser.email || !newUser.full_name) { showToast('error', "Email et nom requis"); return; }
    try {
      setSending(true);
      const perms = Object.entries(newUserPermissions)
        .filter(([, p]) => p.view || p.edit || p.delete)
        .map(([type, p]) => ({ type, view: p.view, edit: p.edit, delete: p.delete }));
      const data = await invokeEdgeFunction('invite-admin-user', {
        email: newUser.email, full_name: newUser.full_name, role: newUser.role, permissions: perms
      });
      if (!data?.success) { showToast('error', data?.error || 'Erreur inconnue'); return; }
      showToast('success', `Invitation envoyee a ${newUser.email}`);
      setShowAddModal(false);
      setNewUser({ email: '', full_name: '', role: 'collaborator' });
      setNewUserPermissions({});
      await loadUsers();
    } catch (err) {
      showToast('error', "Erreur lors de l'invitation");
    } finally { setSending(false); }
  };

  const filteredUsers = users.filter(u => {
    const q = searchTerm.toLowerCase();
    const matchSearch = u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? u.is_active : !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    masters: users.filter(u => u.role === 'master').length,
  };

  const permCount = selectedUser
    ? (permissions[selectedUser.id] || []).filter(p => p.can_view).length
    : 0;

  const avatarColor = selectedUser ? getAvatarColor(selectedUser.full_name) : '#3b82f6';

  return (
    <div className="flex flex-col" style={{ height: '100%', minHeight: '600px', background: '#0f1117' }}>

      {/* TOASTS */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold pointer-events-auto shadow-2xl"
            style={{
              background: toast.type === 'success'
                ? 'linear-gradient(135deg,#065f46,#059669)'
                : toast.type === 'error'
                ? 'linear-gradient(135deg,#7f1d1d,#dc2626)'
                : 'linear-gradient(135deg,#1e3a8a,#2563eb)',
              border: `1px solid ${toast.type === 'success' ? '#34d39940' : toast.type === 'error' ? '#f8717140' : '#60a5fa40'}`,
              color: '#fff',
              backdropFilter: 'blur(12px)'
            }}
          >
            {toast.type === 'success' ? <CheckCircle size={15} /> : toast.type === 'error' ? <XCircle size={15} /> : <Shield size={15} />}
            {toast.message}
          </div>
        ))}
      </div>

      {/* TOP BAR */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f1117 0%, #141720 60%, #1a1f2e 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 400px 80px at 0% 50%, rgba(245,158,11,0.06), transparent)'
        }} />
        <div className="flex items-center gap-4 relative">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.08))',
              border: '1px solid rgba(245,158,11,0.3)',
              boxShadow: '0 0 20px rgba(245,158,11,0.12)'
            }}
          >
            <Users size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Gestion des Utilisateurs</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {stats.total} membres &middot; {stats.active} actifs &middot; {stats.masters} master{stats.masters > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 relative">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#000',
              boxShadow: '0 4px 20px rgba(245,158,11,0.3)'
            }}
          >
            <UserPlus size={15} />
            Inviter
          </button>
        </div>
      </div>

      {/* MAIN SPLIT */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR */}
        <div
          className="w-80 shrink-0 flex flex-col overflow-hidden"
          style={{
            background: '#0d1017',
            borderRight: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          {/* Search */}
          <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-8 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  caretColor: '#f59e0b'
                }}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Filter chips */}
          <div className="px-3 py-2.5 flex gap-1.5 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                style={filterStatus === s ? {
                  background: 'rgba(245,158,11,0.15)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245,158,11,0.3)'
                } : {
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.35)',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                {s === 'all' ? 'Tous' : s === 'active' ? 'Actifs' : 'Inactifs'}
              </button>
            ))}
            <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', margin: '0 2px' }} />
            {(['all', 'master', 'collaborator'] as const).map(r => (
              <button
                key={r}
                onClick={() => setFilterRole(r)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                style={filterRole === r ? {
                  background: 'rgba(59,130,246,0.15)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59,130,246,0.3)'
                } : {
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.35)',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                {r === 'all' ? 'Roles' : r === 'master' ? 'Master' : 'Collab.'}
              </button>
            ))}
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 px-4">
                <User size={28} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.12)' }} />
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Aucun utilisateur</p>
              </div>
            ) : (
              <div className="py-1">
                {filteredUsers.map(user => {
                  const color = getAvatarColor(user.full_name);
                  const isSelected = selectedUser?.id === user.id;
                  const isOnline = user.last_login && Date.now() - new Date(user.last_login).getTime() < 86400000 * 3;
                  const userPermsCount = (permissions[user.id] || []).filter(p => p.can_view).length;

                  return (
                    <button
                      key={user.id}
                      onClick={() => openUserDetail(user)}
                      className="w-full text-left px-3 py-2.5 transition-all relative group"
                      style={isSelected ? {
                        background: 'rgba(245,158,11,0.07)',
                        borderRight: '2px solid #f59e0b',
                        borderLeft: '2px solid rgba(245,158,11,0.25)'
                      } : {
                        borderRight: '2px solid transparent',
                        borderLeft: '2px solid transparent'
                      }}
                    >
                      {isSelected && (
                        <div className="absolute inset-0 pointer-events-none" style={{
                          background: 'linear-gradient(90deg, rgba(245,158,11,0.04), transparent)'
                        }} />
                      )}
                      <div className="flex items-center gap-3 relative">
                        <div className="relative shrink-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold"
                            style={{
                              background: `linear-gradient(135deg, ${color}30, ${color}10)`,
                              border: `1.5px solid ${color}${isSelected ? '50' : '25'}`,
                              color,
                              boxShadow: isSelected ? `0 0 12px ${color}20` : 'none'
                            }}
                          >
                            {getInitials(user.full_name)}
                          </div>
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                            style={{
                              background: user.is_active ? '#10b981' : '#374151',
                              border: '2px solid #0d1017',
                              boxShadow: user.is_active && isOnline ? '0 0 6px #10b98160' : 'none'
                            }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                              {user.full_name}
                            </span>
                            {user.role === 'master' && (
                              <Crown size={10} style={{ color: '#f59e0b', flexShrink: 0 }} />
                            )}
                          </div>
                          <p className="text-[11px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            {user.email.split('@')[0]}
                          </p>
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {userPermsCount > 0 && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                              style={{
                                background: 'rgba(255,255,255,0.06)',
                                color: 'rgba(255,255,255,0.35)',
                                border: '1px solid rgba(255,255,255,0.08)'
                              }}
                            >
                              {userPermsCount}
                            </span>
                          )}
                          <ChevronRight size={12} style={{ color: isSelected ? '#f59e0b' : 'rgba(255,255,255,0.15)', transition: 'color 0.2s' }} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar footer stats */}
          <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total', value: stats.total, color: 'rgba(255,255,255,0.5)', glow: 'transparent' },
                { label: 'Actifs', value: stats.active, color: '#10b981', glow: 'rgba(16,185,129,0.2)' },
                { label: 'Masters', value: stats.masters, color: '#f59e0b', glow: 'rgba(245,158,11,0.2)' },
              ].map(({ label, value, color, glow }) => (
                <div
                  key={label}
                  className="text-center py-2.5 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}
                >
                  <p className="text-lg font-bold leading-none" style={{ color, textShadow: `0 0 12px ${glow}` }}>{value}</p>
                  <p className="text-[10px] mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT DETAIL PANEL */}
        <div className="flex-1 overflow-y-auto" style={{
          background: '#111318',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.06) transparent'
        }}>
          {!selectedUser ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03))',
                  border: '1px solid rgba(245,158,11,0.12)'
                }}
              >
                <Users size={36} style={{ color: 'rgba(255,255,255,0.12)' }} />
              </div>
              <p className="font-bold text-lg text-white mb-1.5">Selectionnez un utilisateur</p>
              <p className="text-sm max-w-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Cliquez sur un membre dans la liste pour voir et modifier ses informations et permissions
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-8 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: 'rgba(245,158,11,0.1)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245,158,11,0.25)'
                }}
              >
                <UserPlus size={15} />
                Inviter un collaborateur
              </button>
            </div>
          ) : (
            <div className="p-5 space-y-4 max-w-3xl">

              {/* PROFILE CARD */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: '#181c27',
                  border: '1px solid rgba(255,255,255,0.07)'
                }}
              >
                {/* Color banner */}
                <div
                  className="h-20 relative"
                  style={{
                    background: `linear-gradient(135deg, ${avatarColor}25, ${avatarColor}08, #181c27)`,
                    borderBottom: `1px solid ${avatarColor}15`
                  }}
                >
                  <div className="absolute inset-0" style={{
                    background: 'linear-gradient(to bottom, transparent 40%, #181c27 100%)'
                  }} />
                </div>

                <div className="px-5 pb-5">
                  {/* Avatar row */}
                  <div className="flex items-end justify-between -mt-8 mb-4">
                    <div className="relative">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold"
                        style={{
                          background: `linear-gradient(135deg, ${avatarColor}35, ${avatarColor}15)`,
                          border: `2.5px solid ${avatarColor}50`,
                          color: avatarColor,
                          boxShadow: `0 0 25px ${avatarColor}25`
                        }}
                      >
                        {getInitials(selectedUser.full_name)}
                      </div>
                      <span
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full"
                        style={{
                          background: selectedUser.is_active ? '#10b981' : '#374151',
                          border: '2.5px solid #181c27',
                          boxShadow: selectedUser.is_active ? '0 0 8px #10b98160' : 'none'
                        }}
                      />
                    </div>

                    {/* Status toggle */}
                    <div className="flex items-center gap-3 pb-1">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: selectedUser.is_active ? '#10b981' : 'rgba(255,255,255,0.3)' }}
                      >
                        {selectedUser.is_active ? 'Actif' : 'Inactif'}
                      </span>
                      <Toggle
                        checked={selectedUser.is_active}
                        onChange={() => handleToggleActive(selectedUser.id, selectedUser.is_active)}
                      />
                    </div>
                  </div>

                  {/* Name + badges */}
                  <div className="flex items-start gap-3 flex-wrap mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-xl font-bold text-white">{selectedUser.full_name}</h2>
                        <span
                          className="px-2.5 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                          style={selectedUser.role === 'master' ? {
                            background: 'rgba(245,158,11,0.15)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245,158,11,0.3)'
                          } : {
                            background: 'rgba(59,130,246,0.12)',
                            color: '#60a5fa',
                            border: '1px solid rgba(59,130,246,0.25)'
                          }}
                        >
                          {selectedUser.role === 'master' ? <Crown size={10} /> : <User size={10} />}
                          {selectedUser.role === 'master' ? 'Master' : 'Collaborateur'}
                        </span>
                        {!selectedUser.is_active && (
                          <span
                            className="px-2.5 py-0.5 rounded-lg text-xs font-bold"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                          >
                            Inactif
                          </span>
                        )}
                        {selectedUser.mfa_enabled && (
                          <span
                            className="px-2.5 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1"
                            style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}
                          >
                            <Lock size={9} />2FA
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 mt-2">
                        <span className="flex items-center gap-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                          <Mail size={13} style={{ color: 'rgba(255,255,255,0.25)' }} />
                          {selectedUser.email}
                        </span>
                        <span className="flex items-center gap-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                          <Clock size={13} style={{ color: 'rgba(255,255,255,0.25)' }} />
                          {selectedUser.last_login
                            ? <span style={Date.now() - new Date(selectedUser.last_login).getTime() < 86400000 * 3 ? { color: '#34d399' } : {}}>
                                {getRelativeTime(selectedUser.last_login)}
                              </span>
                            : 'Jamais connecte'
                          }
                        </span>
                        <span className="flex items-center gap-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          <Activity size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />
                          Depuis le {new Date(selectedUser.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Permission tags */}
                  {permCount > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      {(permissions[selectedUser.id] || []).map(perm => {
                        const t = PERMISSION_TEMPLATES.find(x => x.type === perm.permission_type);
                        if (!t) return null;
                        return (
                          <span
                            key={perm.id}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1"
                            style={{ background: `${t.color}15`, color: t.color, border: `1px solid ${t.color}30` }}
                          >
                            <t.Icon size={9} />
                            {t.label}
                            {perm.can_edit && <span style={{ opacity: 0.5 }}>E</span>}
                            {perm.can_delete && <span style={{ opacity: 0.5 }}>D</span>}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                      onClick={() => handleResendInvite(selectedUser)}
                      disabled={sending}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                      style={{
                        background: 'rgba(59,130,246,0.1)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59,130,246,0.2)'
                      }}
                    >
                      <Send size={12} />
                      Renvoyer invitation
                    </button>
                    <button
                      onClick={() => handleResetPassword(selectedUser)}
                      disabled={sending}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                      style={{
                        background: 'rgba(245,158,11,0.08)',
                        color: '#fbbf24',
                        border: '1px solid rgba(245,158,11,0.18)'
                      }}
                    >
                      <Key size={12} />
                      Reinitialiser MDP
                    </button>
                    {selectedUser.role !== 'master' && (
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ml-auto"
                        style={{
                          background: 'rgba(239,68,68,0.08)',
                          color: '#f87171',
                          border: '1px solid rgba(239,68,68,0.18)'
                        }}
                      >
                        <Trash2 size={12} />
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* PERMISSIONS CARD */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: '#181c27',
                  border: '1px solid rgba(255,255,255,0.07)'
                }}
              >
                {/* Header */}
                <div
                  className="px-5 py-4 flex items-center justify-between"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.08))',
                        border: '1px solid rgba(59,130,246,0.25)'
                      }}
                    >
                      <Shield size={14} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Permissions d'acces</h3>
                      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {permCount} module{permCount !== 1 ? 's' : ''} autorise{permCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const allOn = PERMISSION_TEMPLATES.every(t => userPermissions[t.type]?.view);
                      const map: PermMap = {};
                      PERMISSION_TEMPLATES.forEach(t => { map[t.type] = { view: !allOn, edit: !allOn, delete: !allOn }; });
                      setUserPermissions(map);
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                    style={{
                      background: 'rgba(245,158,11,0.1)',
                      color: '#f59e0b',
                      border: '1px solid rgba(245,158,11,0.2)'
                    }}
                  >
                    {PERMISSION_TEMPLATES.every(t => userPermissions[t.type]?.view) ? 'Tout retirer' : 'Tout accorder'}
                  </button>
                </div>

                {/* Permission grid */}
                <div className="p-4 grid grid-cols-2 gap-3">
                  {PERMISSION_TEMPLATES.map(template => {
                    const p = userPermissions[template.type] || { view: false, edit: false, delete: false };
                    const allOn = p.view && p.edit && p.delete;
                    const hasAny = p.view || p.edit || p.delete;
                    const { Icon } = template;

                    return (
                      <div
                        key={template.type}
                        className="rounded-xl p-3.5 transition-all"
                        style={{
                          background: hasAny ? `${template.color}08` : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${hasAny ? `${template.color}30` : 'rgba(255,255,255,0.05)'}`,
                          boxShadow: hasAny ? `0 0 20px ${template.color}08` : 'none'
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{
                                background: hasAny
                                  ? `linear-gradient(135deg, ${template.color}25, ${template.color}10)`
                                  : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${hasAny ? `${template.color}35` : 'rgba(255,255,255,0.06)'}`
                              }}
                            >
                              <Icon size={14} style={{ color: hasAny ? template.color : 'rgba(255,255,255,0.25)' }} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white leading-none">{template.label}</p>
                              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{template.description}</p>
                            </div>
                          </div>
                          <Toggle checked={allOn} onChange={v => {
                            setUserPermissions(prev => ({ ...prev, [template.type]: { view: v, edit: v, delete: v } }));
                          }} />
                        </div>

                        <div
                          className="flex gap-3 pt-3"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                        >
                          {([
                            { key: 'view' as const, label: 'Voir', Icon: Eye },
                            { key: 'edit' as const, label: 'Editer', Icon: Edit3 },
                            { key: 'delete' as const, label: 'Suppr.', Icon: Trash2 },
                          ]).map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-1.5 cursor-pointer flex-1">
                              <Toggle
                                size="sm"
                                checked={p[key]}
                                onChange={v => setUserPermissions(prev => ({
                                  ...prev,
                                  [template.type]: { ...prev[template.type], [key]: v }
                                }))}
                              />
                              <span className="text-[11px]" style={{ color: p[key] ? '#f59e0b' : 'rgba(255,255,255,0.3)' }}>{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="px-4 pb-4">
                  <button
                    onClick={handleSavePermissions}
                    disabled={savingPerms}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                    style={{
                      background: savingPerms
                        ? 'rgba(255,255,255,0.05)'
                        : 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: savingPerms ? 'rgba(255,255,255,0.3)' : '#000',
                      boxShadow: savingPerms ? 'none' : '0 4px 20px rgba(245,158,11,0.25)'
                    }}
                  >
                    <CheckCircle size={15} />
                    {savingPerms ? 'Enregistrement...' : 'Enregistrer les permissions'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* INVITE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl rounded-2xl"
            style={{ background: '#141720', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)' }}
                >
                  <UserPlus size={15} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Inviter un collaborateur</h2>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Un email sera envoye automatiquement</p>
                </div>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setNewUser({ email: '', full_name: '', role: 'collaborator' }); setNewUserPermissions({}); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Nom complet *</label>
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                    placeholder="Jean Dupont"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Email *</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                    placeholder="jean@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Role</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['collaborator', 'master'] as const).map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setNewUser({ ...newUser, role })}
                      className="flex items-center gap-3 p-3.5 rounded-xl text-left transition-all"
                      style={newUser.role === role ? {
                        border: `2px solid ${role === 'master' ? 'rgba(245,158,11,0.5)' : 'rgba(59,130,246,0.5)'}`,
                        background: role === 'master' ? 'rgba(245,158,11,0.08)' : 'rgba(59,130,246,0.08)'
                      } : {
                        border: '2px solid rgba(255,255,255,0.07)',
                        background: 'rgba(255,255,255,0.03)'
                      }}
                    >
                      {role === 'master'
                        ? <Crown size={18} style={{ color: newUser.role === role ? '#f59e0b' : 'rgba(255,255,255,0.2)' }} />
                        : <User size={18} style={{ color: newUser.role === role ? '#60a5fa' : 'rgba(255,255,255,0.2)' }} />
                      }
                      <div>
                        <p className="font-semibold text-sm text-white">{role === 'master' ? 'Master' : 'Collaborateur'}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{role === 'master' ? 'Acces complet' : 'Acces restreint'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>Permissions initiales</label>
                  <button
                    type="button"
                    onClick={() => {
                      const allOn = PERMISSION_TEMPLATES.every(t => newUserPermissions[t.type]?.view);
                      const map: PermMap = {};
                      PERMISSION_TEMPLATES.forEach(t => { map[t.type] = { view: !allOn, edit: !allOn, delete: !allOn }; });
                      setNewUserPermissions(map);
                    }}
                    className="text-xs font-semibold"
                    style={{ color: '#f59e0b' }}
                  >
                    {PERMISSION_TEMPLATES.every(t => newUserPermissions[t.type]?.view) ? 'Tout retirer' : 'Tout accorder'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {PERMISSION_TEMPLATES.map(template => {
                    const p = newUserPermissions[template.type] || { view: false, edit: false, delete: false };
                    const allOn = p.view && p.edit && p.delete;
                    const hasAny = p.view || p.edit || p.delete;
                    const { Icon } = template;
                    return (
                      <div
                        key={template.type}
                        className="rounded-xl p-3 transition-all"
                        style={{
                          background: hasAny ? `${template.color}08` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${hasAny ? `${template.color}25` : 'rgba(255,255,255,0.06)'}`
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: `${template.color}15`, border: `1px solid ${template.color}25` }}
                            >
                              <Icon size={12} style={{ color: template.color }} />
                            </div>
                            <p className="text-xs font-semibold text-white">{template.label}</p>
                          </div>
                          <Toggle checked={allOn} onChange={v => {
                            setNewUserPermissions(prev => ({ ...prev, [template.type]: { view: v, edit: v, delete: v } }));
                          }} />
                        </div>
                        <div className="flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
                          {([
                            { key: 'view' as const, label: 'Voir' },
                            { key: 'edit' as const, label: 'Edit' },
                            { key: 'delete' as const, label: 'Supp' },
                          ]).map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-1 cursor-pointer">
                              <Toggle size="sm" checked={p[key]} onChange={v => setNewUserPermissions(prev => ({ ...prev, [template.type]: { ...prev[template.type], [key]: v } }))} />
                              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              className="px-6 py-4 flex gap-3 shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <button
                onClick={handleInviteUser}
                disabled={sending || !newUser.email || !newUser.full_name}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: (sending || !newUser.email || !newUser.full_name)
                    ? 'rgba(255,255,255,0.06)'
                    : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: (sending || !newUser.email || !newUser.full_name) ? 'rgba(255,255,255,0.25)' : '#000',
                  boxShadow: (sending || !newUser.email || !newUser.full_name) ? 'none' : '0 4px 20px rgba(245,158,11,0.25)'
                }}
              >
                <Send size={14} />
                {sending ? 'Envoi...' : "Envoyer l'invitation"}
              </button>
              <button
                onClick={() => { setShowAddModal(false); setNewUser({ email: '', full_name: '', role: 'collaborator' }); setNewUserPermissions({}); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div
            className="rounded-2xl p-6 max-w-md w-full shadow-2xl"
            style={{ background: '#141720', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <div className="flex items-start gap-4 mb-5">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Supprimer ce compte ?</h2>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Cette action est irreversible.</p>
              </div>
            </div>
            <div
              className="rounded-xl p-3.5 mb-5 flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: `${getAvatarColor(selectedUser.full_name)}25`, color: getAvatarColor(selectedUser.full_name) }}
              >
                {getInitials(selectedUser.full_name)}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{selectedUser.full_name}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{selectedUser.email}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  boxShadow: '0 4px 16px rgba(220,38,38,0.25)'
                }}
              >
                <Trash2 size={14} />
                {deleting ? 'Suppression...' : 'Supprimer definitivement'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL LINK MODAL */}
      {manualLinkData && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div
            className="rounded-2xl p-6 max-w-lg w-full shadow-2xl"
            style={{ background: '#141720', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
                >
                  <Link size={15} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Lien d'invitation manuel</h2>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{manualLinkData.email}</p>
                </div>
              </div>
              <button
                onClick={() => { setManualLinkData(null); setLinkCopied(false); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
              >
                <X size={15} />
              </button>
            </div>
            <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>L'email n'a pas pu etre envoye. Transmettez ce lien directement.</p>
            <div
              className="rounded-xl p-3 mb-4 text-xs font-mono break-all select-all"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#93c5fd' }}
            >
              {manualLinkData.link}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { navigator.clipboard.writeText(manualLinkData.link); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 3000); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={linkCopied ? {
                  background: 'linear-gradient(135deg, #059669, #047857)'
                } : {
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  boxShadow: '0 4px 16px rgba(37,99,235,0.25)'
                }}
              >
                {linkCopied ? <CheckCircle size={13} /> : <Copy size={13} />}
                {linkCopied ? 'Copie !' : 'Copier le lien'}
              </button>
              <button
                onClick={() => { setManualLinkData(null); setLinkCopied(false); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
