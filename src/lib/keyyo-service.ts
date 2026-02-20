/**
 * Service d'intégration Keyyo Softphone
 * Documentation: Guide Keyyo CTI/API/TAPI v1.6
 * API: https://ssl.keyyo.com/
 */

import { supabase } from './supabase';
import { logger } from './logger';

export interface KeyyoConfig {
  base_url: string;
  sip_login: string;
  sip_password: string;
  ip_whitelist: string;
  click_to_call_enabled: boolean;
  sms_enabled: boolean;
}

export interface KeyyoCall {
  id: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  status: string;
  start_time: string;
  end_time?: string;
  duration: number;
  recording_url?: string;
}

export class KeyyoService {
  private config: KeyyoConfig | null = null;
  private providerId: string | null = null;

  /**
   * Initialise le service Keyyo
   */
  async initialize(): Promise<boolean> {
    try {
      const { data: provider } = await supabase
        .from('telephony_providers')
        .select('*')
        .eq('name', 'keyyo')
        .eq('is_active', true)
        .single();

      if (!provider) {
        logger.warn('Keyyo provider not configured or inactive');
        return false;
      }

      this.config = provider.config as KeyyoConfig;
      this.providerId = provider.id;

      return true;
    } catch (error) {
      logger.error('Failed to initialize Keyyo service:', error);
      return false;
    }
  }

  /**
   * Vérifie si Keyyo est configuré et actif
   */
  async isConfigured(): Promise<boolean> {
    if (!this.config) {
      await this.initialize();
    }
    return this.config !== null && (!!this.config.sip_login || !!this.config.ip_whitelist);
  }

