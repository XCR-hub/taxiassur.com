import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Trash2, CheckCircle, XCircle, Clock, File, Image, AlertCircle, Calendar, User, ZoomIn, Upload, Search, Filter, Grid2x2 as Grid, List, Star, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Document {
  id: string;
  file_name: string;
  document_type: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  status: string;
  uploaded_at: string;
  verified_at?: string;
  notes?: string;
}

interface ClientDocumentsViewerProps {
  leadId: string;
  compact?: boolean;
}

const ClientDocumentsViewer: React.FC<ClientDocumentsViewerProps> = ({ leadId, compact = false }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [leadId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospect_documents')
        .select('*')
        .eq('lead_id', leadId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${leadId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('prospect-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('prospect_documents')
        .insert({
          lead_id: leadId,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          document_type: 'other',
          status: 'pending'
        });

      if (insertError) throw insertError;

      await loadDocuments();
      alert('Document uploadé avec succès !');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Erreur lors de l\'upload du document');
    } finally {
      setUploading(false);
    }
  };

  const getDocumentIcon = (mimeType?: string, fileName?: string) => {
    if (!mimeType && !fileName) return <File className="w-10 h-10 text-gray-400" />;

    const type = mimeType || '';
    const name = fileName || '';

    if (type.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(name)) {
      return <Image className="w-10 h-10 text-blue-500" />;
    }
    if (type.includes('pdf') || name.endsWith('.pdf')) {
      return <FileText className="w-10 h-10 text-red-500" />;
    }
    return <File className="w-10 h-10 text-gray-400" />;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { icon: any; color: string; bg: string; text: string }> = {
      pending: { icon: Clock, color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', text: 'En attente de vérification' },
      verified: { icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-50 border-green-200', text: 'Vérifié ✓' },
      rejected: { icon: XCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200', text: 'À corriger' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border ${config.bg} ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.text}
      </span>
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getDocumentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      carte_grise: 'Carte Grise',
      permis_conduire: 'Permis de Conduire',
      carte_pro: 'Carte Professionnelle',
      kbis: 'KBIS',
      licence_taxi: 'Licence Taxi',
      autorisation_stationnement: 'Autorisation Stationnement',
      rib: 'RIB',
      justificatif_domicile: 'Justificatif de Domicile',
      other: 'Autre Document'
    };
    return types[type] || type;
  };

  const downloadDocument = async (doc: Document) => {
    if (!doc.file_path) {
      alert('Fichier non disponible');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('prospect-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Erreur lors du téléchargement');
    }
  };

  const previewDocument = async (doc: Document) => {
    setSelectedDoc(doc);

    if (!doc.file_path) return;

    try {
      const { data } = await supabase.storage
        .from('prospect-documents')
        .getPublicUrl(doc.file_path);

      setPreviewUrl(data.publicUrl);
    } catch (error) {
      console.error('Error loading preview:', error);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: documents.length,
    verified: documents.filter(d => d.status === 'verified').length,
    pending: documents.filter(d => d.status === 'pending').length,
    rejected: documents.filter(d => d.status === 'rejected').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 text-sm font-semibold">Total</p>
              <p className="text-4xl font-bold text-yellow-700 mt-2">{stats.total}</p>
            </div>
            <FileText className="w-12 h-12 text-yellow-500 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-semibold">Vérifiés</p>
              <p className="text-4xl font-bold text-green-700 mt-2">{stats.verified}</p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-500 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 text-sm font-semibold">En attente</p>
              <p className="text-4xl font-bold text-yellow-700 mt-2">{stats.pending}</p>
            </div>
            <Clock className="w-12 h-12 text-yellow-500 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-600 text-sm font-semibold">À corriger</p>
              <p className="text-4xl font-bold text-red-700 mt-2">{stats.rejected}</p>
            </div>
            <XCircle className="w-12 h-12 text-red-500 opacity-30" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors cursor-pointer font-semibold">
          <Upload className="w-5 h-5" />
          {uploading ? 'Upload en cours...' : 'Ajouter un document'}
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>

        <div className="flex-1 min-w-[250px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          className="p-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
        </button>

        <button
          onClick={loadDocuments}
          className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
        >
          <RefreshCw className="w-5 h-5" />
          Actualiser
        </button>
      </div>

      {/* Documents Grid/List */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
          <FileText className="w-20 h-20 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-700 text-lg font-bold mb-2">Aucun document</p>
          <p className="text-gray-500">Commencez par uploader vos documents</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all cursor-pointer group"
              onClick={() => previewDocument(doc)}
            >
              <div className="flex items-start justify-between mb-4">
                {getDocumentIcon(doc.mime_type, doc.file_name)}
                {getStatusBadge(doc.status)}
              </div>

              <h4 className="font-bold text-gray-900 mb-3 text-lg group-hover:text-pink-600 transition-colors truncate">
                {doc.file_name}
              </h4>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Ajouté le {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <File className="w-4 h-4" />
                  <span>{formatFileSize(doc.file_size)}</span>
                </div>
              </div>

              {doc.notes && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    <strong>Note:</strong> {doc.notes}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={(e) => { e.stopPropagation(); downloadDocument(doc); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors font-semibold"
                >
                  <Download className="w-4 h-4" />
                  Télécharger
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); previewDocument(doc); }}
                  className="flex items-center justify-center px-4 py-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Document</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Taille</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Statut</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getDocumentIcon(doc.mime_type, doc.file_name)}
                        <span className="font-semibold text-gray-900">{doc.file_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatFileSize(doc.file_size)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(doc.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => previewDocument(doc)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => downloadDocument(doc)}
                          className="p-2 text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedDoc.file_name}</h3>
                <p className="text-gray-600 mt-1">{getDocumentTypeLabel(selectedDoc.document_type)}</p>
              </div>
              <button
                onClick={() => { setSelectedDoc(null); setPreviewUrl(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              {previewUrl ? (
                selectedDoc.mime_type?.includes('image') ? (
                  <img src={previewUrl} alt={selectedDoc.file_name} className="max-w-full h-auto mx-auto rounded-lg shadow-lg" />
                ) : selectedDoc.mime_type?.includes('pdf') ? (
                  <iframe src={previewUrl} className="w-full h-[600px] rounded-lg shadow-lg" />
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Aperçu non disponible</p>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 p-6 border-t border-gray-200 bg-white">
              <button
                onClick={() => downloadDocument(selectedDoc)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-bold"
              >
                <Download className="w-5 h-5" />
                Télécharger
              </button>
              <button
                onClick={() => { setSelectedDoc(null); setPreviewUrl(null); }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDocumentsViewer;
