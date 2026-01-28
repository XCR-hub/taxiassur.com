import React, { useState } from 'react';
import {
  Phone,
  MessageSquare,
  Mail,
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ContactAttempt {
  timestamp: string;
  method: string;
  success: boolean;
  notes?: string;
}

interface IntelligentContactPanelProps {
  leadId: string;
  leadName: string;
  leadPhone?: string;
  leadEmail?: string;
  contactAttempts?: ContactAttempt[];
  contactEstablished: boolean;
  onContactSuccess: () => void;
}

export const IntelligentContactPanel: React.FC<IntelligentContactPanelProps> = ({
  leadId,
  leadName,
  leadPhone,
  leadEmail,
  contactAttempts = [],
  contactEstablished,
  onContactSuccess
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'call' | 'whatsapp' | 'sms' | 'email' | null>(null);
  const [callAnswered, setCallAnswered] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSequenceModal, setShowSequenceModal] = useState(false);

  const contactMethods = [
    {
      id: 'call' as const,
      label: 'Appel téléphonique',
      icon: Phone,
      color: 'bg-blue-500 hover:bg-blue-600',
      available: !!leadPhone,
      priority: 1
    },
    {
      id: 'whatsapp' as const,
      label: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-500 hover:bg-green-600',
      available: !!leadPhone,
      priority: 2
    },
    {
      id: 'sms' as const,
      label: 'SMS',
      icon: MessageSquare,
      color: 'bg-purple-500 hover:bg-purple-600',
      available: !!leadPhone,
      priority: 3
    },
    {
      id: 'email' as const,
      label: 'Email',
      icon: Mail,
      color: 'bg-orange-500 hover:bg-orange-600',
      available: !!leadEmail,
      priority: 4
    }
  ];

  const recordContact = async (method: string, success: boolean) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('record_contact_attempt', {
        p_lead_id: leadId,
        p_method: method,
        p_success: success,
        p_notes: notes || null
      });

      if (error) throw error;

      // Créer une interaction CRM
      await supabase.from('crm_interactions').insert({
        lead_id: leadId,
        type: method === 'call' ? 'call' : method === 'email' ? 'email' : 'sms',
        direction: 'outbound',
        content: notes || `Tentative de contact via ${method}`,
        status: success ? 'completed' : 'failed'
      });

      if (success) {
        // Passer le lead à COLLECTE_DOCUMENTS
        await supabase
          .from('crm_leads')
          .update({ status: 'COLLECTE_DOCUMENTS' })
          .eq('id', leadId);

        onContactSuccess();
      }

      setSelectedMethod(null);
      setCallAnswered(null);
      setNotes('');
    } catch (error) {
      console.error('Erreur enregistrement contact:', error);
      alert('Erreur lors de l\'enregistrement du contact');
    } finally {
      setLoading(false);
    }
  };

  const handleCallResult = async () => {
    if (callAnswered === null) {
      alert('Veuillez indiquer si le prospect a répondu');
      return;
    }

    await recordContact('call', callAnswered);

    // Si pas de réponse, proposer la séquence automatique
    if (!callAnswered) {
      setShowSequenceModal(true);
    }
  };

  const triggerAutomaticSequence = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('trigger_automatic_contact_sequence', {
        p_lead_id: leadId
      });

      if (error) throw error;

      alert('Séquence automatique déclenchée : WhatsApp → SMS → Email');
      setShowSequenceModal(false);
      setSelectedMethod(null);
    } catch (error) {
      console.error('Erreur déclenchement séquence:', error);
      alert('Erreur lors du déclenchement de la séquence');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectMessage = async (method: 'whatsapp' | 'sms' | 'email') => {
    // Enregistrer la tentative
    await recordContact(method, true);

    // Ouvrir le canal approprié
    if (method === 'whatsapp' && leadPhone) {
      window.open(`https://wa.me/${leadPhone.replace(/\D/g, '')}`, '_blank');
    } else if (method === 'sms' && leadPhone) {
      window.open(`sms:${leadPhone}`, '_blank');
    } else if (method === 'email' && leadEmail) {
      window.open(`mailto:${leadEmail}`, '_blank');
    }
  };

  if (contactEstablished) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <h4 className="font-bold text-green-900">Contact établi</h4>
            <p className="text-sm text-green-700">
              Vous pouvez passer à la collecte des documents
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Phone className="w-5 h-5 text-blue-600" />
          Prise de contact avec {leadName}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Choisissez le meilleur canal pour contacter le prospect
        </p>
      </div>

      {/* Tentatives précédentes */}
      {contactAttempts.length > 0 && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Tentatives précédentes ({contactAttempts.length})
          </h4>
          <div className="space-y-2">
            {contactAttempts.slice(-3).map((attempt, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                {attempt.success ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-gray-600">
                  {attempt.method} - {new Date(attempt.timestamp).toLocaleString('fr-FR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Choix du canal */}
      {!selectedMethod && (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {contactMethods.filter(m => m.available).map(method => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`${method.color} text-white p-4 rounded-lg transition-all hover:scale-105 flex flex-col items-center gap-2`}
              >
                <method.icon className="w-6 h-6" />
                <span className="font-medium">{method.label}</span>
              </button>
            ))}
          </div>

          {contactAttempts.length > 0 && (
            <button
              onClick={() => triggerAutomaticSequence()}
              className="w-full mt-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Déclencher séquence automatique
            </button>
          )}
        </div>
      )}

      {/* Formulaire d'appel */}
      {selectedMethod === 'call' && (
        <div className="p-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">
                Téléphone : {leadPhone}
              </span>
            </div>
            <a
              href={`tel:${leadPhone}`}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <ExternalLink className="w-4 h-4" />
              Lancer l'appel
            </a>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Le prospect a-t-il répondu ?
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setCallAnswered(true)}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all font-medium ${
                    callAnswered === true
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-green-300 bg-white text-gray-900'
                  }`}
                >
                  <CheckCircle className="w-5 h-5 mx-auto mb-1" />
                  Oui, contact établi
                </button>
                <button
                  onClick={() => setCallAnswered(false)}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all font-medium ${
                    callAnswered === false
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 hover:border-red-300 bg-white text-gray-900'
                  }`}
                >
                  <XCircle className="w-5 h-5 mx-auto mb-1" />
                  Non, pas de réponse
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optionnel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations collectées, prochaine action..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedMethod(null);
                  setCallAnswered(null);
                  setNotes('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCallResult}
                disabled={loading || callAnswered === null}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enregistrement...' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message direct (WhatsApp/SMS/Email) */}
      {selectedMethod && selectedMethod !== 'call' && (
        <div className="p-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-900">
              Vous allez envoyer un message via {selectedMethod.toUpperCase()}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message / Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contenu du message ou notes..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedMethod(null);
                  setNotes('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDirectMessage(selectedMethod)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Envoi...' : 'Envoyer et ouvrir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal séquence automatique */}
      {showSequenceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              <h3 className="font-bold text-lg">Pas de réponse ?</h3>
            </div>

            <p className="text-gray-700 mb-4">
              Le prospect n'a pas répondu à l'appel. Voulez-vous déclencher la séquence automatique ?
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                Séquence automatique :
              </p>
              <ol className="text-sm text-blue-800 space-y-1">
                <li className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  1. WhatsApp immédiat
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  2. SMS de backup
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  3. Email détaillé avec lien espace prospect
                </li>
              </ol>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowSequenceModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={triggerAutomaticSequence}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
              >
                {loading ? 'Déclenchement...' : 'Déclencher'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
