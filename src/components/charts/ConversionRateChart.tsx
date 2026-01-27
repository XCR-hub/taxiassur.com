import { useState, useEffect } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StatusData {
  status: string;
  count: number;
  percentage: number;
  color: string;
  label: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; order: number }> = {
  'NEW_LEAD': { label: 'Nouveaux', color: 'bg-blue-500', order: 1 },
  'CONTACT_ATTEMPTED': { label: 'Contact tenté', color: 'bg-yellow-500', order: 2 },
  'CONTACT_CONFIRMED': { label: 'Contact confirmé', color: 'bg-cyan-500', order: 3 },
  'DOCUMENTS_REQUIRED': { label: 'Documents requis', color: 'bg-orange-500', order: 4 },
  'DOCUMENTS_RECEIVED': { label: 'Documents reçus', color: 'bg-teal-500', order: 5 },
  'QUOTE_SENT': { label: 'Devis envoyé', color: 'bg-purple-500', order: 6 },
  'QUOTE_ACCEPTED': { label: 'Devis accepté', color: 'bg-green-500', order: 7 },
  'ACTIVE_CLIENT': { label: 'Client actif', color: 'bg-emerald-500', order: 8 },
  'LOST_RECONTACT_SCHEDULED': { label: 'Recontact prévu', color: 'bg-red-400', order: 9 },
  'LOST': { label: 'Perdu', color: 'bg-red-600', order: 10 },
};

export function ConversionRateChart() {
  const [data, setData] = useState<StatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [conversionRate, setConversionRate] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: leads, error } = await supabase
          .from('crm_leads')
          .select('status');

        if (error) throw error;

        const statusCounts: Record<string, number> = {};
        leads?.forEach(lead => {
          const status = lead.status || 'NOUVEAU_LEAD';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const total = leads?.length || 1;
        const converted = (statusCounts['ACTIVE_CLIENT'] || 0) + (statusCounts['QUOTE_ACCEPTED'] || 0);
        setConversionRate(Math.round((converted / total) * 100));

        const statusData: StatusData[] = Object.entries(statusCounts)
          .map(([status, count]) => ({
            status,
            count,
            percentage: Math.round((count / total) * 100),
            color: STATUS_CONFIG[status]?.color || 'bg-gray-500',
            label: STATUS_CONFIG[status]?.label || status,
          }))
          .sort((a, b) => {
            const orderA = STATUS_CONFIG[a.status]?.order || 99;
            const orderB = STATUS_CONFIG[b.status]?.order || 99;
            return orderA - orderB;
          });

        setData(statusData);
      } catch (err) {
        console.error('Error fetching conversion data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-semibold text-white">Taux de Conversion</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-semibold text-white">Taux de Conversion</h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-400">{conversionRate}%</p>
          <p className="text-xs text-gray-400">Leads convertis</p>
        </div>
      </div>

      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.status} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-300">{item.label}</span>
              <span className="text-sm font-medium text-white">{item.count} ({item.percentage}%)</span>
            </div>
            <div className="h-6 bg-gray-800 rounded-lg overflow-hidden">
              <div
                className={`h-full ${item.color} transition-all duration-500 rounded-lg flex items-center justify-end pr-2`}
                style={{ width: `${Math.max(item.percentage, 5)}%` }}
              >
                {item.percentage >= 15 && (
                  <span className="text-xs text-white font-medium">{item.percentage}%</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
