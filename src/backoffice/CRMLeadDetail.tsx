import React, { useEffect, useState, useCallback } from 'react';
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
  Award,
  ArrowLeft,
  Building2,
  PhoneCall,
  Zap,
  ChevronDown,
  Loader2,
  Activity,
  Inbox
} from 'lucide-react';
import { pipelineService, CRMLead, PIPELINE_STATUSES, PipelineStatus } from '@/lib/crm-pipeline';
import { QuickAction } from '@/lib/commercial-workflow';
import { supabase } from '@/lib/supabase';
import ElectronicSignature from '@/components/ElectronicSignature';
import {
  EmailComposerModal,
  LeadIntelligencePanel,
  LeadHeader,
  LeadWorkflowTabs,
  LeadAutomationCenter,
  LeadQuotesManager,
  DownPaymentManager,
  DynamicCommercialWorkflow,
  LeadDeleteSecure,
  PaymentManager,
  ContractSignatureManager,
  PipelineLocksStatus,
  QuickActionsCard,
  TimelineCard,
  IntelligentContactPanel,
  DocumentReminderPanel,
  CallLoggerModal,
  ContractWorkflowManager,
  LeadOverviewEnhanced,
  DocumentsEnhanced,
  QuotesEnhanced,
  HistoryEnhanced,
  CommunicationEnhanced,
  NotificationCenterEnhanced
} from '@/components/crm';
import DocumentDragDropSimple from '@/components/crm/DocumentDragDropSimple';
import LeadDocumentsComplete from '@/components/crm/LeadDocumentsComplete';
import type { WorkflowTab } from '@/components/crm';

interface Message {
  id: string;
  type: 'email' | 'sms' | 'whatsapp' | 'note' | 'system';
  content: string;
  fullContent?: string;
  subject?: string;
  sent_at: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sent_by?: string;
  direction?: 'inbound' | 'outbound';
}

