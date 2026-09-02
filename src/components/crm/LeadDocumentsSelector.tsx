import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  File,
  CheckSquare,
  Square,
  ExternalLink,
  Download,
  Info,
  Paperclip,
  FolderOpen,
  FileSignature
} from 'lucide-react';
import { nativeAdminCall, nativeAdminDocumentUrl, nativeAdminStoredDocumentUrl } from '@/lib/native-admin-data';

interface LeadDocument {
  id: string;
  name: string;
  file_url?: string;
  file_path?: string;
  bucket?: 'prospect-documents' | 'crm-documents';
  document_type: string;
  category: DocumentCategory;
  uploaded_at: string;
  file_size?: number;
}

type DocumentCategory = 'document' | 'quote' | 'contract';

function joinedCompanyName(value: unknown): string {
  const item = Array.isArray(value) ? value[0] : value;
  return item && typeof item === "object" && "name" in item ? String((item as { name?: unknown }).name || "") : "";
}

interface LeadDocumentsSelectorProps {
  leadId: string;
  onDocumentsSelected: (documents: LeadDocument[]) => void;
  selectedDocuments?: LeadDocument[];
}

const CATEGORY_CONFIG = {
  document: {
    label: 'Documents du prospect',
    icon: FileText,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverBgColor: 'hover:bg-blue-100'
  },
  quote: {
    label: 'Devis des compagnies',
    icon: File,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    hoverBgColor: 'hover:bg-orange-100'
  },
  contract: {
    label: 'Contrats et documents signés',
    icon: FileSignature,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    hoverBgColor: 'hover:bg-green-100'
  }
};

const DOC_TYPE_LABELS: Record<string, string> = {
  // Documents prospect
  carte_grise: 'Carte grise',
  permis_conduire: 'Permis de conduire',
  piece_identite: 'Pièce d\'identité',
  licence_taxi: 'Licence taxi / ADS',
  autorisation_stationnement: 'Autorisation de stationnement',
  carte_pro_vtc: 'Carte professionnelle VTC',
  kbis: 'KBIS / SIRENE',
  rib: 'RIB',
  releve_info: 'Relevé d\'information',
  autorisation_parking: 'Autorisation parking',
  autre: 'Autre document',
  // Devis
  quote: 'Devis',
  quote_comparison: 'Comparatif de devis',
  // Contrats
  contract: 'Contrat',
  signed_contract: 'Contrat signé',
  attestation: 'Attestation',
  mandat_signed: 'Mandat signé'
};

