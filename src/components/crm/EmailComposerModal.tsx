import { useState, useEffect } from 'react';
import {
  Mail,
  X,
  Send,
  FileText,
  Paperclip,
  ChevronDown,
  ChevronUp,
  User,
  Building2,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LegalDocumentsSelector } from './LegalDocumentsSelector';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category?: string;
}

interface LeadInfo {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  company_name?: string;
  city?: string;
}

interface LegalDocument {
  id: string;
  name: string;
  file_path: string;
  description: string;
  type: string;
  companies: string[];
}

interface EmailComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadInfo;
  onEmailSent?: () => void;
  defaultTemplate?: string;
  defaultSubject?: string;
  defaultBody?: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Email de bienvenue',
    category: 'Accueil',
    subject: 'Bienvenue chez TaxiAssur - Votre demande de devis',
    body: `Bonjour {{first_name}},

Merci d'avoir choisi TaxiAssur pour votre assurance taxi.

Nous avons bien reçu votre demande et un conseiller dédié vous contactera dans les prochaines 24 heures pour étudier votre dossier.

En attendant, n'hésitez pas à nous contacter si vous avez des questions.

Cordialement,
L'équipe TaxiAssur
01 76 39 00 60`
  },
  {
    id: 'documents_request',
    name: 'Demande de documents',
    category: 'Documents',
    subject: 'Documents nécessaires pour votre devis - TaxiAssur',
    body: `Bonjour {{first_name}},

Pour finaliser votre dossier d'assurance taxi, nous avons besoin des documents suivants :

- Carte grise du véhicule
- Permis de conduire
- Licence taxi / ADS
- Pièce d'identité
- RIB

Vous pouvez nous les envoyer par retour d'email ou via votre espace client.

Cordialement,
L'équipe TaxiAssur`
  },
  {
    id: 'quote_send',
    name: 'Envoi de devis',
    category: 'Devis',
    subject: 'Votre devis personnalisé - TaxiAssur',
    body: `Bonjour {{first_name}},

Suite à notre échange, veuillez trouver ci-joint votre devis d'assurance taxi personnalisé.

Points clés de votre offre :
- Couverture tous risques
- Assistance 24h/24
- Protection juridique incluse

Ce devis est valable 30 jours.

Pour toute question ou pour valider ce devis, n'hésitez pas à me contacter.

Cordialement,
L'équipe TaxiAssur
01 76 39 00 60`
  },
  {
    id: 'follow_up',
    name: 'Relance commerciale',
    category: 'Relance',
    subject: 'Avez-vous reçu notre devis ? - TaxiAssur',
    body: `Bonjour {{first_name}},

Je me permets de revenir vers vous concernant le devis que nous vous avons envoyé.

Avez-vous eu le temps de l'examiner ? Avez-vous des questions ?

Je reste à votre disposition pour en discuter et adapter l'offre si nécessaire.

Cordialement,
L'équipe TaxiAssur`
  },
  {
    id: 'documents_received',
    name: 'Documents reçus',
    category: 'Documents',
    subject: 'Documents bien reçus - TaxiAssur',
    body: `Bonjour {{first_name}},

Nous vous confirmons la bonne réception de vos documents.

Notre équipe va procéder à leur vérification et vous tiendra informé de la suite de votre dossier dans les plus brefs délais.

Cordialement,
L'équipe TaxiAssur`
  },
  {
    id: 'contract_ready',
    name: 'Contrat prêt à signer',
    category: 'Contrat',
    subject: 'Votre contrat est prêt - TaxiAssur',
    body: `Bonjour {{first_name}},

Excellente nouvelle ! Votre contrat d'assurance taxi est prêt.

Veuillez trouver ci-joint les documents contractuels suivants :
- Conditions particulières
- Conditions générales
- IPID (fiche d'information)
- Mandat de prélèvement SEPA

Pour finaliser votre souscription, merci de nous retourner le mandat SEPA signé.

Cordialement,
L'équipe TaxiAssur`
  }
];

