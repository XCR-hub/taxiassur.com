import { Consent, ConsentSchema } from './schema';
import { logger } from '@/lib/logger';

export interface DSRRequest {
  id: string;
  email: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction';
  requestedAt: string;
  processedAt?: string;
  status: 'pending' | 'processed' | 'rejected';
  response?: string;
  documents?: string[];
}

export interface ComplianceReport {
  totalConsents: number;
  activeConsents: number;
  optOuts: number;
  dsrRequests: number;
  retentionCompliance: {
    expiredRecords: number;
    scheduledDeletion: number;
  };
  lastAuditDate: string;
}

// GDPR Compliance utilities
export class GDPRCompliance {
  static async getConsentLedger(): Promise<Consent[]> {
    try {
      const response = await fetch('/content/consents/');
      if (!response.ok) return [];
      
      const html = await response.text();
      const fileLinks = html.match(/href="([^"]*\.json)"/g) || [];
      const consents: Consent[] = [];
      
      for (const link of fileLinks) {
        const filename = link.match(/href="([^"]*)"/)?.[1];
        if (filename) {
          try {
            const fileResponse = await fetch(`/content/consents/${filename}`);
            if (fileResponse.ok) {
              const contentType = fileResponse.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const data = await fileResponse.json();
                const validated = ConsentSchema.parse(data);
                consents.push(validated);
              }
            }
          } catch (error) {
            logger.warn(`Failed to load consent ${filename}:`, error);
          }
        }
      }
      
      return consents;
    } catch (error) {
      logger.warn('Failed to load consent ledger:', error);
      return [];
    }
  }

  static async exportPersonalData(email: string): Promise<{
    consents: Consent[];
    outreaches: any[];
    suppressions: any[];
  }> {
    const [consents, outreaches, suppressions] = await Promise.all([
      this.getConsentLedger(),
      this.getOutreachHistory(email),
      this.getSuppressionRecord(email)
    ]);
    
    return {
      consents: consents.filter(c => c.email === email),
      outreaches: outreaches.filter(o => o.recipientEmail === email),
      suppressions: suppressions.filter(s => s.email === email)
    };
  }

  static async deletePersonalData(email: string): Promise<boolean> {
    try {
      const response = await fetch('/webhooks/make.php?action=gdprDelete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MAKE-SECRET': import.meta.env.VITE_MAKE_SECRET || 'change_me_secure_token_2024'
        },
        body: JSON.stringify({ email })
      });
      
      return response.ok;
    } catch (error) {
      logger.error('Failed to delete personal data:', error);
      return false;
    }
  }

  static async getOutreachHistory(email: string): Promise<any[]> {
    try {
      const response = await fetch(`/content/outreach/`);
      if (!response.ok) return [];
      
      // Implementation would scan outreach files for this email
      return [];
    } catch {
      return [];
    }
  }

  static async getSuppressionRecord(email: string): Promise<any[]> {
    try {
      const response = await fetch('/content/suppressions.json');
      if (!response.ok) return [];

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return [];
      }

      const data = await response.json();
      return Object.values(data).filter((record: any) => record.email === email);
    } catch {
      return [];
    }
  }

  static calculateRetentionExpiry(collectedAt: string, retentionMonths: number): Date {
    const collected = new Date(collectedAt);
    collected.setMonth(collected.getMonth() + retentionMonths);
    return collected;
  }

  static async getExpiredRecords(): Promise<Consent[]> {
    const consents = await this.getConsentLedger();
    const now = new Date();
    
    return consents.filter(consent => {
      if (consent.optedOutAt) return false; // Already opted out
      
      const expiry = this.calculateRetentionExpiry(consent.collectedAt, consent.retentionMonths);
      return expiry < now;
    });
  }

  static async generateComplianceReport(): Promise<ComplianceReport> {
    const [consents, expiredRecords] = await Promise.all([
      this.getConsentLedger(),
      this.getExpiredRecords()
    ]);
    
    const activeConsents = consents.filter(c => !c.optedOutAt);
    const optOuts = consents.filter(c => c.optedOutAt);
    
    return {
      totalConsents: consents.length,
      activeConsents: activeConsents.length,
      optOuts: optOuts.length,
      dsrRequests: 0, // Would be tracked separately
      retentionCompliance: {
        expiredRecords: expiredRecords.length,
        scheduledDeletion: expiredRecords.length
      },
      lastAuditDate: new Date().toISOString()
    };
  }
}

// Email validation and deliverability
export class EmailValidator {
  private static disposableDomains = [
    '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
    'mailinator.com', 'yopmail.com', 'temp-mail.org',
    'throwaway.email', 'getnada.com', 'maildrop.cc'
  ];

  static validateEmail(email: string): {
    valid: boolean;
    reason?: string;
    deliverable?: boolean;
    disposable?: boolean;
  } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return { valid: false, reason: 'Format invalide' };
    }
    
    const domain = email.split('@')[1].toLowerCase();
    
    if (this.disposableDomains.includes(domain)) {
      return { 
        valid: false, 
        reason: 'Email temporaire non autorisé',
        disposable: true 
      };
    }
    
    // Additional checks could include MX record validation
    return { valid: true, deliverable: true, disposable: false };
  }

  static async checkDeliverability(email: string): Promise<{
    deliverable: boolean;
    reason?: string;
    mxRecords?: boolean;
  }> {
    // In a real implementation, this would check MX records
    // For now, we'll do basic validation
    const validation = this.validateEmail(email);
    
    return {
      deliverable: validation.valid,
      reason: validation.reason,
      mxRecords: validation.valid
    };
  }
}

// Campaign management
export class CampaignManager {
  static async createCampaign(
    name: string,
    templateId: string,
    prospects: string[],
    variables: Record<string, string> = {}
  ): Promise<string> {
    const campaignId = `campaign-${Date.now()}`;
    
    const campaign = {
      id: campaignId,
      name,
      templateId,
      targetType: 'prospects' as const,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      totalRecipients: prospects.length,
      variables
    };
    
    // Save campaign
    await fetch('/webhooks/make.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MAKE-SECRET': import.meta.env.VITE_MAKE_SECRET || 'change_me_secure_token_2024'
      },
      body: JSON.stringify({
        type: 'campaigns',
        action: 'upsert',
        payload: campaign
      })
    });
    
    return campaignId;
  }

  static async scheduleCampaign(campaignId: string, scheduledAt: string): Promise<boolean> {
    try {
      const response = await fetch('/webhooks/make.php?action=scheduleCampaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MAKE-SECRET': import.meta.env.VITE_MAKE_SECRET || 'change_me_secure_token_2024'
        },
        body: JSON.stringify({ campaignId, scheduledAt })
      });
      
      return response.ok;
    } catch (error) {
      logger.error('Failed to schedule campaign:', error);
      return false;
    }
  }
}