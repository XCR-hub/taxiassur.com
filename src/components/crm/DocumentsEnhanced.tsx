import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Eye,
  Trash2,
  Send,
  Check,
  X,
  Loader2,
  FileCheck,
  FolderOpen,
  Archive,
  TrendingUp
} from 'lucide-react';
import AnimatedStatCard from '@/components/AnimatedStatCard';
import ContextualTooltip from '@/components/ContextualTooltip';
import DocumentBasket from './DocumentBasket';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  download_url?: string;
  status: 'validated' | 'received' | 'missing' | 'pending';
  uploaded_at?: string;
  validated_at?: string;
  validated_by?: string;
}

interface DocumentCategory {
  id: string;
  label: string;
  icon: string;
  required: boolean;
  documents: Document[];
}

interface DocumentsEnhancedProps {
  leadId: string;
  onDocumentUpload?: () => void;
  onDocumentValidate?: (docId: string) => void;
  onRequestDocuments?: () => void;
}

const DOCUMENT_TYPES = [
  { id: 'licence_taxi', label: 'Licence de taxi', icon: '🚕', required: true },
  { id: 'permis_conduire', label: 'Permis de conduire', icon: '🪪', required: true },
  { id: 'piece_identite', label: "Pièce d'identité", icon: '🆔', required: true },
  { id: 'carte_grise', label: 'Carte grise', icon: '🚗', required: true },
  { id: 'releve_information', label: "Relevé d'information", icon: '📄', required: true },
  { id: 'autorisation_stationnement', label: 'Autorisation stationnement', icon: '🅿️', required: false },
  { id: 'rib', label: 'RIB', icon: '🏦', required: true },
  { id: 'kbis', label: 'KBIS / SIRENE', icon: '🏢', required: false }
];

