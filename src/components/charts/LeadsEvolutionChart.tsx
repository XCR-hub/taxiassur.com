import { useState, useEffect } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import { nativeAdminDashboard } from '@/lib/native-admin-data';

interface DayData {
  date: string;
  count: number;
  label: string;
}

export function LeadsEvolutionChart() {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await nativeAdminDashboard() as { leads?: { created_at?: string }[] };
        const leads = (result.leads || []).filter((lead) => lead.created_at && new Date(lead.created_at) >= thirtyDaysAgo);

        const dailyCounts: Record<string, number> = {};
        const days: DayData[] = [];

        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          dailyCounts[dateStr] = 0;
        }

        leads.forEach(lead => {
          const dateStr = new Date(lead.created_at).toISOString().split('T')[0];
          if (dailyCounts[dateStr] !== undefined) {
            dailyCounts[dateStr]++;
          }
        });

        Object.entries(dailyCounts).forEach(([date, count]) => {
          const d = new Date(date);
          days.push({
            date,
            count,
            label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
          });
        });

        setData(days);
        setTotal(leads.length);
      } catch (err) {
        console.error('Error fetching leads evolution:', err);
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
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-white">Evolution des Leads</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-white">Evolution des Leads</h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">{total}</p>
          <p className="text-xs text-gray-400">30 derniers jours</p>
        </div>
      </div>

      <div className="h-64 flex items-end gap-1">
        {data.map((day, index) => (
          <div
            key={day.date}
            className="flex-1 flex flex-col items-center group relative"
          >
            <div
              className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-300 hover:from-blue-500 hover:to-blue-300 min-h-[2px]"
              style={{ height: `${(day.count / maxCount) * 100}%` }}
            />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {day.count} lead{day.count !== 1 ? 's' : ''} - {day.label}
            </div>
            {index % 5 === 0 && (
              <span className="text-[10px] text-gray-500 mt-2 rotate-45 origin-left">
                {day.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
