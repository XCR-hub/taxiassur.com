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
  metadata?: Record<string, unknown>;
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

type InboxSentiment = NonNullable<InboxMessage['sentiment']>;

function normalizeSentiment(sentiment?: string): InboxSentiment | undefined {
  if (sentiment === 'positive' || sentiment === 'neutral' || sentiment === 'negative') {
    return sentiment;
  }

  return undefined;
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
    tracking_consent?: boolean;
    tracking_purpose?: string;
  }) {
    const functionMap = {
      email: 'send-crm-email',
      sms: 'send-sms-brevo',
      whatsapp: 'send-whatsapp'
    };

    const functionName = functionMap[message.channel];
    if (!functionName) {
      throw new Error(`Channel ${message.channel} not supported for sending`);
    }

    const { data: lead, error: leadError } = await supabase
      .from('crm_leads')
      .select('email, phone')
      .eq('id', message.lead_id)
      .single();
    if (leadError || !lead) throw leadError || new Error('Lead introuvable');

    const commonPayload = { lead_id: message.lead_id };
    const payload = message.channel === 'email'
      ? {
          ...commonPayload,
          to: lead.email,
          subject: message.subject,
          content: message.body,
          template_id: message.template_id,
          scheduled_for: message.scheduled_for,
          tracking_enabled: message.tracking_enabled === true,
          tracking_consent: message.tracking_consent === true,
          tracking_purpose: message.tracking_purpose || 'crm_channel_message'
        }
      : message.channel === 'sms'
        ? { ...commonPayload, to: lead.phone, content: message.body }
        : { ...commonPayload, to: lead.phone, message: message.body };

    const { data, error } = await supabase.functions.invoke(functionName, { body: payload });
    if (error || data?.success !== true) {
      throw error || new Error(`${message.channel} non envoyé`);
    }
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
    console.log('📥 Chargement inbox avec filtres:', filters);

    // Charger les emails ENTRANTS depuis email_inbox (table correcte)
    const { data: inboundData, error: inboundError } = await supabase
      .from('email_inbox')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(50);

    if (inboundError) {
      console.error('Erreur chargement emails entrants:', inboundError);
    }

    console.log('📧 Emails inbox trouvés:', inboundData?.length || 0);

    // Charger les emails SORTANTS depuis email_sends
    const { data: outboundData, error: outboundError } = await supabase
      .from('email_sends')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(50);

    if (outboundError) {
      console.error('Erreur chargement emails sortants:', outboundError);
    }

    console.log('📤 Emails envoyés trouvés:', outboundData?.length || 0);

    type InboundRow = { id: string; lead_id?: string; from_name?: string; from_email?: string; body?: string; subject?: string; processed?: boolean; sentiment?: string; ai_summary?: string; ai_response?: string; received_at?: string };
    const inboundMessages: InboxMessage[] = (inboundData as InboundRow[] || []).map((inbox) => ({
      id: `in-${inbox.id}`,
      lead_id: inbox.lead_id || '',
      lead_name: inbox.from_name || inbox.from_email || 'Inconnu',
      channel: 'email' as CommunicationChannel,
      direction: 'inbound' as const,
      snippet: inbox.body?.substring(0, 200) || inbox.subject || '',
      status: inbox.processed ? 'read' : 'unread',
      sentiment: normalizeSentiment(inbox.sentiment),
      requires_action: !inbox.processed,
      ai_summary: inbox.ai_summary,
      ai_suggested_response: inbox.ai_response,
      received_at: inbox.received_at
    }));

    type OutboundRow = { id: string; lead_id?: string; email_to?: string; body_text?: string; body_html?: string; subject?: string; sent_at?: string };
    const outboundMessages: InboxMessage[] = (outboundData as OutboundRow[] || []).map((send) => ({
      id: `out-${send.id}`,
      lead_id: send.lead_id || '',
      lead_name: send.email_to || 'Inconnu',
      channel: 'email' as CommunicationChannel,
      direction: 'outbound' as const,
      snippet: (send.body_text || send.body_html)?.substring(0, 200) || send.subject || '',
      status: 'read',
      sentiment: 'neutral',
      requires_action: false,
      ai_summary: `Email envoyé le ${new Date(send.sent_at).toLocaleDateString('fr-FR')}`,
      ai_suggested_response: null,
      received_at: send.sent_at
    }));

    console.log(`📥 Emails entrants: ${inboundMessages.length}`);
    console.log(`📤 Emails sortants: ${outboundMessages.length}`);

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
    // Retirer le préfixe "in-" ou "out-" si présent
    const realId = messageId.replace(/^(in-|out-)/, '');

    const { data, error } = await supabase
      .from('email_inbox')
      .update({ processed: true })
      .eq('id', realId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markAsReplied(messageId: string) {
    const realId = messageId.replace(/^(in-|out-)/, '');

    const { data, error } = await supabase
      .from('email_inbox')
      .update({ processed: true })
      .eq('id', realId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async archiveMessage(messageId: string) {
    const realId = messageId.replace(/^(in-|out-)/, '');

    const { data, error } = await supabase
      .from('email_inbox')
      .update({ processed: true })
      .eq('id', realId)
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

  async generateAIResponse(messageId: string, context?: Record<string, unknown>) {
    // Retirer le préfixe "in-" ou "out-" si présent
    const realId = messageId.replace(/^(in-|out-)/, '');

    console.log('🤖 Génération réponse IA pour:', realId);

    const { data, error } = await supabase.functions.invoke('generate-inbox-response', {
      body: {
        message_id: realId,
        context
      }
    });

    if (error) {
      console.error('❌ Erreur génération IA:', error);
      throw error;
    }

    console.log('✅ Réponse IA générée:', data?.response?.substring(0, 100));
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

  async getUnreadCount() {
    const { count, error } = await supabase
      .from('email_inbox')
      .select('*', { count: 'exact', head: true })
      .eq('processed', false);

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
