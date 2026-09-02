import { useState, useEffect } from 'react';
import {
  FileText,
  Building2,
  CheckSquare,
  Square,
  ExternalLink,
  Download,
  Info,
  Paperclip
} from 'lucide-react';
import { nativeAdminInsuranceCompanies } from '@/lib/native-admin-data';

interface InsuranceCompany {
  id: string;
  name: string;
  code: string;
  logo_url?: string;
}

interface LegalDocument {
  id: string;
  name: string;
  file_path: string;
  description: string;
  type: 'DG' | 'IPID' | 'CG' | 'CONV_ASSISTANCE' | 'MANDAT' | 'AUTRE';
  companies: string[];
}

interface LegalDocumentsSelectorProps {
  selectedCompanyId?: string;
  onDocumentsSelected: (documents: LegalDocument[]) => void;
  selectedDocuments?: LegalDocument[];
}

const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    id: 'dg-stradia',
    name: 'Dispositions Générales Stradia',
    file_path: '/documents/dispositions_generales_stradia_usages_speciaux_-_ref__ga1321j_-_octobre_2023.pdf',
    description: 'Dispositions générales pour véhicules taxi et VTC',
    type: 'DG',
    companies: ['all']
  },
  {
    id: 'ipid',
    name: 'IPID - Document Information Produit',
    file_path: '/documents/ipid.pdf',
    description: 'Fiche standardisée d\'information sur le produit d\'assurance',
    type: 'IPID',
    companies: ['all']
  },
  {
    id: 'cg-taxi-2017',
    name: 'Conditions Générales Taxi',
    file_path: '/documents/conditions_generales_taxi_decembre_2017.pdf',
    description: 'Conditions générales spécifiques taxi',
    type: 'CG',
    companies: ['all']
  },
  {
    id: 'conv-assistance-mfa',
    name: 'Convention Assistance MFA',
    file_path: '/documents/convention_assistance_mfa_taxi_mai_2020.pdf',
    description: 'Convention d\'assistance MFA pour taxis',
    type: 'CONV_ASSISTANCE',
    companies: ['all']
  },
  {
    id: 'conv-assistance',
    name: 'Convention Assistance',
    file_path: '/documents/convention_assistance.pdf',
    description: 'Convention d\'assistance générale',
    type: 'CONV_ASSISTANCE',
    companies: ['all']
  },
  {
    id: 'mandat-prelevement',
    name: 'Mandat de Prélèvement SEPA',
    file_path: '/documents/mandat_de_prelevement_iard_-_ref._gap400dmh_-_decembre_2025.pdf',
    description: 'Mandat de prélèvement automatique SEPA',
    type: 'MANDAT',
    companies: ['all']
  },
  {
    id: 'pid-stradia',
    name: 'PID Stradia Usages Spéciaux',
    file_path: '/documents/pid_stradia_usages_speciaux,_vehicules_de_collection,_voiturettes_-_ref._gaf035c_-_janvier_2020.pdf',
    description: 'Document d\'information précontractuelle',
    type: 'AUTRE',
    companies: ['all']
  },
  {
    id: 'questionnaire-agira',
    name: 'Questionnaire AGIRA',
    file_path: '/documents/questionnaire_agira.docx',
    description: 'Questionnaire pour vérification antécédents',
    type: 'AUTRE',
    companies: ['all']
  },
  {
    id: 'fiche-identite',
    name: 'Fiche Vérification Identité',
    file_path: '/documents/fiche_verification_identite.pdf',
    description: 'Formulaire de vérification d\'identité',
    type: 'AUTRE',
    companies: ['all']
  }
];

