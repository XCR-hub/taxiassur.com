import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, AlertCircle, Copy, CheckCircle, User, Building2, MapPin, Car, FileText, Calculator, ClipboardCheck, MessageSquare, Star, StickyNote, Pencil, Save, X, MessageCircle, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { useRealtimeDocuments } from '@/hooks/useRealtimeDocuments';
import { useDocumentToast, DocumentToastContainer } from '@/components/crm/DocumentToast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { pipelineService } from '@/lib/crm-pipeline';
import { LeadWorkflowTabs, WorkflowTab } from '@/components/crm/LeadWorkflowTabs';
import PipelineWorkflow7Etapes from '@/components/crm/PipelineWorkflow7Etapes';
import DocumentValidationComplete from '@/components/crm/DocumentValidationComplete';
import LeadCompanyQuotes from '@/backoffice/LeadCompanyQuotes';
import ContractSignatureManager from '@/components/crm/ContractSignatureManager';
import CompleteTimeline from '@/components/crm/CompleteTimeline';
import LeadDeleteSecure from '@/components/crm/LeadDeleteSecure';
import SMSSendModal from '@/components/crm/SMSSendModal';
import SMSConversationPanel from '@/components/crm/SMSConversationPanel';
import { NATIVE_ADMIN_TOKEN_KEY } from '@/lib/native-admin-auth';
import { nativeAdminLead, nativeAdminUpdateLead } from '@/lib/native-admin-data';

interface Lead {
  id: string;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  lead_score?: number;
  current_stage_key?: string;
  pipeline_stage?: string;
  access_token?: string;
  notes?: string;
  company_name?: string;
  vehicle_type?: string;
  immatriculation?: string;
  assigned_to?: string;
  assigned_at?: string;
}

