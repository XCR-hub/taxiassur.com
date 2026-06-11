import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Send, Loader2, Building2, Paperclip, Check, AlertCircle, Mail } from 'lucide-react';
import { toast } from '@/lib/toast';

interface InsurerContact {
  id: string;
  company_id: string;
  full_name: string;
  email: string;
  position?: string;
  company_name?: string;
}

interface DocumentItem {
  id: string;
  file_name: string;
  file_url: string;
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

export default function SendToInsurerModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  leadEmail,
  leadPhone
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

      const mapped = (data || []).map((c: any) => ({
        id: c.id,
        company_id: c.company_id,
        full_name: c.full_name,
        email: c.email,
        position: c.position,
        company_name: c.insurance_companies?.name || ''
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
          .select('id, file_name, file_url, document_type')
          .eq('lead_id', leadId)
          .not('file_url', 'is', null),
        supabase
          .from('crm_lead_documents')
          .select('id, file_name, file_url, document_type')
          .eq('lead_id', leadId)
          .not('file_url', 'is', null)
      ]);

      const allDocs: DocumentItem[] = [];

      if (prospectRes.data) {
        for (const d of prospectRes.data) {
          if (d.file_url) {
            allDocs.push({ ...d, source: 'prospect' });
          }
        }
      }

      if (crmRes.data) {
        for (const d of crmRes.data) {
          if (d.file_url) {
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
    const recipientEmail = useCustom ? customEmail.trim() : contact?.email;
    const recipientName = useCustom ? customName.trim() : contact?.full_name;

    if (!recipientEmail) {
      toast.error('Veuillez saisir un email destinataire');
      return;
    }

    if (selectedDocs.size === 0) {
      toast.error('Veuillez selectionner au moins un document');
      return;
    }

    setSending(true);
    try {
      const docsToSend = documents.filter(d => selectedDocs.has(d.id));

      const attachments = docsToSend.map(d => ({
        filename: d.file_name || 'document.pdf',
        url: d.file_url,
        contentType: d.file_name?.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'
      }));

      const docListHtml = docsToSend.map(d =>
        `<li style="margin:4px 0;padding:4px 0;border-bottom:1px solid #eee;">${d.file_name} <span style="color:#666;font-size:12px;">(${d.document_type || 'document'})</span></li>`
      ).join('');

      const htmlContent = `
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
          <div style="background:#1e3a5f;padding:20px 30px;border-radius:8px 8px 0 0;">
            <h2 style="color:#fff;margin:0;font-size:20px;">Demande de saisie devis - TaxiAssur</h2>
          </div>
          <div style="padding:25px 30px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
            <p style="color:#374151;font-size:15px;">Bonjour ${recipientName || ''},</p>
            <p style="color:#374151;font-size:15px;">Veuillez trouver ci-joint le dossier complet pour saisie de devis :</p>

            <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f9fafb;border-radius:6px;overflow:hidden;">
              <tr style="background:#e5e7eb;">
                <td colspan="2" style="padding:10px 15px;font-weight:bold;color:#1f2937;">Informations prospect</td>
              </tr>
              <tr><td style="padding:8px 15px;color:#6b7280;width:140px;">Nom</td><td style="padding:8px 15px;color:#111827;font-weight:500;">${leadName || '-'}</td></tr>
              ${leadEmail ? `<tr><td style="padding:8px 15px;color:#6b7280;">Email</td><td style="padding:8px 15px;color:#111827;">${leadEmail}</td></tr>` : ''}
              ${leadPhone ? `<tr><td style="padding:8px 15px;color:#6b7280;">Telephone</td><td style="padding:8px 15px;color:#111827;">${leadPhone}</td></tr>` : ''}
            </table>

            ${additionalMessage ? `<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 15px;margin:15px 0;border-radius:4px;"><p style="color:#92400e;margin:0;font-size:14px;"><strong>Note :</strong> ${additionalMessage}</p></div>` : ''}

            <div style="margin:20px 0;">
              <p style="color:#374151;font-weight:bold;margin-bottom:8px;">Documents joints (${docsToSend.length}) :</p>
              <ul style="list-style:none;padding:0;margin:0;background:#f3f4f6;border-radius:6px;padding:12px 16px;">
                ${docListHtml}
              </ul>
            </div>

            <p style="color:#374151;font-size:15px;margin-top:20px;">
              Merci de nous transmettre le devis une fois saisi.
            </p>

            <div style="margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb;">
              <p style="color:#6b7280;font-size:13px;margin:0;">
                Cordialement,<br>
                <strong style="color:#374151;">L'equipe TaxiAssur</strong><br>
                <span style="font-size:12px;">Courtier agree ORIAS 11 061 425</span><br>
                <span style="font-size:12px;">Tel : 01 80 85 57 88 | team@taxiassur.com</span>
              </p>
            </div>
          </div>
        </div>
      `;

      const { error } = await supabase.functions.invoke('send-email-ionos', {
        body: {
          to: recipientEmail,
          toName: recipientName || '',
          subject: `Demande de saisie devis - ${leadName || 'Prospect'}`,
          html: htmlContent,
          from: 'team@taxiassur.com',
          fromName: 'TaxiAssur',
          attachments
        }
      });

      if (error) throw error;

      await supabase.from('crm_interactions').insert({
        lead_id: leadId,
        type: 'email',
        channel: 'email',
        subject: `Dossier transmis a ${recipientName} (${contact?.company_name || 'Assureur'})`,
        body: `Email envoye a ${recipientEmail} avec ${docsToSend.length} document(s) joint(s) pour saisie devis.`,
        status: 'sent',
        metadata: {
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          company_name: contact?.company_name || 'Custom',
          documents_count: docsToSend.length,
          document_names: docsToSend.map(d => d.file_name)
        }
      });

      toast.success(`Dossier transmis a ${recipientName || recipientEmail} avec ${docsToSend.length} piece(s) jointe(s)`);
      onClose();
    } catch (error: any) {
      console.error('Error sending to insurer:', error);
      toast.error(`Erreur lors de l'envoi : ${error.message || 'Erreur inconnue'}`);
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
              <p className="text-sm text-gray-600">Envoyer les pieces a l'assureur pour saisie devis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Envoyer ({selectedDocs.size} doc{selectedDocs.size > 1 ? 's' : ''})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