export function LeadDocumentsSelector({
  leadId,
  onDocumentsSelected,
  selectedDocuments = []
}: LeadDocumentsSelectorProps) {
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(selectedDocuments.map(d => d.id))
  );
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'all' | DocumentCategory>('all');

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const allDocs: LeadDocument[] = [];

      const result = await nativeAdminCall<{ summary?: { documents?: any[]; quotes?: any[]; contracts?: any[] } }>(
        `/v1/admin/leads/${encodeURIComponent(leadId)}/summary`
      );
      const summary = result.summary || {};
      allDocs.push(...(summary.documents || [])
        .filter((doc) => ['validated', 'verified'].includes(String(doc.status)) || doc.validated === true)
        .map((doc) => ({
          id: `document-${doc.id}`,
          name: doc.file_name || DOC_TYPE_LABELS[doc.document_type] || doc.document_type,
          file_path: doc.file_path,
          bucket: (doc.bucket === 'crm-documents' ? 'crm-documents' : 'prospect-documents') as LeadDocument['bucket'],
          document_type: doc.document_type,
          category: 'document' as const,
          uploaded_at: doc.uploaded_at || doc.created_at,
          file_size: doc.file_size
        })));
      allDocs.push(...(summary.quotes || [])
        .filter((quote) => quote.quote_file_url || quote.quote_pdf_url)
        .map((quote) => ({
          id: `quote-${quote.id}`,
          name: `Devis ${quote.company_name || 'Compagnie'}${quote.quote_amount ? ` - ${quote.quote_amount} EUR` : ''}`,
          file_url: quote.quote_file_url || quote.quote_pdf_url,
          document_type: 'quote',
          category: 'quote' as const,
          uploaded_at: quote.submitted_at || new Date().toISOString()
        })));
      allDocs.push(...(summary.contracts || [])
        .filter((contract) => contract.contract_file_url)
        .map((contract) => ({
          id: `contract-${contract.id}`,
          name: `${DOC_TYPE_LABELS[contract.contract_type] || 'Contrat'} ${contract.signed_at ? '(signe)' : ''}`,
          file_url: contract.contract_file_url,
          document_type: contract.contract_type || 'contract',
          category: 'contract' as const,
          uploaded_at: contract.signed_at || contract.created_at
        })));

      /* Anciennes requetes directes desactivees apres migration API native.

      // 1. Charger les documents du prospect
      const { data: prospectDocs, error: prospectError } = await supabase
        .from('prospect_documents')
        .select('id, document_type, file_path, validated, created_at, file_size')
        .eq('lead_id', leadId)
        .eq('validated', true);

      if (!prospectError && prospectDocs) {
        allDocs.push(...prospectDocs.map(doc => ({
          id: `prospect-${doc.id}`,
          name: DOC_TYPE_LABELS[doc.document_type] || doc.document_type,
          file_path: doc.file_path,
          bucket: 'prospect-documents' as const,
          document_type: doc.document_type,
          category: 'document' as const,
          uploaded_at: doc.created_at,
          file_size: doc.file_size
        })));
      }

      // 2. Charger les documents CRM
      const { data: crmDocs, error: crmError } = await supabase
        .from('crm_lead_documents')
        .select('id, document_type, file_path, status, created_at')
        .eq('lead_id', leadId)
        .eq('status', 'validated');

      if (!crmError && crmDocs) {
        allDocs.push(...crmDocs.map(doc => ({
          id: `crm-${doc.id}`,
          name: DOC_TYPE_LABELS[doc.document_type] || doc.document_type,
          file_path: doc.file_path,
          bucket: 'prospect-documents' as const,
          document_type: doc.document_type,
          category: 'document' as const,
          uploaded_at: doc.created_at
        })));
      }

      // 3. Charger les devis
      const { data: quotes, error: quotesError } = await supabase
        .from('lead_company_quotes')
        .select(`
          id,
          quote_file_url,
          quote_amount,
          submitted_at,
          company_id,
          insurance_companies(name)
        `)
        .eq('lead_id', leadId)
        .eq('status', 'quote_submitted')
        .not('quote_file_url', 'is', null);

      if (!quotesError && quotes) {
        allDocs.push(...quotes.map(quote => ({
          id: `quote-${quote.id}`,
          name: `Devis ${joinedCompanyName(quote.insurance_companies) || 'Compagnie'}${quote.quote_amount ? ` - ${quote.quote_amount}€` : ''}`,
          file_url: quote.quote_file_url!,
          document_type: 'quote',
          category: 'quote' as const,
          uploaded_at: quote.submitted_at || new Date().toISOString()
        })));
      }

      // 4. Charger les contrats signés
      const { data: contracts, error: contractsError } = await supabase
        .from('lead_contracts')
        .select('id, contract_file_url, contract_type, signed_at, created_at')
        .eq('lead_id', leadId)
        .not('contract_file_url', 'is', null);

      if (!contractsError && contracts) {
        allDocs.push(...contracts.map(contract => ({
          id: `contract-${contract.id}`,
          name: `${DOC_TYPE_LABELS[contract.contract_type] || 'Contrat'} ${contract.signed_at ? '(signé)' : ''}`,
          file_url: contract.contract_file_url!,
          document_type: contract.contract_type,
          category: 'contract' as const,
          uploaded_at: contract.signed_at || contract.created_at
        })));
      }

      */
      setDocuments(allDocs);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const openDocument = async (doc: LeadDocument, download = false) => {
    const url = doc.id.startsWith('document-')
      ? await nativeAdminDocumentUrl(doc.id.slice('document-'.length))
      : doc.file_url
        ? await nativeAdminStoredDocumentUrl(doc.file_url, 'contract-documents', download, doc.name)
        : undefined;
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const toggleDocument = (docId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelected(newSelected);

    const selectedDocs = documents.filter(d => newSelected.has(d.id));
    onDocumentsSelected(selectedDocs);
  };

  const selectAllInCategory = (category: DocumentCategory) => {
    const docs = documents.filter(d => d.category === category);
    const newSelected = new Set([...Array.from(selected), ...docs.map(d => d.id)]);
    setSelected(newSelected);
    onDocumentsSelected(documents.filter(d => newSelected.has(d.id)));
  };

  const clearAll = () => {
    setSelected(new Set());
    onDocumentsSelected([]);
  };

  const getFilteredDocuments = () => {
    if (activeCategory === 'all') return documents;
    return documents.filter(d => d.category === activeCategory);
  };

  const getCountByCategory = (category: DocumentCategory) => {
    return documents.filter(d => d.category === category).length;
  };

  const filteredDocs = getFilteredDocuments();
  const selectedCount = selected.size;

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-blue-200 p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Chargement des documents...</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 text-center">
        <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">Aucun document disponible pour ce lead</p>
        <p className="text-sm text-gray-500 mt-1">Les documents apparaîtront ici une fois uploadés et validés</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-blue-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Paperclip className="w-5 h-5" />
          Documents du Lead
        </h3>
        <p className="text-blue-100 text-sm mt-1">
          Sélectionnez les documents à joindre à l'email
        </p>
      </div>

      {/* Filtres par catégorie */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            Tous ({documents.length})
          </button>
          {(Object.entries(CATEGORY_CONFIG) as Array<[DocumentCategory, typeof CATEGORY_CONFIG[DocumentCategory]]>).map(([key, config]) => {
            const count = getCountByCategory(key);
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  activeCategory === key
                    ? `${config.bgColor} ${config.color} border-2 ${config.borderColor}`
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {config.label.split(' ')[0]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {selectedCount} document{selectedCount !== 1 ? 's' : ''} sélectionné{selectedCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeCategory !== 'all' && (
            <button
              onClick={() => selectAllInCategory(activeCategory)}
              className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Tout sélectionner
            </button>
          )}
          <button
            onClick={clearAll}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Effacer
          </button>
        </div>
      </div>

      {/* Liste des documents */}
      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {filteredDocs.map((doc) => {
          const isSelected = selected.has(doc.id);
          const categoryConfig = CATEGORY_CONFIG[doc.category];
          const Icon = categoryConfig.icon;

          return (
            <div
              key={doc.id}
              onClick={() => toggleDocument(doc.id)}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? `border-blue-500 ${categoryConfig.bgColor}`
                  : `border-gray-200 ${categoryConfig.hoverBgColor} bg-white`
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-0.5">
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Icon className={`w-4 h-4 ${categoryConfig.color}`} />
                    <span className="font-medium text-gray-900">{doc.name}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${categoryConfig.bgColor} ${categoryConfig.color}`}>
                      {categoryConfig.label.split(' ')[0]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-gray-500">
                      {new Date(doc.uploaded_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                    {doc.file_size && (
                      <p className="text-xs text-gray-500">
                        {formatFileSize(doc.file_size)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); void openDocument(doc); }}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Voir le document"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); void openDocument(doc, true); }}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Télécharger"
                  >
                    <Download className="w-4 h-4" />
                  </button>                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Résumé des sélections */}
      {selectedCount > 0 && (
        <div className="p-4 bg-blue-50 border-t border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">{selectedCount} document{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''} :</p>
              <div className="mt-2 space-y-1">
                {Array.from(selected).map(id => {
                  const doc = documents.find(d => d.id === id);
                  if (!doc) return null;
                  const categoryConfig = CATEGORY_CONFIG[doc.category];
                  const Icon = categoryConfig.icon;
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <Icon className="w-3 h-3" />
                      <span>{doc.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
