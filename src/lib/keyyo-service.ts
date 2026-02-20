/**
 * Service d'intégration Keyyo Softphone
 * Documentation API: https://api.keyyo.com/v1/docs
 */

import { supabase } from './supabase';
import { logger } from './logger';

export interface KeyyoConfig {
  api_key: string;
  account_id: string;
  base_url: string;
  click_to_call_enabled: boolean;
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
    return this.config !== null && !!this.config.api_key;
  }

  /**
   * Click-to-Call: Initie un appel via Keyyo
   */
  async initiateCall(params: {
    fromExtension: string;
    toNumber: string;
    leadId?: string;
  }): Promise<{ success: boolean; callId?: string; error?: string }> {
    try {
      if (!await this.isConfigured()) {
        throw new Error('Keyyo is not configured');
      }

      // Appel à l'Edge Function qui contactera l'API Keyyo
      const { data, error } = await supabase.functions.invoke('keyyo-click-to-call', {
        body: {
          from_extension: params.fromExtension,
          to_number: params.toNumber,
          lead_id: params.leadId,
        },
      });

      if (error) throw error;

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
   * Récupère l'historique des appels depuis Keyyo
   */
  async fetchCallHistory(params: {
    startDate?: Date;
    endDate?: Date;
    extension?: string;
  } = {}): Promise<KeyyoCall[]> {
    try {
      if (!await this.isConfigured()) {
        return [];
      }

      const { data, error } = await supabase.functions.invoke('keyyo-fetch-calls', {
        body: {
          start_date: params.startDate?.toISOString(),
          end_date: params.endDate?.toISOString(),
          extension: params.extension,
        },
      });

      if (error) throw error;

      return data.calls || [];
    } catch (error) {
      logger.error('Failed to fetch Keyyo call history:', error);
      return [];
    }
  }

  /**
   * Récupère un enregistrement d'appel depuis Keyyo
   */
  async fetchRecording(callId: string): Promise<{ url?: string; error?: string }> {
    try {
      if (!await this.isConfigured()) {
        throw new Error('Keyyo is not configured');
      }

      const { data, error } = await supabase.functions.invoke('keyyo-fetch-recording', {
        body: { call_id: callId },
      });

      if (error) throw error;

      return { url: data.recording_url };
    } catch (error: any) {
      logger.error('Failed to fetch Keyyo recording:', error);
      return { error: error.message };
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
          external_id: params.externalId,
          lead_id: params.leadId,
          user_id: params.userId,
          direction: params.direction,
          from_number: params.fromNumber,
          to_number: params.toNumber,
          status: params.status,
          duration_seconds: params.duration,
          talk_time_seconds: params.talkTime,
          notes: params.notes,
          ended_at: new Date(),
        })
        .select()
        .single();

      if (error) throw error;

      // Créer une interaction dans la timeline si lead_id existe
      if (params.leadId) {
        await supabase.from('crm_interactions').insert({
          lead_id: params.leadId,
          type: 'call',
          subject: `Appel ${params.direction === 'inbound' ? 'entrant' : 'sortant'}`,
          content: params.notes || `Durée: ${Math.floor(params.talkTime / 60)} min`,
          metadata: {
            call_id: data.id,
            from: params.fromNumber,
            to: params.toNumber,
            duration: params.duration,
          },
        });
      }

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
      const { data, error } = await supabase.rpc('get_call_statistics', {
        p_user_id: userId,
      });

      if (error) throw error;

      return data;
    } catch (error) {
      logger.error('Failed to get call statistics:', error);
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
        .select('extension, phone_number')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return data?.extension || data?.phone_number || null;
    } catch (error) {
      logger.error('Failed to get user extension:', error);
      return null;
    }
  }
}

// Instance singleton
export const keyyoService = new KeyyoService();
