import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, Globe, Users, Zap, TrendingUp, Mail } from 'lucide-react';

interface EngagementScore {
  lead_id: string;
  engagement_score: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  last_interaction_at: string;
  leads: {
    name: string;
    email: string;
  };
}

interface GeoStats {
  country_name: string;
  count: number;
}

interface ABTestStats {
  name: string;
  status: string;
  variant_a_opens: number;
  variant_b_opens: number;
}

export default function EmailAdvancedAnalytics() {
  const [topEngaged, setTopEngaged] = useState<EngagementScore[]>([]);
  const [geoStats, setGeoStats] = useState<GeoStats[]>([]);
  const [abTests, setAbTests] = useState<ABTestStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // Refresh chaque minute
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Top leads engagés
      const { data: scores } = await supabase
        .from('lead_engagement_scores')
        .select('*, leads(name, email)')
        .order('engagement_score', { ascending: false })
        .limit(10);

      if (scores) setTopEngaged(scores);

      // Stats géolocalisation
      const { data: geo } = await supabase
        .from('email_geolocation')
        .select('country_name')
        .not('country_name', 'is', null);

      if (geo) {
        const countryCount: Record<string, number> = {};
        geo.forEach((item) => {
          if (item.country_name) {
            countryCount[item.country_name] = (countryCount[item.country_name] || 0) + 1;
          }
        });

        const geoArray = Object.entries(countryCount)
          .map(([country_name, count]) => ({ country_name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setGeoStats(geoArray);
      }

      // Tests A/B
      const { data: tests } = await supabase
        .from('email_ab_tests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (tests) {
        const testsWithStats = await Promise.all(
          tests.map(async (test) => {
            const { data: variants } = await supabase
              .from('email_ab_variants')
              .select('variant, email_send_id')
              .eq('ab_test_id', test.id);

            let variant_a_opens = 0;
            let variant_b_opens = 0;

            if (variants) {
              for (const variant of variants) {
                const { count } = await supabase
                  .from('email_opens')
                  .select('*', { count: 'exact', head: true })
                  .eq('email_send_id', variant.email_send_id);

                if (variant.variant === 'A') variant_a_opens += count || 0;
                else variant_b_opens += count || 0;
              }
            }

            return {
              name: test.name,
              status: test.status,
              variant_a_opens,
              variant_b_opens
            };
          })
        );

        setAbTests(testsWithStats);
      }

      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement analytics:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Analytics Avancées</h1>
            <p className="text-green-100">Analyse approfondie de vos campagnes emails</p>
          </div>
          <Zap className="w-16 h-16 opacity-50" />
        </div>
      </div>

      {/* Top Leads Engagés */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">Top 10 Leads les Plus Engagés</h2>
        </div>

        <div className="space-y-3">
          {topEngaged.map((lead, index) => (
            <div
              key={lead.lead_id}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg hover:shadow-md transition"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white font-bold">
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{lead.leads.name}</p>
                  <p className="text-sm text-gray-600">{lead.leads.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{lead.engagement_score}</p>
                  <p className="text-xs text-gray-500">Score</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-700">
                    <span className="text-green-600 font-semibold">{lead.open_rate.toFixed(1)}%</span> ouvertures
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="text-blue-600 font-semibold">{lead.click_rate.toFixed(1)}%</span> clics
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="text-purple-600 font-semibold">{lead.reply_rate.toFixed(1)}%</span> réponses
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Géolocalisation */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Top 5 Pays</h2>
          </div>

          <div className="space-y-3">
            {geoStats.map((stat, index) => (
              <div key={stat.country_name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index]}</span>
                  <span className="font-medium text-gray-900">{stat.country_name}</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{stat.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tests A/B */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Tests A/B Récents</h2>
          </div>

          <div className="space-y-4">
            {abTests.map((test) => (
              <div key={test.name} className="border-l-4 border-purple-600 pl-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">{test.name}</p>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    test.status === 'running' ? 'bg-green-100 text-green-800' :
                    test.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {test.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Variante A: </span>
                    <span className="font-semibold text-purple-600">{test.variant_a_opens} ouvertures</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Variante B: </span>
                    <span className="font-semibold text-purple-600">{test.variant_b_opens} ouvertures</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
