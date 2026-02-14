import { z } from 'zod';
import { supabase } from './supabase';
import { logger } from '@/lib/logger';

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

// Mapping entre les valeurs TypeScript et les valeurs DB
// IMPORTANT: Depuis la migration 20251015000000, la DB utilise les valeurs françaises
const statusToDb: Record<LeadStatus, string> = {
  nouveau: 'nouveau',
  'contacté': 'contacté',
  'devis envoyé': 'devis envoyé',
  client: 'client',
  perdu: 'perdu'
};

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
    logger.log('🔍 Fetching leads from Supabase...');

    const { data: leadsData, error } = await supabase
      .from('crm_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('❌ Supabase error:', error);
      return [];
    }

    const leads = leadsData || [];
    logger.log(`✅ Found ${leads.length} leads from Supabase`);

    return leads.map((lead: any) => {
      const dbStatus = lead.lead_status || 'nouveau';
      const mappedStatus = statusFromDb[dbStatus] || 'nouveau';

      return {
        id: lead.id,
        name: lead.name || 'Lead anonyme',
        email: lead.email || '',
        phone: lead.phone || '',
        city: lead.city || '',
        status: lead.status || 'taxi',
        immatriculation: lead.immatriculation || 'Non renseignée',
        leadStatus: mappedStatus as LeadStatus,
        createdAt: lead.created_at || new Date().toISOString(),
        updatedAt: lead.updated_at,
        contactedAt: lead.contacted_at,
        devisEnvoyeAt: lead.devis_envoye_at,
        clientAt: lead.client_at,
        primeRealisee: lead.prime_realisee,
        notes: lead.notes,
        source: lead.source || 'website',
        assignedTo: lead.assigned_to
      };
    });
  } catch (error) {
    logger.error('Failed to load leads:', error);
    return [];
  }
}


