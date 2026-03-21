import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { FileText, CheckCircle, XCircle, Eye, Download, Printer, AlertCircle, Mail, CreditCard as Edit3, X, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  status: string;
  uploaded_at: string;
  validation_status?: string;
  rejection_reason?: string;
  metadata?: {
    download_url?: string;
  };
}

interface DocumentValidationWithReasonsProps {
  leadId: string;
  leadEmail?: string;
  onValidationComplete?: () => void;
}

const DOCUMENT_LABELS: Record<string, string> = {
  licence_taxi: 'Licence de taxi',
  permis_conduire: 'Permis de conduire',
  piece_identite: "Pièce d'identité",
  carte_grise: 'Carte grise',
  releve_information: "Relevé d'information",
  autorisation_stationnement: 'Autorisation de stationnement',
  rib: 'RIB',
  kbis: 'KBIS / SIRENE'
};

const REJECTION_REASONS = [
  { value: 'illegible', label: 'Document illisible ou de mauvaise qualité' },
  { value: 'expired', label: 'Document périmé' },
  { value: 'incomplete', label: 'Document incomplet' },
  { value: 'wrong_type', label: 'Mauvais type de document' },
  { value: 'mismatch', label: 'Informations ne correspondent pas' },
  { value: 'damaged', label: 'Document endommagé' },
  { value: 'other', label: 'Autre (préciser ci-dessous)' }
];

