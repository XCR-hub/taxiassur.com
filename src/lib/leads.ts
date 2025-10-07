import { z } from 'zod';
import { supabase } from './supabase';

export const LeadStatusSchema = z.enum(['nouveau', 'contacte', 'devis_envoye', 'client', 'perdu']);

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

// Gestion des leads
export async function getLeads(): Promise<Lead[]> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((lead: any) => ({
      id: lead.id || `lead-${Date.now()}`,
      name: lead.name || 'Lead anonyme',
      email: lead.email || '',
      phone: lead.phone || '',
      city: lead.city || '',
      status: lead.status || 'taxi',
      immatriculation: lead.immatriculation || 'Non renseignée',
      leadStatus: lead.lead_status || 'nouveau',
      createdAt: lead.created_at || new Date().toISOString(),
      updatedAt: lead.updated_at,
      contactedAt: lead.contacted_at,
      devisEnvoyeAt: lead.devis_envoye_at,
      clientAt: lead.client_at,
      primeRealisee: lead.prime_realisee,
      notes: lead.notes,
      source: lead.source || 'website',
      assignedTo: lead.assigned_to
    }));
  } catch (error) {
    console.error('Failed to load leads:', error);
    return [];
  }
}

// Mock data for development
function getMockLeads(): Lead[] {
  return [
    {
      id: 'lead-001',
      name: 'Jean Dupont',
      email: 'jean.dupont@email.com',
      phone: '0123456789',
      city: 'Paris',
      status: 'taxi',
      immatriculation: 'AB-123-CD',
      leadStatus: 'nouveau',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      source: 'website'
    },
    {
      id: 'lead-002',
      name: 'Marie Martin',
      email: 'marie.martin@email.com',
      phone: '0987654321',
      city: 'Lyon',
      status: 'vtc',
      leadStatus: 'contacte',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      contactedAt: new Date(Date.now() - 86400000).toISOString(),
      source: 'website'
    },
    {
      id: 'lead-003',
      name: 'Ahmed Benali',
      email: 'ahmed.benali@email.com',
      phone: '0156789012',
      city: 'Marseille',
      status: 'taxi',
      leadStatus: 'devis_envoye',
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      contactedAt: new Date(Date.now() - 172800000).toISOString(),
      devisEnvoyeAt: new Date(Date.now() - 86400000).toISOString(),
      source: 'website'
    },
    {
      id: 'lead-004',
      name: 'Sophie Dubois',
      email: 'sophie.dubois@email.com',
      phone: '0145678901',
      city: 'Toulouse',
      status: 'taxi',
      leadStatus: 'client',
      createdAt: new Date(Date.now() - 604800000).toISOString(),
      contactedAt: new Date(Date.now() - 518400000).toISOString(),
      devisEnvoyeAt: new Date(Date.now() - 432000000).toISOString(),
      clientAt: new Date(Date.now() - 259200000).toISOString(),
      primeRealisee: 1250,
      notes: 'Client très satisfait, recommande nos services',
      source: 'website'
    }
  ];
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
    const updateData: any = {
      lead_status: newStatus,
      updated_at: new Date().toISOString()
    };

    if (newStatus === 'contacte') {
      updateData.contacted_at = new Date().toISOString();
    } else if (newStatus === 'devis_envoye') {
      updateData.devis_envoye_at = new Date().toISOString();
    } else if (newStatus === 'client') {
      updateData.client_at = new Date().toISOString();
    }

    if (additionalData?.primeRealisee) {
      updateData.prime_realisee = additionalData.primeRealisee;
    }

    if (additionalData?.notes) {
      updateData.notes = additionalData.notes;
    }

    const { error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId);

    if (error) {
      console.error('Supabase update error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to update lead status:', error);
    return false;
  }
}

export async function sendDevisEmail(leadId: string, devisFile?: File): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append('leadId', leadId);
    
    if (devisFile) {
      formData.append('devis', devisFile);
    }

    const response = await fetch('/api/lead-manager.php?action=send_devis', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Failed to send devis:', error);
    return false;
  }
}

export async function sendContractEmail(leadId: string, contractFile?: File): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append('leadId', leadId);
    
    if (contractFile) {
      formData.append('contract', contractFile);
    }

    const response = await fetch('/api/lead-manager.php?action=send_contract', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Failed to send contract:', error);
    return false;
  }
}

export function getLeadStatusColor(status: LeadStatus): string {
  const colors = {
    nouveau: 'bg-blue-100 text-blue-800',
    contacte: 'bg-yellow-100 text-yellow-800',
    devis_envoye: 'bg-purple-100 text-purple-800',
    client: 'bg-green-100 text-green-800',
    perdu: 'bg-red-100 text-red-800'
  };
  return colors[status];
}

export function getLeadStatusLabel(status: LeadStatus): string {
  const labels = {
    nouveau: 'Nouveau',
    contacte: 'Contacté',
    devis_envoye: 'Devis Envoyé',
    client: 'Client',
    perdu: 'Perdu'
  };
  return labels[status];
}