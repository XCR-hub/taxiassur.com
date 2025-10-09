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
    console.log('🔍 Fetching leads from Supabase...');
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return [];
    }

    console.log('✅ Supabase response received');
    console.log(`📊 Found ${data?.length || 0} leads in database`);

    if (!data || data.length === 0) {
      console.warn('⚠️ No leads found in database');
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
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing');
      return false;
    }

    // Récupérer le lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('Lead not found:', leadError);
      return false;
    }

    // Envoyer email via edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        to: lead.email,
        subject: `Votre devis d'assurance taxi - TaxiAssur`,
        html: `
          <h2>Bonjour ${lead.name},</h2>
          <p>Nous avons le plaisir de vous transmettre votre devis personnalisé pour votre assurance taxi.</p>
          <p>Notre équipe reste à votre disposition pour toute question au <strong>01 XX XX XX XX</strong>.</p>
          <p>Cordialement,<br>L'équipe TaxiAssur</p>
        `,
        attachments: devisFile ? [await fileToBase64(devisFile)] : undefined
      })
    });

    if (!response.ok) {
      throw new Error('Email sending failed');
    }

    // Mettre à jour le statut
    await updateLeadStatus(leadId, 'devis_envoye');

    return true;
  } catch (error) {
    console.error('Failed to send devis:', error);
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

export async function sendContractEmail(leadId: string, contractFile?: File): Promise<boolean> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing');
      return false;
    }

    // Récupérer le lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('Lead not found:', leadError);
      return false;
    }

    // Envoyer email via edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        to: lead.email,
        subject: `Votre contrat d'assurance taxi - TaxiAssur`,
        html: `
          <h2>Bonjour ${lead.name},</h2>
          <p>Félicitations ! Votre contrat d'assurance taxi est prêt.</p>
          <p>Vous trouverez en pièce jointe votre contrat à signer et à nous retourner.</p>
          <p>Notre équipe reste à votre disposition au <strong>01 XX XX XX XX</strong>.</p>
          <p>Cordialement,<br>L'équipe TaxiAssur</p>
        `,
        attachments: contractFile ? [await fileToBase64(contractFile)] : undefined
      })
    });

    if (!response.ok) {
      throw new Error('Email sending failed');
    }

    // Mettre à jour le statut
    await updateLeadStatus(leadId, 'client');

    return true;
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

// Function to create test leads if database is empty
export async function createTestLeads(): Promise<boolean> {
  try {
    console.log('🧪 Creating test leads...');

    const testLeads = [
      {
        name: 'Jean Dupont',
        email: 'jean.dupont@example.com',
        phone: '0612345678',
        city: 'Paris',
        status: 'taxi',
        immatriculation: 'AB-123-CD',
        lead_status: 'nouveau',
        source: 'website',
        created_at: new Date().toISOString()
      },
      {
        name: 'Marie Martin',
        email: 'marie.martin@example.com',
        phone: '0698765432',
        city: 'Lyon',
        status: 'taxi',
        immatriculation: 'EF-456-GH',
        lead_status: 'contacte',
        source: 'website',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        contacted_at: new Date().toISOString()
      },
      {
        name: 'Ahmed Benali',
        email: 'ahmed.benali@example.com',
        phone: '0123456789',
        city: 'Marseille',
        status: 'vtc',
        lead_status: 'devis_envoye',
        source: 'website',
        created_at: new Date(Date.now() - 172800000).toISOString(),
        contacted_at: new Date(Date.now() - 86400000).toISOString(),
        devis_envoye_at: new Date().toISOString()
      }
    ];

    const { data, error } = await supabase
      .from('leads')
      .insert(testLeads)
      .select();

    if (error) {
      console.error('❌ Error creating test leads:', error);
      return false;
    }

    console.log('✅ Test leads created successfully:', data?.length);
    return true;
  } catch (error) {
    console.error('❌ Failed to create test leads:', error);
    return false;
  }
}