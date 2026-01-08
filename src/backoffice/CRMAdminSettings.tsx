import React, { useState } from 'react';
import { Settings, Users, Bell, Shield, Database, Zap, Mail, MessageSquare, Bot } from 'lucide-react';
import BackButton from './BackButton';

const CRMAdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'notifications' | 'integrations' | 'ai'>('general');

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
          <BackButton />
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
                      defaultValue="TaxiAssur"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email principal
                    </label>
                    <input
                      type="email"
                      defaultValue="contact@taxiassur.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fuseau horaire
                    </label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Europe/Paris</option>
                      <option>America/New_York</option>
                      <option>Asia/Tokyo</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="auto-assign" className="w-5 h-5" defaultChecked />
                    <label htmlFor="auto-assign" className="text-sm text-gray-700">
                      Assignation automatique des leads
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="ai-decisions" className="w-5 h-5" defaultChecked />
                    <label htmlFor="ai-decisions" className="text-sm text-gray-700">
                      Activer les décisions IA automatiques
                    </label>
                  </div>

                  <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    Enregistrer
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
                    <input type="checkbox" className="w-5 h-5" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-gray-900">Décisions IA</div>
                      <div className="text-sm text-gray-600">Notifications des décisions IA en attente</div>
                    </div>
                    <input type="checkbox" className="w-5 h-5" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-gray-900">Alertes churn</div>
                      <div className="text-sm text-gray-600">Alertes pour les clients à risque</div>
                    </div>
                    <input type="checkbox" className="w-5 h-5" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-gray-900">Documents manquants</div>
                      <div className="text-sm text-gray-600">Rappels pour documents en attente</div>
                    </div>
                    <input type="checkbox" className="w-5 h-5" defaultChecked />
                  </div>

                  <button className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    Enregistrer
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
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Manuel (toujours demander approbation)</option>
                      <option selected>Semi-automatique (approuver décisions à haute confiance)</option>
                      <option>Automatique (appliquer toutes les décisions)</option>
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
                      defaultValue="80"
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>50%</span>
                      <span className="font-bold text-blue-600">80%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">Agents IA activés</h3>
                    {Object.entries({
                      'Lead Scorer': true,
                      'Email Composer': true,
                      'Negotiation Assistant': true,
                      'Risk Analyzer': true,
                      'Churn Predictor': true,
                      'Cross-Sell Recommender': true,
                      'Sentiment Analyzer': false,
                      'Response Generator': true
                    }).map(([agent, enabled]) => (
                      <div key={agent} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">{agent}</span>
                        <input type="checkbox" className="w-5 h-5" defaultChecked={enabled} />
                      </div>
                    ))}
                  </div>

                  <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    Enregistrer
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
