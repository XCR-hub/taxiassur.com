import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Lock, Mail, Eye, EyeOff, Edit2, Trash2, CheckCircle, XCircle, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'master' | 'collaborator';
  is_active: boolean;
  created_at: string;
  last_login?: string;
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

const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  { type: 'crm_leads', label: 'CRM & Leads', description: 'Gestion des prospects et clients', icon: '👥' },
  { type: 'marketplace', label: 'Marketplace', description: 'Place de marché et transactions', icon: '🛍️' },
  { type: 'content_ia', label: 'Contenu & IA', description: 'Génération de contenu par IA', icon: '🤖' },
  { type: 'seo', label: 'SEO', description: 'Optimisation référencement', icon: '🔍' },
  { type: 'analytics', label: 'Analytics', description: 'Statistiques et rapports', icon: '📊' },
  { type: 'backlinks', label: 'Backlinks', description: 'Gestion des backlinks', icon: '🔗' },
  { type: 'social_media', label: 'Réseaux Sociaux', description: 'Gestion des réseaux sociaux', icon: '📱' },
  { type: 'settings', label: 'Paramètres', description: 'Configuration système', icon: '⚙️' }
];

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [permissions, setPermissions] = useState<{ [userId: string]: UserPermission[] }>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'master' | 'collaborator'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'collaborator' as 'master' | 'collaborator'
  });

  const [userPermissions, setUserPermissions] = useState<{ [key: string]: { view: boolean; edit: boolean; delete: boolean } }>({});

  useEffect(() => {
    loadUsers();
  }, []);

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
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleCreateUser = async () => {
    try {
      if (!newUser.email || !newUser.full_name || !newUser.password) {
        alert('Tous les champs sont requis');
        return;
      }

      const passwordHash = await hashPassword(newUser.password);

      const { data, error } = await supabase
        .from('admin_users')
        .insert([{
          email: newUser.email,
          full_name: newUser.full_name,
          password_hash: passwordHash,
          role: newUser.role,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      for (const [permType, perms] of Object.entries(userPermissions)) {
        if (perms.view || perms.edit || perms.delete) {
          await supabase
            .from('user_permissions')
            .insert([{
              user_id: data.id,
              permission_type: permType,
              can_view: perms.view,
              can_edit: perms.edit,
              can_delete: perms.delete
            }]);
        }
      }

      alert('Utilisateur créé avec succès !');
      setShowAddModal(false);
      setNewUser({ email: '', full_name: '', password: '', role: 'collaborator' });
      setUserPermissions({});
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Erreur lors de la création de l\'utilisateur');
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      alert('Utilisateur supprimé avec succès');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erreur lors de la suppression');
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
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', selectedUser.id);

      for (const [permType, perms] of Object.entries(userPermissions)) {
        if (perms.view || perms.edit || perms.delete) {
          await supabase
            .from('user_permissions')
            .insert([{
              user_id: selectedUser.id,
              permission_type: permType,
              can_view: perms.view,
              can_edit: perms.edit,
              can_delete: perms.delete
            }]);
        }
      }

      alert('Permissions mises à jour avec succès !');
      setShowPermissionsModal(false);
      loadUsers();
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('Erreur lors de la sauvegarde des permissions');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="text-amber-500" size={32} />
            Gestion des Utilisateurs
          </h1>
          <p className="text-gray-400 mt-2">Gérez les accès et permissions de vos collaborateurs</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
        >
          <UserPlus size={20} />
          Inviter un Collaborateur
        </button>
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
              <option value="all">Tous les rôles</option>
              <option value="master">Master</option>
              <option value="collaborator">Collaborateur</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredUsers.map(user => (
            <div key={user.id} className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 hover:border-amber-500/50 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">{user.full_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      user.role === 'master'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                    }`}>
                      {user.role === 'master' ? '👑 Master' : '👤 Collaborateur'}
                    </span>
                    {user.is_active ? (
                      <CheckCircle className="text-green-400" size={20} />
                    ) : (
                      <XCircle className="text-red-400" size={20} />
                    )}
                  </div>
                  <p className="text-gray-400 flex items-center gap-2">
                    <Mail size={16} />
                    {user.email}
                  </p>
                  <div className="flex gap-4 mt-3 text-sm text-gray-500">
                    <span>Créé le: {new Date(user.created_at).toLocaleDateString('fr-FR')}</span>
                    {user.last_login && (
                      <span>Dernière connexion: {new Date(user.last_login).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(permissions[user.id] || []).map(perm => {
                      const template = PERMISSION_TEMPLATES.find(t => t.type === perm.permission_type);
                      return (
                        <span key={perm.id} className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs border border-amber-500/30">
                          {template?.icon} {template?.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openPermissionsModal(user)}
                    className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
                    title="Gérer les permissions"
                  >
                    <Shield size={20} />
                  </button>
                  <button
                    onClick={() => handleToggleActive(user.id, user.is_active)}
                    className={`p-2 rounded-lg transition-all ${
                      user.is_active
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                    title={user.is_active ? 'Désactiver' : 'Activer'}
                  >
                    {user.is_active ? <XCircle size={20} /> : <CheckCircle size={20} />}
                  </button>
                  {user.role !== 'master' && (
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                      title="Supprimer"
                    >
                      <Trash2 size={20} />
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
            <p>Aucun utilisateur trouvé</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <UserPlus className="text-amber-500" size={28} />
              Inviter un Nouveau Collaborateur
            </h2>

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

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">Mot de passe *</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Mot de passe sécurisé"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">Rôle *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="collaborator">👤 Collaborateur</option>
                    <option value="master">👑 Master</option>
                  </select>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Shield className="text-amber-500" size={24} />
                  Permissions d'accès
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
                        <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={userPermissions[template.type]?.view || false}
                            onChange={(e) => setUserPermissions({
                              ...userPermissions,
                              [template.type]: { ...userPermissions[template.type], view: e.target.checked }
                            })}
                            className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
                          />
                          <Eye size={16} />
                          Voir
                        </label>
                        <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={userPermissions[template.type]?.edit || false}
                            onChange={(e) => setUserPermissions({
                              ...userPermissions,
                              [template.type]: { ...userPermissions[template.type], edit: e.target.checked }
                            })}
                            className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
                          />
                          <Edit2 size={16} />
                          Modifier
                        </label>
                        <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={userPermissions[template.type]?.delete || false}
                            onChange={(e) => setUserPermissions({
                              ...userPermissions,
                              [template.type]: { ...userPermissions[template.type], delete: e.target.checked }
                            })}
                            className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
                          />
                          <Trash2 size={16} />
                          Supprimer
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleCreateUser}
                className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
              >
                Créer le Collaborateur
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewUser({ email: '', full_name: '', password: '', role: 'collaborator' });
                  setUserPermissions({});
                }}
                className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Shield className="text-amber-500" size={28} />
              Permissions de {selectedUser.full_name}
            </h2>

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
                    <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPermissions[template.type]?.view || false}
                        onChange={(e) => setUserPermissions({
                          ...userPermissions,
                          [template.type]: { ...userPermissions[template.type], view: e.target.checked }
                        })}
                        className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
                      />
                      <Eye size={16} />
                      Voir
                    </label>
                    <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPermissions[template.type]?.edit || false}
                        onChange={(e) => setUserPermissions({
                          ...userPermissions,
                          [template.type]: { ...userPermissions[template.type], edit: e.target.checked }
                        })}
                        className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
                      />
                      <Edit2 size={16} />
                      Modifier
                    </label>
                    <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPermissions[template.type]?.delete || false}
                        onChange={(e) => setUserPermissions({
                          ...userPermissions,
                          [template.type]: { ...userPermissions[template.type], delete: e.target.checked }
                        })}
                        className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
                      />
                      <Trash2 size={16} />
                      Supprimer
                    </label>
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
                className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-all"
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
