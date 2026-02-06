import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, User, FileText, AlertCircle, DollarSign, CheckSquare, Clock,
  Shield, Car, Building2, Phone, Mail, MapPin, Calendar, Edit, Save, X,
  Plus, Download, Upload, Trash2, Eye, ChevronDown, ChevronUp, Activity,
  Bell, TrendingUp, AlertTriangle, CheckCircle2, Loader2, RefreshCw
} from 'lucide-react';

interface ClientData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  status: string;
  created_at: string;
}

interface TaxiProfile {
  taxi_type?: string;
  company_name?: string;
  siret?: string;
  ads_number?: string;
  ads_issuing_city?: string;
  ads_start_date?: string;
  plate_number?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_energy?: string;
  first_registration_date?: string;
  vehicle_usage?: string;
  driver_status?: string;
  documents_checklist?: any;
}

interface Contract {
  id: string;
  contract_type: string;
  insurer_name: string;
  contract_number?: string;
  premium_ttc: number;
  payment_frequency: string;
  effective_date: string;
  renewal_date: string;
  status: string;
  created_at: string;
}

interface Claim {
  id: string;
  claim_type: string;
  claim_date: string;
  status: string;
  insurer_claim_number?: string;
  estimated_amount?: number;
  circumstances: string;
  created_at: string;
}

interface Task {
  id: string;
  task_type: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: string;
  status: string;
  created_at: string;
}

interface Alert {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  severity: string;
  trigger_date: string;
  dismissed: boolean;
}

type TabType = 'profile' | 'contracts' | 'claims' | 'payments' | 'tasks' | 'history';

