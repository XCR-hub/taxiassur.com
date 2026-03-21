import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, MessageSquare, Phone, Send, CheckCircle2, AlertCircle, Loader2, FileText, Download, Plus, X } from 'lucide-react';
import DocumentValidationComplete from './DocumentValidationComplete';
import { toast } from '@/lib/toast';

interface CollecteDocumentsStepProps {
  leadId: string;
  leadEmail?: string;
  leadPhone?: string;
  leadFirstName?: string;
  leadAccessToken?: string;
  onComplete?: () => void;
}

interface CommunicationTemplate {
  id: string;
  template_key: string;
  template_name: string;
  channel: 'email' | 'sms' | 'whatsapp';
  subject?: string;
  body_text: string;
  variables: string[];
}

interface DocumentStats {
  total: number;
  validated: number;
  pending: number;
  required: number;
}

interface DocumentInfo {
  type: string;
  label: string;
  status: string;
}

export default function CollecteDocumentsStep({
  leadId,
  leadEmail,
  leadPhone,
  leadFirstName,
  leadAccessToken,
  onComplete
}: CollecteDocumentsStepProps) {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState<DocumentStats>({
    total: 0,
    validated: 0,
    pending: 0,
    required: 6
  });
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [actualFirstName, setActualFirstName] = useState<string>(leadFirstName || '');
  const [customDocuments, setCustomDocuments] = useState<string[]>([]);
  const [newCustomDoc, setNewCustomDoc] = useState<string>('');
  const [showCustomDocInput, setShowCustomDocInput] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadDocumentStats();
    loadCustomDocuments();
    if (!leadFirstName) {
      loadLeadName();
    }
  }, [leadId]);

  async function loadLeadName() {
    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('first_name, last_name, full_name, email')
        .eq('id', leadId)
        .single();

      if (error) throw error;

      // Try multiple sources for the name
      const firstName = data?.first_name
        || data?.full_name?.split(' ')[0]
        || data?.email?.split('@')[0]
        || 'Madame, Monsieur';

      setActualFirstName(firstName);
    } catch (error) {
      console.error('Error loading lead name:', error);
      setActualFirstName('Madame, Monsieur');
    }
  }

  useEffect(() => {
    // Check if complete
    if (stats.validated >= stats.required && stats.validated > 0) {
      onComplete?.();
    }
  }, [stats]);

  async function loadTemplates() {
    try {
      const { data, error } = await supabase
        .from('crm_communication_templates')
        .select('*')
        .eq('stage', 'collecte_documents')
        .eq('is_active', true)
        .order('channel');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  async function loadDocumentStats() {
    try {
      const { data, error } = await supabase
        .from('crm_lead_documents')
        .select('document_type, status, custom_label')
        .eq('lead_id', leadId);

      if (error) throw error;

      // Mapping des types de documents vers leurs labels français
      const documentLabels: Record<string, string> = {
        'licence_taxi': 'Licence de taxi',
        'permis_conduire': 'Permis de conduire',
        'carte_grise': 'Carte grise du véhicule',
        'releve_information': 'Relevé d\'information',
        'rib': 'RIB',
        'carte_professionnelle': 'Carte professionnelle'
      };

      const documentsList: DocumentInfo[] = data?.map(d => ({
        type: d.document_type,
        label: d.custom_label || documentLabels[d.document_type] || d.document_type,
        status: d.status
      })) || [];

      setDocuments(documentsList);

      const total = data?.length || 0;
      const validated = data?.filter(d => d.status === 'validated').length || 0;
      const pending = data?.filter(d => d.status === 'pending').length || 0;

      setStats({
        total,
        validated,
        pending,
        required: 6
      });
    } catch (error) {
      console.error('Error loading document stats:', error);
    }
  }

  async function loadCustomDocuments() {
    try {
      const { data, error } = await supabase
        .from('crm_lead_documents')
        .select('custom_label')
        .eq('lead_id', leadId)
        .eq('document_type', 'custom')
        .not('custom_label', 'is', null);

      if (error) throw error;

      const customDocs = data?.map(d => d.custom_label).filter(Boolean) || [];
      setCustomDocuments(customDocs as string[]);
    } catch (error) {
      console.error('Error loading custom documents:', error);
    }
  }

  async function addCustomDocument() {
    if (!newCustomDoc.trim()) {
      toast.warning('Veuillez saisir un nom de document');
      return;
    }

    try {
      // Ajouter le document personnalisé à la base
      const { error } = await supabase
        .from('crm_lead_documents')
        .insert({
          lead_id: leadId,
          document_type: 'custom',
          custom_label: newCustomDoc.trim(),
          status: 'missing'
        });

      if (error) throw error;

      // Recharger les données
      await loadDocumentStats();
      await loadCustomDocuments();

      // Reset
      setNewCustomDoc('');
      setShowCustomDocInput(false);
      toast.success(`✅ Document "${newCustomDoc}" ajouté à la liste`);
    } catch (error: any) {
      console.error('Error adding custom document:', error);
      toast.error(`❌ Erreur: ${error.message}`);
    }
  }

  async function removeCustomDocument(docLabel: string) {
    if (!confirm(`Supprimer le document "${docLabel}" de la liste ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('crm_lead_documents')
        .delete()
        .eq('lead_id', leadId)
        .eq('document_type', 'custom')
        .eq('custom_label', docLabel);

      if (error) throw error;

      await loadDocumentStats();
      await loadCustomDocuments();
      toast.success(`✅ Document "${docLabel}" supprimé`);
    } catch (error: any) {
      console.error('Error removing custom document:', error);
      toast.error(`❌ Erreur: ${error.message}`);
    }
  }


  async function sendCommunication(template: CommunicationTemplate) {
    if (!leadEmail && template.channel === 'email') {
      toast.warning('Aucun email disponible pour ce lead');
      return;
    }

    if (!leadPhone && (template.channel === 'sms' || template.channel === 'whatsapp')) {
      toast.warning('Aucun téléphone disponible pour ce lead');
      return;
    }

    setSending(true);

    try {
      // Replace variables in template
      const prospectSpaceUrl = leadAccessToken
        ? `${window.location.origin}/espace-prospect?token=${leadAccessToken}`
        : `${window.location.origin}/espace-prospect`;

      // Générer la liste des documents non validés
      const missingDocs = documents.filter(d => d.status !== 'validated');
      const documentsList = missingDocs.length > 0
        ? missingDocs.map(d => `- ${d.label}`).join('\n')
        : '- Licence de taxi\n- Permis de conduire\n- Carte grise du véhicule\n- Relevé d\'information\n- RIB\n- Carte professionnelle';

      // Utiliser le prénom chargé depuis la base ou fourni en prop
      const firstName = actualFirstName || 'Madame, Monsieur';

      let messageContent = template.body_text
        .replace(/\{\{first_name\}\}/g, firstName)
        .replace(/\{\{prospect_space_url\}\}/g, prospectSpaceUrl)
        // Remplacer la liste fixe par la liste dynamique
        .replace(/- Licence de taxi\n- Permis de conduire\n- Carte grise du véhicule\n- Relevé d'information\n- RIB\n- Carte professionnelle/g, documentsList);

      let subject = template.subject
        ?.replace(/\{\{first_name\}\}/g, firstName);

      if (template.channel === 'email') {
        // Send email via edge function
        const htmlContent = messageContent.replace(/\n/g, '<br>');

        console.log('📧 Envoi email:', { to: leadEmail, subject, contentLength: htmlContent.length });

        const { data: emailResult, error } = await supabase.functions.invoke('send-crm-email', {
          body: {
            to: leadEmail,
            to_email: leadEmail,
            subject: subject || 'Documents nécessaires - TaxiAssur',
            content: htmlContent,
            body: htmlContent,
            lead_id: leadId
          }
        });

        // Vérifier l'erreur ET le résultat
        if (error || !emailResult?.success) {
          const errorMsg = error?.message || emailResult?.error || 'Erreur inconnue';
          throw new Error(`Email non envoyé: ${errorMsg}`);
        }

        // Log interaction
        await supabase
          .from('crm_interactions')
          .insert({
            lead_id: leadId,
            type: 'email',
            channel: 'email',
            subject: subject,
            body: messageContent,
            status: 'sent',
            metadata: { template_key: template.template_key }
          });

      } else if (template.channel === 'sms') {
        // Send SMS
        const { data: smsResult, error } = await supabase.functions.invoke('send-sms', {
          body: {
            to: leadPhone,
            message: messageContent,
            leadId: leadId
          }
        });

        // Vérifier l'erreur ET le résultat
        if (error || !smsResult?.success) {
          const errorMsg = error?.message || smsResult?.error || 'Erreur inconnue';
          throw new Error(`SMS non envoyé: ${errorMsg}`);
        }

        await supabase
          .from('crm_interactions')
          .insert({
            lead_id: leadId,
            type: 'sms',
            channel: 'sms',
            body: messageContent,
            status: 'sent',
            metadata: { template_key: template.template_key }
          });

      } else if (template.channel === 'whatsapp') {
        // Send WhatsApp
        const { data: waResult, error } = await supabase.functions.invoke('send-whatsapp', {
          body: {
            to: leadPhone,
            message: messageContent,
            leadId: leadId
          }
        });

        // Vérifier l'erreur ET le résultat
        if (error || !waResult?.success) {
          const errorMsg = error?.message || waResult?.error || 'Erreur inconnue';
          throw new Error(`WhatsApp non envoyé: ${errorMsg}`);
        }

        await supabase
          .from('crm_interactions')
          .insert({
            lead_id: leadId,
            type: 'whatsapp',
            channel: 'whatsapp',
            body: messageContent,
            status: 'sent',
            metadata: { template_key: template.template_key }
          });
      }

      toast.success(`✅ ${template.channel.toUpperCase()} envoyé avec succès !`);
      setSelectedTemplate(null);

    } catch (error: any) {
      console.error('Error sending communication:', error);
      toast.error(`❌ Erreur lors de l'envoi\n\n${error.message || 'Erreur inconnue'}`);
    } finally {
      setSending(false);
    }
  }

  const progressPercent = stats.required > 0
    ? Math.round((stats.validated / stats.required) * 100)
    : 0;

  const prospectSpaceUrl = leadAccessToken
    ? `${window.location.origin}/espace-prospect?token=${leadAccessToken}`
    : `${window.location.origin}/espace-prospect`;

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Progression des Documents
          </h3>
          <div className="flex items-center gap-2">
            {progressPercent === 100 ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-orange-600" />
            )}
            <span className="text-2xl font-bold text-gray-900">
              {progressPercent}%
            </span>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              progressPercent === 100 ? 'bg-green-600' : 'bg-blue-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.validated}</div>
            <div className="text-sm text-gray-600">Validés</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">En attente</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-400">{stats.required - stats.validated}</div>
            <div className="text-sm text-gray-600">Manquants</div>
          </div>
        </div>
      </div>

      {/* Documents Personnalisés */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Documents Complémentaires
          </h3>
          <button
            onClick={() => setShowCustomDocInput(!showCustomDocInput)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Ajouter un document
          </button>
        </div>

        {showCustomDocInput && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom du document complémentaire
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCustomDoc}
                onChange={(e) => setNewCustomDoc(e.target.value)}
                placeholder="Ex: Attestation d'assurance précédente"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addCustomDocument();
                  }
                }}
              />
              <button
                onClick={addCustomDocument}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Ajouter
              </button>
              <button
                onClick={() => {
                  setShowCustomDocInput(false);
                  setNewCustomDoc('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Annuler
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Ces documents seront automatiquement inclus dans la demande par email/SMS/WhatsApp
            </p>
          </div>
        )}

        {customDocuments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 mb-2">Documents complémentaires ajoutés :</p>
            {customDocuments.map((doc, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-gray-900">{doc}</span>
                </div>
                <button
                  onClick={() => removeCustomDocument(doc)}
                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                  title="Supprimer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Communication Templates */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Demander les Documents
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedTemplate?.id === template.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                {template.channel === 'email' && <Mail className="h-5 w-5 text-blue-600" />}
                {template.channel === 'sms' && <MessageSquare className="h-5 w-5 text-green-600" />}
                {template.channel === 'whatsapp' && <Phone className="h-5 w-5 text-green-600" />}
                <span className="font-medium text-gray-900">{template.channel.toUpperCase()}</span>
              </div>
              <p className="text-sm text-gray-600">{template.template_name}</p>
            </button>
          ))}
        </div>

        {selectedTemplate && (
          <div className="border-t pt-4">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              {selectedTemplate.subject && (
                <div className="mb-2">
                  <span className="text-xs font-semibold text-gray-600 uppercase">Sujet:</span>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedTemplate.subject.replace(/\{\{first_name\}\}/g, leadFirstName || 'Madame, Monsieur')}
                  </p>
                </div>
              )}
              <div>
                <span className="text-xs font-semibold text-gray-600 uppercase">Message:</span>
                <p className="text-sm text-gray-900 whitespace-pre-line mt-1">
                  {(() => {
                    const missingDocs = documents.filter(d => d.status !== 'validated');
                    const documentsList = missingDocs.length > 0
                      ? missingDocs.map(d => `- ${d.label}`).join('\n')
                      : '- Licence de taxi\n- Permis de conduire\n- Carte grise du véhicule\n- Relevé d\'information\n- RIB\n- Carte professionnelle';

                    return selectedTemplate.body_text
                      .replace(/\{\{first_name\}\}/g, leadFirstName || 'Madame, Monsieur')
                      .replace(/\{\{prospect_space_url\}\}/g, prospectSpaceUrl || 'https://taxiassur.fr/espace-prospect')
                      .replace(/- Licence de taxi\n- Permis de conduire\n- Carte grise du véhicule\n- Relevé d'information\n- RIB\n- Carte professionnelle/g, documentsList);
                  })()}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => sendCommunication(selectedTemplate)}
                disabled={sending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Envoyer
                  </>
                )}
              </button>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Document Validation Complete avec Drag & Drop */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <DocumentValidationComplete
          caseId={leadId}
          leadEmail={leadEmail}
          leadFirstName={leadFirstName}
          onDocumentClassified={() => {
            loadDocumentStats();
          }}
        />
      </div>

      {/* Lien Espace Prospect */}
      {leadAccessToken && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-2">Lien Espace Prospect</h4>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/espace-prospect?token=${leadAccessToken}`}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded text-gray-700"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/espace-prospect?token=${leadAccessToken}`);
                    toast.success('Lien copié !');
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Copier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
