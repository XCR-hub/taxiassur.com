import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserPlus, Shield, Mail, Eye, EyeOff,
  CreditCard as Edit2, Trash2, CheckCircle, XCircle,
  Search, Filter, RefreshCw, Key, Send, AlertTriangle, X, Copy, Link
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
  icon: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  { type: 'crm_leads', label: 'CRM & Leads', description: 'Gestion des prospects et clients', icon: '👥' },
  { type: 'marketplace', label: 'Marketplace', description: 'Place de marche et transactions', icon: '🛍️' },
  { type: 'content_ia', label: 'Contenu & IA', description: 'Generation de contenu par IA', icon: '🤖' },
  { type: 'seo', label: 'SEO', description: 'Optimisation referencement', icon: '🔍' },
  { type: 'analytics', label: 'Analytics', description: 'Statistiques et rapports', icon: '📊' },
  { type: 'backlinks', label: 'Backlinks', description: 'Gestion des backlinks', icon: '🔗' },
  { type: 'social_media', label: 'Reseaux Sociaux', description: 'Gestion des reseaux sociaux', icon: '📱' },
  { type: 'settings', label: 'Parametres', description: 'Configuration systeme', icon: '⚙️' }
];

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [permissions, setPermissions] = useState<{ [userId: string]: UserPermission[] }>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'master' | 'collaborator'>('all');
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

  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    role: 'collaborator' as 'master' | 'collaborator'
  });

  const [userPermissions, setUserPermissions] = useState<{ [key: string]: { view: boolean; edit: boolean; delete: boolean } }>({});

  useEffect(() => {
    loadUsers();
  }, []);

  const showToast = (type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);

      const { data: usersData, error: usersError } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      setUsers(usersData || []);

      const permissionsMap: { [userId: string]: UserPermission[] } = {};
      for (const user of usersData || []) {
        const { data: permsData } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', user.id);
        permissionsMap[user.id] = permsData || [];
      }

      setPermissions(permissionsMap);
    } catch (error) {
      logger.error('Error loading users:', error);
      showToast('error', 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!newUser.email || !newUser.full_name) {
      showToast('error', "L'email et le nom complet sont requis");
      return;
    }

    try {
      setSending(true);

      const perms = Object.entries(userPermissions)
        .filter(([_, p]) => p.view || p.edit || p.delete)
        .map(([type, p]) => ({ type, view: p.view, edit: p.edit, delete: p.delete }));

      const { data, error } = await supabase.functions.invoke('invite-admin-user', {
        body: { email: newUser.email, full_name: newUser.full_name, role: newUser.role, permissions: perms }
      });

      if (error) {
        showToast('error', `Erreur: ${error.message}`);
        return;
      }

      if (!data?.success) {
        showToast('error', data?.error || 'Erreur inconnue');
        return;
      }

      showToast('success', `Invitation envoyee a ${newUser.email}`);
      setShowAddModal(false);
      setNewUser({ email: '', full_name: '', role: 'collaborator' });
      setUserPermissions({});
      await loadUsers();
    } catch (error) {
      logger.error('Error inviting user:', error);
      showToast('error', "Erreur lors de l'invitation");
    } finally {
      setSending(false);
    }
  };

  const handleResendInvite = async (user: AdminUser) => {
    try {
      setSending(true);

      const { data, error } = await supabase.functions.invoke('invite-admin-user', {
        body: {
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          permissions: [],
          force_resend: true
        }
      });

      if (error || !data?.success) {
        showToast('error', error?.message || data?.error || 'Erreur inconnue');
        return;
      }

      if (!data.email_sent && data.action_link) {
        setManualLinkData({ email: user.email, link: data.action_link });
        return;
      }

      showToast('success', `Email d'invitation renvoye a ${user.email}`);
    } catch (error) {
      logger.error('Error resending invite:', error);
      showToast('error', "Erreur lors du renvoi de l'invitation");
    } finally {
      setSending(false);
    }
  };

  const handleResetPassword = async (user: AdminUser) => {
    try {
      setSending(true);

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        showToast('error', `Erreur: ${error.message}`);
        return;
      }

      showToast('success', `Email de reinitialisation envoye a ${user.email}`);
    } catch (error) {
      logger.error('Error sending password reset:', error);
      showToast('error', "Erreur lors de l'envoi de la reinitialisation");
    } finally {
      setSending(false);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      showToast('success', currentStatus ? 'Utilisateur desactive' : 'Utilisateur active');
      loadUsers();
    } catch (error) {
      logger.error('Error toggling user status:', error);
      showToast('error', 'Erreur lors du changement de statut');
    }
  };

  const confirmDeleteUser = (user: AdminUser) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setDeleting(true);

      const { data, error } = await supabase.functions.invoke('invite-admin-user', {
        body: { action: 'delete', user_id: userToDelete.id, email: userToDelete.email }
      });

      if (error || !data?.success) {
        showToast('error', error?.message || data?.error || 'Erreur lors de la suppression');
        return;
      }

      showToast('success', `${userToDelete.full_name} a ete supprime`);
      setShowDeleteModal(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error) {
      logger.error('Error deleting user:', error);
      showToast('error', 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const openPermissionsModal = (user: AdminUser) => {
    setSelectedUser(user);
    const perms = permissions[user.id] || [];
    const permsMap: { [key: string]: { view: boolean; edit: boolean; delete: boolean } } = {};

    PERMISSION_TEMPLATES.forEach(template => {
      const perm = perms.find(p => p.permission_type === template.type);
      permsMap[template.type] = {
        view: perm?.can_view || false,
        edit: perm?.can_edit || false,
        delete: perm?.can_delete || false
      };
    });

    setUserPermissions(permsMap);
    setShowPermissionsModal(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    try {
      await supabase.from('user_permissions').delete().eq('user_id', selectedUser.id);

      for (const [permType, perms] of Object.entries(userPermissions)) {
        if (perms.view || perms.edit || perms.delete) {
          await supabase.from('user_permissions').insert([{
            user_id: selectedUser.id,
            permission_type: permType,
            can_view: perms.view,
            can_edit: perms.edit,
            can_delete: perms.delete
          }]);
        }
      }

      showToast('success', 'Permissions mises a jour');
      setShowPermissionsModal(false);
      loadUsers();
    } catch (error) {
      logger.error('Error saving permissions:', error);
      showToast('error', 'Erreur lors de la sauvegarde des permissions');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* TOASTS */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold pointer-events-auto transition-all ${
            toast.type === 'success' ? 'bg-green-600 text-white' :
            toast.type === 'error' ? 'bg-red-600 text-white' :
            'bg-blue-600 text-white'
          }`}>
            {toast.type === 'success' ? <CheckCircle size={16} /> : toast.type === 'error' ? <XCircle size={16} /> : <Shield size={16} />}
            {toast.message}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="text-amber-500" size={32} />
            Gestion des Utilisateurs
          </h1>
          <p className="text-gray-400 mt-2">Gerez les acces et permissions de vos collaborateurs</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadUsers}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-xl font-bold transition-all border border-gray-700"
          >
            <RefreshCw size={18} />
            Actualiser
          </button>
          <button
            onClick={() => navigate('/backoffice')}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-xl font-bold transition-all border border-gray-700"
          >
            <Shield size={18} />
            Accueil Admin
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
          >
            <UserPlus size={20} />
            Inviter un Collaborateur
          </button>
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as any)}
              className="pl-10 pr-8 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none"
            >
              <option value="all">Tous les roles</option>
              <option value="master">Master</option>
              <option value="collaborator">Collaborateur</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredUsers.map(user => (
            <div key={user.id} className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 hover:border-amber-500/50 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-xl font-bold text-white">{user.full_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      user.role === 'master'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                    }`}>
                      {user.role === 'master' ? 'Master' : 'Collaborateur'}
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                      user.is_active
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {user.is_active ? <><CheckCircle size={12} /> Actif</> : <><XCircle size={12} /> Inactif</>}
                    </span>
                    {user.mfa_enabled && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold border border-green-500/50">
                        2FA
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 flex items-center gap-2 text-sm">
                    <Mail size={14} />
                    {user.email}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>Cree le {new Date(user.created_at).toLocaleDateString('fr-FR')}</span>
                    {user.last_login && (
                      <span>Derniere connexion: {new Date(user.last_login).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>
                  {(permissions[user.id] || []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(permissions[user.id] || []).map(perm => {
                        const template = PERMISSION_TEMPLATES.find(t => t.type === perm.permission_type);
                        return (
                          <span key={perm.id} className="px-2 py-1 bg-amber-500/15 text-amber-400 rounded-full text-xs border border-amber-500/20">
                            {template?.icon} {template?.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openPermissionsModal(user)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/15 text-blue-400 rounded-lg hover:bg-blue-500/25 transition-all text-xs font-semibold border border-blue-500/20"
                    title="Gerer les permissions"
                  >
                    <Shield size={15} />
                    Permissions
                  </button>
                  <button
                    onClick={() => handleResendInvite(user)}
                    disabled={sending}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-700/60 text-gray-300 rounded-lg hover:bg-gray-600/60 transition-all text-xs font-semibold border border-gray-600/40 disabled:opacity-50"
                    title="Renvoyer l'invitation"
                  >
                    <Send size={15} />
                    Reinviter
                  </button>
                  <button
                    onClick={() => handleResetPassword(user)}
                    disabled={sending}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-700/60 text-gray-300 rounded-lg hover:bg-gray-600/60 transition-all text-xs font-semibold border border-gray-600/40 disabled:opacity-50"
                    title="Reinitialiser le mot de passe"
                  >
                    <Key size={15} />
                    MDP
                  </button>
                  <button
                    onClick={() => handleToggleActive(user.id, user.is_active)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs font-semibold border ${
                      user.is_active
                        ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border-red-500/20'
                        : 'bg-green-500/15 text-green-400 hover:bg-green-500/25 border-green-500/20'
                    }`}
                    title={user.is_active ? 'Desactiver' : 'Activer'}
                  >
                    {user.is_active ? <><XCircle size={15} /> Desactiver</> : <><CheckCircle size={15} /> Activer</>}
                  </button>
                  {user.role !== 'master' && (
                    <button
                      onClick={() => confirmDeleteUser(user)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-500/15 text-red-400 rounded-lg hover:bg-red-500/25 transition-all text-xs font-semibold border border-red-500/20"
                      title="Supprimer definitivement"
                    >
                      <Trash2 size={15} />
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>Aucun utilisateur trouve</p>
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="text-red-400" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Supprimer cet utilisateur ?</h2>
                <p className="text-gray-400 text-sm mt-1">Cette action est irreversible</p>
              </div>
            </div>

            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 mb-6">
              <p className="text-white font-semibold">{userToDelete.full_name}</p>
              <p className="text-gray-400 text-sm">{userToDelete.email}</p>
            </div>

            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              La suppression effacera le compte d'authentification, les donnees admin et toutes les permissions associees.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                <Trash2 size={18} />
                {deleting ? 'Suppression...' : 'Supprimer definitivement'}
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }}
                className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-all border border-gray-700"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVITE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <UserPlus className="text-amber-500" size={28} />
                Inviter un Nouveau Collaborateur
              </h2>
              <button onClick={() => { setShowAddModal(false); setNewUser({ email: '', full_name: '', role: 'collaborator' }); setUserPermissions({}); }}
                className="p-2 text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <p className="text-blue-300 text-sm">
                L'utilisateur recevra un email d'invitation pour creer son propre mot de passe. Aucun mot de passe ne sera genere automatiquement.
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">Nom complet *</label>
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Ex: Jean Dupont"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">Email *</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Ex: jean@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-2 font-semibold">Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="collaborator">Collaborateur</option>
                  <option value="master">Master</option>
                </select>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Shield className="text-amber-500" size={24} />
                  Permissions d'acces
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {PERMISSION_TEMPLATES.map(template => (
                    <div key={template.type} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{template.icon}</span>
                        <div>
                          <h4 className="font-bold text-white">{template.label}</h4>
                          <p className="text-xs text-gray-400">{template.description}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm">
                        {[
                          { key: 'view', label: 'Voir', Icon: Eye },
                          { key: 'edit', label: 'Modifier', Icon: Edit2 },
                          { key: 'delete', label: 'Supprimer', Icon: Trash2 }
                        ].map(({ key, label, Icon }) => (
                          <label key={key} className="flex items-center gap-2 text-gray-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(userPermissions[template.type] as any)?.[key] || false}
                              onChange={(e) => setUserPermissions({
                                ...userPermissions,
                                [template.type]: { ...userPermissions[template.type], [key]: e.target.checked }
                              })}
                              className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
                            />
                            <Icon size={14} />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleInviteUser}
                disabled={sending}
                className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Envoi en cours...' : "Envoyer l'Invitation"}
              </button>
              <button
                onClick={() => { setShowAddModal(false); setNewUser({ email: '', full_name: '', role: 'collaborator' }); setUserPermissions({}); }}
                className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-all border border-gray-700"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMISSIONS MODAL */}
      {manualLinkData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-yellow-500/30 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                  <Link className="text-yellow-400" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Email non envoye — lien manuel</h2>
                  <p className="text-gray-400 text-sm">{manualLinkData.email}</p>
                </div>
              </div>
              <button onClick={() => { setManualLinkData(null); setLinkCopied(false); }} className="p-2 text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <p className="text-gray-300 text-sm mb-4">
              Le lien de connexion a ete genere mais l'email n'a pas pu etre envoye. Copiez ce lien et transmettez-le directement a l'utilisateur.
            </p>

            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 mb-4 break-all text-xs text-blue-300 font-mono select-all">
              {manualLinkData.link}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(manualLinkData.link);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 3000);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${linkCopied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
              >
                {linkCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
                {linkCopied ? 'Copie !' : 'Copier le lien'}
              </button>
              <button
                onClick={() => { setManualLinkData(null); setLinkCopied(false); }}
                className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-all border border-gray-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Shield className="text-amber-500" size={28} />
                Permissions de {selectedUser.full_name}
              </h2>
              <button onClick={() => setShowPermissionsModal(false)} className="p-2 text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {PERMISSION_TEMPLATES.map(template => (
                <div key={template.type} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div>
                      <h4 className="font-bold text-white">{template.label}</h4>
                      <p className="text-xs text-gray-400">{template.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    {[
                      { key: 'view', label: 'Voir', Icon: Eye },
                      { key: 'edit', label: 'Modifier', Icon: Edit2 },
                      { key: 'delete', label: 'Supprimer', Icon: Trash2 }
                    ].map(({ key, label, Icon }) => (
                      <label key={key} className="flex items-center gap-2 text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(userPermissions[template.type] as any)?.[key] || false}
                          onChange={(e) => setUserPermissions({
                            ...userPermissions,
                            [template.type]: { ...userPermissions[template.type], [key]: e.target.checked }
                          })}
                          className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
                        />
                        <Icon size={14} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSavePermissions}
                className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
              >
                Enregistrer les Permissions
              </button>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-all border border-gray-700"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
