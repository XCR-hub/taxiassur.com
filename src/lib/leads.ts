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
      .from('crm_leads')
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

export async function checkExistingEmail(email: string): Promise<{
  exists: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  vehicleCount?: number;
  createdAt?: string;
}> {
  try {
    console.log('[CHECK_EMAIL] Checking email:', email);

    const { data, error } = await supabase.rpc('check_existing_email', {
      p_email: email
    });

    if (error) {
      console.error('[CHECK_EMAIL] Error:', error);
      return { exists: false };
    }

    if (!data || data.length === 0 || !data[0].email_exists) {
      console.log('[CHECK_EMAIL] Email does not exist');
      return { exists: false };
    }

    const existingLead = data[0];
    console.log('[CHECK_EMAIL] Email exists:', existingLead);

    return {
      exists: true,
      firstName: existingLead.first_name,
      lastName: existingLead.last_name,
      phone: existingLead.phone,
      city: existingLead.city,
      vehicleCount: existingLead.vehicle_count,
      createdAt: existingLead.created_at
    };
  } catch (error) {
    console.error('[CHECK_EMAIL] Exception:', error);
    return { exists: false };
  }
}

export async function resendAccess(email: string): Promise<{
  success: boolean;
  accessToken?: string;
  error?: string;
}> {
  try {
    console.log('[RESEND_ACCESS] Resending access for:', email);

    const { data, error } = await supabase.rpc('resend_lead_access', {
      p_email: email
    });

    if (error) {
      console.error('[RESEND_ACCESS] Error:', error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0 || !data[0].success) {
      console.error('[RESEND_ACCESS] Failed to resend');
      return { success: false, error: 'Impossible de renvoyer les accès' };
    }

    console.log('[RESEND_ACCESS] Success');
    return {
      success: true,
      accessToken: data[0].access_token
    };
  } catch (error: any) {
    console.error('[RESEND_ACCESS] Exception:', error);
    return { success: false, error: error.message };
  }
}

export async function createLead(input: CreateLeadInput, forceNew: boolean = false): Promise<{ success: boolean; error?: string; leadId?: string; accessToken?: string }> {
  try {
    console.log('🚀 [FORM] === DÉBUT CRÉATION LEAD ===');
    console.log('🚀 [FORM] Input:', JSON.stringify(input, null, 2));

    const nameParts = input.name.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Client';
    const lastName = nameParts.slice(1).join(' ') || '';
    const vehicleType = input.status === 'vtc' ? 'VTC' : input.status === 'autre' ? 'Autre' : 'Taxi';

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://drohhxrkoequjphvabvq.supabase.co';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ((window as any).ENV_CONFIG?.VITE_SUPABASE_ANON_KEY) || '';

    console.log('🔧 [FORM] Supabase URL:', supabaseUrl);
    console.log('🔧 [FORM] Supabase Key présente:', supabaseKey ? 'OUI' : 'NON');

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

    console.log('📦 [FORM] Lead params:', JSON.stringify(leadParams, null, 2));
    console.log('📦 [FORM] Force New:', forceNew);

    let result: { lead_id: string; access_token: string; is_new: boolean } | null = null;

    // === METHODE 1 : RPC via Supabase client ===
    console.log('📞 [FORM] Méthode 1: Tentative RPC via Supabase client...');
    try {
      const { data, error } = await supabase.rpc('upsert_lead', leadParams);
      console.log('📞 [FORM] RPC Response:', { data, error });
      if (!error && data?.[0]) {
        result = data[0];
        console.log('✅ [FORM] Lead créé via RPC Supabase client!');
        logger.log('Lead created via RPC');
      } else if (error) {
        console.error('❌ [FORM] RPC failed:', error.message, error.code, error);
        logger.warn('RPC failed:', error.message, error.code);
      }
    } catch (rpcErr) {
      console.error('❌ [FORM] RPC exception:', rpcErr);
      logger.warn('RPC exception:', rpcErr);
    }

    // === METHODE 2 : Edge Function via fetch direct (bypass supabase client) ===
    if (!result) {
      console.log('🌐 [FORM] Méthode 2: Tentative Edge Function...');
      try {
        const edgeUrl = `${supabaseUrl}/functions/v1/create-lead-direct`;
        console.log('🌐 [FORM] Edge URL:', edgeUrl);
        const resp = await fetch(edgeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey
          },
          body: JSON.stringify(leadParams)
        });

        console.log('🌐 [FORM] Edge Response status:', resp.status, resp.statusText);
        if (resp.ok) {
          const edgeData = await resp.json();
          console.log('🌐 [FORM] Edge Data:', edgeData);
          if (edgeData?.success) {
            result = {
              lead_id: edgeData.lead_id,
              access_token: edgeData.access_token,
              is_new: edgeData.is_new
            };
            console.log('✅ [FORM] Lead créé via Edge Function!');
            logger.log('Lead created via Edge Function');
          } else {
            console.error('❌ [FORM] Edge Function returned error:', edgeData?.error);
            logger.warn('Edge Function returned error:', edgeData?.error);
          }
        } else {
          const errorText = await resp.text();
          console.error('❌ [FORM] Edge Function HTTP error:', resp.status, errorText);
          logger.warn('Edge Function HTTP error:', resp.status, resp.statusText);
        }
      } catch (edgeErr) {
        console.error('❌ [FORM] Edge Function exception:', edgeErr);
        logger.warn('Edge Function exception:', edgeErr);
      }
    }

    // === METHODE 3 : RPC via fetch direct (bypass supabase client entirely) ===
    if (!result) {
      console.log('🔄 [FORM] Méthode 3: Tentative RPC direct...');
      try {
        const rpcUrl = `${supabaseUrl}/rest/v1/rpc/upsert_lead`;
        console.log('🔄 [FORM] RPC URL:', rpcUrl);
        const resp = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey
          },
          body: JSON.stringify(leadParams)
        });

        console.log('🔄 [FORM] RPC Response status:', resp.status, resp.statusText);
        if (resp.ok) {
          const rpcData = await resp.json();
          console.log('🔄 [FORM] RPC Data:', rpcData);
          if (Array.isArray(rpcData) && rpcData[0]) {
            result = rpcData[0];
            console.log('✅ [FORM] Lead créé via RPC direct!');
            logger.log('Lead created via direct RPC fetch');
          }
        } else {
          const errText = await resp.text();
          console.error('❌ [FORM] Direct RPC fetch failed:', resp.status, errText);
          logger.error('Direct RPC fetch failed:', resp.status, errText);
        }
      } catch (fetchErr) {
        console.error('❌ [FORM] Direct RPC fetch exception:', fetchErr);
        logger.error('Direct RPC fetch exception:', fetchErr);
      }
    }

    if (!result) {
      console.error('❌ [FORM] TOUTES LES MÉTHODES ONT ÉCHOUÉ!');
      console.error('❌ [FORM] Vérifiez la console ci-dessus pour les détails');
      return { success: false, error: 'Impossible de créer le lead. Veuillez réessayer ou nous appeler au 01 80 85 57 86.' };
    }

    console.log('✅ [FORM] SUCCESS! Lead ID:', result.lead_id);
    console.log('✅ [FORM] Access Token:', result.access_token);
    console.log('📧 [FORM] Les emails sont envoyés automatiquement par la fonction upsert_lead');

    return { success: true, leadId: result.lead_id, accessToken: result.access_token };
  } catch (error: any) {
    logger.error('Failed to create lead:', error);
    return { success: false, error: 'Une erreur est survenue. Veuillez réessayer.' };
  }
}

// Fonction supprimée - Les emails sont maintenant envoyés automatiquement
// par la fonction SQL upsert_lead via le système de queue (queue_simple_email)