export default function ClientInsuranceManager() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<ClientData | null>(null);
  const [taxiProfile, setTaxiProfile] = useState<TaxiProfile | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [editingProfile, setEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<TaxiProfile>({});

  useEffect(() => {
    if (leadId) {
      loadAllData();
    }
  }, [leadId]);

  async function loadAllData() {
    try {
      setLoading(true);
      await Promise.all([
        loadClient(),
        loadTaxiProfile(),
        loadContracts(),
        loadClaims(),
        loadTasks(),
        loadAlerts()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadClient() {
    const { data, error } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (!error && data) {
      setClient(data);
    }
  }

  async function loadTaxiProfile() {
    const { data, error } = await supabase
      .from('client_taxi_profiles')
      .select('*')
      .eq('lead_id', leadId)
      .maybeSingle();

    if (!error) {
      setTaxiProfile(data || {});
      setEditedProfile(data || {});
    }
  }

  async function loadContracts() {
    const { data, error } = await supabase
      .from('insurance_contracts')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (!error) {
      setContracts(data || []);
    }
  }

  async function loadClaims() {
    const { data, error } = await supabase
      .from('insurance_claims')
      .select('*')
      .eq('lead_id', leadId)
      .order('claim_date', { ascending: false });

    if (!error) {
      setClaims(data || []);
    }
  }

  async function loadTasks() {
    const { data, error } = await supabase
      .from('client_tasks')
      .select('*')
      .eq('lead_id', leadId)
      .neq('status', 'completed')
      .order('due_date', { ascending: true });

    if (!error) {
      setTasks(data || []);
    }
  }

  async function loadAlerts() {
    const { data, error } = await supabase
      .from('client_alerts')
      .select('*')
      .eq('lead_id', leadId)
      .eq('dismissed', false)
      .order('trigger_date', { ascending: true });

    if (!error) {
      setAlerts(data || []);
    }
  }

  async function saveTaxiProfile() {
    try {
      if (taxiProfile && Object.keys(taxiProfile).length > 0) {
        // Update existing
        const { error } = await supabase
          .from('client_taxi_profiles')
          .update(editedProfile)
          .eq('lead_id', leadId);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('client_taxi_profiles')
          .insert({ ...editedProfile, lead_id: leadId });

        if (error) throw error;
      }

      await loadTaxiProfile();
      setEditingProfile(false);
    } catch (error: any) {
      alert('Erreur lors de la sauvegarde: ' + error.message);
    }
  }

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'auto_taxi': 'Auto Taxi',
      'rc_pro_taxi': 'RC Pro Taxi',
      'protection_juridique': 'Protection Juridique',
      'prevoyance': 'Prévoyance',
      'sante_tns': 'Santé TNS',
      'multirisque_pro': 'Multirisque Pro'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'quote': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'active': 'bg-green-500/20 text-green-400 border-green-500/30',
      'suspended': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'terminated': 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return `px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Client introuvable</h2>
          <button
            onClick={() => navigate('/backoffice/clients')}
            className="text-blue-600 hover:underline"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/backoffice/clients')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          Retour aux clients
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {client.first_name} {client.last_name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Mail size={16} />
                  {client.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone size={16} />
                  {client.phone}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={16} />
                  {client.city} {client.postal_code}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadAllData}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Actualiser"
              >
                <RefreshCw size={20} className="text-gray-600" />
              </button>
              <button
                onClick={() => window.open(`/espace-client/${client.id}`, '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Eye size={18} />
                Voir comme client
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border flex items-start justify-between ${
                alert.severity === 'critical'
                  ? 'bg-red-50 border-red-200'
                  : alert.severity === 'warning'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {alert.severity === 'critical' ? (
                  <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                ) : alert.severity === 'warning' ? (
                  <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                ) : (
                  <Bell className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                )}
                <div>
                  <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                  <p className="text-sm text-gray-600">{alert.message}</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  await supabase
                    .from('client_alerts')
                    .update({ dismissed: true })
                    .eq('id', alert.id);
                  loadAlerts();
                }}
                className="p-1 hover:bg-white/50 rounded"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px space-x-8">
            {[
              { id: 'profile', label: 'Profil Taxi', icon: User },
              { id: 'contracts', label: 'Contrats', icon: FileText },
              { id: 'claims', label: 'Sinistres', icon: AlertCircle },
              { id: 'payments', label: 'Paiements', icon: DollarSign },
              { id: 'tasks', label: 'Tâches', icon: CheckSquare },
              { id: 'history', label: 'Historique', icon: Clock }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {activeTab === 'profile' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Profil Taxi</h2>
              {!editingProfile ? (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Edit size={18} />
                  Modifier
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingProfile(false);
                      setEditedProfile(taxiProfile || {});
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                  >
                    <X size={18} />
                    Annuler
                  </button>
                  <button
                    onClick={saveTaxiProfile}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <Save size={18} />
                    Enregistrer
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                {editingProfile ? (
                  <select
                    value={editedProfile.taxi_type || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, taxi_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="artisan">Artisan</option>
                    <option value="societe">Société</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{taxiProfile?.taxi_type === 'artisan' ? 'Artisan' : taxiProfile?.taxi_type === 'societe' ? 'Société' : '-'}</p>
                )}
              </div>

              {editedProfile.taxi_type === 'societe' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom société</label>
                    {editingProfile ? (
                      <input
                        type="text"
                        value={editedProfile.company_name || ''}
                        onChange={(e) => setEditedProfile({ ...editedProfile, company_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{taxiProfile?.company_name || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">SIRET</label>
                    {editingProfile ? (
                      <input
                        type="text"
                        value={editedProfile.siret || ''}
                        onChange={(e) => setEditedProfile({ ...editedProfile, siret: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{taxiProfile?.siret || '-'}</p>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">N° ADS</label>
                {editingProfile ? (
                  <input
                    type="text"
                    value={editedProfile.ads_number || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, ads_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{taxiProfile?.ads_number || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ville d'émission ADS</label>
                {editingProfile ? (
                  <input
                    type="text"
                    value={editedProfile.ads_issuing_city || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, ads_issuing_city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{taxiProfile?.ads_issuing_city || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Immatriculation</label>
                {editingProfile ? (
                  <input
                    type="text"
                    value={editedProfile.plate_number || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, plate_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{taxiProfile?.plate_number || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marque véhicule</label>
                {editingProfile ? (
                  <input
                    type="text"
                    value={editedProfile.vehicle_brand || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, vehicle_brand: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{taxiProfile?.vehicle_brand || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Modèle véhicule</label>
                {editingProfile ? (
                  <input
                    type="text"
                    value={editedProfile.vehicle_model || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, vehicle_model: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{taxiProfile?.vehicle_model || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Énergie</label>
                {editingProfile ? (
                  <select
                    value={editedProfile.vehicle_energy || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, vehicle_energy: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="essence">Essence</option>
                    <option value="diesel">Diesel</option>
                    <option value="hybride">Hybride</option>
                    <option value="electrique">Électrique</option>
                    <option value="gpl">GPL</option>
                  </select>
                ) : (
                  <p className="text-gray-900 capitalize">{taxiProfile?.vehicle_energy || '-'}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contracts' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Contrats d'assurance</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Plus size={18} />
                Nouveau contrat
              </button>
            </div>

            {contracts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="mx-auto mb-3" size={48} />
                <p>Aucun contrat pour ce client</p>
              </div>
            ) : (
              <div className="space-y-4">
                {contracts.map(contract => (
                  <div
                    key={contract.id}
                    className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {getContractTypeLabel(contract.contract_type)}
                          </h3>
                          <span className={getStatusBadge(contract.status)}>
                            {contract.status === 'active' ? 'Actif' : contract.status === 'quote' ? 'Devis' : contract.status === 'suspended' ? 'Suspendu' : 'Résilié'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {contract.insurer_name} • {contract.contract_number}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">
                          {contract.premium_ttc.toFixed(2)} €
                        </p>
                        <p className="text-sm text-gray-600">{contract.payment_frequency}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Date effet</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(contract.effective_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Renouvellement</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(contract.renewal_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Créé le</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(contract.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                          <Eye size={18} className="text-gray-600" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                          <Edit size={18} className="text-gray-600" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                          <Download size={18} className="text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'claims' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Sinistres</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Plus size={18} />
                Déclarer un sinistre
              </button>
            </div>

            {claims.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="mx-auto mb-3" size={48} />
                <p>Aucun sinistre déclaré</p>
              </div>
            ) : (
              <div className="space-y-4">
                {claims.map(claim => (
                  <div
                    key={claim.id}
                    className="border border-gray-200 rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {claim.claim_type.replace(/_/g, ' ').toUpperCase()}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">{claim.circumstances}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">
                            Date: {new Date(claim.claim_date).toLocaleDateString('fr-FR')}
                          </span>
                          {claim.insurer_claim_number && (
                            <span className="text-gray-600">
                              N° sinistre: {claim.insurer_claim_number}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={getStatusBadge(claim.status)}>
                        {claim.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Paiements et échéances</h2>
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="mx-auto mb-3" size={48} />
              <p>Aucun échéancier configuré</p>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Tâches à faire</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Plus size={18} />
                Nouvelle tâche
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckSquare className="mx-auto mb-3" size={48} />
                <p>Aucune tâche en cours</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-gray-600">{task.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {task.due_date && (
                        <span className="text-sm text-gray-600">
                          {new Date(task.due_date).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Historique complet</h2>
            <div className="text-center py-12 text-gray-500">
              <Activity className="mx-auto mb-3" size={48} />
              <p>Aucun historique disponible</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
