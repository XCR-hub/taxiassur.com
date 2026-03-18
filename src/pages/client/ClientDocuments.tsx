import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText, Download, Eye, Upload, CheckCircle, Clock, XCircle,
  AlertCircle, RefreshCw, Loader, FolderOpen, Layers, Shield, User,
  FileImage, FileArchive, File, UploadCloud, Sparkles, Filter
} from 'lucide-react';
import ClientLayout from '../../components/client/ClientLayout';
import SEOHead from '../../components/SEOHead';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface Document {
  id: string;
  name: string;
  document_type: string;
  category: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  status: string;
  source: string;
  uploaded_at: string;
  validated: boolean;
}

type Tab = 'all' | 'mine' | 'advisor' | 'insurer';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  verified:  { label: 'Validé',     bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle },
  validated: { label: 'Validé',     bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle },
  pending:   { label: 'En attente', bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200',   icon: Clock },
  rejected:  { label: 'Refusé',     bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200',     icon: XCircle },
  default:   { label: 'Reçu',       bg: 'bg-gray-50',     text: 'text-gray-600',    border: 'border-gray-200',    icon: FileText },
};

const SOURCE_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  prospect: { label: 'Vos documents',      icon: User,   color: 'text-yellow-700', bg: 'bg-yellow-50' },
  crm:      { label: 'Votre conseiller',   icon: Shield, color: 'text-blue-700',   bg: 'bg-blue-50'   },
  contract: { label: 'Documents assureur', icon: Layers, color: 'text-slate-700',  bg: 'bg-slate-50'  },
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime: string | null) {
  if (!mime) return File;
  if (mime.startsWith('image/')) return FileImage;
  if (mime === 'application/pdf') return FileText;
  if (mime.includes('zip') || mime.includes('rar')) return FileArchive;
  return File;
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

export default function ClientDocuments() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || sessionStorage.getItem('client_email') || '';

  const [documents, setDocuments] = useState<Document[]>([]);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!email) { navigate('/espace-client'); return; }
    sessionStorage.setItem('client_email', email);
    loadDocuments();
  }, [email, navigate]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_client_documents_by_email', { p_email: email.toLowerCase().trim() });
      if (error) throw error;
      if (data?.success) {
        setDocuments(data.documents || []);
        setLeadId(data.lead_id || null);
      }
    } catch (err) {
      logger.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (doc: Document) => {
    if (doc.file_url) window.open(doc.file_url, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = async (doc: Document) => {
    if (!doc.file_url) return;
    try {
      const response = await fetch(doc.file_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name || 'document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(doc.file_url, '_blank', 'noopener,noreferrer');
    }
  };

  const processFile = async (file: File) => {
    if (!leadId) return;
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`Fichier trop volumineux (${formatBytes(file.size)}). La limite est de 10 MB.`);
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    setUploadProgress(10);

    try {
      const filePath = `${leadId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      setUploadProgress(30);

      const { error: uploadErr } = await supabase.storage
        .from('prospect-documents')
        .upload(filePath, file, { upsert: false });

      if (uploadErr) throw uploadErr;
      setUploadProgress(70);

      const { data: urlData } = supabase.storage
        .from('prospect-documents')
        .getPublicUrl(filePath);

      await supabase.from('prospect_documents').insert({
        lead_id: leadId,
        file_name: file.name,
        file_path: filePath,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        document_type: 'other',
        status: 'pending',
        uploaded_by: 'prospect',
      });

      setUploadProgress(100);
      setUploadSuccess(true);
      setTimeout(() => { setUploadSuccess(false); setUploadProgress(0); }, 4000);
      await loadDocuments();
    } catch (err: any) {
      setUploadError(err.message || "Erreur lors de l'envoi du fichier");
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
  }, [leadId]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const filteredDocs = documents.filter(doc => {
    if (activeTab === 'all') return true;
    if (activeTab === 'mine') return doc.source === 'prospect';
    if (activeTab === 'advisor') return doc.source === 'crm';
    if (activeTab === 'insurer') return doc.source === 'contract';
    return true;
  });

  const countBySource = {
    mine: documents.filter(d => d.source === 'prospect').length,
    advisor: documents.filter(d => d.source === 'crm').length,
    insurer: documents.filter(d => d.source === 'contract').length,
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all',     label: 'Tous',            count: documents.length },
    { id: 'mine',    label: 'Mes documents',   count: countBySource.mine },
    { id: 'advisor', label: 'Mon conseiller',  count: countBySource.advisor },
    { id: 'insurer', label: 'Assureur',        count: countBySource.insurer },
  ];

  const validatedCount = documents.filter(d => d.validated || d.status === 'verified').length;
  const pendingCount = documents.filter(d => d.status === 'pending').length;

  return (
    <>
      <SEOHead
        title="Mes Documents - Espace Client TaxiAssur"
        description="Téléchargez vos documents d'assurance"
        noIndex={true}
      />

      <ClientLayout email={email}>
        <div className="space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mes Documents</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Tous vos documents d'assurance en un seul endroit
              </p>
            </div>
            <button
              onClick={loadDocuments}
              disabled={loading}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50 flex-shrink-0"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>

          {/* Stats bar */}
          {documents.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{documents.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">Documents total</div>
              </div>
              <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 text-center">
                <div className="text-2xl font-bold text-emerald-700">{validatedCount}</div>
                <div className="text-xs text-emerald-600 mt-0.5">Validés</div>
              </div>
              <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 text-center">
                <div className="text-2xl font-bold text-amber-700">{pendingCount}</div>
                <div className="text-xs text-amber-600 mt-0.5">En attente</div>
              </div>
            </div>
          )}

          {/* Upload zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200 ${
              dragOver
                ? 'border-yellow-500 bg-yellow-50 scale-[1.01]'
                : 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50'
            }`}
          >
            <div className="p-8">
              {/* Upload success overlay */}
              {uploadSuccess && (
                <div className="absolute inset-0 bg-emerald-50 flex flex-col items-center justify-center z-10 rounded-2xl">
                  <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle size={28} className="text-emerald-600" />
                  </div>
                  <p className="font-semibold text-emerald-800">Document envoyé !</p>
                  <p className="text-sm text-emerald-600 mt-1">En attente de validation par votre conseiller</p>
                </div>
              )}

              <div className="text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all ${
                  dragOver ? 'bg-yellow-200 scale-110' : 'bg-yellow-100'
                }`}>
                  {uploading
                    ? <Loader size={26} className="text-yellow-600 animate-spin" />
                    : dragOver
                      ? <UploadCloud size={26} className="text-yellow-600" />
                      : <Upload size={26} className="text-yellow-600" />
                  }
                </div>

                <h3 className="font-bold text-gray-900 text-lg mb-1">
                  {dragOver ? 'Relâchez pour envoyer' : 'Envoyer un document'}
                </h3>
                <p className="text-sm text-gray-500 mb-1">
                  Carte grise, permis, carte professionnelle, RIB...
                </p>
                <p className="text-xs text-gray-400 mb-5">
                  Glissez-déposez ou cliquez — PDF, JPG, PNG, DOCX
                  <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-500 font-medium">
                    max 10 MB
                  </span>
                </p>

                {uploadError && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5 mb-4 text-left max-w-md mx-auto">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Envoi impossible</p>
                      <p className="text-xs text-red-600 mt-0.5">{uploadError}</p>
                    </div>
                  </div>
                )}

                {/* Progress bar */}
                {uploading && (
                  <div className="max-w-xs mx-auto mb-4">
                    <div className="w-full bg-yellow-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5 text-center">Envoi en cours... {uploadProgress}%</p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  id="doc-upload"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={handleUpload}
                  disabled={uploading || !leadId}
                />
                <label
                  htmlFor="doc-upload"
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm cursor-pointer transition-all ${
                    uploading || !leadId
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
                  }`}
                >
                  {uploading
                    ? <><Loader size={15} className="animate-spin" /> Envoi en cours...</>
                    : <><Upload size={15} /> Choisir un fichier</>
                  }
                </label>

                {!leadId && (
                  <p className="text-xs text-amber-600 mt-3 flex items-center justify-center gap-1">
                    <AlertCircle size={12} />
                    Connectez-vous pour envoyer des documents
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`min-w-[20px] text-center px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Document list */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
              <div className="w-12 h-12 border-[3px] border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">Chargement de vos documents...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FolderOpen size={28} className="text-gray-300" />
              </div>
              <h3 className="font-semibold text-gray-700 mb-2">
                {activeTab === 'all' ? 'Aucun document disponible' : 'Aucun document dans cette catégorie'}
              </h3>
              <p className="text-sm text-gray-400 max-w-xs mx-auto">
                {activeTab === 'mine'
                  ? 'Utilisez la zone ci-dessus pour envoyer vos documents.'
                  : 'Les documents seront disponibles une fois que votre conseiller les aura ajoutés.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Filter size={12} />
                  <span>{filteredDocs.length} document{filteredDocs.length > 1 ? 's' : ''}</span>
                </div>
                {activeTab === 'all' && documents.some(d => d.validated || d.status === 'verified') && (
                  <div className="flex items-center gap-1 text-xs text-emerald-600">
                    <Sparkles size={11} />
                    <span>{validatedCount} validé{validatedCount > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              <div className="divide-y divide-gray-50">
                {filteredDocs.map((doc) => {
                  const srcMeta = SOURCE_META[doc.source] || SOURCE_META.crm;
                  const SrcIcon = srcMeta.icon;
                  const DocIcon = fileIcon(doc.mime_type);
                  const isValidated = doc.validated || doc.status === 'verified';

                  return (
                    <div
                      key={doc.id}
                      className="group px-5 py-4 hover:bg-gray-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {/* File icon */}
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                          isValidated ? 'bg-emerald-50' : srcMeta.bg
                        }`}>
                          <DocIcon size={20} className={isValidated ? 'text-emerald-600' : srcMeta.color} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate max-w-[200px] sm:max-w-sm">
                              {doc.name}
                            </h3>
                            <StatusBadge status={doc.status} validated={doc.validated} />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                            <span className={`flex items-center gap-1 font-medium ${srcMeta.color}`}>
                              <SrcIcon size={10} />
                              {srcMeta.label}
                            </span>
                            {doc.document_type && doc.document_type !== 'other' && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className="capitalize">{doc.document_type.replace(/_/g, ' ')}</span>
                              </>
                            )}
                            {doc.file_size && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span>{formatBytes(doc.file_size)}</span>
                              </>
                            )}
                            <span className="text-gray-300">·</span>
                            <span>
                              {new Date(doc.uploaded_at).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        {doc.file_url && (
                          <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleView(doc)}
                              title="Visualiser"
                              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                            >
                              <Eye size={13} />
                              <span className="hidden sm:inline">Voir</span>
                            </button>
                            <button
                              onClick={() => handleDownload(doc)}
                              title="Télécharger"
                              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg text-xs font-medium transition-all shadow-sm"
                            >
                              <Download size={13} />
                              <span className="hidden sm:inline">Télécharger</span>
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
              <h3 className="font-semibold text-gray-800 mb-0.5">Besoin d'un document spécifique ?</h3>
              <p className="text-sm text-gray-500">
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
