import React, { useState, useEffect } from 'react';
import { FileText, Check, X, Download, ExternalLink, AlertCircle, RefreshCw, ShoppingCart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface Document {
  id: string;
  lead_id: string;
  file_name: string;
  file_path: string;
  document_type: string | null;
  source: 'prospect_documents' | 'email_attachments';
  uploaded_at: string;
  validated: boolean;
}

interface DocumentDragDropSimpleProps {
  leadId: string;
  leadEmail?: string;
}

const DOCUMENT_TYPES = [
  { value: 'licence_professionnelle', label: 'Licence taxi', icon: '🚕', required: true },
  { value: 'permis_conduire', label: 'Permis de conduire', icon: '🪪', required: true },
  { value: 'piece_identite', label: "Pièce d'identité", icon: '🆔', required: true },
  { value: 'carte_grise', label: 'Carte grise', icon: '🚗', required: true },
  { value: 'releve_information', label: "Relevé d'information", icon: '📄', required: false },
  { value: 'justificatif_domicile', label: 'Justificatif domicile', icon: '🏠', required: false },
  { value: 'kbis', label: 'Kbis / SIRENE', icon: '🏢', required: false },
  { value: 'autorisation_stationnement', label: 'Autorisation stationnement', icon: '🅿️', required: false },
  { value: 'rib', label: 'RIB', icon: '🏦', required: false },
];

const DocumentDragDropSimple: React.FC<DocumentDragDropSimpleProps> = ({ leadId, leadEmail }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedDoc, setDraggedDoc] = useState<Document | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const loadAllDocuments = async () => {
    try {
      setLoading(true);

      // Documents depuis prospect_documents
      const { data: prospectDocs, error: prospectError } = await supabase
        .from('prospect_documents')
        .select('*')
        .eq('lead_id', leadId);

      if (prospectError) throw prospectError;

      // Documents depuis email_attachments
      const { data: emailAttachments, error: attachError } = await supabase
        .from('email_attachments')
        .select('*')
        .eq('lead_id', leadId)
        .is('document_type', null); // Seulement non classifiés

      if (attachError) throw attachError;

      // Combiner les deux sources
      const allDocs: Document[] = [
        ...(prospectDocs || []).map(d => ({
          id: d.id,
          lead_id: d.lead_id,
          file_name: d.file_name,
          file_path: d.file_path,
          document_type: d.document_type,
          source: 'prospect_documents' as const,
          uploaded_at: d.uploaded_at,
          validated: d.validated || false
        })),
        ...(emailAttachments || []).map(d => ({
          id: d.id,
          lead_id: d.lead_id || leadId,
          file_name: d.file_name,
          file_path: d.file_path,
          document_type: d.document_type,
          source: 'email_attachments' as const,
          uploaded_at: d.created_at,
          validated: false
        }))
      ];

      setDocuments(allDocs);
    } catch (error) {
      logger.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllDocuments();
  }, [leadId]);

  const handleDragStart = (e: React.DragEvent, doc: Document) => {
    setDraggedDoc(doc);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', doc.id);
  };

  const handleDragOver = (e: React.DragEvent, docType: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(docType);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, docType: string) => {
    e.preventDefault();
    setDropTarget(null);

    if (!draggedDoc) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Mettre à jour le document dans la bonne table
      if (draggedDoc.source === 'prospect_documents') {
        const { error } = await supabase
          .from('prospect_documents')
          .update({
            document_type: docType,
            validated: true,
            validated_at: new Date().toISOString(),
            validated_by: user?.id || null
          })
          .eq('id', draggedDoc.id);

        if (error) throw error;
      } else {
        // Pour email_attachments, on crée une entrée dans prospect_documents
        const { error } = await supabase
          .from('prospect_documents')
          .insert({
            lead_id: leadId,
            file_name: draggedDoc.file_name,
            file_path: draggedDoc.file_path,
            file_type: 'application/pdf',
            file_size: 0,
            document_type: docType,
            uploaded_by: user?.id || null,
            uploaded_at: new Date().toISOString(),
            validated: true,
            validated_at: new Date().toISOString(),
            validated_by: user?.id || null
          });

        if (error) throw error;

        // Marquer l'attachment comme classifié
        await supabase
          .from('email_attachments')
          .update({ document_type: docType })
          .eq('id', draggedDoc.id);
      }

      await loadAllDocuments();
      setDraggedDoc(null);
    } catch (error) {
      logger.error('Error classifying document:', error);
      alert('Erreur lors de la classification du document');
    }
  };

  const handleValidate = async (docId: string, docType: string, source: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (source === 'prospect_documents') {
        const { error } = await supabase
          .from('prospect_documents')
          .update({
            document_type: docType,
            validated: true,
            validated_at: new Date().toISOString(),
            validated_by: user?.id || null
          })
          .eq('id', docId);

        if (error) throw error;
      } else {
        // Créer dans prospect_documents
        const doc = documents.find(d => d.id === docId);
        if (!doc) return;

        const { error } = await supabase
          .from('prospect_documents')
          .insert({
            lead_id: leadId,
            file_name: doc.file_name,
            file_path: doc.file_path,
            file_type: 'application/pdf',
            file_size: 0,
            document_type: docType,
            uploaded_by: user?.id || null,
            uploaded_at: new Date().toISOString(),
            validated: true,
            validated_at: new Date().toISOString(),
            validated_by: user?.id || null
          });

        if (error) throw error;

        await supabase
          .from('email_attachments')
          .update({ document_type: docType })
          .eq('id', docId);
      }

      await loadAllDocuments();
    } catch (error) {
      logger.error('Error validating document:', error);
      alert('Erreur lors de la validation');
    }
  };

  const getDocumentUrl = (filePath: string, source: string) => {
    const bucket = source === 'prospect_documents' ? 'prospect-documents' : 'email-attachments';
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const unclassifiedDocs = documents.filter(d => !d.document_type);
  const classifiedDocs = documents.reduce((acc, doc) => {
    if (doc.document_type) {
      if (!acc[doc.document_type]) acc[doc.document_type] = [];
      acc[doc.document_type].push(doc);
    }
    return acc;
  }, {} as { [key: string]: Document[] });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="text-amber-500" size={24} />
          Gestion des Documents
        </h3>
        <button
          onClick={loadAllDocuments}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all"
        >
          <RefreshCw size={16} />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* PANIER À GAUCHE - 4 colonnes */}
        <div className="col-span-4">
          <div className="bg-yellow-500/10 border-2 border-yellow-500/50 rounded-xl p-6 sticky top-4">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="text-yellow-500" size={24} />
              <h4 className="text-lg font-bold text-yellow-400">
                Panier ({unclassifiedDocs.length})
              </h4>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              Glissez ces documents vers les cartes à droite
            </p>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {unclassifiedDocs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart size={48} className="mx-auto mb-2 opacity-30" />
                  <p>Aucun document en attente</p>
                </div>
              ) : (
                unclassifiedDocs.map(doc => (
                  <div
                    key={doc.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, doc)}
                    className="bg-gray-900/50 rounded-lg p-3 border border-gray-700 cursor-move hover:border-yellow-500 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="text-gray-400" size={16} />
                      <span className="text-white text-sm font-medium flex-1 truncate">
                        {doc.file_name}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={getDocumentUrl(doc.file_path, doc.source)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        Voir
                      </a>
                      <a
                        href={getDocumentUrl(doc.file_path, doc.source)}
                        download
                        className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                      >
                        <Download size={12} />
                        DL
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* CARTES À DROITE - 8 colonnes */}
        <div className="col-span-8">
          <div className="grid grid-cols-2 gap-4">
            {DOCUMENT_TYPES.map(type => {
              const docs = classifiedDocs[type.value] || [];
              const hasDoc = docs.length > 0;
              const isValidated = docs.some(d => d.validated);

              return (
                <div
                  key={type.value}
                  onDragOver={(e) => handleDragOver(e, type.value)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, type.value)}
                  className={`rounded-xl p-4 border-2 transition-all min-h-[150px] ${
                    dropTarget === type.value
                      ? 'border-amber-500 bg-amber-500/20 scale-105'
                      : isValidated
                      ? 'border-green-500/50 bg-green-500/10'
                      : hasDoc
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{type.icon}</span>
                      <div>
                        <div className="text-white font-medium text-sm">
                          {type.label}
                        </div>
                        {type.required && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                            Obligatoire
                          </span>
                        )}
                      </div>
                    </div>
                    {isValidated ? (
                      <Check className="text-green-400" size={20} />
                    ) : hasDoc ? (
                      <AlertCircle className="text-blue-400" size={20} />
                    ) : (
                      <AlertCircle className="text-gray-600" size={20} />
                    )}
                  </div>

                  {dropTarget === type.value && (
                    <div className="text-amber-400 text-sm font-bold mb-2">
                      Déposez le document ici
                    </div>
                  )}

                  {docs.length > 0 && (
                    <div className="space-y-2">
                      {docs.map(doc => (
                        <div
                          key={doc.id}
                          className="bg-gray-900/50 rounded p-2 border border-gray-700"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-white truncate flex-1">
                              {doc.file_name}
                            </span>
                            <div className="flex items-center gap-1">
                              <a
                                href={getDocumentUrl(doc.file_path, doc.source)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-gray-800 rounded"
                              >
                                <ExternalLink size={12} className="text-blue-400" />
                              </a>
                              {doc.validated && (
                                <Check className="text-green-400" size={14} />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!hasDoc && (
                    <div className="text-center text-gray-500 text-sm mt-4">
                      Glissez un document ici
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentDragDropSimple;
