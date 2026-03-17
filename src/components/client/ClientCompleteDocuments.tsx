import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Shield,
  AlertTriangle,
  FileCheck,
  Calendar,
  Printer,
  ExternalLink,
  Folder
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ContractDocument {
  id: string;
  document_type: 'contract' | 'attestation' | 'dp' | 'dg' | 'ipid' | 'constat' | 'other';
  document_name: string;
  document_url: string;
  valid_from?: string;
  valid_until?: string;
  uploaded_at: string;
}

interface ClientCompleteDocumentsProps {
  leadId: string;
  contractId: string;
}

const DOCUMENT_CATEGORIES = {
  essential: {
    label: 'Documents essentiels',
    icon: <Shield className="w-5 h-5" />,
    color: 'blue',
    types: ['contract', 'attestation']
  },
  contractual: {
    label: 'Documents contractuels',
    icon: <FileCheck className="w-5 h-5" />,
    color: 'green',
    types: ['dp', 'dg', 'ipid']
  },
  claims: {
    label: 'Documents sinistres',
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'orange',
    types: ['constat']
  }
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  contract: 'Contrat d\'assurance',
  attestation: 'Attestation d\'assurance',
  dp: 'Dispositions Particulières',
  dg: 'Dispositions Générales',
  ipid: 'Document IPID',
  constat: 'Constat amiable',
  other: 'Autre document'
};

export const ClientCompleteDocuments: React.FC<ClientCompleteDocumentsProps> = ({
  leadId,
  contractId
}) => {
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadDocuments();
  }, [leadId, contractId]);

  const loadDocuments = async () => {
    try {
      // Charger contrats
      const { data: contracts } = await supabase
        .from('contracts')
        .select('contract_number, contract_pdf_url, uploaded_at')
        .eq('lead_id', leadId);

      // Charger attestations
      const { data: attestations } = await supabase
        .from('attestations')
        .select('attestation_type, attestation_pdf_url, valid_from, valid_until, uploaded_at')
        .eq('lead_id', leadId);

      // Charger documents légaux uploadés
      const { data: legalDocs } = await supabase
        .from('crm_documents')
        .select('document_type, file_url, file_name, uploaded_at')
        .eq('lead_id', leadId)
        .in('document_type', ['dp', 'dg', 'ipid', 'constat']);

      const allDocuments: ContractDocument[] = [];

      // Ajouter contrats
      contracts?.forEach(contract => {
        allDocuments.push({
          id: `contract-${contract.contract_number}`,
          document_type: 'contract',
          document_name: `Contrat ${contract.contract_number || ''}`,
          document_url: contract.contract_pdf_url,
          uploaded_at: contract.uploaded_at
        });
      });

      // Ajouter attestations
      attestations?.forEach((att, idx) => {
        allDocuments.push({
          id: `attestation-${idx}`,
          document_type: 'attestation',
          document_name: `Attestation ${att.attestation_type}`,
          document_url: att.attestation_pdf_url,
          valid_from: att.valid_from,
          valid_until: att.valid_until,
          uploaded_at: att.uploaded_at
        });
      });

      // Ajouter documents légaux
      legalDocs?.forEach(doc => {
        allDocuments.push({
          id: doc.file_url,
          document_type: doc.document_type as any,
          document_name: doc.file_name || DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type,
          document_url: doc.file_url,
          uploaded_at: doc.uploaded_at
        });
      });

      // Ajouter documents statiques disponibles
      const staticDocs = [
        {
          id: 'ipid-static',
          document_type: 'ipid' as const,
          document_name: 'Document IPID',
          document_url: '/documents/ipid.pdf',
          uploaded_at: new Date().toISOString()
        },
        {
          id: 'constat-static',
          document_type: 'constat' as const,
          document_name: 'Constat amiable vierge',
          document_url: '/documents/constat_amiable.pdf',
          uploaded_at: new Date().toISOString()
        }
      ];

      setDocuments([...allDocuments, ...staticDocs]);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredDocuments = () => {
    if (selectedCategory === 'all') return documents;

    const category = DOCUMENT_CATEGORIES[selectedCategory as keyof typeof DOCUMENT_CATEGORIES];
    if (!category) return documents;

    return documents.filter(doc => category.types.includes(doc.document_type));
  };

  const handlePrint = (url: string) => {
    window.open(url, '_blank');
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Mes documents</h3>
          <p className="text-sm text-gray-600">
            Tous vos documents d'assurance en un seul endroit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Folder className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">
            {documents.length} document{documents.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Filtres par catégorie */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            selectedCategory === 'all'
              ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-black'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tous ({documents.length})
        </button>
        {Object.entries(DOCUMENT_CATEGORIES).map(([key, category]) => {
          const count = documents.filter(doc => category.types.includes(doc.document_type)).length;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                selectedCategory === key
                  ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-black'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.icon}
              <span>{category.label} ({count})</span>
            </button>
          );
        })}
      </div>

      {/* Liste des documents */}
      <div className="space-y-3">
        {getFilteredDocuments().length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun document</h3>
            <p className="text-gray-600">
              {selectedCategory === 'all'
                ? 'Vos documents apparaîtront ici une fois votre contrat activé.'
                : 'Aucun document dans cette catégorie pour le moment.'}
            </p>
          </div>
        ) : (
          getFilteredDocuments().map(doc => (
            <div
              key={doc.id}
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{doc.document_name}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">
                        {DOCUMENT_TYPE_LABELS[doc.document_type]}
                      </span>
                      {doc.valid_from && doc.valid_until && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Valable du {new Date(doc.valid_from).toLocaleDateString('fr-FR')} au{' '}
                            {new Date(doc.valid_until).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-gray-400">
                        Ajouté le {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrint(doc.document_url)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Imprimer"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDownload(doc.document_url, doc.document_name)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Télécharger"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <a
                    href={doc.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black font-semibold rounded-lg text-sm flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Voir</span>
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Aide */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-900">
            <strong>Besoin d'aide ?</strong> Tous vos documents sont sécurisés et accessibles 24h/24.
            Pour toute question, contactez-nous via le chat ou par email à tim@taxiassur.com.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientCompleteDocuments;
