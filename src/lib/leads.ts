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
      .from('leads')
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

export async function createLead(input: CreateLeadInput): Promise<{ success: boolean; error?: string; leadId?: string }> {
  try {
    logger.log('Creating lead in Supabase:', { name: input.name, email: input.email });

    const { data, error } = await supabase
      .from('leads')
      .insert({
        name: input.name,
        email: input.email,
        phone: input.phone,
        city: input.city,
        status: input.status,
        immatriculation: input.immatriculation || '',
        lead_status: 'nouveau',
        source: input.source || 'website',
        notes: input.notes || '',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error('Supabase error creating lead:', error);
      return { success: false, error: error.message };
    }

    logger.log('Lead created successfully:', data?.id);

    // Envoyer les emails de notification (ne pas attendre pour ne pas bloquer)
    sendLeadNotificationEmails(data).catch(err => {
      logger.warn('Email notification failed (non-blocking):', err);
    });

    return { success: true, leadId: data?.id };
  } catch (error: any) {
    logger.error('Failed to create lead:', error);
    return { success: false, error: error.message || 'Une erreur est survenue' };
  }
}

async function sendLeadNotificationEmails(lead: any): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    logger.warn('Supabase credentials not configured, skipping email');
    return;
  }

  // Email de confirmation au client
  const clientEmailSubject = '✅ Demande de devis reçue - TaxiAssur';
  const clientEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; max-width: 600px; margin: 0 auto; }
    .info-box { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; margin-top: 30px; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚕 TaxiAssur</h1>
    <p>Votre demande de devis a bien été reçue</p>
  </div>

  <div class="content">
    <p>Bonjour <strong>${lead.name}</strong>,</p>

    <p>Nous avons bien reçu votre demande de devis pour l'assurance taxi/VTC. Notre équipe va l'étudier dans les plus brefs délais.</p>

    <div class="info-box">
      <h3>📋 Récapitulatif de votre demande</h3>
      <ul>
        <li><strong>Nom:</strong> ${lead.name}</li>
        <li><strong>Email:</strong> ${lead.email}</li>
        <li><strong>Téléphone:</strong> ${lead.phone}</li>
        <li><strong>Ville:</strong> ${lead.city}</li>
        <li><strong>Type d'activité:</strong> ${lead.status || 'Non précisé'}</li>
        <li><strong>Immatriculation:</strong> ${lead.immatriculation || 'Non renseignée'}</li>
      </ul>
    </div>

    <p><strong>⏱️ Délai de réponse:</strong> Nous vous contacterons sous 24 heures ouvrées.</p>

    <p><strong>📞 Besoin d'aide ?</strong> N'hésitez pas à nous appeler au <strong>01 80 85 57 81</strong></p>

    <div style="text-align: center;">
      <a href="https://taxiassur.com" class="button">Visitez notre site</a>
    </div>
  </div>

  <div class="footer">
    <p><strong>TaxiAssur - L'assurance des professionnels du taxi et VTC</strong></p>
    <p>📧 team@taxiassur.com | ☎️ 01 80 85 57 81</p>
    <p style="margin-top: 15px; font-size: 0.85em;">
      Vous recevez cet email suite à votre demande de devis sur taxiassur.com
    </p>
  </div>
</body>
</html>`;

  // Email de notification à l'équipe
  const teamEmailSubject = `🎯 Nouveau lead: ${lead.name} - ${lead.city}`;
  const teamEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .lead-box { background: #f0fdf4; border: 2px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .info-line { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .footer { background: #f8f9fa; padding: 15px; text-align: center; margin-top: 20px; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎯 NOUVEAU LEAD</h1>
    <p>Demande de devis reçue</p>
  </div>

  <div class="content">
    <div class="lead-box">
      <h2>👤 Informations du Lead</h2>

      <div class="info-line">
        <strong>Nom:</strong> ${lead.name}
      </div>
      <div class="info-line">
        <strong>Email:</strong> <a href="mailto:${lead.email}">${lead.email}</a>
      </div>
      <div class="info-line">
        <strong>Téléphone:</strong> <a href="tel:${lead.phone}">${lead.phone}</a>
      </div>
      <div class="info-line">
        <strong>Ville:</strong> ${lead.city}
      </div>
      <div class="info-line">
        <strong>Type d'activité:</strong> ${lead.status || 'Non précisé'}
      </div>
      <div class="info-line">
        <strong>Immatriculation:</strong> ${lead.immatriculation || 'Non renseignée'}
      </div>
      <div class="info-line">
        <strong>Source:</strong> ${lead.source || 'website_form'}
      </div>
    </div>

    <p><strong>⚡ Action requise:</strong> Contacter ce lead dans les 24 heures pour maximiser les chances de conversion.</p>

    <div style="text-align: center;">
      <a href="https://taxiassur.com/backoffice/crm" class="button">Voir dans le CRM</a>
    </div>
  </div>

  <div class="footer">
    <p>TaxiAssur CRM - Notification automatique</p>
  </div>
</body>
</html>`;

  try {
    // Envoyer email au client
    const clientResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        to: lead.email,
        subject: clientEmailSubject,
        html: clientEmailHtml,
      }),
    });

    if (clientResponse.ok) {
      logger.log('✅ Email de confirmation envoyé au client:', lead.email);
    } else {
      const error = await clientResponse.text();
      logger.warn('⚠️ Erreur envoi email client:', error);
    }

    // Envoyer email à l'équipe
    const teamResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        to: 'team@taxiassur.com',
        subject: teamEmailSubject,
        html: teamEmailHtml,
      }),
    });

    if (teamResponse.ok) {
      logger.log('✅ Email de notification envoyé à l\'équipe');
    } else {
      const error = await teamResponse.text();
      logger.warn('⚠️ Erreur envoi email équipe:', error);
    }
  } catch (error) {
    logger.error('❌ Erreur lors de l\'envoi des emails:', error);
    throw error;
  }
}

