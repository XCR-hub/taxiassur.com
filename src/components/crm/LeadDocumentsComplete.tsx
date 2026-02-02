import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  FileText,
  Download,
  Eye,
  Building2,
  User,
  CheckCircle,
  Clock,
  ExternalLink,
  FolderOpen
} from 'lucide-react';

interface LeadDocument {
  document_id: string;
  document_name: string;
  document_type: string;
  document_category: string;
  file_url: string;
  file_size_bytes: number;
  source: 'company_library' | 'prospect_upload' | 'contract';
  is_company_document: boolean;
  company_name: string | null;
  created_at: string;
}

interface LeadDocumentsCompleteProps {
  leadId: string;
}

export default function LeadDocumentsComplete({ leadId }: LeadDocumentsCompleteProps) {
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<'source' | 'category'>('source');

  useEffect(() => {
    if (leadId) {
      loadDocuments();
    }
  }, [leadId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_lead_documents', {
        p_lead_id: leadId
      });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading lead documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'company_library':
        return <Building2 className="w-5 h-5 text-purple-600" />;
      case 'prospect_upload':
        return <User className="w-5 h-5 text-blue-600" />;
      case 'contract':
        return <FileText className="w-5 h-5 text-green-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'company_library':
        return 'Documents Compagnie';
      case 'prospect_upload':
        return 'Documents Prospect';
      case 'contract':
        return 'Documents Contractuels';
      default:
        return source;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      legal: 'Légal',
      contractuel: 'Contractuel',
      information: 'Information',
      identity: 'Identité',
      vehicle: 'Véhicule',
      paiement: 'Paiement',
      contrat: 'Contrat'
    };
    return labels[category] || category;
  };

  const groupedDocuments = groupBy === 'source'
    ? documents.reduce((acc, doc) => {
        const key = doc.source;
        if (!acc[key]) acc[key] = [];
        acc[key].push(doc);
        return acc;
      }, {} as Record<string, LeadDocument[]>)
    : documents.reduce((acc, doc) => {
        const key = doc.document_category;
        if (!acc[key]) acc[key] = [];
        acc[key].push(doc);
        return acc;
      }, {} as Record<string, LeadDocument[]>);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Chargement des documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-600" />
              Documents du Lead
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {documents.length} document(s) total
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setGroupBy('source')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                groupBy === 'source'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Par source
            </button>
            <button
              onClick={() => setGroupBy('category')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                groupBy === 'category'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Par catégorie
            </button>
          </div>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Aucun document</h4>
          <p className="text-gray-600">
            Les documents seront ajoutés automatiquement lors de l'upload du devis
          </p>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {Object.entries(groupedDocuments).map(([groupKey, groupDocs]) => (
            <div key={groupKey}>
              <div className="flex items-center gap-2 mb-3">
                {groupBy === 'source' ? getSourceIcon(groupKey) : <FileText className="w-5 h-5 text-gray-600" />}
                <h4 className="font-semibold text-gray-900">
                  {groupBy === 'source' ? getSourceLabel(groupKey) : getCategoryLabel(groupKey)}
                </h4>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                  {groupDocs.length}
                </span>
              </div>

              <div className="space-y-2">
                {groupDocs.map(doc => (
                  <div
                    key={doc.document_id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getSourceIcon(doc.source)}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium text-gray-900 truncate">
                            {doc.document_name}
                          </h5>
                          {doc.is_company_document && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                              Auto-attaché
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                          {doc.company_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {doc.company_name}
                            </span>
                          )}
                          <span>{getCategoryLabel(doc.document_category)}</span>
                          <span>{formatBytes(doc.file_size_bytes)}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ouvrir"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <a
                        href={doc.file_url}
                        download
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info footer */}
      {documents.some(d => d.is_company_document) && (
        <div className="px-6 py-4 bg-purple-50 border-t border-purple-100">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-purple-900">Documents auto-attachés</p>
              <p className="text-purple-700">
                Ces documents ont été automatiquement attachés depuis la bibliothèque de la compagnie d'assurance
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
