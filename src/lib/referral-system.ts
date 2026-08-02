import { supabase } from './supabase';
import { hasAnalyticsConsent, hasBehavioralPersonalizationConsent } from './privacy-consent';

export interface Referral {
  id: string;
  referrer_id: string;
  referred_email: string;
  referred_id?: string;
  status: 'pending' | 'completed' | 'cancelled';
  reward_amount: number;
  reward_type: 'credit' | 'discount' | 'cash' | 'gift';
  created_at: string;
  completed_at?: string;
}

export interface ReferralStats {
  total_referrals: number;
  completed_referrals: number;
  pending_referrals: number;
  total_rewards: number;
  conversion_rate: number;
}

export class ReferralSystem {
  async generateReferralCode(userId: string): Promise<string> {
    const code = this.createUniqueCode();

    const { error } = await supabase
      .from('referral_codes')
      .upsert({
        user_id: userId,
        code,
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
    return code;
  }

  async getReferralCode(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return await this.generateReferralCode(userId);
    }

    return data.code;
  }

  async createReferral(
    referralCode: string,
    referredEmail: string,
    rewardAmount: number = 25,
    rewardType: 'credit' | 'discount' | 'cash' | 'gift' = 'gift'
  ): Promise<Referral> {
    const { data: codeData } = await supabase
      .from('referral_codes')
      .select('user_id')
      .eq('code', referralCode.toUpperCase())
      .single();

    if (!codeData) {
      throw new Error('Invalid referral code');
    }

    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_email', referredEmail)
      .maybeSingle();

    if (existingReferral) {
      throw new Error('This email has already been referred');
    }

    const { data, error } = await supabase
      .from('referrals')
      .insert({
        referrer_id: codeData.user_id,
        referred_email: referredEmail,
        status: 'pending',
        reward_amount: rewardAmount,
        reward_type: rewardType,
      })
      .select()
      .single();

    if (error) throw error;

    await this.sendReferralEmail(referredEmail, referralCode);

    return data;
  }

  async completeReferral(referredUserId: string): Promise<void> {
    const { data: referral, error: fetchError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_id', referredUserId)
      .eq('status', 'pending')
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!referral) return;

    const { error: updateError } = await supabase
      .from('referrals')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', referral.id);

    if (updateError) throw updateError;

    await this.grantReward(referral.referrer_id, referral.reward_amount, referral.reward_type);

    await this.sendRewardNotification(referral.referrer_id, referral.reward_amount, referral.reward_type);
  }

  async getReferrals(userId: string): Promise<Referral[]> {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getReferralStats(userId: string): Promise<ReferralStats> {
    const referrals = await this.getReferrals(userId);

    const completed = referrals.filter(r => r.status === 'completed');
    const pending = referrals.filter(r => r.status === 'pending');
    const totalRewards = completed.reduce((sum, r) => sum + r.reward_amount, 0);
    const conversionRate = referrals.length > 0
      ? (completed.length / referrals.length) * 100
      : 0;

    return {
      total_referrals: referrals.length,
      completed_referrals: completed.length,
      pending_referrals: pending.length,
      total_rewards: totalRewards,
      conversion_rate: conversionRate,
    };
  }

  async cancelReferral(referralId: string): Promise<void> {
    const { error } = await supabase
      .from('referrals')
      .update({ status: 'cancelled' })
      .eq('id', referralId);

    if (error) throw error;
  }

  private createUniqueCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private async grantReward(
    userId: string,
    amount: number,
    type: 'credit' | 'discount' | 'cash' | 'gift'
  ): Promise<void> {
    const { error } = await supabase
      .from('user_rewards')
      .insert({
        user_id: userId,
        type,
        amount,
        source: 'referral',
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  private async sendReferralEmail(email: string, referralCode: string): Promise<void> {
    await fetch('/api/send-email.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: 'Vous avez été recommandé pour TaxiAssur!',
        template: 'referral-invitation',
        data: { referralCode },
      }),
    });
  }

  private async sendRewardNotification(
    userId: string,
    amount: number,
    type: string
  ): Promise<void> {
    await fetch('/api/send-email.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        subject: 'Vous avez gagné une récompense!',
        template: 'referral-reward',
        data: { amount, type },
      }),
    });
  }

  getReferralLink(code: string): string {
    return `${window.location.origin}/?ref=${code}`;
  }

  async trackReferralClick(code: string): Promise<void> {
    if (!hasAnalyticsConsent()) return;

    const { error } = await supabase
      .from('referral_clicks')
      .insert({
        code,
        clicked_at: new Date().toISOString(),
        ip: null,
        user_agent: hasBehavioralPersonalizationConsent()
          ? navigator.userAgent
          : 'analytics_consent_no_behavioral_profile',
      });

    if (error) console.error('Failed to track referral click:', error);
  }
}

export const referralSystem = new ReferralSystem();
