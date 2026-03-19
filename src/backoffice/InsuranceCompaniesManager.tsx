import React, { useEffect, useState, useRef } from 'react';
import {
  Building2, Plus, Save, Upload, Trash2, FileText, Phone, Mail,
  Globe, ExternalLink, Clock, CheckCircle, XCircle, AlertCircle,
  Download, Eye, X, ChevronRight, Shield, Loader2, ImagePlus,
  Settings, Star, Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import NavigationMenu from './NavigationMenu';

interface Company {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  claims_phone: string | null;
  assistance_phone: string | null;
  website: string | null;
  extranet_url: string | null;
  description: string | null;
  contact_hours: string | null;
  is_active: boolean;
  is_mandatory: boolean;
  workflow_type: string | null;
  priority_order: number;
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
  send_with_claim: boolean;
  description: string | null;
  version: string | null;
  valid_from: string | null;
  valid_until: string | null;
  display_order: number;
  created_at: string;
}

const WORKFLOW_TYPES = [
  { value: 'grossiste', label: 'Grossiste' },
  { value: 'delegation_totale', label: 'Délégation totale' },
  { value: 'courtier_direct', label: 'Courtier direct' },
  { value: 'direct', label: 'Direct' },
];

const DOC_SECTIONS = [
  { key: 'quote', label: 'Devis', field: 'send_with_quote' as const, color: 'blue', desc: 'Joints aux emails de proposition de devis', icon: FileText },
  { key: 'contract', label: 'Contrat', field: 'send_with_contract' as const, color: 'emerald', desc: 'Joints aux emails de contrat / mise en garantie', icon: CheckCircle },
  { key: 'claim', label: 'Sinistre', field: 'send_with_claim' as const, color: 'amber', desc: 'Joints aux emails de déclaration sinistre', icon: AlertCircle },
];

const COMPANY_COLORS = [
  'from-blue-500 to-sky-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-violet-500 to-purple-600',
];

const getCompanyGradient = (name: string) => {
  const idx = name.charCodeAt(0) % COMPANY_COLORS.length;
  return COMPANY_COLORS[idx];
};

const InsuranceCompaniesManager: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [activeTab, setActiveTab] = useState<'settings' | 'documents'>('settings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Company>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isNewCompany, setIsNewCompany] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const docInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => { loadCompanies(); }, []);

  useEffect(() => {
    if (selectedCompany) {
      setEditForm({ ...selectedCompany });
      loadDocuments(selectedCompany.id);
    }
  }, [selectedCompany]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('insurance_companies')
        .select('*')
        .order('priority_order', { ascending: true })
        .order('name');
      if (error) throw error;
      const list = data || [];
      setCompanies(list);
      if (list.length > 0 && !selectedCompany) setSelectedCompany(list[0]);
    } catch {
      showToast('error', 'Erreur lors du chargement des compagnies');
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
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      setDocuments(data || []);
    } catch {
      showToast('error', 'Erreur lors du chargement des documents');
    }
  };

  const handleSaveSettings = async () => {
    if (!editForm.name || !editForm.code) { showToast('error', 'Nom et code obligatoires'); return; }
    setSaving(true);
    try {
      if (isNewCompany) {
        const { data, error } = await supabase
          .from('insurance_companies')
          .insert([{ ...editForm, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
          .select().single();
        if (error) throw error;
        setIsNewCompany(false);
        await loadCompanies();
        setSelectedCompany(data);
        showToast('success', 'Compagnie créée avec succès');
      } else if (selectedCompany) {
        const { error } = await supabase.from('insurance_companies')
          .update({ ...editForm, updated_at: new Date().toISOString() })
          .eq('id', selectedCompany.id);
        if (error) throw error;
        const updated = { ...selectedCompany, ...editForm } as Company;
        setSelectedCompany(updated);
        setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
        showToast('success', 'Compagnie mise à jour');
      }
    } catch {
      showToast('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompany) return;
    setDeleting(true);
    try {
      const { data: docs } = await supabase.from('company_documents').select('file_url').eq('company_id', selectedCompany.id);
      if (docs && docs.length > 0) {
        const paths = docs.map(d => {
          const parts = d.file_url?.split('/company-documents/');
          return parts?.[1] || null;
        }).filter(Boolean) as string[];
        if (paths.length > 0) await supabase.storage.from('company-documents').remove(paths);
        await supabase.from('company_documents').delete().eq('company_id', selectedCompany.id);
      }
      await supabase.from('insurance_companies').delete().eq('id', selectedCompany.id);
      setConfirmDelete(false);
      setSelectedCompany(null);
      await loadCompanies();
      showToast('success', 'Compagnie supprimée');
    } catch {
      showToast('error', 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompany) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `logos/${selectedCompany.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('company-documents').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('company-documents').getPublicUrl(path);
      const logoUrl = urlData.publicUrl;
      const { error: updateError } = await supabase.from('insurance_companies')
        .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
        .eq('id', selectedCompany.id);
      if (updateError) throw updateError;
      setEditForm(prev => ({ ...prev, logo_url: logoUrl }));
      setSelectedCompany(prev => prev ? { ...prev, logo_url: logoUrl } : prev);
      setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? { ...c, logo_url: logoUrl } : c));
      showToast('success', 'Logo mis à jour');
    } catch {
      showToast('error', "Erreur lors de l'upload du logo");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, section: typeof DOC_SECTIONS[0]) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompany) return;
    setUploadingDoc(section.key);
    try {
      const path = `${selectedCompany.id}/${section.key}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('company-documents').upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('company-documents').getPublicUrl(path);
      await supabase.from('company_documents').insert([{
        company_id: selectedCompany.id,
        document_name: file.name.replace(/\.[^.]+$/, ''),
        document_type: section.key,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        is_mandatory: true,
        send_with_quote: section.key === 'quote',
        send_with_contract: section.key === 'contract',
        send_with_claim: section.key === 'claim',
        display_order: documents.filter(d => d[section.field]).length + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
      await loadDocuments(selectedCompany.id);
      showToast('success', `Document "${file.name}" ajouté`);
    } catch (err: any) {
      showToast('error', err?.message || "Erreur lors de l'upload");
    } finally {
      setUploadingDoc(null);
      if (docInputRefs.current[section.key]) docInputRefs.current[section.key]!.value = '';
    }
  };

  const handleDeleteDocument = async (doc: CompanyDocument) => {
    if (!confirm(`Supprimer "${doc.document_name}" ?`)) return;
    try {
      const urlParts = doc.file_url.split('/company-documents/');
      if (urlParts[1]) await supabase.storage.from('company-documents').remove([urlParts[1]]);
      await supabase.from('company_documents').delete().eq('id', doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      showToast('success', 'Document supprimé');
    } catch {
      showToast('error', 'Erreur lors de la suppression');
    }
  };

  const handleToggleDocFlag = async (doc: CompanyDocument, field: 'send_with_quote' | 'send_with_contract' | 'send_with_claim' | 'is_mandatory') => {
    try {
      await supabase.from('company_documents').update({ [field]: !doc[field] }).eq('id', doc.id);
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, [field]: !doc[field] } : d));
    } catch {
      showToast('error', 'Erreur lors de la mise à jour');
    }
  };

  const handleNewCompany = () => {
    setIsNewCompany(true);
    setSelectedCompany(null);
    setDocuments([]);
    setEditForm({ name: '', code: '', is_active: true, is_mandatory: false, workflow_type: 'grossiste', priority_order: companies.length + 1 });
    setActiveTab('settings');
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / 1048576).toFixed(1)} Mo`;
  };

  const activeCount = companies.filter(c => c.is_active).length;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <NavigationMenu />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-medium ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center gap-3 px-6 pt-6 pb-4">
              <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Supprimer la compagnie</h3>
                <p className="text-sm text-gray-500 mt-0.5">Cette action est irréversible</p>
              </div>
            </div>
            <div className="px-6 pb-5">
              <p className="text-sm text-gray-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                Vous allez supprimer <span className="font-semibold text-gray-900">{selectedCompany.name}</span>{' '}
                ainsi que tous ses documents associés. Cette action ne peut pas être annulée.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteCompany}
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar compagnies ── */}
        <div className="w-72 flex-shrink-0 flex flex-col bg-white border-r border-gray-200 shadow-sm">
          {/* Header sidebar */}
          <div className="p-5 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center shadow-sm">
                  <Building2 className="text-white" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <h2 className="text-gray-900 font-bold text-sm leading-tight">Compagnies</h2>
                  <p className="text-gray-500 text-xs">d'assurance</p>
                </div>
              </div>
              <button
                onClick={handleNewCompany}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouvelle
              </button>
            </div>
            {/* Stats strip */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-center">
                <div className="text-lg font-bold text-emerald-700 leading-tight">{activeCount}</div>
                <div className="text-xs text-emerald-600 font-medium">Actives</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-center">
                <div className="text-lg font-bold text-gray-700 leading-tight">{companies.length}</div>
                <div className="text-xs text-gray-500 font-medium">Total</div>
              </div>
            </div>
          </div>

          {/* Liste des compagnies */}
          <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-7 h-7 text-sky-500 animate-spin" />
                  <p className="text-gray-500 text-xs">Chargement...</p>
                </div>
              </div>
            ) : (
              companies.map(company => {
                const isSelected = !isNewCompany && selectedCompany?.id === company.id;
                const gradient = getCompanyGradient(company.name);
                return (
                  <button
                    key={company.id}
                    onClick={() => { setSelectedCompany(company); setIsNewCompany(false); setActiveTab('settings'); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${
                      isSelected
                        ? 'bg-sky-50 border border-sky-200 shadow-sm'
                        : 'hover:bg-gray-50 border border-transparent hover:border-gray-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border ${
                      isSelected ? 'border-sky-200' : 'border-gray-200'
                    } bg-white shadow-sm`}>
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain p-1.5" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                          <span className="text-white font-bold text-sm">{company.name[0]}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold truncate ${isSelected ? 'text-sky-700' : 'text-gray-800 group-hover:text-gray-900'}`}>
                        {company.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          company.is_active ? 'text-emerald-600' : 'text-gray-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${company.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          {company.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {company.is_mandatory && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                            <Star className="w-2.5 h-2.5 fill-amber-500" />
                            Défaut
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-all ${isSelected ? 'text-sky-500' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Panneau principal ── */}
        {(selectedCompany || isNewCompany) ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
            {/* Header compagnie */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
              <div className="px-8 pt-6 pb-0">
                <div className="flex items-start gap-5">
                  {/* Logo */}
                  <div
                    className={`relative w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer group flex-shrink-0 shadow-md border-2 ${
                      editForm.logo_url ? 'bg-white border-gray-200' : `bg-gradient-to-br ${getCompanyGradient(editForm.name || 'A')} border-transparent`
                    }`}
                    onClick={() => !isNewCompany && logoInputRef.current?.click()}
                  >
                    {editForm.logo_url ? (
                      <img src={editForm.logo_url} alt={editForm.name} className="w-full h-full object-contain p-2" />
                    ) : (
                      <span className="text-white font-black text-3xl">
                        {(editForm.name || 'N')[0]}
                      </span>
                    )}
                    {!isNewCompany && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-1">
                        {uploadingLogo
                          ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                          : <>
                              <ImagePlus className="w-6 h-6 text-white" />
                              <span className="text-white text-xs font-medium">Changer</span>
                            </>
                        }
                      </div>
                    )}
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </div>

                  {/* Info compagnie */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                        {editForm.name || 'Nouvelle compagnie'}
                      </h1>
                      {editForm.code && (
                        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-mono font-bold border border-gray-300">
                          {editForm.code}
                        </span>
                      )}
                      {!isNewCompany && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          editForm.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border-gray-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${editForm.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {editForm.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                      {editForm.is_mandatory && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Star className="w-3 h-3 fill-amber-500" />
                          Obligatoire
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      {editForm.workflow_type && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                          <Zap className="w-3.5 h-3.5 text-sky-500" />
                          {WORKFLOW_TYPES.find(w => w.value === editForm.workflow_type)?.label}
                        </span>
                      )}
                      {documents.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                          <FileText className="w-3.5 h-3.5 text-gray-400" />
                          {documents.length} document{documents.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete button (existing companies only) */}
                  {!isNewCompany && selectedCompany && (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-2 px-4 py-3 bg-white hover:bg-red-50 border border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 rounded-xl font-semibold text-sm transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  )}

                  {/* Save button */}
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="flex items-center gap-2.5 px-6 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors shadow-sm flex-shrink-0"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Enregistrer
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-0 mt-5 -mb-px">
                  {[
                    { id: 'settings', label: 'Paramètres', icon: Settings },
                    { id: 'documents', label: 'Documents', icon: FileText, count: documents.length },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      disabled={isNewCompany && tab.id === 'documents'}
                      className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed border-b-2 ${
                        activeTab === tab.id
                          ? 'text-sky-600 border-sky-600 bg-gray-50'
                          : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                      {'count' in tab && tab.count! > 0 && (
                        <span className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center leading-none ${
                          activeTab === tab.id ? 'bg-sky-100 text-sky-600' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Contenu tabs */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'settings' && (
                <SettingsPanel editForm={editForm} setEditForm={setEditForm} />
              )}
              {activeTab === 'documents' && selectedCompany && (
                <DocumentsPanel
                  documents={documents}
                  uploadingDoc={uploadingDoc}
                  docInputRefs={docInputRefs}
                  onUpload={handleDocumentUpload}
                  onDelete={handleDeleteDocument}
                  onToggle={handleToggleDocFlag}
                  formatFileSize={formatFileSize}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-24 h-24 rounded-3xl bg-white border-2 border-gray-200 flex items-center justify-center mx-auto mb-5 shadow-sm">
                <Building2 className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-gray-600 text-lg font-medium">Sélectionnez une compagnie</p>
              <p className="text-gray-400 text-sm mt-1">ou créez-en une nouvelle</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Settings Panel ── */
const SettingsPanel: React.FC<{
  editForm: Partial<Company>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<Company>>>;
}> = ({ editForm, setEditForm }) => {
  const field = (key: keyof Company) => ({
    value: (editForm[key] as string) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setEditForm(prev => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <div className="p-8 max-w-3xl space-y-5">
      {/* Section Identité */}
      <SectionCard title="Identité" icon={Building2} accentColor="sky" description="Informations générales de la compagnie">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nom de la compagnie" required>
            <Input type="text" {...field('name')} placeholder="Ex: Generali" />
          </FormField>
          <FormField label="Code interne" required>
            <Input type="text" {...field('code')} placeholder="Ex: GENERALI" mono />
          </FormField>
        </div>
        <FormField label="Type de workflow">
          <select
            value={editForm.workflow_type ?? 'grossiste'}
            onChange={e => setEditForm(prev => ({ ...prev, workflow_type: e.target.value }))}
            className={selectCls}
          >
            {WORKFLOW_TYPES.map(w => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Description">
          <textarea {...field('description')} rows={3} placeholder="Extensions couvertes, services, notes..." className={inputCls} />
        </FormField>
        <div className="flex items-center gap-8 pt-1">
          <Toggle
            label="Compagnie active"
            checked={!!editForm.is_active}
            onChange={v => setEditForm(prev => ({ ...prev, is_active: v }))}
            color="green"
          />
          <Toggle
            label="Proposée par défaut"
            checked={!!editForm.is_mandatory}
            onChange={v => setEditForm(prev => ({ ...prev, is_mandatory: v }))}
            color="amber"
          />
        </div>
        <FormField label="Ordre d'affichage">
          <input
            type="number" min={0}
            value={editForm.priority_order ?? 0}
            onChange={e => setEditForm(prev => ({ ...prev, priority_order: parseInt(e.target.value) || 0 }))}
            className={inputCls + ' w-28'}
          />
        </FormField>
      </SectionCard>

      {/* Section Contacts */}
      <SectionCard title="Contacts" icon={Phone} accentColor="emerald" description="Coordonnées de la compagnie">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email souscription / gestion">
            <Input type="email" {...field('contact_email')} placeholder="production@compagnie.fr" icon={<Mail className="w-4 h-4 text-gray-400" />} />
          </FormField>
          <FormField label="Téléphone principal">
            <Input type="tel" {...field('contact_phone')} placeholder="01 40 22 78 00" icon={<Phone className="w-4 h-4 text-gray-400" />} />
          </FormField>
          <FormField label="Téléphone sinistres">
            <Input type="tel" {...field('claims_phone')} placeholder="01 XX XX XX XX" icon={<AlertCircle className="w-4 h-4 text-gray-400" />} />
          </FormField>
          <FormField label="Téléphone assistance">
            <Input type="tel" {...field('assistance_phone')} placeholder="01 XX XX XX XX" icon={<Shield className="w-4 h-4 text-gray-400" />} />
          </FormField>
        </div>
        <FormField label="Horaires d'ouverture">
          <Input type="text" {...field('contact_hours')} placeholder="Lundi-Vendredi 9h-12h30 et 13h30-17h30" icon={<Clock className="w-4 h-4 text-gray-400" />} />
        </FormField>
      </SectionCard>

      {/* Section Liens */}
      <SectionCard title="Liens & accès" icon={Globe} accentColor="amber" description="Portails web et extranet courtier">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Site web">
            <Input type="url" {...field('website')} placeholder="https://www.compagnie.fr" icon={<Globe className="w-4 h-4 text-gray-400" />} />
          </FormField>
          <FormField label="Extranet courtier">
            <Input type="url" {...field('extranet_url')} placeholder="https://extranet.compagnie.fr" icon={<ExternalLink className="w-4 h-4 text-gray-400" />} />
          </FormField>
        </div>
      </SectionCard>
    </div>
  );
};

/* ── Documents Panel ── */
const DocumentsPanel: React.FC<{
  documents: CompanyDocument[];
  uploadingDoc: string | null;
  docInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, section: typeof DOC_SECTIONS[0]) => void;
  onDelete: (doc: CompanyDocument) => void;
  onToggle: (doc: CompanyDocument, field: 'send_with_quote' | 'send_with_contract' | 'send_with_claim' | 'is_mandatory') => void;
  formatFileSize: (bytes: number | null) => string;
}> = ({ documents, uploadingDoc, docInputRefs, onUpload, onDelete, onToggle, formatFileSize }) => {
  const sectionStyles: Record<string, { card: string; header: string; badge: string; btn: string; accent: string; empty: string }> = {
    blue: {
      card: 'border-sky-200',
      header: 'bg-sky-50 border-sky-200',
      badge: 'bg-sky-100 text-sky-700 border-sky-200',
      btn: 'bg-sky-600 hover:bg-sky-700',
      accent: 'bg-sky-500',
      empty: 'bg-sky-50',
    },
    emerald: {
      card: 'border-emerald-200',
      header: 'bg-emerald-50 border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      btn: 'bg-emerald-600 hover:bg-emerald-700',
      accent: 'bg-emerald-500',
      empty: 'bg-emerald-50',
    },
    amber: {
      card: 'border-amber-200',
      header: 'bg-amber-50 border-amber-200',
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
      btn: 'bg-amber-600 hover:bg-amber-700',
      accent: 'bg-amber-500',
      empty: 'bg-amber-50',
    },
  };

  return (
    <div className="p-8 max-w-4xl space-y-5">
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          Les documents ajoutés sont automatiquement joints aux emails envoyés selon leur type.{' '}
          <span className="text-blue-600">Formats acceptés : PDF, DOCX, images.</span>
        </p>
      </div>

      {DOC_SECTIONS.map(section => {
        const s = sectionStyles[section.color];
        const sectionDocs = documents.filter(d => d[section.field]);
        const SectionIcon = section.icon;
        return (
          <div key={section.key} className={`rounded-2xl border overflow-hidden bg-white shadow-sm ${s.card}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${s.header}`}>
              <div className="flex items-center gap-3">
                <div className={`w-1.5 h-8 rounded-full ${s.accent}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <SectionIcon className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-900 font-bold text-sm">Documents {section.label}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>
                      {sectionDocs.length}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{section.desc}</p>
                </div>
              </div>
              <label className={`flex items-center gap-2 px-4 py-2 ${s.btn} text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm`}>
                {uploadingDoc === section.key
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Upload...</>
                  : <><Upload className="w-3.5 h-3.5" /> Ajouter un document</>
                }
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  ref={el => { docInputRefs.current[section.key] = el; }}
                  onChange={e => onUpload(e, section)}
                  disabled={uploadingDoc === section.key}
                />
              </label>
            </div>

            <div className="divide-y divide-gray-100">
              {sectionDocs.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className={`w-12 h-12 rounded-2xl ${s.empty} border border-gray-200 flex items-center justify-center mx-auto mb-3`}>
                    <FileText className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">Aucun document {section.label.toLowerCase()}</p>
                  <p className="text-gray-400 text-xs mt-1">Cliquez sur "Ajouter" pour uploader</p>
                </div>
              ) : (
                sectionDocs.map(doc => (
                  <div key={doc.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 text-sm font-semibold truncate">{doc.document_name}</div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        {doc.file_size && <span className="font-medium">{formatFileSize(doc.file_size)}</span>}
                        {doc.version && <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono border border-gray-200">v{doc.version}</span>}
                        {doc.valid_until && (
                          <span className="text-amber-600 font-medium">
                            Expire {new Date(doc.valid_until).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                        <span>{new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MiniToggle label="Obligatoire" checked={doc.is_mandatory} onChange={() => onToggle(doc, 'is_mandatory')} />
                      <a href={doc.file_url} target="_blank" rel="noreferrer"
                        className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors" title="Aperçu">
                        <Eye className="w-4 h-4" />
                      </a>
                      <a href={doc.file_url} download={doc.document_name}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Télécharger">
                        <Download className="w-4 h-4" />
                      </a>
                      <button onClick={() => onDelete(doc)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}

      {/* Autres documents */}
      {documents.filter(d => !d.send_with_quote && !d.send_with_contract && !d.send_with_claim).length > 0 && (
        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-gray-800 font-semibold text-sm">Autres documents</span>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full font-medium">
              {documents.filter(d => !d.send_with_quote && !d.send_with_contract && !d.send_with_claim).length}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {documents.filter(d => !d.send_with_quote && !d.send_with_contract && !d.send_with_claim).map(doc => (
              <div key={doc.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 text-sm text-gray-800 truncate font-medium">{doc.document_name}</div>
                <div className="flex items-center gap-1.5">
                  <MiniToggle label="Devis" checked={doc.send_with_quote} onChange={() => onToggle(doc, 'send_with_quote')} />
                  <MiniToggle label="Contrat" checked={doc.send_with_contract} onChange={() => onToggle(doc, 'send_with_contract')} />
                  <MiniToggle label="Sinistre" checked={doc.send_with_claim} onChange={() => onToggle(doc, 'send_with_claim')} />
                  <button onClick={() => onDelete(doc)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Sub-components ── */
const ACCENT_COLORS: Record<string, { iconBg: string; iconText: string }> = {
  sky:     { iconBg: 'bg-sky-100',     iconText: 'text-sky-600' },
  emerald: { iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
  amber:   { iconBg: 'bg-amber-100',   iconText: 'text-amber-600' },
};

const SectionCard: React.FC<{
  title: string;
  icon: React.ComponentType<any>;
  accentColor: 'sky' | 'emerald' | 'amber';
  description: string;
  children: React.ReactNode;
}> = ({ title, icon: Icon, accentColor, description, children }) => {
  const c = ACCENT_COLORS[accentColor];
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/60">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${c.iconBg}`}>
          <Icon className={`w-4 h-4 ${c.iconText}`} />
        </div>
        <div>
          <h3 className="text-gray-900 font-bold text-sm">{title}</h3>
          <p className="text-gray-500 text-xs">{description}</p>
        </div>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
};

const inputCls = 'w-full bg-white border border-gray-300 text-gray-900 placeholder-gray-400 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all hover:border-gray-400';
const selectCls = 'w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all hover:border-gray-400 cursor-pointer';

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode; mono?: boolean }> = ({ icon, mono, className, ...props }) => (
  <div className="relative">
    {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</div>}
    <input
      {...props}
      className={`${inputCls} ${icon ? 'pl-9' : ''} ${mono ? 'font-mono' : ''} ${className || ''}`}
    />
  </div>
);

const FormField: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
      {label}{required && <span className="text-sky-600 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; color?: string }> = ({ label, checked, onChange, color = 'blue' }) => {
  const colors: Record<string, string> = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    blue:  'bg-sky-500',
  };
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none group">
      <div
        className={`relative w-11 h-6 rounded-full transition-all duration-200 ${checked ? colors[color] : 'bg-gray-300'}`}
        onClick={() => onChange(!checked)}
      >
        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
      </div>
      <span className={`text-sm font-medium transition-colors ${checked ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'}`}>{label}</span>
    </label>
  );
};

const MiniToggle: React.FC<{ label: string; checked: boolean; onChange: () => void }> = ({ label, checked, onChange }) => (
  <button
    onClick={onChange}
    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
      checked
        ? 'bg-sky-100 text-sky-700 border-sky-300'
        : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400 hover:text-gray-700'
    }`}
  >
    {label}
  </button>
);

export default InsuranceCompaniesManager;
