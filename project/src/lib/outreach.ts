import { OutreachSchema, type Outreach } from './schema';
import outreachTemplates from '../data/outreach-templates.json';

export type Template = {
  id: string;
  label: string;
  subject: string;
  body: string;
};

export function getTemplates(): Template[] {
  return outreachTemplates;
}

export function renderTemplate(template: Template, variables: Record<string, string>): {
  subject: string;
  body: string;
} {
  const replaceVars = (text: string) => {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `{{${key}}}`);
  };
  
  return {
    subject: replaceVars(template.subject),
    body: replaceVars(template.body)
  };
}

export function generateUnsubscribeToken(email: string): string {
  const secret = import.meta.env.VITE_MAKE_SECRET || 'change_me_secure_token_2024';
  const data = `${email}::${secret}::${Date.now()}`;
  
  // Simple hash for demo - use crypto.subtle.digest in production
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

export function generateUnsubscribeUrl(email: string, token: string): string {
  const baseUrl = import.meta.env.VITE_SITE_URL || 'https://taxiassur.com';
  return `${baseUrl}/webhooks/make.php?action=optout&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
}

// Rate limiting for outreach
class OutreachRateLimiter {
  private static lastSend = 0;
  private static hourlyCount = 0;
  private static maxPerHour = 30;
  
  static async throttle(): Promise<void> {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    // Reset hourly counter
    const lastHour = localStorage.getItem('outreach_last_hour');
    const currentHour = new Date().getHours().toString();
    
    if (lastHour !== currentHour) {
      this.hourlyCount = 0;
      localStorage.setItem('outreach_last_hour', currentHour);
      localStorage.setItem('outreach_hourly_count', '0');
    } else {
      this.hourlyCount = parseInt(localStorage.getItem('outreach_hourly_count') || '0');
    }
    
    if (this.hourlyCount >= this.maxPerHour) {
      throw new Error(`Limite horaire atteinte (${this.maxPerHour} emails/heure)`);
    }
    
    // Minimum 2 seconds between sends
    const timeSinceLastSend = now - this.lastSend;
    const minInterval = 2000;
    
    if (timeSinceLastSend < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastSend));
    }
    
    this.lastSend = Date.now();
    this.hourlyCount++;
    localStorage.setItem('outreach_hourly_count', this.hourlyCount.toString());
  }
  
  static getRemainingQuota(): number {
    const used = parseInt(localStorage.getItem('outreach_hourly_count') || '0');
    return Math.max(0, this.maxPerHour - used);
  }
}

export async function sendEmail(outreach: Outreach): Promise<{
  success: boolean;
  error?: string;
  unsubscribeUrl?: string;
}> {
  try {
    await OutreachRateLimiter.throttle();
    
    const unsubscribeUrl = generateUnsubscribeUrl(outreach.recipientEmail, outreach.unsubscribeToken);
    
    // Add unsubscribe footer to body
    const bodyWithUnsubscribe = `${outreach.body}\n\n---\nPour vous désinscrire de nos communications : ${unsubscribeUrl}\n\nTaxiAssur.com - Excellence Coverage Risks\nCourtier agréé ORIAS 11 061 425`;
    
    const response = await fetch('/webhooks/make.php?action=send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MAKE-SECRET': import.meta.env.VITE_MAKE_SECRET || 'change_me_secure_token_2024'
      },
      body: JSON.stringify({
        to: outreach.recipientEmail,
        subject: outreach.subject,
        body: bodyWithUnsubscribe,
        unsubscribeToken: outreach.unsubscribeToken,
        campaignId: outreach.campaignId
      })
    });
    
    if (response.ok) {
      return { success: true, unsubscribeUrl };
    } else {
      const error = await response.text();
      return { success: false, error };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}

export function validateEmailContent(subject: string, body: string): {
  valid: boolean;
  warnings: string[];
  spamScore: number;
} {
  const warnings: string[] = [];
  let spamScore = 0;
  
  // Spam trigger words
  const spamWords = [
    'gratuit', 'urgent', 'limité', 'maintenant', 'cliquez ici',
    'garantie', 'argent', 'promotion', 'offre spéciale'
  ];
  
  const text = (subject + ' ' + body).toLowerCase();
  
  spamWords.forEach(word => {
    const matches = (text.match(new RegExp(word, 'g')) || []).length;
    if (matches > 0) {
      spamScore += matches * 5;
      if (matches > 2) {
        warnings.push(`Mot "${word}" utilisé ${matches} fois (risque spam)`);
      }
    }
  });
  
  // Check for excessive caps
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.3) {
    spamScore += 20;
    warnings.push('Trop de majuscules (risque spam)');
  }
  
  // Check for excessive exclamation marks
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 3) {
    spamScore += 10;
    warnings.push('Trop de points d\'exclamation');
  }
  
  // Check for unsubscribe link
  if (!body.includes('désinscrire') && !body.includes('unsubscribe')) {
    warnings.push('Lien de désinscription manquant');
    spamScore += 15;
  }
  
  return {
    valid: spamScore < 50,
    warnings,
    spamScore
  };
}

export function generatePersonalizedVariables(prospect: Prospect): Record<string, string> {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://taxiassur.com';
  
  return {
    org: prospect.name || prospect.domain,
    domain: prospect.domain,
    exampleUrl: `${siteUrl}/blog/assurance-taxi-2024`,
    offerUrl: `${siteUrl}/offres`,
    resourceUrl: `${siteUrl}/guides`,
    unsubscribeUrl: generateUnsubscribeUrl(prospect.publicEmail || '', generateUnsubscribeToken(prospect.publicEmail || '')),
    siteUrl,
    companyName: 'TaxiAssur',
    phone: '01 80 85 57 86',
    email: 'team@taxiassur.com'
  };
}