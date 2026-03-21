import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Eye, Download, FileText, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '@/lib/toast';

interface Document {
  id: string;
  document_type: string;
  file_url: string;
  validation_status: string;
  rejection_reason: string | null;
  rejection_comment: string | null;
  validated_at: string | null;
  rejected_at: string | null;
  uploaded_at: string;
}

interface Props {
  leadId: string;
  onValidationChange?: () => void;
}

const REJECTION_REASONS = [
  { value: 'illegible', label: 'Document illisible', description: 'La qualité est insuffisante pour lire le document' },
  { value: 'incomplete', label: 'Document incomplet', description: 'Il manque des informations essentielles' },
  { value: 'non_compliant', label: 'Document non conforme', description: 'Le document ne correspond pas aux exigences' },
  { value: 'expired', label: 'Document expiré', description: 'La date de validité est dépassée' },
  { value: 'wrong_type', label: 'Mauvais type de document', description: 'Ce n\'est pas le document demandé' },
  { value: 'blurred', label: 'Photo floue', description: 'L\'image est trop floue ou mal cadrée' },
  { value: 'partial', label: 'Document partiel', description: 'Seule une partie du document est visible' },
  { value: 'other', label: 'Autre raison', description: 'Autre motif (préciser dans le commentaire)' }
];

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  'licence_taxi': 'Licence de taxi',
  'permis_conduire': 'Permis de conduire',
  'piece_identite': 'Pièce d\'identité',
  'carte_grise': 'Carte grise',
  'releve_information': 'Relevé d\'information',
  'autorisation_stationnement': 'Autorisation de stationnement',
  'rib': 'RIB',
  'kbis': 'Kbis',
  'assurance_precedente': 'Assurance précédente'
};

