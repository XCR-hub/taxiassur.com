interface BundleMetrics {
  totalSize: number;
  gzipSize: number;
  modules: ModuleInfo[];
  timestamp: number;
}

interface ModuleInfo {
  name: string;
  size: number;
  gzipSize?: number;
  chunks: string[];
}

class BundleAnalyzer {
  private metrics: BundleMetrics[] = [];
  private readonly storageKey = 'bundle_metrics_history';

  async analyze(): Promise<BundleMetrics> {
    const modules = await this.getModuleInfo();
    const totalSize = modules.reduce((sum, mod) => sum + mod.size, 0);
    const gzipSize = this.estimateGzipSize(totalSize);

    const metrics: BundleMetrics = {
      totalSize,
      gzipSize,
      modules: modules.sort((a, b) => b.size - a.size).slice(0, 50),
      timestamp: Date.now(),
    };

    this.saveMetrics(metrics);
    return metrics;
  }

  private async getModuleInfo(): Promise<ModuleInfo[]> {
    if (import.meta.env.DEV) {
      return [];
    }

    const modules: ModuleInfo[] = [];

    try {
      const scripts = Array.from(document.getElementsByTagName('script'));

      for (const script of scripts) {
        if (script.src) {
          const response = await fetch(script.src);
          const text = await response.text();
          const size = new Blob([text]).size;

          modules.push({
            name: script.src.split('/').pop() || 'unknown',
            size,
            chunks: ['main'],
          });
        }
      }
    } catch (error) {
      console.error('Failed to analyze bundle:', error);
    }

    return modules;
  }

  private estimateGzipSize(size: number): number {
    return Math.round(size * 0.3);
  }

  private saveMetrics(metrics: BundleMetrics) {
    this.metrics.push(metrics);

    if (this.metrics.length > 10) {
      this.metrics.shift();
    }

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.metrics));
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }

  getHistory(): BundleMetrics[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.metrics = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load metrics history:', error);
    }

    return this.metrics;
  }

  getTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.metrics.length < 2) return 'stable';

    const recent = this.metrics.slice(-3);
    const sizes = recent.map((m) => m.totalSize);
    const avgChange = (sizes[sizes.length - 1] - sizes[0]) / sizes.length;

    if (Math.abs(avgChange) < 1000) return 'stable';
    return avgChange > 0 ? 'increasing' : 'decreasing';
  }

  getLargestModules(count: number = 10): ModuleInfo[] {
    if (this.metrics.length === 0) return [];

    const latest = this.metrics[this.metrics.length - 1];
    return latest.modules.slice(0, count);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

export const bundleAnalyzer = new BundleAnalyzer();

export function useBundleAnalytics() {
  const analyze = () => bundleAnalyzer.analyze();
  const getHistory = () => bundleAnalyzer.getHistory();
  const getTrend = () => bundleAnalyzer.getTrend();
  const getLargestModules = (count?: number) => bundleAnalyzer.getLargestModules(count);
  const formatSize = (bytes: number) => bundleAnalyzer.formatSize(bytes);

  return {
    analyze,
    getHistory,
    getTrend,
    getLargestModules,
    formatSize,
  };
}
