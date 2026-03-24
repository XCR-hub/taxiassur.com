import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Mail, CheckCircle, XCircle, Trash2, Search, Filter, RefreshCw, Key, Send, AlertTriangle, X, Copy, Link, Eye, CreditCard as Edit3, Clock, Activity, ChevronDown, MoreVertical, UserCheck, UserX, Crown, User, Lock, Unlock } from 'lucide-react';
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
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  { type: 'crm_leads', label: 'CRM & Leads', description: 'Prospects et clients', color: '#3b82f6' },
  { type: 'marketplace', label: 'Marketplace', description: 'Transactions', color: '#8b5cf6' },
  { type: 'content_ia', label: 'Contenu & IA', description: 'Generation de contenu', color: '#ec4899' },
  { type: 'seo', label: 'SEO', description: 'Referencement', color: '#10b981' },
  { type: 'analytics', label: 'Analytics', description: 'Statistiques', color: '#f59e0b' },
  { type: 'backlinks', label: 'Backlinks', description: 'Gestion backlinks', color: '#06b6d4' },
  { type: 'social_media', label: 'Reseaux Sociaux', description: 'Social media', color: '#f97316' },
  { type: 'settings', label: 'Parametres', description: 'Configuration', color: '#6b7280' }
];

function getRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Jamais connecte';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 2) return "A l'instant";
  if (minutes < 60) return `Il y a ${minutes}min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

type PermMap = { [key: string]: { view: boolean; edit: boolean; delete: boolean } };

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; small?: boolean }> = ({ checked, onChange, small }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex items-center rounded-full transition-colors focus:outline-none ${small ? 'w-8 h-4' : 'w-10 h-5'} ${checked ? 'bg-amber-500' : 'bg-gray-600'}`}
  >
    <span className={`inline-block rounded-full bg-white shadow transition-transform ${small ? 'w-3 h-3' : 'w-4 h-4'} ${checked ? (small ? 'translate-x-4' : 'translate-x-5') : 'translate-x-0.5'}`} />
  </button>
);

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [permissions, setPermissions] = useState<{ [userId: string]: UserPermission[] }>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'master' | 'collaborator'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [manualLinkData, setManualLinkData] = useState<{ email: string; link: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [savingPerms, setSavingPerms] = useState(false);

  const [newUser, setNewUser] = useState({ email: '', full_name: '', role: 'collaborator' as 'master' | 'collaborator' });
  const [userPermissions, setUserPermissions] = useState<PermMap>({});

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => {
    const close = () => setOpenMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const showToast = (type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data: usersData, error } = await supabase
        .from('admin_users').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(usersData || []);
      const permissionsMap: { [userId: string]: UserPermission[] } = {};
      for (const user of usersData || []) {
        const { data: permsData } = await supabase.from('user_permissions').select('*').eq('user_id', user.id);
        permissionsMap[user.id] = permsData || [];
      }
      setPermissions(permissionsMap);
    } catch (error) {
      logger.error('Error loading users:', error);
      showToast('error', 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!newUser.email || !newUser.full_name) { showToast('error', "Email et nom requis"); return; }
    try {
      setSending(true);
      const perms = Object.entries(userPermissions)
        .filter(([, p]) => p.view || p.edit || p.delete)
        .map(([type, p]) => ({ type, view: p.view, edit: p.edit, delete: p.delete }));
      const { data, error } = await supabase.functions.invoke('invite-admin-user', {
        body: { email: newUser.email, full_name: newUser.full_name, role: newUser.role, permissions: perms }
      });
      if (error || !data?.success) { showToast('error', error?.message || data?.error || 'Erreur inconnue'); return; }
      showToast('success', `Invitation envoyee a ${newUser.email}`);
      setShowAddModal(false);
      setNewUser({ email: '', full_name: '', role: 'collaborator' });
      setUserPermissions({});
      await loadUsers();
    } catch (err) {
      logger.error('Invite error:', err);
      showToast('error', "Erreur lors de l'invitation");
    } finally { setSending(false); }
  };

  const handleResendInvite = async (user: AdminUser) => {
    try {
      setSending(true);
      const { data, error } = await supabase.functions.invoke('invite-admin-user', {
        body: { email: user.email, full_name: user.full_name, role: user.role, permissions: [], force_resend: true }
      });
      if (error || !data?.success) { showToast('error', error?.message || data?.error || 'Erreur'); return; }
      if (!data.email_sent && data.action_link) { setManualLinkData({ email: user.email, link: data.action_link }); return; }
      showToast('success', `Invitation renvoyee a ${user.email}`);
    } catch (err) {
      logger.error('Resend error:', err);
      showToast('error', "Erreur lors du renvoi");
    } finally { setSending(false); }
  };

  const handleResetPassword = async (user: AdminUser) => {
    try {
      setSending(true);
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      if (error) { showToast('error', error.message); return; }
      showToast('success', `Email de reinitialisation envoye a ${user.email}`);
    } catch (err) {
      logger.error('Reset error:', err);
      showToast('error', "Erreur lors de la reinitialisation");
    } finally { setSending(false); }
  };

  const handleToggleActive = async (userId: string, current: boolean) => {
    const { error } = await supabase.from('admin_users').update({ is_active: !current }).eq('id', userId);
    if (error) { showToast('error', 'Erreur changement statut'); return; }
    showToast('success', current ? 'Utilisateur desactive' : 'Utilisateur active');
    loadUsers();
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setDeleting(true);
      const { data, error } = await supabase.functions.invoke('invite-admin-user', {
        body: { action: 'delete', user_id: userToDelete.id, email: userToDelete.email }
      });
      if (error || !data?.success) { showToast('error', error?.message || data?.error || 'Erreur suppression'); return; }
      showToast('success', `${userToDelete.full_name} supprime`);
      setShowDeleteModal(false);
      setUserToDelete(null);
      loadUsers();
    } catch (err) {
      logger.error('Delete error:', err);
      showToast('error', 'Erreur lors de la suppression');
    } finally { setDeleting(false); }
  };

  const openPermissionsModal = (user: AdminUser) => {
    setSelectedUser(user);
    const perms = permissions[user.id] || [];
    const map: PermMap = {};
    PERMISSION_TEMPLATES.forEach(t => {
      const p = perms.find(x => x.permission_type === t.type);
      map[t.type] = { view: p?.can_view || false, edit: p?.can_edit || false, delete: p?.can_delete || false };
    });
    setUserPermissions(map);
    setShowPermissionsModal(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    try {
      setSavingPerms(true);
      await supabase.from('user_permissions').delete().eq('user_id', selectedUser.id);
      for (const [permType, perms] of Object.entries(userPermissions)) {
        if (perms.view || perms.edit || perms.delete) {
          await supabase.from('user_permissions').insert([{
            user_id: selectedUser.id, permission_type: permType,
            can_view: perms.view, can_edit: perms.edit, can_delete: perms.delete
          }]);
        }
      }
      showToast('success', 'Permissions enregistrees');
      setShowPermissionsModal(false);
      loadUsers();
    } catch (err) {
      logger.error('Save perms error:', err);
      showToast('error', 'Erreur sauvegarde permissions');
    } finally { setSavingPerms(false); }
  };

  const toggleAllPerms = (type: string, on: boolean) => {
    setUserPermissions(prev => ({ ...prev, [type]: { view: on, edit: on, delete: on } }));
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
    inactive: users.filter(u => !u.is_active).length,
    masters: users.filter(u => u.role === 'master').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* TOASTS */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold pointer-events-auto animate-slide-in ${
            toast.type === 'success' ? 'bg-green-600 text-white' :
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
          }`}>
            {toast.type === 'success' ? <CheckCircle size={16} /> : toast.type === 'error' ? <XCircle size={16} /> : <Shield size={16} />}
            {toast.message}
          </div>
        ))}
      </div>

      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="w-9 h-9 bg-amber-500/15 rounded-xl flex items-center justify-center border border-amber-500/30">
              <Users size={18} className="text-amber-400" />
            </div>
            Gestion des Utilisateurs
          </h1>
          <p className="text-gray-400 text-sm mt-1 ml-12">Acces, roles et permissions de vos collaborateurs</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadUsers} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border border-gray-700">
            <RefreshCw size={15} />
            Actualiser
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-amber-500/20"
          >
            <UserPlus size={16} />
            Inviter un collaborateur
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)' },
          { label: 'Actifs', value: stats.active, icon: UserCheck, color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
          { label: 'Inactifs', value: stats.inactive, icon: UserX, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
          { label: 'Masters', value: stats.masters, icon: Crown, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className="rounded-xl p-4 flex items-center gap-4" style={{ background: bg, border: `1px solid ${border}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white leading-none">{value}</p>
              <p className="text-xs mt-0.5" style={{ color }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH + FILTERS */}
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-4">
        <div className="flex gap-3 mb-5">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-900/80 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value as any)}
              className="pl-8 pr-8 py-2.5 bg-gray-900/80 border border-gray-700 rounded-xl text-sm text-white focus:ring-1 focus:ring-amber-500 appearance-none cursor-pointer"
            >
              <option value="all">Tous les roles</option>
              <option value="master">Master</option>
              <option value="collaborator">Collaborateur</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          <div className="relative">
            <Activity size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="pl-8 pr-8 py-2.5 bg-gray-900/80 border border-gray-700 rounded-xl text-sm text-white focus:ring-1 focus:ring-amber-500 appearance-none cursor-pointer"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* USER LIST */}
        <div className="space-y-3">
          {filteredUsers.map(user => {
            const avatarColor = getAvatarColor(user.full_name);
            const perms = permissions[user.id] || [];
            const isMenuOpen = openMenuId === user.id;
            const isRecentlyActive = user.last_login && Date.now() - new Date(user.last_login).getTime() < 86400000 * 3;

            return (
              <div
                key={user.id}
                className="group relative bg-gray-900/60 border border-gray-700/60 rounded-xl p-4 hover:border-gray-600 transition-all"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: `${avatarColor}25`, border: `2px solid ${avatarColor}40`, color: avatarColor }}
                    >
                      {getInitials(user.full_name)}
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900"
                      style={{ background: user.is_active ? '#10b981' : '#6b7280' }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-white text-sm">{user.full_name}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        user.role === 'master'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      }`}>
                        {user.role === 'master' ? <span className="flex items-center gap-1"><Crown size={9} />Master</span> : 'Collaborateur'}
                      </span>
                      {!user.is_active && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                          Inactif
                        </span>
                      )}
                      {user.mfa_enabled && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                          <Lock size={9} />2FA
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[12px] text-gray-500">
                      <span className="flex items-center gap-1"><Mail size={11} />{user.email}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        <span className={isRecentlyActive ? 'text-green-500' : ''}>{getRelativeTime(user.last_login)}</span>
                      </span>
                      <span>Depuis le {new Date(user.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                    {perms.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {perms.map(perm => {
                          const t = PERMISSION_TEMPLATES.find(x => x.type === perm.permission_type);
                          if (!t) return null;
                          return (
                            <span
                              key={perm.id}
                              className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                              style={{ background: `${t.color}15`, color: t.color, border: `1px solid ${t.color}30` }}
                            >
                              {t.label}
                              {perm.can_edit && <span className="opacity-60 ml-0.5">·E</span>}
                              {perm.can_delete && <span className="opacity-60 ml-0.5">·D</span>}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ACTIONS */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openPermissionsModal(user)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 text-xs font-semibold border border-blue-500/20 transition-all"
                    >
                      <Shield size={13} />
                      Permissions
                    </button>

                    <button
                      onClick={e => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : user.id); }}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {/* Dropdown menu */}
                    {isMenuOpen && (
                      <div
                        className="absolute right-4 top-14 z-30 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-48 py-1 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => { handleResendInvite(user); setOpenMenuId(null); }}
                          disabled={sending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
                        >
                          <Send size={14} className="text-gray-400" />
                          Renvoyer invitation
                        </button>
                        <button
                          onClick={() => { handleResetPassword(user); setOpenMenuId(null); }}
                          disabled={sending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
                        >
                          <Key size={14} className="text-gray-400" />
                          Reinitialiser MDP
                        </button>
                        <div className="my-1 border-t border-gray-700" />
                        <button
                          onClick={() => { handleToggleActive(user.id, user.is_active); setOpenMenuId(null); }}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                            user.is_active
                              ? 'text-amber-400 hover:bg-amber-500/10'
                              : 'text-green-400 hover:bg-green-500/10'
                          }`}
                        >
                          {user.is_active ? <><Unlock size={14} />Desactiver le compte</> : <><Lock size={14} />Activer le compte</>}
                        </button>
                        {user.role !== 'master' && (
                          <>
                            <div className="my-1 border-t border-gray-700" />
                            <button
                              onClick={() => { setUserToDelete(user); setShowDeleteModal(true); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 size={14} />
                              Supprimer le compte
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User size={24} className="text-gray-600" />
              </div>
              <p className="text-gray-500 font-medium">Aucun utilisateur trouve</p>
              <p className="text-gray-600 text-sm mt-1">Essayez de modifier les filtres</p>
            </div>
          )}
        </div>
      </div>

      {/* INVITE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-500/15 rounded-xl flex items-center justify-center border border-amber-500/30">
                  <UserPlus size={17} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Inviter un collaborateur</h2>
                  <p className="text-xs text-gray-500">Un email d'invitation sera envoye</p>
                </div>
              </div>
              <button onClick={() => { setShowAddModal(false); setNewUser({ email: '', full_name: '', role: 'collaborator' }); setUserPermissions({}); }}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Nom complet *</label>
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    placeholder="Ex: Jean Dupont"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Adresse email *</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    placeholder="jean@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Role</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['collaborator', 'master'] as const).map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setNewUser({ ...newUser, role })}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                        newUser.role === role
                          ? role === 'master'
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                    >
                      {role === 'master'
                        ? <Crown size={20} className={newUser.role === role ? 'text-amber-400' : 'text-gray-500'} />
                        : <User size={20} className={newUser.role === role ? 'text-blue-400' : 'text-gray-500'} />
                      }
                      <div>
                        <p className={`font-semibold text-sm ${newUser.role === role ? 'text-white' : 'text-gray-400'}`}>
                          {role === 'master' ? 'Master' : 'Collaborateur'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {role === 'master' ? 'Acces complet' : 'Acces restreint'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                    <Shield size={13} />
                    Permissions d'acces
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const allOn = PERMISSION_TEMPLATES.every(t => userPermissions[t.type]?.view);
                      const map: PermMap = {};
                      PERMISSION_TEMPLATES.forEach(t => { map[t.type] = { view: !allOn, edit: !allOn, delete: !allOn }; });
                      setUserPermissions(map);
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
                  >
                    {PERMISSION_TEMPLATES.every(t => userPermissions[t.type]?.view) ? 'Tout deselectionner' : 'Tout selectionner'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {PERMISSION_TEMPLATES.map(template => {
                    const p = userPermissions[template.type] || { view: false, edit: false, delete: false };
                    const allOn = p.view && p.edit && p.delete;
                    return (
                      <div key={template.type} className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3.5">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{template.label}</p>
                            <p className="text-xs text-gray-500">{template.description}</p>
                          </div>
                          <Toggle checked={allOn} onChange={v => toggleAllPerms(template.type, v)} />
                        </div>
                        <div className="flex gap-4">
                          {([
                            { key: 'view', label: 'Voir', icon: Eye },
                            { key: 'edit', label: 'Editer', icon: Edit3 },
                            { key: 'delete', label: 'Suppr.', icon: Trash2 },
                          ] as const).map(({ key, label, icon: Icon }) => (
                            <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                              <Toggle small checked={(p as any)[key]} onChange={v => setUserPermissions(prev => ({ ...prev, [template.type]: { ...prev[template.type], [key]: v } }))} />
                              <span className="text-[11px] text-gray-400">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 px-6 py-4 flex gap-3">
              <button
                onClick={handleInviteUser}
                disabled={sending || !newUser.email || !newUser.full_name}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-2.5 rounded-xl text-sm transition-all"
              >
                <Send size={15} />
                {sending ? 'Envoi en cours...' : "Envoyer l'invitation"}
              </button>
              <button
                onClick={() => { setShowAddModal(false); setNewUser({ email: '', full_name: '', role: 'collaborator' }); setUserPermissions({}); }}
                className="px-5 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 border border-gray-700 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMISSIONS MODAL */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{ background: `${getAvatarColor(selectedUser.full_name)}25`, color: getAvatarColor(selectedUser.full_name) }}
                >
                  {getInitials(selectedUser.full_name)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Permissions — {selectedUser.full_name}</h2>
                  <p className="text-xs text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allOn = PERMISSION_TEMPLATES.every(t => userPermissions[t.type]?.view);
                    const map: PermMap = {};
                    PERMISSION_TEMPLATES.forEach(t => { map[t.type] = { view: !allOn, edit: !allOn, delete: !allOn }; });
                    setUserPermissions(map);
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium px-3 py-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20 transition-all"
                >
                  {PERMISSION_TEMPLATES.every(t => userPermissions[t.type]?.view) ? 'Tout retirer' : 'Tout accorder'}
                </button>
                <button onClick={() => setShowPermissionsModal(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-3">
                {PERMISSION_TEMPLATES.map(template => {
                  const p = userPermissions[template.type] || { view: false, edit: false, delete: false };
                  const allOn = p.view && p.edit && p.delete;
                  return (
                    <div key={template.type} className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3.5">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ background: template.color }} />
                            {template.label}
                          </p>
                          <p className="text-xs text-gray-500">{template.description}</p>
                        </div>
                        <Toggle checked={allOn} onChange={v => toggleAllPerms(template.type, v)} />
                      </div>
                      <div className="flex gap-4">
                        {([
                          { key: 'view', label: 'Voir', icon: Eye },
                          { key: 'edit', label: 'Editer', icon: Edit3 },
                          { key: 'delete', label: 'Suppr.', icon: Trash2 },
                        ] as const).map(({ key, label, icon: Icon }) => (
                          <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                            <Toggle small checked={(p as any)[key]} onChange={v => setUserPermissions(prev => ({ ...prev, [template.type]: { ...prev[template.type], [key]: v } }))} />
                            <span className="text-[11px] text-gray-400">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 px-6 py-4 flex gap-3">
              <button
                onClick={handleSavePermissions}
                disabled={savingPerms}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-2.5 rounded-xl text-sm transition-all"
              >
                <CheckCircle size={15} />
                {savingPerms ? 'Enregistrement...' : 'Enregistrer les permissions'}
              </button>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-5 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 border border-gray-700 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-red-500/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-11 h-11 bg-red-500/15 rounded-xl flex items-center justify-center shrink-0 border border-red-500/25">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Supprimer ce compte ?</h2>
                <p className="text-gray-400 text-sm mt-0.5">Cette action est irreversible</p>
              </div>
            </div>
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3.5 mb-5 flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: `${getAvatarColor(userToDelete.full_name)}25`, color: getAvatarColor(userToDelete.full_name) }}
              >
                {getInitials(userToDelete.full_name)}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{userToDelete.full_name}</p>
                <p className="text-gray-400 text-xs">{userToDelete.email}</p>
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-5 leading-relaxed">
              Le compte d'authentification, les donnees admin et toutes les permissions seront definitivement supprimes.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
              >
                <Trash2 size={14} />
                {deleting ? 'Suppression...' : 'Supprimer definitivement'}
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }}
                className="px-5 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 border border-gray-700 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL LINK MODAL */}
      {manualLinkData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-amber-500/20 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-500/15 rounded-xl flex items-center justify-center border border-amber-500/25">
                  <Link size={16} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Lien d'invitation manuel</h2>
                  <p className="text-xs text-gray-400">{manualLinkData.email}</p>
                </div>
              </div>
              <button onClick={() => { setManualLinkData(null); setLinkCopied(false); }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all">
                <X size={16} />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-3 leading-relaxed">
              L'email n'a pas pu etre envoye. Copiez ce lien et transmettez-le directement a l'utilisateur.
            </p>
            <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-3 mb-4 text-xs text-blue-300 font-mono break-all select-all">
              {manualLinkData.link}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { navigator.clipboard.writeText(manualLinkData.link); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 3000); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${linkCopied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
              >
                {linkCopied ? <CheckCircle size={14} /> : <Copy size={14} />}
                {linkCopied ? 'Copie !' : 'Copier le lien'}
              </button>
              <button onClick={() => { setManualLinkData(null); setLinkCopied(false); }} className="px-5 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 border border-gray-700 transition-all">
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
