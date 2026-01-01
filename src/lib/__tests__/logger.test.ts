import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have all logging methods', () => {
    expect(logger).toHaveProperty('log');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('error');
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('debug');
  });

  it('should have callable logging methods', () => {
    expect(typeof logger.log).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should not throw when calling logging methods', () => {
    expect(() => logger.log('test message')).not.toThrow();
    expect(() => logger.warn('test warning')).not.toThrow();
    expect(() => logger.error('test error')).not.toThrow();
    expect(() => logger.info('test info')).not.toThrow();
    expect(() => logger.debug('test debug')).not.toThrow();
  });
});
