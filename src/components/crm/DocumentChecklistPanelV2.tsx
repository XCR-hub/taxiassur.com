import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import {
  FileText, CheckCircle, XCircle, Clock, AlertTriangle, Upload,
  Eye, Download, RefreshCw, Send, RotateCcw, ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DocumentStatus {
  status: 'missing' | 'uploaded' | 'validated' | 'rejected';
  validated: boolean;
  validated_at?: string;
  uploaded_at?: string;
  file_name?: string;
  rejection_reason?: string;
  notes?: string;
}

interface DocumentChecklist {
  [key: string]: DocumentStatus;
}

interface ProspectDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
  status: string;
  notes?: string;
  metadata?: {
    download_url?: string;
    email_id?: string;
    email_subject?: string;
    auto_classified?: boolean;
    confidence?: number;
    processed_at?: string;
  };
}

interface EmailAttachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  download_url: string;
  storage_path: string;
  auto_detected_type?: string;
  confidence_score?: number;
  classification_status: string;
  created_at: string;
  email_message_id: string;
}

interface DocumentChecklistPanelV2Props {
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
  { id: 'piece_identite', label: "Piece d'identite", required: true, icon: '🆔' },
  { id: 'carte_grise', label: 'Carte grise du vehicule', required: true, icon: '🚗' },
  { id: 'releve_information', label: "Releve d'information", required: false, icon: '📋' },
  { id: 'autorisation_stationnement', label: 'Autorisation de stationnement', required: true, icon: '🅿️' },
  { id: 'rib', label: 'RIB', required: true, icon: '🏦' },
  { id: 'kbis', label: 'KBIS / SIRENE', required: false, icon: '🏢' }
];