export default function DocumentValidationManager({ leadId, onValidationChange }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<{
    type: 'validate' | 'reject';
    document: Document;
  } | null>(null);
  const [rejectionForm, setRejectionForm] = useState({
    reason: '',
    comment: ''
  });

  useEffect(() => {
    loadDocuments();
  }, [leadId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('document_validation_status')
        .select('*')
        .eq('lead_id', leadId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!activeModal || activeModal.type !== 'validate') return;

    try {
      setProcessing(activeModal.document.id);

      const { data: adminData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('document_validation_status')
        .update({
          validation_status: 'validated',
          validated_at: new Date().toISOString(),
          validated_by: adminData?.user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeModal.document.id);

      if (error) throw error;

      setActiveModal(null);
      loadDocuments();
      onValidationChange?.();
    } catch (error) {
      console.error('Erreur validation document:', error);
      toast.error(error.message || 'Erreur lors de la validation');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!activeModal || activeModal.type !== 'reject' || !rejectionForm.reason) {
      toast.warning('Veuillez sélectionner un motif de refus');
      return;
    }

    try {
      setProcessing(activeModal.document.id);

      const { data: adminData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('document_validation_status')
        .update({
          validation_status: 'rejected',
          rejection_reason: rejectionForm.reason,
          rejection_comment: rejectionForm.comment || null,
          rejected_at: new Date().toISOString(),
          rejected_by: adminData?.user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeModal.document.id);

      if (error) throw error;

      const { error: notifError } = await supabase
        .from('crm_event_notifications')
        .insert({
          lead_id: leadId,
          event_type: 'document_rejected',
          message: `Document refusé: ${DOCUMENT_TYPE_LABELS[activeModal.document.document_type] || activeModal.document.document_type}`,
          priority: 10,
          context_data: {
            document_type: activeModal.document.document_type,
            rejection_reason: rejectionForm.reason,
            rejection_comment: rejectionForm.comment
          }
        });

      if (notifError) console.error('Erreur notification:', notifError);

      setActiveModal(null);
      setRejectionForm({ reason: '', comment: '' });
      loadDocuments();
      onValidationChange?.();
    } catch (error) {
      console.error('Erreur refus document:', error);
      toast.error(error.message || 'Erreur lors du refus');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3" /> En attente</span>;
      case 'validated':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" /> Validé</span>;
      case 'rejected':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-100 text-red-800"><XCircle className="w-3 h-3" /> Refusé</span>;
      default:
        return null;
    }
  };

  const pendingDocs = documents.filter(d => d.validation_status === 'pending');
  const validatedDocs = documents.filter(d => d.validation_status === 'validated');
  const rejectedDocs = documents.filter(d => d.validation_status === 'rejected');

  if (loading) {
    return <div className="p-4 text-center">Chargement des documents...</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Aucun document uploadé pour le moment</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Statistiques</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{pendingDocs.length}</div>
            <div className="text-gray-600">En attente</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{validatedDocs.length}</div>
            <div className="text-gray-600">Validés</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{rejectedDocs.length}</div>
            <div className="text-gray-600">Refusés</div>
          </div>
        </div>
      </div>

      {pendingDocs.length > 0 && (
        <div className="bg-white border rounded-lg">
          <div className="p-4 border-b bg-yellow-50">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Documents en attente de validation ({pendingDocs.length})
            </h3>
          </div>
          <div className="divide-y">
            {pendingDocs.map((doc) => (
              <div key={doc.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="font-medium">
                        {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                      </span>
                      {getStatusBadge(doc.validation_status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Uploadé le {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')} à {new Date(doc.uploaded_at).toLocaleTimeString('fr-FR')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2 text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      Voir
                    </a>
                    <button
                      onClick={() => setActiveModal({ type: 'validate', document: doc })}
                      disabled={processing === doc.id}
                      className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Valider
                    </button>
                    <button
                      onClick={() => setActiveModal({ type: 'reject', document: doc })}
                      disabled={processing === doc.id}
                      className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      Refuser
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {validatedDocs.length > 0 && (
        <div className="bg-white border rounded-lg">
          <div className="p-4 border-b bg-green-50">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Documents validés ({validatedDocs.length})
            </h3>
          </div>
          <div className="divide-y">
            {validatedDocs.map((doc) => (
              <div key={doc.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-green-600" />
                      <span className="font-medium">
                        {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                      </span>
                      {getStatusBadge(doc.validation_status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Validé le {doc.validated_at && new Date(doc.validated_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rejectedDocs.length > 0 && (
        <div className="bg-white border rounded-lg">
          <div className="p-4 border-b bg-red-50">
            <h3 className="font-semibold flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Documents refusés ({rejectedDocs.length})
            </h3>
          </div>
          <div className="divide-y">
            {rejectedDocs.map((doc) => (
              <div key={doc.id} className="p-4 bg-red-50/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-red-600" />
                      <span className="font-medium">
                        {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                      </span>
                      {getStatusBadge(doc.validation_status)}
                    </div>
                    <div className="text-sm text-red-600 mb-1">
                      <strong>Motif:</strong> {REJECTION_REASONS.find(r => r.value === doc.rejection_reason)?.label || doc.rejection_reason}
                    </div>
                    {doc.rejection_comment && (
                      <div className="text-sm text-gray-600">
                        <strong>Commentaire:</strong> {doc.rejection_comment}
                      </div>
                    )}
                    <div className="text-sm text-gray-600 mt-1">
                      Refusé le {doc.rejected_at && new Date(doc.rejected_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Voir
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {activeModal.type === 'validate' ? 'Valider le document' : 'Refuser le document'}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="font-medium">
                {DOCUMENT_TYPE_LABELS[activeModal.document.document_type] || activeModal.document.document_type}
              </div>
              <div className="text-sm text-gray-600">
                Uploadé le {new Date(activeModal.document.uploaded_at).toLocaleDateString('fr-FR')}
              </div>
            </div>

            {activeModal.type === 'validate' ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <p className="text-sm text-green-800">
                    En validant ce document, vous confirmez qu'il est conforme, lisible et contient toutes les informations nécessaires.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleValidate}
                    disabled={processing === activeModal.document.id}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Confirmer la validation
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motif de refus *
                  </label>
                  <select
                    value={rejectionForm.reason}
                    onChange={(e) => setRejectionForm({ ...rejectionForm, reason: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Sélectionnez un motif</option>
                    {REJECTION_REASONS.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label} - {reason.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commentaire détaillé (optionnel)
                  </label>
                  <textarea
                    value={rejectionForm.comment}
                    onChange={(e) => setRejectionForm({ ...rejectionForm, comment: e.target.value })}
                    rows={4}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Précisez ce qui ne va pas et ce qui est attendu (ex: La photo est coupée en haut, veuillez envoyer le document complet)"
                  />
                </div>

                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <p className="text-sm text-red-800">
                    Le prospect sera automatiquement notifié du refus et devra uploader un nouveau document conforme.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!rejectionForm.reason || processing === activeModal.document.id}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Confirmer le refus
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
