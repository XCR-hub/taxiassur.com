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
  MessageSquare,
  Bell,
  MapPin,
  Car,
  Calendar
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

interface RecentInteraction {
  id: string;
  type: 'email' | 'sms' | 'whatsapp' | 'call' | 'note';
  direction: 'inbound' | 'outbound';
  content: string;
  subject?: string;
  created_at: string;
  author?: string;
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
  const [recentInteractions, setRecentInteractions] = useState<RecentInteraction[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);

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
    loadRecentInteractions();
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

  const loadRecentInteractions = async () => {
    setLoadingInteractions(true);
    try {
      // Charger les emails
      const { data: emails } = await supabase
        .from('email_messages')
        .select('*')
        .eq('lead_id', lead.id)
        .order('sent_at', { ascending: false })
        .limit(3);

      // Charger les interactions CRM
      const { data: interactions } = await supabase
        .from('crm_interactions')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(3);

      // Charger la timeline
      const { data: timeline } = await supabase
        .from('crm_lead_timeline')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(3);

      const allInteractions: RecentInteraction[] = [];

      // Ajouter les emails
      if (emails) {
        emails.forEach(email => {
          allInteractions.push({
            id: email.id,
            type: 'email',
            direction: email.direction || 'outbound',
            content: email.content || email.body || '',
            subject: email.subject,
            created_at: email.sent_at,
            author: email.sent_by
          });
        });
      }

      // Ajouter les interactions
      if (interactions) {
        interactions.forEach(int => {
          allInteractions.push({
            id: int.id,
            type: int.type === 'phone_call' ? 'call' : int.type === 'sms' ? 'sms' : 'note',
            direction: 'outbound',
            content: int.notes || int.content || '',
            created_at: int.created_at,
            author: int.created_by
          });
        });
      }

      // Ajouter la timeline
      if (timeline) {
        timeline.forEach(item => {
          allInteractions.push({
            id: item.id,
            type: 'note',
            direction: 'outbound',
            content: item.description || item.content || '',
            created_at: item.created_at
          });
        });
      }

      // Trier par date et garder les 5 plus récents
      allInteractions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentInteractions(allInteractions.slice(0, 5));

    } catch (error) {
      console.error('Error loading interactions:', error);
    } finally {
      setLoadingInteractions(false);
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
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-amber-600 bg-amber-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEngagementLabel = () => {
    switch (stats.engagementLevel) {
      case 'high': return 'Élevé';
      case 'medium': return 'Modéré';
      case 'low': return 'Faible';
      default: return 'Non mesuré';
    }
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'email': return Mail;
      case 'sms': return MessageSquare;
      case 'whatsapp': return MessageSquare;
      case 'call': return Phone;
      default: return Bell;
    }
  };

  const getInteractionColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-600';
      case 'sms': return 'bg-green-100 text-green-600';
      case 'whatsapp': return 'bg-emerald-100 text-emerald-600';
      case 'call': return 'bg-orange-100 text-orange-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* KPIs Animés - Ligne 1 */}
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
          value={stats.documentsMissing === 0 ? 100 : ((8 - stats.documentsMissing) / 8) * 100}
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

      {/* Grille principale - 3 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Colonne 1 : Infos Lead + Progression (40%) */}
        <div className="lg:col-span-1 space-y-4">
          {/* Informations du Lead - Compact */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Informations
              </h3>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4 text-blue-600" />
                </button>
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={handleSaveClick}
                    disabled={saving}
                    className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="p-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  placeholder="Prénom"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  placeholder="Nom"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="Email"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="Téléphone"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="Ville"
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={editForm.immatriculation}
                    onChange={(e) => setEditForm({ ...editForm, immatriculation: e.target.value })}
                    placeholder="Immat."
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500">Nom</span>
                  <span className="font-medium text-gray-900">
                    {lead.first_name} {lead.last_name}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500">Email</span>
                  <button
                    onClick={() => onActionTrigger('send_email')}
                    className="font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {lead.email}
                    <Mail className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500">Tel</span>
                  <button
                    onClick={() => onActionTrigger('call')}
                    className="font-medium text-green-600 hover:text-green-700 flex items-center gap-1"
                  >
                    {lead.phone}
                    <Phone className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Ville
                  </span>
                  <span className="font-medium text-gray-900">{lead.city || '-'}</span>
                </div>
                {lead.immatriculation && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Car className="w-3 h-3" /> Immat.
                    </span>
                    <span className="font-medium text-gray-900">{lead.immatriculation}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Progression Pipeline - Compact */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-sm border border-blue-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h3 className="text-base font-bold text-gray-900">Progression</h3>
              <span className="ml-auto text-xs font-medium text-blue-600">
                {Math.round(getPipelineProgress())}%
              </span>
            </div>

            <div className="relative mb-3">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-1000"
                  style={{ width: `${getPipelineProgress()}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-lg p-2 border border-blue-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-blue-600 flex-shrink-0" />
                <p className="text-xs text-gray-700 leading-relaxed">
                  {getNextStep()}
                </p>
              </div>
            </div>
          </div>

          {/* Documents Status - Compact */}
          <div className={cn(
            "rounded-xl shadow-sm border p-4",
            stats.documentsComplete
              ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
              : "bg-gradient-to-br from-red-50 to-pink-50 border-red-200"
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {stats.documentsComplete ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <h3 className="text-base font-bold text-gray-900">Documents</h3>
              </div>
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                stats.documentsComplete ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}>
                {stats.documentsComplete ? 'Complet' : `${stats.documentsMissing} manquant(s)`}
              </span>
            </div>

            {!stats.documentsComplete && (
              <button
                onClick={() => onActionTrigger('request_documents')}
                className="w-full mt-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
              >
                Demander les documents
              </button>
            )}
          </div>
        </div>

        {/* Colonne 2 : Intelligence + Actions IA (30%) */}
        <div className="space-y-4">
          {/* Intelligence Lead - Compact */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-sm border border-purple-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="text-base font-bold text-gray-900">Intelligence Lead</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Conversion</span>
                <span className="text-base font-bold text-purple-600">
                  {stats.conversionProbability}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Engagement</span>
                <span className={cn("text-xs font-medium px-2 py-1 rounded-full", getEngagementColor())}>
                  {getEngagementLabel()}
                </span>
              </div>

              {lead.last_contact_at && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Dernier contact
                  </span>
                  <span className="text-xs font-medium text-gray-900">
                    {new Date(lead.last_contact_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              )}

              {stats.daysInPipeline > 7 && (
                <div className="mt-2 p-2 bg-amber-100 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700 font-medium">
                    ⚠️ Lead actif depuis {stats.daysInPipeline} jours
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions IA - Compact */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-600" />
              <h3 className="text-base font-bold text-gray-900">Actions IA</h3>
            </div>

            {loadingSuggestions ? (
              <div className="text-center py-3">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600" />
              </div>
            ) : aiSuggestions.length > 0 ? (
              <div className="space-y-2">
                {aiSuggestions.slice(0, 3).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => onActionTrigger(suggestion.decision_type)}
                    className="w-full text-left p-2 bg-white rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <Bell className="w-3 h-3 text-amber-600" />
                      <span className="text-xs font-medium text-gray-900 flex-1 line-clamp-1">
                        {suggestion.title || suggestion.decision_type}
                      </span>
                      <ArrowRight className="w-3 h-3 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-xs text-gray-500">Aucune action suggérée</p>
              </div>
            )}
          </div>
        </div>

        {/* Colonne 3 : Timeline Interactions (30%) */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                Timeline Échanges
              </h3>
              <span className="text-xs font-medium text-gray-500">
                {stats.interactionsCount} interaction(s)
              </span>
            </div>

            {loadingInteractions ? (
              <div className="text-center py-6">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : recentInteractions.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recentInteractions.map((interaction) => {
                  const Icon = getInteractionIcon(interaction.type);
                  return (
                    <div
                      key={interaction.id}
                      className="p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <div className={cn("p-1.5 rounded-lg flex-shrink-0", getInteractionColor(interaction.type))}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-medium text-gray-900 capitalize">
                              {interaction.type}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(interaction.created_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {interaction.subject && (
                            <p className="text-xs font-medium text-gray-700 mb-0.5 truncate">
                              {interaction.subject}
                            </p>
                          )}
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {interaction.content || 'Aucun contenu'}
                          </p>
                          {interaction.author && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Par {interaction.author}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-xs text-gray-500">Aucune interaction encore</p>
                <p className="text-xs text-gray-400 mt-1">
                  Commencez par envoyer un email ou appeler
                </p>
              </div>
            )}

            {recentInteractions.length > 0 && (
              <button
                onClick={() => onActionTrigger('view_all_history')}
                className="w-full mt-3 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
              >
                Voir tout l'historique ({stats.interactionsCount})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