export function DocumentValidationWithReasons({
  leadId,
  leadEmail,
  onValidationComplete
}: DocumentValidationWithReasonsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectionForm, setRejectionForm] = useState({
    reason: '',
    details: '',
    sendEmail: true
  });
  const [categoryChangeModal, setCategoryChangeModal] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [leadId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('prospect_documents')
        .select('*')
        .eq('lead_id', leadId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      logger.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (doc: Document) => {
    const url = doc.metadata?.download_url || doc.file_path;
    window.open(url, '_blank');
  };

  const handleDownloadDocument = (doc: Document) => {
    const url = doc.metadata?.download_url || doc.file_path;
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintDocument = (doc: Document) => {
    const url = doc.metadata?.download_url || doc.file_path;
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleValidate = async (docId: string) => {
    setActionLoading(docId);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const doc = documents.find(d => d.id === docId);
      if (!doc) {
        toast.error('Document introuvable');
        return;
      }

      // Update document status
      await supabase
        .from('prospect_documents')
        .update({
          validation_status: 'validated',
          validated: true,
          validated_at: new Date().toISOString(),
          validated_by: user?.id
        })
        .eq('id', docId);

      // Log validation action
      await supabase.from('crm_document_validation_actions').insert({
        document_id: docId,
        lead_id: leadId,
        action_type: 'validated',
        validated_by: user?.id
      });

      // Add to timeline
      await supabase.from('crm_interactions').insert({
        lead_id: leadId,
        type: 'document',
        subject: 'Document validé',
        content: `Document "${doc.file_name}" validé par le commercial`,
        created_by: user?.id
      });

      // Send email notification to prospect
      if (leadEmail) {
        console.log('[VALIDATION] Sending validation email to:', leadEmail);

        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-document-notification', {
          body: {
            lead_id: leadId,
            document_type: doc.document_type,
            document_name: doc.file_name,
            action: 'validated',
            recipient_email: leadEmail
          }
        });

        if (emailError || !emailResult?.success) {
          console.error('[VALIDATION] Email error:', emailError || emailResult);
          // Don't block the validation if email fails
          logger.warn('Email notification failed but document validated:', emailError?.message || emailResult?.error);
        } else {
          console.log('[VALIDATION] Email sent successfully:', emailResult);
        }
      }

      await loadDocuments();
      onValidationComplete?.();

      toast.success(`Document "${doc.file_name}" validé avec succès !${leadEmail ? '\nEmail de confirmation envoyé au prospect.' : ''}`);
    } catch (err) {
      logger.error('Error validating document:', err);
      toast.error('Erreur lors de la validation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    if (!rejectionForm.reason) {
      toast.warning('Veuillez sélectionner un motif de rejet');
      return;
    }

    setActionLoading(rejectModal);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const doc = documents.find(d => d.id === rejectModal);
      if (!doc) return;

      // Update document status
      await supabase
        .from('prospect_documents')
        .update({
          validation_status: 'rejected',
          validated: false,
          rejection_reason: rejectionForm.reason,
          rejection_details: rejectionForm.details
        })
        .eq('id', rejectModal);

      // Log rejection action
      await supabase.from('crm_document_validation_actions').insert({
        document_id: rejectModal,
        lead_id: leadId,
        action_type: 'rejected',
        rejection_reason: rejectionForm.reason,
        rejection_details: rejectionForm.details,
        send_email_notification: rejectionForm.sendEmail,
        validated_by: user?.id
      });

      // Send email if requested
      if (rejectionForm.sendEmail && leadEmail) {
        const reasonLabel = REJECTION_REASONS.find(r => r.value === rejectionForm.reason)?.label || rejectionForm.reason;

        await supabase.functions.invoke('send-crm-email', {
          body: {
            to: leadEmail,
            template: 'document_rejected',
            data: {
              leadId: leadId,
              documentType: DOCUMENT_LABELS[doc.document_type] || doc.document_type,
              fileName: doc.file_name,
              reason: reasonLabel,
              details: rejectionForm.details
            }
          }
        });

        // Add email to timeline
        await supabase.from('crm_interactions').insert({
          lead_id: leadId,
          type: 'email',
          direction: 'outbound',
          subject: `Document rejeté: ${DOCUMENT_LABELS[doc.document_type] || doc.document_type}`,
          content: `Email automatique envoyé au prospect pour le document rejeté: ${reasonLabel}`,
          created_by: user?.id
        });
      }

      // Add to timeline
      await supabase.from('crm_interactions').insert({
        lead_id: leadId,
        type: 'document',
        subject: 'Document rejeté',
        content: `Document rejeté: ${rejectionForm.reason} - ${rejectionForm.details}`,
        created_by: user?.id
      });

      setRejectModal(null);
      setRejectionForm({ reason: '', details: '', sendEmail: true });
      await loadDocuments();
      onValidationComplete?.();
    } catch (err) {
      logger.error('Error rejecting document:', err);
      toast.error('Erreur lors du rejet');
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeCategory = async () => {
    if (!categoryChangeModal || !newCategory) return;

    setActionLoading(categoryChangeModal);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const doc = documents.find(d => d.id === categoryChangeModal);
      if (!doc) return;

      // Update document category
      await supabase
        .from('prospect_documents')
        .update({
          document_type: newCategory
        })
        .eq('id', categoryChangeModal);

      // Log category change
      await supabase.from('crm_document_validation_actions').insert({
        document_id: categoryChangeModal,
        lead_id: leadId,
        action_type: 'category_changed',
        old_category: doc.document_type,
        new_category: newCategory,
        validated_by: user?.id
      });

      // Add to timeline
      await supabase.from('crm_interactions').insert({
        lead_id: leadId,
        type: 'document',
        subject: 'Catégorie de document modifiée',
        content: `Catégorie changée de "${DOCUMENT_LABELS[doc.document_type]}" vers "${DOCUMENT_LABELS[newCategory]}"`,
        created_by: user?.id
      });

      setCategoryChangeModal(null);
      setNewCategory('');
      await loadDocuments();
    } catch (err) {
      logger.error('Error changing category:', err);
      toast.error('Erreur lors du changement de catégorie');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-800 rounded w-1/4"></div>
          <div className="h-20 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="text-center text-gray-400 py-8">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p>Aucun document à valider</p>
          <p className="text-sm mt-2">Le prospect n'a pas encore uploadé de documents</p>
        </div>
      </div>
    );
  }

  const pendingDocs = documents.filter(d => d.validation_status === 'pending' || !d.validation_status);
  const validatedDocs = documents.filter(d => d.validation_status === 'validated');
  const rejectedDocs = documents.filter(d => d.validation_status === 'rejected');

  return (
    <>
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <h3 className="text-xl font-bold text-white mb-2">Validation des documents</h3>
          <div className="flex gap-4 text-sm">
            <span className="text-blue-100">
              {pendingDocs.length} en attente
            </span>
            <span className="text-green-200">
              {validatedDocs.length} validés
            </span>
            {rejectedDocs.length > 0 && (
              <span className="text-red-200">
                {rejectedDocs.length} rejetés
              </span>
            )}
          </div>
        </div>

        {/* Documents List */}
        <div className="p-6 space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`border rounded-lg p-4 ${
                doc.validation_status === 'validated' ? 'border-green-500/30 bg-green-900/10' :
                doc.validation_status === 'rejected' ? 'border-red-500/30 bg-red-900/10' :
                'border-gray-700 bg-gray-800'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div className="flex-shrink-0 mt-1">
                  {doc.validation_status === 'validated' ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : doc.validation_status === 'rejected' ? (
                    <XCircle className="w-6 h-6 text-red-500" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-yellow-500" />
                  )}
                </div>

                {/* Document Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-medium text-white">
                        {DOCUMENT_LABELS[doc.document_type] || doc.document_type}
                      </h4>
                      <p className="text-sm text-gray-400">{doc.file_name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Uploadé le {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    {doc.validation_status !== 'validated' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          title="Voir"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrintDocument(doc)}
                          className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                          title="Imprimer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Rejection Reason */}
                  {doc.validation_status === 'rejected' && doc.rejection_reason && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mt-2">
                      <p className="text-sm text-red-400 font-medium">
                        {REJECTION_REASONS.find(r => r.value === doc.rejection_reason)?.label || doc.rejection_reason}
                      </p>
                      {doc.rejection_details && (
                        <p className="text-xs text-red-300 mt-1">{doc.rejection_details}</p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  {doc.validation_status !== 'validated' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleValidate(doc.id)}
                        disabled={actionLoading === doc.id}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Valider
                      </button>
                      <button
                        onClick={() => setRejectModal(doc.id)}
                        disabled={actionLoading === doc.id}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Rejeter
                      </button>
                      <button
                        onClick={() => {
                          setCategoryChangeModal(doc.id);
                          setNewCategory(doc.document_type);
                        }}
                        disabled={actionLoading === doc.id}
                        className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        Catégorie
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-md w-full">
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">Rejeter le document</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Motif de rejet *
                </label>
                <select
                  value={rejectionForm.reason}
                  onChange={(e) => setRejectionForm({ ...rejectionForm, reason: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Sélectionnez un motif</option>
                  {REJECTION_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Détails (optionnel)
                </label>
                <textarea
                  value={rejectionForm.details}
                  onChange={(e) => setRejectionForm({ ...rejectionForm, details: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white h-24"
                  placeholder="Précisez ce qui ne va pas avec le document..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={rejectionForm.sendEmail}
                  onChange={(e) => setRejectionForm({ ...rejectionForm, sendEmail: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-800"
                />
                <label htmlFor="sendEmail" className="text-sm text-white flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Envoyer un email automatique au prospect
                </label>
              </div>

              {rejectionForm.sendEmail && (
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-xs text-blue-300">
                    Le prospect recevra un email lui expliquant pourquoi son document a été rejeté
                    et ce qu'il doit faire.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={handleReject}
                disabled={!rejectionForm.reason || actionLoading === rejectModal}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Confirmer le rejet
              </button>
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectionForm({ reason: '', details: '', sendEmail: true });
                }}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Change Modal */}
      {categoryChangeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-md w-full">
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">Changer la catégorie</h3>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-white mb-2">
                Nouvelle catégorie
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              >
                {Object.entries(DOCUMENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={handleChangeCategory}
                disabled={actionLoading === categoryChangeModal}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Changer
              </button>
              <button
                onClick={() => {
                  setCategoryChangeModal(null);
                  setNewCategory('');
                }}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
