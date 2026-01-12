import { useState, useEffect } from 'react';
import { Zap, Loader2, Mail, MessageSquare, Bell, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AutomationData {
  type: string;
  label: string;
  count: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

export function AutomationPerformanceChart() {
  const [data, setData] = useState<AutomationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAutomations, setTotalAutomations] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [emailsResult, interactionsResult, leadsResult] = await Promise.all([
          supabase.from('email_messages').select('id, direction').eq('direction', 'outbound'),
          supabase.from('crm_interactions').select('id, type'),
          supabase.from('crm_leads').select('id, needs_followup, ai_recommended_action'),
        ]);

        const emailsSent = emailsResult.data?.length || 0;
        const totalInteractions = interactionsResult.data?.length || 0;
        const followupsNeeded = leadsResult.data?.filter(l => l.needs_followup).length || 0;
        const aiRecommendations = leadsResult.data?.filter(l => l.ai_recommended_action).length || 0;

        const automationData: AutomationData[] = [
          {
            type: 'emails',
            label: 'Emails envoyés',
            count: emailsSent,
            icon: Mail,
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/20',
          },
          {
            type: 'interactions',
            label: 'Interactions',
            count: totalInteractions,
            icon: MessageSquare,
            color: 'text-green-400',
            bgColor: 'bg-green-500/20',
          },
          {
            type: 'followups',
            label: 'Suivis planifiés',
            count: followupsNeeded,
            icon: Bell,
            color: 'text-orange-400',
            bgColor: 'bg-orange-500/20',
          },
          {
            type: 'ai_actions',
            label: 'Actions IA',
            count: aiRecommendations,
            icon: CheckCircle,
            color: 'text-cyan-400',
            bgColor: 'bg-cyan-500/20',
          },
        ];

        setData(automationData);
        setTotalAutomations(emailsSent + totalInteractions + followupsNeeded);
      } catch (err) {
        console.error('Error fetching automation data:', err);
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
          <Zap className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-white">Performance Automatisations</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-white">Performance Automatisations</h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-yellow-400">{totalAutomations}</p>
          <p className="text-xs text-gray-400">actions totales</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {data.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.type}
              className={`${item.bgColor} rounded-xl p-4 border border-gray-700/50`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon className={`w-5 h-5 ${item.color}`} />
                <span className="text-sm text-gray-300">{item.label}</span>
              </div>
              <p className={`text-3xl font-bold ${item.color}`}>{item.count}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.type}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-400">{item.label}</span>
              <span className="text-sm font-medium text-white">{item.count}</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${item.bgColor.replace('/20', '')} rounded-full transition-all duration-700`}
                style={{ width: `${(item.count / maxCount) * 100}%`, minWidth: item.count > 0 ? '8px' : '0' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
