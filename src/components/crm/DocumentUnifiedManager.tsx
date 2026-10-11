import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import {
  FileText, CheckCircle, XCircle, Clock, AlertTriangle,
  RefreshCw, Send, RotateCcw, GripVertical
} from 'lucide-react';
import { nativeAdminCall, nativeAdminUpdateDocument } from '@/lib/native-admin-data';
import { documentValidationError } from '@/lib/native-document-status';

import { SecureDocumentLink } from './SecureDocumentLink';

interface DocumentStatus {
  status: 'missing' | 'uploaded' | 'validated' | 'rejected';
  validated: boolean;
  validated_at?: string;
  uploaded_at?: string;
  file_name?: string;
  rejection_reason?: string;
  notes?: string;
}


interface UnifiedDocument {
  id: string;
  lead_id?: string;
  rejection_reason?: string;
  document_type: string | null;
  file_name: string;
  file_path?: string;
  file_size: number;
  uploaded_at?: string;
  created_at?: string;
  status: string;
  notes?: string;
  source: 'prospect_upload' | 'email_attachment' | 'manual_upload';
  download_url?: string;
  classification_status?: string;
  auto_detected_type?: string;
  metadata?: Record<string, unknown>;
}

interface DocumentUnifiedManagerProps {
  leadId: string;
  leadEmail: string;
  leadFirstName: string;
  accessToken?: string;
  onDocumentsComplete?: () => void;
  onRequestDocuments?: (missingDocs: string[]) => void;
}

const DOCUMENT_TYPES = [
  { id: 'licence_taxi', label: 'Licence de taxi professionnelle', required: true, icon: '🚕' },
  { id: 'permis_conduire', label: 'Permis de conduire', required: true, icon: '🪪' },
  { id: 'piece_identite', label: "Pièce d'identité", required: true, icon: '🆔' },
  { id: 'carte_grise', label: 'Carte grise du véhicule', required: true, icon: '🚗' },
  { id: 'releve_information', label: "Relevé d'information", required: true, icon: '📋' },
  { id: 'autorisation_stationnement', label: 'Autorisation de stationnement', required: true, icon: '🅿️' },
  { id: 'rib', label: 'RIB', required: true, icon: '🏦' },
  { id: 'kbis', label: 'KBIS / SIRENE', required: true, icon: '🏢' }
];

