import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Eye,
  Printer,
  Check,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Archive,
  FolderOpen,
  TrendingUp,
  Send,
  Upload
} from 'lucide-react';
import AnimatedStatCard from '@/components/AnimatedStatCard';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  download_url?: string;
  status: 'received' | 'validated' | 'rejected' | 'pending_validation';
  uploaded_at: string;
  validated_at?: string;
  validated_by?: string;
}

interface DocumentsUnifiedManagerProps {
  leadId: string;
  onDocumentUpload?: () => void;
  onDocumentValidate?: () => void;
  onRequestDocuments?: () => void;
}

const DOCUMENT_CATEGORIES = [
  { id: 'carte_grise', label: 'Carte Grise', icon: '🚗', required: true },
  { id: 'permis_conduire', label: 'Permis de Conduire', icon: '🪪', required: true },
  { id: 'carte_professionnelle', label: 'Carte Professionnelle', icon: '💳', required: true },
  { id: 'justificatif_domicile', label: 'Justificatif de Domicile', icon: '🏠', required: true },
  { id: 'rib', label: 'RIB', icon: '🏦', required: true },
  { id: 'kbis', label: 'KBIS', icon: '📋', required: false },
  { id: 'releve_information', label: 'Relevé d\'Information', icon: '📊', required: true },
  { id: 'certificat_immatriculation', label: 'Certificat d\'Immatriculation', icon: '📄', required: true },
  { id: 'autorisation_stationnement', label: 'Autorisation de Stationnement', icon: '🅿️', required: false },
  { id: 'autre', label: 'Autre Document', icon: '📎', required: false }
];

