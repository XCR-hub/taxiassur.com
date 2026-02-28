import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { getDocumentPublicUrl } from '../../lib/utils';
import { useRealtimeDocuments } from '@/hooks/useRealtimeDocuments';
import { FileText, Download, X, CheckCircle2, AlertCircle, Loader2, Eye } from 'lucide-react';
import DocumentViewer from './DocumentViewer';

interface DocumentBasketProps {
  caseId: string;
  onDocumentClassified?: () => void;
}

interface Attachment {
  attachment_id: string;
  filename: string;
  content_type: string;
  file_size: number;
  storage_path: string;
  preview_path: string | null;
  proposed_doc_type: string | null;
  confidence: number | null;
  status: string;
  received_at: string;
  email_subject: string;
  from_email: string;
  source: string; // 'email_attachments' ou 'prospect_documents'
}

interface DocumentCategory {
  id: string;
  label: string;
  icon: string;
  required: boolean;
}

const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  { id: 'licence_taxi', label: 'Licence Taxi', icon: '🚕', required: true },
  { id: 'RIB', label: 'RIB', icon: '💳', required: true },
  { id: 'permis_conduire', label: 'Permis de conduire', icon: '🪪', required: true },
  { id: 'carte_grise', label: 'Carte grise', icon: '🚗', required: true },
  { id: 'releve_information', label: 'Relevé d\'information', icon: '📋', required: true },
  { id: 'carte_professionnelle', label: 'Carte professionnelle', icon: '🎫', required: true },
  { id: 'kbis', label: 'Kbis / SIRENE', icon: '🏢', required: false },
  { id: 'piece_identite', label: 'Pièce d\'identité', icon: '🆔', required: false },
  { id: 'autorisation_stationnement', label: 'Autorisation de stationnement', icon: '🅿️', required: false },
];

export default function DocumentBasket({ caseId, onDocumentClassified }: DocumentBasketProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [classifying, setClassifying] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{url: string; fileName: string; mimeType: string} | null>(null);

  // Rafraîchir automatiquement le panier quand un document change
  const handleDocumentChange = useCallback(() => {
    console.log('📄 Document changed, refreshing basket...');
    loadBasket();
  }, [caseId]);

  // Subscribe aux changements de documents en temps réel
  useRealtimeDocuments({
    leadId: caseId,
    onDocumentChange: handleDocumentChange,
    enabled: !!caseId
  });

  useEffect(() => {
    loadBasket();
  }, [caseId]);

  async function loadBasket() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .rpc('get_document_basket', { p_case_id: caseId });

      if (error) throw error;

      setAttachments(data || []);
    } catch (error) {
      console.error('Error loading basket:', error);
    } finally {
      setLoading(false);
    }
  }

  async function classifyAttachment(attachmentId: string, docType: string) {
    try {
      setClassifying(attachmentId);

      const { data, error } = await supabase
        .rpc('classify_attachment', {
          p_attachment_id: attachmentId,
          p_doc_type: docType,
          p_create_document: true,
        });

      if (error) throw error;

      if (data?.success) {
        await loadBasket();
        onDocumentClassified?.();
      }
    } catch (error) {
      console.error('Error classifying attachment:', error);
      alert('Erreur lors de la classification du document');
    } finally {
      setClassifying(null);
    }
  }

  async function rejectAttachment(attachmentId: string) {
    if (!confirm('Êtes-vous sûr de vouloir refuser ce document ?')) return;

    try {
      // Try email_attachments first
      let { error: emailError } = await supabase
        .from('email_attachments')
        .update({ status: 'rejected' })
        .eq('id', attachmentId);

      // If not found, try prospect_documents
      if (emailError) {
        const { error: prospectError } = await supabase
          .from('prospect_documents')
          .update({ status: 'rejected' })
          .eq('id', attachmentId);

        if (prospectError) throw prospectError;
      }

      await loadBasket();
    } catch (error) {
      console.error('Error rejecting attachment:', error);
      alert('Erreur lors du refus du document');
    }
  }

  function handleDragStart(attachmentId: string) {
    setDraggedItem(attachmentId);
  }

  function handleDragEnd() {
    setDraggedItem(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent, docType: string) {
    e.preventDefault();

    if (draggedItem) {
      classifyAttachment(draggedItem, docType);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getConfidenceColor(confidence: number | null): string {
    if (!confidence) return 'text-gray-400';
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-orange-600';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          📦 Panier de Documents
          {attachments.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-600">
              ({attachments.length} en attente)
            </span>
          )}
        </h3>
        <button
          onClick={loadBasket}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : Documents non classés */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4">Non classés</h4>

            {attachments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun document en attente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.attachment_id}
                    draggable
                    onDragStart={() => handleDragStart(attachment.attachment_id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white rounded-lg p-4 border-2 border-gray-200 cursor-move hover:border-blue-400 transition-all ${
                      draggedItem === attachment.attachment_id ? 'opacity-50 scale-95' : ''
                    } ${classifying === attachment.attachment_id ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {attachment.filename}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatFileSize(attachment.file_size)} • {new Date(attachment.received_at).toLocaleDateString()}
                        </p>
                      </div>
                      <FileText className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
                    </div>

                    {attachment.proposed_doc_type && attachment.proposed_doc_type !== 'autre' && (
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-xs">✨</span>
                        <span className={`text-xs font-medium ${getConfidenceColor(attachment.confidence)}`}>
                          Proposé: {DOCUMENT_CATEGORIES.find(c => c.id === attachment.proposed_doc_type)?.label || attachment.proposed_doc_type}
                          {attachment.confidence && ` (${Math.round(attachment.confidence * 100)}%)`}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => {
                          // Utiliser la source correcte pour détecter le bon bucket
                          const url = getDocumentPublicUrl(attachment.storage_path, attachment.source, supabase);
                          setViewingDoc({
                            url,
                            fileName: attachment.filename,
                            mimeType: attachment.content_type
                          });
                        }}
                        className="flex-1 text-xs py-1.5 px-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                      >
                        <Eye className="h-3 w-3 inline mr-1" />
                        Voir
                      </button>
                      <button
                        onClick={() => rejectAttachment(attachment.attachment_id)}
                        className="text-xs py-1.5 px-2 bg-red-50 text-red-600 rounded hover:bg-red-100"
                      >
                        <X className="h-3 w-3 inline" />
                      </button>
                    </div>

                    {classifying === attachment.attachment_id && (
                      <div className="mt-2 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="ml-2 text-xs text-gray-600">Classification...</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Colonnes droites : Catégories de documents */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DOCUMENT_CATEGORIES.map((category) => (
              <div
                key={category.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, category.id)}
                className={`bg-white rounded-lg p-4 border-2 border-dashed transition-all ${
                  draggedItem
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{category.icon}</span>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 text-sm">
                      {category.label}
                      {category.required && (
                        <span className="ml-1 text-red-500">*</span>
                      )}
                    </h5>
                  </div>
                </div>

                {draggedItem ? (
                  <div className="text-center py-6 text-sm text-blue-600">
                    Déposer ici →
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-gray-400">
                    Glissez un document ici
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Comment ça marche ?</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>Cliquez et glissez un document depuis la colonne de gauche</li>
              <li>Déposez-le dans la catégorie appropriée</li>
              <li>Le document sera automatiquement ajouté au dossier</li>
            </ol>
          </div>
        </div>
      </div>

      {viewingDoc && (
        <DocumentViewer
          url={viewingDoc.url}
          fileName={viewingDoc.fileName}
          mimeType={viewingDoc.mimeType}
          onClose={() => setViewingDoc(null)}
        />
      )}
    </div>
  );
}