export function EmailComposerModal({
  isOpen,
  onClose,
  lead,
  onEmailSent,
  defaultTemplate,
  defaultSubject,
  defaultBody
}: EmailComposerModalProps) {
  const [subject, setSubject] = useState(defaultSubject || '');
  const [body, setBody] = useState(defaultBody || '');
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplate || '');
  const [showLegalDocs, setShowLegalDocs] = useState(false);
  const [selectedLegalDocs, setSelectedLegalDocs] = useState<LegalDocument[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (defaultSubject) setSubject(defaultSubject);
    if (defaultBody) setBody(defaultBody);
    if (defaultTemplate) setSelectedTemplate(defaultTemplate);
  }, [defaultSubject, defaultBody, defaultTemplate]);

  const applyTemplate = (templateId: string) => {
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setSubject(replaceVariables(template.subject));
      setBody(replaceVariables(template.body));
    }
  };

  const replaceVariables = (text: string) => {
    return text
      .replace(/\{\{first_name\}\}/g, lead.first_name || 'Monsieur/Madame')
      .replace(/\{\{last_name\}\}/g, lead.last_name || '')
      .replace(/\{\{company_name\}\}/g, lead.company_name || '')
      .replace(/\{\{city\}\}/g, lead.city || '');
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Le sujet et le message sont obligatoires');
      return;
    }

    setSending(true);
    setError('');

    try {
      const attachments = selectedLegalDocs.map(doc => ({
        filename: doc.name,
        path: doc.file_path
      }));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-crm-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to: lead.email,
          subject,
          body,
          lead_id: lead.id,
          attachments: attachments.length > 0 ? attachments : undefined
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi');
      }

      await supabase.from('crm_interactions').insert({
        lead_id: lead.id,
        type: 'email',
        direction: 'outbound',
        subject,
        content: body.substring(0, 500),
        status: 'sent',
        metadata: {
          attachments: selectedLegalDocs.map(d => d.name)
        }
      });

      setSuccess(true);
      setTimeout(() => {
        if (onEmailSent) onEmailSent();
        onClose();
        setSuccess(false);
        setSubject('');
        setBody('');
        setSelectedLegalDocs([]);
      }, 1500);
    } catch (err) {
      console.error('Send error:', err);
      setError('Erreur lors de l\'envoi de l\'email');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-7 h-7 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Composer un email</h2>
              <p className="text-blue-200 text-sm">
                Destinataire: {lead.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {success ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Email envoyé !</h3>
              <p className="text-gray-600">L'email a été envoyé avec succès à {lead.email}</p>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Destinataire</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {lead.first_name} {lead.last_name}
                    </p>
                    <p className="text-sm text-gray-600">{lead.email}</p>
                  </div>
                  {lead.company_name && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building2 className="w-4 h-4" />
                      <span className="text-sm">{lead.company_name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => applyTemplate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-base"
                >
                  <option value="">-- Choisir un template --</option>
                  {EMAIL_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.category ? `[${t.category}] ` : ''}{t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sujet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Sujet de l'email..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400 text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  placeholder="Votre message..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400 text-base leading-relaxed resize-none"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Variables: {'{'}{'{'}'first_name'{'}'}{'}'},  {'{'}{'{'}'last_name'{'}'}{'}'},  {'{'}{'{'}'company_name'{'}'}{'}'}
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowLegalDocs(!showLegalDocs)}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-5 h-5 text-gray-500" />
                    <span className="font-medium text-gray-700">
                      Documents légaux à joindre
                    </span>
                    {selectedLegalDocs.length > 0 && (
                      <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
                        {selectedLegalDocs.length} sélectionné{selectedLegalDocs.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {showLegalDocs ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {showLegalDocs && (
                  <div className="p-4 border-t border-gray-200">
                    <LegalDocumentsSelector
                      onDocumentsSelected={setSelectedLegalDocs}
                      selectedDocuments={selectedLegalDocs}
                    />
                  </div>
                )}
              </div>

              {selectedLegalDocs.length > 0 && !showLegalDocs && (
                <div className="flex flex-wrap gap-2">
                  {selectedLegalDocs.map(doc => (
                    <span
                      key={doc.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 text-sm rounded-full border border-teal-200"
                    >
                      <FileText className="w-4 h-4" />
                      {doc.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {!success && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !body.trim()}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer l'email
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