export async function updateLeadStatus(
  leadId: string,
  newStatus: LeadStatus,
  additionalData?: {
    primeRealisee?: number;
    notes?: string;
  }
): Promise<boolean> {
  try {
    logger.log('🔄 Updating lead status:', { leadId, newStatus, additionalData });

    // Utiliser directement le statut français (plus de conversion nécessaire)
    const dbStatus = newStatus;
    logger.log('📝 Using status:', { status: dbStatus });

    // Préparer les champs de date basés sur le statut
    const dateFields: Record<string, string> = {
      updated_at: new Date().toISOString()
    };

    if (newStatus === 'contacté') {
      dateFields.contacted_at = new Date().toISOString();
    } else if (newStatus === 'devis envoyé') {
      dateFields.devis_envoye_at = new Date().toISOString();
    } else if (newStatus === 'client') {
      dateFields.client_at = new Date().toISOString();
    }

    // Mise à jour via Supabase avec la valeur DB (français)
    const updateData: any = {
      lead_status: dbStatus, // Utiliser directement: nouveau, contacte, devis_envoye, client, perdu
      ...dateFields
    };

    if (additionalData?.primeRealisee !== undefined) {
      updateData.prime_realisee = additionalData.primeRealisee;
    }

    if (additionalData?.notes) {
      updateData.notes = additionalData.notes;
    }

    logger.log('📤 Sending to Supabase:', updateData);

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId)
      .select()
      .single();

    if (error) {
      logger.error('❌ Supabase update error:', error);
      logger.error('❌ Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    logger.log('✅ Lead status updated successfully:', data);
    logger.log('✅ New lead_status in DB:', data?.lead_status);
    return true;
  } catch (error) {
    logger.error('Failed to update lead status:', error);
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

async function fileToBase64(file: File): Promise<{ filename: string; content: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve({ filename: file.name, content: base64 });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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

export async function createLead(input: CreateLeadInput): Promise<{ success: boolean; error?: string; leadId?: string; accessToken?: string }> {
  try {
    logger.log('🚀 Starting lead creation:', { name: input.name, email: input.email, phone: input.phone });

    const nameParts = input.name.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Client';
    const lastName = nameParts.slice(1).join(' ') || '';

    const vehicleType = input.status === 'vtc' ? 'VTC' : input.status === 'autre' ? 'Autre' : 'Taxi';

    logger.log('📝 Calling upsert_lead function...', {
      first_name: firstName,
      last_name: lastName,
      email: input.email,
      phone: input.phone,
      city: input.city
    });

    // Utiliser la fonction upsert_lead pour éviter les doublons d'email
    let data, error, result;

    const leadParams = {
      p_email: input.email,
      p_first_name: firstName,
      p_last_name: lastName,
      p_phone: input.phone,
      p_city: input.city,
      p_source: input.source || 'website',
      p_metadata: {
        vehicle_type: vehicleType,
        immatriculation: input.immatriculation || '',
        notes: input.notes || ''
      }
    };

    // Essayer d'abord via RPC (PostgREST)
    ({ data, error } = await supabase.rpc('upsert_lead', leadParams));

    // Si erreur → utiliser Edge Function (fallback pour TOUT type d'erreur)
    if (error) {
      logger.warn('⚠️ PostgREST error (or cache issue), using Edge Function fallback...');
      logger.warn('PostgREST error details:', {
        message: error.message,
        code: error.code,
        status: (error as any).status
      });

      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('create-lead-direct', {
          body: leadParams
        });

        if (edgeError) {
          logger.error('❌ Edge Function error:', edgeError);
          throw edgeError;
        }

        if (!edgeData?.success) {
          logger.error('❌ Edge Function returned error:', edgeData?.error);
          throw new Error(edgeData?.error || 'Edge Function failed');
        }

        result = {
          lead_id: edgeData.lead_id,
          access_token: edgeData.access_token,
          is_new: edgeData.is_new
        };

        logger.log('✅ Lead created via Edge Function fallback');
      } catch (edgeErr: any) {
        logger.error('❌ Edge Function fallback failed:', {
          message: edgeErr?.message,
          error: edgeErr
        });

        // Message d'erreur plus spécifique basé sur le contexte
        const errorMsg = edgeErr?.message || 'Erreur lors de la création du lead';
        return {
          success: false,
          error: errorMsg.includes('duplicate')
            ? 'Cet email est déjà enregistré'
            : errorMsg.includes('permission')
            ? 'Erreur de permission'
            : 'Erreur lors de la création du lead. Veuillez réessayer.'
        };
      }
    } else {
      // upsert_lead retourne une table, donc on prend le premier élément
      result = data?.[0];
      if (!result) {
        logger.error('❌ No result from upsert_lead');
        return { success: false, error: 'Erreur lors de la création du lead' };
      }
      logger.log('✅ Lead created/updated via PostgREST');
    }

    logger.log(result.is_new ? '✅ New lead created in crm_leads:' : '✅ Existing lead updated:', result.lead_id);

    // Envoyer les emails de manière NON-BLOQUANTE
    sendLeadNotificationEmails({
      id: result.lead_id,
      name: input.name,
      email: input.email,
      phone: input.phone,
      city: input.city,
      status: input.status,
      immatriculation: input.immatriculation,
      access_token: result.access_token,
      created_at: new Date().toISOString()
    }).then(() => {
      logger.log('✅ Emails envoyés avec succès');
    }).catch((emailError) => {
      logger.error('❌ ERREUR EMAILS (non bloquante):', emailError);
    });

    // Retourner immédiatement le succès sans attendre les emails
    return { success: true, leadId: result.lead_id, accessToken: result.access_token };
  } catch (error: any) {
    logger.error('Failed to create lead:', error);
    return { success: false, error: error.message || 'Une erreur est survenue' };
  }
}

async function sendLeadNotificationEmails(lead: any): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('send-lead-email-brevo', {
      body: {
        type: 'INSERT',
        table: 'crm_leads',
        record: {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          city: lead.city,
          status: lead.status || 'taxi',
          immatriculation: lead.immatriculation || lead.metadata?.immatriculation || '',
          access_token: lead.access_token,
          created_at: lead.created_at || new Date().toISOString()
        }
      }
    });

    if (error) {
      logger.error('Brevo notification error:', error);
      throw error;
    }

    logger.log('Emails sent via Brevo successfully:', data);
  } catch (err) {
    logger.error('Failed to send Brevo notifications:', err);
    throw err;
  }
}

