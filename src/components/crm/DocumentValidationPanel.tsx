import React, { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Download,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  status: 'pending' | 'approved' | 'rejected';
  uploaded_at: string;
  validated_by?: string;
  validated_at?: string;
  rejection_reason?: string;
  rejection_details?: string;
  metadata?: {
    download_url?: string;
    email_id?: string;
    email_subject?: string;
    auto_classified?: boolean;
    confidence?: number;
    processed_at?: string;
  };
}

interface DocumentValidationPanelProps {
  leadId: string;
  onValidationChange?: () => void;
}

const REJECTION_REASONS = [
  { value: 'illegible', label: 'Document illisible', color: 'text-orange-600' },
  { value: 'duplicate', label: 'Document en doublon', color: 'text-purple-600' },
  { value: 'wrong_document', label: 'Mauvais document', color: 'text-red-600' },
  { value: 'expired', label: 'Document expiré', color: 'text-yellow-600' },
  { value: 'incomplete', label: 'Document incomplet', color: 'text-blue-600' },
  { value: 'other', label: 'Autre motif', color: 'text-gray-600' }
];

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  'authorization_station': 'Autorisation de stationnement',
  'cni_verso': 'CNI Verso',
  'carte_professionnelle': 'Carte professionnelle',
  'capacite_validity': 'Certificat de capacité',
  'cni_recto_verso': 'Copie CNI recto-verso',
  'carte_grise_souscripteur': 'Carte grise du souscripteur',
  'permis_conduire_mr': 'Permis de conduire',
  'permis_conduire_lisible': 'Copie permis lisible',
  'kbis': 'Extrait Kbis',
  'rib': 'RIB',
  'releve_info_12mois': 'Relevé d\'informations 12 mois',
  'releve_info_36mois': 'Relevé d\'informations 36 mois'
};

const DocumentValidationPanel: React.FC<DocumentValidationPanelProps> = ({ leadId, onValidationChange }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    documentId: string;
    documentName: string;
  } | null>(null);
  const [rejectForm, setRejectForm] = useState({
    reason: '',
    details: ''
  });
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [leadId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospect_documents')
        .select('id, document_type, file_name, file_path, file_size, status, uploaded_at, validated_by, validated_at, rejection_reason, rejection_details, metadata')
        .eq('lead_id', leadId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      logger.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (documentId: string) => {
    setValidating(documentId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('validate_document', {
        p_document_id: documentId,
        p_validated_by: user.id
      });

      if (error) throw error;

      if (data?.success) {
        await loadDocuments();
        onValidationChange?.();
      }
    } catch (error) {
      logger.error('Error validating document:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setValidating(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectForm.reason) {
      toast.warning('Veuillez sélectionner un motif de rejet');
      return;
    }

    setRejecting(rejectModal.documentId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('reject_document', {
        p_document_id: rejectModal.documentId,
        p_validated_by: user.id,
        p_rejection_reason: rejectForm.reason,
        p_rejection_details: rejectForm.details || null
      });

      if (error) throw error;

      if (data?.success) {
        // Envoyer l'email de notification
        if (data.lead_email && data.access_token) {
          await supabase.functions.invoke('send-document-notification', {
            body: {
              type: 'rejection',
              lead_email: data.lead_email,
              document_type: rejectModal.documentName,
              rejection_reason: REJECTION_REASONS.find(r => r.value === rejectForm.reason)?.label,
              rejection_details: rejectForm.details,
              access_token: data.access_token
            }
          });
        }

        await loadDocuments();
        onValidationChange?.();
        setRejectModal(null);
        setRejectForm({ reason: '', details: '' });
      }
    } catch (error) {
      logger.error('Error rejecting document:', error);
      toast.error('Erreur lors du rejet');
    } finally {
      setRejecting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Validé
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-medium">
            <XCircle className="w-4 h-4" />
            Rejeté
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
            <Clock className="w-4 h-4" />
            À contrôler
          </span>
        );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const pendingCount = documents.filter(d => d.status === 'pending').length;
  const approvedCount = documents.filter(d => d.status === 'approved').length;
  const rejectedCount = documents.filter(d => d.status === 'rejected').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-900">{documents.length}</div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="text-sm text-blue-600 mb-1">À contrôler</div>
          <div className="text-2xl font-bold text-blue-900">{pendingCount}</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="text-sm text-green-600 mb-1">Validés</div>
          <div className="text-2xl font-bold text-green-900">{approvedCount}</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="text-sm text-red-600 mb-1">Rejetés</div>
          <div className="text-2xl font-bold text-red-900">{rejectedCount}</div>
        </div>
      </div>

      {/* Liste des documents */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">
            {documents.length} pièce{documents.length > 1 ? 's' : ''} justificative{documents.length > 1 ? 's' : ''}
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {documents.map((doc) => {
            const isExpanded = expandedDoc === doc.id;
            const documentLabel = DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type;

            return (
              <div key={doc.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Icône de validation */}
                  <div className="flex-shrink-0 pt-1">
                    {doc.status === 'approved' && (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    )}
                    {doc.status === 'pending' && (
                      <Clock className="w-6 h-6 text-blue-600" />
                    )}
                    {doc.status === 'rejected' && (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Nom du document */}
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900">{documentLabel}</h4>
                      {getStatusBadge(doc.status)}
                    </div>

                    {/* Informations */}
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Importé le {new Date(doc.uploaded_at).toLocaleString('fr-FR')}</div>
                      <div className="flex items-center gap-4">
                        <span>{doc.file_name}</span>
                        <span className="text-gray-400">•</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                      </div>
                    </div>

                    {/* Détails du rejet */}
                    {doc.status === 'rejected' && doc.rejection_reason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium text-red-900">
                              {REJECTION_REASONS.find(r => r.value === doc.rejection_reason)?.label}
                            </div>
                            {doc.rejection_details && (
                              <div className="text-red-700 mt-1">{doc.rejection_details}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <a
                      href={
                        doc.metadata?.download_url ||
                        (doc.file_path.startsWith('00000000-0000-0000-0000-000000000001/')
                          ? supabase.storage.from('email-attachments').getPublicUrl(doc.file_path).data.publicUrl
                          : supabase.storage.from('prospect-documents').getPublicUrl(doc.file_path).data.publicUrl)
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Voir le document"
                    >
                      <Eye className="w-5 h-5" />
                    </a>

                    {doc.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleValidate(doc.id)}
                          disabled={validating === doc.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {validating === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Valider
                        </button>
                        <button
                          onClick={() => setRejectModal({ documentId: doc.id, documentName: documentLabel })}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Rejeter
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {documents.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun document uploadé</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de rejet */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Rejeter le document</h3>
              <p className="text-gray-600 mt-1">{rejectModal.documentName}</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Motif de rejet */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Motif de rejet *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {REJECTION_REASONS.map((reason) => (
                    <button
                      key={reason.value}
                      onClick={() => setRejectForm({ ...rejectForm, reason: reason.value })}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        rejectForm.reason === reason.value
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`font-medium ${reason.color}`}>
                        {reason.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Détails complémentaires */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Détails complémentaires (optionnel)
                </label>
                <textarea
                  value={rejectForm.details}
                  onChange={(e) => setRejectForm({ ...rejectForm, details: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Précisez les raisons du rejet pour aider le prospect à corriger..."
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectForm({ reason: '', details: '' });
                }}
                className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectForm.reason || rejecting === rejectModal.documentId}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {rejecting === rejectModal.documentId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rejet en cours...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Confirmer le rejet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentValidationPanel;
