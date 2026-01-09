import { supabase } from './supabase';

export type CommunicationChannel = 'email' | 'sms' | 'whatsapp' | 'phone' | 'meeting';

export interface CommunicationMessage {
  id: string;
  lead_id: string;
  channel: CommunicationChannel;
  direction: 'inbound' | 'outbound';
  subject?: string;
  body: string;
  from?: string;
  to?: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'bounced';
  tracking_id?: string;
  opened_at?: string;
  clicked_at?: string;
  replied_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ChannelTemplate {
  id: string;
  name: string;
  channel: CommunicationChannel;
  template_type: string;
  subject?: string;
  body: string;
  variables: string[];
  is_active: boolean;
  open_rate?: number;
  reply_rate?: number;
  conversion_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface InboxMessage {
  id: string;
  lead_id: string;
  lead_name: string;
  channel: CommunicationChannel;
  direction: 'inbound' | 'outbound';
  snippet: string;
  status: 'unread' | 'read' | 'replied' | 'archived';
  sentiment?: 'positive' | 'neutral' | 'negative';
  requires_action: boolean;
  ai_summary?: string;
  ai_suggested_response?: string | null;
  received_at: string;
}

export const channelEngineService = {
  async sendMessage(message: {
    lead_id: string;
    channel: CommunicationChannel;
    subject?: string;
    body: string;
    template_id?: string;
    scheduled_for?: string;
    tracking_enabled?: boolean;
  }) {
    const functionMap = {
      email: 'send-crm-email',
      sms: 'send-sms',
      whatsapp: 'send-whatsapp'
    };

    const functionName = functionMap[message.channel];
    if (!functionName) {
      throw new Error(`Channel ${message.channel} not supported for sending`);
    }

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: {
        lead_id: message.lead_id,
        subject: message.subject,
        message: message.body,
        template_id: message.template_id,
        scheduled_for: message.scheduled_for,
        tracking_enabled: message.tracking_enabled !== false
      }
    });

    if (error) throw error;

    const { data: messageRecord, error: insertError } = await supabase
      .from('crm_communications')
      .insert({
        lead_id: message.lead_id,
        channel: message.channel,
        direction: 'outbound',
        subject: message.subject,
        body: message.body,
        status: 'sent',
        tracking_id: data?.tracking_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return messageRecord;
  },

  async getInbox(filters?: {
    status?: InboxMessage['status'];
    channel?: CommunicationChannel;
    requiresAction?: boolean;
  }) {
    // Charger les emails ENTRANTS depuis email_replies
    const { data: inboundData, error: inboundError } = await supabase
      .from('email_replies')
      .select(`
        id,
        lead_id,
        from_email,
        from_name,
        subject,
        body,
        replied_at,
        sentiment,
        is_processed,
        ai_summary,
        ai_response,
        crm_leads(id, first_name, last_name, email, phone)
      `)
      .order('replied_at', { ascending: false })
      .limit(50);

    // Charger les emails SORTANTS depuis email_sends
    const { data: outboundData, error: outboundError } = await supabase
      .from('email_sends')
      .select(`
        id,
        lead_id,
        email_to,
        email_from,
        subject,
        body_text,
        body_html,
        sent_at,
        status,
        delivered_at,
        crm_leads(id, first_name, last_name, email, phone)
      `)
      .order('sent_at', { ascending: false })
      .limit(50);

    const inboundMessages: InboxMessage[] = (inboundData || []).map((reply: any) => ({
      id: `in-${reply.id}`,
      lead_id: reply.lead_id || '',
      lead_name: reply.crm_leads?.first_name
        ? `${reply.crm_leads.first_name} ${reply.crm_leads.last_name}`.trim()
        : reply.from_name || reply.from_email,
      channel: 'email' as CommunicationChannel,
      direction: 'inbound' as const,
      snippet: reply.body?.substring(0, 200) || reply.subject || '',
      status: reply.is_processed ? 'read' : 'unread',
      sentiment: reply.sentiment as any,
      requires_action: !reply.is_processed,
      ai_summary: reply.ai_summary,
      ai_suggested_response: reply.ai_response,
      received_at: reply.replied_at
    }));

    const outboundMessages: InboxMessage[] = (outboundData || []).map((send: any) => ({
      id: `out-${send.id}`,
      lead_id: send.lead_id || '',
      lead_name: send.crm_leads?.first_name
        ? `${send.crm_leads.first_name} ${send.crm_leads.last_name}`.trim()
        : send.email_to,
      channel: 'email' as CommunicationChannel,
      direction: 'outbound' as const,
      snippet: (send.body_text || send.body_html)?.substring(0, 200) || send.subject || '',
      status: 'read',
      sentiment: 'neutral' as any,
      requires_action: false,
      ai_summary: `Email envoyé le ${new Date(send.sent_at).toLocaleDateString('fr-FR')}`,
      ai_suggested_response: null,
      received_at: send.sent_at
    }));

    // Combiner et trier par date
    const allMessages = [...inboundMessages, ...outboundMessages].sort((a, b) => {
      return new Date(b.received_at).getTime() - new Date(a.received_at).getTime();
    });

    return allMessages;
  },

  async getConversation(leadId: string, channel?: CommunicationChannel) {
    let query = supabase
      .from('crm_communications')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true });

    if (channel) {
      query = query.eq('channel', channel);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as CommunicationMessage[];
  },

  async markAsRead(messageId: string) {
    const { data, error } = await supabase
      .from('email_replies')
      .update({ is_processed: true })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markAsReplied(messageId: string) {
    const { data, error } = await supabase
      .from('email_replies')
      .update({ is_processed: true })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async archiveMessage(messageId: string) {
    const { data, error } = await supabase
      .from('email_replies')
      .update({ is_processed: true })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getTemplates(channel?: CommunicationChannel) {
    let query = supabase
      .from('crm_smart_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (channel) {
      query = query.eq('channel', channel);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as ChannelTemplate[];
  },

  async generateAIResponse(messageId: string, context?: any) {
    const { data, error } = await supabase.functions.invoke('ai-email-responder', {
      body: {
        message_id: messageId,
        context
      }
    });

    if (error) throw error;
    return data;
  },

  async getMessageAnalytics(leadId?: string, dateFrom?: string, dateTo?: string) {
    const { data, error } = await supabase.rpc('get_crm_message_analytics', {
      p_lead_id: leadId,
      p_date_from: dateFrom,
      p_date_to: dateTo
    });

    if (error) {
      return {
        total_sent: 0,
        total_received: 0,
        avg_response_time: 0,
        by_channel: {},
        by_status: {}
      };
    }

    return data;
  },

  async trackEmailOpen(trackingId: string) {
    const { error } = await supabase.functions.invoke('track-email-open', {
      body: { tracking_id: trackingId }
    });

    if (error) throw error;
  },

  async trackEmailClick(trackingId: string, url: string) {
    const { error } = await supabase.functions.invoke('track-email-click', {
      body: { tracking_id: trackingId, url }
    });

    if (error) throw error;
  },

  async getUnreadCount() {
    const { count, error } = await supabase
      .from('email_replies')
      .select('*', { count: 'exact', head: true })
      .eq('is_processed', false);

    if (error) throw error;
    return count || 0;
  },

  async getRequiresActionCount() {
    const { count, error } = await supabase
      .from('email_replies')
      .select('*', { count: 'exact', head: true })
      .eq('is_processed', false);

    if (error) throw error;
    return count || 0;
  }
};