export default function DocumentsEnhanced({
  leadId,
  onDocumentUpload,
  onDocumentValidate,
  onRequestDocuments
}: DocumentsEnhancedProps) {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadDocuments();
  }, [leadId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_lead_documents')
        .select('*')
        .eq('lead_id', leadId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
      organizeCategoriesWith(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const organizeCategoriesWith = (docs: Document[]) => {
    const cats: DocumentCategory[] = DOCUMENT_TYPES.map(type => {
      const categoryDocs = docs.filter(d => d.document_type === type.id);
      return {
        id: type.id,
        label: type.label,
        icon: type.icon,
        required: type.required,
        documents: categoryDocs
      };
    });
    setCategories(cats);
  };

  const handleFileUpload = async (file: File, documentType: string) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${leadId}/${documentType}/${Date.now()}.${fileExt}`;

      setUploadProgress(30);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('crm-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setUploadProgress(60);

      const { data: urlData } = supabase.storage
        .from('crm-documents')
        .getPublicUrl(fileName);

      setUploadProgress(80);

      const { error: insertError } = await supabase
        .from('crm_lead_documents')
        .insert({
          lead_id: leadId,
          document_type: documentType,
          file_name: file.name,
          file_url: fileName,
          download_url: urlData.publicUrl,
          status: 'received'
        });

      if (insertError) throw insertError;

      setUploadProgress(100);

      await loadDocuments();
      onDocumentUpload?.();
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleValidateDocument = async (docId: string) => {
    try {
      const { error } = await supabase
        .from('crm_lead_documents')
        .update({
          status: 'validated',
          validated_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;

      await loadDocuments();
      onDocumentValidate?.(docId);
    } catch (error) {
      console.error('Error validating:', error);
    }
  };

  const handleRejectDocument = async (docId: string) => {
    try {
      const { error } = await supabase
        .from('crm_lead_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      await loadDocuments();
    } catch (error) {
      console.error('Error rejecting:', error);
    }
  };

  const stats = {
    total: DOCUMENT_TYPES.filter(t => t.required).length,
    validated: categories.filter(c => c.required && c.documents.some(d => d.status === 'validated')).length,
    received: categories.filter(c => c.required && c.documents.some(d => d.status === 'received' || d.status === 'pending_validation')).length,
    missing: categories.filter(c => c.required && c.documents.length === 0).length
  };

  const completionPercentage = (stats.validated / stats.total) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStatCard
          title="Documents Requis"
          value={stats.total}
          icon={FileText}
          color="blue"
          animationDuration={1000}
        />

        <AnimatedStatCard
          title="Validés"
          value={stats.validated}
          icon={CheckCircle}
          color="green"
          trend={stats.validated > 0 ? {
            value: 100,
            label: "Documents validés",
            direction: "up"
          } : undefined}
          animationDuration={1000}
        />

        <AnimatedStatCard
          title="En Attente"
          value={stats.received}
          icon={Clock}
          color="amber"
          animationDuration={1000}
        />

        <AnimatedStatCard
          title="Manquants"
          value={stats.missing}
          icon={AlertCircle}
          color={stats.missing > 0 ? "red" : "green"}
          animationDuration={1000}
        />
      </div>

      {/* Barre de progression globale */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-sm border border-blue-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Progression Documents</h3>
              <p className="text-sm text-gray-600">
                {stats.validated} sur {stats.total} documents validés
              </p>
            </div>
          </div>
          <ContextualTooltip
            content="Pourcentage de documents obligatoires validés"
            type="info"
            position="left"
          />
        </div>

        <div className="relative">
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>0%</span>
            <span className="font-medium text-green-600">{Math.round(completionPercentage)}%</span>
            <span>100%</span>
          </div>
        </div>

        {stats.missing > 0 && (
          <div className="mt-4 flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                {stats.missing} document(s) manquant(s)
              </span>
            </div>
            <ContextualTooltip content="Envoyer une demande automatique au prospect" type="tip">
              <button
                onClick={onRequestDocuments}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                <Send className="w-4 h-4" />
                Demander
              </button>
            </ContextualTooltip>
          </div>
        )}

        {stats.missing === 0 && stats.validated === stats.total && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              ✓ Tous les documents sont validés !
            </span>
          </div>
        )}
      </div>

      {/* Système Unifié : Panier + Catégories avec Drag & Drop */}
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border-2 border-blue-300 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Archive className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                📥 Documents à Classer
              </h3>
              <p className="text-sm text-gray-600">
                Glissez-déposez les documents dans les catégories ci-dessous
              </p>
            </div>
          </div>

          <DocumentBasket
            caseId={leadId}
            onDocumentClassified={() => {
              loadDocuments();
              onDocumentUpload?.();
            }}
          />
        </div>

        {/* Instructions Drag & Drop */}
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="flex-1">
              <h4 className="font-bold text-amber-900 mb-2">
                Comment utiliser le système :
              </h4>
              <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
                <li>Les documents apparaissent automatiquement dans le panier ci-dessus</li>
                <li>Glissez-déposez chaque document dans la bonne catégorie</li>
                <li>Une fois classés, validez ou refusez-les directement</li>
                <li>Les documents validés sont marqués avec ✓</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Catégories de documents avec zones de drop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => {
          const hasDocuments = category.documents.length > 0;
          const isValidated = category.documents.some(d => d.status === 'validated');
          const isPending = category.documents.some(d => d.status === 'received' || d.status === 'pending_validation');

          return (
            <div
              key={category.id}
              className={cn(
                "rounded-xl shadow-sm border p-4 transition-all hover:shadow-md",
                isValidated ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200" :
                isPending ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200" :
                "bg-white border-gray-300 border-dashed"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{category.icon}</span>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">{category.label}</h3>
                    {category.required && (
                      <span className="text-xs text-red-600">Obligatoire</span>
                    )}
                  </div>
                </div>
                {isValidated && <CheckCircle className="w-5 h-5 text-green-600" />}
                {isPending && !isValidated && <Clock className="w-5 h-5 text-amber-600" />}
                {!hasDocuments && category.required && <AlertCircle className="w-5 h-5 text-red-600" />}
                {!hasDocuments && !category.required && <FolderOpen className="w-5 h-5 text-gray-400" />}
              </div>

              {hasDocuments ? (
                <div className="space-y-2">
                  {category.documents.map((doc) => (
                    <div key={doc.id} className="bg-white rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-700 truncate">
                            {doc.file_name}
                          </span>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {doc.download_url && (
                            <>
                              <ContextualTooltip content="Télécharger" type="tip">
                                <a
                                  href={doc.download_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-blue-50 rounded transition-colors"
                                >
                                  <Download className="w-4 h-4 text-blue-600" />
                                </a>
                              </ContextualTooltip>
                              <ContextualTooltip content="Visualiser" type="tip">
                                <a
                                  href={doc.download_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-blue-50 rounded transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-blue-600" />
                                </a>
                              </ContextualTooltip>
                            </>
                          )}
                        </div>
                      </div>

                      {(doc.status === 'received' || doc.status === 'pending_validation') && (
                        <div className="flex gap-2 mt-2">
                          <ContextualTooltip content="✓ Valider ce document" type="tip">
                            <button
                              onClick={() => handleValidateDocument(doc.id)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                              Valider
                            </button>
                          </ContextualTooltip>
                          <ContextualTooltip content="✗ Rejeter ce document" type="warning">
                            <button
                              onClick={() => handleRejectDocument(doc.id)}
                              className="flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                            >
                              <X className="w-4 h-4" />
                              Refuser
                            </button>
                          </ContextualTooltip>
                        </div>
                      )}

                      {doc.status === 'validated' && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded text-xs text-green-700">
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-medium">
                            ✓ Validé
                            {doc.validated_at && (
                              <span className="ml-1 font-normal">
                                le {new Date(doc.validated_at).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                  <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 font-medium mb-1">
                    Zone de dépôt
                  </p>
                  <p className="text-xs text-gray-500">
                    Déposez un document ici
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[300px]">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="font-medium text-gray-900">Upload en cours...</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <div className="text-xs text-gray-600 mt-1 text-right">
            {uploadProgress}%
          </div>
        </div>
      )}
    </div>
  );
}
