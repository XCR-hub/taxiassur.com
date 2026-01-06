import { useState, useEffect } from 'react';
import { Upload, Check, AlertCircle, FileText, Download, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Badge } from '../components/Badge';

interface Company {
  id: string;
  name: string;
  code: string;
}

interface DocumentTemplate {
  document_name: string;
  document_type: string;
  is_mandatory: boolean;
  send_with_quote: boolean;
  send_with_contract: boolean;
  description: string;
}

const DOCUMENT_TEMPLATES: Record<string, DocumentTemplate[]> = {
  MFA: [
    {
      document_name: 'Conditions Générales MFA 2025',
      document_type: 'conditions_generales',
      is_mandatory: true,
      send_with_quote: true,
      send_with_contract: false,
      description: 'Conditions générales du contrat taxi MFA'
    },
    {
      document_name: 'Notice d\'Information MFA',
      document_type: 'notice_information',
      is_mandatory: true,
      send_with_quote: true,
      send_with_contract: false,
      description: 'Notice explicative des garanties'
    },
    {
      document_name: 'IPID MFA',
      document_type: 'ipid',
      is_mandatory: true,
      send_with_quote: true,
      send_with_contract: false,
      description: 'Document d\'information produit (IPID)'
    },
    {
      document_name: 'Formulaire de Souscription MFA',
      document_type: 'formulaire_souscription',
      is_mandatory: false,
      send_with_quote: false,
      send_with_contract: true,
      description: 'Formulaire à remplir pour souscription'
    }
  ],
  GENERALI: [
    {
      document_name: 'Conditions Générales Generali 2025',
      document_type: 'conditions_generales',
      is_mandatory: true,
      send_with_quote: true,
      send_with_contract: false,
      description: 'Conditions générales du contrat taxi Generali'
    },
    {
      document_name: 'Notice d\'Information Generali',
      document_type: 'notice_information',
      is_mandatory: true,
      send_with_quote: true,
      send_with_contract: false,
      description: 'Notice explicative des garanties'
    },
    {
      document_name: 'IPID Generali',
      document_type: 'ipid',
      is_mandatory: true,
      send_with_quote: true,
      send_with_contract: false,
      description: 'Document d\'information produit (IPID)'
    }
  ],
  PLUS_SIMPLE: [
    {
      document_name: 'Conditions Générales +Simple 2025',
      document_type: 'conditions_generales',
      is_mandatory: true,
      send_with_quote: true,
      send_with_contract: false,
      description: 'Conditions générales du contrat taxi +Simple'
    },
    {
      document_name: 'IPID +Simple',
      document_type: 'ipid',
      is_mandatory: true,
      send_with_quote: true,
      send_with_contract: false,
      description: 'Document d\'information produit (IPID)'
    }
  ],
  SOLLY_AZAR: [
    {
      document_name: 'Conditions Générales Solly Azar 2025',
      document_type: 'conditions_generales',
      is_mandatory: true,
      send_with_quote: true,
      send_with_contract: false,
      description: 'Conditions générales du contrat taxi Solly Azar'
    },
    {
      document_name: 'Notice d\'Information Solly Azar',
      document_type: 'notice_information',
      is_mandatory: true,
      send_with_quote: true,
      send_with_contract: false,
      description: 'Notice explicative des garanties'
    },
    {
      document_name: 'IPID Solly Azar',
      document_type: 'ipid',
      is_mandatory: true,
      send_with_quote: true,
      send_with_contract: false,
      description: 'Document d\'information produit (IPID)'
    }
  ],
  ZEPHIR: [
    {
      document_name: 'Conditions Générales Zephir 2025',
      document_type: 'conditions_generales',
      is_mandatory: true,
      send_with_quote: true,
      send_with_contract: false,
      description: 'Conditions générales du contrat taxi Zephir'
    },
    {
      document_name: 'IPID Zephir',
      document_type: 'ipid',
      is_mandatory: true,
      send_with_quote: true,
      send_with_contract: false,
      description: 'Document d\'information produit (IPID)'
    }
  ]
};

