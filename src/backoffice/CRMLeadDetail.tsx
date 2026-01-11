import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Tag,
  TrendingUp,
  MessageSquare,
  FileText,
  Bot,
  ArrowRight,
  Edit,
  Save,
  X,
  Send,
  History,
  Upload,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  RefreshCw,
  Award
} from 'lucide-react';
import { pipelineService, CRMLead, PIPELINE_STATUSES } from '@/lib/crm-pipeline';
import { supabase } from '@/lib/supabase';
import QuoteManager from './QuoteManager';
import ElectronicSignature from '@/components/ElectronicSignature';

interface Message {
  id: string;
  type: 'email' | 'sms' | 'whatsapp' | 'note' | 'system';
  content: string;
  subject?: string;
  sent_at: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sent_by?: string;
}

const CRMLeadDetail: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();

  // États principaux
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<CRMLead | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // États pour les communications
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // États pour le formulaire d'édition
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    city: '',
    company_name: '',
    internal_notes: ''
  });

  // États pour les communications
  const [emailForm, setEmailForm] = useState({
    subject: '',
    body: '',
    template: ''
  });

  const [smsForm, setSmsForm] = useState({
    message: '',
  });

  // États pour la gestion des documents
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    documentType: 'carte_grise',
    file: null as File | null,
    notes: ''
  });

  // État pour demande avis Google
  const [sendingReview, setSendingReview] = useState(false);

  const [whatsappForm, setWhatsappForm] = useState({
    message: '',
    template: ''
  });

  // Templates prédéfinis
  const emailTemplates = [
    { id: 'welcome', name: 'Email de bienvenue', subject: 'Bienvenue chez TaxiAssur', body: 'Bonjour {{first_name}},\n\nNous sommes ravis de vous accueillir...' },
    { id: 'follow_up', name: 'Relance', subject: 'Votre demande de devis', body: 'Bonjour {{first_name}},\n\nNous revenons vers vous concernant...' },
    { id: 'quote', name: 'Envoi de devis', subject: 'Votre devis personnalisé', body: 'Bonjour {{first_name}},\n\nVeuillez trouver ci-joint votre devis...' },
    { id: 'documents', name: 'Demande documents', subject: 'Documents nécessaires', body: 'Bonjour {{first_name}},\n\nPour finaliser votre dossier...' }
  ];

  const smsTemplates = [
    { id: 'welcome', name: 'Bienvenue', message: 'Bonjour {{first_name}}, merci pour votre demande. Un conseiller vous contacte sous 24h. TaxiAssur' },
    { id: 'reminder', name: 'Rappel RDV', message: 'Rappel: RDV téléphonique aujourd\'hui à {{time}}. À tout de suite ! TaxiAssur' },
    { id: 'documents', name: 'Documents reçus', message: 'Documents bien reçus ! Nous traitons votre dossier. Réponse sous 48h. TaxiAssur' }
  ];

  const whatsappTemplates = [
    { id: 'welcome', name: 'Bienvenue', message: 'Bonjour {{first_name}} 👋\n\nMerci pour votre confiance ! Je suis votre conseiller dédié.\n\nComment puis-je vous aider ?' },
    { id: 'quote_ready', name: 'Devis prêt', message: 'Bonne nouvelle {{first_name}} ! 🎉\n\nVotre devis est prêt. Voulez-vous que je vous l\'envoie par email ?' },
    { id: 'follow_up', name: 'Suivi personnalisé', message: 'Bonjour {{first_name}},\n\nAvez-vous des questions sur votre devis ? Je suis là pour vous accompagner 🤝' }
  ];

  useEffect(() => {
    if (leadId) loadLeadData(leadId);
  }, [leadId]);

  const loadLeadData = async (id: string) => {
    setLoading(true);
    try {
      const leadData = await pipelineService.getLead(id);
      setLead(leadData);
      setEditForm({
        first_name: leadData.first_name || '',
        last_name: leadData.last_name || '',
        email: leadData.email || '',
        phone: leadData.phone || '',
        city: leadData.city || '',
        company_name: leadData.company_name || '',
        internal_notes: (leadData as any).internal_notes || ''
      });

      // Charger l'historique des messages
      await loadMessages(id);
      // Charger les documents
      await loadDocuments(id);
    } catch (error) {
      console.error('Failed to load lead:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les documents
  const loadDocuments = async (id: string) => {
    setLoadingDocuments(true);
    try {
      const { data, error } = await supabase
        .from('crm_lead_documents')
        .select('*')
        .eq('lead_id', id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Upload de document
  const handleDocumentUpload = async () => {
    if (!leadId || !uploadForm.file) {
      alert('Veuillez sélectionner un fichier');
      return;
    }

    setUploadingDocument(true);
    try {
      // 1. Upload du fichier dans Storage
      const fileExt = uploadForm.file.name.split('.').pop();
      const fileName = `${leadId}/${uploadForm.documentType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('crm-documents')
        .upload(fileName, uploadForm.file);

      if (uploadError) throw uploadError;

      // 2. Créer l'enregistrement en base
      const { error: dbError } = await supabase
        .from('crm_lead_documents')
        .insert({
          lead_id: leadId,
          document_type: uploadForm.documentType,
          file_name: uploadForm.file.name,
          file_path: fileName,
          file_size: uploadForm.file.size,
          mime_type: uploadForm.file.type,
          status: 'pending',
          notes: uploadForm.notes,
          uploaded_by: 'admin'
        });

      if (dbError) throw dbError;

      alert('✅ Document uploadé avec succès ! Email automatique envoyé au client.');
      setShowDocumentModal(false);
      setUploadForm({
        documentType: 'carte_grise',
        file: null,
        notes: ''
      });
      await loadDocuments(leadId);
    } catch (error) {
      console.error('Erreur upload:', error);
      alert('❌ Erreur lors de l\'upload: ' + (error as Error).message);
    } finally {
      setUploadingDocument(false);
    }
  };

  // Valider un document
  const handleValidateDocument = async (docId: string) => {
    try {
      const { error } = await supabase
        .from('crm_lead_documents')
        .update({
          status: 'validated',
          validated_by: 'admin',
          validated_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;

      alert('✅ Document validé !');
      if (leadId) await loadDocuments(leadId);
    } catch (error) {
      console.error('Erreur validation:', error);
      alert('❌ Erreur: ' + (error as Error).message);
    }
  };

  // Envoyer demande d'avis Google
  const handleSendReviewRequest = async () => {
    if (!lead?.email) {
      alert('Pas d\'email pour ce lead');
      return;
    }

    setSendingReview(true);
    try {
      const reviewUrl = 'https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review';

      // 1. Enregistrer la demande
      const { error: insertError } = await supabase
        .from('crm_review_requests')
        .insert({
          lead_id: leadId,
          request_type: 'google',
          sent_to: lead.email,
          sent_via: 'email',
          review_url: reviewUrl,
          status: 'sent'
        });

      if (insertError) throw insertError;

      // 2. Envoyer l'email (via edge function send-crm-email)
      const { error: emailError } = await supabase.functions.invoke('send-crm-email', {
        body: {
          to: lead.email,
          template: 'review_request',
          data: {
            first_name: lead.first_name,
            review_url: reviewUrl
          }
        }
      });

      if (emailError) throw emailError;

      alert('✅ Demande d\'avis Google envoyée !');
    } catch (error) {
      console.error('Erreur envoi avis:', error);
      alert('❌ Erreur: ' + (error as Error).message);
    } finally {
      setSendingReview(false);
    }
  };

  const loadMessages = async (leadId: string) => {
    setLoadingMessages(true);
    try {
      // Charger depuis crm_interactions
      const { data: interactions } = await supabase
        .from('crm_interactions')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      // Charger depuis email_messages
      const { data: emails } = await supabase
        .from('email_messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      const allMessages: Message[] = [];

      // Formater les interactions
      if (interactions) {
        interactions.forEach((interaction: any) => {
          allMessages.push({
            id: interaction.id,
            type: interaction.type || 'system',
            content: interaction.content || interaction.summary || 'Contenu non disponible',
            subject: interaction.subject || `${interaction.type} - ${interaction.direction}`,
            sent_at: interaction.created_at,
            status: interaction.status || interaction.metadata?.status || 'sent',
            sent_by: interaction.created_by || (interaction.direction === 'inbound' ? 'Client' : 'TaxiAssur')
          });
        });
      }

      // Formater les emails
      if (emails) {
        emails.forEach((email: any) => {
          const bodyText = email.body_text || '';
          const preview = bodyText.length > 300 ? bodyText.substring(0, 300) + '...' : bodyText;
          allMessages.push({
            id: email.id,
            type: 'email',
            content: preview,
            subject: email.subject,
            sent_at: email.received_at || email.sent_at || email.created_at,
            status: email.status === 'sent' ? 'sent' : email.is_read ? 'read' : 'delivered',
            sent_by: email.direction === 'inbound' ? email.from_name || email.from_email : 'TaxiAssur'
          });
        });
      }

      // Trier par date décroissante
      allMessages.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());

      setMessages(allMessages);
      console.log('✅ Messages chargés:', allMessages.length, '(interactions:', interactions?.length || 0, '+ emails:', emails?.length || 0, ')');
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          email: editForm.email,
          phone: editForm.phone,
          city: editForm.city,
          company_name: editForm.company_name,
          internal_notes: editForm.internal_notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      if (error) throw error;

      await loadLeadData(lead.id);
      setEditing(false);
      alert('✅ Modifications enregistrées !');
    } catch (error) {
      console.error('Save error:', error);
      alert('❌ Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!lead) return;

    try {
      // Remplacer les variables
      let body = emailForm.body;
      body = body.replace(/\{\{first_name\}\}/g, lead.first_name || '');
      body = body.replace(/\{\{last_name\}\}/g, lead.last_name || '');
      body = body.replace(/\{\{company_name\}\}/g, lead.company_name || '');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-crm-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to: lead.email,
          subject: emailForm.subject,
          body: body,
          lead_id: lead.id
        })
      });

      if (response.ok) {
        alert('✅ Email envoyé avec succès !');
        setShowEmailModal(false);
        setEmailForm({ subject: '', body: '', template: '' });
        await loadMessages(lead.id);
      } else {
        alert('❌ Erreur lors de l\'envoi');
      }
    } catch (error) {
      console.error('Email error:', error);
      alert('❌ Erreur lors de l\'envoi');
    }
  };

  const handleSendSMS = async () => {
    if (!lead) return;

    try {
      let message = smsForm.message;
      message = message.replace(/\{\{first_name\}\}/g, lead.first_name || '');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to: lead.phone,
          message: message,
          lead_id: lead.id
        })
      });

      if (response.ok) {
        alert('✅ SMS envoyé avec succès !');
        setShowSMSModal(false);
        setSmsForm({ message: '', template: '' });
        await loadMessages(lead.id);
      } else {
        alert('❌ Erreur lors de l\'envoi');
      }
    } catch (error) {
      console.error('SMS error:', error);
      alert('❌ Erreur lors de l\'envoi');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!lead) return;

    try {
      let message = whatsappForm.message;
      message = message.replace(/\{\{first_name\}\}/g, lead.first_name || '');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to: lead.phone,
          message: message,
          lead_id: lead.id
        })
      });

      if (response.ok) {
        alert('✅ WhatsApp envoyé avec succès !');
        setShowWhatsAppModal(false);
        setWhatsappForm({ message: '', template: '' });
        await loadMessages(lead.id);
      } else {
        alert('❌ Erreur lors de l\'envoi');
      }
    } catch (error) {
      console.error('WhatsApp error:', error);
      alert('❌ Erreur lors de l\'envoi');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!lead) return;

    try {
      await pipelineService.updateLeadStatus(lead.id, newStatus as any);
      await loadLeadData(lead.id);
      alert('✅ Statut mis à jour !');
    } catch (error) {
      console.error('Status change error:', error);
      alert('❌ Erreur lors de la mise à jour');
    }
  };

  const availableTransitions = lead ? pipelineService.getAvailableTransitions(lead.status) : [];

  if (loading || !lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  const statusInfo = PIPELINE_STATUSES[lead.status];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-lg flex items-center justify-center text-4xl shadow-xl border-2 border-white/30">
                {statusInfo.icon}
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2 drop-shadow-lg">{lead.full_name}</h1>
                <div className="flex items-center gap-4 text-blue-100">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg">
                    <Mail size={16} />
                    <span>{lead.email}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg">
                    <Phone size={16} />
                    <span>{lead.phone}</span>
                  </div>
                  {lead.city && (
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg">
                      <MapPin size={16} />
                      <span>{lead.city}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/20 backdrop-blur-lg rounded-xl shadow-xl border-2 border-white/30 mb-3">
                <div>
                  <div className="text-sm text-blue-100">Statut</div>
                  <div className="font-bold text-xl">{statusInfo.label}</div>
                </div>
              </div>
              {lead.quality_score && (
                <div className="flex items-center justify-end gap-2">
                  <div className="text-sm text-blue-100">Qualité:</div>
                  <div className="text-3xl font-bold">{lead.quality_score}%</div>
                </div>
              )}
            </div>
          </div>

          {/* Actions de transition */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-blue-100 font-medium">Actions rapides:</span>

            {/* Bouton Demander Docs */}
            <button
              onClick={() => {
                const template = emailTemplates.find(t => t.id === 'documents');
                if (template) {
                  setEmailForm({
                    template: 'documents',
                    subject: template.subject,
                    body: template.body
                  });
                  setShowEmailModal(true);
                }
              }}
              className="px-4 py-2 bg-amber-500/90 hover:bg-amber-600 backdrop-blur-lg rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg border border-amber-400/50 hover:border-amber-300"
            >
              <FileText size={16} />
              Demander Docs
              <ArrowRight size={16} />
            </button>

            {availableTransitions.map((transition) => (
              <button
                key={transition.to}
                onClick={() => handleStatusChange(transition.to)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-lg rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg border border-white/20 hover:border-white/40"
              >
                {transition.label}
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Corps principal */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informations du lead */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <User size={24} className="text-blue-600" />
                  Informations du Lead
                </h2>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit size={16} />
                    Modifier
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <Save size={16} />
                      {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setEditForm({
                          first_name: lead.first_name || '',
                          last_name: lead.last_name || '',
                          email: lead.email || '',
                          phone: lead.phone || '',
                          city: lead.city || '',
                          company_name: lead.company_name || '',
                          internal_notes: (lead as any).internal_notes || ''
                        });
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <X size={16} />
                      Annuler
                    </button>
                  </div>
                )}
              </div>

              {editing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
                    <input
                      type="text"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Société</label>
                    <input
                      type="text"
                      value={editForm.company_name}
                      onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes internes</label>
                    <textarea
                      value={editForm.internal_notes}
                      onChange={(e) => setEditForm({ ...editForm, internal_notes: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="Notes pour l'équipe..."
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Prénom</div>
                    <div className="font-medium text-gray-900">{lead.first_name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Nom</div>
                    <div className="font-medium text-gray-900">{lead.last_name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Email</div>
                    <div className="font-medium text-gray-900">{lead.email}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Téléphone</div>
                    <div className="font-medium text-gray-900">{lead.phone}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Ville</div>
                    <div className="font-medium text-gray-900">{lead.city || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Société</div>
                    <div className="font-medium text-gray-900">{lead.company_name || '—'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm text-gray-600 mb-1">Notes internes</div>
                    <div className="font-medium text-gray-900 whitespace-pre-wrap">
                      {(lead as any).internal_notes || 'Aucune note'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Gestion des Devis */}
            <QuoteManager
              lead={lead}
              onQuoteSent={() => {
                loadMessages(lead.id);
              }}
            />

            {/* Signature Électronique */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-purple-200 p-6">
              <ElectronicSignature
                leadId={lead.id}
                leadName={`${lead.first_name} ${lead.last_name}`.trim()}
                leadEmail={lead.email}
                leadPhone={lead.phone}
              />
            </div>

            {/* Historique des échanges */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <History size={24} className="text-purple-600" />
                  Historique des Échanges
                </h2>
                <button
                  onClick={() => loadMessages(lead.id)}
                  disabled={loadingMessages}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw size={16} className={loadingMessages ? 'animate-spin' : ''} />
                  Actualiser
                </button>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p>Aucun échange enregistré</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.type === 'email' ? 'bg-blue-100 text-blue-600' :
                        msg.type === 'sms' ? 'bg-green-100 text-green-600' :
                        msg.type === 'whatsapp' ? 'bg-emerald-100 text-emerald-600' :
                        msg.type === 'note' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {msg.type === 'email' && <Mail size={20} />}
                        {msg.type === 'sms' && <MessageSquare size={20} />}
                        {msg.type === 'whatsapp' && <Phone size={20} />}
                        {msg.type === 'note' && <FileText size={20} />}
                        {msg.type === 'system' && <Bot size={20} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 capitalize">{msg.type}</span>
                            {msg.subject && <span className="text-sm text-gray-600">• {msg.subject}</span>}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            msg.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                            msg.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            msg.status === 'read' ? 'bg-purple-100 text-purple-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {msg.status}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm mb-2 whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{new Date(msg.sent_at).toLocaleString('fr-FR')}</span>
                          </div>
                          {msg.sent_by && (
                            <div className="flex items-center gap-1">
                              <User size={12} />
                              <span>{msg.sent_by}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Colonne latérale - Actions rapides */}
          <div className="space-y-6">
            {/* Actions de communication */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Send size={20} className="text-blue-600" />
                Communications
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <Mail size={18} />
                  Envoyer Email
                </button>
                <button
                  onClick={() => setShowSMSModal(true)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <MessageSquare size={18} />
                  Envoyer SMS
                </button>
                <button
                  onClick={() => setShowWhatsAppModal(true)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <Phone size={18} />
                  Envoyer WhatsApp
                </button>
              </div>
            </div>

            {/* Documents du Lead */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-purple-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Upload size={20} className="text-purple-600" />
                  Documents ({documents.length})
                </h3>
                <button
                  onClick={() => setShowDocumentModal(true)}
                  className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1 text-sm"
                >
                  <Plus size={16} />
                  Ajouter
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loadingDocuments ? (
                  <div className="text-center py-4 text-gray-500">Chargement...</div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">Aucun document</div>
                ) : (
                  documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {doc.document_type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.status === 'validated' ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                            ✓ Validé
                          </span>
                        ) : doc.status === 'rejected' ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                            ✗ Refusé
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleValidateDocument(doc.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Valider"
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button
                              className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                              title="Télécharger"
                            >
                              <Download size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bouton demande avis Google */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSendReviewRequest}
                  disabled={sendingReview}
                  className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <Award size={18} />
                  {sendingReview ? 'Envoi...' : 'Demander Avis Google'}
                </button>
              </div>
            </div>

            {/* Statistiques du lead */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-purple-600" />
                Statistiques
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Score de qualité</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${lead.quality_score || 0}%` }}
                      />
                    </div>
                    <span className="font-bold text-gray-900">{lead.quality_score || 0}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Créé le</div>
                  <div className="font-medium text-gray-900">
                    {new Date(lead.created_at).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                {lead.last_contact_at && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Dernier contact</div>
                    <div className="font-medium text-gray-900">
                      {new Date(lead.last_contact_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-600 mb-1">Source</div>
                  <div className="font-medium text-gray-900 capitalize">{lead.source || 'Inconnu'}</div>
                </div>
              </div>
            </div>

            {/* Tags */}
            {lead.tags && lead.tags.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Tag size={20} className="text-pink-600" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 rounded-full text-sm font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Email */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Mail className="text-blue-600" />
                  Envoyer un Email
                </h2>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                <select
                  value={emailForm.template}
                  onChange={(e) => {
                    const template = emailTemplates.find(t => t.id === e.target.value);
                    if (template) {
                      setEmailForm({
                        template: e.target.value,
                        subject: template.subject,
                        body: template.body
                      });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="">Sélectionner un template</option>
                  {emailTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sujet</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  placeholder="Sujet de l'email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={emailForm.body}
                  onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  placeholder="Corps de l'email..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Variables disponibles: {'{{first_name}}'}, {'{{last_name}}'}, {'{{company_name}}'}
                </p>
              </div>
              <button
                onClick={handleSendEmail}
                disabled={!emailForm.subject || !emailForm.body}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send size={20} />
                Envoyer l'Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal SMS */}
      {showSMSModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="text-green-600" />
                  Envoyer un SMS
                </h2>
                <button
                  onClick={() => setShowSMSModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                <select
                  value={smsForm.template}
                  onChange={(e) => {
                    const template = smsTemplates.find(t => t.id === e.target.value);
                    if (template) {
                      setSmsForm({
                        template: e.target.value,
                        message: template.message
                      });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white text-gray-900"
                >
                  <option value="">Sélectionner un template</option>
                  {smsTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message (160 caractères max)</label>
                <textarea
                  value={smsForm.message}
                  onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
                  rows={4}
                  maxLength={160}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white text-gray-900 placeholder-gray-400"
                  placeholder="Votre message SMS..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  {smsForm.message.length}/160 caractères
                </p>
              </div>
              <button
                onClick={handleSendSMS}
                disabled={!smsForm.message}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send size={20} />
                Envoyer le SMS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal WhatsApp */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Phone className="text-emerald-600" />
                  Envoyer un WhatsApp
                </h2>
                <button
                  onClick={() => setShowWhatsAppModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                <select
                  value={whatsappForm.template}
                  onChange={(e) => {
                    const template = whatsappTemplates.find(t => t.id === e.target.value);
                    if (template) {
                      setWhatsappForm({
                        template: e.target.value,
                        message: template.message
                      });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
                >
                  <option value="">Sélectionner un template</option>
                  {whatsappTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={whatsappForm.message}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, message: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 placeholder-gray-400"
                  placeholder="Votre message WhatsApp..."
                />
              </div>
              <button
                onClick={handleSendWhatsApp}
                disabled={!whatsappForm.message}
                className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send size={20} />
                Envoyer via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload Document */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Upload size={24} />
                  Upload Document
                </h2>
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de document</label>
                <select
                  value={uploadForm.documentType}
                  onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                >
                  <option value="carte_grise">Carte Grise</option>
                  <option value="permis_conduire">Permis de Conduire</option>
                  <option value="licence_taxi">Licence Taxi</option>
                  <option value="carte_identite">Carte d'Identité</option>
                  <option value="rib">RIB</option>
                  <option value="devis">Devis</option>
                  <option value="contrat_signe">Contrat Signé</option>
                  <option value="autorisation_stationnement">Autorisation Stationnement</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fichier</label>
                <input
                  type="file"
                  accept="image/*,application/pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadForm({ ...uploadForm, file });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formats acceptés : Images, PDF, Word. Max 50MB
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optionnel)</label>
                <textarea
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900 placeholder-gray-400"
                  placeholder="Notes additionnelles..."
                />
              </div>

              <button
                onClick={handleDocumentUpload}
                disabled={uploadingDocument || !uploadForm.file}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {uploadingDocument ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Upload Document
                  </>
                )}
              </button>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>Un email automatique sera envoyé au client après l'upload pour le notifier.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMLeadDetail;
