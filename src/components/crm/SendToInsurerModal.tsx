import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Send, Loader2, Paperclip, Check, AlertCircle, Mail } from 'lucide-react';
import { toast } from '@/lib/toast';

interface InsurerContact {
  id: string;
  company_id: string;
  full_name: string;
  email: string;
  position?: string;
  company_name?: string;
}
interface InsuranceCompanyJoin {
  name?: string | null;
}

interface InsurerContactRow {
  id: string;
  company_id: string;
  full_name: string;
  email: string;
  position?: string | null;
  insurance_companies?: InsuranceCompanyJoin | InsuranceCompanyJoin[] | null;
}

interface DocumentItem {
  id: string;
  file_name: string;
  file_path: string;
  mime_type?: string | null;
  document_type: string;
  source: 'prospect' | 'crm';
}

interface SendToInsurerModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
}

function getDocumentContentType(fileName?: string) {
  const lower = (fileName || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

function getCompanyNameFromJoin(join?: InsuranceCompanyJoin | InsuranceCompanyJoin[] | null) {
  if (Array.isArray(join)) return join[0]?.name || '';
  return join?.name || '';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erreur inconnue';
}
export default function SendToInsurerModal({
  isOpen,
  onClose,
  leadId,
  leadName
}: SendToInsurerModalProps) {
  const [contacts, setContacts] = useState<InsurerContact[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [additionalMessage, setAdditionalMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadContacts();
      loadDocuments();
    }
  }, [isOpen, leadId]);

  async function loadContacts() {
    setLoadingContacts(true);
    try {
      const { data, error } = await supabase
        .from('insurance_company_contacts')
        .select('id, company_id, full_name, email, position, insurance_companies(name)')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;

      const mapped = ((data || []) as InsurerContactRow[]).map((c) => ({
        id: c.id,
        company_id: c.company_id,
        full_name: c.full_name,
        email: c.email,
        position: c.position || undefined,
        company_name: getCompanyNameFromJoin(c.insurance_companies)
      }));
      setContacts(mapped);

      if (mapped.length > 0) {
        setSelectedContactId(mapped[0].id);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  }

  async function loadDocuments() {
    setLoadingDocs(true);
    try {
      const [prospectRes, crmRes] = await Promise.all([
        supabase
          .from('prospect_documents')
          .select('id, file_name, file_path, mime_type, document_type')
          .eq('lead_id', leadId)
          .not('file_path', 'is', null),
        supabase
          .from('crm_lead_documents')
          .select('id, file_name, file_path, mime_type, document_type')
          .eq('lead_id', leadId)
          .not('file_path', 'is', null)
      ]);

      const allDocs: DocumentItem[] = [];

      if (prospectRes.data) {
        for (const d of prospectRes.data) {
          if (d.file_path) {
            allDocs.push({ ...d, source: 'prospect' });
          }
        }
      }

      if (crmRes.data) {
        for (const d of crmRes.data) {
          if (d.file_path) {
            allDocs.push({ ...d, source: 'crm' });
          }
        }
      }

      setDocuments(allDocs);
      setSelectedDocs(new Set(allDocs.map(d => d.id)));
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoadingDocs(false);
    }
  }

  function toggleDoc(docId: string) {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  }

  function selectAllDocs() {
    setSelectedDocs(new Set(documents.map(d => d.id)));
  }

  function deselectAllDocs() {
    setSelectedDocs(new Set());
  }

  async function handleSend() {
    const contact = contacts.find(c => c.id === selectedContactId);
    const recipientEmail = (useCustom ? customEmail : contact?.email || '').trim().toLowerCase();
    const recipientName = (useCustom ? customName : contact?.full_name || '').trim();
    const companyName = useCustom ? 'Destinataire personnalise' : contact?.company_name || 'Assureur';

    if (!recipientEmail) {
      toast.error('Veuillez saisir un email destinataire');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      toast.error('Veuillez saisir un email destinataire valide');
      return;
    }

    if (selectedDocs.size === 0) {
      toast.error('Veuillez selectionner au moins un document');
      return;
    }

    setSending(true);
    try {
      const docsToSend = documents.filter(d => selectedDocs.has(d.id));
      const docsPayload = docsToSend.map(d => ({
        id: d.id,
        file_name: d.file_name || 'document.pdf',
        file_path: d.file_path,
        bucket: d.source === 'prospect' ? 'prospect-documents' : 'crm-documents',
        document_type: d.document_type || 'document',
        source: d.source,
        contentType: d.mime_type || getDocumentContentType(d.file_name)
      }));

      const { data, error } = await supabase.rpc('create_insurer_dossier_send', {
        p_lead_id: leadId,
        p_company_id: useCustom ? null : contact?.company_id || null,
        p_contact_id: useCustom ? null : selectedContactId || null,
        p_recipient_email: recipientEmail,
        p_recipient_name: recipientName || null,
        p_company_name: companyName,
        p_subject: `Demande de saisie devis - ${leadName || 'Prospect'}`,
        p_message: additionalMessage.trim() || null,
        p_documents: docsPayload
      });

      if (error) throw error;

      const result = data as { success?: boolean; send_id?: string; error?: string } | null;
      if (!result?.success) {
        throw new Error(result?.error || 'Mise en file refusee');
      }

      toast.success(`Dossier mis en file pour ${recipientName || recipientEmail} - Relances J+2/J+5 activees`);
      onClose();
    } catch (error: unknown) {
      console.error('Error queueing insurer dossier:', error);
      toast.error(`Erreur lors de la mise en file : ${getErrorMessage(error)}`);
    } finally {
      setSending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Mail className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Transmettre le dossier</h2>
              <p className="text-sm text-gray-600">File auditee avec Relances J+2/J+5</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
            <p className="text-sm text-blue-900">
              La demande est enregistree en base puis envoyee par le worker securise. Les relances sont stoppees des qu'une reponse assureur est marquee.
            </p>
          </div>
          {/* Recipient */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Destinataire</label>

            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setUseCustom(false)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${!useCustom ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
              >
                Contact existant
              </button>
              <button
                onClick={() => setUseCustom(true)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${useCustom ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
              >
                Email personnalise
              </button>
            </div>

            {!useCustom ? (
              loadingContacts ? (
                <div className="flex items-center gap-2 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500">Chargement...</span>
                </div>
              ) : (
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} - {c.full_name} ({c.email}) {c.position ? `- ${c.position}` : ''}
                    </option>
                  ))}
                </select>
              )
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Nom du destinataire"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <input
                  type="email"
                  placeholder="Email du destinataire"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            )}
          </div>

          {/* Documents */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Documents a joindre ({selectedDocs.size}/{documents.length})
              </label>
              <div className="flex gap-2">
                <button onClick={selectAllDocs} className="text-xs text-blue-600 hover:underline">Tout selectionner</button>
                <button onClick={deselectAllDocs} className="text-xs text-gray-500 hover:underline">Tout deselectionner</button>
              </div>
            </div>

            {loadingDocs ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">Chargement des documents...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="flex items-center gap-2 py-4 px-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-800">Aucun document disponible pour ce prospect</span>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-100">
                {documents.map(doc => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocs.has(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                      className="h-4 w-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                    />
                    <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{doc.file_name}</p>
                      <p className="text-xs text-gray-500">{doc.document_type || 'document'} - {doc.source === 'prospect' ? 'Upload prospect' : 'CRM'}</p>
                    </div>
                    {selectedDocs.has(doc.id) && (
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Additional message */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Message complementaire (optionnel)</label>
            <textarea
              value={additionalMessage}
              onChange={(e) => setAdditionalMessage(e.target.value)}
              placeholder="Ex: Devis tous risques souhaite, vehicule Toyota Prius 2023..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSend}
            disabled={sending || selectedDocs.size === 0}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Mise en file...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Mettre en file ({selectedDocs.size} doc{selectedDocs.size > 1 ? 's' : ''})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
