import { describe, it, expect, beforeEach } from 'vitest';
import { abTesting } from '../ab-testing';

describe('A/B Testing Framework', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('registers and assigns variants', () => {
    abTesting.registerExperiment({
      id: 'test-exp',
      name: 'Test Experiment',
      variants: ['control', 'variant-a', 'variant-b'],
    });

    const variant = abTesting.getVariant('test-exp');
    expect(['control', 'variant-a', 'variant-b']).toContain(variant);
  });

  it('maintains consistent variant assignment', () => {
    abTesting.registerExperiment({
      id: 'test-exp-2',
      name: 'Test Experiment 2',
      variants: ['control', 'variant-a'],
    });

    const variant1 = abTesting.getVariant('test-exp-2');
    const variant2 = abTesting.getVariant('test-exp-2');

    expect(variant1).toBe(variant2);
  });

  it('respects variant weights', () => {
    abTesting.registerExperiment({
      id: 'weighted-exp',
      name: 'Weighted Experiment',
      variants: ['control', 'variant-a'],
      weights: [1, 0],
    });

    const variant = abTesting.getVariant('weighted-exp');
    expect(variant).toBe('control');
  });

  it('returns control for unknown experiments', () => {
    const variant = abTesting.getVariant('unknown-exp');
    expect(variant).toBe('control');
  });
});
