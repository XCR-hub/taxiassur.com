import { useState, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { nativeAdminDashboard } from '@/lib/native-admin-data';

interface CityData {
  city: string;
  count: number;
  percentage: number;
}

const CITY_COLORS = [
  'from-blue-500 to-blue-600',
  'from-green-500 to-green-600',
  'from-cyan-500 to-cyan-600',
  'from-orange-500 to-orange-600',
  'from-pink-500 to-pink-600',
  'from-yellow-500 to-yellow-600',
  'from-red-500 to-red-600',
  'from-teal-500 to-teal-600',
  'from-indigo-500 to-indigo-600',
  'from-emerald-500 to-emerald-600',
];

export function CityDistributionChart() {
  const [data, setData] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCities, setTotalCities] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await nativeAdminDashboard() as { leads?: { city?: string | null }[] };
        const leads = result.leads || [];

        const cityCounts: Record<string, number> = {};
        leads.forEach(lead => {
          const city = lead.city?.trim() || 'Non spécifié';
          const normalizedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
          cityCounts[normalizedCity] = (cityCounts[normalizedCity] || 0) + 1;
        });

        const total = leads.length || 1;
        const uniqueCities = Object.keys(cityCounts).length;
        setTotalCities(uniqueCities);

        const cityData: CityData[] = Object.entries(cityCounts)
          .map(([city, count]) => ({
            city,
            count,
            percentage: Math.round((count / total) * 100),
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setData(cityData);
      } catch (err) {
        console.error('Error fetching city distribution:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const maxCount = Math.max(...data.map(d => d.count), 1);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-3 mb-6">
          <MapPin className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-semibold text-white">Répartition par Ville</h3>
        </div>
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-semibold text-white">Répartition par Ville</h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">{totalCities}</p>
          <p className="text-xs text-gray-400">villes différentes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-end gap-2 h-64">
          {data.slice(0, 5).map((city, index) => (
            <div
              key={city.city}
              className="flex-1 flex flex-col items-center group"
            >
              <div className="relative w-full">
                <div
                  className={`w-full bg-gradient-to-t ${CITY_COLORS[index]} rounded-t-lg transition-all duration-300 hover:opacity-80`}
                  style={{ height: `${(city.count / maxCount) * 200}px`, minHeight: '20px' }}
                />
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {city.count} leads
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center truncate w-full" title={city.city}>
                {city.city.length > 10 ? city.city.slice(0, 10) + '...' : city.city}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {data.map((city, index) => (
            <div key={city.city} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${CITY_COLORS[index]}`} />
              <span className="text-sm text-gray-300 flex-1 truncate" title={city.city}>
                {city.city}
              </span>
              <span className="text-sm font-medium text-white">{city.count}</span>
              <span className="text-xs text-gray-500 w-12 text-right">{city.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
