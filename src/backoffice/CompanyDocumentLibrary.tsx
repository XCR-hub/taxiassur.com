import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Building2,
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  Calendar,
  Tag,
  Settings
} from 'lucide-react';

interface InsuranceCompany {
  id: string;
  name: string;
  logo_url: string | null;
}

interface CompanyDocument {
  id: string;
  company_id: string;
  document_type: string;
  document_category: string;
  document_name: string;
  description: string | null;
  file_url: string;
  file_size_bytes: number | null;
  mime_type: string;
  version: string;
  valid_from_date: string;
  valid_until_date: string | null;
  is_active: boolean;
  is_mandatory: boolean;
  auto_attach_on: string[];
  display_order: number;
  show_in_prospect_space: boolean;
  show_in_client_space: boolean;
  upload_count: number;
  download_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

const DOCUMENT_TYPES = [
  { value: 'conditions_generales', label: 'Conditions Générales' },
  { value: 'ipid', label: 'IPID (Document d\'Information)' },
  { value: 'convention_assistance', label: 'Convention d\'Assistance' },
  { value: 'notice_information', label: 'Notice d\'Information' },
  { value: 'mandat_sepa_type', label: 'Mandat SEPA Type' },
  { value: 'glossaire', label: 'Glossaire des Termes' },
  { value: 'guide_client', label: 'Guide Client' },
  { value: 'declaration_sinistre_type', label: 'Déclaration de Sinistre Type' }
];

const DOCUMENT_CATEGORIES = [
  { value: 'legal', label: 'Légal' },
  { value: 'contractuel', label: 'Contractuel' },
  { value: 'information', label: 'Information' },
  { value: 'administratif', label: 'Administratif' }
];

const AUTO_ATTACH_OPTIONS = [
  { value: 'devis', label: 'Lors de l\'upload du devis' },
  { value: 'contrat', label: 'Lors de la signature du contrat' },
  { value: 'prospect_space', label: 'Dans l\'espace prospect' },
  { value: 'client_space', label: 'Dans l\'espace client' }
];

export default function CompanyDocumentLibrary() {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    document_type: 'conditions_generales',
    document_category: 'legal',
    document_name: '',
    description: '',
    version: 'V2026.01',
    valid_from_date: new Date().toISOString().split('T')[0],
    valid_until_date: '',
    is_mandatory: true,
    auto_attach_on: ['devis', 'contrat'] as string[],
    show_in_prospect_space: true,
    show_in_client_space: true
  });
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadDocuments(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_companies')
        .select('id, name, logo_url')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCompanies(data || []);

      if (data && data.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (companyId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_document_library')
        .select('*')
        .eq('company_id', companyId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingFile(file);
      if (!uploadForm.document_name) {
        setUploadForm(prev => ({
          ...prev,
          document_name: file.name.replace(/\.[^/.]+$/, '')
        }));
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadingFile || !selectedCompanyId) return;

    try {
      setUploading(true);

      const fileExt = uploadingFile.name.split('.').pop();
      const fileName = `${selectedCompanyId}/${uploadForm.document_type}_${uploadForm.version}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, uploadingFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('company_document_library')
        .insert({
          company_id: selectedCompanyId,
          document_type: uploadForm.document_type,
          document_category: uploadForm.document_category,
          document_name: uploadForm.document_name,
          description: uploadForm.description || null,
          file_url: urlData.publicUrl,
          file_path: fileName,
          file_size_bytes: uploadingFile.size,
          mime_type: uploadingFile.type || 'application/pdf',
          version: uploadForm.version,
          valid_from_date: uploadForm.valid_from_date,
          valid_until_date: uploadForm.valid_until_date || null,
          is_active: true,
          is_mandatory: uploadForm.is_mandatory,
          auto_attach_on: uploadForm.auto_attach_on,
          show_in_prospect_space: uploadForm.show_in_prospect_space,
          show_in_client_space: uploadForm.show_in_client_space,
          display_order: documents.length
        });

      if (insertError) throw insertError;

      await loadDocuments(selectedCompanyId);
      setShowUploadModal(false);
      resetUploadForm();
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Erreur lors de l\'upload du document');
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      document_type: 'conditions_generales',
      document_category: 'legal',
      document_name: '',
      description: '',
      version: 'V2026.01',
      valid_from_date: new Date().toISOString().split('T')[0],
      valid_until_date: '',
      is_mandatory: true,
      auto_attach_on: ['devis', 'contrat'],
      show_in_prospect_space: true,
      show_in_client_space: true
    });
    setUploadingFile(null);
  };

  const toggleDocumentActive = async (docId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('company_document_library')
        .update({ is_active: !currentStatus })
        .eq('id', docId);

      if (error) throw error;

      if (selectedCompanyId) {
        await loadDocuments(selectedCompanyId);
      }
    } catch (error) {
      console.error('Error toggling document:', error);
    }
  };

  const deleteDocument = async (docId: string, filePath: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      await supabase.storage.from('documents').remove([filePath]);

      const { error } = await supabase
        .from('company_document_library')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      if (selectedCompanyId) {
        await loadDocuments(selectedCompanyId);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            Bibliothèque Documentaire par Compagnie
          </h1>
          <p className="text-gray-600 mt-2">
            Gérez les documents généraux qui seront automatiquement attachés aux devis et contrats
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Liste des compagnies */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-4">Compagnies</h2>
              <div className="space-y-2">
                {companies.map(company => (
                  <button
                    key={company.id}
                    onClick={() => setSelectedCompanyId(company.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedCompanyId === company.id
                        ? 'bg-blue-50 border-2 border-blue-500 text-blue-900'
                        : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="w-6 h-6 object-contain" />
                      ) : (
                        <Building2 className="w-5 h-5" />
                      )}
                      <span className="font-medium">{company.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main content - Documents */}
          <div className="lg:col-span-3">
            {selectedCompany && (
              <>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {selectedCompany.logo_url && (
                        <img src={selectedCompany.logo_url} alt={selectedCompany.name} className="w-12 h-12 object-contain" />
                      )}
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedCompany.name}</h2>
                        <p className="text-gray-600">{documents.length} document(s)</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Ajouter un document
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600 mt-2">Chargement...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun document</h3>
                    <p className="text-gray-600 mb-6">Commencez par ajouter des documents pour cette compagnie</p>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Ajouter le premier document
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documents.map(doc => (
                      <div
                        key={doc.id}
                        className={`bg-white rounded-lg shadow-sm border ${
                          doc.is_active ? 'border-gray-200' : 'border-red-300 bg-red-50'
                        } p-6`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <FileText className="w-6 h-6 text-blue-600" />
                              <h3 className="text-lg font-semibold text-gray-900">{doc.document_name}</h3>
                              {doc.is_active ? (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                                  Actif
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                                  Inactif
                                </span>
                              )}
                              {doc.is_mandatory && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                  Obligatoire
                                </span>
                              )}
                            </div>

                            {doc.description && (
                              <p className="text-gray-600 text-sm mb-3">{doc.description}</p>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Type:</span>
                                <p className="font-medium text-gray-900">
                                  {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500">Catégorie:</span>
                                <p className="font-medium text-gray-900">
                                  {DOCUMENT_CATEGORIES.find(c => c.value === doc.document_category)?.label || doc.document_category}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500">Version:</span>
                                <p className="font-medium text-gray-900">{doc.version}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Taille:</span>
                                <p className="font-medium text-gray-900">{formatBytes(doc.file_size_bytes)}</p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {doc.auto_attach_on.map(option => (
                                <span
                                  key={option}
                                  className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full"
                                >
                                  Auto: {AUTO_ATTACH_OPTIONS.find(o => o.value === option)?.label || option}
                                </span>
                              ))}
                            </div>

                            <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                <span>{doc.upload_count} utilisations</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Download className="w-4 h-4" />
                                <span>{doc.download_count} téléchargements</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>Depuis le {new Date(doc.valid_from_date).toLocaleDateString('fr-FR')}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Télécharger"
                            >
                              <Download className="w-5 h-5" />
                            </a>
                            <button
                              onClick={() => toggleDocumentActive(doc.id, doc.is_active)}
                              className={`p-2 rounded-lg transition-colors ${
                                doc.is_active
                                  ? 'text-green-600 hover:bg-green-50'
                                  : 'text-red-600 hover:bg-red-50'
                              }`}
                              title={doc.is_active ? 'Désactiver' : 'Activer'}
                            >
                              {doc.is_active ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            </button>
                            <button
                              onClick={() => deleteDocument(doc.id, doc.file_path || '')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Ajouter un document</h2>
              <p className="text-gray-600 mt-1">
                {selectedCompany?.name}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichier PDF
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                />
                {uploadingFile && (
                  <p className="text-sm text-gray-600 mt-2">
                    Fichier sélectionné: {uploadingFile.name} ({formatBytes(uploadingFile.size)})
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de document
                  </label>
                  <select
                    value={uploadForm.document_type}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, document_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {DOCUMENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catégorie
                  </label>
                  <select
                    value={uploadForm.document_category}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, document_category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {DOCUMENT_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du document
                </label>
                <input
                  type="text"
                  value={uploadForm.document_name}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, document_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Conditions Générales Generali 2026"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optionnelle)
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Description du document..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Version
                  </label>
                  <input
                    type="text"
                    value={uploadForm.version}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, version: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: V2026.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valide à partir du
                  </label>
                  <input
                    type="date"
                    value={uploadForm.valid_from_date}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, valid_from_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Attacher automatiquement lors de:
                </label>
                <div className="space-y-2">
                  {AUTO_ATTACH_OPTIONS.map(option => (
                    <label key={option.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={uploadForm.auto_attach_on.includes(option.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setUploadForm(prev => ({
                              ...prev,
                              auto_attach_on: [...prev.auto_attach_on, option.value]
                            }));
                          } else {
                            setUploadForm(prev => ({
                              ...prev,
                              auto_attach_on: prev.auto_attach_on.filter(v => v !== option.value)
                            }));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={uploadForm.is_mandatory}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, is_mandatory: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Document obligatoire</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={uploadForm.show_in_prospect_space}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, show_in_prospect_space: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Visible espace prospect</span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                disabled={uploading}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadingFile || !uploadForm.document_name || uploading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Uploader le document
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
