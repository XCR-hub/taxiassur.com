import React, { useState, useEffect } from 'react';
import { Settings, Users, Bell, Shield, Database, Zap, Mail, MessageSquare, Bot, Save, CheckCircle, X, UserPlus, Trash2, Lock, Eye, CreditCard as Edit, AlertTriangle, Send, Key } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

interface CRMSettings {
  company_name: string;
  primary_email: string;
  timezone: string;
  auto_assign_leads: boolean;
  ai_auto_decisions: boolean;
  ai_autonomy_level: string;
  ai_confidence_threshold: number;
  ai_agents: {
    lead_scorer: boolean;
    email_composer: boolean;
    negotiation_assistant: boolean;
    risk_analyzer: boolean;
    churn_predictor: boolean;
    cross_sell_recommender: boolean;
    sentiment_analyzer: boolean;
    response_generator: boolean;
  };
  notifications: {
    new_leads: boolean;
    ai_decisions: boolean;
    churn_alerts: boolean;
    missing_documents: boolean;
  };
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface SystemModule {
  slug: string;
  name: string;
  icon: string;
  description: string;
}

interface RolePermission {
  role: string;
  module_slug: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_validate: boolean;
  can_assign: boolean;
}

interface UserPermission {
  user_id: string;
  module_slug: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_validate: boolean;
  can_assign: boolean;
}

const CRMAdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'permissions' | 'notifications' | 'integrations' | 'ai'>('general');
  const [settings, setSettings] = useState<CRMSettings>({
    company_name: 'TaxiAssur',
    primary_email: 'team@taxiassur.com',
    timezone: 'Europe/Paris',
    auto_assign_leads: true,
    ai_auto_decisions: true,
    ai_autonomy_level: 'semi-automatic',
    ai_confidence_threshold: 80,
    ai_agents: {
      lead_scorer: true,
      email_composer: true,
      negotiation_assistant: true,
      risk_analyzer: true,
      churn_predictor: true,
      cross_sell_recommender: true,
      sentiment_analyzer: false,
      response_generator: true
    },
    notifications: {
      new_leads: true,
      ai_decisions: true,
      churn_alerts: true,
      missing_documents: true
    }
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    role: 'collaborator'
  });
  const [inviting, setInviting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionUser, setActionUser] = useState<AdminUser | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fallbackLink, setFallbackLink] = useState<{ email: string; link: string } | null>(null);
  const [showIntegrationModal, setShowIntegrationModal] = useState<string | null>(null);
  const [integrationSettings, setIntegrationSettings] = useState({
    brevo: { api_key: '', sender_email: '', sender_name: '' },
    whatsapp: { account_sid: '', auth_token: '', phone_number: '' },
    supabase: { url: '', anon_key: '', service_key: '' },
    stripe: { secret_key: '', publishable_key: '', webhook_secret: '' }
  });

  // États pour l'onglet Permissions
  const [modules, setModules] = useState<SystemModule[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('commercial');
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  useEffect(() => {
    loadSettings();
    loadUsers();
    loadIntegrationSettings();
    loadModules();
    loadRolePermissions();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur chargement paramètres:', error);
        return;
      }

      if (data) {
        setSettings({
          company_name: data.company_name,
          primary_email: data.primary_email,
          timezone: data.timezone,
          auto_assign_leads: data.auto_assign_leads,
          ai_auto_decisions: data.ai_auto_decisions,
          ai_autonomy_level: data.ai_autonomy_level,
          ai_confidence_threshold: data.ai_confidence_threshold,
          ai_agents: data.ai_agents,
          notifications: data.notifications
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const { error } = await supabase
        .from('crm_settings')
        .update({
          company_name: settings.company_name,
          primary_email: settings.primary_email,
          timezone: settings.timezone,
          auto_assign_leads: settings.auto_assign_leads,
          ai_auto_decisions: settings.ai_auto_decisions,
          ai_autonomy_level: settings.ai_autonomy_level,
          ai_confidence_threshold: settings.ai_confidence_threshold,
          ai_agents: settings.ai_agents,
          notifications: settings.notifications,
          updated_at: new Date().toISOString()
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const url = import.meta.env.VITE_SUPABASE_URL || 'https://drohhxrkoequjphvabvq.supabase.co';
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${url}/rest/v1/admin_users?select=*&order=created_at.desc`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUsers(await res.json() || []);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const inviteUser = async () => {
    if (!inviteForm.email || !inviteForm.full_name) {
      showToast('error', 'Email et nom complet requis');
      return;
    }

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(inviteForm.email)) {
      showToast('error', "Format d'email invalide");
      return;
    }

    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-admin-user', {
        body: { email: inviteForm.email, full_name: inviteForm.full_name, role: inviteForm.role }
      });

      if (error || !data?.success) {
        showToast('error', data?.error || error?.message || "Erreur lors de l'invitation");
        return;
      }

      showToast('success', `Invitation envoyee a ${inviteForm.email}`);
      setShowInviteModal(false);
      setInviteForm({ email: '', full_name: '', role: 'collaborator' });
      loadUsers();
    } catch (error) {
      showToast('error', error.message || "Erreur lors de l'invitation");
    } finally {
      setInviting(false);
    }
  };

  const resendInvite = async (user: AdminUser) => {
    setActionUser(user);
    try {
      const { data, error } = await supabase.functions.invoke('invite-admin-user', {
        body: { email: user.email, full_name: user.full_name, role: user.role, permissions: [], force_resend: true }
      });

      if (error || !data?.success) {
        showToast('error', data?.error || error?.message || 'Erreur inconnue');
        return;
      }

      if (data.email_sent === false && data.action_link) {
        setFallbackLink({ email: user.email, link: data.action_link });
      } else {
        showToast('success', `Email d'invitation envoye a ${user.email}`);
      }
    } catch (err) {
      showToast('error', err.message || "Erreur lors du renvoi");
    } finally {
      setActionUser(null);
    }
  };

  const deleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-admin-user', {
        body: { action: 'delete', user_id: userToDelete.id, email: userToDelete.email }
      });

      if (error || !data?.success) {
        showToast('error', data?.error || error?.message || 'Erreur lors de la suppression');
        return;
      }

      showToast('success', `${userToDelete.full_name || userToDelete.email} supprime`);
      setUserToDelete(null);
      loadUsers();
    } catch (error) {
      showToast('error', error.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const loadIntegrationSettings = async () => {
    try {
      const { data } = await supabase
        .from('crm_settings')
        .select('integration_configs')
        .single();

      if (data?.integration_configs) {
        setIntegrationSettings(prev => ({
          ...prev,
          ...data.integration_configs
        }));
      }
    } catch (error) {
      console.error('Erreur chargement intégrations:', error);
    }
  };

  const saveIntegration = async (integration: string) => {
    try {
      const { data: currentSettings } = await supabase
        .from('crm_settings')
        .select('integration_configs')
        .single();

      const updatedConfigs = {
        ...(currentSettings?.integration_configs || {}),
        [integration]: integrationSettings[integration as keyof typeof integrationSettings]
      };

      const { error } = await supabase
        .from('crm_settings')
        .update({
          integration_configs: updatedConfigs,
          updated_at: new Date().toISOString()
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;

      toast.success(`Configuration ${integration} sauvegardée avec succès`);
      setShowIntegrationModal(null);
    } catch (error) {
      console.error('Erreur sauvegarde intégration:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const loadModules = async () => {
    try {
      const { data, error } = await supabase
        .from('system_modules')
        .select('slug, name, icon, description')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error('Erreur chargement modules:', error);
    }
  };

  const loadRolePermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role, module_slug');

      if (error) throw error;
      setRolePermissions(data || []);
    } catch (error) {
      console.error('Erreur chargement permissions rôles:', error);
    }
  };

  const loadUserPermissions = async (userId: string) => {
    if (!userId) return;

    setLoadingPermissions(true);
    try {
      const { data, error } = await supabase
        .from('user_custom_permissions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setUserPermissions(data || []);
    } catch (error) {
      console.error('Erreur chargement permissions utilisateur:', error);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const saveUserPermission = async (userId: string, moduleSlug: string, permissionType: string, value: boolean) => {
    try {
      const existingPerm = userPermissions.find(p => p.user_id === userId && p.module_slug === moduleSlug);

      if (existingPerm) {
        const { error } = await supabase
          .from('user_custom_permissions')
          .update({ [permissionType]: value })
          .eq('user_id', userId)
          .eq('module_slug', moduleSlug);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_custom_permissions')
          .insert({
            user_id: userId,
            module_slug: moduleSlug,
            [permissionType]: value,
            can_read: permissionType === 'can_read' ? value : false,
            can_write: permissionType === 'can_write' ? value : false,
            can_delete: permissionType === 'can_delete' ? value : false,
            can_export: permissionType === 'can_export' ? value : false,
            can_validate: permissionType === 'can_validate' ? value : false,
            can_assign: permissionType === 'can_assign' ? value : false
          });

        if (error) throw error;
      }

      loadUserPermissions(userId);
    } catch (error) {
      console.error('Erreur sauvegarde permission:', error);
      toast.error('Erreur lors de la sauvegarde de la permission');
    }
  };

  const tabs = [
    { id: 'general', label: 'Général', icon: Settings },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'permissions', label: 'Permissions', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Intégrations', icon: Zap },
    { id: 'ai', label: 'IA Config', icon: Bot }
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* TOAST */}
      {toastMsg && (
        <div className={`fixed top-4 right-4 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${toastMsg.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toastMsg.type === 'success' ? <CheckCircle size={16} /> : <X size={16} />}
          {toastMsg.text}
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border-2 border-red-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Supprimer cet utilisateur ?</h3>
                <p className="text-gray-500 text-sm">Cette action est irreversible</p>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
              <p className="font-semibold text-gray-900">{userToDelete.full_name}</p>
              <p className="text-gray-500 text-sm">{userToDelete.email}</p>
            </div>
            <p className="text-gray-500 text-sm mb-6">Le compte d'authentification, les donnees admin et toutes les permissions seront supprimes.</p>
            <div className="flex gap-3">
              <button
                onClick={deleteUser}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                <Trash2 size={18} />
                {deleting ? 'Suppression...' : 'Supprimer definitivement'}
              </button>
              <button
                onClick={() => setUserToDelete(null)}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FALLBACK LINK MODAL */}
      {fallbackLink && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full border-2 border-amber-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Key className="text-amber-600" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Email non envoye — lien manuel</h3>
                <p className="text-gray-500 text-sm">{fallbackLink.email}</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Le lien de connexion a ete genere mais l'email n'a pas pu etre envoye via SMTP. Copiez ce lien et transmettez-le directement a l'utilisateur.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 font-mono text-xs text-gray-700 break-all select-all">
              {fallbackLink.link}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { navigator.clipboard.writeText(fallbackLink.link); showToast('success', 'Lien copie !'); }}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold transition-colors"
              >
                Copier le lien
              </button>
              <button
                onClick={() => setFallbackLink(null)}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3">
            <Settings size={40} />
            <div>
              <h1 className="text-4xl font-bold">Paramètres CRM</h1>
              <p className="text-gray-300">Configuration système et préférences</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-1 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                  }`}
                >
                  <Icon size={20} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="col-span-4 bg-white rounded-xl border-2 border-gray-200 p-8">
            {activeTab === 'general' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Paramètres Généraux</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de l'entreprise
                    </label>
                    <input
                      type="text"
                      value={settings.company_name}
                      onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email principal
                    </label>
                    <input
                      type="email"
                      value={settings.primary_email}
                      onChange={(e) => setSettings({ ...settings, primary_email: e.target.value })}
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fuseau horaire
                    </label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Europe/Paris">Europe/Paris</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="Asia/Tokyo">Asia/Tokyo</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="auto-assign"
                      className="w-5 h-5 text-blue-600"
                      checked={settings.auto_assign_leads}
                      onChange={(e) => setSettings({ ...settings, auto_assign_leads: e.target.checked })}
                    />
                    <label htmlFor="auto-assign" className="text-sm text-gray-700">
                      Assignation automatique des leads
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="ai-decisions"
                      className="w-5 h-5 text-blue-600"
                      checked={settings.ai_auto_decisions}
                      onChange={(e) => setSettings({ ...settings, ai_auto_decisions: e.target.checked })}
                    />
                    <label htmlFor="ai-decisions" className="text-sm text-gray-700">
                      Activer les décisions IA automatiques
                    </label>
                  </div>

                  <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Enregistrement...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <CheckCircle size={20} />
                        Enregistré !
                      </>
                    ) : (
                      <>
                        <Save size={20} />
                        Enregistrer
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestion des Utilisateurs</h2>
                <div className="mb-6">
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    <UserPlus size={20} />
                    Inviter un utilisateur
                  </button>
                </div>

                {loadingUsers ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-4">Chargement...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Aucun utilisateur trouvé
                      </div>
                    ) : (
                      users.filter(u => u.is_active).map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700">
                              {user.email[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{user.email}</div>
                              <div className="text-sm text-gray-600 capitalize">
                                {user.role === 'master' ? 'Master Admin' : user.role}
                                {user.full_name && ` • ${user.full_name}`}
                              </div>
                            </div>
                          </div>
                          {user.role !== 'master' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => resendInvite(user)}
                                disabled={actionUser?.id === user.id}
                                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Send size={16} />
                                Reinviter
                              </button>
                              <button
                                onClick={() => setUserToDelete(user)}
                                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                                Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'permissions' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestion des Permissions</h2>

                <div className="grid grid-cols-2 gap-8">
                  {/* Section gauche : Permissions par rôle */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Permissions par rôle</h3>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sélectionner un rôle
                      </label>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="commercial">Commercial</option>
                        <option value="collaborator">Collaborateur</option>
                        <option value="manager">Manager</option>
                        <option value="master">Master Admin</option>
                      </select>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm text-blue-800">
                      <p className="font-medium mb-1">📋 Permissions par défaut</p>
                      <p>Ces permissions s'appliquent automatiquement à tous les utilisateurs ayant ce rôle.</p>
                    </div>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {modules.map((module) => {
                        const perm = rolePermissions.find(p => p.role === selectedRole && p.module_slug === module.slug);
                        if (!perm) return null;

                        return (
                          <div key={module.slug} className="border-2 border-gray-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">{module.icon}</span>
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900">{module.name}</div>
                                <div className="text-xs text-gray-500">{module.description}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className={`flex items-center gap-1 ${perm.can_read ? 'text-green-700' : 'text-gray-400'}`}>
                                {perm.can_read ? <Eye size={14} /> : <X size={14} />}
                                <span>Voir</span>
                              </div>
                              <div className={`flex items-center gap-1 ${perm.can_write ? 'text-green-700' : 'text-gray-400'}`}>
                                {perm.can_write ? <Edit size={14} /> : <X size={14} />}
                                <span>Modifier</span>
                              </div>
                              <div className={`flex items-center gap-1 ${perm.can_delete ? 'text-green-700' : 'text-gray-400'}`}>
                                {perm.can_delete ? <Trash2 size={14} /> : <X size={14} />}
                                <span>Supprimer</span>
                              </div>
                              <div className={`flex items-center gap-1 ${perm.can_export ? 'text-green-700' : 'text-gray-400'}`}>
                                {perm.can_export ? <CheckCircle size={14} /> : <X size={14} />}
                                <span>Exporter</span>
                              </div>
                              <div className={`flex items-center gap-1 ${perm.can_validate ? 'text-green-700' : 'text-gray-400'}`}>
                                {perm.can_validate ? <CheckCircle size={14} /> : <X size={14} />}
                                <span>Valider</span>
                              </div>
                              <div className={`flex items-center gap-1 ${perm.can_assign ? 'text-green-700' : 'text-gray-400'}`}>
                                {perm.can_assign ? <CheckCircle size={14} /> : <X size={14} />}
                                <span>Assigner</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section droite : Permissions personnalisées par utilisateur */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Permissions personnalisées</h3>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sélectionner un utilisateur
                      </label>
                      <select
                        value={selectedUserForPermissions}
                        onChange={(e) => {
                          setSelectedUserForPermissions(e.target.value);
                          loadUserPermissions(e.target.value);
                        }}
                        className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Choisir un utilisateur --</option>
                        {users.filter(u => u.is_active).map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.email} ({user.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedUserForPermissions ? (
                      <>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-sm text-yellow-800">
                          <p className="font-medium mb-1 flex items-center gap-2">
                            <AlertTriangle size={16} />
                            Permissions personnalisées
                          </p>
                          <p>Ces permissions remplacent les permissions par défaut du rôle pour cet utilisateur.</p>
                        </div>

                        {loadingPermissions ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-gray-600 mt-4">Chargement...</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {modules.map((module) => {
                              const user = users.find(u => u.id === selectedUserForPermissions);
                              const defaultPerm = rolePermissions.find(p => p.role === user?.role && p.module_slug === module.slug);
                              const customPerm = userPermissions.find(p => p.module_slug === module.slug);

                              const hasCustom = customPerm && (
                                customPerm.can_read !== defaultPerm?.can_read ||
                                customPerm.can_write !== defaultPerm?.can_write ||
                                customPerm.can_delete !== defaultPerm?.can_delete ||
                                customPerm.can_export !== defaultPerm?.can_export ||
                                customPerm.can_validate !== defaultPerm?.can_validate ||
                                customPerm.can_assign !== defaultPerm?.can_assign
                              );

                              return (
                                <div key={module.slug} className={`border-2 rounded-lg p-4 ${hasCustom ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}`}>
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xl">{module.icon}</span>
                                    <div className="flex-1">
                                      <div className="font-semibold text-gray-900">{module.name}</div>
                                      <div className="text-xs text-gray-500">{module.description}</div>
                                    </div>
                                    {hasCustom && (
                                      <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded font-medium">
                                        Personnalisé
                                      </span>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {['can_read', 'can_write', 'can_delete', 'can_export', 'can_validate', 'can_assign'].map((permType) => {
                                      const label = {
                                        can_read: 'Voir',
                                        can_write: 'Modifier',
                                        can_delete: 'Supprimer',
                                        can_export: 'Exporter',
                                        can_validate: 'Valider',
                                        can_assign: 'Assigner'
                                      }[permType];

                                      const isChecked = customPerm?.[permType as keyof UserPermission] ?? defaultPerm?.[permType as keyof RolePermission] ?? false;
                                      const isDefault = !customPerm && defaultPerm?.[permType as keyof RolePermission];

                                      return (
                                        <label key={permType} className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 ${isDefault ? 'opacity-60' : ''}`}>
                                          <input
                                            type="checkbox"
                                            checked={Boolean(isChecked)}
                                            onChange={(e) => saveUserPermission(selectedUserForPermissions, module.slug, permType, e.target.checked)}
                                            className="w-4 h-4 text-blue-600"
                                          />
                                          <span>{label}</span>
                                          {isDefault && <span className="text-gray-400 text-xs">(défaut)</span>}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                        <Shield size={48} className="mx-auto mb-3 text-gray-400" />
                        <p>Sélectionnez un utilisateur pour voir et modifier ses permissions</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Notifications</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-gray-900">Nouveaux leads</div>
                      <div className="text-sm text-gray-600">Recevoir une alerte pour chaque nouveau lead</div>
                    </div>
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-blue-600"
                      checked={settings.notifications.new_leads}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, new_leads: e.target.checked }
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-gray-900">Décisions IA</div>
                      <div className="text-sm text-gray-600">Notifications des décisions IA en attente</div>
                    </div>
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-blue-600"
                      checked={settings.notifications.ai_decisions}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, ai_decisions: e.target.checked }
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-gray-900">Alertes churn</div>
                      <div className="text-sm text-gray-600">Alertes pour les clients à risque</div>
                    </div>
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-blue-600"
                      checked={settings.notifications.churn_alerts}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, churn_alerts: e.target.checked }
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-gray-900">Documents manquants</div>
                      <div className="text-sm text-gray-600">Rappels pour documents en attente</div>
                    </div>
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-blue-600"
                      checked={settings.notifications.missing_documents}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, missing_documents: e.target.checked }
                      })}
                    />
                  </div>

                  <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="mt-6 flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Enregistrement...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <CheckCircle size={20} />
                        Enregistré !
                      </>
                    ) : (
                      <>
                        <Save size={20} />
                        Enregistrer
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Intégrations</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div className="border-2 border-gray-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Mail size={32} className="text-blue-600" />
                      <div>
                        <h3 className="font-bold text-gray-900">Brevo</h3>
                        <div className="text-sm text-green-600 font-medium">Connecté</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Plateforme d'emailing</p>
                    <button
                      onClick={() => setShowIntegrationModal('brevo')}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Configurer
                    </button>
                  </div>

                  <div className="border-2 border-gray-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <MessageSquare size={32} className="text-green-600" />
                      <div>
                        <h3 className="font-bold text-gray-900">WhatsApp</h3>
                        <div className="text-sm text-green-600 font-medium">Connecté</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Messagerie instantanée</p>
                    <button
                      onClick={() => setShowIntegrationModal('whatsapp')}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Configurer
                    </button>
                  </div>

                  <div className="border-2 border-gray-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Database size={32} className="text-purple-600" />
                      <div>
                        <h3 className="font-bold text-gray-900">Supabase</h3>
                        <div className="text-sm text-green-600 font-medium">Connecté</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Base de données</p>
                    <button
                      onClick={() => setShowIntegrationModal('supabase')}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Configurer
                    </button>
                  </div>

                  <div className="border-2 border-gray-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Shield size={32} className="text-orange-600" />
                      <div>
                        <h3 className="font-bold text-gray-900">Stripe</h3>
                        <div className="text-sm text-gray-500 font-medium">Non connecté</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Paiements</p>
                    <button
                      onClick={() => setShowIntegrationModal('stripe')}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Connecter
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Configuration IA</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Niveau d'autonomie IA
                    </label>
                    <select
                      value={settings.ai_autonomy_level}
                      onChange={(e) => setSettings({ ...settings, ai_autonomy_level: e.target.value })}
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="manual">Manuel (toujours demander approbation)</option>
                      <option value="semi-automatic">Semi-automatique (approuver décisions à haute confiance)</option>
                      <option value="automatic">Automatique (appliquer toutes les décisions)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seuil de confiance pour auto-application (%)
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={settings.ai_confidence_threshold}
                      onChange={(e) => setSettings({ ...settings, ai_confidence_threshold: parseInt(e.target.value) })}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>50%</span>
                      <span className="font-bold text-blue-600">{settings.ai_confidence_threshold}%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">Agents IA activés</h3>
                    {Object.entries({
                      lead_scorer: 'Lead Scorer',
                      email_composer: 'Email Composer',
                      negotiation_assistant: 'Negotiation Assistant',
                      risk_analyzer: 'Risk Analyzer',
                      churn_predictor: 'Churn Predictor',
                      cross_sell_recommender: 'Cross-Sell Recommender',
                      sentiment_analyzer: 'Sentiment Analyzer',
                      response_generator: 'Response Generator'
                    }).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">{label}</span>
                        <input
                          type="checkbox"
                          className="w-5 h-5 text-blue-600"
                          checked={settings.ai_agents[key as keyof typeof settings.ai_agents]}
                          onChange={(e) => setSettings({
                            ...settings,
                            ai_agents: { ...settings.ai_agents, [key]: e.target.checked }
                          })}
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Enregistrement...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <CheckCircle size={20} />
                        Enregistré !
                      </>
                    ) : (
                      <>
                        <Save size={20} />
                        Enregistrer
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showIntegrationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 capitalize">Configuration {showIntegrationModal}</h3>
              <button
                onClick={() => setShowIntegrationModal(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {showIntegrationModal === 'brevo' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Clé API Brevo
                    </label>
                    <input
                      type="password"
                      value={integrationSettings.brevo.api_key}
                      onChange={(e) => setIntegrationSettings({
                        ...integrationSettings,
                        brevo: { ...integrationSettings.brevo, api_key: e.target.value }
                      })}
                      placeholder="xkeysib-..."
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email expéditeur
                    </label>
                    <input
                      type="email"
                      value={integrationSettings.brevo.sender_email}
                      onChange={(e) => setIntegrationSettings({
                        ...integrationSettings,
                        brevo: { ...integrationSettings.brevo, sender_email: e.target.value }
                      })}
                      placeholder="noreply@taxiassur.com"
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom expéditeur
                    </label>
                    <input
                      type="text"
                      value={integrationSettings.brevo.sender_name}
                      onChange={(e) => setIntegrationSettings({
                        ...integrationSettings,
                        brevo: { ...integrationSettings.brevo, sender_name: e.target.value }
                      })}
                      placeholder="TaxiAssur"
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {showIntegrationModal === 'whatsapp' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Twilio Account SID
                    </label>
                    <input
                      type="text"
                      value={integrationSettings.whatsapp.account_sid}
                      onChange={(e) => setIntegrationSettings({
                        ...integrationSettings,
                        whatsapp: { ...integrationSettings.whatsapp, account_sid: e.target.value }
                      })}
                      placeholder="AC..."
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auth Token
                    </label>
                    <input
                      type="password"
                      value={integrationSettings.whatsapp.auth_token}
                      onChange={(e) => setIntegrationSettings({
                        ...integrationSettings,
                        whatsapp: { ...integrationSettings.whatsapp, auth_token: e.target.value }
                      })}
                      placeholder="..."
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro de téléphone WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={integrationSettings.whatsapp.phone_number}
                      onChange={(e) => setIntegrationSettings({
                        ...integrationSettings,
                        whatsapp: { ...integrationSettings.whatsapp, phone_number: e.target.value }
                      })}
                      placeholder="+33..."
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {showIntegrationModal === 'supabase' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL Supabase
                    </label>
                    <input
                      type="url"
                      value={integrationSettings.supabase.url}
                      onChange={(e) => setIntegrationSettings({
                        ...integrationSettings,
                        supabase: { ...integrationSettings.supabase, url: e.target.value }
                      })}
                      placeholder="https://xxx.supabase.co"
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Clé anonyme (anon)
                    </label>
                    <input
                      type="password"
                      value={integrationSettings.supabase.anon_key}
                      onChange={(e) => setIntegrationSettings({
                        ...integrationSettings,
                        supabase: { ...integrationSettings.supabase, anon_key: e.target.value }
                      })}
                      placeholder="eyJ..."
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Clé service (service_role)
                    </label>
                    <input
                      type="password"
                      value={integrationSettings.supabase.service_key}
                      onChange={(e) => setIntegrationSettings({
                        ...integrationSettings,
                        supabase: { ...integrationSettings.supabase, service_key: e.target.value }
                      })}
                      placeholder="eyJ..."
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {showIntegrationModal === 'stripe' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Clé secrète Stripe
                    </label>
                    <input
                      type="password"
                      value={integrationSettings.stripe.secret_key}
                      onChange={(e) => setIntegrationSettings({
                        ...integrationSettings,
                        stripe: { ...integrationSettings.stripe, secret_key: e.target.value }
                      })}
                      placeholder="sk_..."
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Clé publique Stripe
                    </label>
                    <input
                      type="text"
                      value={integrationSettings.stripe.publishable_key}
                      onChange={(e) => setIntegrationSettings({
                        ...integrationSettings,
                        stripe: { ...integrationSettings.stripe, publishable_key: e.target.value }
                      })}
                      placeholder="pk_..."
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secret Webhook
                    </label>
                    <input
                      type="password"
                      value={integrationSettings.stripe.webhook_secret}
                      onChange={(e) => setIntegrationSettings({
                        ...integrationSettings,
                        stripe: { ...integrationSettings.stripe, webhook_secret: e.target.value }
                      })}
                      placeholder="whsec_..."
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <p className="font-medium mb-1">Attention</p>
                <p>Ces informations sensibles sont stockées de manière sécurisée et cryptées.</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowIntegrationModal(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => saveIntegration(showIntegrationModal)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <Save size={20} />
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Inviter un utilisateur</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="utilisateur@entreprise.com"
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  L'email doit avoir un domaine complet (ex: @gmail.com, @taxiassur.com)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={inviteForm.full_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                  placeholder="Jean Dupont"
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rôle
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="collaborator">Collaborateur</option>
                  <option value="admin">Administrateur</option>
                  <option value="commercial">Commercial</option>
                  <option value="support">Support</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium mb-1">Un email d'invitation sera envoyé</p>
                <p>L'utilisateur pourra définir son mot de passe lors de sa première connexion.</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={inviteUser}
                  disabled={inviting || !inviteForm.email || !inviteForm.full_name}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Envoi...
                    </>
                  ) : (
                    <>
                      <UserPlus size={20} />
                      Inviter
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMAdminSettings;
