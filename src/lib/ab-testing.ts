interface Experiment {
  id: string;
  name: string;
  variants: string[];
  weights?: number[];
  targeting?: (user: Record<string, unknown>) => boolean;
}

interface ExperimentResult {
  experimentId: string;
  variant: string;
  timestamp: number;
}

class ABTestingFramework {
  private experiments: Map<string, Experiment> = new Map();
  private assignments: Map<string, string> = new Map();
  private storageKey = 'ab_test_assignments';

  constructor() {
    this.loadAssignments();
  }

  private loadAssignments() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.assignments = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load A/B test assignments:', error);
    }
  }

  private saveAssignments() {
    try {
      const data = Object.fromEntries(this.assignments);
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save A/B test assignments:', error);
    }
  }

  registerExperiment(experiment: Experiment) {
    this.experiments.set(experiment.id, experiment);
  }

  getVariant(experimentId: string, user?: Record<string, unknown>): string {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return 'control';
    }

    if (experiment.targeting && user && !experiment.targeting(user)) {
      return 'control';
    }

    if (this.assignments.has(experimentId)) {
      return this.assignments.get(experimentId)!;
    }

    const variant = this.assignVariant(experiment);
    this.assignments.set(experimentId, variant);
    this.saveAssignments();

    this.trackAssignment(experimentId, variant);

    return variant;
  }

  private assignVariant(experiment: Experiment): string {
    const { variants, weights } = experiment;

    if (!weights || weights.length !== variants.length) {
      const randomIndex = Math.floor(Math.random() * variants.length);
      return variants[randomIndex];
    }

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < variants.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return variants[i];
      }
    }

    return variants[0];
  }

  private trackAssignment(experimentId: string, variant: string) {
    const result: ExperimentResult = {
      experimentId,
      variant,
      timestamp: Date.now(),
    };

    fetch('/api/ab-test/assignment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
      keepalive: true,
    }).catch(() => {
      // Silently fail
    });
  }

  trackConversion(experimentId: string, conversionType: string, value?: number) {
    const variant = this.assignments.get(experimentId);
    if (!variant) return;

    fetch('/api/ab-test/conversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        experimentId,
        variant,
        conversionType,
        value,
        timestamp: Date.now(),
      }),
      keepalive: true,
    }).catch(() => {
      // Silently fail
    });
  }

  reset(experimentId?: string) {
    if (experimentId) {
      this.assignments.delete(experimentId);
    } else {
      this.assignments.clear();
    }
    this.saveAssignments();
  }

  getActiveExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }
}

export const abTesting = new ABTestingFramework();

export function useABTest(experimentId: string) {
  const variant = abTesting.getVariant(experimentId);

  const trackConversion = (conversionType: string, value?: number) => {
    abTesting.trackConversion(experimentId, conversionType, value);
  };

  return {
    variant,
    trackConversion,
    isVariant: (variantName: string) => variant === variantName,
  };
}
