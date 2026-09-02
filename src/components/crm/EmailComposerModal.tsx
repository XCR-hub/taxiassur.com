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
  Loader2,
  Upload,
  Trash2
} from 'lucide-react';
import { nativeAdminCall, nativeAdminUploadLeadDocument } from '@/lib/native-admin-data';
import { clearDeliveryRequestId, getDeliveryRequestId } from '@/lib/delivery-idempotency';
import { LegalDocumentsSelector } from './LegalDocumentsSelector';
import { LeadDocumentsSelector } from './LeadDocumentsSelector';

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
  access_token?: string;
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
  missingDocuments?: string[];
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Email de bienvenue',
    category: 'Accueil',
    subject: 'Bienvenue chez TaxiAssur - Votre demande de devis',
    body: `Bonjour {{first_name}},

Merci d'avoir choisi TaxiAssur pour votre assurance taxi !

Nous avons bien recu votre demande de devis. Un conseiller dedie vous contactera dans les prochaines 24 heures pour etudier votre dossier.

Pour accelerer le traitement de votre demande, vous pouvez des maintenant acceder a votre espace personnel securise :

>> Acceder a mon espace : {{prospect_link}}

Sur votre espace, vous pourrez :
- Telecharger vos documents
- Suivre l'avancement de votre dossier
- Consulter vos devis
- Valider et souscrire en ligne

Documents necessaires :
- Carte grise du vehicule
- Permis de conduire
- Licence taxi / Autorisation de Stationnement (ADS)
- Piece d'identite (recto/verso)
- RIB

En attendant, n'hesitez pas a nous contacter si vous avez des questions.

Cordialement,
L'equipe TaxiAssur
Tel : 01 76 39 00 60
taxiassur.com`
  },
  {
    id: 'documents_request',
    name: 'Demande de documents',
    category: 'Documents',
    subject: 'Documents necessaires pour votre dossier - TaxiAssur',
    body: `Bonjour {{first_name}},

Pour finaliser votre dossier d'assurance taxi et vous transmettre votre devis personnalise, nous avons besoin des documents suivants :

{{missing_documents}}

>> ACCEDEZ A VOTRE ESPACE PERSONNEL SECURISE :
{{prospect_link}}

Sur votre espace, vous pourrez :
- Telecharger vos documents en toute securite
- Suivre l'avancement de votre dossier en temps reel
- Consulter vos devis des qu'ils sont disponibles

Vos documents sont proteges et traites en toute confidentialite.

Si vous avez des questions ou besoin d'aide, n'hesitez pas a nous contacter au 01 76 39 00 60.

Cordialement,
L'equipe TaxiAssur
taxiassur.com`
  },
  {
    id: 'documents_reminder',
    name: 'Relance documents manquants',
    category: 'Documents',
    subject: 'Rappel : Documents en attente pour votre devis taxi',
    body: `Bonjour {{first_name}},

Nous revenons vers vous car votre dossier est en attente de documents.

Pour obtenir votre devis personnalise, il nous manque encore :

{{missing_documents}}

Telechargez vos documents en quelques clics via votre espace personnel :
>> {{prospect_link}}

Nous traitons votre dossier des reception de vos documents !

A tres bientot,
L'equipe TaxiAssur
01 76 39 00 60`
  },
  {
    id: 'quote_send',
    name: 'Envoi de devis',
    category: 'Devis',
    subject: 'Votre devis d\'assurance taxi personnalise - TaxiAssur',
    body: `Bonjour {{first_name}},

Suite a notre echange, veuillez trouver ci-joint votre devis d'assurance taxi personnalise.

VOTRE OFFRE EN RESUME :
- Couverture tous risques adaptee aux taxis
- Assistance 24h/24 et 7j/7
- Protection juridique incluse
- Vehicule de remplacement en cas de sinistre

Ce devis est valable 30 jours.

PROCHAINE ETAPE :
Pour consulter et valider votre devis, acces direct a votre espace personnel :
>> {{prospect_link}}

Sur votre espace, vous pourrez :
- Consulter votre devis detaille
- Comparer les offres
- Valider et souscrire en ligne
- Completer vos documents si necessaire

Vous pouvez aussi :
1. Nous rappeler au 01 76 39 00 60
2. Repondre a cet email

Je reste a votre disposition pour toute question.

Cordialement,
L'equipe TaxiAssur
01 76 39 00 60`
  },
  {
    id: 'follow_up_quote',
    name: 'Relance devis',
    category: 'Relance',
    subject: 'Votre devis taxi vous attend - TaxiAssur',
    body: `Bonjour {{first_name}},

Je me permets de revenir vers vous concernant le devis d'assurance taxi que nous vous avons transmis.

Avez-vous eu le temps de l'examiner ? Avez-vous des questions ?

Pour rappel, votre offre comprend :
- Une couverture complete adaptee a votre activite
- Une assistance 24h/24
- Des garanties professionnelles incluses

Si vous souhaitez modifier votre offre ou obtenir plus d'informations, je suis a votre disposition.

>> Consulter votre devis et votre espace : {{prospect_link}}

Cordialement,
L'equipe TaxiAssur
01 76 39 00 60`
  },
  {
    id: 'documents_incomplete',
    name: 'Documents incomplets / illisibles',
    category: 'Documents',
    subject: 'Verification documents - Action requise - TaxiAssur',
    body: `Bonjour {{first_name}},

Nous avons bien recu vos documents, mais certains necessitent une nouvelle transmission :

{{missing_documents}}

Motif : Document illisible / incomplete / non valide

Merci de telecharger a nouveau ces documents via votre espace personnel :
>> {{prospect_link}}

Conseil : Assurez-vous que les documents sont bien lisibles et que toutes les informations sont visibles.

Nous restons a votre disposition.

Cordialement,
L'equipe TaxiAssur
01 76 39 00 60`
  },
  {
    id: 'documents_received',
    name: 'Documents recus - Confirmation',
    category: 'Documents',
    subject: 'Documents bien recus - TaxiAssur',
    body: `Bonjour {{first_name}},

Nous vous confirmons la bonne reception de vos documents.

Notre equipe va proceder a leur verification et vous transmettra votre devis personnalise dans les plus brefs delais (sous 24-48h ouvrees).

Vous pouvez suivre l'avancement de votre dossier en temps reel sur votre espace :
>> {{prospect_link}}

A tres bientot !

Cordialement,
L'equipe TaxiAssur
01 76 39 00 60`
  },
  {
    id: 'contract_ready',
    name: 'Contrat pret a signer',
    category: 'Contrat',
    subject: 'Votre contrat est pret ! - TaxiAssur',
    body: `Bonjour {{first_name}},

Excellente nouvelle ! Votre contrat d'assurance taxi est pret.

Veuillez trouver ci-joint les documents contractuels :
- Conditions Particulieres
- Conditions Generales
- IPID (Document d'Information Produit)
- Mandat de prelevement SEPA

POUR FINALISER VOTRE SOUSCRIPTION :
Accedez a votre espace personnel pour :
1. Consulter et verifier vos Conditions Particulieres
2. Signer electroniquement votre contrat
3. Effectuer le paiement securise
4. Telecharger tous vos documents

>> Acceder a mon espace : {{prospect_link}}

Des validation de votre contrat, votre couverture sera active sous 24h et vous recevrez votre attestation d'assurance par email.

Je reste a votre disposition pour toute question.

Cordialement,
L'equipe TaxiAssur
01 76 39 00 60`
  },
  {
    id: 'attestation_sent',
    name: 'Attestation envoyee',
    category: 'Contrat',
    subject: 'Votre attestation d\'assurance taxi - TaxiAssur',
    body: `Bonjour {{first_name}},

Felicitations ! Votre contrat d'assurance taxi est maintenant actif.

Veuillez trouver ci-joint votre attestation d'assurance.

Vous pouvez telecharger tous vos documents contractuels depuis votre espace personnel :
>> {{prospect_link}}

RAPPEL IMPORTANT :
- Conservez une copie de l'attestation dans votre vehicule
- En cas de sinistre, contactez-nous au 01 76 39 00 60

Merci de votre confiance !

Cordialement,
L'equipe TaxiAssur
01 76 39 00 60
taxiassur.com`
  },
  {
    id: 'renewal_reminder',
    name: 'Rappel echeance contrat',
    category: 'Relance',
    subject: 'Echeance de votre contrat taxi - TaxiAssur',
    body: `Bonjour {{first_name}},

Votre contrat d'assurance taxi arrive bientot a echeance.

Pour assurer la continuite de votre couverture, nous vous invitons a :
1. Verifier vos informations (vehicule, adresse, etc.)
2. Nous transmettre tout changement de situation
3. Consulter et mettre a jour vos informations sur votre espace personnel :
   >> {{prospect_link}}

Si vous souhaitez modifier votre contrat ou obtenir un nouveau devis, contactez-nous.

Cordialement,
L'equipe TaxiAssur
01 76 39 00 60`
  }
];

