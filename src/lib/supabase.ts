import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey, getSupabaseServiceRoleKey } from './env';
import { logger } from '@/lib/logger';

// Global singleton instances - prevents HMR duplicates
declare global {
  interface Window {
    __TAXIASSUR_SUPABASE__?: ReturnType<typeof createClient>;
    __TAXIASSUR_SUPABASE_ADMIN__?: ReturnType<typeof createClient>;
  }
}

// Singleton instance - created once and reused
let supabaseInstance: ReturnType<typeof createClient> | null = null;

const initSupabase = () => {
  // Check global instance first to prevent HMR duplicates
  if (typeof window !== 'undefined' && window.__TAXIASSUR_SUPABASE__) {
    return window.__TAXIASSUR_SUPABASE__;
  }

  if (supabaseInstance) {
    return supabaseInstance;
  }

  let supabaseUrl: string;
  let supabaseAnonKey: string;

  try {
    supabaseUrl = getSupabaseUrl();
    supabaseAnonKey = getSupabaseAnonKey();
  } catch (error) {
    logger.error('Supabase configuration error:', error);
    // Fallback to avoid app crash
    supabaseUrl = 'https://drohhxrkoequjphvabvq.supabase.co';
    supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'taxiassur-auth'
    }
  });

  // Store in window to prevent HMR duplicates
  if (typeof window !== 'undefined') {
    window.__TAXIASSUR_SUPABASE__ = supabaseInstance;
  }

  return supabaseInstance;
};

// Export singleton instance directly
export const supabase = initSupabase();

// Supabase ADMIN client with Service Role Key (WRITE operations from backoffice)
// Bypasses RLS - Use only for authenticated admin operations
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

export const getSupabaseAdmin = () => {
  // Check global instance first to prevent HMR duplicates
  if (typeof window !== 'undefined' && window.__TAXIASSUR_SUPABASE_ADMIN__) {
    return window.__TAXIASSUR_SUPABASE_ADMIN__;
  }

  if (!supabaseAdmin) {
    const supabaseUrl = getSupabaseUrl();
    const serviceRoleKey = getSupabaseServiceRoleKey();
    if (!serviceRoleKey) {
      throw new Error('Service Role Key not configured. Cannot perform admin operations.');
    }
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: 'taxiassur-admin-auth'
      }
    });

    // Store in window to prevent HMR duplicates
    if (typeof window !== 'undefined') {
      window.__TAXIASSUR_SUPABASE_ADMIN__ = supabaseAdmin;
    }
  }
  return supabaseAdmin;
};

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return import.meta.env.VITE_SUPABASE_URL &&
         import.meta.env.VITE_SUPABASE_ANON_KEY &&
         !import.meta.env.VITE_SUPABASE_URL.includes('placeholder');
};

// Types
export interface BacklinkOpportunity {
  id: string;
  domain: string;
  url: string;
  page_title: string;
  page_authority: number;
  domain_authority: number;
  anchor_text: string;
  linking_to: string;
  category: string;
  status: 'pending' | 'contacted' | 'accepted' | 'rejected' | 'ignored';
  contact_email?: string;
  estimated_traffic: number;
  relevance_score: number;
  last_contacted?: string;
  last_scan_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BacklinkCampaign {
  id: string;
  name: string;
  template_id?: string;
  target_min_da: number;
  target_category?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  sent_count: number;
  opened_count: number;
  replied_count: number;
  accepted_count: number;
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  id: string;
  opportunity_id: string;
  campaign_id?: string;
  email_type: 'initial' | 'followup' | 'accepted' | 'rejected' | 'thankyou';
  sent_at: string;
  opened_at?: string;
  clicked_at?: string;
  replied_at?: string;
  email_subject: string;
  email_body: string;
  sendgrid_message_id?: string;
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'failed';
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  email_type: 'initial' | 'followup' | 'thankyou';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScanHistory {
  id: string;
  scan_date: string;
  competitors_scanned: string[];
  opportunities_found: number;
  scan_duration_ms: number;
  status: 'success' | 'failed' | 'running';
  error_message?: string;
  created_at: string;
}

// API Functions
export const backlinkApi = {
  // Opportunities
  async getOpportunities(filters?: {
    status?: string;
    minDA?: number;
    category?: string;
  }) {
    let query = supabase
      .from('backlink_opportunities')
      .select('*')
      .order('relevance_score', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.minDA) {
      query = query.gte('domain_authority', filters.minDA);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as BacklinkOpportunity[];
  },

  async updateOpportunityStatus(
    id: string,
    status: BacklinkOpportunity['status'],
    notes?: string
  ) {
    const { data, error } = await supabase
      .from('backlink_opportunities')
      .update({
        status,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Campaigns
  async getCampaigns() {
    const { data, error } = await supabase
      .from('backlink_outreach_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as BacklinkCampaign[];
  },

  async createCampaign(campaign: Partial<BacklinkCampaign>) {
    const { data, error } = await supabase
      .from('backlink_outreach_campaigns')
      .insert(campaign)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Email Templates
  async getTemplates() {
    const { data, error } = await supabase
      .from('backlink_email_templates')
      .select('*')
      .eq('is_active', true)
      .order('email_type');

    if (error) throw error;
    return data as EmailTemplate[];
  },

  // Email Logs
  async getEmailLogs(opportunityId: string) {
    const { data, error } = await supabase
      .from('backlink_email_logs')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('sent_at', { ascending: false });

    if (error) throw error;
    return data as EmailLog[];
  },

  // Scan History
  async getScanHistory(limit = 10) {
    const { data, error } = await supabase
      .from('backlink_scan_history')
      .select('*')
      .order('scan_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as ScanHistory[];
  },

  // Edge Functions
  async triggerScan() {
    const { data, error } = await supabase.functions.invoke('scan-backlinks', {
      method: 'POST',
    });

    if (error) throw error;
    return data;
  },

  async sendOutreachEmails(payload: {
    opportunityIds: string[];
    campaignId?: string;
    templateId?: string;
    sendNow?: boolean;
  }) {
    const { data, error } = await supabase.functions.invoke('send-outreach-emails', {
      method: 'POST',
      body: payload,
    });

    if (error) throw error;
    return data;
  },

  async triggerFollowup() {
    const { data, error } = await supabase.functions.invoke('auto-followup', {
      method: 'POST',
    });

    if (error) throw error;
    return data;
  },

  // Stats
  async getStats() {
    const { data, error } = await supabase.rpc('get_backlink_stats');

    if (error) {
      // Fallback: manual calculation
      const opportunities = await this.getOpportunities();
      const stats = {
        total: opportunities.length,
        pending: opportunities.filter(o => o.status === 'pending').length,
        contacted: opportunities.filter(o => o.status === 'contacted').length,
        accepted: opportunities.filter(o => o.status === 'accepted').length,
        rejected: opportunities.filter(o => o.status === 'rejected').length,
        avgDA: Math.round(
          opportunities.reduce((sum, o) => sum + o.domain_authority, 0) / opportunities.length
        ),
        avgPA: Math.round(
          opportunities.reduce((sum, o) => sum + o.page_authority, 0) / opportunities.length
        ),
      };
      return stats;
    }

    return data;
  },
};