export default function DocumentsUnifiedManager({
  leadId,
  onDocumentUpload,
  onDocumentValidate,
  onRequestDocuments
}: DocumentsUnifiedManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [basketDocuments, setBasketDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [leadId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);

      // Documents classés (crm_lead_documents)
      const { data: classifiedDocs, error: classifiedError } = await supabase
        .from('crm_lead_documents')
        .select('*')
        .eq('lead_id', leadId)
        .order('uploaded_at', { ascending: false });

      if (classifiedError) throw classifiedError;

      // Documents dans le panier (prospect_documents)
      const { data: basketDocs, error: basketError } = await supabase
        .from('prospect_documents')
        .select('*')
        .eq('lead_id', leadId)
        .order('uploaded_at', { ascending: false });

      if (basketError) throw basketError;

      // Obtenir les URLs de téléchargement pour les documents classés
      const docsWithUrls = await Promise.all(
        (classifiedDocs || []).map(async (doc) => {
          if (doc.file_path) {
            const { data } = supabase.storage
              .from('crm-documents')
              .getPublicUrl(doc.file_path);
            return { ...doc, download_url: data.publicUrl };
          }
          return doc;
        })
      );

      // Obtenir les URLs pour les documents du panier
      const basketWithUrls = await Promise.all(
        (basketDocs || []).map(async (doc) => {
          if (doc.file_path) {
            const { data } = supabase.storage
              .from('prospect-documents')
              .getPublicUrl(doc.file_path);
            return { ...doc, download_url: data.publicUrl };
          }
          return doc;
        })
      );

      setDocuments(docsWithUrls);
      setBasketDocuments(basketWithUrls);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('crm_lead_documents')
        .update({
          status: 'validated',
          validated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (error) throw error;

      await loadDocuments();
      onDocumentValidate?.();
    } catch (error) {
      console.error('Erreur validation:', error);
      alert('Erreur lors de la validation');
    }
  };

  const handleRejectDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('crm_lead_documents')
        .update({ status: 'rejected' })
        .eq('id', documentId);

      if (error) throw error;

      await loadDocuments();
    } catch (error) {
      console.error('Erreur rejet:', error);
      alert('Erreur lors du rejet');
    }
  };

  const handlePrintDocument = (doc: Document) => {
    if (doc.download_url) {
      const printWindow = window.open(doc.download_url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  const handlePrintAll = () => {
    const validatedDocs = documents.filter(d => d.status === 'validated');
    validatedDocs.forEach((doc, index) => {
      setTimeout(() => {
        handlePrintDocument(doc);
      }, index * 500);
    });
  };

  const groupedDocuments = DOCUMENT_CATEGORIES.map(category => ({
    ...category,
    documents: documents.filter(d => d.document_type === category.id)
  }));

  const stats = {
    total: DOCUMENT_CATEGORIES.filter(c => c.required).length,
    validated: groupedDocuments.filter(c => c.required && c.documents.some(d => d.status === 'validated')).length,
    pending: groupedDocuments.filter(c => c.required && c.documents.some(d => d.status === 'received' || d.status === 'pending_validation')).length,
    missing: groupedDocuments.filter(c => c.required && c.documents.length === 0).length,
    basket: basketDocuments.length
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
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
          animationDuration={1000}
        />
        <AnimatedStatCard
          title="En Attente"
          value={stats.pending}
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
        <AnimatedStatCard
          title="À Classer"
          value={stats.basket}
          icon={Archive}
          color="cyan"
          animationDuration={1000}
        />
      </div>

      {/* Actions rapides */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handlePrintAll}
          disabled={stats.validated === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer className="w-4 h-4" />
          Imprimer tous les documents validés
        </button>

        {stats.missing > 0 && (
          <button
            onClick={onRequestDocuments}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Send className="w-4 h-4" />
            Demander les documents manquants
          </button>
        )}
      </div>

      {/* Progression */}
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
      </div>

      {/* Vue Unifiée : Tous les documents */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">📂 Tous les Documents</h2>
            <span className="text-sm text-gray-500">
              {documents.length + basketDocuments.length} document(s) au total
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Documents à classer (panier) */}
          {basketDocuments.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-300 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Archive className="w-6 h-6 text-amber-600" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    📥 Documents à Classer ({basketDocuments.length})
                  </h3>
                  <p className="text-sm text-gray-600">
                    Ces documents doivent être classés dans les catégories appropriées
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {basketDocuments.map((doc) => (
                  <div key={doc.id} className="bg-white rounded-lg border border-amber-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.file_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Reçu le {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0 ml-4">
                        {doc.download_url && (
                          <>
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Consulter"
                            >
                              <Eye className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => handlePrintDocument(doc)}
                              className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                              title="Imprimer"
                            >
                              <Printer className="w-4 h-4 text-green-600" />
                            </button>
                            <a
                              href={doc.download_url}
                              download
                              className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                              title="Télécharger"
                            >
                              <Download className="w-4 h-4 text-gray-600" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents classés par catégorie */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">📋 Documents Classés</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedDocuments.map((category) => {
                const hasDocuments = category.documents.length > 0;
                const isValidated = category.documents.some(d => d.status === 'validated');
                const isPending = category.documents.some(d => d.status === 'received' || d.status === 'pending_validation');

                return (
                  <div
                    key={category.id}
                    className={cn(
                      "rounded-xl shadow-sm border p-5 transition-all",
                      isValidated ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200" :
                      isPending ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200" :
                      "bg-white border-gray-300"
                    )}
                  >
                    {/* En-tête catégorie */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{category.icon}</span>
                        <div>
                          <h4 className="font-semibold text-gray-900">{category.label}</h4>
                          {category.required && (
                            <span className="text-xs text-red-600 font-medium">Obligatoire</span>
                          )}
                        </div>
                      </div>
                      {isValidated && <CheckCircle className="w-6 h-6 text-green-600" />}
                      {isPending && !isValidated && <Clock className="w-6 h-6 text-amber-600" />}
                      {!hasDocuments && category.required && <AlertCircle className="w-6 h-6 text-red-600" />}
                      {!hasDocuments && !category.required && <FolderOpen className="w-6 h-6 text-gray-400" />}
                    </div>

                    {/* Documents de cette catégorie */}
                    {hasDocuments ? (
                      <div className="space-y-3">
                        {category.documents.map((doc) => (
                          <div key={doc.id} className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {doc.file_name}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Reçu le {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                                  </p>
                                  {doc.validated_at && (
                                    <p className="text-xs text-green-600 mt-1">
                                      ✓ Validé le {new Date(doc.validated_at).toLocaleDateString('fr-FR')}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Badge statut */}
                              <div className="flex-shrink-0 ml-2">
                                {doc.status === 'validated' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                                    <CheckCircle className="w-3 h-3" />
                                    Validé
                                  </span>
                                )}
                                {doc.status === 'rejected' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                                    <X className="w-3 h-3" />
                                    Refusé
                                  </span>
                                )}
                                {(doc.status === 'received' || doc.status === 'pending_validation') && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                                    <Clock className="w-3 h-3" />
                                    En attente
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              {doc.download_url && (
                                <>
                                  <button
                                    onClick={() => setPreviewDoc(doc)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Consulter
                                  </button>
                                  <button
                                    onClick={() => handlePrintDocument(doc)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-xs font-medium"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    Imprimer
                                  </button>
                                  <a
                                    href={doc.download_url}
                                    download
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-xs font-medium"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Télécharger
                                  </a>
                                </>
                              )}
                            </div>

                            {/* Actions validation (si en attente) */}
                            {(doc.status === 'received' || doc.status === 'pending_validation') && (
                              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                                <button
                                  onClick={() => handleValidateDocument(doc.id)}
                                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                  Valider
                                </button>
                                <button
                                  onClick={() => handleRejectDocument(doc.id)}
                                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                  Refuser
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500">Aucun document</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Preview */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{previewDoc.file_name}</h3>
                <p className="text-sm text-gray-500">Aperçu du document</p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {previewDoc.download_url && (
                <iframe
                  src={previewDoc.download_url}
                  className="w-full h-full min-h-[600px] border border-gray-200 rounded-lg"
                  title="Aperçu document"
                />
              )}
            </div>

            <div className="flex items-center gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => handlePrintDocument(previewDoc)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
              {previewDoc.download_url && (
                <a
                  href={previewDoc.download_url}
                  download
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Télécharger
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