interface CustomAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
  uploading: boolean;
  uploaded: boolean;
  path?: string;
  error?: string;
}

export function EmailComposerModal({
  isOpen,
  onClose,
  lead,
  onEmailSent,
  defaultTemplate,
  defaultSubject,
  defaultBody,
  missingDocuments
}: EmailComposerModalProps) {
  const [subject, setSubject] = useState(defaultSubject || '');
  const [body, setBody] = useState(defaultBody || '');
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplate || '');
  const [showLegalDocs, setShowLegalDocs] = useState(false);
  const [selectedLegalDocs, setSelectedLegalDocs] = useState<LegalDocument[]>([]);
  const [showLeadDocs, setShowLeadDocs] = useState(false);
  const [selectedLeadDocs, setSelectedLeadDocs] = useState<Array<{ id: string; name: string; file_url?: string; file_path?: string; bucket?: 'prospect-documents' | 'crm-documents'; category: string }>>([]);
  const [customAttachments, setCustomAttachments] = useState<CustomAttachment[]>([]);
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
      setSubject(replaceVariables(template.subject, missingDocuments));
      setBody(replaceVariables(template.body, missingDocuments));
    }
  };

  const getProspectLink = () => {
    if (lead.access_token) {
      return `https://taxiassur.com/prospect/${lead.access_token}`;
    }
    return 'https://taxiassur.com/espace-client';
  };

  const replaceVariables = (text: string, missingDocs?: string[]) => {
    const prospectLink = getProspectLink();

    let missingDocsText = '';
    if (missingDocs && missingDocs.length > 0) {
      missingDocsText = missingDocs.map(doc => `- ${doc}`).join('\n');
    } else {
      missingDocsText = `- Carte grise du vehicule
- Permis de conduire
- Licence taxi / ADS
- Piece d'identite
- RIB`;
    }

    return text
      .replace(/\{\{first_name\}\}/g, lead.first_name || 'Monsieur/Madame')
      .replace(/\{\{last_name\}\}/g, lead.last_name || '')
      .replace(/\{\{company_name\}\}/g, lead.company_name || '')
      .replace(/\{\{city\}\}/g, lead.city || '')
      .replace(/\{\{prospect_link\}\}/g, prospectLink)
      .replace(/\{\{upload_link\}\}/g, prospectLink)
      .replace(/\{\{missing_documents\}\}/g, missingDocsText);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: CustomAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Vérifier la taille (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(`Le fichier "${file.name}" est trop volumineux (max 10MB)`);
        continue;
      }

      const attachment: CustomAttachment = {
        id: `${Date.now()}-${i}`,
        file,
        name: file.name,
        size: file.size,
        uploading: false,
        uploaded: false
      };

      newAttachments.push(attachment);
    }

    setCustomAttachments(prev => [...prev, ...newAttachments]);

    // Reset input
    e.target.value = '';
  };

  const uploadFile = async (attachment: CustomAttachment): Promise<string | null> => {
    try {
      // Mettre à jour l'état uploading
      setCustomAttachments(prev =>
        prev.map(a => a.id === attachment.id ? { ...a, uploading: true, error: undefined } : a)
      );

      const result = await nativeAdminUploadLeadDocument(lead.id, 'custom', attachment.file, `Piece jointe email - ${attachment.name}`);
      const uploadedPath = result.document?.file_path || result.path;
      if (!uploadedPath) throw new Error('upload_failed');

      // Mettre à jour l'état uploaded
      setCustomAttachments(prev =>
        prev.map(a => a.id === attachment.id ? { ...a, uploading: false, uploaded: true, path: uploadedPath } : a)
      );

      return uploadedPath;
    } catch (err) {
      console.error('Upload error:', err);
      setCustomAttachments(prev =>
        prev.map(a => a.id === attachment.id ? { ...a, uploading: false, error: 'Erreur d\'upload' } : a)
      );
      return null;
    }
  };

  const removeAttachment = (id: string) => {
    setCustomAttachments(prev => prev.filter(a => a.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Le sujet et le message sont obligatoires');
      return;
    }

    setSending(true);
    setError('');

    try {
      // 1. Upload custom attachments first
      const customPaths = await Promise.all(customAttachments.map((attachment) =>
        attachment.uploaded && attachment.path ? Promise.resolve(attachment.path) : uploadFile(attachment)
      ));
      if (customPaths.some((path) => !path)) throw new Error("Une pièce jointe n''a pas pu être chargée");

      // 2. Prepare all attachments
      const legalAttachments = selectedLegalDocs.map(doc => ({
        filename: doc.name,
        reference_id: doc.id,
        path: doc.file_path,
        type: 'legal'
      }));

      const leadAttachments = selectedLeadDocs.map(doc => ({
        filename: doc.name,
        reference_id: doc.id,
        path: doc.file_path,
        url: doc.file_url,
        bucket: doc.bucket,
        type: 'lead_document'
      }));

      const customAttachmentsData = customAttachments.map((attachment, index) => ({
        filename: attachment.name,
        path: customPaths[index] as string,
        bucket: 'email-attachments' as const,
        type: 'custom' as const
      }));

      const allAttachments = [...legalAttachments, ...leadAttachments, ...customAttachmentsData];

      const deliverySignature = JSON.stringify({ leadId: lead.id, to: lead.email.trim().toLowerCase(), subject: subject.trim(), body, attachments: allAttachments.map(({ filename, path, type }) => ({ filename, path, type })) });
      const requestId = getDeliveryRequestId('email', deliverySignature);

      // 3. Send email
      const sendResult = await nativeAdminCall<{ ok?: boolean; queued?: boolean }>(
        `/v1/admin/leads/${encodeURIComponent(lead.id)}/commercial-email`,
        {
          method: 'POST',
          body: JSON.stringify({
            subject,
            content: body,
            attachments: allAttachments.length > 0 ? allAttachments : undefined,
            request_id: requestId,
          })
        }
      );
      if (!sendResult.ok || !sendResult.queued) throw new Error("Erreur lors de l'envoi");



      clearDeliveryRequestId('email', deliverySignature);
      setSuccess(true);
      setTimeout(() => {
        if (onEmailSent) onEmailSent();
        onClose();
        setSuccess(false);
        setSubject('');
        setBody('');
        setSelectedLegalDocs([]);
        setSelectedLeadDocs([]);
        setCustomAttachments([]);
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
                  Variables : {'{{first_name}}'}, {'{{last_name}}'}, {'{{prospect_link}}'} (espace personnel complet), {'{{missing_documents}}'}
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

              {/* Section Documents du Lead */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowLeadDocs(!showLeadDocs)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 transition-colors flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">
                      Documents, Devis & Contrats du Lead
                    </span>
                    {selectedLeadDocs.length > 0 && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        {selectedLeadDocs.length} sélectionné{selectedLeadDocs.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {showLeadDocs ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {showLeadDocs && (
                  <div className="p-4 border-t border-gray-200">
                    <LeadDocumentsSelector
                      leadId={lead.id}
                      onDocumentsSelected={setSelectedLeadDocs}
                      selectedDocuments={selectedLeadDocs}
                    />
                  </div>
                )}
              </div>

              {selectedLeadDocs.length > 0 && !showLeadDocs && (
                <div className="flex flex-wrap gap-2">
                  {selectedLeadDocs.map(doc => (
                    <span
                      key={doc.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full border border-blue-200"
                    >
                      <FileText className="w-4 h-4" />
                      {doc.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Custom File Upload Section */}
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50">
                <div className="px-4 py-3 bg-white border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Pièces jointes personnalisées</span>
                    {customAttachments.length > 0 && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        {customAttachments.length}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <label
                    htmlFor="custom-file-upload"
                    className="flex flex-col items-center justify-center px-4 py-6 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                  >
                    <Upload className="w-8 h-8 text-blue-500 mb-2" />
                    <span className="text-sm font-medium text-gray-700 mb-1">
                      Cliquez pour téléverser des fichiers
                    </span>
                    <span className="text-xs text-gray-500">
                      PDF, Word, Excel, Images (max 10MB par fichier)
                    </span>
                    <input
                      id="custom-file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>

                  {customAttachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {customAttachments.map(attachment => (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200"
                        >
                          <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {attachment.name}
                              </p>
                              {attachment.uploading && (
                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                              )}
                              {attachment.uploaded && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500">
                                {formatFileSize(attachment.size)}
                              </p>
                              {attachment.error && (
                                <span className="text-xs text-red-600">
                                  {attachment.error}
                                </span>
                              )}
                              {attachment.uploaded && (
                                <span className="text-xs text-green-600">
                                  ✓ Prêt à envoyer
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(attachment.id)}
                            className="p-1.5 hover:bg-red-50 rounded transition-colors"
                            disabled={attachment.uploading}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
