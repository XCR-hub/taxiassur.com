import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, User, FileText, AlertCircle, DollarSign, CheckSquare, Clock, Shield, Car, Building2, Phone, Mail, MapPin, Calendar, CreditCard as Edit, Save, X, Plus, Download, Upload, Trash2, Eye, ChevronDown, ChevronUp, Activity, Bell, TrendingUp, AlertTriangle, CheckCircle2, Loader2, RefreshCw, FolderOpen } from 'lucide-react';
import DocumentsViewer from './DocumentsViewer';

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
  access_token?: string;
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

type TabType = 'profile' | 'contracts' | 'documents' | 'claims' | 'payments' | 'tasks' | 'history';

interface ContractForm {
  contract_type: string;
  insurer_name: string;
  contract_number: string;
  premium_ttc: string;
  premium_ht: string;
  payment_frequency: string;
  effective_date: string;
  renewal_date: string;
  status: string;
  main_guarantees: string;
  franchise_amount: string;
  internal_notes: string;
}

interface ClaimForm {
  claim_type: string;
  claim_date: string;
  circumstances: string;
  location: string;
  vehicle_plate: string;
  insurer_claim_number: string;
  estimated_amount: string;
  status: string;
  internal_notes: string;
  contract_id: string;
}

const defaultClaimForm: ClaimForm = {
  claim_type: 'accident',
  claim_date: new Date().toISOString().split('T')[0],
  circumstances: '',
  location: '',
  vehicle_plate: '',
  insurer_claim_number: '',
  estimated_amount: '',
  status: 'declared',
  internal_notes: '',
  contract_id: ''
};

const defaultContractForm: ContractForm = {
  contract_type: 'auto_taxi',
  insurer_name: '',
  contract_number: '',
  premium_ttc: '',
  premium_ht: '',
  payment_frequency: 'annuel',
  effective_date: '',
  renewal_date: '',
  status: 'active',
  main_guarantees: '',
  franchise_amount: '',
  internal_notes: ''
};

