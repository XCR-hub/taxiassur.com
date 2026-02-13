import React, { useEffect, useState } from 'react';
import { Download, Settings, Play, Clock, CheckCircle, XCircle, Eye, Loader2, FileText, Database, Key } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Credential {
  id: string;
  company_name: string;
  portal_url: string;
  username: string;
  status: string;
  last_connection_at: string | null;
  last_error: string | null;
}

interface ImportJob {
  id: string;
  credential_id: string;
  client_id: string;
  contract_number: string;
  status: string;
  progress_percentage: number;
  total_documents: number;
  imported_documents: number;
  error_message: string | null;
  logs: any[];
  created_at: string;
  completed_at: string | null;
  insurance_web_credentials?: {
    company_name: string;
  };
}

interface Client {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  contract_number: string;
}

const companyLogos: Record<string, string> = {
  'solly_azar': '/logo-officiel-solly-azar_0.png',
  'generali': '/logo_generali.png',
  'zephir': '/logo_zephir.png',
  'plus_simple': '/logo_plu_simple.png',
  '2ma': '/logo_mfa.png',
};

const companyNames: Record<string, string> = {
  'solly_azar': 'Solly Azar',
  'generali': 'Generali',
  '2ma': '2MA',
  'zephir': 'Zephir',
  'plus_simple': '+Simple',
};

const WebImportManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'credentials' | 'jobs' | 'new-import'>('credentials');
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedCompany, setSelectedCompany] = useState('');
  const [portalUsername, setPortalUsername] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedCredential, setSelectedCredential] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadJobs, 5000); // Refresh jobs every 5s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadCredentials(), loadJobs(), loadClients()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCredentials = async () => {
    const { data, error } = await supabase
      .from('insurance_web_credentials')
      .select('*')
      .order('company_name');

    if (!error && data) {
      setCredentials(data);
    }
  };

  const loadJobs = async () => {
    const { data, error } = await supabase
      .from('web_import_jobs')
      .select(`
        *,
        insurance_web_credentials(company_name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setJobs(data);
    }
  };

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('crm_clients')
      .select('id, prenom, nom, email, contract_number')
      .order('nom');

    if (!error && data) {
      setClients(data);
    }
  };

  const handleAddCredential = async () => {
    if (!selectedCompany || !portalUsername || !portalPassword) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      // Vérifier l'authentification
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('Vous devez être connecté pour ajouter des identifiants');
        return;
      }

      const { error } = await supabase
        .from('insurance_web_credentials')
        .insert({
          company_name: selectedCompany,
          portal_url: getPortalUrl(selectedCompany),
          username: portalUsername,
          password_encrypted: portalPassword,
          status: 'active',
          created_by: user.id
        });

      if (error) {
        console.error('Supabase error:', error);

        // Messages d'erreur personnalisés
        if (error.code === '42501') {
          alert('Permission refusée. Vous devez être administrateur pour ajouter des identifiants.');
        } else if (error.message.includes('violates')) {
          alert('Erreur de contrainte: ' + error.message);
        } else {
          alert('Erreur lors de l\'ajout: ' + error.message);
        }
        return;
      }

      alert('Identifiants ajoutés avec succès!');
      setSelectedCompany('');
      setPortalUsername('');
      setPortalPassword('');
      loadCredentials();
    } catch (error: any) {
      console.error('Error adding credential:', error);
      alert('Erreur inattendue: ' + (error?.message || 'Erreur inconnue'));
    }
  };

  const handleStartImport = async () => {
    if (!selectedCredential || !selectedClient) {
      alert('Veuillez sélectionner un client et un assureur');
      return;
    }

    const client = clients.find(c => c.id === selectedClient);
    if (!client?.contract_number) {
      alert('Le client doit avoir un numéro de contrat');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('start_web_import', {
        p_credential_id: selectedCredential,
        p_client_id: selectedClient,
        p_contract_number: client.contract_number
      });

      if (error) throw error;

      alert('Import démarré avec succès!');
      setActiveTab('jobs');
      loadJobs();
    } catch (error) {
      console.error('Error starting import:', error);
      alert('Erreur lors du démarrage de l\'import');
    }
  };

  const getPortalUrl = (company: string): string => {
    const urls: Record<string, string> = {
      'solly_azar': 'https://www.sollyazar.com/espace-client',
      'generali': 'https://www.generali.fr/espace-client',
      '2ma': 'https://extranet.2ma.fr',
      'zephir': 'https://www.zephir.fr/espace-client',
      'plus_simple': 'https://www.plussimple.fr/espace-pro',
    };
    return urls[company] || '';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-700',
      running: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
    };

    const icons: Record<string, any> = {
      pending: Clock,
      running: Loader2,
      completed: CheckCircle,
      failed: XCircle,
    };

    const Icon = icons[status] || Clock;
    const className = status === 'running' ? 'animate-spin' : '';

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
        <Icon className={`w-4 h-4 ${className}`} />
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg">
              <Download className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Import Web Assureurs</h1>
              <p className="text-gray-600">Récupération automatique des données et documents depuis les portails</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('credentials')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'credentials'
                ? 'bg-white text-blue-600 shadow-md border-2 border-blue-200'
                : 'bg-white/50 text-gray-600 hover:bg-white'
            }`}
          >
            <Key className="w-5 h-5" />
            Identifiants ({credentials.length})
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'jobs'
                ? 'bg-white text-blue-600 shadow-md border-2 border-blue-200'
                : 'bg-white/50 text-gray-600 hover:bg-white'
            }`}
          >
            <Database className="w-5 h-5" />
            Historique ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab('new-import')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'new-import'
                ? 'bg-white text-blue-600 shadow-md border-2 border-blue-200'
                : 'bg-white/50 text-gray-600 hover:bg-white'
            }`}
          >
            <Play className="w-5 h-5" />
            Nouvel Import
          </button>
        </div>

        {/* Content */}
        {activeTab === 'credentials' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Ajouter des identifiants
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assureur
                  </label>
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un assureur</option>
                    <option value="solly_azar">Solly Azar</option>
                    <option value="generali">Generali</option>
                    <option value="2ma">2MA</option>
                    <option value="zephir">Zephir</option>
                    <option value="plus_simple">+Simple</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Identifiant portail
                  </label>
                  <input
                    type="text"
                    value={portalUsername}
                    onChange={(e) => setPortalUsername(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Votre identifiant"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={portalPassword}
                    onChange={(e) => setPortalPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Votre mot de passe"
                  />
                </div>

                <button
                  onClick={handleAddCredential}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition-all"
                >
                  Ajouter les identifiants
                </button>
              </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Identifiants configurés
              </h2>

              <div className="space-y-3">
                {credentials.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    Aucun identifiant configuré
                  </p>
                ) : (
                  credentials.map((cred) => (
                    <div
                      key={cred.id}
                      className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {companyLogos[cred.company_name] && (
                            <img
                              src={companyLogos[cred.company_name]}
                              alt={cred.company_name}
                              className="w-12 h-12 object-contain rounded"
                            />
                          )}
                          <div>
                            <div className="font-semibold text-gray-900">
                              {companyNames[cred.company_name] || cred.company_name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {cred.username}
                            </div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          cred.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {cred.status}
                        </span>
                      </div>
                      {cred.last_error && (
                        <div className="mt-2 text-xs text-red-600">
                          Dernière erreur: {cred.last_error}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Historique des imports
            </h2>

            <div className="space-y-3">
              {jobs.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Aucun import effectué
                </p>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className="border-2 border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {companyNames[job.insurance_web_credentials?.company_name || ''] || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-600">
                            Contrat: {job.contract_number}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(job.status)}
                    </div>

                    {job.status === 'running' && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                          <span>Progression</span>
                          <span>{job.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${job.progress_percentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {job.status === 'completed' && (
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>📄 {job.imported_documents} documents importés</span>
                        <span>⏱️ {new Date(job.completed_at!).toLocaleString('fr-FR')}</span>
                      </div>
                    )}

                    {job.error_message && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {job.error_message}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'new-import' && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Play className="w-5 h-5" />
              Lancer un nouvel import
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.prenom} {client.nom} - {client.contract_number || 'Pas de contrat'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assureur
                </label>
                <select
                  value={selectedCredential}
                  onChange={(e) => setSelectedCredential(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un assureur</option>
                  {credentials.map((cred) => (
                    <option key={cred.id} value={cred.id}>
                      {companyNames[cred.company_name]} - {cred.username}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleStartImport}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Démarrer l'import
              </button>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Comment ça marche ?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ Connexion automatique au portail assureur</li>
                  <li>✓ Récupération des informations du contrat</li>
                  <li>✓ Téléchargement de tous les documents (attestations, avenants, factures)</li>
                  <li>✓ Import dans l'espace client</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebImportManager;