const CRMLeadDetail: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { user } = useAdminAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkflowTab>('overview');
  const [linkCopied, setLinkCopied] = useState(false);
  const [editingVehicleType, setEditingVehicleType] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    city: '',
    company_name: '',
    immatriculation: '',
  });
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [stats, setStats] = useState({
    documentsComplete: false,
    documentsMissing: 0,
    basketCount: 0,
    quotesCount: 0,
    hasContract: false,
    unreadMessages: 0,
    totalInteractions: 0,
    notesCount: 0,
  });

  // Toast pour les notifications
  const { toasts, showToast, removeToast } = useDocumentToast();

  const loadLeadData = async () => {
    try {
      setLoading(true);
      if (localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY) && leadId) {
        const native = await nativeAdminLead(leadId);
        setLead(native.lead);
        return;
      }
      const { data, error: fetchError } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (fetchError) {
        logger.error('Error loading lead:', fetchError);
        setError('Impossible de charger les données du lead');
        return;
      }

      setLead(data);
    } catch (err) {
      logger.error('Error:', err);
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const updateVehicleType = async (type: string) => {
    if (!leadId) return;
    if (localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY)) {
      const native = await nativeAdminUpdateLead(leadId, { vehicle_type: type });
      setLead(native.lead);
      setEditingVehicleType(false);
      return;
    }
    const { error } = await supabase
      .from('crm_leads')
      .update({ vehicle_type: type, updated_at: new Date().toISOString() })
      .eq('id', leadId);
    if (!error && lead) {
      setLead({ ...lead, vehicle_type: type });
    }
    setEditingVehicleType(false);
  };

  const startEditingContact = () => {
    if (!lead) return;
    setEditForm({
      first_name: lead.first_name || '',
      last_name: lead.last_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      city: lead.city || '',
      company_name: lead.company_name || '',
      immatriculation: lead.immatriculation || '',
    });
    setEditingContact(true);
  };

  const cancelEditingContact = () => {
    setEditingContact(false);
  };

  const saveContactInfo = async () => {
    if (!leadId || !lead) return;
    setSavingContact(true);
    try {
      const updates: Record<string, string> = { updated_at: new Date().toISOString() };
      if (editForm.first_name !== (lead.first_name || '')) updates.first_name = editForm.first_name;
      if (editForm.last_name !== (lead.last_name || '')) updates.last_name = editForm.last_name;
      if (editForm.email !== (lead.email || '')) updates.email = editForm.email;
      if (editForm.phone !== (lead.phone || '')) updates.phone = editForm.phone;
      if (editForm.city !== (lead.city || '')) updates.city = editForm.city;
      if (editForm.company_name !== (lead.company_name || '')) updates.company_name = editForm.company_name;
      if (editForm.immatriculation !== (lead.immatriculation || '')) updates.immatriculation = editForm.immatriculation;

      if (localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY)) {
        const native = await nativeAdminUpdateLead(leadId, updates);
        setLead(native.lead);
        setEditingContact(false);
        showToast('Coordonnees mises a jour', 'success');
        return;
      }

      const { error: updateError } = await supabase
        .from('crm_leads')
        .update(updates)
        .eq('id', leadId);

      if (updateError) {
        showToast('Erreur lors de la sauvegarde', 'error');
        return;
      }

      setLead({
        ...lead,
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        phone: editForm.phone,
        city: editForm.city,
        company_name: editForm.company_name,
        immatriculation: editForm.immatriculation,
      });
      setEditingContact(false);
      showToast('Coordonnees mises a jour', 'success');
    } catch (err) {
      logger.error('Error saving contact:', err);
      showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSavingContact(false);
    }
  };

  const loadStats = async () => {
    if (!leadId) return;

    try {
      // Documents
      const { data: documents } = await supabase
        .from('crm_lead_documents')
        .select('*')
        .eq('lead_id', leadId);

      const totalDocs = documents?.length || 0;
      const validatedDocs = documents?.filter(d => d.status === 'validated').length || 0;
      const pendingDocs = documents?.filter(d => d.status === 'pending').length || 0;

      // Devis
      const { data: quotes } = await supabase
        .from('lead_company_quotes')
        .select('id')
        .eq('lead_id', leadId);

      // Contrat
      const { data: contracts } = await supabase
        .from('lead_contracts')
        .select('id')
        .eq('lead_id', leadId)
        .limit(1);

      // Interactions (emails + messages + tous les événements)
      const { data: emails } = await supabase
        .from('email_messages')
        .select('id')
        .eq('lead_id', leadId);

      const { data: interactions } = await supabase
        .from('crm_interactions')
        .select('id')
        .eq('lead_id', leadId);

      const { data: aiDecisions } = await supabase
        .from('crm_ai_decisions')
        .select('id')
        .eq('lead_id', leadId);

      const { data: notifications } = await supabase
        .from('crm_event_notifications')
        .select('id')
        .eq('lead_id', leadId);

      const { data: notes } = await supabase
        .from('crm_interactions')
        .select('id')
        .eq('lead_id', leadId)
        .eq('channel', 'note');

      const totalEvents =
        (emails?.length || 0) +
        (interactions?.length || 0) +
        (documents?.length || 0) +
        (aiDecisions?.length || 0) +
        (notifications?.length || 0);

      const REQUIRED_CATEGORIES = 9;
      const uniqueValidatedTypes = new Set(
        documents?.filter(d => d.status === 'validated').map(d => d.document_type) || []
      );
      const missingCount = Math.max(0, REQUIRED_CATEGORIES - uniqueValidatedTypes.size);

      setStats({
        documentsComplete: uniqueValidatedTypes.size >= REQUIRED_CATEGORIES,
        documentsMissing: missingCount,
        basketCount: pendingDocs,
        quotesCount: quotes?.length || 0,
        hasContract: (contracts?.length || 0) > 0,
        unreadMessages: 0,
        totalInteractions: totalEvents,
        notesCount: notes?.length || 0,
      });
    } catch (err) {
      logger.error('Error loading stats:', err);
    }
  };

  // Rafraîchir les stats en temps réel quand un document change
  const handleDocumentChange = useCallback(() => {
    logger.info('📄 Document changed, refreshing stats...');
    showToast('Nouveau document reçu!', 'success');
    loadStats();
    loadLeadData(); // Aussi recharger les données du lead au cas où
  }, [leadId, showToast]);

  // Subscribe aux changements de documents en temps réel
  useRealtimeDocuments({
    leadId,
    onDocumentChange: handleDocumentChange,
    enabled: !!leadId
  });

  useEffect(() => {
    if (leadId) {
      loadLeadData();
      loadStats();
    }
  }, [leadId]);

  // Auto-assign when a commercial opens an unassigned lead
  useEffect(() => {
    if (!lead || !user?.id || !leadId) return;

    if (!lead.assigned_to) {
      pipelineService.autoAssignLead(leadId, user.id).then((ok) => {
        if (ok) {
          setLead(prev => prev ? { ...prev, assigned_to: user.id, assigned_at: new Date().toISOString() } : prev);
          setAssigneeName(user.full_name);
        }
      });
    } else {
      // Load assignee name
      pipelineService.getAdminUsers().then((users) => {
        const found = users.find(u => u.id === lead.assigned_to);
        setAssigneeName(found?.full_name || null);
      });
    }
  }, [lead?.id, lead?.assigned_to, user?.id, leadId]);

  const copyProspectSpaceLink = async () => {
    if (!lead?.access_token) {
      showToast('Token d\'accès non disponible pour ce lead', 'error');
      return;
    }
    const link = `${window.location.origin}/espace-prospect/${lead.access_token}`;

    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (err) {
      logger.error('Error copying link:', err);
      showToast('Erreur lors de la copie du lien', 'error');
    }
  };

  const sendProspectSpaceEmail = async () => {
    if (!lead || !leadId) return;

    if (!lead.access_token) {
      showToast('Token d\'accès non disponible pour ce lead', 'error');
      return;
    }

    try {
      const firstName = lead.first_name || 'Prospect';
      const lastName = lead.last_name || '';
      const accessLink = `${window.location.origin}/espace-prospect/${lead.access_token}`;

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #FFA500 0%, #FF8C00 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #000000; font-size: 28px; font-weight: 700;">
                Accès à votre Espace Prospect
              </h1>
              <p style="margin: 10px 0 0 0; color: #000000; font-size: 16px; opacity: 0.9;">
                TaxiAssur - Assurance Taxi Professionnelle
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Bonjour <strong>${firstName} ${lastName}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Votre espace prospect est maintenant accessible. Vous pouvez consulter vos devis, télécharger vos documents et suivre l'avancement de votre dossier.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${accessLink}" style="display: inline-block; background: linear-gradient(135deg, #FFA500 0%, #FF8C00 100%); color: #000000; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(255, 165, 0, 0.3);">
                      Accéder à mon espace
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 10px 0; font-size: 14px; color: #666666; line-height: 1.6;">
                Vous pouvez également copier ce lien dans votre navigateur :
              </p>
              <p style="margin: 0; padding: 15px; background-color: #f8f8f8; border-radius: 6px; font-size: 13px; color: #0066cc; word-break: break-all;">
                ${accessLink}
              </p>

              <div style="margin: 30px 0; padding: 20px; background-color: #fff8e6; border-left: 4px solid #FFA500; border-radius: 6px;">
                <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6;">
                  <strong style="color: #FFA500;">💡 Astuce :</strong> Ajoutez cette page à vos favoris pour y accéder rapidement !
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 30px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
                <strong>TaxiAssur</strong> - Assurance Taxi & VTC Professionnelle
              </p>
              <p style="margin: 0 0 15px 0; font-size: 13px; color: #999999;">
                team@taxiassur.com | taxiassur.com
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999;">
                Vous recevez cet email car vous avez demandé un devis sur TaxiAssur.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      console.log('📧 Sending prospect access email to:', lead.email);

      const { data, error } = await supabase.functions.invoke('send-email-universal', {
        body: {
          to: lead.email,
          toName: `${firstName} ${lastName}`.trim(),
          subject: 'Accès à votre espace prospect TaxiAssur',
          html: emailHtml,
          from: 'team@taxiassur.com',
          fromName: 'TaxiAssur',
          lead_id: leadId,
          trackOpens: false,  // Désactiver le tracking pour éviter les erreurs
          trackClicks: false  // Désactiver le tracking pour éviter les erreurs
        }
      });

      console.log('Email send response:', { data, error });

      if (error) {
        console.error('❌ Edge Function error:', error);
        showToast(`Erreur envoi email: ${error.message || 'Erreur Edge Function'}. Verifiez les secrets SMTP IONOS dans Supabase.`, 'error', 8000);
        throw new Error(error.message || 'Erreur Edge Function');
      }

      if (data && !data.success) {
        console.error('❌ Email sending failed:', data);
        const failedDetails = data.failed?.[0];
        const errorMsg = failedDetails?.error || data.error || 'Echec de l\'envoi email';
        showToast(`Erreur envoi email: ${errorMsg}`, 'error', 8000);
        throw new Error(errorMsg);
      }

      console.log('✅ Email sent successfully!');
      showToast(`Email d'acces envoye avec succes a ${lead.email}`, 'success');
    } catch (err) {
      logger.error('Error sending email:', err);
      const errorMessage = err?.message || 'Erreur inconnue lors de l\'envoi de l\'email';
      console.error('Full error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error || 'Lead introuvable'}</p>
          <button
            onClick={() => navigate('/backoffice/crm-killer/pipeline')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour au pipeline
          </button>
        </div>
      </div>
    );
  }

  const STATUS_LABEL: Record<string, { label: string; color: string; bg: string; border: string }> = {
    'NOUVEAU_LEAD':          { label: 'Nouveau Lead',        color: '#b45309', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)' },
    'COLLECTE_DOCUMENTS':    { label: 'Collecte Docs',       color: '#c2410c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.35)' },
    'DEVIS':                 { label: 'Devis',               color: '#0369a1', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.35)' },
    'DECISION_CLIENT':       { label: 'Décision Client',     color: '#7c3aed', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)' },
    'PAIEMENT':              { label: 'Paiement',            color: '#047857', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.35)' },
    'CONTRAT_SIGNATURE':     { label: 'Contrat & Signature', color: '#1d4ed8', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.35)' },
    'CLIENT_ACTIF':          { label: 'Client Actif',        color: '#15803d', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.35)' },
    'RELANCE':               { label: 'Relance',             color: '#c2410c', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)' },
    'PERDU':                 { label: 'Perdu',               color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.35)' },
    'RECONTACT_PROGRAMME':   { label: 'Recontact Programmé', color: '#b45309', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)' },
  };

  const statusInfo = STATUS_LABEL[lead.status?.toUpperCase?.()] || { label: lead.status?.replace(/_/g, ' ').toUpperCase() || '?', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.35)' };
  const leadName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Lead sans nom';
  const initials = lead.first_name ? `${lead.first_name[0]}${lead.last_name ? lead.last_name[0] : ''}` : '?';

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Toast notifications */}
      <DocumentToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Dark taxi header */}
      <div className="bg-[#111318] shadow-lg border-b border-black/20">
        <div className="max-w-7xl mx-auto px-6">

          {/* Top bar: back + status */}
          <div className="flex items-center justify-between pt-3 pb-2 border-b border-white/[0.06]">
            <button
              onClick={() => navigate('/backoffice/crm-killer/pipeline')}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Retour au pipeline
            </button>
            <span
              className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{ color: statusInfo.color, background: statusInfo.bg, border: `1px solid ${statusInfo.border}` }}
            >
              {statusInfo.label}
            </span>
          </div>

          {/* Main header row */}
          <div className="flex items-start gap-4 py-4">
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold shrink-0 shadow-md"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000' }}
            >
              {initials.toUpperCase()}
            </div>

            {/* Name + info */}
            <div className="flex-1 min-w-0">
              {editingContact ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editForm.first_name}
                        onChange={(e) => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                        placeholder="Prenom"
                        className="bg-gray-600 border border-gray-400 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-300 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30 w-36"
                      />
                      <input
                        type="text"
                        value={editForm.last_name}
                        onChange={(e) => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                        placeholder="Nom"
                        className="bg-gray-600 border border-gray-400 rounded-lg px-3 py-1.5 text-gray-100 text-sm placeholder-gray-300 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30 w-40"
                      />
                    </div>
                    <button
                      onClick={saveContactInfo}
                      disabled={savingContact}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/40 rounded-lg text-xs font-bold hover:bg-green-500/30 transition-all disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {savingContact ? 'Sauvegarde...' : 'Enregistrer'}
                    </button>
                    <button
                      onClick={cancelEditingContact}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] text-gray-400 border border-white/[0.12] rounded-lg text-xs font-medium hover:text-white hover:bg-white/[0.1] transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                      Annuler
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-gray-500" />
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="Email"
                        className="bg-gray-600 border border-gray-400 rounded-lg px-3 py-1 text-gray-100 text-sm placeholder-gray-300 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30 w-52"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-500" />
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="Telephone"
                        className="bg-gray-600 border border-gray-400 rounded-lg px-3 py-1 text-gray-100 text-sm placeholder-gray-300 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30 w-36"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-500" />
                      <input
                        type="text"
                        value={editForm.city}
                        onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))}
                        placeholder="Ville"
                        className="bg-gray-600 border border-gray-400 rounded-lg px-3 py-1 text-gray-100 text-sm placeholder-gray-300 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30 w-36"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-gray-500" />
                      <input
                        type="text"
                        value={editForm.company_name}
                        onChange={(e) => setEditForm(f => ({ ...f, company_name: e.target.value }))}
                        placeholder="Societe"
                        className="bg-gray-600 border border-gray-400 rounded-lg px-3 py-1 text-gray-100 text-sm placeholder-gray-300 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30 w-36"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Car className="h-3.5 w-3.5 text-gray-500" />
                      <input
                        type="text"
                        value={editForm.immatriculation}
                        onChange={(e) => setEditForm(f => ({ ...f, immatriculation: e.target.value }))}
                        placeholder="Immatriculation"
                        className="bg-gray-600 border border-gray-400 rounded-lg px-3 py-1 text-gray-100 text-sm placeholder-gray-300 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30 w-36"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-1.5">
                    <h1 className="text-xl font-bold text-white leading-tight">{leadName}</h1>
                    <button
                      onClick={startEditingContact}
                      className="p-1.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-gray-400 hover:text-yellow-400 hover:border-yellow-400/40 hover:bg-yellow-400/10 transition-all"
                      title="Modifier les coordonnees"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <div className="relative">
                      {editingVehicleType ? (
                        <div className="flex items-center gap-1">
                          {['Taxi', 'VTC', 'Moto-taxi'].map((type) => (
                            <button
                              key={type}
                              onClick={() => updateVehicleType(type)}
                              className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                                lead.vehicle_type?.toLowerCase() === type.toLowerCase()
                                  ? 'bg-yellow-400 text-gray-900 border-yellow-400'
                                  : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-yellow-400 hover:text-yellow-400'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                          <button
                            onClick={() => setEditingVehicleType(false)}
                            className="ml-1 text-gray-500 hover:text-gray-300"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingVehicleType(true)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                            lead.vehicle_type
                              ? lead.vehicle_type.toLowerCase() === 'taxi'
                                ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50 hover:bg-yellow-400/30'
                                : lead.vehicle_type.toLowerCase() === 'vtc'
                                ? 'bg-blue-400/20 text-blue-400 border-blue-400/50 hover:bg-blue-400/30'
                                : 'bg-green-400/20 text-green-400 border-green-400/50 hover:bg-green-400/30'
                              : 'bg-gray-700/50 text-gray-400 border-gray-600 hover:border-gray-400'
                          }`}
                        >
                          <Car className="h-3.5 w-3.5" />
                          {lead.vehicle_type || 'Type ?'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 hover:text-yellow-400 transition-colors">
                        <Mail className="h-3.5 w-3.5" />
                        {lead.email}
                      </a>
                    )}
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 hover:text-yellow-400 transition-colors">
                        <Phone className="h-3.5 w-3.5" />
                        {lead.phone}
                      </a>
                    )}
                    {lead.city && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {lead.city}
                      </span>
                    )}
                    {lead.company_name && (
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {lead.company_name}
                      </span>
                    )}
                    {lead.immatriculation && (
                      <span className="flex items-center gap-1.5">
                        <Car className="h-3.5 w-3.5" />
                        {lead.immatriculation}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      {assigneeName ? (
                        <span className="text-gray-300">{assigneeName}</span>
                      ) : (
                        <span className="italic text-gray-500">Non attribue</span>
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={copyProspectSpaceLink}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                  linkCopied
                    ? 'bg-green-500/15 text-green-400 border-green-500/40'
                    : 'bg-white/[0.06] text-gray-300 border-white/[0.12] hover:bg-white/[0.1] hover:text-white'
                }`}
                title="Copier le lien d'accès à l'espace prospect"
              >
                {linkCopied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {linkCopied ? 'Copié !' : 'Lien prospect'}
              </button>

              <button
                onClick={sendProspectSpaceEmail}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-lg text-sm font-bold hover:from-yellow-400 hover:to-amber-400 transition-all shadow-sm shadow-yellow-900/30"
                title="Envoyer l'accès espace prospect par email"
              >
                <Mail className="h-4 w-4" />
                Envoyer accès
              </button>

              {lead.phone && (
                <button
                  onClick={() => setShowSMSModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-all"
                  title="Envoyer un SMS au prospect"
                >
                  <MessageCircle className="h-4 w-4" />
                  SMS
                </button>
              )}

              <LeadDeleteSecure
                leadId={lead.id}
                leadName={leadName}
                leadEmail={lead.email}
              />
            </div>
          </div>

          {/* Quick stats strip */}
          <div className="flex items-center gap-1 pb-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08]">
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs text-gray-400">Docs</span>
              <span className={`text-xs font-bold ${stats.documentsComplete ? 'text-green-400' : stats.documentsMissing > 0 ? 'text-amber-400' : 'text-sky-400'}`}>
                {stats.documentsComplete ? 'Complets' : stats.documentsMissing > 0 ? `${stats.documentsMissing} manquants` : `${stats.basketCount} en attente`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08]">
              <Calculator className="h-3.5 w-3.5 text-sky-400" />
              <span className="text-xs text-gray-400">Devis</span>
              <span className={`text-xs font-bold ${stats.quotesCount > 0 ? 'text-sky-400' : 'text-gray-500'}`}>
                {stats.quotesCount > 0 ? stats.quotesCount : '0'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08]">
              <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs text-gray-400">Contrat</span>
              <span className={`text-xs font-bold ${stats.hasContract ? 'text-emerald-400' : 'text-gray-500'}`}>
                {stats.hasContract ? '✓ Signé' : 'En attente'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08]">
              <MessageSquare className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs text-gray-400">Interactions</span>
              <span className="text-xs font-bold text-violet-400">{stats.totalInteractions}</span>
            </div>
            {lead.lead_score !== undefined && lead.lead_score !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08]">
                <Star className="h-3.5 w-3.5 text-yellow-400" />
                <span className="text-xs text-gray-400">Score</span>
                <span className={`text-xs font-bold ${lead.lead_score >= 70 ? 'text-green-400' : lead.lead_score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {lead.lead_score}%
                </span>
              </div>
            )}
            <button
              onClick={() => setActiveTab('history')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.18] transition-all cursor-pointer"
              title="Voir les notes dans Historique & Communication"
            >
              <StickyNote className="h-3.5 w-3.5 text-teal-400" />
              <span className="text-xs text-gray-400">Notes</span>
              <span className={`text-xs font-bold ${stats.notesCount > 0 ? 'text-teal-400' : 'text-gray-500'}`}>
                {stats.notesCount}
              </span>
            </button>
            <div className="ml-auto text-xs text-gray-600">
              Demande du {new Date(lead.first_request_at || lead.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <LeadWorkflowTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stats={stats}
      />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div style={{ display: activeTab === 'overview' ? 'block' : 'none' }}>
          <div className="space-y-6">
            <PipelineWorkflow7Etapes
              leadId={leadId!}
              leadData={lead}
            />
          </div>
        </div>

        <div style={{ display: activeTab === 'documents' ? 'block' : 'none' }}>
          <div className="space-y-6">
            <DocumentValidationComplete
              caseId={leadId!}
              leadEmail={lead.email}
              leadFirstName={lead.first_name}
              vehicleType={lead.vehicle_type}
              onDocumentClassified={() => loadStats()}
            />
          </div>
        </div>

        <div style={{ display: activeTab === 'quotes' ? 'block' : 'none' }}>
          <div className="space-y-6">
            <LeadCompanyQuotes leadId={leadId!} />
          </div>
        </div>

        <div style={{ display: activeTab === 'contract' ? 'block' : 'none' }}>
          <div className="space-y-6">
            <ContractSignatureManager leadId={leadId!} />
          </div>
        </div>

        <div style={{ display: activeTab === 'history' ? 'block' : 'none' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CompleteTimeline
              leadId={leadId!}
              leadEmail={lead.email}
              leadPhone={lead.phone}
            />
            <SMSConversationPanel
              leadId={leadId!}
              leadPhone={lead.phone || null}
              leadFirstName={lead.first_name || 'Prospect'}
            />
          </div>
        </div>
      </div>

      {/* SMS Modal */}
      {showSMSModal && lead.phone && (
        <SMSSendModal
          isOpen={showSMSModal}
          onClose={() => setShowSMSModal(false)}
          leadId={leadId!}
          leadName={leadName}
          leadPhone={lead.phone}
          accessToken={lead.access_token}
          onSent={() => {
            loadStats();
            showToast('SMS envoye avec succes', 'success');
          }}
        />
      )}
    </div>
  );
};

export default CRMLeadDetail;
