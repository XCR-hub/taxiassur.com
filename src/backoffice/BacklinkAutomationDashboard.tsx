import React, { useState, useEffect } from 'react';
import { Mail, Send, Eye, CheckCircle, XCircle, TrendingUp, Activity, BarChart3, Clock, Link2, Zap, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  target_count: number;
  sent_count: number;
  opened_count: number;
  replied_count: number;
  positive_count: number;
  negative_count: number;
  backlinks_acquired: number;
  created_at: string;
  updated_at: string;
}

interface OutreachLog {
  id: string;
  action_type: string;
  recipient_email: string;
  subject: string;
  sentiment: string;
  status: string;
  created_at: string;
  opportunity: {
    domain: string;
    url: string;
  };
}

const BacklinkAutomationDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [logs, setLogs] = useState<OutreachLog[]>([]);
  const [stats, setStats] = useState({
    totalSent: 0,
    totalOpened: 0,
    totalReplied: 0,
    positiveRate: 0,
    backlinkRate: 0,
    avgResponseTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger les campagnes
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('backlink_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      if (campaignsData) {
        setCampaigns(campaignsData);

        // Calculer les stats globales
        const totalSent = campaignsData.reduce((sum, c) => sum + c.sent_count, 0);
        const totalOpened = campaignsData.reduce((sum, c) => sum + c.opened_count, 0);
        const totalReplied = campaignsData.reduce((sum, c) => sum + c.replied_count, 0);
        const totalPositive = campaignsData.reduce((sum, c) => sum + c.positive_count, 0);
        const totalBacklinks = campaignsData.reduce((sum, c) => sum + c.backlinks_acquired, 0);

        setStats({
          totalSent,
          totalOpened,
          totalReplied,
          positiveRate: totalReplied > 0 ? (totalPositive / totalReplied) * 100 : 0,
          backlinkRate: totalSent > 0 ? (totalBacklinks / totalSent) * 100 : 0,
          avgResponseTime: 24 // Mock - à calculer depuis les logs
        });
      }

      // Charger les logs récents
      const { data: logsData, error: logsError } = await supabase
        .from('backlink_outreach_log')
        .select(`
          id,
          action_type,
          recipient_email,
          subject,
          sentiment,
          status,
          created_at,
          backlink_opportunities!inner (
            domain,
            url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;

      if (logsData) {
        setLogs(logsData.map((log: any) => ({
          ...log,
          opportunity: {
            domain: log.backlink_opportunities?.domain || 'Unknown',
            url: log.backlink_opportunities?.url || ''
          }
        })));
      }

    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const startAutomation = async () => {
    if (!selectedCampaign) {
      alert('Sélectionnez une campagne');
      return;
    }

    try {
      // AuthGuard protège déjà la route
      // Scanner les opportunités d'abord
      const scanResponse = await fetch('/api/backlink-automation.php?action=scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const scanResult = await scanResponse.json();

      if (!scanResult.success) {
        alert(`❌ Erreur lors du scan: ${scanResult.error}`);
        return;
      }

      // Lancer l'outreach sur la première opportunité trouvée
      if (scanResult.opportunities && scanResult.opportunities.length > 0) {
        const firstOpp = scanResult.opportunities[0];

        const outreachResponse = await fetch('/api/backlink-automation.php?action=outreach', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            opportunityId: firstOpp.id || 1,
            template: 'default'
          })
        });

        const outreachResult = await outreachResponse.json();

        if (outreachResult.success) {
          alert(`✅ Automation lancée !\n\n${scanResult.scanned} opportunités détectées\nEmails envoyés: 1 (simulation)`);
          loadData();
        } else {
          alert(`❌ Erreur: ${outreachResult.error}`);
        }
      } else {
        alert(`✅ Scan terminé !\n\n${scanResult.scanned} opportunités trouvées`);
        loadData();
      }
    } catch (error) {
      console.error('Erreur automation:', error);
      alert('❌ Erreur lors du lancement de l\'automation');
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'email_sent':
        return <Send size={16} className="text-blue-600" />;
      case 'email_opened':
        return <Eye size={16} className="text-purple-600" />;
      case 'email_replied':
        return <Mail size={16} className="text-green-600" />;
      case 'backlink_verified':
        return <CheckCircle size={16} className="text-emerald-600" />;
      default:
        return <Activity size={16} className="text-gray-600" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Zap className="mr-3 text-orange-500" size={32} />
              Dashboard Automation Backlinks
            </h1>
            <button
              onClick={() => navigate('/backoffice')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Home size={18} />
              Accueil Backoffice
            </button>
          </div>
          <p className="text-gray-600">
            Suivi en temps réel de vos campagnes d'acquisition de backlinks automatisées
          </p>
        </div>

        {/* Stats globales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Emails Envoyés</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalSent}</p>
              </div>
              <Send className="text-blue-600" size={24} />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Emails Ouverts</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalOpened}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.totalSent > 0 ? ((stats.totalOpened / stats.totalSent) * 100).toFixed(1) : 0}% taux ouverture
                </p>
              </div>
              <Eye className="text-purple-600" size={24} />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Réponses Reçues</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalReplied}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.positiveRate.toFixed(1)}% positives
                </p>
              </div>
              <Mail className="text-green-600" size={24} />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Backlinks Obtenus</p>
                <p className="text-3xl font-bold text-gray-900">
                  {campaigns.reduce((sum, c) => sum + c.backlinks_acquired, 0)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.backlinkRate.toFixed(1)}% taux conversion
                </p>
              </div>
              <Link2 className="text-orange-600" size={24} />
            </div>
          </Card>
        </div>

        {/* Campagnes actives */}
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="mr-2 text-indigo-600" size={24} />
              Campagnes d'Outreach
            </h2>
            <button
              onClick={startAutomation}
              disabled={!selectedCampaign}
              className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <Zap size={16} />
              <span>Lancer Automation</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    <input type="radio" name="campaign" className="mr-2" />
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Campagne</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Statut</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Envoyés</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Ouverts</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Réponses</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Backlinks</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Taux Conv.</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <input
                        type="radio"
                        name="campaign"
                        value={campaign.id}
                        checked={selectedCampaign === campaign.id}
                        onChange={() => setSelectedCampaign(campaign.id)}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{campaign.name}</div>
                      <div className="text-xs text-slate-500">
                        Créée le {new Date(campaign.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                        campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">{campaign.sent_count}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{campaign.opened_count}</td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {campaign.replied_count}
                      <span className="text-xs text-green-600 ml-1">
                        (+{campaign.positive_count})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-orange-600">{campaign.backlinks_acquired}</td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {campaign.sent_count > 0
                        ? ((campaign.backlinks_acquired / campaign.sent_count) * 100).toFixed(1)
                        : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Journal d'activité */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <Activity className="mr-2 text-purple-600" size={24} />
            Journal d'Activité (dernières actions)
          </h2>

          <div className="space-y-4">
            {logs.slice(0, 20).map((log) => (
              <div key={log.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="mt-1">{getActionIcon(log.action_type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">
                      {log.action_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <span className="text-xs text-slate-500">
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{log.recipient_email}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {log.opportunity.domain} - {log.subject}
                  </p>
                  {log.sentiment && (
                    <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${getSentimentColor(log.sentiment)}`}>
                      {log.sentiment}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BacklinkAutomationDashboard;
