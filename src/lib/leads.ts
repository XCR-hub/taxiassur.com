import { z } from 'zod';
import { supabase } from './supabase';

export const LeadStatusSchema = z.enum(['nouveau', 'contacté', 'devis envoyé', 'client', 'perdu']);

export const LeadSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  city: z.string(),
  status: z.enum(['taxi', 'vtc', 'rc-pro', 'autre']),
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

// Gestion des leads - Récupère depuis le système PHP actuel
export async function getLeads(): Promise<Lead[]> {
  try {
    console.log('🔍 Fetching leads from API...');

    const response = await fetch('/api/lead-manager.php?action=list');

    if (!response.ok) {
      console.error('❌ API error:', response.status);
      return [];
    }

    const result = await response.json();

    if (!result.success) {
      console.error('❌ API returned error:', result.error);
      return [];
    }

    const leads = result.leads || [];
    console.log(`✅ Found ${leads.length} leads from API`);

    return leads.map((lead: any) => {
      // Récupérer le statut depuis la DB et le convertir
      const dbStatus = lead.leadStatus || lead.lead_status || 'new';
      const mappedStatus = statusFromDb[dbStatus] || 'nouveau';

      return {
        id: lead.id || `lead-${Date.now()}`,
        name: lead.name || 'Lead anonyme',
        email: lead.email || '',
        phone: lead.phone || '',
        city: lead.city || '',
        status: lead.status || 'taxi',
        immatriculation: lead.immatriculation || lead.registration || 'Non renseignée',
        leadStatus: mappedStatus as LeadStatus,
        createdAt: lead.createdAt || lead.timestamp || new Date().toISOString(),
        updatedAt: lead.updatedAt || lead.updated_at,
        contactedAt: lead.contactedAt || lead.contacted_at,
        devisEnvoyeAt: lead.devisEnvoyeAt || lead.devis_envoye_at,
        clientAt: lead.clientAt || lead.client_at,
        primeRealisee: lead.primeRealisee || lead.prime_realisee,
        notes: lead.notes,
        source: lead.source || 'website',
        assignedTo: lead.assignedTo || lead.assigned_to
      };
    });
  } catch (error) {
    console.error('Failed to load leads:', error);
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
    console.log('🔄 Updating lead status:', { leadId, newStatus, additionalData });

    // Utiliser directement le statut français (plus de conversion nécessaire)
    const dbStatus = newStatus;
    console.log('📝 Using status:', { status: dbStatus });

    // Préparer les champs de date basés sur le statut
    const dateFields: Record<string, string> = {
      updated_at: new Date().toISOString()
    };

    if (newStatus === 'contacte' && additionalData) {
      dateFields.contacted_at = new Date().toISOString();
    } else if (newStatus === 'devis_envoye') {
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

    console.log('📤 Sending to Supabase:', updateData);

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase update error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('✅ Lead status updated successfully:', data);
    console.log('✅ New lead_status in DB:', data?.lead_status);
    return true;
  } catch (error) {
    console.error('Failed to update lead status:', error);
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
        console.error('HTTP error:', response.status);
        throw new Error('Email sending failed');
      }

      const result = await response.json();

      if (!result.success) {
        console.error('API error:', result.error);
        throw new Error(result.error || 'Failed to send devis');
      }

      console.log('✅ Devis email sent successfully with attachment');
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
        console.error('HTTP error:', response.status);
        throw new Error('Email sending failed');
      }

      const result = await response.json();

      if (!result.success) {
        console.error('API error:', result.error);
        throw new Error(result.error || 'Failed to send devis');
      }

      console.log('✅ Devis email sent successfully');
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to send devis:', error);
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
        console.error('HTTP error:', response.status);
        throw new Error('Email sending failed');
      }

      const result = await response.json();

      if (!result.success) {
        console.error('API error:', result.error);
        throw new Error(result.error || 'Failed to send contract');
      }

      console.log('✅ Contract email sent successfully with attachment');
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
        console.error('HTTP error:', response.status);
        throw new Error('Email sending failed');
      }

      const result = await response.json();

      if (!result.success) {
        console.error('API error:', result.error);
        throw new Error(result.error || 'Failed to send contract');
      }

      console.log('✅ Contract email sent successfully');
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to send contract:', error);
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

