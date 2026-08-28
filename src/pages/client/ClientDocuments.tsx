import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText, Download, Eye, Upload, CheckCircle, Clock, XCircle,
  AlertCircle, RefreshCw, Loader, FolderOpen,
  FileImage, FileArchive, File, UploadCloud, Filter, Receipt,
  ScrollText, Plus, type LucideIcon
} from 'lucide-react';
import ClientLayout from '../../components/client/ClientLayout';
import SEOHead from '../../components/SEOHead';
import { logger } from '@/lib/logger';
import { getClientAccessToken } from '@/lib/client-access';
import { loadClientPlatformSession, openClientPlatformDocument, uploadClientPlatformDocument } from '@/lib/client-platform-api';

interface Document {
  id: string;
  name: string;
  document_type: string;
  category: string;
  file_size: number | null;
  mime_type: string | null;
  status: string;
  source: string;
  download_path?: string;
  uploaded_at: string;
  validated: boolean;
}

type Tab = 'contract' | 'primes' | 'mine';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: LucideIcon }> = {
  verified:  { label: 'Validé',     bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle },
  validated: { label: 'Validé',     bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle },
  available: { label: 'Disponible', bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle },
  pending:   { label: 'En attente', bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200',   icon: Clock },
  rejected:  { label: 'Refusé',     bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200',     icon: XCircle },
  default:   { label: 'Reçu',       bg: 'bg-gray-50',     text: 'text-gray-600',    border: 'border-gray-200',    icon: FileText },
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime: string | null, docType?: string) {
  if (docType?.includes('prime') || docType?.includes('facture') || docType?.includes('quittance')) return Receipt;
  if (!mime) return File;
  if (mime.startsWith('image/')) return FileImage;
  if (mime === 'application/pdf') return FileText;
  if (mime.includes('zip') || mime.includes('rar')) return FileArchive;
  return File;
}

function isPrimeDoc(doc: Document): boolean {
  const name = doc.name?.toLowerCase() || '';
  const type = doc.document_type?.toLowerCase() || '';
  const keywords = ['prime', 'facture', 'quittance', 'echeance', 'échéance', 'appel', 'cotisation', 'prélèvement', 'prelevement'];
  return keywords.some(k => name.includes(k) || type.includes(k));
}

function isContractDoc(doc: Document): boolean {
  if (doc.category === 'company_document') return true;
  if (doc.category === 'crm_upload') {
    if (isPrimeDoc(doc)) return false;
    return true;
  }
  return false;
}

function StatusBadge({ status, validated }: { status: string; validated: boolean }) {
  const key = validated ? 'validated' : (STATUS_CONFIG[status] ? status : 'default');
  const cfg = STATUS_CONFIG[key];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}
const TAB_META: Record<Tab, { label: string; icon: LucideIcon; color: string; emptyMsg: string; emptyHint: string }> = {
  contract: {
    label: 'Mon contrat',
    icon: ScrollText,
    color: 'text-blue-600',
    emptyMsg: 'Aucun document contractuel',
    emptyHint: 'Vos DP, DG, attestations et documents assureur apparaîtront ici une fois votre dossier traité.',
  },
  primes: {
    label: 'Mes appels de primes',
    icon: Receipt,
    color: 'text-amber-600',
    emptyMsg: 'Aucun appel de prime',
    emptyHint: 'Vos factures et appels de cotisation seront disponibles ici.',
  },
  mine: {
    label: 'Mes documents envoyés',
    icon: Upload,
    color: 'text-yellow-600',
    emptyMsg: 'Aucun document envoyé',
    emptyHint: 'Utilisez le bouton ci-dessus pour envoyer vos documents.',
  },
};

export default function ClientDocuments() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const accessToken = getClientAccessToken(searchParams.get('token'));

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('contract');
  const [dragOver, setDragOver] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!accessToken) { navigate('/espace-client'); return; }
    loadDocuments();
  }, [accessToken, navigate]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await loadClientPlatformSession(accessToken);
      setDocuments(data.documents as unknown as Document[]);
    } catch (err) {
      logger.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (doc: Document) => {
    if (!doc.download_path || !accessToken) return;
    try {
      await openClientPlatformDocument(accessToken, doc.download_path, doc.name);
    } catch (error: unknown) {
      setUploadError(error instanceof Error ? error.message : "Impossible d'ouvrir le document");
    }
  };

  const handleDownload = async (doc: Document) => {
    if (!doc.download_path || !accessToken) return;
    try {
      await openClientPlatformDocument(accessToken, doc.download_path, doc.name, true);
    } catch (error: unknown) {
      setUploadError(error instanceof Error ? error.message : 'Téléchargement impossible');
    }
  };

  const processFile = async (file: File) => {
    if (!accessToken) return;
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`Fichier trop volumineux (${formatBytes(file.size)}). La limite est de 10 MB.`);
      return;
    }
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Type de fichier refusé. Formats autorisés : PDF, JPG, PNG ou WEBP.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    setUploadProgress(10);
    try {
      setUploadProgress(35);
      await uploadClientPlatformDocument(accessToken, file);
      setUploadProgress(75);
      setUploadProgress(100);
      setUploadSuccess(true);
      setActiveTab('mine');
      setTimeout(() => { setUploadSuccess(false); setUploadProgress(0); setShowUpload(false); }, 3000);
      await loadDocuments();
    } catch (err) {
      logger.error('Secure client document upload failed');
      setUploadError(err instanceof Error ? err.message : "Erreur lors de l'envoi du fichier");
      setUploadProgress(0);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [accessToken]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const contractDocs  = documents.filter(isContractDoc);
  const primeDocs     = documents.filter(d => isPrimeDoc(d));
  const mineDocs      = documents.filter(d => d.category === 'prospect_upload');

  const tabDocs: Record<Tab, Document[]> = {
    contract: contractDocs,
    primes: primeDocs,
    mine: mineDocs,
  };

  const filteredDocs = tabDocs[activeTab];

  const tabs: { id: Tab; count: number }[] = [
    { id: 'contract', count: contractDocs.length },
    { id: 'primes',   count: primeDocs.length },
    { id: 'mine',     count: mineDocs.length },
  ];

  return (
    <>
      <SEOHead
        title="Mes Documents - Espace Client TaxiAssur"
        description="Consultez et gérez vos documents d'assurance"
        noIndex={true}
      />

      <ClientLayout email="">
        <div className="space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mes Documents</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Tous vos documents d'assurance en un seul endroit
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={loadDocuments}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-lg transition-colors hover:bg-gray-50"
                title="Actualiser"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => { setShowUpload(v => !v); setUploadError(null); }}
                disabled={!accessToken}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-black rounded-lg font-semibold text-sm transition-all shadow-sm"
              >
                <Plus size={14} />
                Envoyer
              </button>
            </div>
          </div>

          {/* Compact upload drawer */}
          {showUpload && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200 ${
                dragOver
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-yellow-200 bg-yellow-50/60'
              }`}
            >
              {uploadSuccess && (
                <div className="absolute inset-0 bg-emerald-50 flex items-center justify-center gap-3 z-10 rounded-xl">
                  <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-800 text-sm">Document envoyé !</p>
                    <p className="text-xs text-emerald-600">En attente de validation</p>
                  </div>
                </div>
              )}

              <div className="p-5 flex flex-col sm:flex-row items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${dragOver ? 'bg-yellow-200' : 'bg-yellow-100'}`}>
                  {uploading
                    ? <Loader size={22} className="text-yellow-600 animate-spin" />
                    : dragOver
                      ? <UploadCloud size={22} className="text-yellow-600" />
                      : <Upload size={22} className="text-yellow-600" />
                  }
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <p className="font-semibold text-gray-900 text-sm">
                    {dragOver ? 'Relâchez pour envoyer' : 'Glissez un fichier ou cliquez sur le bouton'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">PDF, JPG, PNG, DOCX — max 10 MB</p>

                  {uploadError && (
                    <div className="flex items-start gap-2 mt-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
                      <AlertCircle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">{uploadError}</p>
                    </div>
                  )}

                  {uploading && (
                    <div className="mt-2">
                      <div className="w-full bg-yellow-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{uploadProgress}%</p>
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 flex gap-2 items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="doc-upload"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                    onChange={handleUpload}
                    disabled={uploading || !accessToken}
                  />
                  <label
                    htmlFor="doc-upload"
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm cursor-pointer transition-all ${
                      uploading || !accessToken
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black shadow-sm hover:shadow-md'
                    }`}
                  >
                    {uploading ? <><Loader size={13} className="animate-spin" /> Envoi...</> : <><Upload size={13} /> Choisir</>}
                  </label>
                  <button
                    onClick={() => { setShowUpload(false); setUploadError(null); }}
                    className="px-3 py-2.5 text-xs text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
            {tabs.map(({ id, count }) => {
              const meta = TAB_META[id];
              const Icon = meta.icon;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    activeTab === id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={14} className={activeTab === id ? meta.color : 'text-gray-400'} />
                  {meta.label}
                  {count > 0 && (
                    <span className={`min-w-[20px] text-center px-1.5 py-0.5 rounded-full text-xs font-bold ${
                      activeTab === id ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Document list */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
              <div className="w-12 h-12 border-[3px] border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">Chargement de vos documents...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FolderOpen size={28} className="text-gray-300" />
              </div>
              <h3 className="font-semibold text-gray-700 mb-2">{TAB_META[activeTab].emptyMsg}</h3>
              <p className="text-sm text-gray-400 max-w-xs mx-auto">{TAB_META[activeTab].emptyHint}</p>
              {activeTab === 'mine' && (
                <button
                  onClick={() => { setShowUpload(true); setUploadError(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg font-semibold text-sm transition-all shadow-sm"
                >
                  <Plus size={14} />
                  Envoyer un document
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-2 text-xs text-gray-400">
                <Filter size={11} />
                {filteredDocs.length} document{filteredDocs.length > 1 ? 's' : ''}
              </div>

              <div className="divide-y divide-gray-50">
                {filteredDocs.map((doc) => {
                  const DocIcon = fileIcon(doc.mime_type, doc.document_type);
                  const isValidated = doc.validated || doc.status === 'verified' || doc.status === 'available';
                  const tabMeta = TAB_META[activeTab];

                  return (
                    <div key={doc.id} className="group px-5 py-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isValidated ? 'bg-emerald-50' : 'bg-gray-100'
                        }`}>
                          <DocIcon size={18} className={isValidated ? 'text-emerald-600' : tabMeta.color} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <h3 className="font-medium text-gray-900 text-sm leading-tight truncate max-w-[180px] sm:max-w-sm">
                              {doc.name}
                            </h3>
                            <StatusBadge status={doc.status} validated={doc.validated} />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
                            {doc.document_type && doc.document_type !== 'other' && doc.document_type !== 'autre' && (
                              <span className="capitalize">{doc.document_type.replace(/_/g, ' ')}</span>
                            )}
                            {doc.file_size ? (
                              <>
                                {doc.document_type && doc.document_type !== 'other' && doc.document_type !== 'autre' && <span>·</span>}
                                <span>{formatBytes(doc.file_size)}</span>
                              </>
                            ) : null}
                            <span>·</span>
                            <span>
                              {new Date(doc.uploaded_at).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>

                        {doc.download_path && (
                          <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleView(doc)}
                              title="Visualiser"
                              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleDownload(doc)}
                              title="Télécharger"
                              className="p-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg transition-all shadow-sm"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Help block */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 text-sm mb-0.5">Besoin d'un document spécifique ?</h3>
              <p className="text-xs text-gray-500">
                Contactez votre conseiller, il vous l'enverra rapidement.
              </p>
            </div>
            <a
              href="tel:0180855786"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-xl font-semibold text-sm transition-all shadow-sm whitespace-nowrap"
            >
              01 80 85 57 86
            </a>
          </div>

        </div>
      </ClientLayout>
    </>
  );
}
