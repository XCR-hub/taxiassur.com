import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Edit,
  Save,
  X,
  Target,
  TrendingUp,
  Clock,
  FileCheck,
  AlertCircle,
  CheckCircle,
  Zap,
  Sparkles,
  ArrowRight,
  Calendar,
  MessageSquare,
  Bell
} from 'lucide-react';
import AnimatedStatCard from '@/components/AnimatedStatCard';
import ContextualTooltip from '@/components/ContextualTooltip';
import { supabase } from '@/lib/supabase';
import { PIPELINE_STATUSES, PipelineStatus } from '@/lib/crm-pipeline';
import { cn } from '@/lib/utils';

interface LeadData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  status: PipelineStatus;
  quality_score: number;
  created_at: string;
  last_contact_at?: string;
  immatriculation?: string;
  internal_notes?: string;
}

interface LeadStats {
  documentsComplete: boolean;
  documentsMissing: number;
  quotesCount: number;
  interactionsCount: number;
  daysInPipeline: number;
  conversionProbability: number;
  engagementLevel: 'low' | 'medium' | 'high';
}

interface LeadOverviewEnhancedProps {
  lead: LeadData;
  stats: LeadStats;
  onEdit: () => void;
  onSave: (updatedData: Partial<LeadData>) => Promise<void>;
  onActionTrigger: (action: string) => void;
}

