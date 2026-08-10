import React, { useState } from 'react';
import { X, Send, MessageCircle, User, Phone, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/promise-timeout';
import { clearDeliveryRequestId, getDeliveryRequestId } from '@/lib/delivery-idempotency';
import { toast } from '@/lib/toast';

interface SMSSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  leadPhone: string;
  accessToken?: string;
  onSent?: () => void;
}

const SMS_TEMPLATES = [
  {
    id: 'rappel_documents',
    label: 'Rappel documents',
    content: 'Bonjour {{prenom}}, vos documents sont incomplets pour votre dossier assurance taxi. Deposez-les ici : {{lien}} - TaxiAssur',
  },
  {
    id: 'devis_disponible',
    label: 'Devis disponible',
    content: 'Bonjour {{prenom}}, votre devis assurance taxi est pret ! Consultez-le sur votre espace : {{lien}} - TaxiAssur',
  },
  {
    id: 'relance_signature',
    label: 'Relance signature',
    content: 'Bonjour {{prenom}}, votre contrat attend votre signature. Finalisez ici : {{lien}} - TaxiAssur',
  },
  {
    id: 'confirmation_paiement',
    label: 'Confirmation paiement',
    content: 'Bonjour {{prenom}}, votre paiement a bien ete recu. Votre attestation sera disponible sous 24h sur votre espace : {{lien}} - TaxiAssur',
  },
  {
    id: 'rdv_rappel',
    label: 'Rappel RDV',
    content: 'Bonjour {{prenom}}, nous vous rappelons votre RDV telephonique aujourd\'hui. A tout a l\'heure ! - TaxiAssur',
  },
];

const SMSSendModal: React.FC<SMSSendModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadName,
  leadPhone,
  accessToken,
  onSent,
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [charCount, setCharCount] = useState(0);

  if (!isOpen) return null;

  const firstName = leadName.split(' ')[0] || 'Client';
  const prospectLink = accessToken
    ? `https://taxiassur.com/espace-prospect/${accessToken}`
    : 'https://taxiassur.com';

  const applyTemplate = (template: typeof SMS_TEMPLATES[0]) => {
    const filled = template.content
      .replace('{{prenom}}', firstName)
      .replace('{{lien}}', prospectLink);
    setMessage(filled);
    setCharCount(filled.length);
  };

  const handleMessageChange = (value: string) => {
    if (value.length <= 480) {
      setMessage(value);
      setCharCount(value.length);
    }
  };

  const smsCount = Math.ceil(charCount / 160) || 1;

  const sendSMS = async () => {
    if (!message.trim()) {
      toast.error('Veuillez saisir un message');
      return;
    }

    setSending(true);
    try {
      const deliverySignature = JSON.stringify({ leadId, to: leadPhone, content: message.trim(), tag: 'crm-manual' });
      const requestId = getDeliveryRequestId('sms', deliverySignature);
      const { data, error } = await withTimeout(supabase.functions.invoke('send-sms-brevo', {
        body: {
          to: leadPhone,
          content: message.trim(),
          lead_id: leadId,
          tag: 'crm-manual',
          requestId,
        },
      }), 45_000);

      if (error) {
        throw new Error(error.message || 'Erreur Edge Function');
      }

      if (data && !data.success) {
        throw new Error(data.error || 'Echec envoi SMS');
      }

      clearDeliveryRequestId('sms', deliverySignature);
      setSent(true);
      onSent?.();
      setTimeout(() => {
        onClose();
        setSent(false);
        setMessage('');
      }, 2000);
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Envoyer un SMS</h2>
              <p className="text-emerald-100 text-sm">via Brevo Transactional SMS</p>
            </div>
          </div>
        </div>

        {sent ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">SMS envoye !</h3>
            <p className="text-gray-600 text-sm">Le message a ete envoye a {leadPhone}</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Recipient */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900">{leadName}</span>
              <span className="text-gray-400">|</span>
              <Phone className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">{leadPhone}</span>
            </div>

            {/* Templates */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Modeles rapides
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SMS_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className="px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 rounded-lg border border-gray-200 hover:border-emerald-300 transition-all"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message textarea */}
            <div>
              <textarea
                value={message}
                onChange={(e) => handleMessageChange(e.target.value)}
                placeholder="Saisissez votre message SMS..."
                rows={5}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                autoFocus
              />
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{charCount} / 480 caracteres</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {smsCount} SMS ({smsCount > 1 ? 'long message' : '1 credit'})
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  Expediteur : TaxiAssur
                </span>
              </div>
            </div>

            {/* Send button */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all text-sm"
              >
                Annuler
              </button>
              <button
                onClick={sendSMS}
                disabled={sending || !message.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Envoyer le SMS
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SMSSendModal;