const CRMLeadDetail: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<CRMLead | null>(null);
  const [activeTab, setActiveTab] = useState<WorkflowTab>('overview');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailDefaultSubject, setEmailDefaultSubject] = useState('');
  const [emailDefaultBody, setEmailDefaultBody] = useState('');
  const [emailMissingDocs, setEmailMissingDocs] = useState<string[]>([]);

  const [showSMSModal, setShowSMSModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showCallLogger, setShowCallLogger] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    city: '',
    immatriculation: '',
    internal_notes: ''
  });

  const [smsForm, setSmsForm] = useState({ message: '' });
  const [whatsappForm, setWhatsappForm] = useState({ message: '' });

  const [documentsComplete, setDocumentsComplete] = useState(false);
  const [documentsMissing, setDocumentsMissing] = useState(0);
  const [missingDocumentsList, setMissingDocumentsList] = useState<string[]>([]);
  const [documentStatuses, setDocumentStatuses] = useState<Array<{label: string; type: string; status: 'validated' | 'received' | 'missing'}>>([]);
  const [quotesCount, setQuotesCount] = useState(0);
  const [hasContract, setHasContract] = useState(false);
  const [pendingAISuggestions, setPendingAISuggestions] = useState(0);
  const [scheduledFollowUps, setScheduledFollowUps] = useState(0);

  const [contractData, setContractData] = useState<{
    id: string;
    requires_down_payment: boolean;
    down_payment_amount: number;
    down_payment_status: string;
    down_payment_link: string;
    down_payment_paid_at: string;
    down_payment_transaction_id: string;
  } | null>(null);

  const [statusChanging, setStatusChanging] = useState(false);
  const [automationFeedback, setAutomationFeedback] = useState<{
    show: boolean;
    success: boolean;
    message: string;
    actionsQueued: number;
  } | null>(null);

  const smsTemplates = [
    { id: 'welcome', name: 'Bienvenue', message: 'Bonjour {{first_name}}, merci pour votre demande. Un conseiller vous contacte sous 24h. TaxiAssur' },
    { id: 'reminder', name: 'Rappel RDV', message: 'Rappel: RDV telephonique aujourd\'hui. A tout de suite ! TaxiAssur' },
    { id: 'documents', name: 'Documents recus', message: 'Documents bien recus ! Nous traitons votre dossier. Reponse sous 48h. TaxiAssur' }
  ];

  const whatsappTemplates = [
    { id: 'welcome', name: 'Bienvenue', message: 'Bonjour {{first_name}}\n\nMerci pour votre confiance ! Je suis votre conseiller dedie.\n\nComment puis-je vous aider ?' },
    { id: 'quote_ready', name: 'Devis pret', message: 'Bonne nouvelle {{first_name}} !\n\nVotre devis est pret. Voulez-vous que je vous l\'envoie par email ?' },
    { id: 'follow_up', name: 'Suivi personnalise', message: 'Bonjour {{first_name}},\n\nAvez-vous des questions sur votre devis ? Je suis la pour vous accompagner' }
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
        immatriculation: (leadData as any).immatriculation || '',
        internal_notes: (leadData as any).internal_notes || ''
      });

      await Promise.all([
        loadMessages(id),
        loadStats(id)
      ]);
    } catch (error) {
      console.error('Failed to load lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (id: string) => {
    try {
      const [docsResult, prospectDocsResult, quotesResult, contractResult, suggestionsResult, followUpsResult, contractDetailsResult] = await Promise.all([
        supabase.from('crm_lead_documents').select('document_type, status').eq('lead_id', id),
        supabase.from('prospect_documents').select('document_type, validated').eq('lead_id', id),
        supabase.from('crm_lead_quotes').select('id').eq('lead_id', id),
        supabase.from('crm_contracts').select('id').eq('lead_id', id).eq('status', 'signed'),
        supabase.from('crm_ai_suggestions').select('id').eq('lead_id', id).eq('status', 'pending'),
        supabase.from('crm_scheduled_followups').select('id').eq('lead_id', id).eq('status', 'scheduled'),
        supabase.from('lead_contracts').select('*').eq('lead_id', id).order('created_at', { ascending: false }).limit(1)
      ]);

      const docs = docsResult.data || [];
      const prospectDocs = prospectDocsResult.data || [];

      // Fusionner les deux sources de documents
      const allValidatedTypes = new Set<string>();

      // Documents depuis crm_lead_documents
      docs.forEach(d => {
        if (d.status === 'validated' && d.document_type) {
          allValidatedTypes.add(d.document_type);
        }
      });

      // Documents depuis prospect_documents
      prospectDocs.forEach(d => {
        if (d.validated && d.document_type) {
          allValidatedTypes.add(d.document_type);
        }
      });

      const validatedDocs = allValidatedTypes.size;

      // Liste des documents requis avec leurs labels
      const requiredDocuments = [
        { type: 'licence_professionnelle', label: 'Licence de taxi' },
        { type: 'permis_conduire', label: 'Permis de conduire' },
        { type: 'piece_identite', label: 'Pièce d\'identité' },
        { type: 'carte_grise', label: 'Carte grise' },
        { type: 'releve_information', label: 'Relevé d\'information' },
        { type: 'autorisation_stationnement', label: 'Autorisation de stationnement' },
        { type: 'rib', label: 'RIB' },
        { type: 'kbis', label: 'KBIS / SIRENE' }
      ];

      // Calculer les documents manquants
      const missing = requiredDocuments
        .filter(doc => !allValidatedTypes.has(doc.type))
        .map(doc => doc.label);

      // Créer un Set pour les documents reçus mais pas validés
      const receivedButNotValidated = new Set<string>();

      // Documents reçus dans prospect_documents mais pas validés
      prospectDocs.forEach(d => {
        if (!d.validated && d.document_type) {
          receivedButNotValidated.add(d.document_type);
        }
      });

      // Documents reçus dans crm_lead_documents mais pas validés
      docs.forEach(d => {
        if (d.status !== 'validated' && d.document_type) {
          receivedButNotValidated.add(d.document_type);
        }
      });

      // Calculer les statuts de tous les documents
      const statuses = requiredDocuments.map(doc => {
        let status: 'validated' | 'received' | 'missing';

        if (allValidatedTypes.has(doc.type)) {
          status = 'validated';
        } else if (receivedButNotValidated.has(doc.type)) {
          status = 'received';
        } else {
          status = 'missing';
        }

        return {
          label: doc.label,
          type: doc.type,
          status
        };
      });

      setDocumentStatuses(statuses);
      setMissingDocumentsList(missing);
      setDocumentsComplete(validatedDocs >= 5);
      setDocumentsMissing(Math.max(0, 5 - validatedDocs));
      setQuotesCount(quotesResult.data?.length || 0);
      setHasContract((contractResult.data?.length || 0) > 0);
      setPendingAISuggestions(suggestionsResult.data?.length || 0);
      setScheduledFollowUps(followUpsResult.data?.length || 0);

      if (contractDetailsResult.data && contractDetailsResult.data.length > 0) {
        const contract = contractDetailsResult.data[0];
        setContractData({
          id: contract.id,
          requires_down_payment: contract.requires_down_payment || false,
          down_payment_amount: contract.down_payment_amount || 0,
          down_payment_status: contract.down_payment_status || 'pending',
          down_payment_link: contract.down_payment_link || '',
          down_payment_paid_at: contract.down_payment_paid_at || '',
          down_payment_transaction_id: contract.down_payment_transaction_id || ''
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadMessages = async (leadId: string) => {
    setLoadingMessages(true);
    try {
      const [interactionsResult, emailsResult] = await Promise.all([
        supabase
          .from('crm_interactions')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false }),
        supabase
          .from('email_messages')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
      ]);

      const allMessages: Message[] = [];

      if (interactionsResult.data) {
        interactionsResult.data.forEach((interaction: any) => {
          allMessages.push({
            id: interaction.id,
            type: interaction.type || 'system',
            content: interaction.content || interaction.summary || 'Contenu non disponible',
            subject: interaction.subject || `${interaction.type} - ${interaction.direction}`,
            sent_at: interaction.created_at,
            status: interaction.status || 'sent',
            sent_by: interaction.created_by || (interaction.direction === 'inbound' ? 'Client' : 'TaxiAssur'),
            direction: interaction.direction
          });
        });
      }

      if (emailsResult.data) {
        emailsResult.data.forEach((email: any) => {
          // Nettoyer l'encodage UTF-8 corrompu
          let bodyText = email.body_text || email.body_html || '';
          let cleanSubject = email.subject || '';

          // Premier niveau: corrections UTF-8 standards
          const cleanUTF8 = (text: string) => text
            .replace(/Ã©/g, 'é')
            .replace(/Ã /g, 'à')
            .replace(/Ã¨/g, 'è')
            .replace(/Ãª/g, 'ê')
            .replace(/Ã®/g, 'î')
            .replace(/Ã¯/g, 'ï')
            .replace(/Ã´/g, 'ô')
            .replace(/Ã¢/g, 'â')
            .replace(/Ã§/g, 'ç')
            .replace(/Ã¹/g, 'ù')
            .replace(/Ã»/g, 'û')
            .replace(/Ã/g, 'À')
            .replace(/Ã‰/g, 'É')
            .replace(/Ãˆ/g, 'È')
            .replace(/ÃŠ/g, 'Ê')
            // Corrections de patterns spécifiques
            .replace(/Jâai/gi, 'J\'ai')
            .replace(/jâai/gi, 'j\'ai')
            .replace(/câest/gi, 'c\'est')
            .replace(/lâ/gi, 'l\'')
            .replace(/dâ/gi, 'd\'')
            .replace(/jâattends/gi, 'j\'attends')
            .replace(/auprÃ¨s/g, 'auprès')
            .replace(/dÃ©clinÃ©/g, 'décliné')
            .replace(/antÃ©cÃ©dents/g, 'antécédents')
            .replace(/demandÃ©s/g, 'demandés')
            .replace(/dÃ©jÃ /g, 'déjà')
            .replace(/[鲃饪翊]/g, '\'')
            .replace(/倁/g, 'ai')
            .replace(/䰀/g, 'é')
            .replace(/â/g, ' ');

          bodyText = cleanUTF8(bodyText);
          cleanSubject = cleanUTF8(cleanSubject);

          const preview = bodyText.length > 200 ? bodyText.substring(0, 200) + '...' : bodyText;
          allMessages.push({
            id: email.id,
            type: 'email',
            content: preview,
            fullContent: bodyText,
            subject: cleanSubject,
            sent_at: email.received_at || email.sent_at || email.created_at,
            status: email.status === 'sent' ? 'sent' : email.is_read ? 'read' : 'delivered',
            sent_by: email.direction === 'inbound' ? email.from_name || email.from_email : 'TaxiAssur',
            direction: email.direction
          });
        });
      }

      allMessages.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
      setMessages(allMessages);
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
          immatriculation: editForm.immatriculation,
          internal_notes: editForm.internal_notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      if (error) throw error;

      await loadLeadData(lead.id);
      setEditing(false);
    } catch (error) {
      console.error('Save error:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!lead) return;

    setStatusChanging(true);
    setAutomationFeedback(null);

    try {
      const result = await pipelineService.updateLeadStatus(lead.id, newStatus as any);

      if (!result.success) {
        setAutomationFeedback({
          show: true,
          success: false,
          message: result.message || 'Erreur lors de la mise a jour du statut.',
          actionsQueued: 0
        });
        return;
      }

      if (result.actionsQueued > 0) {
        setAutomationFeedback({
          show: true,
          success: true,
          message: `Statut mis a jour. ${result.actionsQueued} action(s) automatique(s) declenchee(s).`,
          actionsQueued: result.actionsQueued
        });
      } else {
        setAutomationFeedback({
          show: true,
          success: true,
          message: result.message || 'Statut mis a jour avec succes.',
          actionsQueued: 0
        });
      }

      await loadLeadData(lead.id);

      setTimeout(() => {
        setAutomationFeedback(null);
      }, 5000);
    } catch (error) {
      console.error('Status change error:', error);
      setAutomationFeedback({
        show: true,
        success: false,
        message: 'Erreur lors de la mise a jour du statut.',
        actionsQueued: 0
      });
    } finally {
      setStatusChanging(false);
    }
  };

  const handleCommercialAction = async (action: QuickAction, additionalData?: { note?: string }) => {
    if (!lead) return;

    try {
      if (action.type === 'status_change' && action.nextStatus) {
        const result = await pipelineService.updateLeadStatus(
          lead.id,
          action.nextStatus,
          additionalData?.note,
          undefined,
          undefined
        );

        if (!result.success) {
          setAutomationFeedback({
            show: true,
            success: false,
            message: result.message || 'Erreur lors du changement de statut',
            actionsQueued: 0
          });
          setTimeout(() => setAutomationFeedback(null), 5000);
          return;
        }

        const statusLabel = PIPELINE_STATUSES[action.nextStatus]?.label || action.nextStatus;
        setAutomationFeedback({
          show: true,
          success: true,
          message: `Statut changé vers ${statusLabel}`,
          actionsQueued: result.actionsQueued
        });

        setTimeout(() => setAutomationFeedback(null), 5000);

        await loadLeadData(lead.id);
      } else if (action.type === 'send_email' && action.emailTemplate) {
        setEmailDefaultSubject(action.emailTemplate.subject);
        setEmailDefaultBody(action.emailTemplate.body);
        setEmailMissingDocs([]);
        setEmailModalOpen(true);
      } else if (action.type === 'send_sms') {
        setShowSMSModal(true);
      } else if (action.type === 'add_note') {
        await pipelineService.addTimelineEvent({
          lead_id: lead.id,
          event_type: 'note',
          title: 'Note ajoutée',
          description: additionalData?.note || '',
          metadata: {}
        });

        setAutomationFeedback({
          show: true,
          success: true,
          message: 'Note ajoutée avec succès',
          actionsQueued: 0
        });

        setTimeout(() => setAutomationFeedback(null), 3000);

        await loadMessages(lead.id);
      } else if (action.type === 'custom') {
        console.log('Custom action:', action.id);
      }
    } catch (error) {
      console.error('Commercial action error:', error);
      setAutomationFeedback({
        show: true,
        success: false,
        message: 'Erreur lors de l\'exécution de l\'action',
        actionsQueued: 0
      });

      setTimeout(() => setAutomationFeedback(null), 5000);
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
        setShowSMSModal(false);
        setSmsForm({ message: '' });
        await loadMessages(lead.id);
      }
    } catch (error) {
      console.error('SMS error:', error);
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
        setShowWhatsAppModal(false);
        setWhatsappForm({ message: '' });
        await loadMessages(lead.id);
      }
    } catch (error) {
      console.error('WhatsApp error:', error);
    }
  };

  const openEmailComposer = () => {
    setEmailDefaultSubject('');
    setEmailDefaultBody('');
    setEmailMissingDocs([]);
    setEmailModalOpen(true);
  };

  const handleRequestDocuments = async () => {
    if (!lead?.email) {
      alert('⚠️ Le prospect n\'a pas d\'email renseigné.');
      return;
    }

    try {
      // Préparer le message de demande de documents
      const leadName = [lead?.first_name, lead?.last_name].filter(Boolean).join(' ') || lead?.company_name || 'Client';

      // Lister les documents manquants
      const docsManquants = missingDocumentsList.length > 0
        ? missingDocumentsList
        : [
            'Carte grise du véhicule',
            'Permis de conduire',
            'Carte professionnelle de taxi',
            'Justificatif de domicile',
            'RIB'
          ];

      const subject = `Documents nécessaires pour votre assurance taxi - TaxiAssur`;

      const body = `Bonjour ${leadName},

Pour finaliser votre dossier d'assurance taxi et vous transmettre vos devis personnalisés, nous avons besoin des documents suivants :

${docsManquants.map((doc, idx) => `${idx + 1}. ${doc}`).join('\n')}

Vous pouvez nous transmettre ces documents :
• Par email en réponse à ce message
• Directement via votre espace personnel sécurisé : ${window.location.origin}/prospect/${lead?.access_token}

Sur votre espace, vous pourrez également :
- Suivre l'avancement de votre dossier en temps réel
- Consulter vos devis dès qu'ils sont disponibles
- Valider et souscrire en ligne

N'hésitez pas à nous contacter si vous avez des questions ou besoin d'assistance.

Je reste à votre disposition pour toute information complémentaire.`;

      // Envoyer l'email automatiquement
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-crm-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to: lead.email,
          subject,
          body,
          lead_id: lead.id,
          missing_documents: docsManquants
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'envoi de l\'email');
      }

      alert(`✅ Email de demande de documents envoyé à ${lead.email}`);

      // Rediriger vers l'onglet documents
      setActiveTab('documents');

      // Rafraîchir les données
      if (leadId) {
        await loadLeadData(leadId);
      }
    } catch (error: any) {
      console.error('Erreur envoi demande documents:', error);
      alert(`❌ ${error.message || 'Erreur lors de l\'envoi de l\'email'}`);
    }
  };

  const handleSuggestedAction = (action: string) => {
    switch (action) {
      case 'send_followup':
      case 'contact':
      case 'first_contact':
        openEmailComposer();
        break;
      case 'request_docs':
        handleRequestDocuments();
        break;
      case 'create_quote':
        setActiveTab('quotes');
        break;
      case 'followup_quote':
        setActiveTab('quotes');
        break;
      default:
        break;
    }
  };

  const availableTransitions = lead ? pipelineService.getAvailableTransitions(lead.status) : [];

  if (loading || !lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des donnees...</p>
        </div>
      </div>
    );
  }

  const tabStats = {
    documentsComplete,
    documentsMissing,
    quotesCount,
    hasContract,
    unreadMessages: messages.filter(m => m.direction === 'inbound' && m.status !== 'read').length,
    totalInteractions: messages.length,
    pendingAISuggestions,
    scheduledFollowUps
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/backoffice/crm-killer/pipeline')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour au pipeline</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Actualiser"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1">
          <LeadHeader
            lead={{
              ...lead,
              access_token: (lead as any).access_token
            }}
            onStatusChange={handleStatusChange}
            availableTransitions={availableTransitions}
          />
        </div>
        <LeadDeleteSecure
          leadId={lead.id}
          leadName={lead.full_name}
          leadEmail={lead.email}
        />
      </div>

      {statusChanging && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-blue-800 font-medium">Mise a jour du statut et declenchement des automations...</span>
          </div>
        </div>
      )}

      {automationFeedback?.show && (
        <div className={`border-b px-6 py-3 ${
          automationFeedback.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {automationFeedback.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className={`font-medium ${
                automationFeedback.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {automationFeedback.message}
              </span>
              {automationFeedback.actionsQueued > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  <Activity className="w-4 h-4" />
                  {automationFeedback.actionsQueued} action(s)
                </span>
              )}
            </div>
            <button
              onClick={() => setAutomationFeedback(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <LeadWorkflowTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stats={tabStats}
      />

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'overview' && (
              <>
                <LeadOverviewEnhanced
                  lead={{
                    id: lead.id,
                    first_name: lead.first_name,
                    last_name: lead.last_name,
                    email: lead.email,
                    phone: lead.phone,
                    city: lead.city,
                    status: lead.status,
                    quality_score: lead.quality_score || 0,
                    created_at: lead.created_at,
                    last_contact_at: (lead as any).last_contact_at,
                    immatriculation: (lead as any).immatriculation,
                    internal_notes: (lead as any).internal_notes
                  }}
                  stats={{
                    documentsComplete,
                    documentsMissing,
                    quotesCount,
                    interactionsCount: messages.length,
                    daysInPipeline: Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)),
                    conversionProbability: lead.quality_score || 0,
                    engagementLevel: messages.length > 10 ? 'high' : messages.length > 5 ? 'medium' : 'low'
                  }}
                  onEdit={() => setEditing(true)}
                  onSave={async (updatedData) => {
                    setSaving(true);
                    try {
                      const { error } = await supabase
                        .from('crm_leads')
                        .update(updatedData)
                        .eq('id', lead.id);

                      if (error) throw error;

                      await loadLeadData(lead.id);
                    } catch (error) {
                      console.error('Error saving:', error);
                      throw error;
                    } finally {
                      setSaving(false);
                    }
                  }}
                  onActionTrigger={(action) => {
                    switch (action) {
                      case 'send_email':
                        openEmailComposer();
                        break;
                      case 'call':
                        if (lead.phone) {
                          window.open(`tel:${lead.phone}`, '_self');
                          setTimeout(() => setShowCallLogger(true), 500);
                        }
                        break;
                      case 'request_documents':
                        handleRequestDocuments();
                        break;
                      default:
                        handleSuggestedAction(action);
                        break;
                    }
                  }}
                />

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" style={{display: 'none'}}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      Informations du Lead
                    </h2>
                    {!editing ? (
                      <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Edit className="w-4 h-4" />
                        Modifier
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
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
                              immatriculation: (lead as any).immatriculation || '',
                              internal_notes: (lead as any).internal_notes || ''
                            });
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                        >
                          <X className="w-4 h-4" />
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>

                  {editing ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Prenom</label>
                        <input
                          type="text"
                          value={editForm.first_name}
                          onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                        <input
                          type="text"
                          value={editForm.last_name}
                          onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Telephone</label>
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
                        <input
                          type="text"
                          value={editForm.city}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Immatriculation</label>
                        <input
                          type="text"
                          value={editForm.immatriculation}
                          onChange={(e) => setEditForm({ ...editForm, immatriculation: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                          placeholder="AA-123-BB"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes internes</label>
                        <textarea
                          value={editForm.internal_notes}
                          onChange={(e) => setEditForm({ ...editForm, internal_notes: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                          placeholder="Notes pour l'equipe..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Prenom</div>
                        <div className="font-medium text-gray-900">{lead.first_name || '-'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Nom</div>
                        <div className="font-medium text-gray-900">{lead.last_name || '-'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Email</div>
                        <div className="font-medium text-gray-900">{lead.email}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Telephone</div>
                        <div className="font-medium text-gray-900">{lead.phone}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Ville</div>
                        <div className="font-medium text-gray-900">{lead.city || '-'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Immatriculation</div>
                        <div className="font-medium text-gray-900">{(lead as any).immatriculation || '-'}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-sm text-gray-500 mb-1">Notes internes</div>
                        <div className="font-medium text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                          {(lead as any).internal_notes || 'Aucune note'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Prise de contact intelligente pour NOUVEAU_LEAD */}
                {(lead.status === 'NOUVEAU_LEAD' || lead.status === 'NEW_LEAD') && (
                  <div className="mb-6">
                    <IntelligentContactPanel
                      leadId={lead.id}
                      leadName={`${lead.first_name} ${lead.last_name}`}
                      leadPhone={lead.phone}
                      leadEmail={lead.email}
                      contactAttempts={(lead as any).contact_attempts || []}
                      contactEstablished={(lead as any).contact_established || false}
                      onContactSuccess={() => loadLeadData(lead.id)}
                    />
                  </div>
                )}

                {/* Relance documents pour COLLECTE_DOCUMENTS */}
                {(lead.status === 'COLLECTE_DOCUMENTS' || lead.status === 'DOCUMENTS_REQUIRED') && (
                  <div className="mb-6">
                    <DocumentReminderPanel
                      leadId={lead.id}
                      leadName={`${lead.first_name} ${lead.last_name}`}
                      leadEmail={lead.email}
                      leadPhone={lead.phone}
                      missingDocuments={missingDocumentsList}
                      documentStatuses={documentStatuses}
                      lastReminderDate={(lead as any).last_contact_at}
                      onDocumentsComplete={() => loadLeadData(lead.id)}
                    />
                  </div>
                )}

                {/* DynamicCommercialWorkflow seulement pour les autres statuts */}
                {lead.status !== 'NOUVEAU_LEAD' &&
                 lead.status !== 'NEW_LEAD' &&
                 lead.status !== 'COLLECTE_DOCUMENTS' &&
                 lead.status !== 'DOCUMENTS_REQUIRED' && (
                  <DynamicCommercialWorkflow
                    leadId={lead.id}
                    currentStatus={lead.status as PipelineStatus}
                    leadData={{
                      first_name: lead.first_name,
                      last_name: lead.last_name,
                      email: lead.email,
                      phone: lead.phone,
                      city: lead.city,
                      access_token: (lead as any).access_token
                    }}
                    onStatusChange={() => loadLeadData(lead.id)}
                  />
                )}
              </>
            )}

            {activeTab === 'documents' && (
              <DocumentsEnhanced
                leadId={lead.id}
                onDocumentUpload={() => loadLeadData(lead.id)}
                onDocumentValidate={() => loadLeadData(lead.id)}
                onRequestDocuments={handleRequestDocuments}
              />
            )}

            {activeTab === 'quotes' && (
              <QuotesEnhanced
                leadId={lead.id}
                leadEmail={lead.email}
                leadPhone={lead.phone}
                onQuoteStatusChange={() => loadLeadData(lead.id)}
              />
            )}

            {activeTab === 'contract' && (
              <div className="space-y-6">
                <ContractWorkflowManager leadId={lead.id} />

                {(!contractData?.requires_down_payment || contractData?.down_payment_status === 'paid') && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Signature électronique (ancien système)</h3>
                    <ElectronicSignature
                      leadId={lead.id}
                      leadName={`${lead.first_name} ${lead.last_name}`.trim()}
                      leadEmail={lead.email}
                      leadPhone={lead.phone}
                    />
                  </div>
                )}

                {contractData?.requires_down_payment && contractData?.down_payment_status !== 'paid' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-yellow-900 mb-1">Signature bloquee (ancien système)</h3>
                        <p className="text-sm text-yellow-800">
                          Le client doit d'abord regler le comptant de {contractData?.down_payment_amount?.toFixed(2)} EUR avant de pouvoir signer le contrat.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}


            {activeTab === 'communication' && (
              <CommunicationEnhanced
                leadId={lead.id}
                leadName={lead.name}
                leadEmail={lead.email}
                leadPhone={lead.phone}
                onMessageSent={() => loadMessages(lead.id)}
              />
            )}

            {activeTab === 'history' && (
              <HistoryEnhanced
                leadId={lead.id}
                onRefresh={() => loadMessages(lead.id)}
              />
            )}
          </div>

          <div className="space-y-4">
            <QuickActionsCard
              onSendEmail={openEmailComposer}
              onCall={() => {
                if (lead.phone) {
                  // Appeler d'abord le numéro
                  window.open(`tel:${lead.phone}`, '_self');
                  // Ouvrir immédiatement le formulaire de suivi
                  setTimeout(() => setShowCallLogger(true), 500);
                }
              }}
              onRequestDocuments={handleRequestDocuments}
            />

            <TimelineCard
              leadId={lead.id}
              leadEmail={lead.email}
              leadPhone={lead.phone}
              messageCount={messages.length}
              onReply={(emailId, subject, originalContent) => {
                setEmailDefaultSubject(subject);
                setEmailDefaultBody(`\n\n---\n${originalContent.substring(0, 500)}`);
                setEmailModalOpen(true);
              }}
              onNewEmail={() => {
                setEmailDefaultSubject('');
                setEmailDefaultBody('');
                setEmailModalOpen(true);
              }}
              onNewSMS={() => setShowSMSModal(true)}
              onNewWhatsApp={() => setShowWhatsAppModal(true)}
            />

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="text-blue-500" size={18} />
                <h3 className="text-sm font-bold text-gray-900">Intelligence Lead</h3>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-2 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">Conversion</div>
                  <div className="text-lg font-bold text-gray-900">{lead.quality_score || 0}%</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-2 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">Engagement</div>
                  <div className="text-lg font-bold text-gray-900">{messages.length > 5 ? 'Élevé' : 'Moyen'}</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-2">
                <div className="flex items-center gap-2 text-green-700 text-xs">
                  <CheckCircle size={14} />
                  <span className="font-medium">
                    {documentsComplete
                      ? 'Documents complets'
                      : quotesCount > 0
                      ? 'Devis envoyés'
                      : 'Lead actif'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EmailComposerModal
        isOpen={emailModalOpen}
        onClose={() => {
          setEmailModalOpen(false);
          setEmailDefaultSubject('');
          setEmailDefaultBody('');
          setEmailMissingDocs([]);
        }}
        lead={{
          id: lead.id,
          first_name: lead.first_name,
          last_name: lead.last_name,
          email: lead.email,
          phone: lead.phone,
          immatriculation: (lead as any).immatriculation,
          city: lead.city,
          access_token: (lead as any).access_token
        }}
        onEmailSent={() => loadMessages(lead.id)}
        defaultSubject={emailDefaultSubject}
        defaultBody={emailDefaultBody}
        missingDocuments={emailMissingDocs}
      />

      {showSMSModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  Envoyer un SMS
                </h2>
                <button onClick={() => setShowSMSModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Template</label>
                <select
                  value=""
                  onChange={(e) => {
                    const template = smsTemplates.find(t => t.id === e.target.value);
                    if (template) setSmsForm({ message: template.message });
                  }}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900"
                >
                  <option value="">Choisir un template</option>
                  {smsTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Message</label>
                <textarea
                  value={smsForm.message}
                  onChange={(e) => setSmsForm({ message: e.target.value })}
                  rows={4}
                  maxLength={160}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900"
                  placeholder="Votre message..."
                />
                <p className="text-xs text-gray-500 mt-1">{smsForm.message.length}/160</p>
              </div>
              <button
                onClick={handleSendSMS}
                disabled={!smsForm.message}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-emerald-600" />
                  Envoyer via WhatsApp
                </h2>
                <button onClick={() => setShowWhatsAppModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Template</label>
                <select
                  value=""
                  onChange={(e) => {
                    const template = whatsappTemplates.find(t => t.id === e.target.value);
                    if (template) setWhatsappForm({ message: template.message });
                  }}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900"
                >
                  <option value="">Choisir un template</option>
                  {whatsappTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Message</label>
                <textarea
                  value={whatsappForm.message}
                  onChange={(e) => setWhatsappForm({ message: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900"
                  placeholder="Votre message..."
                />
              </div>
              <button
                onClick={handleSendWhatsApp}
                disabled={!whatsappForm.message}
                className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Logger Modal */}
      {showCallLogger && lead && (
        <CallLoggerModal
          leadId={lead.id}
          leadName={`${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Prospect'}
          leadPhone={lead.phone || ''}
          onClose={() => setShowCallLogger(false)}
          onSuccess={() => {
            loadLead();
            loadMessages(lead.id);
          }}
        />
      )}
    </div>
  );
};

export default CRMLeadDetail;
