import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';
import {
  FileText, Clock, User, Phone, Mail, CheckCircle, AlertTriangle,
  Play, Eye, RefreshCw, TrendingUp, Zap, FileCheck, ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface QueueItem {
  id: string;
  lead_id: string;
  priority_score: number;
  estimated_value: number;
  dossier_summary: any;
  recommended_companies: string[];
  documents_verified: boolean;
  added_at: string;
  claimed_by: string | null;
  claimed_at: string | null;
  status: string;
  lead?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    city: string;
    company_name: string;
    current_stage_key: string;
    ai_qualification_score: number;
  };
}

interface PipelineStats {
  total_leads: number;
  ready_for_quote: number;
  quote_pending: number;
  documents_collecting: number;
  avg_time_to_quote_hours: number;
}

const QuoteQueueDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'claimed'>('waiting');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadData = async () => {
    setIsLoading(true);

    let query = supabase
      .from('ready_for_quote_queue')
      .select(`
        *,
        lead:crm_leads(
          first_name, last_name, email, phone, city,
          company_name, current_stage_key, ai_qualification_score
        )
      `)
      .order('priority_score', { ascending: false })
      .order('added_at', { ascending: true });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data } = await query.limit(50);
    setQueue(data || []);

    const { data: statsData } = await supabase.rpc('get_pipeline_stats').maybeSingle();
    if (statsData) setStats(statsData);

    setIsLoading(false);
  };

  const claimLead = async (queueId: string, leadId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.info('Vous devez être connecté pour prendre un lead');
      return;
    }

    try {
      const { error } = await supabase.from('ready_for_quote_queue').update({
        claimed_by: user.id,
        claimed_at: new Date().toISOString(),
        status: 'claimed'
      }).eq('id', queueId);

      if (error) throw error;

      // Notification de succès
      console.log('Lead récupéré avec succès:', leadId);

      await loadData();
    } catch (error) {
      console.error('Erreur lors de la prise en charge:', error);
      toast.error('Erreur lors de la prise en charge du lead');
    }
  };

  const startQuote = async (item: QueueItem) => {
    if (!item.lead_id) {
      toast.error('Erreur: Lead ID manquant');
      return;
    }

    try {
      // Mettre à jour le statut de la queue
      const { error: queueError } = await supabase
        .from('ready_for_quote_queue')
        .update({
          status: 'in_progress'
        })
        .eq('id', item.id);

      if (queueError) throw queueError;

      // Mettre à jour le statut du lead
      const { error: leadError } = await supabase
        .from('crm_leads')
        .update({
          current_stage_key: 'quote_pending'
        })
        .eq('id', item.lead_id);

      if (leadError) throw leadError;

      // Naviguer vers la page du lead
      navigate(`/backoffice/crm/lead/${item.lead_id}`);
    } catch (error) {
      console.error('Erreur lors du démarrage du devis:', error);
      toast.error('Erreur lors du démarrage du processus de devis');
    }
  };

  const getWaitTime = (addedAt: string) => {
    const hours = Math.floor((Date.now() - new Date(addedAt).getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'Moins d\'1h';
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}j ${hours % 24}h`;
  };

  const getPriorityColor = (score: number) => {
    if (score >= 80) return 'bg-red-100 text-red-800 border-red-200';
    if (score >= 60) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            File d'Attente Devis
          </h1>
          <p className="text-gray-500 mt-1">Dossiers complets prets pour etablir un devis</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total_leads}</p>
                <p className="text-xs text-gray-500">Leads actifs</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.ready_for_quote}</p>
                <p className="text-xs text-gray-500">Prets pour devis</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.quote_pending}</p>
                <p className="text-xs text-gray-500">Devis en cours</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.documents_collecting}</p>
                <p className="text-xs text-gray-500">Collecte docs</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.avg_time_to_quote_hours}h</p>
                <p className="text-xs text-gray-500">Temps moyen devis</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {(['waiting', 'claimed', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f === 'waiting' && 'En attente'}
            {f === 'claimed' && 'Reclames'}
            {f === 'all' && 'Tous'}
            {f === 'waiting' && queue.filter(q => q.status === 'waiting').length > 0 && (
              <span className="ml-2 bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs">
                {queue.filter(q => q.status === 'waiting').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {queue.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun dossier en attente</h3>
          <p className="text-gray-500">
            Les dossiers complets apparaitront ici automatiquement
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl border p-4 hover:shadow-md transition ${
                item.status === 'waiting' ? 'border-l-4 border-l-green-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(item.priority_score)}`}>
                    Score {item.priority_score}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {item.lead?.first_name} {item.lead?.last_name}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {item.lead?.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {item.lead?.phone}
                      </span>
                      {item.lead?.city && (
                        <span>{item.lead.city}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      {item.documents_verified && (
                        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          <CheckCircle className="w-3 h-3" />
                          Documents verifies
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        En attente depuis {getWaitTime(item.added_at)}
                      </span>
                      {item.lead?.ai_qualification_score && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          Score IA: {item.lead.ai_qualification_score}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.status === 'waiting' ? (
                    <>
                      <button
                        onClick={() => claimLead(item.id, item.lead_id)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        title="Prendre en charge ce lead"
                      >
                        <Play className="w-4 h-4" />
                        Prendre
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startQuote(item)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Creer devis
                    </button>
                  )}
                  <button
                    onClick={() => {
                      console.log('Navigation vers lead:', item.lead_id);
                      if (!item.lead_id) {
                        toast.error('Erreur: Lead ID manquant');
                        return;
                      }
                      navigate(`/backoffice/crm/lead/${item.lead_id}`);
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    title="Voir le détail du lead"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-xl shadow-sm">
            <Zap className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Pipeline 100% Autonome</h3>
            <p className="text-sm text-gray-600">
              Le systeme gere automatiquement : qualification IA, emails de bienvenue,
              collecte et verification des documents, relances intelligentes.
              <strong className="text-blue-700"> Vous n'intervenez que pour creer le devis et emettre le contrat.</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteQueueDashboard;
