import React, { useState, useEffect } from 'react';
import { FileText, Check, X, Download, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface Document {
  id: string;
  lead_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  document_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  validated: boolean;
  validated_at: string | null;
  validated_by: string | null;
}

interface DocumentValidationSimpleProps {
  leadId: string;
  leadEmail?: string;
}

const DOCUMENT_TYPES = [
  { value: 'licence_professionnelle', label: 'Licence de taxi professionnelle', icon: '🚕', required: true },
  { value: 'permis_conduire', label: 'Permis de conduire', icon: '🪪', required: true },
  { value: 'piece_identite', label: "Pièce d'identité", icon: '🆔', required: true },
  { value: 'carte_grise', label: 'Carte grise du véhicule', icon: '🚗', required: true },
  { value: 'releve_information', label: "Relevé d'information", icon: '📄', required: false },
  { value: 'kbis', label: 'Kbis / SIRENE', icon: '🏢', required: false },
  { value: 'autorisation_stationnement', label: 'Autorisation de stationnement', icon: '🅿️', required: false },
  { value: 'rib', label: 'RIB', icon: '🏦', required: false },
];

const DocumentValidationSimple: React.FC<DocumentValidationSimpleProps> = ({ leadId, leadEmail }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);

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
    } catch (error) {
      logger.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [leadId]);

  const handleValidate = async (docId: string, documentType: string) => {
    try {
      setValidating(docId);

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('prospect_documents')
        .update({
          document_type: documentType,
          validated: true,
          validated_at: new Date().toISOString(),
          validated_by: user?.id || null
        })
        .eq('id', docId);

      if (error) throw error;

      await loadDocuments();
    } catch (error) {
      logger.error('Error validating document:', error);
      alert('Erreur lors de la validation du document');
    } finally {
      setValidating(null);
    }
  };

  const handleInvalidate = async (docId: string) => {
    try {
      setValidating(docId);

      const { error } = await supabase
        .from('prospect_documents')
        .update({
          document_type: null,
          validated: false,
          validated_at: null,
          validated_by: null
        })
        .eq('id', docId);

      if (error) throw error;

      await loadDocuments();
    } catch (error) {
      logger.error('Error invalidating document:', error);
      alert('Erreur lors de l\'annulation');
    } finally {
      setValidating(null);
    }
  };

  const getDocumentUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('prospect-documents')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const getDocumentsByType = () => {
    const grouped: { [key: string]: Document[] } = {};

    documents.forEach(doc => {
      if (doc.document_type) {
        if (!grouped[doc.document_type]) {
          grouped[doc.document_type] = [];
        }
        grouped[doc.document_type].push(doc);
      }
    });

    return grouped;
  };

  const unclassifiedDocs = documents.filter(d => !d.document_type);
  const classifiedDocs = getDocumentsByType();

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
          Validation des Documents
        </h3>
        <button
          onClick={loadDocuments}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all"
        >
          <RefreshCw size={16} />
          Actualiser
        </button>
      </div>

      {/* Documents non classifiés - À traiter */}
      {unclassifiedDocs.length > 0 && (
        <div className="bg-yellow-500/10 border-2 border-yellow-500/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-yellow-500" size={24} />
            <h4 className="text-lg font-bold text-yellow-400">
              {unclassifiedDocs.length} document(s) à classifier
            </h4>
          </div>

          <div className="space-y-3">
            {unclassifiedDocs.map(doc => (
              <div key={doc.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="text-gray-400" size={20} />
                      <span className="text-white font-medium">{doc.file_name}</span>
                    </div>
                    <div className="flex gap-2 mb-3">
                      <a
                        href={getDocumentUrl(doc.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                      >
                        <ExternalLink size={14} />
                        Ouvrir
                      </a>
                      <a
                        href={getDocumentUrl(doc.file_path)}
                        download
                        className="flex items-center gap-1 text-sm text-green-400 hover:text-green-300"
                      >
                        <Download size={14} />
                        Télécharger
                      </a>
                    </div>

                    <div className="text-sm text-gray-400">
                      <strong>Ce document est :</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {DOCUMENT_TYPES.map(type => (
                        <button
                          key={type.value}
                          onClick={() => handleValidate(doc.id, type.value)}
                          disabled={validating === doc.id}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-amber-600 text-white rounded-lg transition-all text-sm disabled:opacity-50"
                        >
                          <span>{type.icon}</span>
                          <span className="text-left flex-1">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checklist des documents attendus */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h4 className="text-lg font-bold text-white mb-4">Documents Attendus</h4>

        <div className="space-y-3">
          {DOCUMENT_TYPES.map(type => {
            const docs = classifiedDocs[type.value] || [];
            const hasDoc = docs.length > 0;
            const isValidated = docs.some(d => d.validated);

            return (
              <div
                key={type.value}
                className={`rounded-lg p-4 border-2 transition-all ${
                  isValidated
                    ? 'bg-green-500/10 border-green-500/50'
                    : hasDoc
                    ? 'bg-blue-500/10 border-blue-500/50'
                    : 'bg-gray-900/50 border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{type.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{type.label}</span>
                          {type.required && (
                            <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                              Obligatoire
                            </span>
                          )}
                        </div>
                        {hasDoc && (
                          <div className="text-sm text-gray-400 mt-1">
                            {docs.length} document(s) reçu(s)
                          </div>
                        )}
                      </div>
                    </div>

                    {docs.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {docs.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between bg-gray-900/50 rounded p-3">
                            <div className="flex items-center gap-2 flex-1">
                              <FileText size={16} className="text-gray-400" />
                              <span className="text-sm text-white">{doc.file_name}</span>
                              {doc.validated && (
                                <Check className="text-green-400" size={16} />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={getDocumentUrl(doc.file_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gray-800 rounded transition-all"
                                title="Ouvrir"
                              >
                                <ExternalLink size={16} className="text-blue-400" />
                              </a>
                              {!doc.validated ? (
                                <button
                                  onClick={() => handleValidate(doc.id, type.value)}
                                  disabled={validating === doc.id}
                                  className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-all disabled:opacity-50"
                                >
                                  <Check size={14} />
                                  Valider
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleInvalidate(doc.id)}
                                  disabled={validating === doc.id}
                                  className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-all disabled:opacity-50"
                                >
                                  <X size={14} />
                                  Annuler
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    {isValidated ? (
                      <div className="flex items-center justify-center w-10 h-10 bg-green-500 rounded-full">
                        <Check className="text-white" size={20} />
                      </div>
                    ) : hasDoc ? (
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-full">
                        <FileText className="text-white" size={20} />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-10 h-10 bg-gray-700 rounded-full">
                        <AlertCircle className="text-gray-400" size={20} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lien espace prospect */}
      {leadEmail && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-white font-medium mb-1">Espace Prospect</h5>
              <p className="text-sm text-gray-400">
                Le prospect peut uploader ses documents directement
              </p>
            </div>
            <button
              onClick={() => {
                const url = `${window.location.origin}/espace-prospect?email=${encodeURIComponent(leadEmail)}`;
                navigator.clipboard.writeText(url);
                alert('Lien copié !');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
            >
              Copier le lien
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentValidationSimple;