export default function LeadOverviewEnhanced({
  lead,
  stats,
  onEdit,
  onSave,
  onActionTrigger
}: LeadOverviewEnhancedProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [editForm, setEditForm] = useState({
    first_name: lead.first_name || '',
    last_name: lead.last_name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    city: lead.city || '',
    immatriculation: lead.immatriculation || '',
    internal_notes: lead.internal_notes || ''
  });

  useEffect(() => {
    loadAISuggestions();
  }, [lead.id, lead.status]);

  const loadAISuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase
        .from('crm_ai_decisions')
        .select('*')
        .eq('lead_id', lead.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(3);

      if (data && !error) {
        setAiSuggestions(data);
      }
    } catch (error) {
      console.error('Error loading AI suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSaveClick = async () => {
    setSaving(true);
    try {
      await onSave(editForm);
      setEditing(false);
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  const getPipelineProgress = () => {
    const statuses = Object.keys(PIPELINE_STATUSES);
    const currentIndex = statuses.indexOf(lead.status);
    return ((currentIndex + 1) / statuses.length) * 100;
  };

  const getNextStep = () => {
    const recommendations: Record<PipelineStatus, string> = {
      NOUVEAU_LEAD: 'Établir le premier contact',
      CONTACTED: 'Demander les documents',
      COLLECTE_DOCUMENTS: 'Valider les documents reçus',
      DOCUMENTS_RECEIVED: 'Demander les devis aux compagnies',
      DEVIS_EN_COURS: 'Envoyer les devis au prospect',
      DEVIS_ENVOYE: 'Relancer pour signature',
      CONTRACT_SENT: 'Demander le versement comptant',
      DOWN_PAYMENT_REQUIRED: 'Confirmer le paiement comptant',
      SOUSCRIPTION_EN_COURS: 'Finaliser la souscription',
      CLIENT_ACTIF: 'Assurer le suivi régulier'
    };

    return recommendations[lead.status as PipelineStatus] || 'Poursuivre le workflow';
  };

  const getEngagementColor = () => {
    switch (stats.engagementLevel) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-amber-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getEngagementLabel = () => {
    switch (stats.engagementLevel) {
      case 'high': return 'Très engagé';
      case 'medium': return 'Modéré';
      case 'low': return 'Faible';
      default: return 'Non mesuré';
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs Animés */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStatCard
          title="Score de Conversion"
          value={stats.conversionProbability}
          icon={Target}
          color="blue"
          suffix="%"
          trend={{
            value: 12,
            label: "vs semaine dernière",
            direction: "up"
          }}
          animationDuration={1200}
        />

        <AnimatedStatCard
          title="Documents"
          value={stats.documentsMissing === 0 ? 100 : ((10 - stats.documentsMissing) / 10) * 100}
          icon={FileCheck}
          color={stats.documentsComplete ? "green" : "amber"}
          suffix="%"
          decimals={0}
          animationDuration={1200}
        />

        <AnimatedStatCard
          title="Devis Envoyés"
          value={stats.quotesCount}
          icon={Mail}
          color="purple"
          trend={stats.quotesCount > 0 ? {
            value: 100,
            label: "Devis disponibles",
            direction: "up"
          } : undefined}
          animationDuration={1200}
        />

        <AnimatedStatCard
          title="Jours dans Pipeline"
          value={stats.daysInPipeline}
          icon={Clock}
          color={stats.daysInPipeline > 7 ? "red" : stats.daysInPipeline > 3 ? "amber" : "green"}
          animationDuration={1200}
        />
      </div>

      {/* Progression dans le Pipeline */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-sm border border-blue-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Progression dans le Pipeline</h3>
              <p className="text-sm text-gray-600">
                {PIPELINE_STATUSES[lead.status as PipelineStatus]?.label || lead.status}
              </p>
            </div>
          </div>
          <ContextualTooltip
            content="Visualisation de la progression du lead dans le tunnel de vente"
            type="info"
            position="left"
          />
        </div>

        {/* Barre de progression */}
        <div className="relative">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${getPipelineProgress()}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Début</span>
            <span className="font-medium text-blue-600">{Math.round(getPipelineProgress())}%</span>
            <span>Client Actif</span>
          </div>
        </div>

        {/* Prochaine étape */}
        <div className="mt-4 flex items-center gap-2 p-3 bg-white rounded-lg border border-blue-200">
          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Prochaine étape suggérée</p>
            <p className="text-sm text-gray-600">{getNextStep()}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : Informations du Lead */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Informations du Lead
              </h2>
              {!editing ? (
                <ContextualTooltip content="Modifier les informations" type="help">
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Modifier
                  </button>
                </ContextualTooltip>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveClick}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Immatriculation</label>
                  <input
                    type="text"
                    value={editForm.immatriculation}
                    onChange={(e) => setEditForm({ ...editForm, immatriculation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="AA-123-BB"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes internes</label>
                  <textarea
                    value={editForm.internal_notes}
                    onChange={(e) => setEditForm({ ...editForm, internal_notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Notes pour l'équipe..."
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Prénom</div>
                  <div className="font-medium text-gray-900">{lead.first_name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Nom</div>
                  <div className="font-medium text-gray-900">{lead.last_name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Email</div>
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    {lead.email}
                    <ContextualTooltip content="Cliquez pour envoyer un email" type="tip">
                      <button
                        onClick={() => onActionTrigger('send_email')}
                        className="p-1 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Mail className="w-4 h-4 text-blue-600" />
                      </button>
                    </ContextualTooltip>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Téléphone</div>
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    {lead.phone}
                    <ContextualTooltip content="Cliquez pour appeler" type="tip">
                      <button
                        onClick={() => onActionTrigger('call')}
                        className="p-1 hover:bg-green-50 rounded transition-colors"
                      >
                        <Phone className="w-4 h-4 text-green-600" />
                      </button>
                    </ContextualTooltip>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Ville</div>
                  <div className="font-medium text-gray-900">{lead.city || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Immatriculation</div>
                  <div className="font-medium text-gray-900">{lead.immatriculation || '-'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-gray-500 mb-1">Notes internes</div>
                  <div className="font-medium text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                    {lead.internal_notes || 'Aucune note'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite : Intelligence & Actions */}
        <div className="space-y-4">
          {/* Intelligence Lead */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-sm border border-purple-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-900">Intelligence Lead</h3>
            </div>

            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 border border-purple-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Niveau d'engagement</span>
                  <ContextualTooltip
                    content="Basé sur le nombre d'interactions et la réactivité"
                    type="info"
                    position="left"
                  />
                </div>
                <div className={cn("text-lg font-bold", getEngagementColor())}>
                  {getEngagementLabel()}
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 border border-purple-100">
                <div className="text-sm text-gray-600 mb-1">Dernier contact</div>
                <div className="text-sm font-medium text-gray-900">
                  {lead.last_contact_at
                    ? new Date(lead.last_contact_at).toLocaleDateString('fr-FR')
                    : 'Jamais'}
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 border border-purple-100">
                <div className="text-sm text-gray-600 mb-1">Interactions totales</div>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.interactionsCount}
                </div>
              </div>
            </div>
          </div>

          {/* Actions Recommandées par IA */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-bold text-gray-900">Actions IA</h3>
              </div>
              <ContextualTooltip
                content="Suggestions automatiques basées sur l'analyse du lead"
                type="tip"
                position="left"
              />
            </div>

            {loadingSuggestions ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600" />
              </div>
            ) : aiSuggestions.length > 0 ? (
              <div className="space-y-2">
                {aiSuggestions.slice(0, 3).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => onActionTrigger(suggestion.decision_type)}
                    className="w-full text-left p-3 bg-white rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-gray-900 flex-1">
                        {suggestion.title || suggestion.decision_type}
                      </span>
                      <ArrowRight className="w-4 h-4 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">Aucune action suggérée pour le moment</p>
              </div>
            )}
          </div>

          {/* Statut Documents */}
          <div className={cn(
            "rounded-xl shadow-sm border p-6",
            stats.documentsComplete
              ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
              : "bg-gradient-to-br from-red-50 to-pink-50 border-red-200"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {stats.documentsComplete ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <h3 className="text-lg font-bold text-gray-900">Documents</h3>
              </div>
            </div>

            {stats.documentsComplete ? (
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <p className="text-sm font-medium text-green-700">
                  ✓ Tous les documents sont complets
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-white rounded-lg p-3 border border-red-200">
                  <p className="text-sm font-medium text-red-700">
                    {stats.documentsMissing} document(s) manquant(s)
                  </p>
                </div>
                <ContextualTooltip content="Envoyer une demande de documents automatique" type="tip">
                  <button
                    onClick={() => onActionTrigger('request_documents')}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Demander les documents
                  </button>
                </ContextualTooltip>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
