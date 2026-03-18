import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText, Download, Eye, Upload, CheckCircle, Clock, XCircle,
  AlertCircle, RefreshCw, Loader, FolderOpen, Layers, Shield, User
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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  verified:  { label: 'Validé',      bg: 'bg-green-100',  text: 'text-green-700',  icon: CheckCircle },
  validated: { label: 'Validé',      bg: 'bg-green-100',  text: 'text-green-700',  icon: CheckCircle },
  pending:   { label: 'En attente',  bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  rejected:  { label: 'Refusé',      bg: 'bg-red-100',    text: 'text-red-700',    icon: XCircle },
  default:   { label: 'Reçu',        bg: 'bg-gray-100',   text: 'text-gray-600',   icon: FileText },
};

const SOURCE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  prospect: { label: 'Vos documents',         icon: User,   color: 'text-yellow-600' },
  crm:      { label: 'Votre conseiller',      icon: Shield, color: 'text-gray-600'   },
  contract: { label: 'Documents assureur',    icon: Layers, color: 'text-gray-600'   },
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status, validated }: { status: string; validated: boolean }) {
  const key = validated ? 'validated' : (STATUS_CONFIG[status] ? status : 'default');
  const cfg = STATUS_CONFIG[key];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!email) {
      navigate('/espace-client');
      return;
    }
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
    if (doc.file_url) {
      window.open(doc.file_url, '_blank', 'noopener,noreferrer');
    }
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !leadId) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const ext = file.name.split('.').pop();
      const filePath = `${leadId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const { error: uploadErr } = await supabase.storage
        .from('prospect-documents')
        .upload(filePath, file, { upsert: false });

      if (uploadErr) throw uploadErr;

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

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 4000);
      await loadDocuments();
    } catch (err: any) {
      setUploadError(err.message || 'Erreur lors de l\'envoi du fichier');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
    { id: 'all',     label: 'Tous',              count: documents.length },
    { id: 'mine',    label: 'Mes documents',     count: countBySource.mine },
    { id: 'advisor', label: 'Mon conseiller',    count: countBySource.advisor },
    { id: 'insurer', label: 'Assureur',          count: countBySource.insurer },
  ];

  return (
    <>
      <SEOHead
        title="Mes Documents - Espace Client TaxiAssur"
        description="Téléchargez vos documents d'assurance"
        noIndex={true}
      />

      <ClientLayout email={email}>
        <div className="space-y-6">

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

          {/* Upload zone */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-dashed border-yellow-300 rounded-xl p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Upload size={22} className="text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Envoyer un document</h3>
              <p className="text-sm text-gray-500 mb-4">
                Carte grise, permis, carte professionnelle, RIB...
              </p>

              {uploadError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-left">
                  <AlertCircle size={14} className="text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{uploadError}</p>
                </div>
              )}

              {uploadSuccess && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 mb-3 text-left">
                  <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-700">Document envoyé avec succès. En attente de validation.</p>
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
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm cursor-pointer transition-all ${
                  uploading || !leadId
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black shadow-sm hover:shadow-md'
                }`}
              >
                {uploading ? (
                  <><Loader size={15} className="animate-spin" /> Envoi en cours...</>
                ) : (
                  <><Upload size={15} /> Choisir un fichier</>
                )}
              </label>
              <p className="text-xs text-gray-400 mt-2">PDF, JPG, PNG, DOCX — max 10 MB</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
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
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="w-10 h-10 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} />
              <p className="text-sm text-gray-500">Chargement de vos documents...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderOpen size={24} className="text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">
                {activeTab === 'all' ? 'Aucun document disponible' : 'Aucun document dans cette catégorie'}
              </h3>
              <p className="text-sm text-gray-500">
                {activeTab === 'mine'
                  ? 'Utilisez le formulaire ci-dessus pour envoyer vos documents.'
                  : 'Les documents seront disponibles une fois que votre conseiller les aura ajoutés.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {filteredDocs.map((doc) => {
                const srcInfo = SOURCE_LABELS[doc.source] || SOURCE_LABELS.crm;
                const SrcIcon = srcInfo.icon;
                return (
                  <div key={doc.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText size={20} className={srcInfo.color} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate max-w-xs">
                            {doc.name}
                          </h3>
                          <StatusBadge status={doc.status} validated={doc.validated} />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span className={`flex items-center gap-1 ${srcInfo.color}`}>
                            <SrcIcon size={11} />
                            {srcInfo.label}
                          </span>
                          {doc.document_type && doc.document_type !== 'other' && (
                            <>
                              <span>·</span>
                              <span className="capitalize">{doc.document_type.replace(/_/g, ' ')}</span>
                            </>
                          )}
                          {doc.file_size && (
                            <>
                              <span>·</span>
                              <span>{formatBytes(doc.file_size)}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>
                            {new Date(doc.uploaded_at).toLocaleDateString('fr-FR', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>

                      {doc.file_url && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleView(doc)}
                            title="Visualiser"
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                          >
                            <Eye size={18} className="text-gray-500 group-hover:text-gray-800" />
                          </button>
                          <button
                            onClick={() => handleDownload(doc)}
                            title="Télécharger"
                            className="p-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 rounded-lg transition-all shadow-sm"
                          >
                            <Download size={18} className="text-black" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Help block */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 mb-1">Besoin d'un document spécifique ?</h3>
            <p className="text-sm text-gray-600 mb-3">
              Si vous ne trouvez pas un document, contactez votre conseiller qui vous l'enverra rapidement.
            </p>
            <a
              href="tel:0180855786"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg font-semibold text-sm transition-all"
            >
              01 80 85 57 86
            </a>
          </div>

        </div>
      </ClientLayout>
    </>
  );
}
