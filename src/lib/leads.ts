import { z } from 'zod';
import { logger } from '@/lib/logger';
import { PLATFORM_BASE_URL } from '@/lib/platform-api';
import { getLeadAcquisition } from '@/lib/lead-acquisition';
import { nativeAdminLeads, nativeAdminUpdateLead } from '@/lib/native-admin-data';

export const LeadStatusSchema = z.enum(['nouveau', 'contacté', 'devis envoyé', 'client', 'perdu']);

export const LeadSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  city: z.string(),
  status: z.enum(['taxi', 'vtc', 'autre']),
  immatriculation: z.string().optional(),
  leadStatus: LeadStatusSchema.default('nouveau'),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  contactedAt: z.string().optional(),
  devisEnvoyeAt: z.string().optional(),
  clientAt: z.string().optional(),
  primeRealisee: z.number().optional(),
  notes: z.string().optional(),
  source: z.string().default('website'),
  assignedTo: z.string().optional()
});

export type Lead = z.infer<typeof LeadSchema>;
export type LeadStatus = z.infer<typeof LeadStatusSchema>;

const statusFromDb: Record<string, LeadStatus> = {
  // Valeurs françaises avec espaces (depuis migration 20251015110000)
  nouveau: 'nouveau',
  'contacté': 'contacté',
  'devis envoyé': 'devis envoyé',
  client: 'client',
  perdu: 'perdu',
  // Anciennes valeurs avec underscores (rétro-compatibilité)
  contacte: 'contacté',
  devis_envoye: 'devis envoyé',
  // Anciennes valeurs anglaises (rétro-compatibilité)
  new: 'nouveau',
  contacted: 'contacté',
  interested: 'devis envoyé',
  quote_sent: 'devis envoyé',
  converted: 'client',
  lost: 'perdu'
};

export async function getLeads(): Promise<Lead[]> {
  try {
    const response = await nativeAdminLeads();
    const rows = Array.isArray(response?.leads) ? response.leads as Array<Record<string, unknown>> : [];
    return rows.map((lead) => {
      const dbStatus = String(lead.lead_status || lead.pipeline_stage || lead.status || 'nouveau');
      return {
        id: String(lead.id || ''),
        name: String(lead.name || lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Lead anonyme'),
        email: String(lead.email || ''),
        phone: String(lead.phone || ''),
        city: String(lead.city || ''),
        status: lead.vehicle_type === 'VTC' ? 'vtc' : lead.vehicle_type === 'Autre' ? 'autre' : 'taxi',
        immatriculation: String(lead.immatriculation || 'Non renseignée'),
        leadStatus: statusFromDb[dbStatus] || 'nouveau',
        createdAt: String(lead.created_at || new Date().toISOString()),
        updatedAt: typeof lead.updated_at === 'string' ? lead.updated_at : undefined,
        contactedAt: typeof lead.contacted_at === 'string' ? lead.contacted_at : undefined,
        devisEnvoyeAt: typeof lead.devis_envoye_at === 'string' ? lead.devis_envoye_at : undefined,
        clientAt: typeof lead.client_at === 'string' ? lead.client_at : undefined,
        primeRealisee: typeof lead.prime_realisee === 'number' ? lead.prime_realisee : undefined,
        notes: typeof lead.notes === 'string' ? lead.notes : undefined,
        source: String(lead.source || 'website'),
        assignedTo: typeof lead.assigned_to === 'string' ? lead.assigned_to : undefined,
      };
    });
  } catch (error) {
    logger.error('Failed to load leads from the native platform API:', error);
    return [];
  }
}

export async function updateLeadStatus(
  leadId: string,
  newStatus: LeadStatus,
  additionalData?: { primeRealisee?: number; notes?: string }
): Promise<boolean> {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { lead_status: newStatus, updated_at: now };
  if (newStatus === 'contacté') updates.contacted_at = now;
  if (newStatus === 'devis envoyé') updates.devis_envoye_at = now;
  if (newStatus === 'client') updates.client_at = now;
  if (additionalData?.primeRealisee !== undefined) updates.prime_realisee = additionalData.primeRealisee;
  if (additionalData?.notes !== undefined) updates.notes = additionalData.notes;
  try {
    await nativeAdminUpdateLead(leadId, updates);
    return true;
  } catch (error) {
    logger.error('Failed to update lead through the native platform API:', error);
    return false;
  }
}

export async function sendDevisEmail(leadId: string, attachment?: File | null): Promise<boolean> {
  try {
    if (attachment) {
      // Avec pièce jointe : utiliser FormData
      const formData = new FormData();
      formData.append('action', 'send_devis');
      formData.append('leadId', leadId);
      formData.append('devis', attachment);

      const response = await fetch('/api/lead-manager.php', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        logger.error('HTTP error:', response.status);
        throw new Error('Email sending failed');
      }

      const result = await response.json();

      if (!result.success) {
        logger.error('API error:', result.error);
        throw new Error(result.error || 'Failed to send devis');
      }

      logger.log('✅ Devis email sent successfully with attachment');
      return true;
    } else {
      // Sans pièce jointe : utiliser JSON
      const response = await fetch('/api/lead-manager.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'send_devis',
          leadId: leadId
        })
      });

      if (!response.ok) {
        logger.error('HTTP error:', response.status);
        throw new Error('Email sending failed');
      }

      const result = await response.json();

      if (!result.success) {
        logger.error('API error:', result.error);
        throw new Error(result.error || 'Failed to send devis');
      }

      logger.log('✅ Devis email sent successfully');
      return true;
    }
  } catch (error) {
    logger.error('❌ Failed to send devis:', error);
    return false;
  }
}

