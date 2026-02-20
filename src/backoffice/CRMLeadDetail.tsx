import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, AlertCircle, Link2, Copy, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { LeadWorkflowTabs, WorkflowTab } from '@/components/crm/LeadWorkflowTabs';
import PipelineWorkflow7Etapes from '@/components/crm/PipelineWorkflow7Etapes';
import DocumentValidationComplete from '@/components/crm/DocumentValidationComplete';
import LeadCompanyQuotes from '@/backoffice/LeadCompanyQuotes';
import ContractSignatureManager from '@/components/crm/ContractSignatureManager';
import CompleteTimeline from '@/components/crm/CompleteTimeline';
import LeadDeleteSecure from '@/components/crm/LeadDeleteSecure';

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
}

const CRMLeadDetail: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkflowTab>('overview');
  const [linkCopied, setLinkCopied] = useState(false);
  const [stats, setStats] = useState({
    documentsComplete: false,
    documentsMissing: 0,
    basketCount: 0,
    quotesCount: 0,
    hasContract: false,
    unreadMessages: 0,
    totalInteractions: 0,
  });

  useEffect(() => {
    if (leadId) {
      loadLeadData();
      loadStats();
    }
  }, [leadId]);

  const loadLeadData = async () => {
    try {
      setLoading(true);
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

  const loadStats = async () => {
    if (!leadId) return;

    try {
      // Documents
      const { data: documents } = await supabase
        .from('crm_lead_documents')
        .select('*')
        .eq('lead_id', leadId);

      const totalDocs = documents?.length || 0;
      const validatedDocs = documents?.filter(d => d.validation_status === 'validated').length || 0;
      const pendingDocs = documents?.filter(d => d.validation_status === 'pending').length || 0;

      // Devis
      const { data: quotes } = await supabase
        .from('lead_company_quotes')
        .select('id')
        .eq('lead_id', leadId);

      // Contrat
      const { data: contracts } = await supabase
        .from('crm_production_contracts')
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

      const totalEvents =
        (emails?.length || 0) +
        (interactions?.length || 0) +
        (documents?.length || 0) +
        (aiDecisions?.length || 0) +
        (notifications?.length || 0);

      setStats({
        documentsComplete: totalDocs > 0 && validatedDocs === totalDocs,
        documentsMissing: totalDocs > 0 ? (totalDocs - validatedDocs) : 5,
        basketCount: pendingDocs,
        quotesCount: quotes?.length || 0,
        hasContract: (contracts?.length || 0) > 0,
        unreadMessages: 0,
        totalInteractions: totalEvents,
      });
    } catch (err) {
      logger.error('Error loading stats:', err);
    }
  };

  const copyProspectSpaceLink = async () => {
    if (!lead?.access_token) {
      alert('Token d\'accès non disponible pour ce lead');
      return;
    }
    const link = `${window.location.origin}/espace-prospect/${lead.access_token}`;

    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (err) {
      logger.error('Error copying link:', err);
      alert('Erreur lors de la copie du lien');
    }
  };

  const sendProspectSpaceEmail = async () => {
    if (!lead || !leadId) return;

    if (!lead.access_token) {
      alert('Token d\'accès non disponible pour ce lead');
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
                team@taxiassur.com | www.taxiassur.com
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
        const errorDetails = JSON.stringify(error, null, 2);
        alert(`Erreur lors de l'envoi de l'email:\n\n${error.message || 'Erreur Edge Function'}\n\nDétails: ${errorDetails}\n\nVérifiez que les credentials SMTP IONOS sont configurés dans les secrets Supabase.`);
        throw new Error(error.message || 'Erreur Edge Function');
      }

      if (data && !data.success) {
        console.error('❌ Email sending failed:', data);
        const failedDetails = data.failed?.[0];
        const errorMsg = failedDetails?.error || data.error || 'Échec de l\'envoi email';
        alert(`Erreur lors de l'envoi de l'email:\n\n${errorMsg}\n\nVérifiez que les credentials SMTP IONOS sont configurés correctement.`);
        throw new Error(errorMsg);
      }

      console.log('✅ Email sent successfully!');
      alert(`✅ Email d'accès envoyé avec succès à ${lead.email} !`);
    } catch (err: any) {
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

  const statusColors: Record<string, string> = {
    'nouveau_lead': 'bg-blue-100 text-blue-800',
    'en_cours_de_traitement': 'bg-yellow-100 text-yellow-800',
    'documents_en_attente': 'bg-orange-100 text-orange-800',
    'pret_pour_devis': 'bg-purple-100 text-purple-800',
    'devis_envoye': 'bg-indigo-100 text-indigo-800',
    'acompte_requis': 'bg-pink-100 text-pink-800',
    'contrat_en_cours': 'bg-cyan-100 text-cyan-800',
    'won': 'bg-green-100 text-green-800',
    'lost': 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate('/backoffice/crm-killer/pipeline')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour au pipeline
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {lead.first_name || lead.last_name
                  ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                  : 'Lead sans nom'}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                {lead.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {lead.email}
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {lead.phone}
                  </div>
                )}
              </div>

              {/* Boutons d'accès espace prospect */}
              <div className="flex items-center gap-2">
                <button
                  onClick={copyProspectSpaceLink}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    linkCopied
                      ? 'bg-green-100 text-green-700 border-2 border-green-300'
                      : 'bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100'
                  }`}
                  title="Copier le lien d'accès à l'espace prospect"
                >
                  {linkCopied ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Lien copié !
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copier lien espace prospect
                    </>
                  )}
                </button>

                <button
                  onClick={sendProspectSpaceEmail}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black rounded-lg text-sm font-medium hover:from-yellow-600 hover:to-yellow-700 transition-all"
                  title="Envoyer l'accès espace prospect par email"
                >
                  <Mail className="h-4 w-4" />
                  Envoyer accès espace prospect
                </button>

                <LeadDeleteSecure
                  leadId={lead.id}
                  leadName={`${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Sans nom'}
                  leadEmail={lead.email}
                />
              </div>
            </div>
            <div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  statusColors[lead.status] || 'bg-gray-100 text-gray-800'
                }`}
              >
                {lead.status?.replace(/_/g, ' ').toUpperCase()}
              </span>
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
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <PipelineWorkflow7Etapes
              leadId={leadId!}
              leadData={lead}
            />
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <DocumentValidationComplete
              caseId={leadId!}
              leadEmail={lead.email}
              leadFirstName={lead.first_name}
              onDocumentClassified={() => loadStats()}
            />
          </div>
        )}

        {activeTab === 'quotes' && (
          <div className="space-y-6">
            <LeadCompanyQuotes leadId={leadId!} />
          </div>
        )}

        {activeTab === 'contract' && (
          <div className="space-y-6">
            <ContractSignatureManager leadId={leadId!} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <CompleteTimeline
              leadId={leadId!}
              leadEmail={lead.email}
              leadPhone={lead.phone}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMLeadDetail;