  /**
   * Click-to-Call: Initie un appel via Keyyo
   *
   * @param params.account - Numéro de ligne Keyyo au format international (ex: 33123456789)
   * @param params.callee - Numéro à appeler
   * @param params.calleeName - Nom de la personne appelée (optionnel)
   * @param params.caller - Pour une mise en relation (optionnel)
   * @param params.record - Enregistrer l'appel (envoi par email)
   * @param params.leadId - ID du lead dans le CRM
   */
  async initiateCall(params: {
    account: string;
    callee: string;
    calleeName?: string;
    caller?: string;
    record?: boolean;
    leadId?: string;
  }): Promise<{ success: boolean; callId?: string; error?: string }> {
    try {
      if (!await this.isConfigured()) {
        throw new Error('Keyyo is not configured');
      }

      logger.info('Initiating Keyyo call:', {
        account: params.account,
        callee: params.callee,
        leadId: params.leadId,
      });

      // Appel à l'Edge Function qui contactera l'API Keyyo
      const { data, error } = await supabase.functions.invoke('keyyo-click-to-call', {
        body: {
          account: params.account,
          callee: params.callee,
          callee_name: params.calleeName,
          caller: params.caller,
          record: params.record || false,
          lead_id: params.leadId,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to initiate call');
      }

      logger.info('Call initiated successfully:', data);

      return {
        success: true,
        callId: data.call_id,
      };
    } catch (error: any) {
      logger.error('Failed to initiate Keyyo call:', error);
      return {
        success: false,
        error: error.message || 'Failed to initiate call',
      };
    }
  }

  /**
   * Envoie un SMS via Keyyo
   *
   * @param params.account - Numéro de ligne Keyyo au format international
   * @param params.callee - Numéro du destinataire au format international
   * @param params.message - Contenu du SMS (max 160 caractères)
   */
  async sendSMS(params: {
    account: string;
    callee: string;
    message: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      if (!await this.isConfigured()) {
        throw new Error('Keyyo is not configured');
      }

      if (!this.config?.sms_enabled) {
        throw new Error('SMS not enabled in Keyyo configuration');
      }

      logger.info('Sending SMS via Keyyo:', {
        account: params.account,
        callee: params.callee,
      });

      // Appel à l'Edge Function
      const { data, error } = await supabase.functions.invoke('keyyo-send-sms', {
        body: {
          account: params.account,
          callee: params.callee,
          message: params.message,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send SMS');
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to send SMS:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS',
      };
    }
  }

  /**
   * Récupère l'historique des appels depuis la base de données
   */
  async fetchCallHistory(params: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    leadId?: string;
  } = {}): Promise<KeyyoCall[]> {
    try {
      let query = supabase
        .from('telephony_calls')
        .select('*')
        .eq('provider_id', this.providerId)
        .order('created_at', { ascending: false });

      if (params.userId) {
        query = query.eq('user_id', params.userId);
      }

      if (params.leadId) {
        query = query.eq('lead_id', params.leadId);
      }

      if (params.startDate) {
        query = query.gte('created_at', params.startDate.toISOString());
      }

      if (params.endDate) {
        query = query.lte('created_at', params.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((call: any) => ({
        id: call.id,
        direction: call.direction,
        from: call.from_number,
        to: call.to_number,
        status: call.status,
        start_time: call.initiated_at,
        end_time: call.ended_at,
        duration: call.duration_seconds || 0,
        recording_url: call.recording_url,
      }));
    } catch (error) {
      logger.error('Failed to fetch call history:', error);
      return [];
    }
  }

  /**
   * Enregistre un appel dans la base de données
   */
  async saveCall(params: {
    leadId?: string;
    userId: string;
    direction: 'inbound' | 'outbound';
    fromNumber: string;
    toNumber: string;
    status: string;
    duration: number;
    talkTime: number;
    notes?: string;
    externalId?: string;
  }): Promise<{ success: boolean; callId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('telephony_calls')
        .insert({
          provider_id: this.providerId,
          external_id: params.externalId || `manual_${Date.now()}`,
          lead_id: params.leadId,
          user_id: params.userId,
          direction: params.direction,
          from_number: params.fromNumber,
          to_number: params.toNumber,
          status: params.status,
          duration_seconds: params.duration,
          talk_time_seconds: params.talkTime,
          notes: params.notes,
          initiated_at: new Date(),
          ended_at: new Date(),
        })
        .select()
        .single();

      if (error) throw error;

      // Créer une interaction dans la timeline si lead_id existe
      if (params.leadId) {
        await supabase.from('crm_interactions').insert({
          lead_id: params.leadId,
          type: params.direction === 'inbound' ? 'call_incoming' : 'call_outgoing',
          channel: 'phone',
          direction: params.direction,
          subject: `Appel ${params.direction === 'inbound' ? 'entrant' : 'sortant'}`,
          content: params.notes || `Durée: ${Math.floor(params.talkTime / 60)} min`,
          metadata: {
            call_id: data.id,
            from: params.fromNumber,
            to: params.toNumber,
            duration: params.duration,
            talk_time: params.talkTime,
          },
        });
      }

      logger.info('Call saved successfully:', data.id);

      return { success: true, callId: data.id };
    } catch (error: any) {
      logger.error('Failed to save call:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Met à jour les notes d'un appel
   */
  async updateCallNotes(callId: string, notes: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('telephony_calls')
        .update({ notes, updated_at: new Date() })
        .eq('id', callId);

      if (error) throw error;

      return true;
    } catch (error) {
      logger.error('Failed to update call notes:', error);
      return false;
    }
  }

  /**
   * Récupère les statistiques d'appels pour un utilisateur
   */
  async getCallStatistics(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('telephony_calls')
        .select('*')
        .eq('user_id', userId)
        .eq('provider_id', this.providerId);

      if (error) throw error;

      const calls = data || [];

      const stats = {
        total_calls: calls.length,
        outbound: calls.filter((c: any) => c.direction === 'outbound').length,
        inbound: calls.filter((c: any) => c.direction === 'inbound').length,
        answered: calls.filter((c: any) => c.status === 'answered' || c.status === 'completed').length,
        missed: calls.filter((c: any) => c.status === 'missed' || c.status === 'no_answer').length,
        total_minutes: Math.round(
          calls.reduce((sum: number, c: any) => sum + (c.talk_time_seconds || 0), 0) / 60
        ),
      };

      return stats;
    } catch (error) {
      logger.error('Failed to get call statistics:', error);
      return {
        total_calls: 0,
        outbound: 0,
        inbound: 0,
        answered: 0,
        missed: 0,
        total_minutes: 0,
      };
    }
  }

  /**
   * Récupère le numéro de ligne Keyyo de l'utilisateur
   */
  async getUserAccount(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('telephony_users')
        .select('phone_number, extension')
        .eq('user_id', userId)
        .eq('provider_id', this.providerId)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      // Retourner le numéro de téléphone (format international)
      return data?.phone_number || null;
    } catch (error) {
      logger.error('Failed to get user account:', error);
      return null;
    }
  }

  /**
   * Récupère l'extension téléphonique de l'utilisateur
   */
  async getUserExtension(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('telephony_users')
        .select('extension')
        .eq('user_id', userId)
        .eq('provider_id', this.providerId)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return data?.extension || null;
    } catch (error) {
      logger.error('Failed to get user extension:', error);
      return null;
    }
  }

  /**
   * Vérifie si le Click-to-Call est activé
   */
  async isClickToCallEnabled(): Promise<boolean> {
    if (!this.config) {
      await this.initialize();
    }
    return this.config?.click_to_call_enabled || false;
  }

  /**
   * Vérifie si les SMS sont activés
   */
  async isSMSEnabled(): Promise<boolean> {
    if (!this.config) {
      await this.initialize();
    }
    return this.config?.sms_enabled || false;
  }
}

// Instance singleton
export const keyyoService = new KeyyoService();
