import React, { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, Globe, Mail, Clock, CheckCircle,
  XCircle, AlertCircle, ChevronDown, ChevronUp, Eye, Send,
  Link2, Activity, Calendar, Filter, Download, RefreshCw, Home
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';

interface OpportunityDetail {
  id: string;
  domain: string;
  url: string;
  status: string;
  quality_score: number;
  contact_email: string;
  created_at: string;
  contacted_at?: string;
  responded_at?: string;
  partner_backlink_url?: string;
  our_backlink_url?: string;
  verification_status?: string;
}

interface DetailedStats {
  scraped_sites: number;
  new_opportunities: number;
  contacted: number;
  emails_sent: number;
  emails_opened: number;
  emails_bounced: number;
  first_followup: number;
  second_followup: number;
  third_followup: number;
  positive_responses: number;
  negative_responses: number;
  no_response: number;
  accepted: number;
  backlinks_verified: number;
  backlinks_broken: number;
  avg_response_time: number;
  avg_quality_score: number;
}

const BacklinkReports: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DetailedStats>({
    scraped_sites: 0,
    new_opportunities: 0,
    contacted: 0,
    emails_sent: 0,
    emails_opened: 0,
    emails_bounced: 0,
    first_followup: 0,
    second_followup: 0,
    third_followup: 0,
    positive_responses: 0,
    negative_responses: 0,
    no_response: 0,
    accepted: 0,
    backlinks_verified: 0,
    backlinks_broken: 0,
    avg_response_time: 0,
    avg_quality_score: 0
  });

  const [opportunities, setOpportunities] = useState<OpportunityDetail[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    loadDetailedStats();
  }, [dateRange]);

  const loadDetailedStats = async () => {
    setLoading(true);
    try {
      // Calculer date de début selon période
      const dateFrom = dateRange === 'all' ? '2020-01-01' :
        new Date(Date.now() - (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90) * 86400000).toISOString();

      // Charger toutes les opportunités
      const { data: oppsData, error: oppsError } = await supabase
        .from('backlink_opportunities')
        .select('*')
        .gte('created_at', dateFrom)
        .order('created_at', { ascending: false });

      if (oppsError) throw oppsError;

      // Charger les logs d'outreach
      const { data: logsData, error: logsError } = await supabase
        .from('backlink_outreach_log')
        .select('*')
        .gte('created_at', dateFrom);

      if (logsError) console.error('Erreur logs:', logsError);

      if (oppsData) {
        setOpportunities(oppsData);

        // Calculer statistiques détaillées
        const totalOpps = oppsData.length;
        const contacted = oppsData.filter(o => o.status === 'contacted' || o.status === 'responded' || o.status === 'acquired').length;
        const responded = oppsData.filter(o => o.status === 'responded' || o.status === 'acquired').length;
        const accepted = oppsData.filter(o => o.status === 'acquired').length;
        const verified = oppsData.filter(o => o.verification_status === 'verified').length;
        const broken = oppsData.filter(o => o.verification_status === 'broken').length;

        // Compter emails depuis logs
        const emailsSent = logsData?.filter(l => l.action_type === 'email_sent').length || 0;
        const emailsOpened = logsData?.filter(l => l.action_type === 'email_opened').length || 0;
        const bounced = logsData?.filter(l => l.action_type === 'email_bounced').length || 0;

        // Compter relances
        const followups = logsData?.filter(l => l.action_type === 'followup_sent') || [];
        const firstFollowup = followups.filter(f => f.metadata?.followup_number === 1).length;
        const secondFollowup = followups.filter(f => f.metadata?.followup_number === 2).length;
        const thirdFollowup = followups.filter(f => f.metadata?.followup_number === 3).length;

        // Réponses positives/négatives
        const positiveResponses = logsData?.filter(l => l.sentiment === 'positive').length || 0;
        const negativeResponses = logsData?.filter(l => l.sentiment === 'negative').length || 0;
        const noResponse = contacted - responded;

        // Score qualité moyen
        const avgQuality = oppsData.length > 0
          ? oppsData.reduce((sum, o) => sum + (o.quality_score || 0), 0) / oppsData.length
          : 0;

        setStats({
          scraped_sites: totalOpps,
          new_opportunities: oppsData.filter(o => o.status === 'new').length,
          contacted,
          emails_sent: emailsSent,
          emails_opened: emailsOpened,
          emails_bounced: bounced,
          first_followup: firstFollowup,
          second_followup: secondFollowup,
          third_followup: thirdFollowup,
          positive_responses: positiveResponses,
          negative_responses: negativeResponses,
          no_response: noResponse,
          accepted,
          backlinks_verified: verified,
          backlinks_broken: broken,
          avg_response_time: 24, // TODO: Calculer depuis logs
          avg_quality_score: avgQuality
        });
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredOpportunities = () => {
    if (selectedStatus === 'all') return opportunities;
    return opportunities.filter(o => o.status === selectedStatus);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      responded: 'bg-purple-100 text-purple-800',
      acquired: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const exportToCSV = () => {
    const csv = [
      ['Domaine', 'URL', 'Statut', 'Score Qualité', 'Email', 'Date Création', 'Date Contact'],
      ...opportunities.map(o => [
        o.domain,
        o.url,
        o.status,
        o.quality_score,
        o.contact_email,
        new Date(o.created_at).toLocaleDateString('fr-FR'),
        o.contacted_at ? new Date(o.contacted_at).toLocaleDateString('fr-FR') : 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backlinks-report-${dateRange}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
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
              <BarChart3 className="mr-3 text-orange-500" size={32} />
              Rapports Détaillés Backlinks
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={async () => {
                  if (!confirm('Envoyer 5 emails maintenant ?')) return;
                  setLoading(true);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

                    const response = await fetch(
                      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backlink-auto-outreach`,
                      {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ maxEmailsPerRun: 5 })
                      }
                    );

                    if (!response.ok) {
                      throw new Error('Erreur envoi emails');
                    }

                    const result = await response.json();
                    alert(`✅ ${result.emailsSent || 0} emails envoyés !`);
                    setTimeout(loadDetailedStats, 2000);
                  } catch (error: any) {
                    alert(`❌ Erreur: ${error.message}`);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <Send size={18} />
                Envoyer Emails
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download size={18} />
                Exporter CSV
              </button>
              <button
                onClick={loadDetailedStats}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw size={18} />
                Actualiser
              </button>
              <button
                onClick={() => navigate('/backoffice')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <Home size={18} />
                Accueil
              </button>
            </div>
          </div>

          {/* Alerte emails en attente */}
          {opportunities.filter(o => o.status === 'pending' && o.contact_email).length > 0 && stats.emails_sent === 0 && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-blue-600 flex-shrink-0" size={24} />
                <div>
                  <h3 className="font-bold text-blue-900 mb-1">
                    {opportunities.filter(o => o.status === 'pending' && o.contact_email).length} emails prêts à envoyer
                  </h3>
                  <p className="text-sm text-blue-700">
                    Cliquez sur le bouton "Envoyer Emails" ci-dessus pour lancer la campagne d'outreach.
                    Les emails seront envoyés aux sites scrapés avec un message personnalisé.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filtres période */}
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-600" />
            <span className="text-sm text-gray-600 mr-2">Période:</span>
            {(['7d', '30d', '90d', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setDateRange(period)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  dateRange === period
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {period === '7d' ? '7 jours' : period === '30d' ? '30 jours' : period === '90d' ? '90 jours' : 'Tout'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Générales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Sites Scrapés</p>
                <p className="text-3xl font-bold text-gray-900">{stats.scraped_sites}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.new_opportunities} nouvelles opportunités
                </p>
              </div>
              <Globe className="text-blue-600" size={24} />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Emails Envoyés</p>
                <p className="text-3xl font-bold text-gray-900">{stats.emails_sent}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.emails_opened} ouverts ({stats.emails_sent > 0 ? ((stats.emails_opened / stats.emails_sent) * 100).toFixed(1) : 0}%)
                </p>
              </div>
              <Send className="text-orange-600" size={24} />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Réponses</p>
                <p className="text-3xl font-bold text-gray-900">{stats.positive_responses + stats.negative_responses}</p>
                <p className="text-xs text-green-600 mt-1">
                  {stats.positive_responses} positives ({stats.emails_sent > 0 ? ((stats.positive_responses / stats.emails_sent) * 100).toFixed(1) : 0}%)
                </p>
              </div>
              <Mail className="text-purple-600" size={24} />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Backlinks Acquis</p>
                <p className="text-3xl font-bold text-gray-900">{stats.accepted}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.backlinks_verified} vérifiés
                </p>
              </div>
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </Card>
        </div>

        {/* Stats Relances */}
        <Card className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <Clock className="mr-2 text-orange-600" size={24} />
            Détail des Relances
          </h2>
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{stats.contacted}</div>
              <div className="text-sm text-gray-600 mt-1">Sites Contactés</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{stats.first_followup}</div>
              <div className="text-sm text-gray-600 mt-1">1ère Relance</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{stats.second_followup}</div>
              <div className="text-sm text-gray-600 mt-1">2ème Relance</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{stats.third_followup}</div>
              <div className="text-sm text-gray-600 mt-1">3ème Relance</div>
            </div>
          </div>
        </Card>

        {/* Détail des Opportunités */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Filter className="mr-2 text-orange-600" size={24} />
              Détail des Opportunités ({getFilteredOpportunities().length})
            </h2>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="new">Nouveaux</option>
              <option value="contacted">Contactés</option>
              <option value="responded">Réponses reçues</option>
              <option value="acquired">Backlinks acquis</option>
              <option value="rejected">Rejetés</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Domaine</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Statut</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Score</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Créé</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Détails</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredOpportunities().map((opp) => (
                  <React.Fragment key={opp.id}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{opp.domain}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">{opp.url}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(opp.status)}`}>
                          {opp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-orange-600">{opp.quality_score?.toFixed(0) || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{opp.contact_email || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(opp.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setExpandedRow(expandedRow === opp.id ? null : opp.id)}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          {expandedRow === opp.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </td>
                    </tr>
                    {expandedRow === opp.id && (
                      <tr>
                        <td colSpan={6} className="bg-gray-50 p-6">
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <h3 className="font-bold text-gray-900 mb-3">Informations</h3>
                              <dl className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <dt className="text-gray-600">URL complète:</dt>
                                  <dd className="font-medium text-gray-900 truncate ml-2">{opp.url}</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-gray-600">Date contact:</dt>
                                  <dd className="font-medium text-gray-900">
                                    {opp.contacted_at ? new Date(opp.contacted_at).toLocaleString('fr-FR') : 'Pas encore contacté'}
                                  </dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-gray-600">Date réponse:</dt>
                                  <dd className="font-medium text-gray-900">
                                    {opp.responded_at ? new Date(opp.responded_at).toLocaleString('fr-FR') : 'Pas de réponse'}
                                  </dd>
                                </div>
                              </dl>
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 mb-3">Backlinks</h3>
                              <dl className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <dt className="text-gray-600">Notre backlink:</dt>
                                  <dd className="font-medium text-gray-900">
                                    {opp.our_backlink_url || 'Non envoyé'}
                                  </dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-gray-600">Leur backlink:</dt>
                                  <dd className="font-medium text-gray-900">
                                    {opp.partner_backlink_url || 'Non reçu'}
                                  </dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-gray-600">Vérification:</dt>
                                  <dd>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      opp.verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                                      opp.verification_status === 'broken' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {opp.verification_status || 'pending'}
                                    </span>
                                  </dd>
                                </div>
                              </dl>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BacklinkReports;
