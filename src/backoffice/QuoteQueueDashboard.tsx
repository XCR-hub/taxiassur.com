import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';
import {
  FileText, Clock, User, Phone, Mail, CheckCircle, AlertTriangle,
  Play, Eye, RefreshCw, TrendingUp, Zap, FileCheck, ArrowRight,
  MapPin, Building2, Star, Activity, ChevronRight, Inbox,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface QueueItem {
  id: string;
  lead_id: string;
  priority_score: number;
  estimated_value: number;
  dossier_summary: Record<string, unknown>;
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

type FilterType = 'waiting' | 'claimed' | 'all';

const QuoteQueueDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [allQueue, setAllQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('waiting');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    const [allResult, statsResult, userResult] = await Promise.all([
      supabase
        .from('ready_for_quote_queue')
        .select(`
          *,
          lead:crm_leads(
            first_name, last_name, email, phone, city,
            company_name, current_stage_key, ai_qualification_score
          )
        `)
        .order('priority_score', { ascending: false })
        .order('added_at', { ascending: true })
        .limit(100),
      supabase.rpc('get_pipeline_stats').maybeSingle(),
      supabase.auth.getUser(),
    ]);

    const items: QueueItem[] = allResult.data || [];
    setAllQueue(items);
    setStats(statsResult.data || null);
    setCurrentUserId(userResult.data?.user?.id || null);
    if (!silent) setIsLoading(false);
    else setIsRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('quote_queue_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ready_for_quote_queue',
      }, () => {
        loadData(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  useEffect(() => {
    if (filter === 'all') {
      setQueue(allQueue);
    } else {
      setQueue(allQueue.filter(item => item.status === filter));
    }
  }, [filter, allQueue]);

  const waitingCount = allQueue.filter(q => q.status === 'waiting').length;
  const claimedCount = allQueue.filter(q => q.status === 'claimed').length;

  const claimLead = async (queueId: string, leadId: string) => {
    if (!currentUserId) {
      toast.info('Vous devez être connecté pour prendre un lead');
      return;
    }
    try {
      const { error } = await supabase.from('ready_for_quote_queue').update({
        claimed_by: currentUserId,
        claimed_at: new Date().toISOString(),
        status: 'claimed',
      }).eq('id', queueId);
      if (error) throw error;
      toast.success('Lead pris en charge avec succès');
      await loadData(true);
    } catch {
      toast.error('Erreur lors de la prise en charge du lead');
    }
  };

  const startQuote = async (item: QueueItem) => {
    if (!item.lead_id) { toast.error('Lead ID manquant'); return; }
    try {
      await Promise.all([
        supabase.from('ready_for_quote_queue').update({ status: 'in_progress' }).eq('id', item.id),
        supabase.from('crm_leads').update({ current_stage_key: 'quote_pending' }).eq('id', item.lead_id),
      ]);
      navigate(`/backoffice/crm/lead/${item.lead_id}`);
    } catch {
      toast.error('Erreur lors du démarrage du devis');
    }
  };

  const getWaitTime = (addedAt: string) => {
    const hours = Math.floor((Date.now() - new Date(addedAt).getTime()) / (1000 * 60 * 60));
    if (hours < 1) return "Moins d'1h";
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}j ${hours % 24}h`;
  };

  const isUrgent = (addedAt: string) => {
    const hours = (Date.now() - new Date(addedAt).getTime()) / (1000 * 60 * 60);
    return hours > 4;
  };

  const getPriorityLabel = (score: number) => {
    if (score >= 80) return { label: 'Urgent', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
    if (score >= 60) return { label: 'Haute', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
    return { label: 'Normal', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' };
  };

  const statCards = [
    { label: 'Leads actifs',     value: stats?.total_leads ?? '—',                    icon: <User size={16} />,      color: '#3b82f6' },
    { label: 'Prêts pour devis', value: stats?.ready_for_quote ?? '—',                icon: <FileCheck size={16} />, color: '#10b981' },
    { label: 'Devis en cours',   value: stats?.quote_pending ?? '—',                  icon: <Clock size={16} />,     color: '#f59e0b' },
    { label: 'Collecte docs',    value: stats?.documents_collecting ?? '—',           icon: <FileText size={16} />,  color: '#06b6d4' },
    { label: 'Temps moyen',      value: stats ? `${stats.avg_time_to_quote_hours}h` : '—', icon: <TrendingUp size={16} />, color: '#34d399' },
  ];

  return (
    <div
      className="flex flex-col h-full overflow-auto"
      style={{ background: '#0f1117', minHeight: '100%' }}
    >
      {/* ── HEADER ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between"
        style={{
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.015)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.25)',
            }}
          >
            <Inbox size={18} style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <h1 className="font-bold text-base" style={{ color: '#fff', letterSpacing: '-0.01em' }}>
              File d'Attente Devis
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
              Dossiers complets — prêts pour établir un devis
            </p>
          </div>
        </div>

        <button
          onClick={() => loadData(true)}
          className="flex items-center gap-2 transition-all"
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: isRefreshing ? '#3b82f6' : 'rgba(255,255,255,0.5)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      <div style={{ padding: '20px 24px', flex: 1 }}>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-5 gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {statCards.map((card, i) => (
            <div
              key={i}
              className="flex items-center gap-3"
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: `${card.color}18`,
                  color: card.color,
                }}
              >
                {card.icon}
              </div>
              <div>
                <div className="font-bold" style={{ color: card.color, fontSize: 20, lineHeight: 1.1 }}>
                  {isLoading ? '…' : card.value}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── FILTER TABS ── */}
        <div className="flex items-center gap-2 mb-4">
          {([
            { key: 'waiting' as FilterType, label: 'En attente', count: waitingCount },
            { key: 'claimed' as FilterType, label: 'Réclamés',   count: claimedCount },
            { key: 'all' as FilterType,     label: 'Tous',       count: allQueue.length },
          ] as const).map(tab => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className="flex items-center gap-2 transition-all"
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: active ? '#3b82f6' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                  color: active ? '#fff' : 'rgba(255,255,255,0.45)',
                  fontSize: 12.5,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    style={{
                      background: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                      color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                      borderRadius: 99,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 6px',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}

          {waitingCount > 0 && (
            <div
              className="flex items-center gap-1.5 ml-auto"
              style={{ color: '#10b981', fontSize: 11.5 }}
            >
              <Activity size={12} />
              <span>Synchronisation en temps réel</span>
            </div>
          )}
        </div>

        {/* ── QUEUE LIST ── */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  height: 88,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            ))}
          </div>
        ) : queue.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center"
            style={{
              padding: '64px 24px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.055)',
            }}
          >
            <div
              className="flex items-center justify-center mb-4"
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: 'rgba(59,130,246,0.08)',
                color: 'rgba(59,130,246,0.4)',
              }}
            >
              <Zap size={24} />
            </div>
            <h3 className="font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>
              Aucun dossier {filter === 'waiting' ? 'en attente' : filter === 'claimed' ? 'réclamé' : ''}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              Les dossiers complets apparaîtront ici automatiquement
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {queue.map((item) => {
              const priority = getPriorityLabel(item.priority_score);
              const urgent = isUrgent(item.added_at);
              const isMineLead = item.claimed_by === currentUserId;

              return (
                <div
                  key={item.id}
                  style={{
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: urgent && item.status === 'waiting'
                      ? '1px solid rgba(239,68,68,0.25)'
                      : '1px solid rgba(255,255,255,0.07)',
                    boxShadow: urgent && item.status === 'waiting' ? '0 0 0 1px rgba(239,68,68,0.06)' : 'none',
                    transition: 'all 0.15s',
                    overflow: 'hidden',
                  }}
                >
                  {/* urgency top bar */}
                  {urgent && item.status === 'waiting' && (
                    <div style={{ height: 2, background: 'linear-gradient(90deg, #ef4444, #f97316)', borderRadius: '12px 12px 0 0' }} />
                  )}

                  <div className="flex items-center gap-4" style={{ padding: '14px 18px' }}>

                    {/* Priority badge */}
                    <div
                      className="flex-shrink-0 text-center"
                      style={{
                        minWidth: 56,
                        padding: '6px 8px',
                        borderRadius: 9,
                        background: priority.bg,
                        border: `1px solid ${priority.color}30`,
                      }}
                    >
                      <div style={{ color: priority.color, fontSize: 15, fontWeight: 700, lineHeight: 1 }}>
                        {item.priority_score}
                      </div>
                      <div style={{ color: priority.color, fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', opacity: 0.8, marginTop: 2 }}>
                        {priority.label.toUpperCase()}
                      </div>
                    </div>

                    {/* Lead info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold" style={{ color: '#fff', fontSize: 14 }}>
                          {item.lead?.first_name} {item.lead?.last_name}
                        </span>
                        {item.lead?.company_name && (
                          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                            — {item.lead.company_name}
                          </span>
                        )}
                        {isMineLead && (
                          <span
                            style={{
                              background: 'rgba(16,185,129,0.15)',
                              color: '#10b981',
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              letterSpacing: '0.05em',
                            }}
                          >
                            MON LEAD
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 flex-wrap" style={{ fontSize: 11.5 }}>
                        {item.lead?.email && (
                          <span className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            <Mail size={11} />
                            {item.lead.email}
                          </span>
                        )}
                        {item.lead?.phone && (
                          <span className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            <Phone size={11} />
                            {item.lead.phone}
                          </span>
                        )}
                        {item.lead?.city && (
                          <span className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            <MapPin size={11} />
                            {item.lead.city}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {item.documents_verified && (
                          <span
                            className="flex items-center gap-1"
                            style={{
                              background: 'rgba(16,185,129,0.1)',
                              color: '#10b981',
                              fontSize: 10,
                              padding: '2px 7px',
                              borderRadius: 5,
                              fontWeight: 600,
                            }}
                          >
                            <CheckCircle size={9} />
                            Docs vérifiés
                          </span>
                        )}
                        {urgent && (
                          <span
                            className="flex items-center gap-1"
                            style={{
                              background: 'rgba(239,68,68,0.1)',
                              color: '#ef4444',
                              fontSize: 10,
                              padding: '2px 7px',
                              borderRadius: 5,
                              fontWeight: 600,
                            }}
                          >
                            <AlertTriangle size={9} />
                            Urgent
                          </span>
                        )}
                        {item.lead?.ai_qualification_score && (
                          <span
                            className="flex items-center gap-1"
                            style={{
                              background: 'rgba(59,130,246,0.1)',
                              color: '#60a5fa',
                              fontSize: 10,
                              padding: '2px 7px',
                              borderRadius: 5,
                            }}
                          >
                            <Star size={9} />
                            Score IA {item.lead.ai_qualification_score}%
                          </span>
                        )}
                        {item.recommended_companies?.length > 0 && (
                          <span
                            className="flex items-center gap-1"
                            style={{
                              background: 'rgba(6,182,212,0.08)',
                              color: '#22d3ee',
                              fontSize: 10,
                              padding: '2px 7px',
                              borderRadius: 5,
                            }}
                          >
                            <Building2 size={9} />
                            {item.recommended_companies.slice(0, 2).join(', ')}
                            {item.recommended_companies.length > 2 && ` +${item.recommended_companies.length - 2}`}
                          </span>
                        )}
                        <span
                          className="flex items-center gap-1"
                          style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                        >
                          <Clock size={9} />
                          {getWaitTime(item.added_at)}
                        </span>
                      </div>
                    </div>

                    {/* Estimated value */}
                    {item.estimated_value > 0 && (
                      <div className="flex-shrink-0 text-right" style={{ minWidth: 72 }}>
                        <div style={{ color: '#10b981', fontSize: 15, fontWeight: 700 }}>
                          {item.estimated_value.toLocaleString('fr-FR')}€
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>estimé / an</div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.status === 'waiting' && (
                        <button
                          onClick={() => claimLead(item.id, item.lead_id)}
                          className="flex items-center gap-1.5 transition-all"
                          style={{
                            padding: '7px 14px',
                            borderRadius: 8,
                            background: '#3b82f6',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <Play size={12} />
                          Prendre
                        </button>
                      )}
                      {(item.status === 'claimed' || item.status === 'in_progress') && (
                        <button
                          onClick={() => startQuote(item)}
                          className="flex items-center gap-1.5 transition-all"
                          style={{
                            padding: '7px 14px',
                            borderRadius: 8,
                            background: '#10b981',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <ArrowRight size={12} />
                          Créer devis
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/backoffice/crm/lead/${item.lead_id}`)}
                        className="flex items-center justify-center transition-all"
                        title="Voir le dossier"
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: 'rgba(255,255,255,0.35)',
                          cursor: 'pointer',
                        }}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => navigate(`/backoffice/crm/lead/${item.lead_id}`)}
                        className="flex items-center justify-center transition-all"
                        title="Ouvrir"
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: 'rgba(255,255,255,0.35)',
                          cursor: 'pointer',
                        }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── INFO BAR ── */}
        <div
          className="flex items-start gap-4 mt-6"
          style={{
            padding: '16px 20px',
            borderRadius: 12,
            background: 'rgba(59,130,246,0.05)',
            border: '1px solid rgba(59,130,246,0.12)',
          }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: 'rgba(59,130,246,0.12)',
              color: '#3b82f6',
            }}
          >
            <Zap size={16} />
          </div>
          <div>
            <div className="font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
              Pipeline 100% Autonome
            </div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, lineHeight: 1.6 }}>
              Le système gère automatiquement : qualification IA, emails de bienvenue, collecte
              et vérification des documents, relances intelligentes.{' '}
              <span style={{ color: '#60a5fa', fontWeight: 600 }}>
                Vous n'intervenez que pour créer le devis et émettre le contrat.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteQueueDashboard;
