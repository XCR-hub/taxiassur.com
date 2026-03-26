import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';
import {
  FileText, Clock, User, Phone, Mail, CheckCircle, AlertTriangle,
  Play, Eye, RefreshCw, Zap, FileCheck, ArrowRight,
  MapPin, Building2, Star, ChevronRight, Inbox,
  Search, BarChart3, Timer, Users,
  CircleDot, Folder, Shield, CalendarClock,
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
    immatriculation: string;
    created_at: string;
    source: string;
  };
}

interface PipelineStats {
  total_leads: number;
  ready_for_quote: number;
  quote_pending: number;
  documents_collecting: number;
  avg_time_to_quote_hours: number;
}

interface StageCount {
  stage: string;
  count: number;
  label: string;
  color: string;
}

interface ApproachingLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  current_stage_key: string;
  created_at: string;
  ai_qualification_score: number;
  total_uploaded_files: number;
  pending_files: number;
  documents_complete: boolean;
}

type FilterType = 'waiting' | 'claimed' | 'all';
type SortType = 'priority' | 'date' | 'value';

export default function QuoteQueueDashboard() {
  const navigate = useNavigate();
  const [allQueue, setAllQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [stageCounts, setStageCounts] = useState<StageCount[]>([]);
  const [approachingLeads, setApproachingLeads] = useState<ApproachingLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('waiting');
  const [sort, setSort] = useState<SortType>('priority');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [queueResult, statsResult, userResult, stageResult, approachingResult] = await Promise.all([
        supabase
          .from('ready_for_quote_queue')
          .select(`*, lead:crm_leads(
            first_name, last_name, email, phone, city,
            company_name, current_stage_key, ai_qualification_score,
            immatriculation, created_at, source
          )`)
          .order('priority_score', { ascending: false })
          .order('added_at', { ascending: true })
          .limit(100),
        supabase.rpc('get_pipeline_stats').maybeSingle(),
        supabase.auth.getUser(),
        supabase
          .from('crm_leads')
          .select('current_stage_key')
          .is('deleted_at', null)
          .eq('is_archived', false),
        supabase
          .from('crm_leads')
          .select('id, first_name, last_name, email, phone, city, current_stage_key, created_at, ai_qualification_score, total_uploaded_files, pending_files, documents_complete')
          .is('deleted_at', null)
          .eq('is_archived', false)
          .eq('documents_complete', false)
          .in('current_stage_key', ['collecte_documents', 'documents_required', 'documents_partial'])
          .order('created_at', { ascending: true })
          .limit(8),
      ]);

      setAllQueue(queueResult.data || []);
      setStats(statsResult.data || null);
      setCurrentUserId(userResult.data?.user?.id || null);
      setApproachingLeads((approachingResult.data as ApproachingLead[]) || []);

      const stageData = stageResult.data || [];
      const counts: Record<string, number> = {};
      stageData.forEach((row: { current_stage_key: string }) => {
        const key = row.current_stage_key?.toLowerCase() || 'unknown';
        counts[key] = (counts[key] || 0) + 1;
      });

      const stageMap: { key: string[]; label: string; color: string }[] = [
        { key: ['new_lead', 'nouveau_lead'], label: 'Nouveaux', color: '#3b82f6' },
        { key: ['contact_attempted', 'contact_confirmed', 'prise_contact'], label: 'Contact', color: '#8b5cf6' },
        { key: ['collecte_documents', 'documents_required', 'documents_partial'], label: 'Documents', color: '#f59e0b' },
        { key: ['ready_for_quote'], label: 'Prets devis', color: '#10b981' },
        { key: ['quote_pending', 'quote_sent', 'devis'], label: 'Devis', color: '#06b6d4' },
        { key: ['signature_pending', 'payment_pending', 'signed', 'paiement', 'contrat_signature'], label: 'Finalisation', color: '#ec4899' },
        { key: ['active_client', 'client_actif'], label: 'Clients', color: '#22c55e' },
      ];

      const mappedStages: StageCount[] = stageMap.map(s => ({
        stage: s.key[0],
        label: s.label,
        color: s.color,
        count: s.key.reduce((sum, k) => sum + (counts[k] || 0), 0),
      }));
      setStageCounts(mappedStages);
    } catch {
      if (!silent) toast.error('Erreur lors du chargement');
    }

    if (!silent) setIsLoading(false);
    else setIsRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('quote_queue_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ready_for_quote_queue' }, () => loadData(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const queue = useMemo(() => {
    let items = filter === 'all' ? allQueue : allQueue.filter(item => item.status === filter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.lead?.first_name?.toLowerCase().includes(q) ||
        item.lead?.last_name?.toLowerCase().includes(q) ||
        item.lead?.email?.toLowerCase().includes(q) ||
        item.lead?.phone?.includes(q) ||
        item.lead?.city?.toLowerCase().includes(q)
      );
    }

    return [...items].sort((a, b) => {
      if (sort === 'priority') return b.priority_score - a.priority_score;
      if (sort === 'value') return (b.estimated_value || 0) - (a.estimated_value || 0);
      return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
    });
  }, [allQueue, filter, searchQuery, sort]);

  const waitingCount = allQueue.filter(q => q.status === 'waiting').length;
  const claimedCount = allQueue.filter(q => q.status === 'claimed').length;
  const totalStageLeads = stageCounts.reduce((s, c) => s + c.count, 0);

  const claimLead = async (queueId: string) => {
    if (!currentUserId) { toast.info('Vous devez etre connecte'); return; }
    try {
      const { error } = await supabase.from('ready_for_quote_queue').update({
        claimed_by: currentUserId,
        claimed_at: new Date().toISOString(),
        status: 'claimed',
      }).eq('id', queueId);
      if (error) throw error;
      toast.success('Lead pris en charge');
      await loadData(true);
    } catch { toast.error('Erreur'); }
  };

  const startQuote = async (item: QueueItem) => {
    if (!item.lead_id) { toast.error('Lead ID manquant'); return; }
    try {
      await Promise.all([
        supabase.from('ready_for_quote_queue').update({ status: 'in_progress' }).eq('id', item.id),
        supabase.from('crm_leads').update({ current_stage_key: 'quote_pending' }).eq('id', item.lead_id),
      ]);
      navigate(`/backoffice/crm/lead/${item.lead_id}`);
    } catch { toast.error('Erreur'); }
  };

  const getWaitTime = (addedAt: string) => {
    const ms = Date.now() - new Date(addedAt).getTime();
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours < 1) return `${Math.max(1, Math.floor(ms / 60000))}min`;
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}j ${hours % 24}h`;
  };

  const isUrgent = (addedAt: string) => (Date.now() - new Date(addedAt).getTime()) / 3600000 > 4;

  const getPriority = (score: number) => {
    if (score >= 80) return { label: 'Urgent', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
    if (score >= 60) return { label: 'Haute', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
    if (score >= 40) return { label: 'Moyenne', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' };
    return { label: 'Normale', color: '#64748b', bg: 'rgba(100,116,139,0.1)' };
  };

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: '#0b0e14' }}>
      <Header isRefreshing={isRefreshing} onRefresh={() => loadData(true)} />

      <div className="flex-1" style={{ padding: '20px 24px' }}>
        <StatsRow stats={stats} isLoading={isLoading} queueCount={allQueue.length} />

        {stageCounts.length > 0 && totalStageLeads > 0 && (
          <PipelineFunnel stages={stageCounts} total={totalStageLeads} />
        )}

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <FilterTabs
            filter={filter}
            onFilter={setFilter}
            waitingCount={waitingCount}
            claimedCount={claimedCount}
            allCount={allQueue.length}
          />

          <div className="flex items-center gap-2 ml-auto">
            <div
              className="flex items-center gap-2"
              style={{
                padding: '0 12px',
                height: 34,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Search size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type="text"
                placeholder="Rechercher un lead..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: 12,
                  width: 160,
                }}
              />
            </div>

            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortType)}
              style={{
                height: 34,
                padding: '0 10px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 12,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="priority">Priorite</option>
              <option value="date">Anciennete</option>
              <option value="value">Valeur</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : queue.length === 0 ? (
          <EmptyState
            filter={filter}
            approachingLeads={approachingLeads}
            onNavigate={navigate}
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {queue.map(item => (
              <QueueCard
                key={item.id}
                item={item}
                currentUserId={currentUserId}
                priority={getPriority(item.priority_score)}
                urgent={isUrgent(item.added_at)}
                waitTime={getWaitTime(item.added_at)}
                onClaim={() => claimLead(item.id)}
                onStartQuote={() => startQuote(item)}
                onViewLead={() => navigate(`/backoffice/crm/lead/${item.lead_id}`)}
              />
            ))}
          </div>
        )}

        <InfoBar />
      </div>
    </div>
  );
}

function Header({ isRefreshing, onRefresh }: { isRefreshing: boolean; onRefresh: () => void }) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-between"
      style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15))',
            border: '1px solid rgba(16,185,129,0.2)',
          }}
        >
          <Inbox size={18} style={{ color: '#10b981' }} />
        </div>
        <div>
          <h1 className="font-bold" style={{ color: '#fff', fontSize: 16, letterSpacing: '-0.02em' }}>
            File d'Attente Devis
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
            Dossiers complets -- prets pour etablir un devis
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5" style={{ color: 'rgba(16,185,129,0.6)', fontSize: 11 }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: '#10b981', animation: 'pulse 2s infinite' }} />
          Temps reel
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 transition-all hover:opacity-80"
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: isRefreshing ? '#10b981' : 'rgba(255,255,255,0.5)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>
    </div>
  );
}

function StatsRow({ stats, isLoading, queueCount }: { stats: PipelineStats | null; isLoading: boolean; queueCount: number }) {
  const cards = [
    {
      label: 'En file d\'attente',
      value: queueCount,
      icon: <Inbox size={18} />,
      color: '#10b981',
      gradient: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))',
      border: 'rgba(16,185,129,0.18)',
    },
    {
      label: 'Leads actifs',
      value: stats?.total_leads ?? 0,
      icon: <Users size={18} />,
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))',
      border: 'rgba(59,130,246,0.18)',
    },
    {
      label: 'Devis en cours',
      value: stats?.quote_pending ?? 0,
      icon: <FileText size={18} />,
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
      border: 'rgba(245,158,11,0.18)',
    },
    {
      label: 'Collecte docs',
      value: stats?.documents_collecting ?? 0,
      icon: <Folder size={18} />,
      color: '#06b6d4',
      gradient: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(6,182,212,0.04))',
      border: 'rgba(6,182,212,0.18)',
    },
    {
      label: 'Temps moyen',
      value: stats ? `${stats.avg_time_to_quote_hours}h` : '--',
      icon: <Timer size={18} />,
      color: '#22c55e',
      gradient: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))',
      border: 'rgba(34,197,94,0.18)',
    },
  ];

  return (
    <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
      {cards.map((card, i) => (
        <div
          key={i}
          style={{
            padding: '16px',
            borderRadius: 12,
            background: card.gradient,
            border: `1px solid ${card.border}`,
            transition: 'all 0.2s',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div style={{ color: card.color, opacity: 0.7 }}>{card.icon}</div>
          </div>
          <div className="font-bold" style={{ color: '#fff', fontSize: 26, lineHeight: 1, letterSpacing: '-0.03em' }}>
            {isLoading ? (
              <span style={{ display: 'inline-block', width: 40, height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s infinite' }} />
            ) : card.value}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11.5, marginTop: 4, fontWeight: 500 }}>
            {card.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function PipelineFunnel({ stages, total }: { stages: StageCount[]; total: number }) {
  return (
    <div
      style={{
        padding: '16px 18px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 20,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600 }}>
            Repartition pipeline
          </span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
          {total} leads au total
        </span>
      </div>

      <div className="flex rounded-lg overflow-hidden" style={{ height: 10, background: 'rgba(255,255,255,0.04)' }}>
        {stages.map((stage, i) => {
          const pct = total > 0 ? (stage.count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={i}
              title={`${stage.label}: ${stage.count}`}
              style={{
                width: `${pct}%`,
                background: stage.color,
                opacity: 0.7,
                transition: 'width 0.5s ease',
                minWidth: stage.count > 0 ? 4 : 0,
              }}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {stages.map((stage, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div style={{ width: 8, height: 8, borderRadius: 2, background: stage.color, opacity: stage.count > 0 ? 0.8 : 0.2 }} />
            <span style={{ color: stage.count > 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', fontSize: 11 }}>
              {stage.label}
            </span>
            <span style={{ color: stage.count > 0 ? stage.color : 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: 700 }}>
              {stage.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterTabs({
  filter, onFilter, waitingCount, claimedCount, allCount,
}: {
  filter: FilterType;
  onFilter: (f: FilterType) => void;
  waitingCount: number;
  claimedCount: number;
  allCount: number;
}) {
  const tabs: { key: FilterType; label: string; count: number }[] = [
    { key: 'waiting', label: 'En attente', count: waitingCount },
    { key: 'claimed', label: 'En cours', count: claimedCount },
    { key: 'all', label: 'Tous', count: allCount },
  ];

  return (
    <div className="flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.03)', padding: 3, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
      {tabs.map(tab => {
        const active = filter === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onFilter(tab.key)}
            className="flex items-center gap-1.5 transition-all"
            style={{
              padding: '6px 14px',
              borderRadius: 7,
              background: active ? 'rgba(16,185,129,0.15)' : 'transparent',
              border: active ? '1px solid rgba(16,185,129,0.25)' : '1px solid transparent',
              color: active ? '#10b981' : 'rgba(255,255,255,0.4)',
              fontSize: 12,
              fontWeight: active ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                style={{
                  background: active ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
                  color: active ? '#10b981' : 'rgba(255,255,255,0.4)',
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px',
                  minWidth: 18,
                  textAlign: 'center',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function QueueCard({
  item, currentUserId, priority, urgent, waitTime, onClaim, onStartQuote, onViewLead,
}: {
  item: QueueItem;
  currentUserId: string | null;
  priority: { label: string; color: string; bg: string };
  urgent: boolean;
  waitTime: string;
  onClaim: () => void;
  onStartQuote: () => void;
  onViewLead: () => void;
}) {
  const isMineLead = item.claimed_by === currentUserId;

  return (
    <div
      className="group transition-all"
      style={{
        borderRadius: 12,
        background: urgent && item.status === 'waiting'
          ? 'linear-gradient(135deg, rgba(239,68,68,0.04), rgba(255,255,255,0.03))'
          : 'rgba(255,255,255,0.025)',
        border: urgent && item.status === 'waiting'
          ? '1px solid rgba(239,68,68,0.2)'
          : '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}
    >
      {urgent && item.status === 'waiting' && (
        <div style={{ height: 2, background: 'linear-gradient(90deg, #ef4444 0%, #f97316 50%, transparent 100%)' }} />
      )}

      <div className="flex items-center gap-4" style={{ padding: '14px 18px' }}>
        <div
          className="flex-shrink-0 flex flex-col items-center justify-center"
          style={{
            width: 52,
            height: 52,
            borderRadius: 10,
            background: priority.bg,
            border: `1px solid ${priority.color}25`,
          }}
        >
          <div style={{ color: priority.color, fontSize: 18, fontWeight: 800, lineHeight: 1 }}>
            {item.priority_score}
          </div>
          <div style={{ color: priority.color, fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', marginTop: 2, textTransform: 'uppercase' }}>
            {priority.label}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold truncate" style={{ color: '#fff', fontSize: 14 }}>
              {item.lead?.first_name} {item.lead?.last_name}
            </span>
            {item.lead?.company_name && (
              <span className="truncate" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                {item.lead.company_name}
              </span>
            )}
            {isMineLead && (
              <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                MON LEAD
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap" style={{ fontSize: 11.5, marginBottom: 6 }}>
            {item.lead?.email && (
              <span className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <Mail size={10} /> {item.lead.email}
              </span>
            )}
            {item.lead?.phone && (
              <span className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <Phone size={10} /> {item.lead.phone}
              </span>
            )}
            {item.lead?.city && (
              <span className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <MapPin size={10} /> {item.lead.city}
              </span>
            )}
            {item.lead?.immatriculation && (
              <span className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <Shield size={10} /> {item.lead.immatriculation}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {item.documents_verified && (
              <Badge icon={<CheckCircle size={9} />} text="Docs verifies" color="#10b981" />
            )}
            {urgent && item.status === 'waiting' && (
              <Badge icon={<AlertTriangle size={9} />} text="Urgent" color="#ef4444" />
            )}
            {item.lead?.ai_qualification_score != null && item.lead.ai_qualification_score > 0 && (
              <Badge icon={<Star size={9} />} text={`Score IA ${item.lead.ai_qualification_score}%`} color="#60a5fa" />
            )}
            {item.recommended_companies?.length > 0 && (
              <Badge
                icon={<Building2 size={9} />}
                text={item.recommended_companies.slice(0, 2).join(', ') + (item.recommended_companies.length > 2 ? ` +${item.recommended_companies.length - 2}` : '')}
                color="#22d3ee"
              />
            )}
            <span className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
              <Clock size={9} /> {waitTime}
            </span>
          </div>
        </div>

        {item.estimated_value > 0 && (
          <div className="flex-shrink-0 text-right" style={{ minWidth: 80 }}>
            <div style={{ color: '#10b981', fontSize: 17, fontWeight: 700 }}>
              {item.estimated_value.toLocaleString('fr-FR')}€
            </div>
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>estime / an</div>
          </div>
        )}

        <div className="flex items-center gap-2 flex-shrink-0">
          {item.status === 'waiting' && (
            <button
              onClick={onClaim}
              className="flex items-center gap-1.5 transition-all hover:brightness-110"
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(59,130,246,0.25)',
              }}
            >
              <Play size={12} /> Prendre
            </button>
          )}
          {(item.status === 'claimed' || item.status === 'in_progress') && (
            <button
              onClick={onStartQuote}
              className="flex items-center gap-1.5 transition-all hover:brightness-110"
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
              }}
            >
              <ArrowRight size={12} /> Creer devis
            </button>
          )}
          <button
            onClick={onViewLead}
            className="flex items-center justify-center transition-all hover:border-white/20"
            title="Voir le dossier"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
            }}
          >
            <Eye size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Badge({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) {
  return (
    <span
      className="flex items-center gap-1"
      style={{
        background: `${color}12`,
        color,
        fontSize: 10,
        padding: '2px 7px',
        borderRadius: 5,
        fontWeight: 600,
      }}
    >
      {icon} {text}
    </span>
  );
}

function EmptyState({
  filter,
  approachingLeads,
  onNavigate,
}: {
  filter: FilterType;
  approachingLeads: ApproachingLead[];
  onNavigate: (path: string) => void;
}) {
  return (
    <div>
      <div
        className="flex flex-col items-center justify-center"
        style={{
          padding: '48px 24px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.015)',
          border: '1px solid rgba(255,255,255,0.05)',
          marginBottom: approachingLeads.length > 0 ? 20 : 0,
        }}
      >
        <div
          className="flex items-center justify-center mb-4"
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.08))',
          }}
        >
          <FileCheck size={28} style={{ color: 'rgba(16,185,129,0.35)' }} />
        </div>
        <h3 className="font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>
          {filter === 'waiting' ? 'Aucun dossier en attente' : filter === 'claimed' ? 'Aucun dossier en cours' : 'File vide'}
        </h3>
        <p className="text-center" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, maxWidth: 400, lineHeight: 1.6 }}>
          Les dossiers apparaissent ici automatiquement lorsque les documents du prospect sont complets et verifies par le systeme.
        </p>

        <div
          className="flex items-center gap-6 mt-6"
          style={{
            padding: '14px 20px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {[
            { icon: <CircleDot size={14} />, label: 'Nouveau lead', color: '#3b82f6' },
            { icon: <ArrowRight size={10} style={{ color: 'rgba(255,255,255,0.15)' }} />, label: '', color: '' },
            { icon: <Folder size={14} />, label: 'Collecte docs', color: '#f59e0b' },
            { icon: <ArrowRight size={10} style={{ color: 'rgba(255,255,255,0.15)' }} />, label: '', color: '' },
            { icon: <CheckCircle size={14} />, label: 'File devis', color: '#10b981' },
            { icon: <ArrowRight size={10} style={{ color: 'rgba(255,255,255,0.15)' }} />, label: '', color: '' },
            { icon: <FileText size={14} />, label: 'Devis envoye', color: '#06b6d4' },
          ].map((step, i) => (
            step.label === '' ? (
              <div key={i}>{step.icon}</div>
            ) : (
              <div key={i} className="flex items-center gap-1.5">
                <div style={{ color: step.color }}>{step.icon}</div>
                <span style={{ color: step.color, fontSize: 11, fontWeight: 500 }}>{step.label}</span>
              </div>
            )
          ))}
        </div>
      </div>

      {approachingLeads.length > 0 && (
        <div
          style={{
            padding: '16px 18px',
            borderRadius: 12,
            background: 'rgba(245,158,11,0.04)',
            border: '1px solid rgba(245,158,11,0.12)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={14} style={{ color: '#f59e0b' }} />
            <span style={{ color: '#f59e0b', fontSize: 12.5, fontWeight: 600 }}>
              Leads en approche ({approachingLeads.length})
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
              Collecte de documents en cours
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {approachingLeads.map(lead => (
              <div
                key={lead.id}
                className="flex items-center gap-3 transition-all cursor-pointer hover:bg-white/[0.03]"
                onClick={() => onNavigate(`/backoffice/crm/lead/${lead.id}`)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(245,158,11,0.1)' }}
                >
                  <User size={13} style={{ color: '#f59e0b' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12.5 }}>
                    {lead.first_name} {lead.last_name}
                  </span>
                  {lead.city && (
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginLeft: 8 }}>
                      {lead.city}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {lead.total_uploaded_files > 0 && (
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10.5 }}>
                      {lead.total_uploaded_files} doc{lead.total_uploaded_files > 1 ? 's' : ''}
                    </span>
                  )}
                  <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          style={{
            height: 82,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  );
}

function InfoBar() {
  return (
    <div
      className="flex items-start gap-3 mt-6"
      style={{
        padding: '14px 18px',
        borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(16,185,129,0.04), rgba(6,182,212,0.04))',
        border: '1px solid rgba(16,185,129,0.1)',
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: 'rgba(16,185,129,0.1)',
          color: '#10b981',
        }}
      >
        <Zap size={15} />
      </div>
      <div>
        <div className="font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12.5 }}>
          Pipeline 100% Autonome
        </div>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11.5, lineHeight: 1.6 }}>
          Qualification IA, emails de bienvenue, collecte et verification des documents, relances intelligentes.{' '}
          <span style={{ color: '#10b981', fontWeight: 600 }}>
            Vous n'intervenez que pour creer le devis et emettre le contrat.
          </span>
        </p>
      </div>
    </div>
  );
}
