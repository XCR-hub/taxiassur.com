import { useState, useEffect } from 'react';
import {
  Building2, Plus, Edit2, Trash2, Upload, FileText, Check, X,
  AlertCircle, Save, Eye, EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Modal, ModalFooter } from '../components/Modal';
import { Badge } from '../components/Badge';

interface InsuranceCompany {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  description: string | null;
  is_active: boolean;
  priority_order: number;
  created_at: string;
}

interface CompanyDocument {
  id: string;
  company_id: string;
  document_name: string;
  document_type: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  is_mandatory: boolean;
  send_with_quote: boolean;
  send_with_contract: boolean;
  description: string | null;
  created_at: string;
}

export default function InsuranceCompaniesManager() {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<InsuranceCompany | null>(null);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    logo_url: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    description: '',
    is_active: true,
    priority_order: 0
  });

  const [documentFormData, setDocumentFormData] = useState({
    document_name: '',
    document_type: 'conditions_generales',
    file_url: '',
    is_mandatory: true,
    send_with_quote: true,
    send_with_contract: false,
    description: ''
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_companies')
        .select('*')
        .order('priority_order', { ascending: true });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Erreur chargement compagnies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('company_documents')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    }
  };

  const handleEdit = (company: InsuranceCompany) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      code: company.code,
      logo_url: company.logo_url || '',
      contact_email: company.contact_email || '',
      contact_phone: company.contact_phone || '',
      website: company.website || '',
      description: company.description || '',
      is_active: company.is_active,
      priority_order: company.priority_order
    });
    setIsEditModalOpen(true);
  };

  const handleSaveCompany = async () => {
    setSaving(true);
    try {
      if (selectedCompany) {
        const { error } = await supabase
          .from('insurance_companies')
          .update(formData)
          .eq('id', selectedCompany.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('insurance_companies')
          .insert([formData]);

        if (error) throw error;
      }

      await loadCompanies();
      setIsEditModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette compagnie ?')) return;

    try {
      const { error } = await supabase
        .from('insurance_companies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadCompanies();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleManageDocuments = async (company: InsuranceCompany) => {
    setSelectedCompany(company);
    await loadDocuments(company.id);
    setIsDocumentModalOpen(true);
  };

  const handleSaveDocument = async () => {
    if (!selectedCompany) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_documents')
        .insert([{
          company_id: selectedCompany.id,
          ...documentFormData
        }]);

      if (error) throw error;
      await loadDocuments(selectedCompany.id);
      setDocumentFormData({
        document_name: '',
        document_type: 'conditions_generales',
        file_url: '',
        is_mandatory: true,
        send_with_quote: true,
        send_with_contract: false,
        description: ''
      });
    } catch (error) {
      console.error('Erreur ajout document:', error);
      alert('Erreur lors de l\'ajout du document');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Supprimer ce document ?')) return;

    try {
      const { error } = await supabase
        .from('company_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      if (selectedCompany) await loadDocuments(selectedCompany.id);
    } catch (error) {
      console.error('Erreur suppression document:', error);
    }
  };

  const resetForm = () => {
    setSelectedCompany(null);
    setFormData({
      name: '',
      code: '',
      logo_url: '',
      contact_email: '',
      contact_phone: '',
      website: '',
      description: '',
      is_active: true,
      priority_order: 0
    });
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Building2 className="w-10 h-10 text-blue-500" />
              Gestion des Compagnies d'Assurance
            </h1>
            <p className="text-gray-400 text-lg">
              Gérez les compagnies partenaires et leurs documents obligatoires
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsEditModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ajouter une compagnie
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div
              key={company.id}
              className="bg-gray-900 rounded-xl border border-gray-800 p-6 hover:border-blue-500/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">{company.name}</h3>
                  <p className="text-sm text-gray-500">{company.code}</p>
                </div>
                <div className="flex items-center gap-2">
                  {company.is_active ? (
                    <Badge variant="success" size="sm">Actif</Badge>
                  ) : (
                    <Badge variant="default" size="sm">Inactif</Badge>
                  )}
                </div>
              </div>

              {company.description && (
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {company.description}
                </p>
              )}

              <div className="space-y-2 mb-4 text-sm">
                {company.contact_email && (
                  <div className="text-gray-400">
                    <span className="font-semibold">Email:</span> {company.contact_email}
                  </div>
                )}
                {company.contact_phone && (
                  <div className="text-gray-400">
                    <span className="font-semibold">Tél:</span> {company.contact_phone}
                  </div>
                )}
                {company.website && (
                  <div className="text-gray-400">
                    <span className="font-semibold">Site:</span>{' '}
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      {company.website}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(company)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={() => handleManageDocuments(company)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Documents
                </button>
                <button
                  onClick={() => handleDeleteCompany(company.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {companies.length === 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Aucune compagnie</h3>
            <p className="text-gray-400 mb-6">Ajoutez votre première compagnie d'assurance</p>
            <button
              onClick={() => {
                resetForm();
                setIsEditModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter une compagnie
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={selectedCompany ? 'Modifier la compagnie' : 'Nouvelle compagnie'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Nom *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Email contact</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Téléphone</label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Site web</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Ordre de priorité</label>
              <input
                type="number"
                value={formData.priority_order}
                onChange={(e) => setFormData({ ...formData, priority_order: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Statut</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-white">Compagnie active</span>
              </label>
            </div>
          </div>
        </div>

        <ModalFooter>
          <button
            onClick={() => setIsEditModalOpen(false)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={handleSaveCompany}
            disabled={saving || !formData.name || !formData.code}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        title={`Documents - ${selectedCompany?.name}`}
        size="xl"
      >
        <div className="space-y-6">
          <div className="bg-gray-950 rounded-lg p-4 border border-gray-800">
            <h3 className="text-white font-semibold mb-4">Ajouter un document</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Nom du document</label>
                  <input
                    type="text"
                    value={documentFormData.document_name}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, document_name: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                    placeholder="ex: Conditions Générales 2025"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Type</label>
                  <select
                    value={documentFormData.document_type}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, document_type: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="conditions_generales">Conditions Générales</option>
                    <option value="notice_information">Notice d'Information</option>
                    <option value="ipid">IPID</option>
                    <option value="formulaire_souscription">Formulaire de Souscription</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">URL du fichier</label>
                <input
                  type="url"
                  value={documentFormData.file_url}
                  onChange={(e) => setDocumentFormData({ ...documentFormData, file_url: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Description</label>
                <input
                  type="text"
                  value={documentFormData.description}
                  onChange={(e) => setDocumentFormData({ ...documentFormData, description: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={documentFormData.is_mandatory}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, is_mandatory: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-white">Document obligatoire</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={documentFormData.send_with_quote}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, send_with_quote: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-white">Envoyer avec devis</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={documentFormData.send_with_contract}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, send_with_contract: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-white">Envoyer avec contrat</span>
                </label>
              </div>

              <button
                onClick={handleSaveDocument}
                disabled={saving || !documentFormData.document_name || !documentFormData.file_url}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Ajouter le document
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-white font-semibold">Documents existants ({documents.length})</h3>
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-gray-950 rounded-lg p-4 border border-gray-800 flex items-start justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <h4 className="text-white font-semibold">{doc.document_name}</h4>
                    {doc.is_mandatory && <Badge variant="warning" size="sm">Obligatoire</Badge>}
                  </div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>Type: {doc.document_type}</div>
                    {doc.description && <div>{doc.description}</div>}
                    <div className="flex gap-3">
                      {doc.send_with_quote && <Badge variant="info" size="sm">Avec devis</Badge>}
                      {doc.send_with_contract && <Badge variant="success" size="sm">Avec contrat</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-blue-500"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {documents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Aucun document pour cette compagnie
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
