import React, { useState, useEffect } from 'react';
import {
  Mail, TrendingUp, TrendingDown, BarChart3, Calendar, Clock,
  Send, Inbox, AlertCircle, CheckCircle, Activity, Filter,
  Download, RefreshCw, ArrowUp, ArrowDown, Minus, Target,
  Users, MessageSquare, Star, Zap, Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface EmailInteraction {
  id: string;
  type: string;
  direction: string;
  subject?: string;
  content?: string;
  sentiment_score?: number;
  created_at: string;
  response_time_minutes?: number;
}

interface TimeSeriesData {
  date: string;
  sent: number;
  received: number;
  responseTime: number;
}

interface Stats {
  totalSent: number;
  totalReceived: number;
  avgResponseTime: number;
  sentimentScore: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

interface EmailTrendlineProps {
  leadId?: string;
  clientId?: string;
  period?: 'week' | 'month' | 'quarter' | 'year';
}

const EmailTrendline: React.FC<EmailTrendlineProps> = ({ leadId, clientId, period = 'month' }) => {
  const [interactions, setInteractions] = useState<EmailInteraction[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSent: 0,
    totalReceived: 0,
    avgResponseTime: 0,
    sentimentScore: 0,
    trend: 'stable',
    trendPercent: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [chartHeight, setChartHeight] = useState(300);

  useEffect(() => {
    loadEmailData();
  }, [leadId, clientId, selectedPeriod]);

  const loadEmailData = async () => {
    setLoading(true);
    try {
      const daysBack = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : selectedPeriod === 'quarter' ? 90 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      let query = supabase
        .from('crm_interactions')
        .select('*')
        .eq('type', 'email')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const emailData = data || [];
      setInteractions(emailData);

      // Calculate stats
      const sent = emailData.filter(e => e.direction === 'outbound').length;
      const received = emailData.filter(e => e.direction === 'inbound').length;

      const responseTimes = emailData
        .filter(e => e.response_time_minutes !== null && e.response_time_minutes !== undefined)
        .map(e => e.response_time_minutes || 0);

      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      const sentimentScores = emailData
        .filter(e => e.sentiment_score !== null && e.sentiment_score !== undefined)
        .map(e => e.sentiment_score || 0);

      const avgSentiment = sentimentScores.length > 0
        ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
        : 0;

      // Calculate trend (compare last period vs previous period)
      const midPoint = Math.floor(emailData.length / 2);
      const firstHalf = emailData.slice(0, midPoint).length;
      const secondHalf = emailData.length - midPoint;
      const trendPercent = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
      const trend = trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'stable';

      setStats({
        totalSent: sent,
        totalReceived: received,
        avgResponseTime,
        sentimentScore: avgSentiment,
        trend,
        trendPercent: Math.abs(trendPercent)
      });

      // Generate time series data
      const timeSeries = generateTimeSeriesData(emailData, daysBack);
      setTimeSeriesData(timeSeries);

    } catch (error) {
      console.error('Error loading email data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSeriesData = (data: EmailInteraction[], days: number): TimeSeriesData[] => {
    const series: TimeSeriesData[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = data.filter(e => {
        const eDate = new Date(e.created_at).toISOString().split('T')[0];
        return eDate === dateStr;
      });

      const sent = dayData.filter(e => e.direction === 'outbound').length;
      const received = dayData.filter(e => e.direction === 'inbound').length;

      const responseTimes = dayData
        .filter(e => e.response_time_minutes !== null)
        .map(e => e.response_time_minutes || 0);

      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      series.push({
        date: dateStr,
        sent,
        received,
        responseTime: avgResponseTime
      });
    }

    return series;
  };

  const maxValue = Math.max(...timeSeriesData.map(d => Math.max(d.sent, d.received)), 1);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}j`;
  };

  const getSentimentColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSentimentLabel = (score: number) => {
    if (score >= 0.7) return 'Positif';
    if (score >= 0.4) return 'Neutre';
    return 'Négatif';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Analytics Emails</h3>
          <p className="text-gray-600 mt-1">Suivi des échanges et tendances</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            <option value="week">7 derniers jours</option>
            <option value="month">30 derniers jours</option>
            <option value="quarter">90 derniers jours</option>
            <option value="year">1 an</option>
          </select>

          <button
            onClick={loadEmailData}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500 rounded-lg">
              <Send className="w-6 h-6 text-white" />
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
              stats.trend === 'up' ? 'bg-green-100 text-green-700' :
              stats.trend === 'down' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {stats.trend === 'up' ? <ArrowUp className="w-3 h-3" /> :
               stats.trend === 'down' ? <ArrowDown className="w-3 h-3" /> :
               <Minus className="w-3 h-3" />}
              {stats.trendPercent.toFixed(0)}%
            </div>
          </div>
          <p className="text-blue-600 text-sm font-semibold">Emails Envoyés</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{stats.totalSent}</p>
          <p className="text-blue-500 text-xs mt-2">Cette période</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500 rounded-lg">
              <Inbox className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-green-600 text-sm font-semibold">Emails Reçus</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{stats.totalReceived}</p>
          <p className="text-green-500 text-xs mt-2">Réponses prospects</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500 rounded-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <Activity className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-purple-600 text-sm font-semibold">Temps de Réponse Moyen</p>
          <p className="text-3xl font-bold text-purple-700 mt-1">{formatResponseTime(stats.avgResponseTime)}</p>
          <p className="text-purple-500 text-xs mt-2">Réactivité</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border border-yellow-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-500 rounded-lg">
              <Star className="w-6 h-6 text-white" />
            </div>
            <MessageSquare className="w-6 h-6 text-yellow-600" />
          </div>
          <p className="text-yellow-600 text-sm font-semibold">Sentiment Moyen</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className={`text-3xl font-bold ${getSentimentColor(stats.sentimentScore)}`}>
              {(stats.sentimentScore * 100).toFixed(0)}%
            </p>
            <span className={`text-sm font-semibold ${getSentimentColor(stats.sentimentScore)}`}>
              {getSentimentLabel(stats.sentimentScore)}
            </span>
          </div>
          <p className="text-yellow-500 text-xs mt-2">Analyse IA</p>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-bold text-gray-900">Évolution des Échanges</h4>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-gray-600">Envoyés</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-gray-600">Reçus</span>
            </div>
          </div>
        </div>

        {timeSeriesData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>Aucune donnée disponible pour cette période</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Chart */}
            <div className="relative" style={{ height: `${chartHeight}px` }}>
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="border-t border-gray-100"></div>
                ))}
              </div>

              {/* Bars */}
              <div className="absolute inset-0 flex items-end justify-between gap-1">
                {timeSeriesData.map((data, index) => {
                  const sentHeight = (data.sent / maxValue) * (chartHeight - 40);
                  const receivedHeight = (data.received / maxValue) * (chartHeight - 40);

                  return (
                    <div key={index} className="flex-1 flex items-end justify-center gap-1 group relative">
                      {/* Sent bar */}
                      <div
                        className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-all cursor-pointer"
                        style={{ height: `${sentHeight}px`, minHeight: data.sent > 0 ? '4px' : '0' }}
                        title={`${formatDate(data.date)}: ${data.sent} envoyés`}
                      ></div>

                      {/* Received bar */}
                      <div
                        className="flex-1 bg-green-500 rounded-t hover:bg-green-600 transition-all cursor-pointer"
                        style={{ height: `${receivedHeight}px`, minHeight: data.received > 0 ? '4px' : '0' }}
                        title={`${formatDate(data.date)}: ${data.received} reçus`}
                      ></div>

                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        <div className="font-semibold mb-1">{formatDate(data.date)}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-400">↑ {data.sent}</span>
                          <span className="text-green-400">↓ {data.received}</span>
                        </div>
                        {data.responseTime > 0 && (
                          <div className="text-purple-400 mt-1">
                            ⏱ {formatResponseTime(data.responseTime)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
              {timeSeriesData.filter((_, i) => i % Math.ceil(timeSeriesData.length / 7) === 0).map((data, index) => (
                <span key={index}>{formatDate(data.date)}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Interactions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4">Derniers Échanges</h4>

        {interactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>Aucun échange récent</p>
          </div>
        ) : (
          <div className="space-y-3">
            {interactions.slice(-5).reverse().map((interaction) => (
              <div key={interaction.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className={`p-2 rounded-lg ${
                  interaction.direction === 'outbound' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {interaction.direction === 'outbound' ? (
                    <Send className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Inbox className="w-5 h-5 text-green-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h5 className="font-semibold text-gray-900 truncate">
                      {interaction.subject || 'Sans objet'}
                    </h5>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(interaction.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>

                  {interaction.content && (
                    <p className="text-sm text-gray-600 line-clamp-2">{interaction.content}</p>
                  )}

                  <div className="flex items-center gap-4 mt-2">
                    {interaction.sentiment_score !== null && interaction.sentiment_score !== undefined && (
                      <span className={`text-xs font-semibold ${getSentimentColor(interaction.sentiment_score)}`}>
                        {getSentimentLabel(interaction.sentiment_score)}
                      </span>
                    )}
                    {interaction.response_time_minutes !== null && interaction.response_time_minutes !== undefined && (
                      <span className="text-xs text-purple-600 font-medium">
                        ⏱ {formatResponseTime(interaction.response_time_minutes)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-6 rounded-xl border border-cyan-200">
          <div className="flex items-center gap-3 mb-3">
            <Target className="w-8 h-8 text-cyan-600" />
            <h5 className="font-bold text-cyan-900">Taux de Réponse</h5>
          </div>
          <p className="text-3xl font-bold text-cyan-700">
            {stats.totalSent > 0 ? ((stats.totalReceived / stats.totalSent) * 100).toFixed(0) : 0}%
          </p>
          <p className="text-sm text-cyan-600 mt-2">
            {stats.totalReceived} réponses sur {stats.totalSent} emails
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-8 h-8 text-orange-600" />
            <h5 className="font-bold text-orange-900">Engagement</h5>
          </div>
          <p className="text-3xl font-bold text-orange-700">
            {stats.totalSent + stats.totalReceived > 0 ? 'Actif' : 'Faible'}
          </p>
          <p className="text-sm text-orange-600 mt-2">
            {stats.totalSent + stats.totalReceived} échanges totaux
          </p>
        </div>

        <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-6 rounded-xl border border-pink-200">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-8 h-8 text-pink-600" />
            <h5 className="font-bold text-pink-900">Tendance</h5>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold text-pink-700">
              {stats.trend === 'up' ? '↗' : stats.trend === 'down' ? '↘' : '→'}
            </p>
            <span className="text-pink-700 font-semibold">
              {stats.trend === 'up' ? 'En hausse' : stats.trend === 'down' ? 'En baisse' : 'Stable'}
            </span>
          </div>
          <p className="text-sm text-pink-600 mt-2">
            {stats.trendPercent.toFixed(0)}% vs période précédente
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailTrendline;
