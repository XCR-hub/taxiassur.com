import { Device, Call } from '@twilio/voice-sdk';
import { supabase } from './supabase';
import { logger } from './logger';

export type TelephonyStatus = 'disconnected' | 'connecting' | 'ready' | 'on-call' | 'ringing';

export interface IncomingCallInfo {
  callSid: string;
  from: string;
  to: string;
  call: Call;
}

type StatusListener = (status: TelephonyStatus) => void;
type IncomingListener = (info: IncomingCallInfo) => void;

class TelephonyService {
  private device: Device | null = null;
  private activeCall: Call | null = null;
  private status: TelephonyStatus = 'disconnected';
  private statusListeners: Set<StatusListener> = new Set();
  private incomingListeners: Set<IncomingListener> = new Set();
  private tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  getStatus(): TelephonyStatus {
    return this.status;
  }

  getActiveCall(): Call | null {
    return this.activeCall;
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  onIncomingCall(listener: IncomingListener): () => void {
    this.incomingListeners.add(listener);
    return () => this.incomingListeners.delete(listener);
  }

  private setStatus(newStatus: TelephonyStatus) {
    this.status = newStatus;
    this.statusListeners.forEach(l => l(newStatus));
  }

  async initialize(): Promise<void> {
    if (this.device) {
      this.device.destroy();
    }

    this.setStatus('connecting');

    try {
      const token = await this.fetchToken();

      this.device = new Device(token, {
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        closeProtection: true,
        enableImplicitConstraints: true,
      });

      this.device.on('registered', () => {
        logger.info('Twilio device registered');
        this.setStatus('ready');
      });

      this.device.on('unregistered', () => {
        logger.info('Twilio device unregistered');
        this.setStatus('disconnected');
      });

      this.device.on('error', (error) => {
        logger.error('Twilio device error:', error);
        this.setStatus('disconnected');
      });

      this.device.on('incoming', (call: Call) => {
        logger.info('Incoming call from:', call.parameters.From);
        this.setStatus('ringing');
        const info: IncomingCallInfo = {
          callSid: call.parameters.CallSid,
          from: call.parameters.From || 'Inconnu',
          to: call.parameters.To || '',
          call,
        };
        this.incomingListeners.forEach(l => l(info));
      });

      this.device.on('tokenWillExpire', () => {
        this.refreshToken();
      });

      await this.device.register();
      this.scheduleTokenRefresh();
    } catch (err) {
      logger.error('Failed to initialize telephony:', err);
      this.setStatus('disconnected');
      throw err;
    }
  }

  async makeCall(phoneNumber: string): Promise<Call> {
    if (!this.device || this.status !== 'ready') {
      throw new Error('Device not ready. Call initialize() first.');
    }

    const call = await this.device.connect({
      params: {
        To: phoneNumber.startsWith('+') ? phoneNumber : `+33${phoneNumber.replace(/^0/, '')}`,
      },
    });

    this.activeCall = call;
    this.setStatus('on-call');

    call.on('disconnect', () => {
      this.activeCall = null;
      this.setStatus('ready');
    });

    call.on('cancel', () => {
      this.activeCall = null;
      this.setStatus('ready');
    });

    call.on('error', (error) => {
      logger.error('Call error:', error);
      this.activeCall = null;
      this.setStatus('ready');
    });

    return call;
  }

  acceptIncomingCall(call: Call): void {
    call.accept();
    this.activeCall = call;
    this.setStatus('on-call');

    call.on('disconnect', () => {
      this.activeCall = null;
      this.setStatus('ready');
    });

    call.on('cancel', () => {
      this.activeCall = null;
      this.setStatus('ready');
    });
  }

  rejectIncomingCall(call: Call): void {
    call.reject();
    this.setStatus('ready');
  }

  hangUp(): void {
    if (this.activeCall) {
      this.activeCall.disconnect();
      this.activeCall = null;
      this.setStatus('ready');
    }
  }

  toggleMute(): boolean {
    if (this.activeCall) {
      const muted = !this.activeCall.isMuted();
      this.activeCall.mute(muted);
      return muted;
    }
    return false;
  }

  isMuted(): boolean {
    return this.activeCall?.isMuted() ?? false;
  }

  disconnect(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
    if (this.activeCall) {
      this.activeCall.disconnect();
      this.activeCall = null;
    }
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.setStatus('disconnected');
  }

  private async fetchToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('twilio-token', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (response.error) throw new Error(response.error.message);
    return response.data.token;
  }

  private async refreshToken(): Promise<void> {
    try {
      const token = await this.fetchToken();
      this.device?.updateToken(token);
      logger.info('Twilio token refreshed');
    } catch (err) {
      logger.error('Failed to refresh token:', err);
    }
  }

  private scheduleTokenRefresh(): void {
    if (this.tokenRefreshTimer) clearTimeout(this.tokenRefreshTimer);
    // Refresh every 50 minutes (tokens expire after 60)
    this.tokenRefreshTimer = setTimeout(() => {
      this.refreshToken();
      this.scheduleTokenRefresh();
    }, 50 * 60 * 1000);
  }
}

export const telephonyService = new TelephonyService();