export async function sendContractEmail(leadId: string, attachment?: File | null): Promise<boolean> {
  try {
    if (attachment) {
      // Avec pièce jointe : utiliser FormData
      const formData = new FormData();
      formData.append('action', 'send_contract');
      formData.append('leadId', leadId);
      formData.append('contract', attachment);

      const response = await fetch('/api/lead-manager.php', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        logger.error('HTTP error:', response.status);
        throw new Error('Email sending failed');
      }

      const result = await response.json();

      if (!result.success) {
        logger.error('API error:', result.error);
        throw new Error(result.error || 'Failed to send contract');
      }

      logger.log('✅ Contract email sent successfully with attachment');
      return true;
    } else {
      // Sans pièce jointe : utiliser JSON
      const response = await fetch('/api/lead-manager.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'send_contract',
          leadId: leadId
        })
      });

      if (!response.ok) {
        logger.error('HTTP error:', response.status);
        throw new Error('Email sending failed');
      }

      const result = await response.json();

      if (!result.success) {
        logger.error('API error:', result.error);
        throw new Error(result.error || 'Failed to send contract');
      }

      logger.log('✅ Contract email sent successfully');
      return true;
    }
  } catch (error) {
    logger.error('❌ Failed to send contract:', error);
    return false;
  }
}

export function getLeadStatusColor(status: LeadStatus): string {
  const colors: Record<LeadStatus, string> = {
    'nouveau': 'bg-orange-100 text-orange-800',
    'contacté': 'bg-yellow-100 text-yellow-800',
    'devis envoyé': 'bg-blue-100 text-blue-800',
    'client': 'bg-green-100 text-green-800',
    'perdu': 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getLeadStatusLabel(status: LeadStatus): string {
  const labels: Record<LeadStatus, string> = {
    'nouveau': 'Nouveau',
    'contacté': 'Contacté',
    'devis envoyé': 'Devis Envoyé',
    'client': 'Client',
    'perdu': 'Perdu'
  };
  return labels[status] || status;
}

export interface CreateLeadInput {
  name: string;
  email: string;
  phone: string;
  city: string;
  status: 'taxi' | 'vtc' | 'autre';
  immatriculation?: string;
  source?: string;
  notes?: string;
}

export async function createLead(input: CreateLeadInput, forceNew: boolean = false): Promise<{ success: boolean; error?: string; leadId?: string; accessToken?: string; existingLead?: boolean }> {
  try {
    console.log('🚀 [FORM] === DÉBUT CRÉATION LEAD ===');
    console.log('🚀 [FORM] Input:', JSON.stringify(input, null, 2));

    const normalizedInput = {
      name: (input.name || '').trim(),
      email: (input.email || '').toLowerCase().trim(),
      phone: (input.phone || '').trim(),
      city: (input.city || '').trim(),
      status: input.status,
      immatriculation: (input.immatriculation || '').trim(),
      source: (input.source || 'website').trim(),
      notes: (input.notes || '').trim()
    };

    if (!normalizedInput.name || !normalizedInput.email || !normalizedInput.phone || !normalizedInput.city) {
      return {
        success: false,
        error: 'Merci de renseigner votre nom, email, telephone et ville avant envoi.'
      };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedInput.email)) {
      return { success: false, error: 'Adresse email invalide.' };
    }

    const nativeResponse = await fetch(`${PLATFORM_BASE_URL}/v1/public/leads`, {
      method: 'POST',
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...normalizedInput, acquisition: getLeadAcquisition(), service: normalizedInput.status === 'vtc' ? 'assurance-vtc' : 'assurance-taxi', force_new: forceNew }),
    });
    const nativePayload = await nativeResponse.json().catch(() => ({}));
    if (!nativeResponse.ok || nativePayload?.ok !== true || !nativePayload?.lead_id) {
      logger.warn('Native lead endpoint rejected request:', nativeResponse.status, nativePayload?.error);
      return { success: false, error: 'Votre demande n’a pas pu être enregistrée. Réessayez ou appelez le 01 80 85 57 86.' };
    }
    return {
      success: true,
      leadId: String(nativePayload.lead_id),
      existingLead: nativePayload.is_new === false,
      accessToken: typeof nativePayload.access_token === 'string' && nativePayload.access_token
        ? nativePayload.access_token
        : undefined,
    };


  } catch (error) {
    logger.error('Failed to create lead:', error);
    return { success: false, error: 'Une erreur est survenue. Veuillez réessayer.' };
  }
}

// Fonction supprimée - Les emails sont maintenant envoyés automatiquement
// par la fonction SQL upsert_lead via le système de queue (queue_simple_email)

