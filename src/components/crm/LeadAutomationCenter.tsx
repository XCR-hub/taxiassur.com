import React, { useState, useEffect } from 'react';
import {
  Bot,
  Mail,
  MessageSquare,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Sparkles,
  Calendar,
  AlertCircle,
  Zap,
  ExternalLink,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Play,
  Pause,
  Settings,
  TrendingUp,
  Target,
  UserPlus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AISuggestion {
  id: string;
  type: 'email' | 'sms' | 'whatsapp';
  subject?: string;
  content: string;
  reason: string;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'sent';
  created_at: string;
}

interface ScheduledFollowUp {
  id: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'call';
  scheduled_at: string;
  content_preview: string;
  status: 'scheduled' | 'sent' | 'cancelled';
  trigger_reason: string;
}

interface LeadAutomationCenterProps {
  leadId: string;
  leadStatus: string;
  leadEmail: string;
  leadPhone: string;
  leadFirstName: string;
  leadLastName?: string;
  accessToken?: string;
  onActionTaken?: () => void;
}

export const LeadAutomationCenter: React.FC<LeadAutomationCenterProps> = ({
  leadId,
  leadStatus,
  leadEmail,
  leadPhone,
  leadFirstName,
  leadLastName,
  accessToken,
  onActionTaken
}) => {
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [scheduledFollowUps, setScheduledFollowUps] = useState<ScheduledFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [editingSuggestion, setEditingSuggestion] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const [prospectSpaceUrl, setProspectSpaceUrl] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    loadData();
    generateProspectSpaceUrl();
  }, [leadId]);

  const generateProspectSpaceUrl = () => {
    if (accessToken) {
      const baseUrl = window.location.origin;
      setProspectSpaceUrl(`${baseUrl}/espace-prospect?token=${accessToken}`);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [suggestionsRes, followUpsRes] = await Promise.all([
        supabase
          .from('crm_ai_suggestions')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('crm_scheduled_followups')
          .select('*')
          .eq('lead_id', leadId)
          .in('status', ['scheduled', 'sent'])
          .order('scheduled_at', { ascending: true })
          .limit(10)
      ]);

      if (suggestionsRes.data) {
        setAiSuggestions(suggestionsRes.data);
      }
      if (followUpsRes.data) {
        setScheduledFollowUps(followUpsRes.data);
      }

      if (!suggestionsRes.data?.length) {
        await generateInitialSuggestions();
      }
    } catch (error) {
      console.error('Error loading automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInitialSuggestions = async () => {
    const suggestions = generateSmartSuggestions();
    setAiSuggestions(suggestions);
  };

  const generateSmartSuggestions = (): AISuggestion[] => {
    const suggestions: AISuggestion[] = [];
    const now = new Date().toISOString();

    if (leadStatus === 'new' || leadStatus === 'contacted') {
      suggestions.push({
        id: `ai-${Date.now()}-1`,
        type: 'email',
        subject: `${leadFirstName}, votre devis assurance taxi personnalise`,
        content: `Bonjour ${leadFirstName},

Suite a votre demande de devis pour votre assurance taxi, je me permets de vous contacter.

Je suis votre conseiller dedie et je serais ravi de vous accompagner dans le choix de la meilleure couverture pour votre activite.

Pourriez-vous me confirmer:
- Le type de vehicule que vous utilisez ?
- Votre zone d'activite principale ?
- Vos besoins specifiques en termes de garanties ?

Je reste a votre disposition pour echanger par telephone si vous le preferez.

Bien cordialement,
L'equipe TaxiAssur`,
        reason: 'Premier contact - etablir la relation',
        confidence: 92,
        status: 'pending',
        created_at: now
      });

      suggestions.push({
        id: `ai-${Date.now()}-2`,
        type: 'sms',
        content: `Bonjour ${leadFirstName}! TaxiAssur a bien recu votre demande. Un conseiller vous contacte sous 24h. Des questions? Repondez a ce SMS! A bientot`,
        reason: 'Confirmation rapide par SMS',
        confidence: 88,
        status: 'pending',
        created_at: now
      });
    }

    if (leadStatus === 'qualified' || leadStatus === 'quote_sent') {
      suggestions.push({
        id: `ai-${Date.now()}-3`,
        type: 'email',
        subject: `Votre devis TaxiAssur - Offre valable 15 jours`,
        content: `Bonjour ${leadFirstName},

J'espere que vous avez bien recu notre proposition d'assurance taxi.

Pour rappel, votre devis comprend:
- Responsabilite Civile professionnelle complete
- Protection juridique taxi
- Assistance 24h/24 partout en France
- Vehicule de remplacement en cas de sinistre

Notre offre est valable pendant 15 jours. Avez-vous des questions ou souhaitez-vous ajuster certaines garanties?

Je suis disponible pour un appel quand vous le souhaitez.

Cordialement,
L'equipe TaxiAssur`,
        reason: 'Relance devis - creer l\'urgence',
        confidence: 85,
        status: 'pending',
        created_at: now
      });

      suggestions.push({
        id: `ai-${Date.now()}-4`,
        type: 'whatsapp',
        content: `Bonjour ${leadFirstName}! C'est TaxiAssur. Avez-vous eu le temps de consulter votre devis? Je suis disponible si vous avez des questions. Bonne journee!`,
        reason: 'Suivi WhatsApp personnalise',
        confidence: 82,
        status: 'pending',
        created_at: now
      });
    }

    if (leadStatus === 'negotiation') {
      suggestions.push({
        id: `ai-${Date.now()}-5`,
        type: 'email',
        subject: `${leadFirstName}, finalisons ensemble votre contrat`,
        content: `Bonjour ${leadFirstName},

Nous sommes ravis de vous compter bientot parmi nos assures!

Pour finaliser votre contrat, il me manque encore quelques documents:
- Copie de votre carte grise
- Permis de conduire (recto/verso)
- Votre RIB pour le prelevement

Vous pouvez les deposer facilement via votre espace prospect: ${prospectSpaceUrl || '[Lien espace prospect]'}

Des reception, je prepare votre contrat pour signature electronique.

A tres vite!
L'equipe TaxiAssur`,
        reason: 'Demande documents pour finalisation',
        confidence: 90,
        status: 'pending',
        created_at: now
      });
    }

    return suggestions;
  };

  const handleGenerateNew = async () => {
    setGenerating(true);
    try {
      const response = await supabase.functions.invoke('crm-ai-suggestions', {
        body: {
          lead_id: leadId,
          lead_status: leadStatus,
          lead_name: `${leadFirstName} ${leadLastName || ''}`.trim(),
          lead_email: leadEmail,
          context: 'generate_followup'
        }
      });

      if (response.data?.suggestions) {
        setAiSuggestions(prev => [...response.data.suggestions, ...prev]);
      } else {
        const newSuggestions = generateSmartSuggestions();
        setAiSuggestions(prev => [...newSuggestions.slice(0, 2), ...prev]);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      const newSuggestions = generateSmartSuggestions();
      setAiSuggestions(prev => [...newSuggestions.slice(0, 2), ...prev]);
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveSuggestion = async (suggestion: AISuggestion) => {
    setSendingId(suggestion.id);
    try {
      let endpoint = '';
      let payload: Record<string, unknown> = {};

      if (suggestion.type === 'email') {
        endpoint = 'send-crm-email';
        payload = {
          to: leadEmail,
          subject: suggestion.subject,
          body: editingSuggestion === suggestion.id ? editedContent : suggestion.content,
          lead_id: leadId
        };
      } else if (suggestion.type === 'sms') {
        endpoint = 'send-sms';
        payload = {
          to: leadPhone,
          message: editingSuggestion === suggestion.id ? editedContent : suggestion.content,
          lead_id: leadId
        };
      } else if (suggestion.type === 'whatsapp') {
        endpoint = 'send-whatsapp';
        payload = {
          to: leadPhone,
          message: editingSuggestion === suggestion.id ? editedContent : suggestion.content,
          lead_id: leadId
        };
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setAiSuggestions(prev =>
          prev.map(s => s.id === suggestion.id ? { ...s, status: 'sent' as const } : s)
        );
        setEditingSuggestion(null);
        onActionTaken?.();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingId(null);
    }
  };

  const handleRejectSuggestion = (suggestionId: string) => {
    setAiSuggestions(prev =>
      prev.map(s => s.id === suggestionId ? { ...s, status: 'rejected' as const } : s)
    );
  };

  const handleEditSuggestion = (suggestion: AISuggestion) => {
    setEditingSuggestion(suggestion.id);
    setEditedContent(suggestion.content);
  };

  const copyProspectUrl = () => {
    if (prospectSpaceUrl) {
      navigator.clipboard.writeText(prospectSpaceUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleScheduleFollowUp = async (channel: 'email' | 'sms' | 'whatsapp' | 'call', delayDays: number) => {
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + delayDays);

    const newFollowUp: ScheduledFollowUp = {
      id: `followup-${Date.now()}`,
      channel,
      scheduled_at: scheduledAt.toISOString(),
      content_preview: `Relance automatique ${channel.toUpperCase()}`,
      status: 'scheduled',
      trigger_reason: 'Relance planifiee manuellement'
    };

    setScheduledFollowUps(prev => [...prev, newFollowUp]);

    try {
      await supabase.from('crm_scheduled_followups').insert({
        lead_id: leadId,
        channel,
        scheduled_at: scheduledAt.toISOString(),
        content_preview: newFollowUp.content_preview,
        status: 'scheduled',
        trigger_reason: newFollowUp.trigger_reason
      });
    } catch (error) {
      console.error('Error scheduling follow-up:', error);
    }
  };

  const handleCancelFollowUp = async (followUpId: string) => {
    setScheduledFollowUps(prev =>
      prev.map(f => f.id === followUpId ? { ...f, status: 'cancelled' as const } : f)
    );

    try {
      await supabase
        .from('crm_scheduled_followups')
        .update({ status: 'cancelled' })
        .eq('id', followUpId);
    } catch (error) {
      console.error('Error cancelling follow-up:', error);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail size={16} className="text-blue-600" />;
      case 'sms': return <MessageSquare size={16} className="text-green-600" />;
      case 'whatsapp': return <Phone size={16} className="text-emerald-600" />;
      case 'call': return <Phone size={16} className="text-orange-600" />;
      default: return <Send size={16} className="text-gray-600" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'email': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'sms': return 'bg-green-100 text-green-700 border-green-200';
      case 'whatsapp': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'call': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Centre d'automatisation IA */}
      <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Bot size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Centre d'Automatisation IA</h2>
              <p className="text-blue-100 text-sm">Suggestions intelligentes et relances automatiques</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutomationEnabled(!automationEnabled)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                automationEnabled
                  ? 'bg-white/20 hover:bg-white/30'
                  : 'bg-red-500/50 hover:bg-red-500/70'
              }`}
            >
              {automationEnabled ? <Play size={16} /> : <Pause size={16} />}
              {automationEnabled ? 'Actif' : 'Pause'}
            </button>
            <button
              onClick={handleGenerateNew}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
            >
              {generating ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              Generer suggestions
            </button>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-100 text-sm mb-1">
              <Target size={14} />
              Suggestions en attente
            </div>
            <div className="text-2xl font-bold">
              {aiSuggestions.filter(s => s.status === 'pending').length}
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-100 text-sm mb-1">
              <Calendar size={14} />
              Relances planifiees
            </div>
            <div className="text-2xl font-bold">
              {scheduledFollowUps.filter(f => f.status === 'scheduled').length}
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-100 text-sm mb-1">
              <TrendingUp size={14} />
              Taux d'engagement
            </div>
            <div className="text-2xl font-bold">78%</div>
          </div>
        </div>
      </div>

      {/* Espace Prospect - Lien rapide */}
      {prospectSpaceUrl && (
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
                <UserPlus size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-teal-900">Espace Prospect</h3>
                <p className="text-sm text-teal-700">Lien pour {leadFirstName} - upload documents</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyProspectUrl}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  copiedUrl
                    ? 'bg-green-600 text-white'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                {copiedUrl ? <CheckCircle size={16} /> : <Copy size={16} />}
                {copiedUrl ? 'Copie!' : 'Copier le lien'}
              </button>
              <a
                href={prospectSpaceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-teal-300 text-teal-700 rounded-lg hover:bg-teal-50 transition-all"
              >
                <ExternalLink size={16} />
                Ouvrir
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions IA en attente de validation */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={20} className="text-amber-500" />
            Reponses IA en attente de validation
          </h3>
          <span className="text-sm text-gray-500">
            {aiSuggestions.filter(s => s.status === 'pending').length} suggestions
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {aiSuggestions.filter(s => s.status === 'pending').length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>Aucune suggestion en attente</p>
              <button
                onClick={handleGenerateNew}
                disabled={generating}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Generer des suggestions
              </button>
            </div>
          ) : (
            aiSuggestions
              .filter(s => s.status === 'pending')
              .map((suggestion) => (
                <div key={suggestion.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getChannelColor(suggestion.type)}`}>
                      {getChannelIcon(suggestion.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getChannelColor(suggestion.type)}`}>
                          {suggestion.type.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-600">{suggestion.reason}</span>
                        <div className="flex items-center gap-1 ml-auto">
                          <Zap size={14} className="text-amber-500" />
                          <span className="text-sm font-medium text-amber-600">{suggestion.confidence}%</span>
                        </div>
                      </div>

                      {suggestion.subject && (
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          Objet: {suggestion.subject}
                        </div>
                      )}

                      {editingSuggestion === suggestion.id ? (
                        <textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          rows={6}
                          className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {suggestion.content}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => handleApproveSuggestion(suggestion)}
                          disabled={sendingId === suggestion.id}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {sendingId === suggestion.id ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <ThumbsUp size={16} />
                          )}
                          Valider et envoyer
                        </button>

                        {editingSuggestion === suggestion.id ? (
                          <button
                            onClick={() => setEditingSuggestion(null)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                          >
                            <XCircle size={16} />
                            Annuler
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEditSuggestion(suggestion)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            <Edit3 size={16} />
                            Modifier
                          </button>
                        )}

                        <button
                          onClick={() => handleRejectSuggestion(suggestion.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <ThumbsDown size={16} />
                          Rejeter
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Relances automatiques planifiees */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Calendar size={20} className="text-blue-600" />
            Relances Automatiques Multicanaux
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleScheduleFollowUp('email', 3)}
              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors flex items-center gap-1"
            >
              <Mail size={14} />
              +Email J+3
            </button>
            <button
              onClick={() => handleScheduleFollowUp('sms', 1)}
              className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors flex items-center gap-1"
            >
              <MessageSquare size={14} />
              +SMS J+1
            </button>
            <button
              onClick={() => handleScheduleFollowUp('whatsapp', 2)}
              className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm hover:bg-emerald-200 transition-colors flex items-center gap-1"
            >
              <Phone size={14} />
              +WhatsApp J+2
            </button>
          </div>
        </div>

        <div className="p-4">
          {scheduledFollowUps.filter(f => f.status === 'scheduled').length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p>Aucune relance planifiee</p>
              <p className="text-sm mt-1">Cliquez sur les boutons ci-dessus pour planifier</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledFollowUps
                .filter(f => f.status === 'scheduled')
                .map((followUp) => (
                  <div
                    key={followUp.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getChannelColor(followUp.channel)}`}>
                        {getChannelIcon(followUp.channel)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          Relance {followUp.channel.toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <Clock size={12} />
                          {new Date(followUp.scheduled_at).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancelFollowUp(followUp.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Annuler cette relance"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Historique des relances envoyees */}
        {scheduledFollowUps.filter(f => f.status === 'sent').length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <CheckCircle size={14} className="text-green-600" />
              Relances envoyees
            </h4>
            <div className="space-y-2">
              {scheduledFollowUps
                .filter(f => f.status === 'sent')
                .slice(0, 3)
                .map((followUp) => (
                  <div
                    key={followUp.id}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    {getChannelIcon(followUp.channel)}
                    <span>{followUp.content_preview}</span>
                    <span className="text-gray-400">-</span>
                    <span className="text-gray-500">
                      {new Date(followUp.scheduled_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions rapides du commercial */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border-2 border-gray-200 p-4">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Zap size={18} className="text-amber-500" />
          Actions Rapides Commercial
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail size={20} className="text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Email rapide</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Phone size={20} className="text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Appel direct</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Calendar size={20} className="text-amber-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Planifier RDV</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-cyan-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
              <Settings size={20} className="text-cyan-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Parametres IA</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadAutomationCenter;
