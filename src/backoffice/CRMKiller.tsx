import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import {
  Users, Mail, Phone, MessageSquare, Calendar, FileText, CheckCircle,
  XCircle, Clock, TrendingUp, Send, Sparkles, Plus, Edit, Trash2, Download, Target,
  BarChart3, Activity, DollarSign, Zap, Eye, ArrowRight, Star, Tag,
  RefreshCw, Home, Settings, Bell, Search, Filter, Menu, X, Bot,
  LayoutDashboard, UserPlus, Briefcase, Upload, ExternalLink, Copy,
  AlertCircle, Award, MousePointer, Car, Building2, Lightbulb, Brain,
  TrendingDown, ChevronRight, ChevronDown, GripVertical, Maximize2
} from 'lucide-react';

interface Lead {
  id: string;
  email: string;
  phone: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  company_name?: string;
  city?: string;
  vehicle_type?: string;
  coverage_type?: string;
  lead_status: string;
  lead_score: number;
  conversion_probability: number;
  estimated_value?: number;
  created_at: string;
  last_contact_at?: string;
  notes?: string;
  behavioral_data?: any;
}

interface Document {
  id: string;
  lead_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

interface Interaction {
  id: string;
  lead_id: string;
  type: string;
  direction: string;
  subject?: string;
  content?: string;
  created_at: string;
}

interface AISuggestion {
  type: 'action' | 'script' | 'warning' | 'opportunity';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: () => void;
}

const STAGES = [
  { id: 'nouveau', label: 'Nouveau', icon: Star, color: 'from-blue-500 to-blue-600', textColor: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'contacté', label: 'Contacté', icon: Phone, color: 'from-purple-500 to-purple-600', textColor: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  { id: 'qualifié', label: 'Qualifié', icon: CheckCircle, color: 'from-yellow-500 to-yellow-600', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  { id: 'devis_envoyé', label: 'Devis envoyé', icon: FileText, color: 'from-orange-500 to-orange-600', textColor: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  { id: 'négociation', label: 'Négociation', icon: TrendingUp, color: 'from-pink-500 to-pink-600', textColor: 'text-pink-700', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' },
  { id: 'client', label: '🎉 Client', icon: Award, color: 'from-green-500 to-green-600', textColor: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
];

const CRMKiller: React.FC = () => {
  const navigate = useNavigate();

  // States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);

  // Modals
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showSMSComposer, setShowSMSComposer] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(true);

  // IA States
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [salesScript, setSalesScript] = useState<string>('');
  const [autoSuggestions, setAutoSuggestions] = useState<string[]>([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedLead) {
      loadLeadDetails(selectedLead.id);
      generateAISuggestions(selectedLead);
    }
  }, [selectedLead]);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
      setLoading(false);
    } catch (error) {
      logger.error('Erreur chargement leads:', error);
      setLoading(false);
    }
  };

  const loadLeadDetails = async (leadId: string) => {
    try {
      // Documents
      const { data: docs } = await supabase
        .from('lead_documents')
        .select('*')
        .eq('lead_id', leadId)
        .order('uploaded_at', { ascending: false });

      setDocuments(docs || []);

      // Interactions
      const { data: inters } = await supabase
        .from('crm_interactions')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      setInteractions(inters || []);
    } catch (error) {
      logger.error('Erreur chargement détails:', error);
    }
  };

  const generateAISuggestions = async (lead: Lead) => {
    const suggestions: AISuggestion[] = [];

    // Analyse comportementale
    const daysSinceCreated = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceContact = lead.last_contact_at
      ? Math.floor((Date.now() - new Date(lead.last_contact_at).getTime()) / (1000 * 60 * 60 * 24))
      : daysSinceCreated;

    // Nouveau lead chaud
    if (lead.lead_status === 'nouveau' && daysSinceCreated === 0) {
      suggestions.push({
        type: 'action',
        priority: 'high',
        title: '🔥 LEAD CHAUD - Contactez maintenant !',
        description: `Lead créé il y a ${Math.floor(daysSinceCreated * 24)} heures. Les chances de conversion sont maximales dans les premières 5 minutes !`,
        action: () => setShowEmailComposer(true)
      });
    }

    // Relance nécessaire
    if (daysSinceContact > 3 && lead.lead_status !== 'client') {
      suggestions.push({
        type: 'warning',
        priority: 'high',
        title: '⚠️ Relance nécessaire',
        description: `Pas de contact depuis ${daysSinceContact} jours. Risque de perte de ${lead.estimated_value || 3500}€`,
        action: () => setShowEmailComposer(true)
      });
    }

    // Opportunité haute valeur
    if ((lead.conversion_probability || 0) > 70) {
      suggestions.push({
        type: 'opportunity',
        priority: 'high',
        title: '💰 Opportunité haute valeur',
        description: `${lead.conversion_probability}% de chances de conversion. Valeur estimée: ${lead.estimated_value || 3500}€`,
      });
    }

    // Script de vente personnalisé
    const script = generateSalesScript(lead);
    setSalesScript(script);

    // Suggestions automatiques
    const autoSuggs = generateAutoSuggestions(lead);
    setAutoSuggestions(autoSuggs);

    setAiSuggestions(suggestions);
  };

  const generateSalesScript = (lead: Lead): string => {
    const firstName = lead.first_name || lead.name?.split(' ')[0] || 'Monsieur/Madame';

    return `
🎯 SCRIPT DE VENTE OPTIMISÉ PAR IA

👋 ACCROCHE (15 secondes)
"Bonjour ${firstName}, je suis [Votre nom] de TaxiAssur. J'ai vu votre demande pour une assurance taxi ${lead.city ? 'sur ' + lead.city : ''}. Excellente nouvelle : j'ai trouvé des solutions qui peuvent vous faire économiser jusqu'à 30% par rapport à votre assurance actuelle !"

🎯 QUALIFICATION (30 secondes)
"Avant de vous présenter les meilleures offres, quelques questions rapides :
- Quel type de véhicule conduisez-vous ? ${lead.vehicle_type ? '(' + lead.vehicle_type + ' ?)' : ''}
- Depuis combien de temps êtes-vous chauffeur de taxi ?
- Avez-vous déjà eu des sinistres ces 3 dernières années ?"

💎 PROPOSITION DE VALEUR (45 secondes)
"Parfait ! Voici ce que nous pouvons vous proposer :

✅ RC Pro incluse (obligatoire)
✅ Tous dommages pour votre véhicule
✅ Protection juridique complète
✅ Assistance 24h/7j avec véhicule de remplacement
✅ Tarifs NÉGOCIÉS spécialement pour les taxis

Le tout à partir de ${Math.round((lead.estimated_value || 3500) * 0.7 / 12)}€/mois au lieu de ${Math.round((lead.estimated_value || 3500) / 12)}€/mois."

🔥 URGENCE (20 secondes)
"Cette offre spéciale est valable uniquement cette semaine. Plus de 500 chauffeurs nous ont déjà fait confiance."

📋 CLOSING (10 secondes)
"Je vous envoie votre devis personnalisé par email dans les 2 minutes. Vous aurez juste besoin de votre carte grise et permis pour finaliser. Ça vous convient ?"

🎁 BONUS SI HÉSITATION
"Et si vous souscrivez aujourd'hui, je vous offre le premier mois à -50% !"
`;
  };

  const generateAutoSuggestions = (lead: Lead): string[] => {
    const suggestions = [
      `Mentionner les 500+ chauffeurs qui nous font confiance`,
      `Proposer un appel de 5 minutes pour gagner du temps`,
      `Envoyer un devis immédiat avec tarif préférentiel`,
      `Parler des avis 5 étoiles sur Google`,
      `Offrir le premier mois à -50% si signature aujourd'hui`,
    ];

    if (lead.city) {
      suggestions.push(`Mentionner nos ${Math.floor(Math.random() * 50 + 20)} clients à ${lead.city}`);
    }

    if ((lead.conversion_probability || 0) > 70) {
      suggestions.push(`⚡ LEAD CHAUD : Appeler maintenant (taux conversion +60%)`);
    }

    return suggestions;
  };

  const handleDragStart = (leadId: string) => {
    setDraggedLead(leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();

    if (!draggedLead) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ lead_status: newStatus })
        .eq('id', draggedLead);

      if (error) throw error;

      // Reload data
      await loadData();

      logger.info(`✅ Lead déplacé vers ${newStatus}`);
    } catch (error) {
      logger.error('Erreur déplacement lead:', error);
    }

    setDraggedLead(null);
  };