export default function ClientInsuranceManager() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<ClientData | null>(null);
  const [taxiProfile, setTaxiProfile] = useState<TaxiProfile | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [crmDocs, setCrmDocs] = useState<{id:string;file_name:string;document_type:string;status:string;created_at:string;file_url:string|null}[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [editingProfile, setEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<TaxiProfile>({});
  const [showContractForm, setShowContractForm] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [contractForm, setContractForm] = useState<ContractForm>(defaultContractForm);
  const [savingContract, setSavingContract] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [claimForm, setClaimForm] = useState<ClaimForm>(defaultClaimForm);
  const [savingClaim, setSavingClaim] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

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
        loadCrmDocs(),
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

  async function loadCrmDocs() {
    const { data, error } = await supabase
      .from('crm_lead_documents')
      .select('id, file_name, document_type, status, created_at, file_url')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (!error) {
      setCrmDocs(data || []);
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

  function openNewContractForm() {
    setContractForm(defaultContractForm);
    setEditingContractId(null);
    setContractError(null);
    setShowContractForm(true);
  }

  function openEditContractForm(contract: Contract) {
    setContractForm({
      contract_type: contract.contract_type,
      insurer_name: contract.insurer_name,
      contract_number: contract.contract_number || '',
      premium_ttc: contract.premium_ttc?.toString() || '',
      premium_ht: '',
      payment_frequency: contract.payment_frequency || 'annuel',
      effective_date: contract.effective_date ? contract.effective_date.split('T')[0] : '',
      renewal_date: contract.renewal_date ? contract.renewal_date.split('T')[0] : '',
      status: contract.status,
      main_guarantees: '',
      franchise_amount: '',
      internal_notes: ''
    });
    setEditingContractId(contract.id);
    setContractError(null);
    setShowContractForm(true);
  }

  async function saveContract() {
    setContractError(null);
    if (!contractForm.insurer_name.trim()) {
      setContractError("Le nom de la compagnie est obligatoire.");
      return;
    }
    if (!contractForm.premium_ttc || isNaN(Number(contractForm.premium_ttc))) {
      setContractError("La prime TTC doit être un nombre valide.");
      return;
    }
    if (!contractForm.effective_date) {
      setContractError("La date d'effet est obligatoire.");
      return;
    }
    if (!contractForm.renewal_date) {
      setContractError("La date de renouvellement est obligatoire.");
      return;
    }

    setSavingContract(true);
    try {
      const payload = {
        lead_id: leadId,
        contract_type: contractForm.contract_type,
        insurer_name: contractForm.insurer_name.trim(),
        contract_number: contractForm.contract_number.trim() || null,
        premium_ttc: parseFloat(contractForm.premium_ttc),
        premium_ht: contractForm.premium_ht ? parseFloat(contractForm.premium_ht) : null,
        payment_frequency: contractForm.payment_frequency,
        effective_date: contractForm.effective_date,
        renewal_date: contractForm.renewal_date,
        status: contractForm.status,
        main_guarantees: contractForm.main_guarantees.trim() || null,
        franchise_amount: contractForm.franchise_amount ? parseFloat(contractForm.franchise_amount) : null,
        internal_notes: contractForm.internal_notes.trim() || null
      };

      if (editingContractId) {
        const { error } = await supabase
          .from('insurance_contracts')
          .update(payload)
          .eq('id', editingContractId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('insurance_contracts')
          .insert(payload);
        if (error) throw error;
      }

      await loadContracts();
      setShowContractForm(false);
      setEditingContractId(null);
      setContractForm(defaultContractForm);
    } catch (err: any) {
      setContractError("Erreur : " + err.message);
    } finally {
      setSavingContract(false);
    }
  }

  async function deleteContract(contractId: string) {
    if (!confirm("Supprimer ce contrat ?")) return;
    const { error } = await supabase.from('insurance_contracts').delete().eq('id', contractId);
    if (!error) await loadContracts();
  }

  function openNewClaimForm() {
    setClaimForm(defaultClaimForm);
    setEditingClaimId(null);
    setClaimError(null);
    setShowClaimForm(true);
  }

  function openEditClaimForm(claim: Claim) {
    setClaimForm({
      claim_type: claim.claim_type,
      claim_date: claim.claim_date ? claim.claim_date.split('T')[0] : '',
      circumstances: claim.circumstances || '',
      location: (claim as any).location || '',
      vehicle_plate: (claim as any).vehicle_plate || '',
      insurer_claim_number: claim.insurer_claim_number || '',
      estimated_amount: claim.estimated_amount?.toString() || '',
      status: claim.status,
      internal_notes: (claim as any).internal_notes || '',
      contract_id: (claim as any).contract_id || ''
    });
    setEditingClaimId(claim.id);
    setClaimError(null);
    setShowClaimForm(true);
  }

  async function saveClaim() {
    setClaimError(null);
    if (!claimForm.circumstances.trim()) {
      setClaimError("Les circonstances du sinistre sont obligatoires.");
      return;
    }
    if (!claimForm.claim_date) {
      setClaimError("La date du sinistre est obligatoire.");
      return;
    }

    setSavingClaim(true);
    try {
      const payload = {
        lead_id: leadId,
        claim_type: claimForm.claim_type,
        claim_date: claimForm.claim_date,
        circumstances: claimForm.circumstances.trim(),
        location: claimForm.location.trim() || null,
        vehicle_plate: claimForm.vehicle_plate.trim() || null,
        insurer_claim_number: claimForm.insurer_claim_number.trim() || null,
        estimated_amount: claimForm.estimated_amount ? parseFloat(claimForm.estimated_amount) : null,
        status: claimForm.status,
        internal_notes: claimForm.internal_notes.trim() || null,
        contract_id: claimForm.contract_id || null
      };

      if (editingClaimId) {
        const { error } = await supabase
          .from('insurance_claims')
          .update(payload)
          .eq('id', editingClaimId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('insurance_claims')
          .insert(payload);
        if (error) throw error;
      }

      await loadClaims();
      setShowClaimForm(false);
      setEditingClaimId(null);
      setClaimForm(defaultClaimForm);
    } catch (err: any) {
      setClaimError("Erreur : " + err.message);
    } finally {
      setSavingClaim(false);
    }
  }

  async function deleteClaim(claimId: string) {
    if (!confirm("Supprimer ce sinistre ?")) return;
    const { error } = await supabase.from('insurance_claims').delete().eq('id', claimId);
    if (!error) await loadClaims();
  }

  const getClaimTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'accident': 'Accident',
      'vol': 'Vol',
      'incendie': 'Incendie',
      'bris_de_glace': 'Bris de glace',
      'catastrophe_naturelle': 'Catastrophe naturelle',
      'vandalisme': 'Vandalisme',
      'autre': 'Autre'
    };
    return labels[type] || type;
  };

  const getClaimStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'declared': 'Déclaré',
      'in_progress': 'En cours',
      'expertise': 'En expertise',
      'closed': 'Clôturé',
      'refused': 'Refusé'
    };
    return labels[status] || status;
  };

  const getClaimStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'declared': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'in_progress': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'expertise': 'bg-orange-100 text-orange-700 border-orange-200',
      'closed': 'bg-green-100 text-green-700 border-green-200',
      'refused': 'bg-red-100 text-red-700 border-red-200'
    };
    return `px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-100 text-gray-700 border-gray-200'}`;
  };

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
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
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
            className="text-yellow-600 hover:underline"
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
                onClick={() => window.open(`/espace-client/${client.access_token || client.id}`, '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg transition-colors font-semibold"
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
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {alert.severity === 'critical' ? (
                  <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                ) : alert.severity === 'warning' ? (
                  <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                ) : (
                  <Bell className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
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
              { id: 'documents', label: 'Documents', icon: FolderOpen },
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
                      ? 'border-yellow-500 text-yellow-600'
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
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg transition-colors font-semibold"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
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
              <button
                onClick={openNewContractForm}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg transition-colors font-semibold"
              >
                <Plus size={18} />
                Nouveau contrat
              </button>
            </div>

            {/* Contract form modal */}
            {showContractForm && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900">
                      {editingContractId ? 'Modifier le contrat' : 'Nouveau contrat'}
                    </h3>
                    <button
                      onClick={() => { setShowContractForm(false); setContractError(null); }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-6 space-y-5">
                    {contractError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                        {contractError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type de contrat *</label>
                        <select
                          value={contractForm.contract_type}
                          onChange={(e) => setContractForm({ ...contractForm, contract_type: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white text-sm"
                        >
                          <option value="auto_taxi">Auto Taxi</option>
                          <option value="rc_pro_taxi">RC Pro Taxi</option>
                          <option value="protection_juridique">Protection Juridique</option>
                          <option value="prevoyance">Prévoyance</option>
                          <option value="sante_tns">Santé TNS</option>
                          <option value="multirisque_pro">Multirisque Pro</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Statut *</label>
                        <select
                          value={contractForm.status}
                          onChange={(e) => setContractForm({ ...contractForm, status: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white text-sm"
                        >
                          <option value="active">Actif</option>
                          <option value="quote">Devis</option>
                          <option value="suspended">Suspendu</option>
                          <option value="terminated">Résilié</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Compagnie d'assurance *</label>
                        <input
                          type="text"
                          value={contractForm.insurer_name}
                          onChange={(e) => setContractForm({ ...contractForm, insurer_name: e.target.value })}
                          placeholder="Ex: Generali, MFA, Solly Azar..."
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">N° de contrat</label>
                        <input
                          type="text"
                          value={contractForm.contract_number}
                          onChange={(e) => setContractForm({ ...contractForm, contract_number: e.target.value })}
                          placeholder="Ex: POL-2026-001234"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fréquence de paiement</label>
                        <select
                          value={contractForm.payment_frequency}
                          onChange={(e) => setContractForm({ ...contractForm, payment_frequency: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white text-sm"
                        >
                          <option value="annuel">Annuel</option>
                          <option value="mensuel">Mensuel</option>
                          <option value="trimestriel">Trimestriel</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Prime TTC (€) *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={contractForm.premium_ttc}
                          onChange={(e) => setContractForm({ ...contractForm, premium_ttc: e.target.value })}
                          placeholder="0.00"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Prime HT (€)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={contractForm.premium_ht}
                          onChange={(e) => setContractForm({ ...contractForm, premium_ht: e.target.value })}
                          placeholder="0.00"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date d'effet *</label>
                        <input
                          type="date"
                          value={contractForm.effective_date}
                          onChange={(e) => setContractForm({ ...contractForm, effective_date: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date de renouvellement *</label>
                        <input
                          type="date"
                          value={contractForm.renewal_date}
                          onChange={(e) => setContractForm({ ...contractForm, renewal_date: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Franchise (€)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={contractForm.franchise_amount}
                          onChange={(e) => setContractForm({ ...contractForm, franchise_amount: e.target.value })}
                          placeholder="0.00"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Garanties principales</label>
                        <textarea
                          value={contractForm.main_guarantees}
                          onChange={(e) => setContractForm({ ...contractForm, main_guarantees: e.target.value })}
                          rows={2}
                          placeholder="RC, Vol, Incendie, Bris de glaces..."
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm resize-none"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes internes</label>
                        <textarea
                          value={contractForm.internal_notes}
                          onChange={(e) => setContractForm({ ...contractForm, internal_notes: e.target.value })}
                          rows={2}
                          placeholder="Notes de suivi, conditions particulières..."
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                    <button
                      onClick={() => { setShowContractForm(false); setContractError(null); }}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium text-sm"
                      disabled={savingContract}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={saveContract}
                      disabled={savingContract}
                      className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg transition-colors font-semibold text-sm disabled:opacity-50"
                    >
                      {savingContract ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {editingContractId ? 'Mettre à jour' : 'Créer le contrat'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {contracts.length === 0 && crmDocs.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <FileText className="mx-auto mb-3 text-gray-300" size={56} />
                <p className="text-gray-700 font-semibold text-lg mb-1">Aucun contrat</p>
                <p className="text-gray-500 text-sm mb-4">Créez le premier contrat pour ce client</p>
                <button
                  onClick={openNewContractForm}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg transition-colors text-sm font-semibold"
                >
                  <Plus size={16} />
                  Ajouter un contrat
                </button>
              </div>
            ) : contracts.length === 0 && crmDocs.length > 0 ? (
              <div>
                <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 flex items-center gap-2">
                  <FolderOpen size={16} />
                  Documents transmis pendant le suivi commercial — créez un contrat pour formaliser.
                </div>
                <div className="space-y-3">
                  {crmDocs.map(doc => (
                    <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-yellow-300 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-gray-100 rounded-lg shrink-0">
                          <FileText size={18} className="text-gray-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{doc.file_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5 capitalize">{doc.document_type?.replace(/_/g, ' ')} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${doc.status === 'validated' ? 'bg-green-100 text-green-700' : doc.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                          {doc.status === 'validated' ? 'Validé' : doc.status === 'pending' ? 'En attente' : doc.status}
                        </span>
                        {doc.file_url && (
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Eye size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <button
                    onClick={openNewContractForm}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg transition-colors text-sm font-semibold"
                  >
                    <Plus size={16} />
                    Formaliser un contrat
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {contracts.map(contract => (
                  <div
                    key={contract.id}
                    className="bg-white border border-gray-200 rounded-xl p-6 hover:border-yellow-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1.5">
                          <h3 className="text-lg font-bold text-gray-900">
                            {getContractTypeLabel(contract.contract_type)}
                          </h3>
                          <span className={getStatusBadge(contract.status)}>
                            {contract.status === 'active' ? 'Actif' : contract.status === 'quote' ? 'Devis' : contract.status === 'suspended' ? 'Suspendu' : 'Résilié'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {contract.insurer_name}{contract.contract_number ? ` • ${contract.contract_number}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-yellow-600">
                          {contract.premium_ttc?.toFixed(2)} €
                        </p>
                        <p className="text-sm text-gray-500 capitalize">{contract.payment_frequency}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Date effet</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(contract.effective_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Renouvellement</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(contract.renewal_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Créé le</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(contract.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditContractForm(contract)}
                          className="flex items-center gap-1 px-3 py-1.5 text-yellow-700 hover:bg-yellow-50 border border-yellow-200 rounded-lg transition-colors text-xs font-medium"
                        >
                          <Edit size={14} />
                          Modifier
                        </button>
                        <button
                          onClick={() => deleteContract(contract.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
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
              <button
                onClick={openNewClaimForm}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg transition-colors font-semibold"
              >
                <Plus size={18} />
                Déclarer un sinistre
              </button>
            </div>

            {/* Claim form modal */}
            {showClaimForm && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900">
                      {editingClaimId ? 'Modifier le sinistre' : 'Déclarer un sinistre'}
                    </h3>
                    <button
                      onClick={() => { setShowClaimForm(false); setClaimError(null); }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-6 space-y-5">
                    {claimError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                        {claimError}
                      </div>
                    )}

                    {contracts.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <label className="block text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                          <FileText size={15} />
                          Contrat concerné
                        </label>
                        <select
                          value={claimForm.contract_id}
                          onChange={(e) => setClaimForm({ ...claimForm, contract_id: e.target.value })}
                          className="w-full px-3 py-2.5 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white text-sm"
                        >
                          <option value="">-- Aucun contrat associé --</option>
                          {contracts.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.insurer_name}
                              {c.contract_number ? ` — N° ${c.contract_number}` : ''}
                              {` (${getContractTypeLabel(c.contract_type)})`}
                              {` — ${c.status === 'active' ? 'Actif' : c.status}`}
                            </option>
                          ))}
                        </select>
                        {claimForm.contract_id && (() => {
                          const selected = contracts.find(c => c.id === claimForm.contract_id);
                          return selected ? (
                            <p className="mt-2 text-xs text-yellow-600">
                              Prime : <strong>{selected.premium_ttc.toFixed(2)} €</strong> / {selected.payment_frequency} — Renouvellement : {new Date(selected.renewal_date).toLocaleDateString('fr-FR')}
                            </p>
                          ) : null;
                        })()}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type de sinistre *</label>
                        <select
                          value={claimForm.claim_type}
                          onChange={(e) => setClaimForm({ ...claimForm, claim_type: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white text-sm"
                        >
                          <option value="accident">Accident</option>
                          <option value="vol">Vol</option>
                          <option value="incendie">Incendie</option>
                          <option value="bris_de_glace">Bris de glace</option>
                          <option value="catastrophe_naturelle">Catastrophe naturelle</option>
                          <option value="vandalisme">Vandalisme</option>
                          <option value="autre">Autre</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Statut</label>
                        <select
                          value={claimForm.status}
                          onChange={(e) => setClaimForm({ ...claimForm, status: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white text-sm"
                        >
                          <option value="declared">Déclaré</option>
                          <option value="in_progress">En cours</option>
                          <option value="expertise">En expertise</option>
                          <option value="closed">Clôturé</option>
                          <option value="refused">Refusé</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date du sinistre *</label>
                        <input
                          type="date"
                          value={claimForm.claim_date}
                          onChange={(e) => setClaimForm({ ...claimForm, claim_date: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Lieu du sinistre</label>
                        <input
                          type="text"
                          value={claimForm.location}
                          onChange={(e) => setClaimForm({ ...claimForm, location: e.target.value })}
                          placeholder="Ex: Paris 12ème, Autoroute A6..."
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Immatriculation du véhicule</label>
                        <input
                          type="text"
                          value={claimForm.vehicle_plate}
                          onChange={(e) => setClaimForm({ ...claimForm, vehicle_plate: e.target.value.toUpperCase() })}
                          placeholder="Ex: AB-123-CD"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">N° sinistre assureur</label>
                        <input
                          type="text"
                          value={claimForm.insurer_claim_number}
                          onChange={(e) => setClaimForm({ ...claimForm, insurer_claim_number: e.target.value })}
                          placeholder="Numéro fourni par l'assureur"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Montant estimé (€)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={claimForm.estimated_amount}
                          onChange={(e) => setClaimForm({ ...claimForm, estimated_amount: e.target.value })}
                          placeholder="0.00"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Circonstances *</label>
                        <textarea
                          value={claimForm.circumstances}
                          onChange={(e) => setClaimForm({ ...claimForm, circumstances: e.target.value })}
                          rows={3}
                          placeholder="Décrivez les circonstances du sinistre..."
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm resize-none"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes internes</label>
                        <textarea
                          value={claimForm.internal_notes}
                          onChange={(e) => setClaimForm({ ...claimForm, internal_notes: e.target.value })}
                          rows={2}
                          placeholder="Notes de suivi interne..."
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                    <button
                      onClick={() => { setShowClaimForm(false); setClaimError(null); }}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium text-sm"
                      disabled={savingClaim}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={saveClaim}
                      disabled={savingClaim}
                      className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg transition-colors font-semibold text-sm disabled:opacity-50"
                    >
                      {savingClaim ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {editingClaimId ? 'Mettre à jour' : 'Déclarer le sinistre'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {claims.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <AlertCircle className="mx-auto mb-3 text-gray-300" size={56} />
                <p className="text-gray-700 font-semibold text-lg mb-1">Aucun sinistre déclaré</p>
                <p className="text-gray-500 text-sm mb-4">Déclarez le premier sinistre pour ce client</p>
                <button
                  onClick={openNewClaimForm}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg transition-colors text-sm font-semibold"
                >
                  <Plus size={16} />
                  Déclarer un sinistre
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {claims.map(claim => (
                  <div
                    key={claim.id}
                    className="bg-white border border-gray-200 rounded-xl p-6 hover:border-yellow-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 rounded-lg">
                          <AlertTriangle size={20} className="text-orange-500" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-gray-900">
                            {getClaimTypeLabel(claim.claim_type)}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {new Date(claim.claim_date).toLocaleDateString('fr-FR')}
                            {claim.insurer_claim_number && ` • N° ${claim.insurer_claim_number}`}
                            {(claim as any).contract_id && (() => {
                              const c = contracts.find(ct => ct.id === (claim as any).contract_id);
                              return c ? <span className="ml-1 inline-flex items-center gap-1 text-yellow-600 font-medium"><FileText size={10} />{c.insurer_name}{c.contract_number ? ' N° ' + c.contract_number : ''}</span> : null;
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={getClaimStatusBadge(claim.status)}>
                          {getClaimStatusLabel(claim.status)}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4 leading-relaxed">{claim.circumstances}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        {claim.estimated_amount && (
                          <span className="text-gray-600">
                            Montant estimé : <span className="font-semibold text-gray-900">{claim.estimated_amount.toFixed(2)} €</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditClaimForm(claim)}
                          className="flex items-center gap-1 px-3 py-1.5 text-yellow-700 hover:bg-yellow-50 border border-yellow-200 rounded-lg transition-colors text-xs font-medium"
                        >
                          <Edit size={14} />
                          Modifier
                        </button>
                        <button
                          onClick={() => deleteClaim(claim.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg transition-colors font-semibold">
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
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-yellow-300 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-yellow-500 rounded border-gray-300 focus:ring-yellow-500"
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

        {activeTab === 'documents' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Documents</h2>
            <DocumentsViewer leadId={leadId} />
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
