import React, { useState, useEffect, useRef } from 'react';
import { toast } from '@/lib/toast';
import { FileText, Upload, Send, Mail, MessageSquare, Phone, CheckCircle, Clock, Eye, Download, X, AlertCircle, Loader, CreditCard as Edit, RefreshCw, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CRMLead, PipelineStatus } from '@/lib/crm-pipeline';

interface QuoteTemplate {
  id: string;
  name: string;
  description: string;
  channel: 'email' | 'sms' | 'whatsapp';
  subject_template: string | null;
  body_template: string;
  variables: string[];
  tone: string;
}

interface InsuranceCompany {
  id: string;
  name: string;
  code: string;
  contact_email: string | null;
  contact_phone: string | null;
  description: string | null;
}

interface QuoteHistory {
  id: string;
  sent_via: string;
  sent_to: string;
  subject: string | null;
  lead_status_at_send: string;
  sent_at: string;
  status: string;
  opened_at: string | null;
  clicked_at: string | null;
  downloaded_at: string | null;
  insurance_company_id: string | null;
  insurance_company?: InsuranceCompany;
}

interface QuoteManagerProps {
  lead: CRMLead;
  onQuoteSent?: () => void;
  onStatusChange?: () => void;
}

const QuoteManager: React.FC<QuoteManagerProps> = ({ lead, onQuoteSent, onStatusChange }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'send' | 'history'>('upload');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedQuote, setUploadedQuote] = useState<any>(null);
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [history, setHistory] = useState<QuoteHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockingDocs, setBlockingDocs] = useState<any[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<InsuranceCompany | null>(null);

  useEffect(() => {
    loadTemplates();
    loadHistory();
    loadLatestQuote();
    checkQuoteLock();
    loadInsuranceCompanies();
  }, [lead.id]);

  const loadInsuranceCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_companies')
        .select('id, name, code, contact_email, contact_phone, description, logo_url')
        .eq('is_active', true)
        .order('priority_order');

      if (error) throw error;
      setInsuranceCompanies(data || []);
    } catch (err) {
      console.error('Error loading insurance companies:', err);
    }
  };

  const checkQuoteLock = async () => {
    try {
      const { data, error } = await supabase.rpc('check_document_locks', {
        p_lead_id: lead.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const lockInfo = data[0];
        setIsBlocked(!lockInfo.can_generate_quote);
        setBlockingDocs(lockInfo.blocking_docs || []);
      }
    } catch (err) {
      console.error('Error checking quote lock:', err);
    }
  };

  useEffect(() => {
    if (selectedTemplate) {
      renderTemplate(selectedTemplate);
    }
  }, [selectedTemplate]);

  const loadLatestQuote = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_lead_documents')
        .select('*')
        .eq('lead_id', lead.id)
        .eq('document_type', 'devis')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setUploadedQuote(data);
      }
    } catch (err) {
      console.error('Error loading quote:', err);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_quote_templates')
        .select('*')
        .eq('is_active', true)
        .order('priority');

      if (error) throw error;

      const filtered = (data as Array<{ applicable_status: string[]; channel: string; [key: string]: unknown }> || []).filter((t) =>
        t.applicable_status.includes(lead.status) &&
        (t.channel === selectedChannel || t.channel === 'all')
      );

      setTemplates(filtered);

      if (filtered.length > 0 && !selectedTemplate) {
        setSelectedTemplate(filtered[0]);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('crm_quote_history')
        .select(`
          *,
          insurance_company:insurance_companies(id, name, code, logo_url)
        `)
        .eq('lead_id', lead.id)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const renderTemplate = (template: QuoteTemplate) => {
    const variables: Record<string, any> = {
      first_name: lead.first_name || lead.full_name.split(' ')[0],
      last_name: lead.last_name || lead.full_name.split(' ').slice(1).join(' '),
      full_name: lead.full_name,
      email: lead.email,
      phone: lead.phone,
      city: lead.city || '',
      company_name: lead.company_name || ''
    };

    let subject = template.subject_template || '';
    let body = template.body_template;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, String(value || ''));
      body = body.replace(regex, String(value || ''));
    });

    setCustomSubject(subject);
    setCustomBody(body);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(selectedFile.type)) {
        toast.info('Format non valide. Utilisez PDF ou Word.');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.info('Fichier trop volumineux (max 10 MB)');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `${lead.id}-devis-${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `quotes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('crm-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('crm_lead_documents')
        .insert({
          lead_id: lead.id,
          document_type: 'devis',
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          status: 'validated',
          uploaded_by: 'admin'
        });

      if (dbError) throw dbError;

      toast.success('✅ Devis uploadé avec succès !');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadLatestQuote();
      setActiveTab('send');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSendQuote = async () => {
    if (isBlocked) {
      toast.error('Impossible d\'envoyer le devis : des documents complementaires sont requis.');
      return;
    }

    if (!selectedCompany) {
      toast.warning('Veuillez selectionner une compagnie d\'assurance !');
      return;
    }

    if (!uploadedQuote) {
      toast.info('Uploadez d\'abord un devis !');
      return;
    }

    if (!customBody.trim()) {
      toast.info('Le message ne peut pas etre vide !');
      return;
    }

    setSending(true);
    try {
      const recipient = selectedChannel === 'email' ? lead.email : lead.phone;

      const { error: historyError } = await supabase
        .from('crm_quote_history')
        .insert({
          lead_id: lead.id,
          document_id: uploadedQuote.id,
          template_id: selectedTemplate?.id,
          insurance_company_id: selectedCompany.id,
          sent_via: selectedChannel,
          sent_to: recipient,
          subject: selectedChannel === 'email' ? customSubject : null,
          body: customBody,
          lead_status_at_send: lead.status,
          status: 'sent'
        });

      if (historyError) throw historyError;

      const functionName = {
        email: 'send-crm-email',
        sms: 'send-sms',
        whatsapp: 'send-whatsapp'
      }[selectedChannel];

      const payload: Record<string, unknown> = {
        lead_id: lead.id,
        to: recipient,
        body: customBody
      };

      if (selectedChannel === 'email') {
        payload.subject = customSubject;
        payload.attachment_url = uploadedQuote.file_path;
      }

      const { error: sendError } = await supabase.functions.invoke(functionName, {
        body: payload
      });

      if (sendError) {
        console.error('Send error:', sendError);
      }

      if (lead.status !== 'QUOTE_SENT' && lead.status !== 'SIGNATURE_PENDING' && lead.status !== 'SIGNED' && lead.status !== 'ACTIVE_CLIENT') {
        const { error: statusError } = await supabase
          .from('crm_leads')
          .update({
            status: 'QUOTE_SENT',
            updated_at: new Date().toISOString()
          })
          .eq('id', lead.id);

        if (statusError) {
          console.error('Status update error:', statusError);
        } else {
          await supabase
            .from('crm_interactions')
            .insert({
              lead_id: lead.id,
              type: 'status_change',
              direction: 'outbound',
              channel: 'system',
              subject: 'Statut mis à jour automatiquement',
              content: `Statut passé à "Devis Envoyé" suite à l'envoi du devis par ${selectedChannel.toUpperCase()}`,
              metadata: {
                from_status: lead.status,
                to_status: 'QUOTE_SENT',
                reason: 'quote_sent'
              }
            });

          if (onStatusChange) onStatusChange();
        }
      }

      toast.success(`✅ Devis envoyé par ${selectedChannel.toUpperCase()} !`);
      await loadHistory();
      if (onQuoteSent) onQuoteSent();
      setActiveTab('history');
    } catch (err) {
      console.error('Send error:', err);
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Clock className="text-blue-500" size={16} />;
      case 'delivered': return <CheckCircle className="text-green-500" size={16} />;
      case 'opened': return <Eye className="text-purple-500" size={16} />;
      case 'clicked': return <Download className="text-orange-500" size={16} />;
      case 'downloaded': return <Download className="text-green-600" size={16} />;
      case 'replied': return <MessageSquare className="text-emerald-500" size={16} />;
      case 'failed': return <AlertCircle className="text-red-500" size={16} />;
      default: return <Clock className="text-gray-400" size={16} />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FileText className="text-orange-600" size={24} />
          Gestion des Devis
        </h3>
      </div>

      {isBlocked && (
        <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-red-800">Envoi de devis bloqué</p>
              <p className="text-sm text-red-700 mt-1">
                Des documents complémentaires sont requis avant de pouvoir générer/envoyer un devis.
              </p>
              {blockingDocs.length > 0 && (
                <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
                  {(blockingDocs as Array<{ titre: string }>).map((doc, idx: number) => (
                    <li key={idx}>{doc.titre}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 px-4 py-3 font-medium transition-colors ${
            activeTab === 'upload'
              ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Upload className="inline mr-2" size={18} />
          Upload Devis
        </button>
        <button
          onClick={() => setActiveTab('send')}
          className={`flex-1 px-4 py-3 font-medium transition-colors ${
            activeTab === 'send'
              ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
          disabled={!uploadedQuote}
        >
          <Send className="inline mr-2" size={18} />
          Envoyer
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-4 py-3 font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Clock className="inline mr-2" size={18} />
          Historique
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'upload' && (
          <div className="space-y-4">
            {uploadedQuote && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-600" size={24} />
                  <div>
                    <p className="font-semibold text-green-900">Devis actuel</p>
                    <p className="text-sm text-green-700">{uploadedQuote.file_name}</p>
                    <p className="text-xs text-green-600">
                      Uploadé le {new Date(uploadedQuote.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition-colors">
              <Upload className="mx-auto text-gray-400 mb-4" size={48} />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                {uploadedQuote ? 'Remplacer le devis' : 'Uploader un devis'}
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Formats acceptés : PDF, Word (max 10 MB)
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
                id="quote-file-input"
              />

              <label
                htmlFor="quote-file-input"
                className="inline-block px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer transition-colors"
              >
                Choisir un fichier
              </label>

              {file && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="text-blue-600" size={24} />
                      <div className="text-left">
                        <p className="font-medium text-blue-900">{file.name}</p>
                        <p className="text-sm text-blue-700">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="mt-4 w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader className="animate-spin" size={20} />
                        Upload en cours...
                      </>
                    ) : (
                      <>
                        <Upload size={20} />
                        Uploader le devis
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'send' && (
          <div className="space-y-6">
            {!uploadedQuote ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <AlertCircle className="mx-auto text-yellow-600 mb-2" size={32} />
                <p className="text-yellow-800">Uploadez d'abord un devis dans l'onglet "Upload Devis"</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Canal d'envoi
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => {
                        setSelectedChannel('email');
                        loadTemplates();
                      }}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedChannel === 'email'
                          ? 'border-orange-600 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <Mail className={`mx-auto mb-2 ${selectedChannel === 'email' ? 'text-orange-600' : 'text-gray-400'}`} size={24} />
                      <p className="text-sm font-medium">Email</p>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedChannel('sms');
                        loadTemplates();
                      }}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedChannel === 'sms'
                          ? 'border-orange-600 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <MessageSquare className={`mx-auto mb-2 ${selectedChannel === 'sms' ? 'text-orange-600' : 'text-gray-400'}`} size={24} />
                      <p className="text-sm font-medium">SMS</p>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedChannel('whatsapp');
                        loadTemplates();
                      }}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedChannel === 'whatsapp'
                          ? 'border-orange-600 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <Phone className={`mx-auto mb-2 ${selectedChannel === 'whatsapp' ? 'text-orange-600' : 'text-gray-400'}`} size={24} />
                      <p className="text-sm font-medium">WhatsApp</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Building2 className="inline mr-2" size={16} />
                    Compagnie d'assurance *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {insuranceCompanies.map(company => (
                      <button
                        key={company.id}
                        onClick={() => setSelectedCompany(company)}
                        className={`p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${
                          selectedCompany?.id === company.id
                            ? 'border-orange-600 bg-orange-50'
                            : 'border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        {(company as any).logo_url ? (
                          <img
                            src={(company as any).logo_url}
                            alt={`Logo ${company.name}`}
                            className="w-10 h-10 object-contain flex-shrink-0"
                          />
                        ) : (
                          <Building2 className="w-8 h-8 text-gray-400 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${selectedCompany?.id === company.id ? 'text-orange-700' : 'text-gray-700'}`}>
                            {company.name}
                          </p>
                          <p className="text-xs text-gray-500">{company.code}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {!selectedCompany && (
                    <p className="text-sm text-red-500 mt-2">Selectionnez une compagnie pour envoyer le devis</p>
                  )}
                </div>

                {templates.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Template (adapte au statut : {lead.status})
                    </label>
                    <select
                      value={selectedTemplate?.id || ''}
                      onChange={(e) => {
                        const template = templates.find(t => t.id === e.target.value);
                        setSelectedTemplate(template || null);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name} ({template.tone})
                        </option>
                      ))}
                    </select>
                    {selectedTemplate && (
                      <p className="text-sm text-gray-600 mt-1">{selectedTemplate.description}</p>
                    )}
                  </div>
                )}

                {selectedChannel === 'email' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Sujet
                    </label>
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Sujet de l'email..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    rows={selectedChannel === 'email' ? 10 : 6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
                    placeholder="Votre message..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Vous pouvez personnaliser le message avant l'envoi
                  </p>
                </div>

                <button
                  onClick={handleSendQuote}
                  disabled={sending || !customBody.trim()}
                  className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {sending ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      Envoyer le devis par {selectedChannel.toUpperCase()}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Historique des envois</h4>
              <button
                onClick={loadHistory}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Rafraîchir"
              >
                <RefreshCw size={18} className="text-gray-600" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="text-center py-8">
                <Loader className="animate-spin mx-auto text-gray-400" size={32} />
                <p className="text-gray-600 mt-2">Chargement...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Clock className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-gray-600">Aucun envoi pour le moment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon(item.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-gray-900">
                              {item.sent_via.toUpperCase()}
                            </span>
                            {item.insurance_company && (
                              <>
                                {(item.insurance_company as any).logo_url && (
                                  <img
                                    src={(item.insurance_company as any).logo_url}
                                    alt={`Logo ${item.insurance_company.name}`}
                                    className="w-6 h-6 object-contain"
                                  />
                                )}
                                <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-semibold">
                                  {item.insurance_company.name}
                                </span>
                              </>
                            )}
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                              {item.lead_status_at_send}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            A : <span className="font-medium">{item.sent_to}</span>
                          </p>
                          {item.subject && (
                            <p className="text-sm text-gray-700 mt-1">
                              Sujet : {item.subject}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(item.sent_at).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.status === 'failed' ? 'bg-red-100 text-red-700' :
                          item.status === 'replied' ? 'bg-green-100 text-green-700' :
                          item.status === 'opened' || item.status === 'downloaded' ? 'bg-purple-100 text-purple-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {item.status}
                        </span>
                        {item.opened_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Ouvert : {new Date(item.opened_at).toLocaleString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteManager;
