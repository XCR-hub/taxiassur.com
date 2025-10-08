import { Prospect, Consent, Outreach, Directory, Backlink, Campaign } from './schema';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey } from './env';

// Supabase client (optional)
const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseAnonKey();

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Generic CRUD operations for partnership data
async function fetchLocalContent<T>(type: string, schema: any): Promise<T[]> {
  try {
    const response = await fetch(`/content/${type}/`);
    if (!response.ok) {
      // Try individual files
      const items: T[] = [];
      let index = 0;
      
      while (true) {
        try {
          const fileResponse = await fetch(`/content/${type}/index-${index}.json`);
          if (!fileResponse.ok) break;
          
          const data = await fileResponse.json();
          const validated = schema.parse(data);
          items.push(validated);
          index++;
        } catch {
          break;
        }
      }
      
      return items;
    }
    
    const html = await response.text();
    const fileLinks = html.match(/href="([^"]*\.json)"/g) || [];
    const items: T[] = [];
    
    for (const link of fileLinks) {
      const filename = link.match(/href="([^"]*)"/)?.[1];
      if (filename) {
        try {
          const fileResponse = await fetch(`/content/${type}/${filename}`);
          if (fileResponse.ok) {
            const data = await fileResponse.json();
            const validated = schema.parse(data);
            items.push(validated);
          }
        } catch (error) {
          console.warn(`Failed to load ${filename}:`, error);
        }
      }
    }
    
    return items;
  } catch (error) {
    console.warn(`Failed to load ${type} content:`, error);
    return [];
  }
}

async function saveContent<T>(type: string, id: string, data: T): Promise<boolean> {
  try {
    const response = await fetch('/webhooks/make.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MAKE-SECRET': import.meta.env.VITE_MAKE_SECRET || 'change_me_secure_token_2024'
      },
      body: JSON.stringify({
        type,
        action: 'upsert',
        payload: { id, ...data }
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error(`Failed to save ${type}:`, error);
    return false;
  }
}

// Prospects
export async function getProspects(): Promise<Prospect[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .order('discoveredAt', { ascending: false });
      
      if (!error && data) {
        return data.map(item => ProspectSchema.parse(item));
      }
    } catch (error) {
      console.warn('Supabase prospects fetch failed, falling back to local:', error);
    }
  }
  
  return await fetchLocalContent<Prospect>('prospects', ProspectSchema);
}

export async function saveProspect(prospect: Prospect): Promise<boolean> {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('prospects')
        .upsert(prospect);
      
      if (!error) return true;
    } catch (error) {
      console.warn('Supabase prospect save failed, falling back to local:', error);
    }
  }
  
  return await saveContent('prospects', prospect.id, prospect);
}

export async function batchSaveProspects(prospects: Prospect[]): Promise<boolean> {
  try {
    const response = await fetch('/webhooks/make.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MAKE-SECRET': import.meta.env.VITE_MAKE_SECRET || 'change_me_secure_token_2024'
      },
      body: JSON.stringify({
        type: 'prospect_batch',
        action: 'upsert',
        payload: prospects
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to batch save prospects:', error);
    return false;
  }
}

// Consent Management
export async function getConsents(): Promise<Consent[]> {
  return await fetchLocalContent<Consent>('consents', ConsentSchema);
}

export async function saveConsent(consent: Consent): Promise<boolean> {
  return await saveContent('consents', consent.id, consent);
}

export async function recordOptOut(email: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(`/webhooks/make.php?action=optout&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`, {
      method: 'POST'
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to record opt-out:', error);
    return false;
  }
}

// Outreach Management
export async function getOutreaches(): Promise<Outreach[]> {
  return await fetchLocalContent<Outreach>('outreach', OutreachSchema);
}

export async function saveOutreach(outreach: Outreach): Promise<boolean> {
  return await saveContent('outreach', outreach.id, outreach);
}

export async function sendOutreach(outreach: Outreach): Promise<boolean> {
  try {
    const response = await fetch('/webhooks/make.php?action=send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MAKE-SECRET': import.meta.env.VITE_MAKE_SECRET || 'change_me_secure_token_2024'
      },
      body: JSON.stringify({
        to: outreach.recipientEmail,
        subject: outreach.subject,
        body: outreach.body,
        unsubscribeToken: outreach.unsubscribeToken,
        campaignId: outreach.campaignId
      })
    });
    
    if (response.ok) {
      // Update outreach status
      const updatedOutreach = {
        ...outreach,
        status: 'sent' as const,
        sentAt: new Date().toISOString()
      };
      await saveOutreach(updatedOutreach);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to send outreach:', error);
    return false;
  }
}

// Directory Management
export async function getDirectories(): Promise<Directory[]> {
  try {
    const response = await fetch('/src/data/directories.json');
    if (!response.ok) return [];
    
    const data = await response.json();
    return Array.isArray(data) ? data.map(item => DirectorySchema.parse(item)) : [];
  } catch (error) {
    console.warn('Failed to load directories:', error);
    return [];
  }
}

export async function submitToDirectory(directoryId: string, submissionData: Record<string, any>): Promise<boolean> {
  try {
    const response = await fetch('/webhooks/make.php?action=directorySubmit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MAKE-SECRET': import.meta.env.VITE_MAKE_SECRET || 'change_me_secure_token_2024'
      },
      body: JSON.stringify({
        directoryId,
        submissionData
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to submit to directory:', error);
    return false;
  }
}

// Backlink Management
export async function getBacklinks(): Promise<Backlink[]> {
  return await fetchLocalContent<Backlink>('backlinks', BacklinkSchema);
}

export async function saveBacklink(backlink: Backlink): Promise<boolean> {
  return await saveContent('backlinks', backlink.id, backlink);
}

export async function verifyBacklink(url: string): Promise<{ exists: boolean; status?: number }> {
  try {
    const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    return { exists: response.ok, status: response.status };
  } catch {
    return { exists: false };
  }
}

// Campaign Management
export async function getCampaigns(): Promise<Campaign[]> {
  return await fetchLocalContent<Campaign>('campaigns', CampaignSchema);
}

export async function saveCampaign(campaign: Campaign): Promise<boolean> {
  return await saveContent('campaigns', campaign.id, campaign);
}

// Analytics and Reporting
export async function getPartnershipStats(): Promise<{
  totalProspects: number;
  qualifiedProspects: number;
  activePartners: number;
  totalBacklinks: number;
  campaignStats: {
    totalSent: number;
    deliveryRate: number;
    openRate: number;
    replyRate: number;
  };
}> {
  const [prospects, outreaches, backlinks] = await Promise.all([
    getProspects(),
    getOutreaches(),
    getBacklinks()
  ]);
  
  const totalSent = outreaches.filter(o => o.status === 'sent' || o.status === 'delivered').length;
  const delivered = outreaches.filter(o => o.status === 'delivered').length;
  const opened = outreaches.filter(o => o.status === 'opened').length;
  const replied = outreaches.filter(o => o.status === 'replied').length;
  
  return {
    totalProspects: prospects.length,
    qualifiedProspects: prospects.filter(p => p.status === 'qualified').length,
    activePartners: prospects.filter(p => p.status === 'partner').length,
    totalBacklinks: backlinks.filter(b => b.status === 'active').length,
    campaignStats: {
      totalSent,
      deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      replyRate: delivered > 0 ? (replied / delivered) * 100 : 0
    }
  };
}