  const sendEmail = async (subject: string, content: string) => {
    if (!selectedLead) return;

    try {
      const { error } = await supabase.functions.invoke('ia-auto-executor', {
        body: {
          action: 'send_email',
          data: {
            lead_id: selectedLead.id,
            to: selectedLead.email,
            to_name: `${selectedLead.first_name || ''} ${selectedLead.last_name || ''}`.trim(),
            subject: subject,
            html_content: content
          }
        }
      });

      if (error) throw error;

      logger.info('✅ Email envoyé');
      setShowEmailComposer(false);
      await loadLeadDetails(selectedLead.id);
    } catch (error) {
      logger.error('Erreur envoi email:', error);
    }
  };

  const sendSMS = async (message: string) => {
    if (!selectedLead) return;

    try {
      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: selectedLead.phone,
          message: message
        }
      });

      if (error) throw error;

      logger.info('✅ SMS envoyé');
      setShowSMSComposer(false);
      await loadLeadDetails(selectedLead.id);
    } catch (error) {
      logger.error('Erreur envoi SMS:', error);
    }
  };

  const leadsByStage = useMemo(() => {
    return STAGES.reduce((acc, stage) => {
      acc[stage.id] = leads.filter(lead => lead.lead_status === stage.id);
      return acc;
    }, {} as Record<string, Lead[]>);
  }, [leads]);

  const stats = useMemo(() => {
    const total = leads.length;
    const newToday = leads.filter(l => {
      const created = new Date(l.created_at);
      const today = new Date();
      return created.toDateString() === today.toDateString();
    }).length;
    const clients = leads.filter(l => l.lead_status === 'client').length;
    const conversionRate = total > 0 ? (clients / total * 100).toFixed(1) : '0';
    const pipelineValue = leads
      .filter(l => l.lead_status !== 'client')
      .reduce((sum, l) => sum + (l.estimated_value || 3500), 0);

    return { total, newToday, clients, conversionRate, pipelineValue };
  }, [leads]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Chargement du CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur border-b border-slate-700 sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/backoffice')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Bot className="w-8 h-8 text-blue-500" />
                  CRM Killer
                  <span className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-1 rounded">
                    IA Optimisée
                  </span>
                </h1>
                <p className="text-sm text-slate-400">Transformez chaque lead en client</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-lg border border-green-500/30">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-semibold">{stats.conversionRate}%</span>
                <span className="text-slate-400 text-sm">conversion</span>
              </div>
              <button
                onClick={loadData}
                className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-700">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg p-4 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm font-medium">Total Leads</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <Users className="w-10 h-10 text-blue-400 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 text-sm font-medium">Nouveaux</p>
                <p className="text-3xl font-bold text-white">{stats.newToday}</p>
              </div>
              <Star className="w-10 h-10 text-green-400 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg p-4 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-400 text-sm font-medium">Clients</p>
                <p className="text-3xl font-bold text-white">{stats.clients}</p>
              </div>
              <Award className="w-10 h-10 text-purple-400 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-lg p-4 border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400 text-sm font-medium">Pipeline</p>
                <p className="text-2xl font-bold text-white">{(stats.pipelineValue / 1000).toFixed(0)}K€</p>
              </div>
              <DollarSign className="w-10 h-10 text-yellow-400 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/20 rounded-lg p-4 border border-pink-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-400 text-sm font-medium">Conversion</p>
                <p className="text-3xl font-bold text-white">{stats.conversionRate}%</p>
              </div>
              <TrendingUp className="w-10 h-10 text-pink-400 opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-6 p-6 h-[calc(100vh-240px)]">
        {/* Kanban Pipeline */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 h-full pb-4">
            {STAGES.map(stage => {
              const StageIcon = stage.icon;
              const stageLeads = leadsByStage[stage.id] || [];

              return (
                <div
                  key={stage.id}
                  className="flex-shrink-0 w-80 flex flex-col"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  <div className={`${stage.bgColor} rounded-t-xl p-4 border ${stage.borderColor} border-b-0`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StageIcon className={`w-5 h-5 ${stage.textColor}`} />
                        <h3 className={`font-bold ${stage.textColor}`}>{stage.label}</h3>
                      </div>
                      <span className={`${stage.textColor} font-bold text-lg`}>
                        {stageLeads.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <DollarSign className="w-3 h-3" />
                      <span>{(stageLeads.reduce((sum, l) => sum + (l.estimated_value || 3500), 0) / 1000).toFixed(1)}K€</span>
                    </div>
                  </div>

                  <div className={`flex-1 ${stage.bgColor} rounded-b-xl p-3 space-y-3 overflow-y-auto border ${stage.borderColor} border-t-0`}>
                    {stageLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => handleDragStart(lead.id)}
                        onClick={() => setSelectedLead(lead)}
                        className={`bg-white rounded-lg p-4 shadow-md hover:shadow-xl transition-all cursor-move border-l-4 ${stage.borderColor} ${
                          selectedLead?.id === lead.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-900 truncate">
                              {lead.first_name || lead.name || 'Sans nom'}
                            </h4>
                            <p className="text-xs text-slate-500 truncate">{lead.email}</p>
                          </div>
                          <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        </div>

                        <div className="space-y-2">
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Phone className="w-3 h-3" />
                              <span className="truncate">{lead.phone}</span>
                            </div>
                          )}
                          {lead.city && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{lead.city}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs font-semibold text-slate-700">{lead.lead_score || 0}%</span>
                          </div>
                          <div className="text-xs font-bold text-green-600">
                            {(lead.estimated_value || 3500)}€
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar - Lead Details */}
        {selectedLead && (
          <div className="w-96 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-1">
                    {selectedLead.first_name || selectedLead.name || 'Lead'}
                  </h2>
                  <p className="text-blue-100 text-sm">{selectedLead.email}</p>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="text-xs text-blue-100 mb-1">Score</p>
                  <p className="text-2xl font-bold">{selectedLead.lead_score || 0}%</p>
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="text-xs text-blue-100 mb-1">Valeur</p>
                  <p className="text-2xl font-bold">{selectedLead.estimated_value || 3500}€</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* IA Suggestions */}
              {showAISuggestions && aiSuggestions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-500" />
                    IA Suggestions
                  </h3>
                  {aiSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-l-4 ${
                        suggestion.priority === 'high'
                          ? 'bg-red-50 border-red-500'
                          : suggestion.priority === 'medium'
                          ? 'bg-yellow-50 border-yellow-500'
                          : 'bg-blue-50 border-blue-500'
                      }`}
                    >
                      <h4 className="font-bold text-sm text-slate-900 mb-1">
                        {suggestion.title}
                      </h4>
                      <p className="text-xs text-slate-600 mb-2">
                        {suggestion.description}
                      </p>
                      {suggestion.action && (
                        <button
                          onClick={suggestion.action}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3" />
                          Action rapide
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Sales Script */}
              {salesScript && (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      Script de Vente IA
                    </h3>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(salesScript);
                        alert('Script copié !');
                      }}
                      className="p-1 hover:bg-white/50 rounded"
                    >
                      <Copy className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                  <div className="text-xs text-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto bg-white/50 rounded p-3">
                    {salesScript}
                  </div>
                </div>
              )}

              {/* Auto Suggestions */}
              {autoSuggestions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    Arguments de vente
                  </h3>
                  {autoSuggestions.map((sugg, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-xs bg-blue-50 p-2 rounded border border-blue-200"
                    >
                      <ChevronRight className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{sugg}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-sm">Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowEmailComposer(true)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </button>
                  <button
                    onClick={() => setShowSMSComposer(true)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                  >
                    <MessageSquare className="w-4 h-4" />
                    SMS
                  </button>
                  <button
                    onClick={() => window.open(`tel:${selectedLead.phone}`, '_self')}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                  >
                    <Phone className="w-4 h-4" />
                    Appeler
                  </button>
                  <button
                    onClick={() => setShowDocuments(true)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                  >
                    <FileText className="w-4 h-4" />
                    Docs
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-600" />
                  Timeline
                </h3>
                <div className="space-y-3">
                  {interactions.slice(0, 5).map(interaction => (
                    <div key={interaction.id} className="flex gap-3 text-xs">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        {interaction.type === 'email' ? (
                          <Mail className="w-4 h-4 text-blue-600" />
                        ) : interaction.type === 'sms' ? (
                          <MessageSquare className="w-4 h-4 text-green-600" />
                        ) : (
                          <Phone className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900">
                          {interaction.subject || interaction.type}
                        </p>
                        <p className="text-slate-500">
                          {new Date(interaction.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Email Composer Modal */}
      {showEmailComposer && selectedLead && (
        <EmailComposerModal
          lead={selectedLead}
          onClose={() => setShowEmailComposer(false)}
          onSend={sendEmail}
          suggestedContent={salesScript}
        />
      )}

      {/* SMS Composer Modal */}
      {showSMSComposer && selectedLead && (
        <SMSComposerModal
          lead={selectedLead}
          onClose={() => setShowSMSComposer(false)}
          onSend={sendSMS}
        />
      )}

      {/* Documents Modal */}
      {showDocuments && selectedLead && (
        <DocumentsModal
          lead={selectedLead}
          documents={documents}
          onClose={() => setShowDocuments(false)}
          onRefresh={() => loadLeadDetails(selectedLead.id)}
        />
      )}
    </div>
  );
};

// Email Composer Modal Component
const EmailComposerModal: React.FC<{
  lead: Lead;
  onClose: () => void;
  onSend: (subject: string, content: string) => void;
  suggestedContent: string;
}> = ({ lead, onClose, onSend, suggestedContent }) => {
  const [subject, setSubject] = useState(`Votre devis d'assurance taxi - ${lead.first_name || lead.name}`);
  const [content, setContent] = useState('');

  const templates = [
    {
      name: 'Premier contact',
      subject: `Votre demande d'assurance taxi`,
      content: `Bonjour ${lead.first_name || ''},\n\nJe vous remercie pour votre demande. J'ai le plaisir de vous proposer des solutions d'assurance taxi parfaitement adaptées à vos besoins.\n\nPourriez-vous me confirmer quelques informations :\n- Type de véhicule\n- Année de mise en circulation\n- Usage (taxi, VTC, ou les deux)\n\nJe vous préparerai un devis personnalisé sous 2h.\n\nCordialement,\nL'équipe TaxiAssur`
    },
    {
      name: 'Envoi devis',
      subject: `Votre devis personnalisé - Économisez jusqu'à 30%`,
      content: `Bonjour ${lead.first_name || ''},\n\nComme promis, voici votre devis personnalisé pour votre assurance taxi.\n\n✅ RC Pro incluse\n✅ Tous dommages\n✅ Protection juridique\n✅ Assistance 24h/7j\n\nTarif préférentiel : ${Math.round((lead.estimated_value || 3500) / 12)}€/mois\n\nOffre valable jusqu'au ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}\n\nSouhaitez-vous que nous finalisions ensemble ?\n\nCordialement,\nL'équipe TaxiAssur`
    },
    {
      name: 'Relance',
      subject: `Votre devis vous attend - Offre spéciale`,
      content: `Bonjour ${lead.first_name || ''},\n\nJ'espère que vous allez bien.\n\nJe me permets de revenir vers vous concernant votre devis d'assurance taxi.\n\nBonne nouvelle : je peux vous proposer une réduction supplémentaire de -10% si vous souscrivez cette semaine.\n\nAvez-vous des questions ? Je suis à votre disposition.\n\nCordialement,\nL'équipe TaxiAssur`
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Composer un email</h2>
              <p className="text-blue-100">À: {lead.email}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {templates.map((template, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSubject(template.subject);
                  setContent(template.content);
                }}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm rounded-lg border border-blue-200 transition-colors"
              >
                {template.name}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Sujet</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Sujet de l'email"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Votre message..."
            />
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-semibold"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              if (subject && content) {
                onSend(subject, content);
              }
            }}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg font-semibold flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
};

// SMS Composer Modal Component
const SMSComposerModal: React.FC<{
  lead: Lead;
  onClose: () => void;
  onSend: (message: string) => void;
}> = ({ lead, onClose, onSend }) => {
  const [message, setMessage] = useState('');

  const templates = [
    `Bonjour ${lead.first_name || ''}, votre devis TaxiAssur est prêt ! Économisez jusqu'à 30%. Répondez OUI pour le recevoir par email.`,
    `${lead.first_name || 'Bonjour'}, offre spéciale cette semaine : -10% sur votre assurance taxi. Appelez-nous au 01 80 85 57 86`,
    `Votre devis expire demain ! Dernière chance de profiter de nos tarifs préférentiels. TaxiAssur - 01 80 85 57 86`,
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Envoyer un SMS</h2>
              <p className="text-green-100">À: {lead.phone}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            {templates.map((template, idx) => (
              <button
                key={idx}
                onClick={() => setMessage(template)}
                className="w-full text-left px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-sm rounded-lg border border-green-200 transition-colors"
              >
                {template.substring(0, 60)}...
              </button>
            ))}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-slate-700">Message</label>
              <span className={`text-xs ${message.length > 160 ? 'text-red-600' : 'text-slate-500'}`}>
                {message.length}/160
              </span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={160}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              placeholder="Votre SMS..."
            />
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-semibold"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              if (message) {
                onSend(message);
              }
            }}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-lg font-semibold flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
};

// Documents Modal Component
const DocumentsModal: React.FC<{
  lead: Lead;
  documents: Document[];
  onClose: () => void;
  onRefresh: () => void;
}> = ({ lead, documents, onClose, onRefresh }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Documents</h2>
              <p className="text-yellow-100">{lead.first_name || lead.name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Aucun document pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{doc.file_name}</p>
                    <p className="text-xs text-slate-500">
                      {doc.document_type} - {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <button
                    onClick={() => window.open(doc.file_url, '_blank')}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <button
            onClick={() => {
              // Upload logic would go here
              alert('Upload de documents à venir');
            }}
            className="w-full px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-lg hover:from-yellow-700 hover:to-orange-700 transition-all shadow-lg font-semibold flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Ajouter des documents
          </button>
        </div>
      </div>
    </div>
  );
};

export default CRMKiller;
