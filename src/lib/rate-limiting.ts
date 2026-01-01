import { supabase } from './supabase';
import { logger } from './logger';

export interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
  blockDurationMinutes?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  blocked?: boolean;
}

const defaultConfigs: Record<string, RateLimitConfig> = {
  lead_form: {
    maxAttempts: 5,
    windowMinutes: 60,
    blockDurationMinutes: 120,
  },
  contact_form: {
    maxAttempts: 3,
    windowMinutes: 30,
    blockDurationMinutes: 60,
  },
  newsletter: {
    maxAttempts: 2,
    windowMinutes: 1440,
    blockDurationMinutes: 1440,
  },
  api_call: {
    maxAttempts: 100,
    windowMinutes: 60,
  },
};

export async function checkRateLimit(
  identifier: string,
  action: string,
  config?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  const fullConfig = {
    ...defaultConfigs[action] || defaultConfigs.api_call,
    ...config,
  };

  const windowStart = new Date(Date.now() - fullConfig.windowMinutes * 60 * 1000);

  try {
    const { data: existingAttempts, error } = await supabase
      .from('rate_limit_attempts')
      .select('*')
      .eq('identifier', identifier)
      .eq('action', action)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Rate limit check error', error);
      return {
        allowed: true,
        remaining: fullConfig.maxAttempts,
        resetAt: new Date(Date.now() + fullConfig.windowMinutes * 60 * 1000),
      };
    }

    const { data: blockedRecord } = await supabase
      .from('rate_limit_blocks')
      .select('*')
      .eq('identifier', identifier)
      .eq('action', action)
      .gte('blocked_until', new Date().toISOString())
      .maybeSingle();

    if (blockedRecord) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(blockedRecord.blocked_until),
        blocked: true,
      };
    }

    const attemptsCount = existingAttempts?.length || 0;

    if (attemptsCount >= fullConfig.maxAttempts) {
      if (fullConfig.blockDurationMinutes) {
        await blockIdentifier(identifier, action, fullConfig.blockDurationMinutes);
      }

      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + fullConfig.windowMinutes * 60 * 1000),
        blocked: false,
      };
    }

    await supabase
      .from('rate_limit_attempts')
      .insert({
        identifier,
        action,
        created_at: new Date().toISOString(),
      });

    return {
      allowed: true,
      remaining: fullConfig.maxAttempts - attemptsCount - 1,
      resetAt: new Date(Date.now() + fullConfig.windowMinutes * 60 * 1000),
    };
  } catch (error) {
    logger.error('Rate limit error', error);
    return {
      allowed: true,
      remaining: fullConfig.maxAttempts,
      resetAt: new Date(Date.now() + fullConfig.windowMinutes * 60 * 1000),
    };
  }
}

async function blockIdentifier(identifier: string, action: string, durationMinutes: number) {
  const blockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

  await supabase
    .from('rate_limit_blocks')
    .insert({
      identifier,
      action,
      blocked_until: blockedUntil.toISOString(),
      reason: 'Rate limit exceeded',
    });

  logger.warn('Identifier blocked', {
    identifier,
    action,
    blockedUntil: blockedUntil.toISOString(),
  });
}

export function getIdentifier(request?: Request): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('client_id');
    if (stored) return stored;

    const newId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('client_id', newId);
    return newId;
  }

  if (request) {
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';
    return `ip_${ip}`;
  }

  return 'unknown';
}