function UnifiedDocumentLink({ doc, size = 16 }: { doc: UnifiedDocument; size?: number }) {
  if (doc.file_path) {
    const explicit = typeof doc.metadata?.storage_bucket === 'string' ? doc.metadata.storage_bucket : undefined;
    const isEmail = explicit === 'email-attachments' || doc.file_path.startsWith('00000000-0000-0000-0000-000000000001/');
    return <SecureDocumentLink filePath={doc.file_path} source={isEmail ? 'email_attachments' : 'prospect_documents'} bucket={explicit || (isEmail ? 'email-attachments' : 'prospect-documents')} fileName={doc.file_name} className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors" iconSize={size} />;
  }
  return null;
}
export function DocumentUnifiedManager({
  leadId,
  onRequestDocuments
}: DocumentUnifiedManagerProps) {
  const [allDocuments, setAllDocuments] = useState<UnifiedDocument[]>([]);
  const [unclassifiedDocuments, setUnclassifiedDocuments] = useState<UnifiedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [draggedDoc, setDraggedDoc] = useState<UnifiedDocument | null>(null);
  const [dragOverType, setDragOverType] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    console.log('🔄 DocumentUnifiedManager: loadData called for leadId:', leadId);
    setLoading(true);
    try {
      const [data, prospect, workspace] = await Promise.all([
        nativeAdminCall<{ documents?: UnifiedDocument[] }>(`/v1/admin/documents?lead_id=${encodeURIComponent(leadId)}&scope=all`),
        nativeAdminCall<{ documents?: UnifiedDocument[] }>(`/v1/admin/documents?lead_id=${encodeURIComponent(leadId)}`),
        nativeAdminCall<{ attachments?: Array<{ attachment_id: string; filename: string; content_type: string; file_size: number; storage_path: string; storage_bucket?: string; source: string; received_at: string }> }>(`/v1/admin/leads/${encodeURIComponent(leadId)}/document-workspace`)
      ]);
      const prospectIds = new Set((prospect.documents || []).map(doc => doc.id));
      const stored = [...new Map((data.documents || []).filter(doc => doc.file_path).map(doc => [doc.id, doc])).values()].map(doc => ({
        ...doc, source: prospectIds.has(doc.id) ? 'prospect_upload' as const : 'manual_upload' as const,
        metadata: { ...doc.metadata, storage_bucket: (doc as UnifiedDocument & { bucket?: string }).bucket || 'prospect-documents' }
      }));
      const email: UnifiedDocument[] = (workspace.attachments || []).filter(item => item.source === 'email').map(item => ({
        id: item.attachment_id, document_type: null, file_name: item.filename, file_path: item.storage_path, file_size: item.file_size,
        created_at: item.received_at, status: 'pending', source: 'email_attachment', classification_status: 'pending',
        metadata: { storage_bucket: item.storage_bucket || 'email-attachments' }
      }));
      const unified = [...stored, ...email];
      setAllDocuments(unified);
      setUnclassifiedDocuments(unified.filter(doc => !doc.document_type || doc.document_type === 'autre' || doc.classification_status === 'pending'));
    } catch (err) {
      console.error('❌ DocumentUnifiedManager: Error loading data:', err);
      toast.error('Impossible de charger les documents. Vérifiez votre session puis réessayez.');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadData();
  }, [leadId, loadData]);

  // Drag & Drop Handlers
  const handleDragStart = (doc: UnifiedDocument) => {
    console.log('🖱️ Drag started:', doc.file_name);
    setDraggedDoc(doc);
  };

  const handleDragEnd = () => {
    console.log('🖱️ Drag ended');
    setDraggedDoc(null);
    setDragOverType(null);
  };

  const handleDragOver = (e: React.DragEvent, docType: string) => {
    e.preventDefault();
    setDragOverType(docType);
  };

  const handleDragLeave = () => {
    setDragOverType(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDocType: string) => {
    e.preventDefault();
    console.log('📥 Drop on:', targetDocType);

    if (!draggedDoc) return;

    setActionLoading(draggedDoc.id);

    try {
      const owner = draggedDoc.lead_id || leadId;
      const action = draggedDoc.source === 'manual_upload' ? { action: 'move', document_id: draggedDoc.id, document_type: targetDocType }
        : { action: 'classify', attachment_id: draggedDoc.source === 'email_attachment' ? draggedDoc.id : `prospect:${draggedDoc.id}`, document_type: targetDocType };
      await nativeAdminCall(`/v1/admin/leads/${encodeURIComponent(owner)}/document-workspace`, { method: 'POST', body: JSON.stringify(action) });
      await loadData();

    } catch (err) {
      console.error('❌ Error classifying document:', err);
      toast.error('Erreur lors de la classification du document');
    } finally {
      setActionLoading(null);
      setDraggedDoc(null);
      setDragOverType(null);
    }
  };

  const getDocumentsForType = (docType: string): UnifiedDocument[] => {
    return allDocuments.filter(doc => doc.document_type === docType);
  };

  const getDocumentStatus = (docType: string): DocumentStatus => {
    const doc = getDocumentsForType(docType)[0];
    if (!doc) return { status: 'missing', validated: false };
    const validated = ['validated', 'verified'].includes(doc.status);
    return { status: validated ? 'validated' : doc.status === 'rejected' ? 'rejected' : 'uploaded', validated,
      uploaded_at: doc.uploaded_at || doc.created_at, file_name: doc.file_name, rejection_reason: doc.rejection_reason };
  };

  const handleValidate = async (docType: string) => {
    setActionLoading(docType);
    try {
      const doc = getDocumentsForType(docType)[0];
      if (!doc) throw new Error('not_found');
      await nativeAdminUpdateDocument(doc.id, { status: 'validated' });
      await loadData();
    } catch (err) {
      console.error('Error validating document:', err);
      toast.error(documentValidationError(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleInvalidate = async (docType: string) => {
    if (!rejectReason.trim()) {
      toast.warning('Veuillez indiquer une raison');
      return;
    }

    setActionLoading(docType);
    try {
      const doc = getDocumentsForType(docType)[0];
      if (!doc) throw new Error('not_found');
      await nativeAdminUpdateDocument(doc.id, { status: 'rejected', rejection_reason: rejectReason.trim() });
      setShowRejectModal(null);
      setRejectReason('');
      await loadData();
    } catch (err) {
      console.error('Error invalidating document:', err);
      toast.error('Erreur lors de l\'invalidation');
    } finally {
      setActionLoading(null);
    }
  };

  const getCompletionPercentage = () => {
    const requiredDocs = DOCUMENT_TYPES.filter(d => d.required);
    const completedCount = requiredDocs.filter(d => {
      const status = getDocumentStatus(d.id);
      return status.validated || status.status === 'uploaded';
    }).length;
    return Math.round((completedCount / requiredDocs.length) * 100);
  };

  const getValidatedPercentage = () => {
    const requiredDocs = DOCUMENT_TYPES.filter(d => d.required);
    const validatedCount = requiredDocs.filter(d => {
      const status = getDocumentStatus(d.id);
      return status.validated;
    }).length;
    return Math.round((validatedCount / requiredDocs.length) * 100);
  };

  const getMissingDocuments = () => {
    return DOCUMENT_TYPES.filter(d => {
      const status = getDocumentStatus(d.id);
      return (status.status === 'missing' || status.status === 'rejected') && d.required;
    });
  };

  const handleRequestMissingDocuments = async () => {
    const missingDocs = getMissingDocuments();
    if (missingDocs.length === 0) return;
    if (onRequestDocuments) {
      onRequestDocuments(missingDocs.map(d => d.label));
    }
  };

  const completion = getCompletionPercentage();
  const validated = getValidatedPercentage();
  const missingDocs = getMissingDocuments();

  const StatusBadge = ({ status }: { status: DocumentStatus }) => {
    if (status.validated) {
      return (
        <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
          <CheckCircle size={12} /> Validé
        </span>
      );
    }
    if (status.status === 'rejected') {
      return (
        <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
          <XCircle size={12} /> Rejeté
        </span>
      );
    }
    if (status.status === 'uploaded') {
      return (
        <span className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
          <Clock size={12} /> À valider
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded-full">
        <AlertTriangle size={12} /> Manquant
      </span>
    );
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText size={20} />
            Gestion Unifiée des Documents
          </h3>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between text-xs text-white/70 mb-1">
              <span>Reçus</span>
              <span className="font-bold text-white">{completion}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-500 rounded-full"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-white/70 mb-1">
              <span>Validés</span>
              <span className="font-bold text-white">{validated}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400 transition-all duration-500 rounded-full"
                style={{ width: `${validated}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Alert documents manquants */}
      {missingDocs.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-400">
                {missingDocs.length} document(s) manquant(s)
              </p>
              <p className="text-xs text-gray-400">
                {missingDocs.map(d => d.label).join(', ')}
              </p>
            </div>
            <button
              onClick={handleRequestMissingDocuments}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
            >
              <Send size={14} />
              Relancer
            </button>
          </div>
        </div>
      )}

      {/* Panier de documents non classés */}
      {unclassifiedDocuments.length > 0 && (
        <div className="border-b border-gray-700 bg-gray-900/50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-amber-400">📥 Panier de Documents</span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                {unclassifiedDocuments.length} non classé{unclassifiedDocuments.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3 border-2 border-dashed border-gray-600">
              <p className="text-xs text-gray-400 mb-3">
                💡 Glissez ces documents vers les cards ci-dessous pour les classer
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {unclassifiedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    draggable
                    onDragStart={() => handleDragStart(doc)}
                    onDragEnd={handleDragEnd}
                    className="bg-gray-700 rounded-lg p-3 border border-gray-600 hover:border-blue-500 transition-all cursor-grab active:cursor-grabbing group"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="text-gray-500 group-hover:text-blue-400 flex-shrink-0" size={16} />
                      <FileText className="text-blue-400 flex-shrink-0" size={20} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {doc.file_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {(doc.file_size / 1024).toFixed(1)} KB
                          </span>
                          {doc.auto_detected_type && (
                            <span className="text-xs text-amber-400">
                              Suggéré: {DOCUMENT_TYPES.find(d => d.id === doc.auto_detected_type)?.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <UnifiedDocumentLink doc={doc} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cards de documents */}
      <div className="p-4 space-y-2">
        {DOCUMENT_TYPES.map((docType) => {
          const status = getDocumentStatus(docType.id);
          const docs = getDocumentsForType(docType.id);
          const isLoading = actionLoading === docType.id;
          const isDragOver = dragOverType === docType.id;

          return (
            <div
              key={docType.id}
              onDragOver={(e) => handleDragOver(e, docType.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, docType.id)}
              className={`p-3 rounded-lg border transition-all ${
                isDragOver
                  ? 'bg-blue-500/20 border-blue-500 ring-2 ring-blue-500'
                  : status.validated
                  ? 'bg-green-500/10 border-green-500/30'
                  : status.status === 'rejected'
                  ? 'bg-red-500/10 border-red-500/30'
                  : status.status === 'uploaded'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-gray-700/50 border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-xl">{docType.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm">{docType.label}</span>
                      {docType.required && (
                        <span className="text-xs text-red-400">*</span>
                      )}
                    </div>
                    {isDragOver && (
                      <p className="text-xs text-blue-400 mt-1">📥 Déposez ici pour classer</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={status} />

                  {status.status === 'uploaded' && !status.validated && (
                    <>
                      <button
                        onClick={() => handleValidate(docType.id)}
                        disabled={isLoading || docs[0]?.status === 'quarantined'}
                        className="p-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                        title="Valider"
                      >
                        {isLoading ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => setShowRejectModal(docType.id)}
                        disabled={isLoading}
                        className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                        title="Rejeter"
                      >
                        <XCircle size={16} />
                      </button>
                    </>
                  )}

                  {status.validated && (
                    <button
                      onClick={() => setShowRejectModal(docType.id)}
                      disabled={isLoading}
                      className="p-1.5 bg-gray-600/50 hover:bg-gray-600 text-gray-400 rounded-lg transition-colors"
                      title="Redemander"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Liste des documents dans cette card */}
              {docs.length > 0 && (
                <div className="mt-2 space-y-2 pl-9">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      draggable
                      onDragStart={() => handleDragStart(doc)}
                      onDragEnd={handleDragEnd}
                      className="bg-gray-800/50 rounded-lg p-2 border border-gray-600 hover:border-blue-500 transition-all cursor-grab active:cursor-grabbing group"
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="text-gray-500 group-hover:text-blue-400 flex-shrink-0" size={14} />
                        <FileText className="text-blue-400 flex-shrink-0" size={16} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white truncate">{doc.file_name}</p>
                          <p className="text-xs text-gray-500">
                            {(doc.file_size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <UnifiedDocumentLink doc={doc} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {status.status === 'rejected' && status.rejection_reason && (
                <p className="text-xs text-red-400 mt-2 pl-9">
                  Raison: {status.rejection_reason}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de rejet */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full">
            <div className="p-4 border-b border-gray-700">
              <h4 className="font-bold text-white">Rejeter / Redemander le document</h4>
            </div>
            <div className="p-4">
              <label className="block text-sm text-gray-400 mb-2">
                Raison du rejet (sera affichée au prospect)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Ex: Document illisible, date expirée, mauvais document..."
              />
            </div>
            <div className="p-4 border-t border-gray-700 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleInvalidate(showRejectModal)}
                disabled={!rejectReason.trim() || actionLoading === showRejectModal}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === showRejectModal ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <XCircle size={16} />
                )}
                Rejeter et redemander
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentUnifiedManager;
