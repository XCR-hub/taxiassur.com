interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier?: string;
}

interface RequestRecord {
  timestamp: number;
  count: number;
}

class ClientRateLimiter {
  private records: Map<string, RequestRecord[]> = new Map();

  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let records = this.records.get(key) || [];
    records = records.filter(record => record.timestamp > windowStart);

    const totalRequests = records.reduce((sum, record) => sum + record.count, 0);

    if (totalRequests >= config.maxRequests) {
      return false;
    }

    records.push({ timestamp: now, count: 1 });
    this.records.set(key, records);

    return true;
  }

  getRemainingRequests(key: string, config: RateLimitConfig): number {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    const records = this.records.get(key) || [];
    const validRecords = records.filter(record => record.timestamp > windowStart);
    const totalRequests = validRecords.reduce((sum, record) => sum + record.count, 0);

    return Math.max(0, config.maxRequests - totalRequests);
  }

  getResetTime(key: string, config: RateLimitConfig): number {
    const records = this.records.get(key) || [];
    if (records.length === 0) return 0;

    const oldestRecord = records[0];
    return oldestRecord.timestamp + config.windowMs;
  }

  reset(key?: string) {
    if (key) {
      this.records.delete(key);
    } else {
      this.records.clear();
    }
  }
}

export const rateLimiter = new ClientRateLimiter();

export function useRateLimiter(config: RateLimitConfig) {
  const key = config.identifier || 'default';

  const checkLimit = () => {
    return rateLimiter.isAllowed(key, config);
  };

  const getRemainingRequests = () => {
    return rateLimiter.getRemainingRequests(key, config);
  };

  const getResetTime = () => {
    return rateLimiter.getResetTime(key, config);
  };

  return {
    checkLimit,
    getRemainingRequests,
    getResetTime,
  };
}

export async function rateLimitedFetch(
  url: string,
  options: RequestInit = {},
  config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }
): Promise<Response> {
  const key = `fetch:${url}`;

  if (!rateLimiter.isAllowed(key, config)) {
    const resetTime = rateLimiter.getResetTime(key, config);
    const waitTime = resetTime - Date.now();

    throw new Error(
      `Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`
    );
  }

  return fetch(url, options);
}
