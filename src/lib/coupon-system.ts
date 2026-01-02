import { supabase } from './supabase';

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_amount?: number;
  max_discount?: number;
  usage_limit?: number;
  usage_count: number;
  valid_from: string;
  valid_until?: string;
  active: boolean;
  metadata?: Record<string, any>;
}

export interface CouponValidationResult {
  valid: boolean;
  discount: number;
  message?: string;
  coupon?: Coupon;
}

export class CouponSystem {
  async createCoupon(couponData: Omit<Coupon, 'id' | 'usage_count'>): Promise<Coupon> {
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        ...couponData,
        usage_count: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async validateCoupon(code: string, amount: number): Promise<CouponValidationResult> {
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('active', true)
      .maybeSingle();

    if (error || !coupon) {
      return {
        valid: false,
        discount: 0,
        message: 'Code promo invalide',
      };
    }

    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

    if (now < validFrom) {
      return {
        valid: false,
        discount: 0,
        message: 'Ce code promo n\'est pas encore actif',
      };
    }

    if (validUntil && now > validUntil) {
      return {
        valid: false,
        discount: 0,
        message: 'Ce code promo a expiré',
      };
    }

    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return {
        valid: false,
        discount: 0,
        message: 'Ce code promo a atteint sa limite d\'utilisation',
      };
    }

    if (coupon.min_amount && amount < coupon.min_amount) {
      return {
        valid: false,
        discount: 0,
        message: `Montant minimum de ${coupon.min_amount}€ requis`,
      };
    }

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (amount * coupon.value) / 100;
      if (coupon.max_discount && discount > coupon.max_discount) {
        discount = coupon.max_discount;
      }
    } else {
      discount = coupon.value;
    }

    return {
      valid: true,
      discount: Math.min(discount, amount),
      coupon,
    };
  }

  async applyCoupon(code: string, orderId: string): Promise<void> {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('id, usage_count')
      .eq('code', code.toUpperCase())
      .single();

    if (!coupon) throw new Error('Coupon not found');

    await supabase
      .from('coupons')
      .update({ usage_count: coupon.usage_count + 1 })
      .eq('id', coupon.id);

    await supabase
      .from('coupon_usage')
      .insert({
        coupon_id: coupon.id,
        order_id: orderId,
        used_at: new Date().toISOString(),
      });
  }

  async getCoupon(code: string): Promise<Coupon | null> {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async listCoupons(activeOnly: boolean = false): Promise<Coupon[]> {
    let query = supabase.from('coupons').select('*').order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async updateCoupon(id: string, updates: Partial<Coupon>): Promise<Coupon> {
    const { data, error } = await supabase
      .from('coupons')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deactivateCoupon(id: string): Promise<void> {
    const { error } = await supabase
      .from('coupons')
      .update({ active: false })
      .eq('id', id);

    if (error) throw error;
  }

  async deleteCoupon(id: string): Promise<void> {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getCouponUsage(couponId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('coupon_usage')
      .select('*')
      .eq('coupon_id', couponId)
      .order('used_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  generateCode(length: number = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async createBulkCoupons(
    count: number,
    template: Omit<Coupon, 'id' | 'code' | 'usage_count'>
  ): Promise<Coupon[]> {
    const coupons = [];
    for (let i = 0; i < count; i++) {
      const code = this.generateCode();
      coupons.push({
        ...template,
        code,
        usage_count: 0,
      });
    }

    const { data, error } = await supabase
      .from('coupons')
      .insert(coupons)
      .select();

    if (error) throw error;
    return data || [];
  }
}

export const couponSystem = new CouponSystem();
