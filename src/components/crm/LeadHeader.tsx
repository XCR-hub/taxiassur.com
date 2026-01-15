import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Clock,
  ChevronRight,
  Copy,
  ExternalLink,
  CheckCircle,
  Send,
  Loader2
} from 'lucide-react';
import { PIPELINE_STATUSES } from '@/lib/crm-pipeline';
import { supabase } from '@/lib/supabase';

interface LeadHeaderProps {
  lead: {
    id: string;
    full_name: string;
    first_name?: string;
    last_name?: string;
    email: string;
    phone: string;
    city?: string;
    company_name?: string;
    status: string;
    quality_score?: number;
    created_at: string;
    last_contact_at?: string;
    source?: string;
    access_token?: string;
  };
  onStatusChange: (status: string) => void;
  availableTransitions: Array<{ to: string; label: string }>;
}

const PIPELINE_STEPS = [
  { key: 'new', label: 'Nouveau', order: 1 },
  { key: 'contacted', label: 'Contacte', order: 2 },
  { key: 'qualified', label: 'Qualifie', order: 3 },
  { key: 'quote_sent', label: 'Devis envoye', order: 4 },
  { key: 'negotiation', label: 'Negociation', order: 5 },
  { key: 'won', label: 'Gagne', order: 6 }
];

// Mapping des statuts détaillés vers les étapes du pipeline
const STATUS_TO_PIPELINE_STEP: Record<string, string> = {
  // Étape 1: Nouveau
  'NEW_LEAD': 'new',

  // Étape 2: Contacté
  'CONTACT_ATTEMPTED': 'contacted',
  'CONTACT_CONFIRMED': 'contacted',

  // Étape 3: Qualifié
  'DOCUMENTS_REQUIRED': 'qualified',
  'DOCUMENTS_PARTIAL': 'qualified',
  'READY_FOR_QUOTE': 'qualified',

  // Étape 4: Devis envoyé
  'QUOTE_SENT': 'quote_sent',
  'NO_RESPONSE': 'quote_sent',

  // Étape 5: Négociation
  'RELANCE_ACTIVE': 'negotiation',
  'SIGNATURE_PENDING': 'negotiation',
  'SIGNED': 'negotiation',
  'DOWN_PAYMENT_REQUIRED': 'negotiation',
  'PAYMENT_PENDING': 'negotiation',

  // Étape 6: Gagné
  'ACTIVE_CLIENT': 'won',
  'CROSS_SELLING': 'won',

  // Cas spéciaux (gardent leur position)
  'RISK_CHURN': 'negotiation',
  'CLIENT_LOST': 'negotiation',
  'LOST_RECONTACT_SCHEDULED': 'negotiation',
  'SINISTER': 'won',
  'ATTESTATION_REQUEST': 'won',
  'SUPPORT_ASSISTANCE': 'won'
};

export const LeadHeader: React.FC<LeadHeaderProps> = ({
  lead,
  onStatusChange,
  availableTransitions
}) => {
  const [sendingAccess, setSendingAccess] = useState(false);
  const statusInfo = PIPELINE_STATUSES[lead.status] || { label: lead.status, icon: '?' };

  // Trouver l'étape du pipeline correspondant au statut actuel
  const pipelineStep = STATUS_TO_PIPELINE_STEP[lead.status] || 'new';
  const currentStepOrder = PIPELINE_STEPS.find(s => s.key === pipelineStep)?.order || 0;
  const prospectUrl = lead.access_token
    ? `${window.location.origin}/espace-prospect?token=${lead.access_token}`
    : null;

  const isActiveClient = lead.status === 'ACTIVE_CLIENT' || lead.status === 'CROSS_SELLING' || lead.status === 'SINISTER';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSendClientAccess = async () => {
    if (!confirm('Voulez-vous envoyer les accès à l\'espace client par email ?')) {
      return;
    }

    setSendingAccess(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-client-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ lead_id: lead.id })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Email d'accès envoyé avec succès !\n\nMot de passe temporaire : ${result.temporary_password}\n\n⚠️ Conservez ce mot de passe en lieu sûr.`);
      } else {
        throw new Error(result.error || 'Erreur lors de l\'envoi');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de l\'envoi des accès : ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    } finally {
      setSendingAccess(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {lead.first_name?.[0]?.toUpperCase() || 'L'}
              {lead.last_name?.[0]?.toUpperCase() || ''}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{lead.full_name}</h1>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{lead.email}</span>
                  <button
                    onClick={() => copyToClipboard(lead.email)}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Copier"
                  >
                    <Copy className="w-3 h-3 text-gray-400" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{lead.phone}</span>
                  <button
                    onClick={() => copyToClipboard(lead.phone)}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Copier"
                  >
                    <Copy className="w-3 h-3 text-gray-400" />
                  </button>
                </div>

                {lead.city && (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{lead.city}</span>
                  </div>
                )}

                {lead.company_name && (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Building2 className="w-4 h-4" />
                    <span>{lead.company_name}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Cree le {formatDate(lead.created_at)}</span>
                  <span className="text-gray-400">({daysSinceCreation}j)</span>
                </div>
                {lead.source && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                    Source: {lead.source}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              {lead.quality_score !== undefined && (
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-1">Score qualite</div>
                  <div className={`text-2xl font-bold ${
                    lead.quality_score >= 70 ? 'text-green-600' :
                    lead.quality_score >= 40 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {lead.quality_score}%
                  </div>
                </div>
              )}

              <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                lead.status === 'won' ? 'bg-green-100 text-green-700' :
                lead.status === 'lost' ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {statusInfo.icon} {statusInfo.label}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {prospectUrl && !isActiveClient && (
                <a
                  href={prospectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Voir espace prospect
                </a>
              )}
              {isActiveClient && (
                <button
                  onClick={handleSendClientAccess}
                  disabled={sendingAccess}
                  className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sendingAccess ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      Envoyer accès espace client
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Progression pipeline</span>
          </div>
          <div className="flex items-center gap-1">
            {PIPELINE_STEPS.map((step, index) => {
              const isCompleted = step.order < currentStepOrder;
              const isCurrent = step.key === pipelineStep;

              // Trouver les statuts disponibles qui correspondent à cette étape du pipeline
              const matchingTransitions = availableTransitions.filter(t =>
                STATUS_TO_PIPELINE_STEP[t.to] === step.key
              );
              const isAvailable = matchingTransitions.length > 0;

              // Si disponible, prendre la première transition correspondante
              const targetStatus = matchingTransitions[0]?.to;

              return (
                <React.Fragment key={step.key}>
                  <button
                    onClick={() => isAvailable && targetStatus && onStatusChange(targetStatus)}
                    disabled={!isAvailable && !isCurrent}
                    title={
                      isCurrent
                        ? `Étape actuelle: ${statusInfo.label}`
                        : isAvailable && matchingTransitions[0]
                        ? `Passer à: ${matchingTransitions[0].label}`
                        : isCompleted
                        ? 'Étape complétée'
                        : 'Non disponible'
                    }
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      isCompleted
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : isCurrent
                        ? 'bg-blue-600 text-white shadow-md'
                        : isAvailable
                        ? 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 cursor-pointer border border-gray-200 hover:border-blue-200'
                        : 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {isCompleted && <CheckCircle className="w-3 h-3" />}
                      <span className="truncate">{step.label}</span>
                    </div>
                  </button>
                  {index < PIPELINE_STEPS.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadHeader;
