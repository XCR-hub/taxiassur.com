import { supabase } from './supabase';
import type { CommunicationChannel } from './crm-channel-engine';

export interface SmartTemplate {
  id: string;
  name: string;
  description: string;
  channel: CommunicationChannel;
  template_type: string;
  category: 'sales' | 'support' | 'retention' | 'onboarding' | 'renewal' | 'recovery';
  subject?: string;
  body: string;
  variables: TemplateVariable[];
  ai_personalization_enabled: boolean;
  tone: 'formal' | 'friendly' | 'casual' | 'urgent';
  language: string;
  version: number;
  is_active: boolean;
  performance: {
    sent_count: number;
    open_rate?: number;
    reply_rate?: number;
    conversion_rate?: number;
  };
  ab_test_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface TemplateVariable {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'custom';
  default_value?: string;
  required: boolean;
  description?: string;
}

export interface ABTest {
  id: string;
  name: string;
  template_a_id: string;
  template_b_id: string;
  channel: CommunicationChannel;
  status: 'draft' | 'running' | 'paused' | 'completed';
  traffic_split: number;
  winner?: 'A' | 'B';
  results: {
    variant_a: ABTestVariantResults;
    variant_b: ABTestVariantResults;
  };
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export interface ABTestVariantResults {
  sent_count: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  conversion_rate: number;
  avg_response_time: number;
}

export interface TemplateComposer {
  lead_id: string;
  template_id?: string;
  channel: CommunicationChannel;
  to: string;
  subject?: string;
  body: string;
  variables?: Record<string, any>;
  scheduled_for?: string;
  use_ai_enhancement?: boolean;
}

export const templatesService = {
  async getTemplates(filters?: {
    channel?: CommunicationChannel;
    category?: SmartTemplate['category'];
    search?: string;
  }) {
    let query = supabase
      .from('crm_smart_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (filters?.channel) {
      query = query.eq('channel', filters.channel);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as SmartTemplate[];
  },

  async getTemplate(id: string) {
    const { data, error } = await supabase
      .from('crm_smart_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as SmartTemplate;
  },

  async createTemplate(template: Omit<SmartTemplate, 'id' | 'created_at' | 'updated_at' | 'performance'>) {
    const { data, error } = await supabase
      .from('crm_smart_templates')
      .insert({
        ...template,
        performance: {
          sent_count: 0,
          open_rate: 0,
          reply_rate: 0,
          conversion_rate: 0
        },
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTemplate(id: string, updates: Partial<SmartTemplate>) {
    const { data, error } = await supabase
      .from('crm_smart_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTemplate(id: string) {
    const { error } = await supabase
      .from('crm_smart_templates')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  async renderTemplate(templateId: string, variables: Record<string, any>) {
    const template = await this.getTemplate(templateId);

    let renderedSubject = template.subject || '';
    let renderedBody = template.body;

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      renderedSubject = renderedSubject.replace(placeholder, String(value));
      renderedBody = renderedBody.replace(placeholder, String(value));
    });

    return {
      subject: renderedSubject,
      body: renderedBody
    };
  },

  async renderWithAI(templateId: string, leadId: string, variables?: Record<string, any>) {
    const { data, error } = await supabase.functions.invoke('crm-ai-assistant', {
      body: {
        lead_id: leadId,
        agent: 'email_composer',
        action: 'enhance_template',
        context: {
          template_id: templateId,
          variables
        }
      }
    });

    if (error) throw error;
    return data;
  },

  async composeMessage(composer: TemplateComposer) {
    let content = {
      subject: composer.subject,
      body: composer.body
    };

    if (composer.template_id) {
      const variables = composer.variables || {};

      if (composer.use_ai_enhancement) {
        const enhanced = await this.renderWithAI(
          composer.template_id,
          composer.lead_id,
          variables
        );
        content = enhanced;
      } else {
        content = await this.renderTemplate(composer.template_id, variables);
      }
    }

    const { data, error } = await supabase.functions.invoke('send-crm-email', {
      body: {
        lead_id: composer.lead_id,
        to: composer.to,
        subject: content.subject,
        body: content.body,
        channel: composer.channel,
        scheduled_for: composer.scheduled_for,
        template_id: composer.template_id
      }
    });

    if (error) throw error;

    if (composer.template_id) {
      await this.incrementTemplateUsage(composer.template_id);
    }

    return data;
  },

  async incrementTemplateUsage(templateId: string) {
    const { error } = await supabase.rpc('increment_template_usage', {
      p_template_id: templateId
    });

    if (error) {
      const template = await this.getTemplate(templateId);
      await this.updateTemplate(templateId, {
        performance: {
          ...template.performance,
          sent_count: template.performance.sent_count + 1
        }
      });
    }
  },

  async getABTests(status?: ABTest['status']) {
    let query = supabase
      .from('crm_ab_tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as ABTest[];
  },

  async createABTest(test: Omit<ABTest, 'id' | 'created_at' | 'results'>) {
    const { data, error } = await supabase
      .from('crm_ab_tests')
      .insert({
        ...test,
        results: {
          variant_a: {
            sent_count: 0,
            open_rate: 0,
            click_rate: 0,
            reply_rate: 0,
            conversion_rate: 0,
            avg_response_time: 0
          },
          variant_b: {
            sent_count: 0,
            open_rate: 0,
            click_rate: 0,
            reply_rate: 0,
            conversion_rate: 0,
            avg_response_time: 0
          }
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateABTest(id: string, updates: Partial<ABTest>) {
    const { data, error } = await supabase
      .from('crm_ab_tests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async determineABTestWinner(testId: string) {
    const test = await supabase
      .from('crm_ab_tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (test.error) throw test.error;

    const { variant_a, variant_b } = test.data.results;

    const scoreA =
      variant_a.open_rate * 0.2 +
      variant_a.click_rate * 0.3 +
      variant_a.reply_rate * 0.3 +
      variant_a.conversion_rate * 0.2;

    const scoreB =
      variant_b.open_rate * 0.2 +
      variant_b.click_rate * 0.3 +
      variant_b.reply_rate * 0.3 +
      variant_b.conversion_rate * 0.2;

    const winner = scoreA > scoreB ? 'A' : 'B';

    await this.updateABTest(testId, {
      winner,
      status: 'completed',
      end_date: new Date().toISOString()
    });

    return { winner, scoreA, scoreB };
  },

  async cloneTemplate(templateId: string, newName: string) {
    const original = await this.getTemplate(templateId);

    const { id, created_at, updated_at, performance, ...templateData } = original;

    return await this.createTemplate({
      ...templateData,
      name: newName,
      version: 1
    });
  },

  async getTemplateVariables(body: string): TemplateVariable[] {
    const regex = /{{(\w+)}}/g;
    const matches = body.matchAll(regex);
    const variables: TemplateVariable[] = [];

    for (const match of matches) {
      const key = match[1];
      if (!variables.find(v => v.key === key)) {
        variables.push({
          key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: 'text',
          required: true
        });
      }
    }

    return variables;
  }
};