export default function QuickDocumentsUpload() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<Record<string, any[]>>({});
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [uploadData, setUploadData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: companiesData } = await supabase
        .from('insurance_companies')
        .select('id, name, code')
        .eq('is_active', true)
        .order('priority_order');

      if (companiesData) {
        setCompanies(companiesData);

        const docsMap: Record<string, any[]> = {};
        for (const company of companiesData) {
          const { data: docs } = await supabase
            .from('company_documents')
            .select('*')
            .eq('company_id', company.id);
          docsMap[company.id] = docs || [];
        }
        setExistingDocuments(docsMap);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadBatch = async (company: Company) => {
    const templates = DOCUMENT_TEMPLATES[company.code] || [];
    const missingDocs = templates.filter(template => {
      const existing = existingDocuments[company.id] || [];
      return !existing.some(doc => doc.document_type === template.document_type);
    });

    if (missingDocs.length === 0) {
      alert('Tous les documents sont déjà présents pour cette compagnie !');
      return;
    }

    setSaving(true);
    try {
      const docsToInsert = missingDocs
        .filter(template => uploadData[`${company.id}_${template.document_type}`])
        .map(template => ({
          company_id: company.id,
          ...template,
          file_url: uploadData[`${company.id}_${template.document_type}`]
        }));

      if (docsToInsert.length === 0) {
        alert('Veuillez remplir au moins une URL de document');
        return;
      }

      const { error } = await supabase
        .from('company_documents')
        .insert(docsToInsert);

      if (error) throw error;

      alert(`${docsToInsert.length} document(s) ajouté(s) avec succès !`);
      await loadData();
      setSelectedCompany(null);
      setUploadData({});
    } catch (error) {
      console.error('Erreur upload:', error);
      alert('Erreur lors de l\'upload');
    } finally {
      setSaving(false);
    }
  };

  const getCompanyProgress = (companyId: string, companyCode: string) => {
    const templates = DOCUMENT_TEMPLATES[companyCode] || [];
    const existing = existingDocuments[companyId] || [];
    const mandatory = templates.filter(t => t.is_mandatory).length;
    const existingMandatory = existing.filter(doc =>
      templates.find(t => t.document_type === doc.document_type && t.is_mandatory)
    ).length;
    return { existing: existingMandatory, total: mandatory };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Upload className="w-10 h-10 text-blue-500" />
            Upload Rapide des Documents
          </h1>
          <p className="text-gray-400 text-lg">
            Ajoutez rapidement les documents obligatoires pour les 5 compagnies
          </p>
        </div>

        <div className="bg-blue-950/20 rounded-xl border border-blue-800/30 p-6 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
            <div className="text-gray-300">
              <strong className="text-white block mb-2">Instructions:</strong>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Uploadez d'abord vos documents PDF sur votre espace de stockage (Google Drive, Dropbox, serveur, etc.)</li>
                <li>Copiez les URLs publiques de chaque document</li>
                <li>Collez les URLs dans les champs ci-dessous</li>
                <li>Cliquez sur "Enregistrer" pour chaque compagnie</li>
              </ol>
              <div className="mt-3 p-3 bg-gray-950 rounded-lg">
                <strong className="text-yellow-500">Exemple d'URL valide:</strong>
                <code className="block mt-1 text-xs text-gray-400">
                  https://drive.google.com/file/d/XXXXX/view<br/>
                  https://www.dropbox.com/s/XXXXX/document.pdf<br/>
                  https://votresite.com/documents/conditions-generales.pdf
                </code>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {companies.map((company) => {
            const templates = DOCUMENT_TEMPLATES[company.code] || [];
            const existing = existingDocuments[company.id] || [];
            const progress = getCompanyProgress(company.id, company.code);
            const isComplete = progress.existing === progress.total;
            const isExpanded = selectedCompany?.id === company.id;

            return (
              <div
                key={company.id}
                className={`
                  bg-gray-900 rounded-xl border p-6 transition-all
                  ${isComplete ? 'border-green-500/30' : 'border-gray-800'}
                `}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-white">{company.name}</h3>
                      {isComplete ? (
                        <Badge variant="success" icon={<Check className="w-4 h-4" />}>
                          Complet ({progress.existing}/{progress.total})
                        </Badge>
                      ) : (
                        <Badge variant="warning" icon={<AlertCircle className="w-4 h-4" />}>
                          {progress.existing}/{progress.total} documents
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      {existing.length} document(s) total · {templates.length} document(s) attendu(s)
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCompany(isExpanded ? null : company)}
                    className={`
                      px-6 py-3 rounded-lg font-semibold flex items-center gap-2
                      ${isComplete
                        ? 'bg-gray-800 hover:bg-gray-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'}
                    `}
                  >
                    {isExpanded ? 'Fermer' : isComplete ? 'Voir les documents' : 'Ajouter des documents'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-800 pt-6 space-y-4">
                    {existing.length > 0 && (
                      <div className="bg-gray-950 rounded-lg p-4 mb-4">
                        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-500" />
                          Documents déjà présents ({existing.length})
                        </h4>
                        <div className="space-y-2">
                          {existing.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-green-500" />
                                <div>
                                  <div className="text-white font-medium">{doc.document_name}</div>
                                  <div className="text-xs text-gray-500">{doc.document_type}</div>
                                </div>
                              </div>
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-400"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {templates.filter(template =>
                      !existing.some(doc => doc.document_type === template.document_type)
                    ).length > 0 && (
                      <>
                        <h4 className="text-white font-semibold flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-yellow-500" />
                          Documents manquants
                        </h4>

                        {templates
                          .filter(template =>
                            !existing.some(doc => doc.document_type === template.document_type)
                          )
                          .map((template, index) => (
                            <div key={index} className="bg-gray-950 rounded-lg p-4 border border-gray-800">
                              <div className="flex items-start gap-3 mb-3">
                                <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="text-white font-semibold">{template.document_name}</h5>
                                    {template.is_mandatory && (
                                      <Badge variant="danger" size="sm">Obligatoire</Badge>
                                    )}
                                  </div>
                                  <p className="text-gray-400 text-sm mb-2">{template.description}</p>
                                  <div className="flex gap-2 text-xs">
                                    {template.send_with_quote && (
                                      <Badge variant="info" size="sm">Envoi avec devis</Badge>
                                    )}
                                    {template.send_with_contract && (
                                      <Badge variant="success" size="sm">Envoi avec contrat</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <input
                                type="url"
                                placeholder="https://... (collez l'URL du document ici)"
                                value={uploadData[`${company.id}_${template.document_type}`] || ''}
                                onChange={(e) => setUploadData({
                                  ...uploadData,
                                  [`${company.id}_${template.document_type}`]: e.target.value
                                })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                          ))}

                        <button
                          onClick={() => handleUploadBatch(company)}
                          disabled={saving}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 text-lg"
                        >
                          <Upload className="w-5 h-5" />
                          {saving ? 'Enregistrement...' : 'Enregistrer les documents'}
                        </button>
                      </>
                    )}

                    {templates.filter(template =>
                      !existing.some(doc => doc.document_type === template.document_type)
                    ).length === 0 && existing.length > 0 && (
                      <div className="bg-green-950/20 rounded-lg p-6 border border-green-800/30 text-center">
                        <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <h4 className="text-white font-semibold text-lg mb-1">Tous les documents sont présents</h4>
                        <p className="text-gray-400 text-sm">Cette compagnie est prête à être utilisée</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-white font-bold text-lg mb-4">Récapitulatif Global</h3>
          <div className="grid grid-cols-5 gap-4">
            {companies.map((company) => {
              const progress = getCompanyProgress(company.id, company.code);
              const isComplete = progress.existing === progress.total;
              return (
                <div key={company.id} className="text-center">
                  <div className={`
                    w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2
                    ${isComplete ? 'bg-green-600' : 'bg-gray-800'}
                  `}>
                    {isComplete ? (
                      <Check className="w-8 h-8 text-white" />
                    ) : (
                      <span className="text-white font-bold">{progress.existing}/{progress.total}</span>
                    )}
                  </div>
                  <div className="text-white font-semibold text-sm">{company.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
