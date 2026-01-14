import { Lead } from './schema';
import { SecureLead } from './security';
import { supabase } from './supabase';
import { logger } from '@/lib/logger';

export async function submitLead(leadData: Lead): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/lead.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(leadData)
    });
    
    const result = await response.json();
    
    if (response.ok && (result.success || result.ok)) {
      return { success: true };
    } else {
      return { success: false, error: result.error || 'Erreur lors de l\'envoi' };
    }
  } catch (error) {
    logger.error('Lead submission error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur de connexion' 
    };
  }
}

export async function submitSecureLead(leadData: SecureLead): Promise<{ success: boolean; error?: string; accessToken?: string }> {
  try {
    const { data: leadRecord, error: dbError } = await supabase
      .from('leads')
      .insert({
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        city: leadData.city,
        status: leadData.status,
        immatriculation: leadData.immatriculation,
        fingerprint: leadData.fingerprint,
        behavior_score: leadData.behaviorScore,
        time_on_page: leadData.timeOnPage,
        source: 'website_form',
        lead_status: 'nouveau'
      })
      .select('*, access_token')
      .single();

    if (dbError) {
      logger.error('Database error:', dbError);
      return { success: false, error: 'Erreur lors de l\'enregistrement' };
    }

    logger.info(`Lead created: ${leadRecord.id}`);

    sendLeadNotificationEmails({
      lead_id: leadRecord.id,
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone,
      city: leadData.city,
      status: leadData.status,
      immatriculation: leadData.immatriculation || '',
      access_token: leadRecord.access_token
    }).catch(err => {
      logger.warn('Email notification failed (non-blocking):', err);
    });

    return {
      success: true,
      accessToken: leadRecord?.access_token
    };
  } catch (error) {
    logger.error('Secure lead submission error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de connexion'
    };
  }
}

async function sendLeadNotificationEmails(lead: {
  lead_id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  immatriculation: string;
  access_token?: string;
}): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('send-lead-notification', {
      body: lead
    });

    if (error) {
      logger.error('Notification edge function error:', error);
      throw error;
    }

    if (data?.success) {
      logger.info(`Notifications sent: ${data.emails_sent} emails`);
    } else {
      logger.warn('Notification response:', data);
    }
  } catch (err) {
    logger.error('Failed to send notifications:', err);
    throw err;
  }
}

// Fonction pour declencher les analytics si configures
export function trackLeadSubmission(leadData: Partial<Lead>) {
  // Google Analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', 'lead_submission', {
      event_category: 'engagement',
      event_label: leadData.status,
      value: 1
    });
  }
  
  // Meta Pixel
  if (typeof fbq !== 'undefined') {
    fbq('track', 'Lead', {
      content_category: 'insurance',
      content_name: 'taxi_insurance_quote'
    });
  }
}