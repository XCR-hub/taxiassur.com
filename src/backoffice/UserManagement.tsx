import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Shield, Mail, CheckCircle, XCircle, Trash2, Search,
  RefreshCw, Key, Send, AlertTriangle, X, Copy, Link, Eye,
  CreditCard as Edit3, Clock, Crown, User, Lock, Unlock, ChevronRight,
  Settings, MoreHorizontal, Activity, Star, Zap
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
  icon: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  { type: 'crm_leads', label: 'CRM & Leads', description: 'Prospects et clients', color: '#3b82f6', icon: '👥' },
  { type: 'marketplace', label: 'Marketplace', description: 'Transactions', color: '#f59e0b', icon: '🏪' },
  { type: 'content_ia', label: 'Contenu & IA', description: 'Generation de contenu', color: '#ec4899', icon: '✨' },
  { type: 'seo', label: 'SEO', description: 'Referencement', color: '#10b981', icon: '📈' },
  { type: 'analytics', label: 'Analytics', description: 'Statistiques', color: '#06b6d4', icon: '📊' },
  { type: 'backlinks', label: 'Backlinks', description: 'Gestion backlinks', color: '#8b5cf6', icon: '🔗' },
  { type: 'social_media', label: 'Reseaux Sociaux', description: 'Social media', color: '#f97316', icon: '📱' },
  { type: 'settings', label: 'Parametres', description: 'Configuration', color: '#6b7280', icon: '⚙️' },
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
    className={`relative inline-flex items-center rounded-full transition-all focus:outline-none ${
      size === 'sm' ? 'w-8 h-4' : 'w-11 h-6'
    } ${checked ? 'bg-amber-500' : 'bg-gray-600'}`}
  >
    <span className={`inline-block rounded-full bg-white shadow transition-transform ${
      size === 'sm' ? 'w-3 h-3' : 'w-5 h-5'
    } ${checked ? (size === 'sm' ? 'translate-x-4' : 'translate-x-5') : 'translate-x-0.5'}`} />
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
      if (selectedUser) {
        const updated = (usersData || []).find(u => u.id === selectedUser.id);
        if (updated) setSelectedUser(updated);
      }
    } catch (error) {
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
      await loadUsers();
    } catch (err) {
      logger.error('Save perms error:', err);
      showToast('error', 'Erreur sauvegarde permissions');
    } finally { setSavingPerms(false); }
  };

  const handleToggleActive = async (userId: string, current: boolean) => {
    const { error } = await supabase.from('admin_users').update({ is_active: !current }).eq('id', userId);
    if (error) { showToast('error', 'Erreur changement statut'); return; }
    showToast('success', current ? 'Utilisateur desactive' : 'Utilisateur active');
    await loadUsers();
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
      showToast('success', `Email de reinitialisation envoye`);
    } catch (err) {
      showToast('error', "Erreur lors de la reinitialisation");
    } finally { setSending(false); }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      setDeleting(true);
      const { data, error } = await supabase.functions.invoke('invite-admin-user', {
        body: { action: 'delete', user_id: selectedUser.id, email: selectedUser.email }
      });
      if (error || !data?.success) { showToast('error', error?.message || data?.error || 'Erreur suppression'); return; }
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
      const { data, error } = await supabase.functions.invoke('invite-admin-user', {
        body: { email: newUser.email, full_name: newUser.full_name, role: newUser.role, permissions: perms }
      });
      if (error || !data?.success) { showToast('error', error?.message || data?.error || 'Erreur inconnue'); return; }
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

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 'calc(100vh - 80px)' }}>

      {/* TOASTS */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold pointer-events-auto ${
            toast.type === 'success' ? 'bg-green-600 text-white' :
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
          }`}>
            {toast.type === 'success' ? <CheckCircle size={15} /> : toast.type === 'error' ? <XCircle size={15} /> : <Shield size={15} />}
            {toast.message}
          </div>
        ))}
      </div>

      {/* TOP BAR */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <Users size={17} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-none">Gestion des Utilisateurs</h1>
            <p className="text-xs text-gray-500 mt-0.5">{stats.total} membres · {stats.active} actifs · {stats.masters} master{stats.masters > 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl border border-gray-700 transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-amber-500/20"
          >
            <UserPlus size={15} />
            Inviter
          </button>
        </div>
      </div>

      {/* MAIN SPLIT */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR */}
        <div className="w-80 shrink-0 border-r border-gray-800 flex flex-col bg-gray-900/30 overflow-hidden">

          {/* Search */}
          <div className="p-3 border-b border-gray-800/60">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-8 py-2 bg-gray-800/80 border border-gray-700/60 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Filter chips */}
          <div className="px-3 py-2 border-b border-gray-800/60 flex gap-1.5 flex-wrap">
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  filterStatus === s
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-gray-800/60 text-gray-500 border border-gray-700/50 hover:text-gray-300'
                }`}
              >
                {s === 'all' ? 'Tous' : s === 'active' ? 'Actifs' : 'Inactifs'}
              </button>
            ))}
            <div className="w-px bg-gray-700/60 mx-0.5" />
            {(['all', 'master', 'collaborator'] as const).map(r => (
              <button
                key={r}
                onClick={() => setFilterRole(r)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  filterRole === r
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'bg-gray-800/60 text-gray-500 border border-gray-700/50 hover:text-gray-300'
                }`}
              >
                {r === 'all' ? 'Roles' : r === 'master' ? 'Master' : 'Collab.'}
              </button>
            ))}
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 px-4">
                <User size={28} className="text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Aucun utilisateur</p>
              </div>
            ) : (
              <div className="py-1">
                {filteredUsers.map(user => {
                  const avatarColor = getAvatarColor(user.full_name);
                  const isSelected = selectedUser?.id === user.id;
                  const isRecentlyActive = user.last_login && Date.now() - new Date(user.last_login).getTime() < 86400000 * 3;
                  const userPermsCount = (permissions[user.id] || []).filter(p => p.can_view).length;

                  return (
                    <button
                      key={user.id}
                      onClick={() => openUserDetail(user)}
                      className={`w-full text-left px-3 py-2.5 transition-all relative group ${
                        isSelected
                          ? 'bg-gray-800/80 border-r-2 border-amber-500'
                          : 'hover:bg-gray-800/40 border-r-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold"
                            style={{
                              background: `${avatarColor}20`,
                              border: `2px solid ${avatarColor}${isSelected ? '60' : '30'}`,
                              color: avatarColor
                            }}
                          >
                            {getInitials(user.full_name)}
                          </div>
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900"
                            style={{ background: user.is_active ? '#10b981' : '#4b5563' }}
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                              {user.full_name}
                            </span>
                            {user.role === 'master' && (
                              <Crown size={10} className="text-amber-400 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-gray-500 truncate">{user.email.split('@')[0]}</span>
                            {isRecentlyActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" title="Actif recemment" />
                            )}
                          </div>
                        </div>

                        {/* Permission count */}
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {userPermsCount > 0 && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-700/60 text-gray-400">
                              {userPermsCount} droits
                            </span>
                          )}
                          <ChevronRight size={12} className={`transition-colors ${isSelected ? 'text-amber-400' : 'text-gray-700 group-hover:text-gray-500'}`} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar footer */}
          <div className="p-3 border-t border-gray-800/60">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total', value: stats.total, color: '#64748b' },
                { label: 'Actifs', value: stats.active, color: '#10b981' },
                { label: 'Masters', value: stats.masters, color: '#f59e0b' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center py-2 rounded-lg bg-gray-800/40 border border-gray-700/40">
                  <p className="text-base font-bold" style={{ color }}>{value}</p>
                  <p className="text-[10px] text-gray-600">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT DETAIL PANEL */}
        <div className="flex-1 overflow-y-auto">
          {!selectedUser ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-20 h-20 rounded-2xl bg-gray-800/60 border border-gray-700/40 flex items-center justify-center mb-5">
                <Users size={32} className="text-gray-600" />
              </div>
              <p className="text-gray-400 font-semibold text-lg">Selectionnez un utilisateur</p>
              <p className="text-gray-600 text-sm mt-1.5 max-w-xs">Cliquez sur un membre dans la liste de gauche pour voir et modifier ses informations</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-6 flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              >
                <UserPlus size={15} />
                Inviter un collaborateur
              </button>
            </div>
          ) : (
            <div className="p-6 space-y-5 max-w-3xl">

              {/* PROFILE HEADER */}
              <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-5">
                <div className="flex items-start gap-5">
                  {/* Big avatar */}
                  <div className="relative shrink-0">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold"
                      style={{
                        background: `${getAvatarColor(selectedUser.full_name)}20`,
                        border: `3px solid ${getAvatarColor(selectedUser.full_name)}40`,
                        color: getAvatarColor(selectedUser.full_name)
                      }}
                    >
                      {getInitials(selectedUser.full_name)}
                    </div>
                    <span
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900"
                      style={{ background: selectedUser.is_active ? '#10b981' : '#4b5563' }}
                    />
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-bold text-white">{selectedUser.full_name}</h2>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                        selectedUser.role === 'master'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      }`}>
                        {selectedUser.role === 'master' ? <Crown size={11} /> : <User size={11} />}
                        {selectedUser.role === 'master' ? 'Master' : 'Collaborateur'}
                      </span>
                      {!selectedUser.is_active && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                          Inactif
                        </span>
                      )}
                      {selectedUser.mfa_enabled && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                          <Lock size={10} />2FA
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 mt-2">
                      <span className="flex items-center gap-1.5 text-sm text-gray-400">
                        <Mail size={13} className="text-gray-500" />
                        {selectedUser.email}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-gray-400">
                        <Clock size={13} className="text-gray-500" />
                        {selectedUser.last_login
                          ? <span className={Date.now() - new Date(selectedUser.last_login).getTime() < 86400000 * 3 ? 'text-green-400' : ''}>
                              Derniere connexion : {getRelativeTime(selectedUser.last_login)}
                            </span>
                          : 'Jamais connecte'
                        }
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-gray-400">
                        <Activity size={13} className="text-gray-500" />
                        Membre depuis le {new Date(selectedUser.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Permission summary */}
                    {permCount > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(permissions[selectedUser.id] || []).map(perm => {
                          const t = PERMISSION_TEMPLATES.find(x => x.type === perm.permission_type);
                          if (!t) return null;
                          return (
                            <span
                              key={perm.id}
                              className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                              style={{ background: `${t.color}15`, color: t.color, border: `1px solid ${t.color}30` }}
                            >
                              {t.icon} {t.label}
                              {perm.can_edit && <span className="opacity-60"> E</span>}
                              {perm.can_delete && <span className="opacity-60"> D</span>}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Status toggle */}
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Statut compte</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${selectedUser.is_active ? 'text-green-400' : 'text-gray-500'}`}>
                        {selectedUser.is_active ? 'Actif' : 'Inactif'}
                      </span>
                      <Toggle
                        checked={selectedUser.is_active}
                        onChange={() => handleToggleActive(selectedUser.id, selectedUser.is_active)}
                      />
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-700/50">
                  <button
                    onClick={() => handleResendInvite(selectedUser)}
                    disabled={sending}
                    className="flex items-center gap-2 px-3.5 py-2 bg-gray-700/60 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-gray-600/50 transition-all disabled:opacity-50"
                  >
                    <Send size={13} />
                    Renvoyer invitation
                  </button>
                  <button
                    onClick={() => handleResetPassword(selectedUser)}
                    disabled={sending}
                    className="flex items-center gap-2 px-3.5 py-2 bg-gray-700/60 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-gray-600/50 transition-all disabled:opacity-50"
                  >
                    <Key size={13} />
                    Reinitialiser MDP
                  </button>
                  {selectedUser.role !== 'master' && (
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="flex items-center gap-2 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold border border-red-500/20 transition-all ml-auto"
                    >
                      <Trash2 size={13} />
                      Supprimer
                    </button>
                  )}
                </div>
              </div>

              {/* PERMISSIONS */}
              <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                      <Shield size={13} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Permissions d'acces</h3>
                      <p className="text-[11px] text-gray-500">{permCount} module{permCount !== 1 ? 's' : ''} autorise{permCount !== 1 ? 's' : ''}</p>
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
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/15 rounded-lg border border-amber-500/20 transition-all"
                  >
                    {PERMISSION_TEMPLATES.every(t => userPermissions[t.type]?.view) ? 'Tout retirer' : 'Tout accorder'}
                  </button>
                </div>

                <div className="p-4 grid grid-cols-2 gap-3">
                  {PERMISSION_TEMPLATES.map(template => {
                    const p = userPermissions[template.type] || { view: false, edit: false, delete: false };
                    const allOn = p.view && p.edit && p.delete;
                    const hasAny = p.view || p.edit || p.delete;

                    return (
                      <div
                        key={template.type}
                        className={`rounded-xl p-3.5 border transition-all ${
                          hasAny
                            ? 'border-opacity-40 bg-opacity-10'
                            : 'border-gray-700/50 bg-gray-800/30'
                        }`}
                        style={hasAny ? {
                          borderColor: `${template.color}40`,
                          background: `${template.color}08`
                        } : {}}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{template.icon}</span>
                            <div>
                              <p className="text-sm font-semibold text-white leading-none">{template.label}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">{template.description}</p>
                            </div>
                          </div>
                          <Toggle checked={allOn} onChange={v => {
                            setUserPermissions(prev => ({ ...prev, [template.type]: { view: v, edit: v, delete: v } }));
                          }} />
                        </div>

                        <div className="flex gap-3 pt-2.5 border-t border-gray-700/30">
                          {([
                            { key: 'view' as const, label: 'Voir', icon: Eye },
                            { key: 'edit' as const, label: 'Editer', icon: Edit3 },
                            { key: 'delete' as const, label: 'Suppr.', icon: Trash2 },
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
                              <span className="text-[11px] text-gray-400">{label}</span>
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
                    className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-2.5 rounded-xl text-sm transition-all"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-500/15 rounded-xl flex items-center justify-center border border-amber-500/30">
                  <UserPlus size={15} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Inviter un collaborateur</h2>
                  <p className="text-xs text-gray-500">Un email sera envoye automatiquement</p>
                </div>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setNewUser({ email: '', full_name: '', role: 'collaborator' }); setNewUserPermissions({}); }}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Nom complet *</label>
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    placeholder="Jean Dupont"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Email *</label>
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
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Role</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['collaborator', 'master'] as const).map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setNewUser({ ...newUser, role })}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                        newUser.role === role
                          ? role === 'master' ? 'border-amber-500 bg-amber-500/10' : 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                    >
                      {role === 'master'
                        ? <Crown size={18} className={newUser.role === role ? 'text-amber-400' : 'text-gray-500'} />
                        : <User size={18} className={newUser.role === role ? 'text-blue-400' : 'text-gray-500'} />
                      }
                      <div>
                        <p className={`font-semibold text-sm ${newUser.role === role ? 'text-white' : 'text-gray-400'}`}>
                          {role === 'master' ? 'Master' : 'Collaborateur'}
                        </p>
                        <p className="text-xs text-gray-500">{role === 'master' ? 'Acces complet' : 'Acces restreint'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Permissions initiales</label>
                  <button
                    type="button"
                    onClick={() => {
                      const allOn = PERMISSION_TEMPLATES.every(t => newUserPermissions[t.type]?.view);
                      const map: PermMap = {};
                      PERMISSION_TEMPLATES.forEach(t => { map[t.type] = { view: !allOn, edit: !allOn, delete: !allOn }; });
                      setNewUserPermissions(map);
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    {PERMISSION_TEMPLATES.every(t => newUserPermissions[t.type]?.view) ? 'Tout retirer' : 'Tout accorder'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {PERMISSION_TEMPLATES.map(template => {
                    const p = newUserPermissions[template.type] || { view: false, edit: false, delete: false };
                    const allOn = p.view && p.edit && p.delete;
                    return (
                      <div key={template.type} className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{template.icon}</span>
                            <div>
                              <p className="text-xs font-semibold text-white">{template.label}</p>
                            </div>
                          </div>
                          <Toggle checked={allOn} onChange={v => {
                            setNewUserPermissions(prev => ({ ...prev, [template.type]: { view: v, edit: v, delete: v } }));
                          }} />
                        </div>
                        <div className="flex gap-2.5">
                          {([
                            { key: 'view' as const, label: 'Voir' },
                            { key: 'edit' as const, label: 'Edit' },
                            { key: 'delete' as const, label: 'Supp' },
                          ]).map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                              <Toggle size="sm" checked={p[key]} onChange={v => setNewUserPermissions(prev => ({ ...prev, [template.type]: { ...prev[template.type], [key]: v } }))} />
                              <span className="text-[10px] text-gray-500">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-800 flex gap-3 shrink-0">
              <button
                onClick={handleInviteUser}
                disabled={sending || !newUser.email || !newUser.full_name}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-2.5 rounded-xl text-sm transition-all"
              >
                <Send size={14} />
                {sending ? 'Envoi...' : "Envoyer l'invitation"}
              </button>
              <button
                onClick={() => { setShowAddModal(false); setNewUser({ email: '', full_name: '', role: 'collaborator' }); setNewUserPermissions({}); }}
                className="px-5 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 border border-gray-700 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-red-500/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-11 h-11 bg-red-500/15 rounded-xl flex items-center justify-center shrink-0 border border-red-500/25">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Supprimer ce compte ?</h2>
                <p className="text-gray-400 text-sm mt-0.5">Cette action est irreversible.</p>
              </div>
            </div>
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3.5 mb-5 flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: `${getAvatarColor(selectedUser.full_name)}25`, color: getAvatarColor(selectedUser.full_name) }}
              >
                {getInitials(selectedUser.full_name)}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{selectedUser.full_name}</p>
                <p className="text-gray-400 text-xs">{selectedUser.email}</p>
              </div>
            </div>
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
                onClick={() => setShowDeleteModal(false)}
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
                  <Link size={15} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Lien d'invitation manuel</h2>
                  <p className="text-xs text-gray-400">{manualLinkData.email}</p>
                </div>
              </div>
              <button onClick={() => { setManualLinkData(null); setLinkCopied(false); }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all">
                <X size={15} />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-3">L'email n'a pas pu etre envoye. Transmettez ce lien directement.</p>
            <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-3 mb-4 text-xs text-blue-300 font-mono break-all select-all">
              {manualLinkData.link}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { navigator.clipboard.writeText(manualLinkData.link); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 3000); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${linkCopied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
              >
                {linkCopied ? <CheckCircle size={13} /> : <Copy size={13} />}
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
