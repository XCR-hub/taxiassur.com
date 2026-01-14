import { useState, useEffect } from 'react';
import { FileText, Download, Eye, Calendar, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CompanyDocument {
  id: string;
  company_id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  file_size: number | null;
  version: string | null;
  effective_date: string | null;
  is_active: boolean;
}

interface InsuranceCompany {
  id: string;
  code: string;
  name: string;
  logo_url: string | null;
}

interface Props {
  companyId?: string;
  showAllCompanies?: boolean;
}

const DOCUMENT_TYPE_LABELS: Record<string, { label: string; icon: any; description: string }> = {
  'conditions_generales': {
    label: 'Conditions Générales',
    icon: FileText,
    description: 'Ensemble des règles régissant le contrat'
  },
  'conditions_particulieres': {
    label: 'Conditions Particulières',
    icon: FileText,
    description: 'Conditions spécifiques à votre contrat'
  },
  'ipid': {
    label: 'IPID (Fiche d\'Information)',
    icon: Shield,
    description: 'Document d\'information standardisé'
  },
  'notice_information': {
    label: 'Notice d\'Information',
    icon: FileText,
    description: 'Guide explicatif du contrat'
  },
  'assistance': {
    label: 'Convention d\'Assistance',
    icon: Shield,
    description: 'Détails des services d\'assistance'
  },
  'glossaire': {
    label: 'Glossaire',
    icon: FileText,
    description: 'Définitions des termes du contrat'
  }
};

export default function CompanyDocumentsLibrary({ companyId, showAllCompanies = false }: Props) {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [documents, setDocuments] = useState<Map<string, CompanyDocument[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(companyId || null);

  useEffect(() => {
    loadData();
  }, [companyId, showAllCompanies]);

  const loadData = async () => {
    try {
      setLoading(true);

      let companiesQuery = supabase
        .from('insurance_companies')
        .select('id, code, name, logo_url')
        .eq('is_active', true);

      if (companyId && !showAllCompanies) {
        companiesQuery = companiesQuery.eq('id', companyId);
      } else if (showAllCompanies) {
        companiesQuery = companiesQuery.eq('is_mandatory', true);
      }

      const { data: companiesData, error: companiesError } = await companiesQuery.order('priority_order');

      if (companiesError) throw companiesError;

      setCompanies(companiesData || []);

      if (companiesData && companiesData.length > 0) {
        if (!selectedCompany) {
          setSelectedCompany(companiesData[0].id);
        }

        const docsMap = new Map<string, CompanyDocument[]>();

        for (const company of companiesData) {
          const { data: docsData, error: docsError } = await supabase
            .from('company_document_library')
            .select('*')
            .eq('company_id', company.id)
            .eq('is_active', true)
            .order('document_type');

          if (docsError) throw docsError;

          docsMap.set(company.id, docsData || []);
        }

        setDocuments(docsMap);
      }
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} Ko`;
    return `${(kb / 1024).toFixed(1)} Mo`;
  };

  const getDocumentsByType = (companyId: string) => {
    const companyDocs = documents.get(companyId) || [];
    const grouped = new Map<string, CompanyDocument[]>();

    companyDocs.forEach(doc => {
      const existing = grouped.get(doc.document_type) || [];
      grouped.set(doc.document_type, [...existing, doc]);
    });

    return grouped;
  };

  if (loading) {
    return <div className="p-4 text-center">Chargement de la bibliothèque...</div>;
  }

  if (companies.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Aucun document disponible</p>
      </div>
    );
  }

  const currentCompany = companies.find(c => c.id === selectedCompany);
  const groupedDocs = selectedCompany ? getDocumentsByType(selectedCompany) : new Map();

  return (
    <div className="space-y-4">
      {showAllCompanies && companies.length > 1 && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Sélectionnez une compagnie</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => setSelectedCompany(company.id)}
                className={`p-3 border rounded-lg text-center transition-all ${
                  selectedCompany === company.id
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {company.logo_url ? (
                  <img src={company.logo_url} alt={company.name} className="h-8 mx-auto mb-2" />
                ) : (
                  <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                )}
                <div className="text-sm font-medium">{company.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {currentCompany && (
        <div className="bg-white border rounded-lg">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents {currentCompany.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Consultez tous les documents contractuels et informatifs
            </p>
          </div>

          {groupedDocs.size === 0 ? (
            <div className="p-8 text-center text-gray-600">
              Aucun document disponible pour cette compagnie
            </div>
          ) : (
            <div className="divide-y">
              {Array.from(groupedDocs.entries()).map(([docType, docs]) => {
                const typeInfo = DOCUMENT_TYPE_LABELS[docType];
                if (!typeInfo) return null;

                const Icon = typeInfo.icon;

                return (
                  <div key={docType} className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Icon className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold">{typeInfo.label}</h4>
                        <p className="text-sm text-gray-600">{typeInfo.description}</p>
                      </div>
                    </div>

                    <div className="space-y-2 ml-8">
                      {docs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">{doc.document_name}</div>
                            <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                              {doc.version && (
                                <span className="flex items-center gap-1">
                                  Version {doc.version}
                                </span>
                              )}
                              {doc.effective_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  En vigueur depuis {new Date(doc.effective_date).toLocaleDateString('fr-FR')}
                                </span>
                              )}
                              {doc.file_size && (
                                <span>{formatFileSize(doc.file_size)}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 border border-gray-300 rounded hover:bg-white flex items-center gap-1.5 text-sm"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Consulter
                            </a>
                            <a
                              href={doc.file_url}
                              download
                              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1.5 text-sm"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Télécharger
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Documents contractuels importants</p>
            <p>
              Nous vous recommandons de lire attentivement ces documents avant la souscription.
              Ils contiennent toutes les informations importantes sur vos garanties, exclusions et obligations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
