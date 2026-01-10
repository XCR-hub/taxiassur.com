import React, { useState, useEffect } from 'react';
import { Settings, Users, Bell, Shield, Database, Zap, Mail, MessageSquare, Bot, Save, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

const CRMAdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'notifications' | 'integrations' | 'ai'>('general');
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

  useEffect(() => {
    loadSettings();
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
      alert('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'Général', icon: Settings },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Intégrations', icon: Zap },
    { id: 'ai', label: 'IA Config', icon: Bot }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
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
                  <button className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
                    + Inviter un utilisateur
                  </button>
                </div>

                <div className="space-y-3">
                  {['admin@taxiassur.com', 'commercial@taxiassur.com', 'support@taxiassur.com'].map((email, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700">
                          {email[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{email}</div>
                          <div className="text-sm text-gray-600">
                            {idx === 0 ? 'Administrateur' : idx === 1 ? 'Commercial' : 'Support'}
                          </div>
                        </div>
                      </div>
                      <button className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        Supprimer
                      </button>
                    </div>
                  ))}
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
                    <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
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
                    <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
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
                    <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
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
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
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
    </div>
  );
};

export default CRMAdminSettings;
