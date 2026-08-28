import { NATIVE_ADMIN_TOKEN_KEY } from '@/lib/native-admin-auth';

export interface SendSmsInput { to: string; content: string; lead_id?: string; sender?: string; tag?: string }
export interface SendSmsResult { success: boolean; messageId?: string; reference?: string; smsCount?: number; error?: string; details?: { message?: string } }

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const accessToken = localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY);
  if (!accessToken) throw new Error('Session administrateur expirée. Reconnectez-vous.');
  const response = await fetch('/api/sms/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(input),
  });
  const result = await response.json().catch(() => null) as SendSmsResult | null;
  if (!response.ok || !result?.success) throw new Error(result?.details?.message || result?.error || `Erreur SMS (${response.status})`);
  return result;
}
