import { Package, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useBundleAnalytics } from '../lib/bundle-analyzer';

export function BundleAnalyzerDashboard() {
  const { getHistory, getTrend, getLargestModules, formatSize, analyze } = useBundleAnalytics();
  const [history, setHistory] = useState(getHistory());
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const trend = getTrend();
  const largestModules = getLargestModules(10);
  const latest = history[history.length - 1];

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    await analyze();
    setHistory(getHistory());
    setIsAnalyzing(false);
  };

  const TrendIcon = {
    increasing: TrendingUp,
    decreasing: TrendingDown,
    stable: Minus,
  }[trend];

  const trendColor = {
    increasing: 'text-red-600',
    decreasing: 'text-green-600',
    stable: 'text-gray-600',
  }[trend];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Analyse du Bundle
        </h2>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isAnalyzing ? 'Analyse...' : 'Analyser'}
        </button>
      </div>

      {latest && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Taille totale
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {formatSize(latest.totalSize)}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Taille gzip
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {formatSize(latest.gzipSize)}
                </p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tendance
                </p>
                <p className={`mt-2 text-2xl font-bold ${trendColor}`}>
                  {trend === 'increasing' && 'En hausse'}
                  {trend === 'decreasing' && 'En baisse'}
                  {trend === 'stable' && 'Stable'}
                </p>
              </div>
              <TrendIcon className={`h-8 w-8 ${trendColor}`} />
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Plus gros modules
        </h3>
        <div className="space-y-3">
          {largestModules.map((module, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {module.name}
                </p>
                <div className="mt-1 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{
                      width: `${(module.size / largestModules[0].size) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <p className="ml-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                {formatSize(module.size)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