export function DocumentChecklistPanelV2({
  leadId,
  leadEmail,
  leadFirstName,
  accessToken,
  onDocumentsComplete,
  onRequestDocuments
}: DocumentChecklistPanelV2Props) {
  const [checklist, setChecklist] = useState<DocumentChecklist>({});
  const [prospectDocuments, setProspectDocuments] = useState<ProspectDocument[]>([]);
  const [emailAttachments, setEmailAttachments] = useState<EmailAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [draggedAttachment, setDraggedAttachment] = useState<EmailAttachment | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    console.log('🔄 DocumentChecklistPanelV2: loadData called for leadId:', leadId);
    setLoading(true);
    try {
      const [leadResult, docsResult, attachmentsResult] = await Promise.all([
        supabase
          .from('crm_leads')
          .select('document_checklist, documents_complete')
          .eq('id', leadId)
          .maybeSingle(),
        supabase
          .from('prospect_documents')
          .select('id, document_type, file_name, file_path, file_size, status, uploaded_at, notes, metadata')
          .eq('lead_id', leadId)
          .order('uploaded_at', { ascending: false }),
        supabase
          .from('email_attachments')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
      ]);

      if (leadResult.data?.document_checklist) {
        setChecklist(leadResult.data.document_checklist);
      }

      if (docsResult.data) {
        setProspectDocuments(docsResult.data);
      }

      if (attachmentsResult.data) {
        setEmailAttachments(attachmentsResult.data);
      }

      console.log('✅ DocumentChecklistPanelV2: loadData completed');
    } catch (err) {
      console.error('❌ DocumentChecklistPanelV2: Error loading document data:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    console.log('🎯 DocumentChecklistPanelV2: useEffect triggered, leadId:', leadId);
    loadData();
  }, [leadId]);

  const getDocumentStatus = (docType: string): DocumentStatus => {
    const checklistStatus = checklist[docType];

    // Chercher dans les documents uploadés directement
    const uploaded = prospectDocuments.find(d => d.document_type === docType);

    // Chercher aussi dans les pièces jointes d'emails classifiées
    const emailAttachment = emailAttachments.find(
      a => a.auto_detected_type === docType && a.classification_status === 'classified'
    );

    if (checklistStatus?.validated) {
      return { ...checklistStatus, status: 'validated' };
    }
    if (checklistStatus?.status === 'rejected') {
      return checklistStatus;
    }
    if (uploaded || emailAttachment || checklistStatus?.status === 'uploaded') {
      return {
        status: 'uploaded',
        validated: false,
        uploaded_at: uploaded?.uploaded_at || emailAttachment?.created_at,
        file_name: uploaded?.file_name || emailAttachment?.file_name
      };
    }
    return { status: 'missing', validated: false };
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

  const handleValidate = async (docType: string) => {
    setActionLoading(docType);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const adminId = userData.user?.id;

      const { error } = await supabase.rpc('validate_document', {
        p_lead_id: leadId,
        p_document_type: docType,
        p_admin_id: adminId,
        p_notes: null
      });

      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Error validating document:', err);
      toast.error('Erreur lors de la validation');
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
      const { data: userData } = await supabase.auth.getUser();
      const adminId = userData.user?.id;

      const { error } = await supabase.rpc('invalidate_document', {
        p_lead_id: leadId,
        p_document_type: docType,
        p_admin_id: adminId,
        p_reason: rejectReason
      });

      if (error) throw error;
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

  const handleRequestMissingDocuments = async () => {
    console.log('🔔 handleRequestMissingDocuments called');
    const missingDocs = getMissingDocuments();
    console.log('📋 Missing docs:', missingDocs);

    if (missingDocs.length === 0) {
      console.log('✅ No missing documents');
      return;
    }

    if (onRequestDocuments) {
      console.log('📧 Calling onRequestDocuments with:', missingDocs.map(d => d.label));
      onRequestDocuments(missingDocs.map(d => d.label));
    } else {
      console.warn('⚠️ onRequestDocuments callback not provided');
      toast.warning('Fonction de relance non configurée. Veuillez contacter le support.');
    }
  };

  const getProspectPortalUrl = () => {
    if (!accessToken) return null;
    const baseUrl = window.location.origin;
    return `${baseUrl}/espace-prospect/${accessToken}`;
  };

  const copyPortalLink = async () => {
    console.log('📋 copyPortalLink called');
    const url = getProspectPortalUrl();
    console.log('🔗 URL:', url);

    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        console.log('✅ Link copied to clipboard');
        toast.success('✅ Lien copié dans le presse-papier !');
      } catch (err) {
        console.error('❌ Error copying to clipboard:', err);
        // Fallback: afficher l'URL dans une alert
        prompt('Copiez ce lien:', url);
      }
    } else {
      console.warn('⚠️ No access token, cannot generate URL');
      toast.error('⚠️ Token d\'accès manquant. Impossible de générer le lien.');
    }
  };

  const handleDragStart = (attachment: EmailAttachment) => {
    console.log('🎯 Drag started:', attachment.file_name);
    setDraggedAttachment(attachment);
  };

  const handleDragEnd = () => {
    console.log('🎯 Drag ended');
    setDraggedAttachment(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, docType: string) => {
    e.preventDefault();
    setDropTarget(docType);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, docType: string) => {
    e.preventDefault();
    console.log('📥 Drop on:', docType, 'attachment:', draggedAttachment?.file_name);

    if (!draggedAttachment) {
      console.warn('⚠️ No dragged attachment');
      return;
    }

    setActionLoading(docType);
    try {
      // Appeler la fonction RPC pour classifier le document
      const { error } = await supabase.rpc('classify_attachment', {
        p_attachment_id: draggedAttachment.id,
        p_doc_type: docType,
        p_create_document: true
      });

      if (error) {
        console.error('❌ Error classifying attachment:', error);
        throw error;
      }

      console.log('✅ Document classified successfully');
      await loadData();
    } catch (err) {
      console.error('❌ Error in handleDrop:', err);
      toast.error('Erreur lors de la classification du document');
    } finally {
      setActionLoading(null);
      setDraggedAttachment(null);
      setDropTarget(null);
    }
  };

  const completion = getCompletionPercentage();
  const validated = getValidatedPercentage();
  const missingDocs = getMissingDocuments();

  const StatusBadge = ({ status }: { status: DocumentStatus }) => {
    if (status.validated) {
      return (
        <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
          <CheckCircle size={12} /> Valide
        </span>
      );
    }
    if (status.status === 'rejected') {
      return (
        <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
          <XCircle size={12} /> Rejete
        </span>
      );
    }
    if (status.status === 'uploaded') {
      return (
        <span className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
          <Clock size={12} /> A valider
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
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText size={20} />
            Checklist Documents
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
              <span>Recus</span>
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
              <span>Valides</span>
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

      {accessToken && (
        <div className="bg-gray-700/50 border-b border-gray-700 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <ExternalLink size={16} />
              <span>Lien Espace Prospect</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyPortalLink}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
              >
                Copier le lien
              </button>
              <a
                href={getProspectPortalUrl() || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded-lg transition-colors"
              >
                Ouvrir
              </a>
            </div>
          </div>
        </div>
      )}

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

      <div className="p-4 space-y-2">
        {DOCUMENT_TYPES.map((docType) => {
          const status = getDocumentStatus(docType.id);
          const isLoading = actionLoading === docType.id;
          const doc = prospectDocuments.find(d => d.document_type === docType.id);

          return (
            <div
              key={docType.id}
              onDragOver={(e) => handleDragOver(e, docType.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, docType.id)}
              className={`p-3 rounded-lg border transition-all ${
                dropTarget === docType.id
                  ? 'bg-blue-500/20 border-blue-500 scale-105 shadow-lg shadow-blue-500/50'
                  : status.validated
                  ? 'bg-green-500/10 border-green-500/30'
                  : status.status === 'rejected'
                  ? 'bg-red-500/10 border-red-500/30'
                  : status.status === 'uploaded'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-gray-700/50 border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{docType.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm">{docType.label}</span>
                      {docType.required && (
                        <span className="text-xs text-red-400">*</span>
                      )}
                    </div>
                    {status.file_name && (
                      <p className="text-xs text-gray-400 mt-0.5">{status.file_name}</p>
                    )}
                    {status.status === 'rejected' && status.rejection_reason && (
                      <p className="text-xs text-red-400 mt-1">
                        Raison: {status.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={status} />

                  {status.status === 'uploaded' && !status.validated && (
                    <>
                      <button
                        onClick={() => handleValidate(docType.id)}
                        disabled={isLoading}
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

                  {(doc || emailAttachments.find(a => a.auto_detected_type === docType.id && a.classification_status === 'classified')) && (
                    <a
                      href={
                        doc
                          ? (doc.metadata?.download_url ||
                            (doc.file_path.startsWith('00000000-0000-0000-0000-000000000001/')
                              ? supabase.storage.from('email-attachments').getPublicUrl(doc.file_path).data.publicUrl
                              : supabase.storage.from('prospect-documents').getPublicUrl(doc.file_path).data.publicUrl))
                          : emailAttachments.find(a => a.auto_detected_type === docType.id && a.classification_status === 'classified')?.download_url || '#'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                      title="Voir le document"
                    >
                      <Eye size={16} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {emailAttachments.length > 0 && (
        <div className="border-t border-gray-700">
          <div className="bg-gray-700/30 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-300">📨 Panier de Documents</span>
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                {emailAttachments.filter(a => a.classification_status === 'pending').length} non classés
              </span>
            </div>
            <span className="text-xs text-gray-500">
              Glissez et classez les documents reçus par email ou autre canal.
            </span>
          </div>

          <div className="p-4 space-y-2">
            <div className="bg-gray-700/30 rounded-lg p-3 border-2 border-dashed border-gray-600">
              <p className="text-xs text-gray-400 mb-3 text-center">Non classés</p>

              {emailAttachments.filter(a => a.classification_status === 'pending').length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto text-gray-600 mb-2" size={32} />
                  <p className="text-sm text-gray-500">Aucun document en attente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {emailAttachments
                    .filter(a => a.classification_status === 'pending')
                    .map((attachment) => (
                      <div
                        key={attachment.id}
                        draggable
                        onDragStart={() => handleDragStart(attachment)}
                        onDragEnd={handleDragEnd}
                        className={`bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-blue-500/50 transition-all cursor-move ${
                          draggedAttachment?.id === attachment.id ? 'opacity-50 scale-95' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="text-blue-400 flex-shrink-0" size={20} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">
                                {attachment.file_name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  {(attachment.file_size / 1024).toFixed(1)} KB
                                </span>
                                {attachment.auto_detected_type && (
                                  <span className="text-xs text-amber-400">
                                    Suggéré: {DOCUMENT_TYPES.find(d => d.id === attachment.auto_detected_type)?.label || attachment.auto_detected_type}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <a
                              href={attachment.download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                              title="Voir le document"
                            >
                              <Eye size={16} />
                            </a>
                            <a
                              href={attachment.download_url}
                              download={attachment.file_name}
                              className="p-1.5 bg-gray-600/50 hover:bg-gray-600 text-gray-400 rounded-lg transition-colors"
                              title="Télécharger"
                            >
                              <Download size={16} />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {validated === 100 && (
        <div className="bg-green-500/10 border-t border-green-500/30 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-400" size={24} />
            <div>
              <p className="font-bold text-green-400">Dossier complet</p>
              <p className="text-sm text-gray-400">Tous les documents ont ete valides</p>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full">
            <div className="p-4 border-b border-gray-700">
              <h4 className="font-bold text-white">Rejeter / Redemander le document</h4>
            </div>
            <div className="p-4">
              <label className="block text-sm text-gray-400 mb-2">
                Raison du rejet (sera affichee au prospect)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Ex: Document illisible, date expiree, mauvais document..."
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

export default DocumentChecklistPanelV2;