const DOC_TYPE_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  DG: { label: 'Dispositions Générales', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  IPID: { label: 'IPID', color: 'text-green-700', bgColor: 'bg-green-100' },
  CG: { label: 'Conditions Générales', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  CONV_ASSISTANCE: { label: 'Assistance', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  MANDAT: { label: 'Mandat', color: 'text-pink-700', bgColor: 'bg-pink-100' },
  AUTRE: { label: 'Autre', color: 'text-gray-700', bgColor: 'bg-gray-100' }
};

export function LegalDocumentsSelector({
  selectedCompanyId,
  onDocumentsSelected,
  selectedDocuments = []
}: LegalDocumentsSelectorProps) {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>(selectedCompanyId || '');
  const [selected, setSelected] = useState<Set<string>>(
    new Set(selectedDocuments.map(d => d.id))
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      setSelectedCompany(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  const loadCompanies = async () => {
    try {
      const result = await nativeAdminInsuranceCompanies() as { companies?: Array<InsuranceCompany & { is_active?: boolean; priority_order?: number }> };
      const activeCompanies = (result.companies || [])
        .filter(company => company.is_active !== false)
        .sort((a, b) => Number(a.priority_order || 0) - Number(b.priority_order || 0));
      setCompanies(activeCompanies);
    } catch (err) {
      console.error('Error loading companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableDocuments = () => {
    return LEGAL_DOCUMENTS.filter(doc =>
      doc.companies.includes('all') ||
      (selectedCompany && doc.companies.includes(selectedCompany))
    );
  };

  const toggleDocument = (docId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelected(newSelected);

    const selectedDocs = LEGAL_DOCUMENTS.filter(d => newSelected.has(d.id));
    onDocumentsSelected(selectedDocs);
  };

  const selectAllRequired = () => {
    const requiredTypes = ['DG', 'IPID', 'CG'];
    const docs = getAvailableDocuments().filter(d => requiredTypes.includes(d.type));
    const newSelected = new Set(docs.map(d => d.id));
    setSelected(newSelected);
    onDocumentsSelected(docs);
  };

  const clearAll = () => {
    setSelected(new Set());
    onDocumentsSelected([]);
  };

  const availableDocs = getAvailableDocuments();
  const selectedCount = selected.size;

  return (
    <div className="bg-white rounded-xl border-2 border-teal-200 overflow-hidden">
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Paperclip className="w-5 h-5" />
          Documents Légaux à Joindre
        </h3>
        <p className="text-teal-100 text-sm mt-1">
          Sélectionnez les documents à envoyer avec le devis
        </p>
      </div>

      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Building2 className="w-4 h-4 inline mr-1" />
          Compagnie d'assurance
        </label>
        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white text-gray-900"
        >
          <option value="">Toutes les compagnies</option>
          {companies.map(company => (
            <option key={company.id} value={company.code}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {selectedCount} document{selectedCount !== 1 ? 's' : ''} sélectionné{selectedCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={selectAllRequired}
            className="px-3 py-1.5 text-sm bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors"
          >
            DG + IPID + CG
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Effacer
          </button>
        </div>
      </div>

      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {availableDocs.map((doc) => {
          const isSelected = selected.has(doc.id);
          const typeConfig = DOC_TYPE_LABELS[doc.type];

          return (
            <div
              key={doc.id}
              onClick={() => toggleDocument(doc.id)}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 hover:border-teal-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-0.5">
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-teal-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{doc.name}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${typeConfig.bgColor} ${typeConfig.color}`}>
                      {typeConfig.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{doc.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={doc.file_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"
                    title="Voir le document"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <a
                    href={doc.file_path}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"
                    title="Télécharger"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedCount > 0 && (
        <div className="p-4 bg-teal-50 border-t border-teal-200">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-teal-600 flex-shrink-0" />
            <div className="text-sm text-teal-800">
              <p className="font-medium">Documents sélectionnés :</p>
              <ul className="list-disc list-inside mt-1">
                {Array.from(selected).map(id => {
                  const doc = LEGAL_DOCUMENTS.find(d => d.id === id);
                  return doc ? <li key={id}>{doc.name}</li> : null;
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
