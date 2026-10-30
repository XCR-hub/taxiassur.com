import { useState, useEffect } from 'react';
import { normalizeDocumentType } from '@/lib/document-categories';
import { toast } from '@/lib/toast';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Upload,
  Eye,
  Download,
  RefreshCw,
  Plus,
  Trash2
} from 'lucide-react';
import { nativeAdminCall, nativeAdminUploadLeadDocument, nativeAdminUpdateDocument, nativeAdminDeleteDocument, nativeAdminOpenDocument, nativeAdminDownloadDocument } from '@/lib/native-admin-data';
import { documentValidationError } from '@/lib/native-document-status';
import { getRequiredDocuments } from '@/lib/document-requirements';

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  status: 'pending' | 'validated' | 'verified' | 'rejected' | 'quarantined';
  uploaded_at: string;
  validated_at?: string;
  notes?: string;
}

interface DocumentChecklistPanelProps {
  leadId: string;
  vehicleType?: string | null;
  onDocumentUpload?: () => void;
  onRequestDocuments?: (missingDocs: string[]) => void;
}

export function DocumentChecklistPanel({ leadId, vehicleType, onDocumentUpload, onRequestDocuments }: DocumentChecklistPanelProps) {
  const REQUIRED_DOCUMENTS = getRequiredDocuments(vehicleType).map((d, i) => ({
    type: d.type,
    label: d.label,
    required: d.required,
    priority: i + 1
  }));
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ type: 'carte_grise', file: null as File | null, notes: '' });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [leadId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await nativeAdminCall<{ documents?: Document[] }>(`/v1/admin/documents?lead_id=${encodeURIComponent(leadId)}&scope=all`);
      setDocuments([...new Map((data.documents || []).filter(doc => doc.file_path).map(doc => [doc.id, doc])).values()]);
    } catch (err) {
      console.error('Error loading documents:', err);
      toast.error('Impossible de charger les documents');
    } finally {
      setLoading(false);
    }
  };

  const getDocumentStatus = (docType: string) => {
    const doc = documents.find(d => normalizeDocumentType(d.document_type) === normalizeDocumentType(docType));
    if (!doc) return { status: 'missing', doc: null };
    return { status: doc.status === 'verified' ? 'validated' : doc.status, doc };
  };

  const getMissingRequiredDocs = () => {
    return REQUIRED_DOCUMENTS
      .filter(d => d.required && getDocumentStatus(d.type).status === 'missing')
      .map(d => d.label);
  };

  const getCompletionPercentage = () => {
    const requiredDocs = REQUIRED_DOCUMENTS.filter(d => d.required);
    const validatedDocs = requiredDocs.filter(d => {
      const status = getDocumentStatus(d.type);
      return status.status === 'validated';
    });
    return requiredDocs.length ? Math.round((validatedDocs.length / requiredDocs.length) * 100) : 100;
  };

  const handleUpload = async () => {
    if (!uploadForm.file) return;

    setUploading(true);
    try {
      await nativeAdminUploadLeadDocument(leadId, uploadForm.type, uploadForm.file, undefined, 'classified', uploadForm.notes);

      setShowUploadModal(false);
      setUploadForm({ type: 'carte_grise', file: null, notes: '' });
      await loadDocuments();
      if (onDocumentUpload) onDocumentUpload();
    } catch (err) {
      console.error('Upload error:', err);
      const code = err instanceof Error ? err.message : '';
      toast.error(code === 'infected_file' ? 'Fichier refusé par le contrôle antivirus.' : code === 'scan_failed' ? 'Le contrôle antivirus est indisponible. Réessayez plus tard.' : 'Impossible de déposer le document. Vérifiez le format du fichier et votre session.');
    } finally {
      setUploading(false);
    }
  };

  const handleValidate = async (docId: string) => {
    try {
      await nativeAdminUpdateDocument(docId, { status: 'validated' });
      await loadDocuments();
    } catch (err) {
      console.error('Validation error:', err);
      toast.error(documentValidationError(err));
    }
  };

  const handleReject = async (docId: string) => {
    const reason = prompt('Raison du rejet:');
    if (!reason) return;

    try {
      await nativeAdminUpdateDocument(docId, { status: 'rejected', rejection_reason: reason });
      await loadDocuments();
    } catch (err) {
      console.error('Reject error:', err);
      toast.error('Impossible de refuser le document');
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Supprimer ce document?')) return;

    try {
      await nativeAdminDeleteDocument(docId);
      await loadDocuments();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Impossible de supprimer le document');
    }
  };

  const openDocument = async (doc: Document, download = false) => {
    try {
      if (download) await nativeAdminDownloadDocument(doc.id, doc.file_name);
      else await nativeAdminOpenDocument(doc.id);
    } catch { toast.error('Impossible d’ouvrir le document'); }
  };

  const completion = getCompletionPercentage();
  const missingDocs = getMissingRequiredDocs();

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'validated':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-blue-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents du Dossier
          </h3>
          <button
            onClick={loadDocuments}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-blue-100 mb-1">
            <span>Complétion du dossier</span>
            <span className="font-bold text-white">{completion}%</span>
          </div>
          <div className="w-full h-3 bg-blue-800/50 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                completion === 100 ? 'bg-green-400' : completion >= 60 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      </div>

      {missingDocs.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">Documents manquants :</p>
              <p className="text-sm text-amber-700">{missingDocs.join(', ')}</p>
            </div>
            {onRequestDocuments && (
              <button
                onClick={() => onRequestDocuments(missingDocs)}
                className="px-3 py-1 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
              >
                Demander
              </button>
            )}
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="space-y-2">
          {REQUIRED_DOCUMENTS.map((docConfig) => {
            const { status, doc } = getDocumentStatus(docConfig.type);

            return (
              <div
                key={docConfig.type}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  status === 'validated'
                    ? 'bg-green-50 border-green-200'
                    : status === 'pending'
                    ? 'bg-yellow-50 border-yellow-200'
                    : status === 'rejected'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <StatusIcon status={status} />
                  <div>
                    <p className={`font-medium ${
                      status === 'missing' ? 'text-gray-500' : 'text-gray-900'
                    }`}>
                      {docConfig.label}
                      {docConfig.required && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    {doc && (
                      <p className="text-xs text-gray-500">
                        {status === 'quarantined' && 'En quarantaine — '}{doc.file_name} - {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {doc ? (
                    <>
                      {['pending', 'quarantined'].includes(status) && (
                        <>
                          <button
                            onClick={() => handleValidate(doc.id)}
                            disabled={status === 'quarantined'}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                            title="Valider"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(doc.id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Rejeter"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Voir"
                        onClick={() => openDocument(doc)}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Telecharger"
                        onClick={() => openDocument(doc, true)}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setUploadForm({ ...uploadForm, type: docConfig.type });
                        setShowUploadModal(true);
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="mt-4 w-full px-4 py-3 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Ajouter un autre document
        </button>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h4 className="font-bold text-gray-900">Ajouter un document</h4>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={uploadForm.type}
                  onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  {REQUIRED_DOCUMENTS.map(d => (
                    <option key={d.type} value={d.type}>{d.label}</option>
                  ))}
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fichier</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={uploadForm.notes}
                  maxLength={2000}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  placeholder="Notes optionnelles..."
                />
              </div>
              <button
                onClick={handleUpload}
                disabled={!uploadForm.file || uploading}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Uploader
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
