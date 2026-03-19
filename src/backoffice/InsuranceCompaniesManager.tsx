import React, { useEffect, useState, useRef } from 'react';
import { Building2, Plus, Save, Upload, Trash2, FileText, Phone, Mail, Globe, ExternalLink, Clock, CheckCircle, XCircle, AlertCircle, Download, Eye, CreditCard as Edit3, X, ChevronRight, Shield, Loader2, ImagePlus } from 'lucide-react';
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
  { key: 'quote', label: 'Devis', field: 'send_with_quote' as const, color: 'blue', desc: 'Envoyés avec les emails de proposition de devis' },
  { key: 'contract', label: 'Contrat', field: 'send_with_contract' as const, color: 'green', desc: 'Envoyés avec les emails de contrat / mise en garantie' },
  { key: 'claim', label: 'Sinistre', field: 'send_with_claim' as const, color: 'amber', desc: 'Envoyés avec les emails de déclaration sinistre' },
];

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
  const logoInputRef = useRef<HTMLInputElement>(null);
  const docInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    loadCompanies();
  }, []);

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
      if (list.length > 0 && !selectedCompany) {
        setSelectedCompany(list[0]);
      }
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
    if (!editForm.name || !editForm.code) {
      showToast('error', 'Nom et code obligatoires');
      return;
    }
    setSaving(true);
    try {
      if (isNewCompany) {
        const { data, error } = await supabase
          .from('insurance_companies')
          .insert([{ ...editForm, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
          .select()
          .single();
        if (error) throw error;
        setIsNewCompany(false);
        await loadCompanies();
        setSelectedCompany(data);
        showToast('success', 'Compagnie créée avec succès');
      } else if (selectedCompany) {
        const { error } = await supabase
          .from('insurance_companies')
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompany) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `logos/${selectedCompany.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('company-documents')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('company-documents').getPublicUrl(path);
      const logoUrl = urlData.publicUrl;
      const { error: updateError } = await supabase
        .from('insurance_companies')
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
      const ext = file.name.split('.').pop();
      const path = `${selectedCompany.id}/${section.key}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('company-documents')
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('company-documents').getPublicUrl(path);
      const fileUrl = urlData.publicUrl;
      const docPayload = {
        company_id: selectedCompany.id,
        document_name: file.name.replace(/\.[^.]+$/, ''),
        document_type: section.key,
        file_url: fileUrl,
        file_size: file.size,
        mime_type: file.type,
        is_mandatory: true,
        send_with_quote: section.key === 'quote',
        send_with_contract: section.key === 'contract',
        send_with_claim: section.key === 'claim',
        display_order: documents.filter(d => d[section.field]).length + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error: insertError } = await supabase
        .from('company_documents')
        .insert([docPayload]);
      if (insertError) throw insertError;
      await loadDocuments(selectedCompany.id);
      showToast('success', `Document "${file.name}" ajouté`);
    } catch (err: any) {
      showToast('error', err?.message || "Erreur lors de l'upload");
    } finally {
      setUploadingDoc(null);
      if (docInputRefs.current[section.key]) {
        docInputRefs.current[section.key]!.value = '';
      }
    }
  };

  const handleDeleteDocument = async (doc: CompanyDocument) => {
    if (!confirm(`Supprimer "${doc.document_name}" ?`)) return;
    try {
      const urlParts = doc.file_url.split('/company-documents/');
      if (urlParts[1]) {
        await supabase.storage.from('company-documents').remove([urlParts[1]]);
      }
      await supabase.from('company_documents').delete().eq('id', doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      showToast('success', 'Document supprimé');
    } catch {
      showToast('error', 'Erreur lors de la suppression');
    }
  };

  const handleToggleDocFlag = async (doc: CompanyDocument, field: 'send_with_quote' | 'send_with_contract' | 'send_with_claim' | 'is_mandatory') => {
    const newVal = !doc[field];
    try {
      await supabase.from('company_documents').update({ [field]: newVal }).eq('id', doc.id);
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, [field]: newVal } : d));
    } catch {
      showToast('error', 'Erreur lors de la mise à jour');
    }
  };

  const handleNewCompany = () => {
    setIsNewCompany(true);
    setSelectedCompany(null);
    setDocuments([]);
    setEditForm({
      name: '',
      code: '',
      is_active: true,
      is_mandatory: false,
      workflow_type: 'grossiste',
      priority_order: companies.length + 1,
    });
    setActiveTab('settings');
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / 1048576).toFixed(1)} Mo`;
  };

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <NavigationMenu />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-white text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar compagnies */}
        <div className="w-72 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <h2 className="text-white font-semibold text-sm">Compagnies</h2>
              </div>
              <button
                onClick={handleNewCompany}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouvelle
              </button>
            </div>
            <div className="text-xs text-gray-400">{companies.filter(c => c.is_active).length} active{companies.filter(c => c.is_active).length > 1 ? 's' : ''} sur {companies.length}</div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {companies.map(company => {
                  const isSelected = !isNewCompany && selectedCompany?.id === company.id;
                  return (
                    <button
                      key={company.id}
                      onClick={() => { setSelectedCompany(company); setIsNewCompany(false); setActiveTab('settings'); }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${
                        isSelected
                          ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                          : 'hover:bg-gray-800 border border-transparent text-gray-300 hover:text-white'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {company.logo_url ? (
                          <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain p-1" />
                        ) : (
                          <Building2 className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{company.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${company.is_active ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                          <span className="text-xs text-gray-400">{company.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                      {isSelected && <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Panneau principal */}
        {(selectedCompany || isNewCompany) ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header compagnie */}
            <div className="bg-gray-900 border-b border-gray-800 px-8 py-5">
              <div className="flex items-center gap-5">
                <div
                  className="relative w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden cursor-pointer group border border-gray-700"
                  onClick={() => !isNewCompany && logoInputRef.current?.click()}
                >
                  {editForm.logo_url ? (
                    <img src={editForm.logo_url} alt={editForm.name} className="w-full h-full object-contain p-2" />
                  ) : (
                    <Building2 className="w-7 h-7 text-gray-400" />
                  )}
                  {!isNewCompany && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {uploadingLogo ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <ImagePlus className="w-5 h-5 text-white" />}
                    </div>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white">{editForm.name || 'Nouvelle compagnie'}</h1>
                    {!isNewCompany && (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        editForm.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-700 text-gray-400'
                      }`}>
                        {editForm.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                    {editForm.is_mandatory && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Obligatoire
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400 text-sm mt-0.5">
                    {editForm.code && <span className="font-mono text-xs bg-gray-800 px-2 py-0.5 rounded mr-2">{editForm.code}</span>}
                    {editForm.workflow_type && <span className="text-gray-400">{WORKFLOW_TYPES.find(w => w.value === editForm.workflow_type)?.label}</span>}
                  </div>
                </div>
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl font-medium text-sm transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-5">
                {[
                  { id: 'settings', label: 'Paramètres', icon: Edit3 },
                  { id: 'documents', label: 'Documents', icon: FileText, count: documents.length },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    disabled={isNewCompany && tab.id === 'documents'}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      activeTab === tab.id
                        ? 'bg-white/10 text-white border border-white/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {'count' in tab && tab.count! > 0 && (
                      <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenu des tabs */}
            <div className="flex-1 overflow-y-auto p-8">
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
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Sélectionnez une compagnie</p>
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
    <div className="max-w-3xl space-y-8">
      {/* Identité */}
      <Section title="Identité" icon={Building2}>
        <div className="grid grid-cols-2 gap-5">
          <FormField label="Nom de la compagnie *">
            <input type="text" {...field('name')} placeholder="Ex: Generali" className={inputCls} />
          </FormField>
          <FormField label="Code interne *">
            <input type="text" {...field('code')} placeholder="Ex: GENERALI" className={inputCls} />
          </FormField>
        </div>
        <FormField label="Type de workflow">
          <select
            value={editForm.workflow_type ?? 'grossiste'}
            onChange={e => setEditForm(prev => ({ ...prev, workflow_type: e.target.value }))}
            className={inputCls}
          >
            {WORKFLOW_TYPES.map(w => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Description">
          <textarea {...field('description')} rows={3} placeholder="Description de la compagnie, extensions, services..." className={inputCls} />
        </FormField>
        <div className="flex items-center gap-6">
          <Toggle
            label="Compagnie active"
            checked={!!editForm.is_active}
            onChange={v => setEditForm(prev => ({ ...prev, is_active: v }))}
            color="green"
          />
          <Toggle
            label="Obligatoire (proposée par défaut)"
            checked={!!editForm.is_mandatory}
            onChange={v => setEditForm(prev => ({ ...prev, is_mandatory: v }))}
            color="amber"
          />
        </div>
        <FormField label="Ordre d'affichage">
          <input type="number" min={0} value={editForm.priority_order ?? 0}
            onChange={e => setEditForm(prev => ({ ...prev, priority_order: parseInt(e.target.value) || 0 }))}
            className={inputCls + ' w-28'} />
        </FormField>
      </Section>

      {/* Contacts */}
      <Section title="Contacts" icon={Phone}>
        <div className="grid grid-cols-2 gap-5">
          <FormField label="Email souscription / gestion">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="email" {...field('contact_email')} placeholder="productioniard@compagnie.fr" className={inputCls + ' pl-9'} />
            </div>
          </FormField>
          <FormField label="Téléphone principal">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="tel" {...field('contact_phone')} placeholder="01 XX XX XX XX" className={inputCls + ' pl-9'} />
            </div>
          </FormField>
          <FormField label="Téléphone sinistres">
            <div className="relative">
              <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="tel" {...field('claims_phone')} placeholder="01 XX XX XX XX" className={inputCls + ' pl-9'} />
            </div>
          </FormField>
          <FormField label="Téléphone assistance">
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="tel" {...field('assistance_phone')} placeholder="01 XX XX XX XX" className={inputCls + ' pl-9'} />
            </div>
          </FormField>
        </div>
        <FormField label="Horaires d'ouverture">
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" {...field('contact_hours')} placeholder="Lundi-Vendredi 9h-12h30 et 13h30-17h30" className={inputCls + ' pl-9'} />
          </div>
        </FormField>
      </Section>

      {/* Liens */}
      <Section title="Liens & accès" icon={Globe}>
        <div className="grid grid-cols-2 gap-5">
          <FormField label="Site web">
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="url" {...field('website')} placeholder="https://www.compagnie.fr" className={inputCls + ' pl-9'} />
            </div>
          </FormField>
          <FormField label="Extranet courtier">
            <div className="relative">
              <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="url" {...field('extranet_url')} placeholder="https://extranet.compagnie.fr" className={inputCls + ' pl-9'} />
            </div>
          </FormField>
        </div>
      </Section>
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
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    green: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  };
  const uploadBtnMap: Record<string, string> = {
    blue: 'bg-blue-600 hover:bg-blue-500',
    green: 'bg-emerald-600 hover:bg-emerald-500',
    amber: 'bg-amber-600 hover:bg-amber-500',
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-gray-300">
          Les documents ajoutés ici sont automatiquement joints aux emails envoyés aux prospects selon le type (Devis, Contrat, Sinistre). Formats acceptés : PDF, DOCX, images.
        </p>
      </div>

      {DOC_SECTIONS.map(section => {
        const sectionDocs = documents.filter(d => d[section.field]);
        return (
          <div key={section.key} className={`border rounded-2xl overflow-hidden ${colorMap[section.color].replace('text-', 'border-').split(' ')[1]}`}>
            {/* Header de section */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${colorMap[section.color].split(' ').slice(0, 2).join(' ')} border-inherit`}>
              <div>
                <div className={`flex items-center gap-2 font-semibold ${colorMap[section.color].split(' ')[2]}`}>
                  <FileText className="w-4 h-4" />
                  Documents {section.label}
                  <span className="text-xs font-normal bg-black/20 px-2 py-0.5 rounded-full">{sectionDocs.length}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{section.desc}</p>
              </div>
              <label className={`flex items-center gap-2 px-4 py-2 ${uploadBtnMap[section.color]} text-white rounded-lg text-sm font-medium cursor-pointer transition-colors`}>
                {uploadingDoc === section.key ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Upload...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Ajouter</>
                )}
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

            {/* Liste des documents */}
            <div className="bg-gray-900/60 divide-y divide-gray-800">
              {sectionDocs.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <FileText className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Aucun document pour {section.label.toLowerCase()}</p>
                  <p className="text-gray-600 text-xs mt-1">Cliquez sur "Ajouter" pour uploader un document</p>
                </div>
              ) : (
                sectionDocs.map(doc => (
                  <div key={doc.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-800/40 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{doc.document_name}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                        {doc.version && <span>v{doc.version}</span>}
                        {doc.valid_until && <span>Expire {new Date(doc.valid_until).toLocaleDateString('fr-FR')}</span>}
                        <span className="text-gray-500">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <MiniToggle
                        label="Obligatoire"
                        checked={doc.is_mandatory}
                        onChange={() => onToggle(doc, 'is_mandatory')}
                      />
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Voir le document"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <a
                        href={doc.file_url}
                        download={doc.document_name}
                        className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => onDelete(doc)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Supprimer"
                      >
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

      {/* Documents sans catégorie (tous) */}
      {documents.filter(d => !d.send_with_quote && !d.send_with_contract && !d.send_with_claim).length > 0 && (
        <div className="border border-gray-700 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-700">
            <div className="text-gray-300 font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Autres documents
              <span className="text-xs text-gray-500">
                ({documents.filter(d => !d.send_with_quote && !d.send_with_contract && !d.send_with_claim).length})
              </span>
            </div>
          </div>
          <div className="bg-gray-900/60 divide-y divide-gray-800">
            {documents.filter(d => !d.send_with_quote && !d.send_with_contract && !d.send_with_claim).map(doc => (
              <div key={doc.id} className="px-6 py-4 flex items-center gap-4">
                <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div className="flex-1 text-sm text-gray-300 truncate">{doc.document_name}</div>
                <div className="flex items-center gap-1">
                  <MiniToggle label="Devis" checked={doc.send_with_quote} onChange={() => onToggle(doc, 'send_with_quote')} />
                  <MiniToggle label="Contrat" checked={doc.send_with_contract} onChange={() => onToggle(doc, 'send_with_contract')} />
                  <MiniToggle label="Sinistre" checked={doc.send_with_claim} onChange={() => onToggle(doc, 'send_with_claim')} />
                  <button onClick={() => onDelete(doc)} className="p-1.5 text-gray-500 hover:text-red-400 rounded transition-colors">
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

/* ── Helpers ── */
const inputCls = 'w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors';

const Section: React.FC<{ title: string; icon: React.ComponentType<any>; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
  <div>
    <div className="flex items-center gap-2 mb-5">
      <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
        <Icon className="w-4 h-4 text-blue-400" />
      </div>
      <h3 className="text-white font-semibold">{title}</h3>
    </div>
    <div className="space-y-4 pl-10">{children}</div>
  </div>
);

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
    {children}
  </div>
);

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; color?: string }> = ({ label, checked, onChange, color = 'blue' }) => {
  const colors: Record<string, string> = { green: 'bg-emerald-600', amber: 'bg-amber-500', blue: 'bg-blue-600' };
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <div
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? colors[color] : 'bg-gray-700'}`}
        onClick={() => onChange(!checked)}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </div>
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
};

const MiniToggle: React.FC<{ label: string; checked: boolean; onChange: () => void }> = ({ label, checked, onChange }) => (
  <button
    onClick={onChange}
    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
      checked
        ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
        : 'bg-gray-800 text-gray-500 border-gray-700 hover:border-gray-600'
    }`}
  >
    {label}
  </button>
);

export default InsuranceCompaniesManager;
