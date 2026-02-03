import React, { useState } from 'react';
import {
  FileText,
  Send,
  Clock,
  MessageCircle,
  Mail,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Link as LinkIcon,
  ArrowRight,
  Check,
  X,
  FileCheck,
  Clock3
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface DocumentStatus {
  label: string;
  type: string;
  status: 'validated' | 'received' | 'missing';
}

interface DocumentReminderPanelProps {
  leadId: string;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  missingDocuments: string[];
  documentStatuses?: DocumentStatus[];
  lastReminderDate?: string;
  onDocumentsComplete?: () => void;
}

export const DocumentReminderPanel: React.FC<DocumentReminderPanelProps> = ({
  leadId,
  leadName,
  leadEmail,
  leadPhone,
  missingDocuments,
  documentStatuses = [],
  lastReminderDate,
  onDocumentsComplete
}) => {
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'sms' | 'whatsapp' | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const getStatusIcon = (status: 'validated' | 'received' | 'missing') => {
    switch (status) {
      case 'validated':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'received':
        return <Clock3 className="w-4 h-4 text-orange-500" />;
      case 'missing':
        return <X className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'validated' | 'received' | 'missing') => {
    switch (status) {
      case 'validated':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'received':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'missing':
        return 'bg-red-50 border-red-200 text-red-900';
    }
  };

  const getStatusText = (status: 'validated' | 'received' | 'missing') => {
    switch (status) {
      case 'validated':
        return 'Validé';
      case 'received':
        return 'Reçu';
      case 'missing':
        return 'Manquant';
    }
  };

  const daysSinceLastReminder = lastReminderDate
    ? Math.floor((Date.now() - new Date(lastReminderDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const getAccessLink = async () => {
    const { data: lead } = await supabase
      .from('crm_leads')
      .select('access_token')
      .eq('id', leadId)
      .single();

    if (lead?.access_token) {
      return `${window.location.origin}/espace-prospect/${lead.access_token}`;
    }

    // Générer un nouveau token si nécessaire
    const token = Math.random().toString(36).substring(2, 15);
    await supabase
      .from('crm_leads')
      .update({ access_token: token })
      .eq('id', leadId);

    return `${window.location.origin}/espace-prospect/${token}`;
  };

  const sendReminder = async (channel: 'email' | 'sms' | 'whatsapp') => {
    setLoading(true);
    try {
      const accessLink = await getAccessLink();

      const missingDocsText = missingDocuments.join(', ');

      let message = '';
      if (channel === 'email') {
        message = `Bonjour ${leadName},\n\nPour finaliser votre devis d'assurance taxi, nous avons besoin des documents suivants :\n\n`;
        missingDocuments.forEach(doc => {
          message += `- ${doc}\n`;
        });
        message += `\nVous pouvez les télécharger directement sur votre espace sécurisé :\n${accessLink}\n\n`;
        message += customMessage ? `\n${customMessage}\n\n` : '';
        message += `Cordialement,\nL'équipe TaxiAssur`;
      } else if (channel === 'sms') {
        message = `TaxiAssur: Documents manquants (${missingDocsText}). Uploadez-les ici: ${accessLink}`;
      } else if (channel === 'whatsapp') {
        message = `Bonjour ${leadName}, il nous manque ces documents pour votre devis taxi :\n`;
        missingDocuments.forEach(doc => {
          message += `✓ ${doc}\n`;
        });
        message += `\nLien upload: ${accessLink}`;
      }

      // Envoyer via l'edge function appropriée
      let sendResult;
      if (channel === 'email' && leadEmail) {
        const { data, error } = await supabase.functions.invoke('send-crm-email', {
          body: {
            to: leadEmail,
            subject: `Documents manquants - ${leadName}`,
            html: message.replace(/\n/g, '<br>')
          }
        });
        if (error || !data?.success) {
          const errorMsg = error?.message || data?.error || 'Erreur inconnue';
          throw new Error(`Email non envoyé: ${errorMsg}`);
        }
        sendResult = data;
      } else if (channel === 'sms' && leadPhone) {
        const { data, error } = await supabase.functions.invoke('send-sms', {
          body: {
            to: leadPhone,
            message: message
          }
        });
        if (error || !data?.success) {
          const errorMsg = error?.message || data?.error || 'Erreur inconnue';
          throw new Error(`SMS non envoyé: ${errorMsg}`);
        }
        sendResult = data;
      } else if (channel === 'whatsapp' && leadPhone) {
        const { data, error } = await supabase.functions.invoke('send-whatsapp', {
          body: {
            to: leadPhone,
            message: message
          }
        });
        if (error || !data?.success) {
          const errorMsg = error?.message || data?.error || 'Erreur inconnue';
          throw new Error(`WhatsApp non envoyé: ${errorMsg}`);
        }
        sendResult = data;
      }

      // Enregistrer la relance
      await supabase.from('crm_interactions').insert({
        lead_id: leadId,
        type: channel === 'email' ? 'email' : channel,
        direction: 'outbound',
        content: `Relance documents manquants : ${missingDocsText}`,
        status: 'sent'
      });

      // Mettre à jour la date de dernière relance
      await supabase
        .from('crm_leads')
        .update({ last_contact_at: new Date().toISOString() })
        .eq('id', leadId);

      alert(`✅ Relance envoyée avec succès via ${channel} !`);
      setSelectedChannel(null);
      setCustomMessage('');
    } catch (error: any) {
      console.error('Erreur envoi relance:', error);
      alert(`❌ Erreur lors de l'envoi de la relance\n\n${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const copyAccessLink = async () => {
    const link = await getAccessLink();
    navigator.clipboard.writeText(link);
    alert('Lien copié dans le presse-papier !');
  };

  const markDocumentsComplete = async () => {
    setLoading(true);
    try {
      // Passer le lead à l'étape DEVIS
      await supabase
        .from('crm_leads')
        .update({ status: 'DEVIS' })
        .eq('id', leadId);

      // Créer une interaction
      await supabase.from('crm_interactions').insert({
        lead_id: leadId,
        type: 'system',
        direction: 'outbound',
        content: 'Documents collectés - Passage étape DEVIS',
        status: 'completed'
      });

      alert('Documents validés ! Le lead passe à l\'étape DEVIS.');
      if (onDocumentsComplete) {
        onDocumentsComplete();
      }
    } catch (error) {
      console.error('Erreur validation documents:', error);
      alert('Erreur lors de la validation des documents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-600" />
          Relance pour documents manquants
        </h3>
        {daysSinceLastReminder !== null && (
          <p className="text-sm text-gray-600 mt-1">
            Dernière relance : il y a {daysSinceLastReminder} jour{daysSinceLastReminder > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Checklist des documents */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-gray-600" />
          État des documents ({documentStatuses.length})
        </h4>
        <div className="space-y-2">
          {documentStatuses.map((doc, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-2.5 border rounded-lg transition-all ${getStatusColor(doc.status)}`}
            >
              <div className="flex items-center gap-2 flex-1">
                {getStatusIcon(doc.status)}
                <span className="text-sm font-medium">{doc.label}</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${
                doc.status === 'validated' ? 'bg-green-100 text-green-700' :
                doc.status === 'received' ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-700'
              }`}>
                {getStatusText(doc.status)}
              </span>
            </div>
          ))}
        </div>

        {/* Résumé rapide */}
        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-green-700">
            <Check className="w-3 h-3" />
            <span>{documentStatuses.filter(d => d.status === 'validated').length} validés</span>
          </div>
          <div className="flex items-center gap-1 text-orange-600">
            <Clock3 className="w-3 h-3" />
            <span>{documentStatuses.filter(d => d.status === 'received').length} reçus</span>
          </div>
          <div className="flex items-center gap-1 text-red-600">
            <X className="w-3 h-3" />
            <span>{missingDocuments.length} manquants</span>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="p-4 border-b border-gray-200 space-y-2">
        <button
          onClick={copyAccessLink}
          className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-2 text-gray-700 font-medium"
        >
          <LinkIcon className="w-5 h-5" />
          Copier le lien espace prospect
        </button>
        <button
          onClick={markDocumentsComplete}
          disabled={loading}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50"
        >
          <CheckCircle className="w-5 h-5" />
          {loading ? 'Validation...' : 'Documents reçus - Passer au devis'}
        </button>
      </div>

      {/* Choix du canal de relance */}
      {!selectedChannel && (
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-3">
            Choisissez le canal de relance :
          </p>
          <div className="grid grid-cols-3 gap-2">
            {leadEmail && (
              <button
                onClick={() => setSelectedChannel('email')}
                className="p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all flex flex-col items-center gap-1"
              >
                <Mail className="w-5 h-5" />
                <span className="text-xs font-medium">Email</span>
              </button>
            )}
            {leadPhone && (
              <>
                <button
                  onClick={() => setSelectedChannel('sms')}
                  className="p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all flex flex-col items-center gap-1"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-xs font-medium">SMS</span>
                </button>
                <button
                  onClick={() => setSelectedChannel('whatsapp')}
                  className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all flex flex-col items-center gap-1"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-xs font-medium">WhatsApp</span>
                </button>
              </>
            )}
          </div>

          {daysSinceLastReminder !== null && daysSinceLastReminder < 2 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <Clock className="w-4 h-4 text-yellow-600 mt-0.5" />
              <p className="text-xs text-yellow-800">
                Une relance a déjà été envoyée récemment. Attendez 2-3 jours avant de relancer à nouveau.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Formulaire de relance */}
      {selectedChannel && (
        <div className="p-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm font-semibold text-blue-900 mb-1">
              Relance via {selectedChannel.toUpperCase()}
            </p>
            <p className="text-xs text-blue-700">
              Un message automatique sera envoyé avec la liste des documents manquants et le lien d'accès.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message personnalisé (optionnel)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Ajouter un message personnel..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedChannel(null);
                  setCustomMessage('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => sendReminder(selectedChannel)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Envoi...' : 'Envoyer la relance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
