import { useState, useEffect, useMemo } from 'react';
import { Mail, MessageSquare, Phone, Send, CheckCircle2, AlertCircle, Loader2, FileText, Download, Plus, X, CreditCard as Edit3 } from 'lucide-react';
import DocumentValidationComplete from './DocumentValidationComplete';
import { toast } from '@/lib/toast';
import { getRequiredDocuments } from '@/lib/document-requirements';
import { nativeAdminCall } from '@/lib/native-admin-data';

interface CollecteDocumentsStepProps {
  leadId: string;
  leadEmail?: string;
  leadPhone?: string;
  leadFirstName?: string;
  leadAccessToken?: string;
  vehicleType?: string;
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
  categoriesValidated: number;
  categoriesPending: number;
  categoriesMissing: number;
  totalRequired: number;
  pendingDocsCount: number;
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
  vehicleType,
  onComplete
}: CollecteDocumentsStepProps) {
  const requiredDocs = useMemo(() => getRequiredDocuments(vehicleType), [vehicleType]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState<DocumentStats>({
    categoriesValidated: 0,
    categoriesPending: 0,
    categoriesMissing: 0,
    totalRequired: 0,
    pendingDocsCount: 0
  });
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [actualFirstName, setActualFirstName] = useState<string>(leadFirstName || '');
  const [customDocuments, setCustomDocuments] = useState<string[]>([]);
  const [newCustomDoc, setNewCustomDoc] = useState<string>('');
  const [showCustomDocInput, setShowCustomDocInput] = useState(false);
  const [editableSubject, setEditableSubject] = useState('');
  const [editableBody, setEditableBody] = useState('');

  useEffect(() => {
    loadTemplates();
    loadDocumentStats();
    loadCustomDocuments();
    if (!leadFirstName) {
      loadLeadName();
    }
  }, [leadId, vehicleType]);

  async function loadLeadName() {
    try {
      const native = await nativeAdminCall<{ lead?: { first_name?: string; full_name?: string; email?: string } }>(`/v1/admin/leads/${encodeURIComponent(leadId)}/document-collection`);
      const nativeLead = native.lead;
      setActualFirstName(nativeLead?.first_name || nativeLead?.full_name?.split(' ')[0] || nativeLead?.email?.split('@')[0] || 'Madame, Monsieur');
    } catch (error) {
      console.error('Error loading lead name:', error);
      setActualFirstName('Madame, Monsieur');
    }
  }

  useEffect(() => {
    if (stats.categoriesValidated >= stats.totalRequired && stats.categoriesValidated > 0) {
      onComplete?.();
    }
  }, [stats]);

  async function loadTemplates() {
    try {
      const native = await nativeAdminCall<{ templates?: CommunicationTemplate[] }>(`/v1/admin/leads/${encodeURIComponent(leadId)}/document-collection`);
      setTemplates(native.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  async function loadDocumentStats() {
    try {
      {
      const native = await nativeAdminCall<{ documents?: Array<{ document_type?: string; status?: string; custom_label?: string }> }>(`/v1/admin/documents?lead_id=${encodeURIComponent(leadId)}&scope=all`);
      const nativeDocuments = native.documents || [];
      const documentLabels: Record<string, string> = {};
      requiredDocs.forEach(d => { documentLabels[d.type] = d.label; });
      const documentsList: DocumentInfo[] = nativeDocuments.map(d => ({
        type: d.document_type || 'custom',
        label: d.custom_label || documentLabels[d.document_type || ''] || d.document_type || 'Document',
        status: d.status || 'pending',
      }));
      setDocuments(documentsList);
      const categoryStatus = new Map<string, Set<string>>();
      documentsList.forEach(d => {
        const key = d.type === 'custom' ? `custom_${d.label}` : d.type;
        if (!categoryStatus.has(key)) categoryStatus.set(key, new Set());
        categoryStatus.get(key)!.add(d.status);
      });
      let categoriesValidated = 0;
      let categoriesPending = 0;
      requiredDocs.forEach(reqDoc => {
        const statuses = categoryStatus.get(reqDoc.type);
        if (statuses?.has('validated') || statuses?.has('verified')) categoriesValidated++;
        else if (statuses?.size) categoriesPending++;
      });
      setStats({
        categoriesValidated,
        categoriesPending,
        categoriesMissing: requiredDocs.length - categoriesValidated - categoriesPending,
        totalRequired: requiredDocs.length,
        pendingDocsCount: documentsList.filter(d => d.status === 'pending').length,
      });
      }
    } catch (error) {
      console.error('Error loading document stats:', error);
    }
  }

  async function loadCustomDocuments() {
    try {
      const native = await nativeAdminCall<{ documents?: Array<{ document_type?: string; custom_label?: string }> }>(`/v1/admin/documents?lead_id=${encodeURIComponent(leadId)}&scope=all`);
      setCustomDocuments((native.documents || []).filter(d => d.document_type === 'custom' && d.custom_label).map(d => String(d.custom_label)));
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
      await nativeAdminCall(`/v1/admin/leads/${encodeURIComponent(leadId)}/document-collection`, {
        method: 'POST',
        body: JSON.stringify({ action: 'add_custom', label: newCustomDoc.trim() }),
      });

      // Recharger les données
      await loadDocumentStats();
      await loadCustomDocuments();

      // Reset
      setNewCustomDoc('');
      setShowCustomDocInput(false);
      toast.success(`✅ Document "${newCustomDoc}" ajouté à la liste`);
    } catch (error) {
      console.error('Error adding custom document:', error);
      toast.error(`❌ Erreur: ${error.message}`);
    }
  }

  async function removeCustomDocument(docLabel: string) {
    if (!confirm(`Supprimer le document "${docLabel}" de la liste ?`)) {
      return;
    }

    try {
      await nativeAdminCall(`/v1/admin/leads/${encodeURIComponent(leadId)}/document-collection`, {
        method: 'POST',
        body: JSON.stringify({ action: 'remove_custom', label: docLabel }),
      });

      await loadDocumentStats();
      await loadCustomDocuments();
      toast.success(`✅ Document "${docLabel}" supprimé`);
    } catch (error) {
      console.error('Error removing custom document:', error);
      toast.error(`❌ Erreur: ${error.message}`);
    }
  }


  const prospectSpaceUrl = leadAccessToken
    ? `${window.location.origin}/espace-prospect?token=${leadAccessToken}`
    : `${window.location.origin}/espace-prospect`;

  const vehicleLabel = useMemo(() => {
    if (!vehicleType) return 'taxi';
    const n = vehicleType.toLowerCase().trim();
    if (n === 'vtc') return 'VTC';
    if (n === 'moto-taxi') return 'moto-taxi';
    return 'taxi';
  }, [vehicleType]);

  const missingDocLabels = useMemo(() => {
    const validatedTypes = new Set(
      documents.filter(d => d.status === 'validated').map(d => d.type)
    );
    const missing = requiredDocs.filter(d => !validatedTypes.has(d.type));
    const customMissing = documents
      .filter(d => d.type === 'custom' && d.status !== 'validated')
      .map(d => d.label);
    return [...missing.map(d => d.label), ...customMissing];
  }, [documents, requiredDocs]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const firstName = actualFirstName || 'Madame, Monsieur';
    const docList = missingDocLabels.length > 0
      ? missingDocLabels.map(l => `- ${l}`).join('\n')
      : '- Tous les documents sont valides';

    const defaultDocList = '- Licence de taxi\n- Permis de conduire\n- Carte grise du véhicule\n- Releve d\'information\n- RIB\n- Carte professionnelle';

    let body = selectedTemplate.body_text
      .replace(/\{\{first_name\}\}/g, firstName)
      .replace(/\{\{prospect_space_url\}\}/g, prospectSpaceUrl || 'https://taxiassur.fr/espace-prospect');

    if (body.includes(defaultDocList)) {
      body = body.replace(defaultDocList, docList);
    } else {
      body = body.replace(/- Licence de taxi[\s\S]*?- Carte professionnelle/g, docList);
    }

    body = body.replace(/\bassurance taxi\b/gi, `assurance ${vehicleLabel}`);
    body = body.replace(/\btaxi\b/gi, vehicleLabel);

    setEditableBody(body);

    let subject = selectedTemplate.subject?.replace(/\{\{first_name\}\}/g, firstName)
      || `Documents necessaires - TaxiAssur`;
    subject = subject.replace(/\bassurance taxi\b/gi, `assurance ${vehicleLabel}`);
    subject = subject.replace(/\btaxi\b/gi, vehicleLabel);
    setEditableSubject(subject);
  }, [selectedTemplate, missingDocLabels, actualFirstName, prospectSpaceUrl, vehicleLabel]);

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
      const messageContent = editableBody;
      const subject = editableSubject;

      if (template.channel === 'email') {
        const emailResult = await nativeAdminCall<{ ok?: boolean; email_queued?: boolean }>(
          `/v1/admin/leads/${encodeURIComponent(leadId)}/document-collection`, {
            method: 'POST',
            body: JSON.stringify({
              action: 'send_email',
              subject: subject || 'Documents necessaires - TaxiAssur',
              message: messageContent,
              template_key: template.template_key,
            }),
          }
        );

        if (!emailResult.ok || !emailResult.email_queued) {
          throw new Error('Email non mis en file d\'envoi');
        }

      } else if (template.channel === 'sms') {
        const smsResult = await nativeAdminCall<{ ok?: boolean }>(
          `/v1/admin/leads/${encodeURIComponent(leadId)}/sms`, {
            method: 'POST',
            body: JSON.stringify({
              action: 'send',
              content: messageContent,
              request_id: crypto.randomUUID(),
            }),
          }
        );

        if (!smsResult.ok) throw new Error('SMS non envoyé');

      } else if (template.channel === 'whatsapp') {
        const waResult = await nativeAdminCall<{ success?: boolean }>(
          `/v1/admin/leads/${encodeURIComponent(leadId)}/whatsapp`, {
            method: 'POST',
            body: JSON.stringify({ content: messageContent, template_key: template.template_key }),
          }
        );
        if (!waResult.success) throw new Error('WhatsApp non envoyé');
      }

      toast.success(`✅ ${template.channel.toUpperCase()} envoyé avec succès !`);
      setSelectedTemplate(null);

    } catch (error) {
      console.error('Error sending communication:', error);
      toast.error(`❌ Erreur lors de l'envoi\n\n${error.message || 'Erreur inconnue'}`);
    } finally {
      setSending(false);
    }
  }

  const progressPercent = stats.totalRequired > 0
    ? Math.round((stats.categoriesValidated / stats.totalRequired) * 100)
    : 0;

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
          <div className="py-3 bg-green-50 rounded-lg border border-green-100">
            <div className="text-2xl font-bold text-green-700">{stats.categoriesValidated}</div>
            <div className="text-xs font-medium text-green-600 mt-0.5">
              {stats.categoriesValidated === 1 ? 'Categorie validee' : 'Categories validees'}
            </div>
            <div className="text-[10px] text-green-500 mt-0.5">sur {stats.totalRequired} requises</div>
          </div>
          <div className="py-3 bg-orange-50 rounded-lg border border-orange-100">
            <div className="text-2xl font-bold text-orange-600">{stats.pendingDocsCount}</div>
            <div className="text-xs font-medium text-orange-600 mt-0.5">
              {stats.pendingDocsCount === 1 ? 'Document en attente' : 'Documents en attente'}
            </div>
            <div className="text-[10px] text-orange-400 mt-0.5">
              {stats.categoriesPending} {stats.categoriesPending === 1 ? 'categorie concernee' : 'categories concernees'}
            </div>
          </div>
          <div className="py-3 bg-red-50 rounded-lg border border-red-100">
            <div className="text-2xl font-bold text-red-500">{stats.categoriesMissing}</div>
            <div className="text-xs font-medium text-red-500 mt-0.5">
              {stats.categoriesMissing === 1 ? 'Categorie manquante' : 'Categories manquantes'}
            </div>
            <div className="text-[10px] text-red-400 mt-0.5">aucun document recu</div>
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
            <div className="flex items-center gap-2 mb-3">
              <Edit3 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Modifiez le message avant envoi</span>
            </div>

            {missingDocLabels.length > 0 && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-800 mb-1.5">
                  Documents demandes ({missingDocLabels.length}) :
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {missingDocLabels.map((label, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-white border border-amber-300 rounded-md text-amber-800">
                      <FileText className="h-3 w-3" />
                      {label}
                    </span>
                  ))}
                </div>
                {documents.some(d => d.status === 'validated') && (
                  <p className="text-[10px] text-green-700 mt-2">
                    {documents.filter(d => d.status === 'validated').length} document(s) deja valide(s) exclus de la demande
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3 mb-4">
              {selectedTemplate.channel === 'email' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Sujet :</label>
                  <input
                    type="text"
                    value={editableSubject}
                    onChange={(e) => setEditableSubject(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Message :</label>
                <textarea
                  value={editableBody}
                  onChange={(e) => setEditableBody(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono leading-relaxed resize-y"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => sendCommunication(selectedTemplate)}
                disabled={sending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
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
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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
