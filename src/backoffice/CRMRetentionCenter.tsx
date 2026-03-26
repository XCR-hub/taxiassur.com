import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Gift, RefreshCw, CheckCircle, XCircle,
  ChevronRight, Calendar, Phone, Zap, Shield, Activity,
  TrendingUp, Clock, Star, UserCheck, ArrowRight, Bell,
  Search, Users, Heart, Target, BarChart3, ShieldCheck,
  ShieldAlert, Eye, Sparkles,
} from 'lucide-react';
import { retentionService, ChurnAlert, CrossSellOpportunity, RenewalReminder } from '@/lib/crm-retention';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

type Tab = 'alerts' | 'crosssell' | 'renewals';

const SEVERITY = {
  low:      { label: 'Faible',   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.2)' },
  medium:   { label: 'Moyen',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)' },
  high:     { label: 'Eleve',    color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.2)' },
  critical: { label: 'Critique', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)' },
};

const ALERT_TYPE_LABEL: Record<ChurnAlert['alert_type'], string> = {
  low_engagement:     'Faible engagement',
  payment_issue:      'Probleme paiement',
  negative_sentiment: 'Sentiment negatif',
  competitor_inquiry: 'Demande concurrent',
  renewal_risk:       'Risque renouvellement',
};

const PRODUCT_LABEL: Record<CrossSellOpportunity['product_type'], string> = {
  rc_pro:                    'RC Pro',
  flotte:                    'Flotte',
  vtc:                       'VTC',
  garanties_supplementaires: 'Garanties+',
  assistance_premium:        'Assistance',
};

interface ClientStats {
  active: number;
  atRisk: number;
  churned: number;
  total: number;
}

const CRMRetentionCenter: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('alerts');
  const [churnAlerts, setChurnAlerts] = useState<ChurnAlert[]>([]);
  const [crossSellOps, setCrossSellOps] = useState<CrossSellOpportunity[]>([]);
  const [renewals, setRenewals] = useState<RenewalReminder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientStats, setClientStats] = useState<ClientStats>({ active: 0, atRisk: 0, churned: 0, total: 0 });
  const [stats, setStats] = useState<{
    at_risk_count: number;
    avg_retention_score: number;
    renewal_rate: number;
    cross_sell_conversion_rate: number;
  } | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [alertsData, opsData, renewalsData, statsData, clientsData] = await Promise.all([
        retentionService.getChurnAlerts({ status: 'new' }),
        retentionService.getCrossSellOpportunities(),
        retentionService.getRenewalReminders({ daysUntil: 60 }),
        retentionService.getRetentionStats(),
        supabase.from('crm_leads')
          .select('current_stage_key')
          .is('deleted_at', null)
          .eq('is_archived', false),
      ]);
      setChurnAlerts(alertsData);
      setCrossSellOps(opsData.filter(o => o.status === 'suggested'));
      setRenewals(renewalsData.filter(r => r.status === 'pending'));
      setStats(statsData);

      const stages = clientsData.data || [];
      const activeStages = ['active_client', 'client_actif', 'signed', 'contrat_signature'];
      const riskStages = ['risk_churn', 'no_response', 'relance_active'];
      const churnedStages = ['client_lost'];
      setClientStats({
        active: stages.filter((s: { current_stage_key: string }) => activeStages.includes(s.current_stage_key?.toLowerCase())).length,
        atRisk: stages.filter((s: { current_stage_key: string }) => riskStages.includes(s.current_stage_key?.toLowerCase())).length,
        churned: stages.filter((s: { current_stage_key: string }) => churnedStages.includes(s.current_stage_key?.toLowerCase())).length,
        total: stages.length,
      });
    } catch {
      // silent fail
    } finally {
      if (!silent) setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('retention_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_churn_alerts' }, () => loadData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_cross_sell_opportunities' }, () => loadData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_renewal_reminders' }, () => loadData(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const resolveAlert = async (alertId: string) => {
    try {
      await retentionService.updateAlertStatus(alertId, 'resolved');
      toast.success('Alerte resolue');
      await loadData(true);
    } catch { toast.error('Erreur'); }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await retentionService.updateAlertStatus(alertId, 'dismissed');
      await loadData(true);
    } catch { toast.error('Erreur'); }
  };

  const convertOpp = async (oppId: string) => {
    try {
      await retentionService.updateOpportunityStatus(oppId, 'converted');
      toast.success('Opportunite convertie');
      await loadData(true);
    } catch { toast.error('Erreur'); }
  };

  const declineOpp = async (oppId: string) => {
    await retentionService.updateOpportunityStatus(oppId, 'declined');
    await loadData(true);
  };

  const contactRenewal = async (renewal: RenewalReminder) => {
    await retentionService.updateRenewalStatus(renewal.id, 'contacted');
    navigate(`/backoffice/crm/lead/${renewal.lead_id}`);
  };

  const criticalCount = churnAlerts.filter(a => a.severity === 'critical').length;
  const highCount = churnAlerts.filter(a => a.severity === 'high').length;
  const urgentRenewals = renewals.filter(r => r.days_until_renewal <= 7).length;

  const retentionScore = stats?.avg_retention_score ?? 0;
  const scoreColor = retentionScore >= 80 ? '#10b981' : retentionScore >= 60 ? '#f59e0b' : retentionScore >= 40 ? '#f97316' : '#ef4444';
  const scoreLabel = retentionScore >= 80 ? 'Excellent' : retentionScore >= 60 ? 'Bon' : retentionScore >= 40 ? 'A surveiller' : 'Critique';

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: '#0b0e14' }}>
      <Header
        criticalCount={criticalCount}
        urgentRenewals={urgentRenewals}
        refreshing={refreshing}
        onRefresh={() => loadData(true)}
      />

      <div className="flex-1" style={{ padding: '20px 24px' }}>
        <StatsRow
          stats={stats}
          clientStats={clientStats}
          alertCount={churnAlerts.length}
          renewalCount={renewals.length}
          loading={loading}
        />

        <RetentionHealthOverview
          score={retentionScore}
          scoreColor={scoreColor}
          scoreLabel={scoreLabel}
          clientStats={clientStats}
          loading={loading}
        />

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <TabBar
            tab={tab}
            onTab={setTab}
            alerts={churnAlerts.length}
            crossSell={crossSellOps.length}
            renewals={renewals.length}
          />

          <div className="flex items-center gap-2 ml-auto">
            <div
              className="flex items-center gap-2"
              style={{
                padding: '0 12px', height: 34, borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Search size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  color: '#fff', fontSize: 12, width: 140,
                }}
              />
            </div>
            <div className="flex items-center gap-1.5" style={{ color: 'rgba(16,185,129,0.6)', fontSize: 11 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: '#10b981', animation: 'pulse 2s infinite' }} />
              Temps reel
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {tab === 'alerts' && (
              <AlertsPanel
                alerts={churnAlerts}
                criticalCount={criticalCount}
                highCount={highCount}
                onResolve={resolveAlert}
                onDismiss={dismissAlert}
                onNavigate={navigate}
              />
            )}
            {tab === 'crosssell' && (
              <CrossSellPanel
                opportunities={crossSellOps}
                onConvert={convertOpp}
                onDecline={declineOpp}
                onNavigate={navigate}
              />
            )}
            {tab === 'renewals' && (
              <RenewalsPanel
                renewals={renewals}
                onContact={contactRenewal}
                onNavigate={navigate}
              />
            )}
          </>
        )}

        <InfoBar />
      </div>
    </div>
  );
};

function Header({ criticalCount, urgentRenewals, refreshing, onRefresh }: {
  criticalCount: number; urgentRenewals: number; refreshing: boolean; onRefresh: () => void;
}) {
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
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(34,197,94,0.15))',
            border: '1px solid rgba(16,185,129,0.2)',
          }}
        >
          <Shield size={18} style={{ color: '#10b981' }} />
        </div>
        <div>
          <h1 className="font-bold" style={{ color: '#fff', fontSize: 16, letterSpacing: '-0.02em' }}>
            Centre de Retention
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
            Anti-churn -- Cross-sell -- Renouvellements
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {criticalCount > 0 && (
          <div className="flex items-center gap-1.5" style={{
            padding: '5px 12px', borderRadius: 8,
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
            color: '#ef4444', fontSize: 12, fontWeight: 600,
          }}>
            <Bell size={12} />
            {criticalCount} critique{criticalCount > 1 ? 's' : ''}
          </div>
        )}
        {urgentRenewals > 0 && (
          <div className="flex items-center gap-1.5" style={{
            padding: '5px 12px', borderRadius: 8,
            background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
            color: '#f59e0b', fontSize: 12, fontWeight: 600,
          }}>
            <Clock size={12} />
            {urgentRenewals} renou. urgent
          </div>
        )}
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 transition-all hover:opacity-80"
          style={{
            padding: '7px 14px', borderRadius: 8,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            color: refreshing ? '#10b981' : 'rgba(255,255,255,0.5)',
            fontSize: 12, cursor: 'pointer',
          }}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>
    </div>
  );
}

function StatsRow({ stats, clientStats, alertCount, renewalCount, loading }: {
  stats: { at_risk_count: number; avg_retention_score: number; renewal_rate: number; cross_sell_conversion_rate: number } | null;
  clientStats: ClientStats; alertCount: number; renewalCount: number; loading: boolean;
}) {
  const cards = [
    {
      label: 'Clients actifs',
      value: clientStats.active,
      icon: <Users size={18} />,
      color: '#10b981',
      gradient: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))',
      border: 'rgba(16,185,129,0.18)',
    },
    {
      label: 'A risque',
      value: stats?.at_risk_count ?? clientStats.atRisk,
      icon: <AlertTriangle size={18} />,
      color: '#ef4444',
      gradient: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))',
      border: 'rgba(239,68,68,0.18)',
    },
    {
      label: 'Score moyen',
      value: stats ? `${Math.round(stats.avg_retention_score)}%` : '--',
      icon: <ShieldCheck size={18} />,
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))',
      border: 'rgba(59,130,246,0.18)',
    },
    {
      label: 'Taux fidelite',
      value: stats ? `${Math.round(stats.renewal_rate * 100)}%` : '--',
      icon: <Heart size={18} />,
      color: '#ec4899',
      gradient: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(236,72,153,0.04))',
      border: 'rgba(236,72,153,0.18)',
    },
    {
      label: 'Cross-sell',
      value: stats ? `${Math.round(stats.cross_sell_conversion_rate * 100)}%` : '--',
      icon: <TrendingUp size={18} />,
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
      border: 'rgba(245,158,11,0.18)',
    },
  ];

  return (
    <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
      {cards.map((card, i) => (
        <div
          key={i}
          style={{
            padding: '16px', borderRadius: 12,
            background: card.gradient,
            border: `1px solid ${card.border}`,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div style={{ color: card.color, opacity: 0.7 }}>{card.icon}</div>
          </div>
          <div className="font-bold" style={{ color: '#fff', fontSize: 26, lineHeight: 1, letterSpacing: '-0.03em' }}>
            {loading ? <span style={{ display: 'inline-block', width: 40, height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s infinite' }} /> : card.value}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11.5, marginTop: 4, fontWeight: 500 }}>
            {card.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function RetentionHealthOverview({ score, scoreColor, scoreLabel, clientStats, loading }: {
  score: number; scoreColor: string; scoreLabel: string; clientStats: ClientStats; loading: boolean;
}) {
  const segments = [
    { label: 'Actifs', count: clientStats.active, color: '#10b981' },
    { label: 'A risque', count: clientStats.atRisk, color: '#f97316' },
    { label: 'Perdus', count: clientStats.churned, color: '#ef4444' },
  ];
  const totalClients = segments.reduce((s, seg) => s + seg.count, 0);

  return (
    <div
      className="grid gap-4 mb-5"
      style={{ gridTemplateColumns: '1fr 2fr' }}
    >
      <div
        className="flex items-center gap-4"
        style={{
          padding: '20px', borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="relative flex-shrink-0">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={loading ? 'rgba(255,255,255,0.06)' : scoreColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 213.6} 213.6`}
              transform="rotate(-90 40 40)"
              style={{ transition: 'stroke-dasharray 1s ease, stroke 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span style={{ color: loading ? 'rgba(255,255,255,0.2)' : scoreColor, fontSize: 20, fontWeight: 800, lineHeight: 1 }}>
              {loading ? '--' : `${Math.round(score)}`}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: 600, marginTop: 2 }}>
              / 100
            </span>
          </div>
        </div>

        <div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>
            SANTE RETENTION
          </div>
          <div className="font-bold" style={{ color: loading ? 'rgba(255,255,255,0.3)' : scoreColor, fontSize: 16 }}>
            {loading ? 'Chargement...' : scoreLabel}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>
            Basé sur l'engagement, les paiements et la satisfaction client
          </p>
        </div>
      </div>

      <div
        style={{
          padding: '20px', borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600 }}>
              Portefeuille clients
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
            {totalClients} client{totalClients !== 1 ? 's' : ''}
          </span>
        </div>

        {totalClients > 0 ? (
          <>
            <div className="flex rounded-lg overflow-hidden mb-3" style={{ height: 10, background: 'rgba(255,255,255,0.04)' }}>
              {segments.map((seg, i) => {
                const pct = totalClients > 0 ? (seg.count / totalClients) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div key={i} title={`${seg.label}: ${seg.count}`} style={{
                    width: `${pct}%`, background: seg.color, opacity: 0.7,
                    transition: 'width 0.5s ease', minWidth: seg.count > 0 ? 4 : 0,
                  }} />
                );
              })}
            </div>
            <div className="flex items-center gap-6">
              {segments.map((seg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, opacity: seg.count > 0 ? 0.8 : 0.2 }} />
                  <span style={{ color: seg.count > 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', fontSize: 11 }}>
                    {seg.label}
                  </span>
                  <span style={{ color: seg.count > 0 ? seg.color : 'rgba(255,255,255,0.15)', fontSize: 12, fontWeight: 700 }}>
                    {seg.count}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center" style={{ padding: '16px 0' }}>
            <Users size={20} style={{ color: 'rgba(255,255,255,0.12)', marginBottom: 8 }} />
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11.5, textAlign: 'center' }}>
              Les clients actifs apparaitront ici une fois les premiers contrats signes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBar({ tab, onTab, alerts, crossSell, renewals }: {
  tab: Tab; onTab: (t: Tab) => void;
  alerts: number; crossSell: number; renewals: number;
}) {
  const tabs: { key: Tab; label: string; count: number; icon: React.ReactNode; color: string }[] = [
    { key: 'alerts', label: 'Alertes Churn', count: alerts, icon: <ShieldAlert size={13} />, color: '#ef4444' },
    { key: 'crosssell', label: 'Cross-sell', count: crossSell, icon: <Target size={13} />, color: '#f59e0b' },
    { key: 'renewals', label: 'Renouvellements', count: renewals, icon: <Calendar size={13} />, color: '#3b82f6' },
  ];

  return (
    <div className="flex items-center gap-1.5" style={{
      background: 'rgba(255,255,255,0.03)', padding: 3, borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {tabs.map(t => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onTab(t.key)}
            className="flex items-center gap-1.5 transition-all"
            style={{
              padding: '6px 14px', borderRadius: 7, cursor: 'pointer',
              background: active ? `${t.color}18` : 'transparent',
              border: active ? `1px solid ${t.color}35` : '1px solid transparent',
              color: active ? t.color : 'rgba(255,255,255,0.4)',
              fontSize: 12, fontWeight: active ? 600 : 400,
            }}
          >
            {t.icon}
            {t.label}
            {t.count > 0 && (
              <span style={{
                background: active ? `${t.color}25` : 'rgba(255,255,255,0.06)',
                color: active ? t.color : 'rgba(255,255,255,0.4)',
                borderRadius: 99, fontSize: 10, fontWeight: 700,
                padding: '1px 6px', minWidth: 18, textAlign: 'center',
              }}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function AlertsPanel({ alerts, criticalCount, highCount, onResolve, onDismiss, onNavigate }: {
  alerts: ChurnAlert[];
  criticalCount: number; highCount: number;
  onResolve: (id: string) => void;
  onDismiss: (id: string) => void;
  onNavigate: (path: string) => void;
}) {
  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck size={28} />}
        color="#10b981"
        title="Aucune alerte churn active"
        subtitle="Tous vos clients presentent un risque de retention sain. Le systeme surveille en continu et creera des alertes si un risque est detecte."
        features={[
          { icon: <Activity size={12} />, text: 'Surveillance engagement' },
          { icon: <Heart size={12} />, text: 'Analyse satisfaction' },
          { icon: <Shield size={12} />, text: 'Detection proactive' },
        ]}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {alerts.map(alert => {
        const sev = SEVERITY[alert.severity];
        return (
          <div key={alert.id} style={{
            borderRadius: 12, overflow: 'hidden',
            background: alert.severity === 'critical'
              ? 'linear-gradient(135deg, rgba(239,68,68,0.04), rgba(255,255,255,0.025))'
              : 'rgba(255,255,255,0.025)',
            border: `1px solid ${sev.border}`,
          }}>
            {(alert.severity === 'critical' || alert.severity === 'high') && (
              <div style={{ height: 2, background: `linear-gradient(90deg, ${sev.color} 0%, ${sev.color}40 100%)` }} />
            )}

            <div className="flex items-start gap-3" style={{ padding: '14px 18px' }}>
              <div
                className="flex-shrink-0 flex flex-col items-center justify-center"
                style={{
                  width: 48, height: 48, borderRadius: 10,
                  background: sev.bg, border: `1px solid ${sev.border}`,
                }}
              >
                <AlertTriangle size={16} style={{ color: sev.color }} />
                <span style={{ color: sev.color, fontSize: 7, fontWeight: 700, letterSpacing: '0.06em', marginTop: 2 }}>
                  {sev.label.toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold" style={{ color: '#fff', fontSize: 14 }}>
                    {alert.title}
                  </span>
                  <span style={{
                    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
                    borderRadius: 5, fontSize: 10, padding: '1px 7px',
                  }}>
                    {ALERT_TYPE_LABEL[alert.alert_type]}
                  </span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 8, lineHeight: 1.5 }}>
                  {alert.description}
                </p>

                {alert.suggested_actions.length > 0 && (
                  <div style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    marginBottom: 8,
                  }}>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 5 }}>
                      ACTIONS SUGGEREES
                    </div>
                    <div className="flex flex-col gap-1">
                      {alert.suggested_actions.map((action, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div style={{ width: 4, height: 4, borderRadius: 2, background: sev.color, marginTop: 5, flexShrink: 0 }} />
                          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11.5 }}>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
                  {new Date(alert.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onNavigate(`/backoffice/crm/lead/${alert.lead_id}`)}
                  className="flex items-center justify-center transition-all hover:border-white/20"
                  title="Voir le lead"
                  style={{
                    width: 36, height: 36, borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={() => onResolve(alert.id)}
                  className="flex items-center gap-1.5 transition-all hover:brightness-110"
                  style={{
                    padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.1))',
                    border: '1px solid rgba(16,185,129,0.25)',
                    color: '#10b981', fontSize: 12, fontWeight: 600,
                  }}
                >
                  <CheckCircle size={12} />
                  Resolu
                </button>
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="flex items-center gap-1.5 transition-all hover:border-white/15"
                  style={{
                    padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.35)', fontSize: 12,
                  }}
                >
                  <XCircle size={12} />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {(highCount > 0 || criticalCount > 0) && (
        <div className="flex items-center gap-3" style={{
          padding: '12px 16px', borderRadius: 10, marginTop: 4,
          background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)',
        }}>
          <Zap size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>{criticalCount + highCount} alerte{criticalCount + highCount > 1 ? 's' : ''} haute priorite</span>
            {' '}-- Contactez ces clients rapidement pour reduire le risque de resiliation.
          </span>
        </div>
      )}
    </div>
  );
}

function CrossSellPanel({ opportunities, onConvert, onDecline, onNavigate }: {
  opportunities: CrossSellOpportunity[];
  onConvert: (id: string) => void;
  onDecline: (id: string) => void;
  onNavigate: (path: string) => void;
}) {
  if (opportunities.length === 0) {
    return (
      <EmptyState
        icon={<Target size={28} />}
        color="#f59e0b"
        title="Aucune opportunite cross-sell detectee"
        subtitle="L'IA analyse en continu vos clients pour identifier des opportunites de vente complementaire. Les suggestions apparaitront ici automatiquement."
        features={[
          { icon: <Sparkles size={12} />, text: 'Analyse IA continue' },
          { icon: <TrendingUp size={12} />, text: 'Detection proactive' },
          { icon: <Gift size={12} />, text: 'Scoring confiance' },
        ]}
      />
    );
  }

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
      {opportunities.slice(0, 10).map(opp => {
        const confidence = Math.round(opp.confidence_score * 100);
        const confColor = confidence >= 80 ? '#10b981' : confidence >= 60 ? '#f59e0b' : '#3b82f6';
        return (
          <div key={opp.id} style={{
            borderRadius: 12, padding: '16px',
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span style={{
                    background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                    borderRadius: 5, fontSize: 9, fontWeight: 700,
                    padding: '2px 7px', letterSpacing: '0.04em',
                  }}>
                    {PRODUCT_LABEL[opp.product_type]}
                  </span>
                  <span className="font-semibold" style={{ color: '#fff', fontSize: 14 }}>
                    {opp.product_name}
                  </span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1.5 }}>
                  {opp.reasoning}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <div style={{ color: confColor, fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{confidence}%</div>
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, marginTop: 2 }}>confiance</div>
              </div>
            </div>

            <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
              <div style={{
                height: '100%', borderRadius: 99, background: confColor,
                width: `${confidence}%`, transition: 'width 0.5s',
              }} />
            </div>

            <div style={{
              padding: '9px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 3 }}>APPROCHE</div>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 1.5 }}>{opp.best_approach}</p>
            </div>

            <div className="flex items-center justify-between">
              <div style={{ color: '#10b981', fontWeight: 700, fontSize: 16 }}>
                {opp.estimated_value.toLocaleString('fr-FR')}€
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 400, marginLeft: 4 }}>/an</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate(`/backoffice/crm/lead/${opp.lead_id}`)}
                  className="flex items-center justify-center transition-all hover:border-white/20"
                  style={{
                    width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.35)',
                  }}
                >
                  <Eye size={13} />
                </button>
                <button
                  onClick={() => onDecline(opp.id)}
                  style={{
                    padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.35)', fontSize: 11,
                  }}
                >
                  Plus tard
                </button>
                <button
                  onClick={() => onConvert(opp.id)}
                  className="flex items-center gap-1.5 transition-all hover:brightness-110"
                  style={{
                    padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.1))',
                    border: '1px solid rgba(245,158,11,0.25)',
                    color: '#f59e0b', fontSize: 12, fontWeight: 600,
                  }}
                >
                  <ArrowRight size={11} />
                  Convertir
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RenewalsPanel({ renewals, onContact, onNavigate }: {
  renewals: RenewalReminder[];
  onContact: (r: RenewalReminder) => void;
  onNavigate: (path: string) => void;
}) {
  if (renewals.length === 0) {
    return (
      <EmptyState
        icon={<Calendar size={28} />}
        color="#3b82f6"
        title="Aucun renouvellement dans les 60 jours"
        subtitle="Les contrats a renouveler apparaitront ici automatiquement avec un compte a rebours et un suivi des actions de contact."
        features={[
          { icon: <Clock size={12} />, text: 'Alerte 60 jours' },
          { icon: <Phone size={12} />, text: 'Suivi contacts' },
          { icon: <Star size={12} />, text: 'Priorisation IA' },
        ]}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {renewals.map(renewal => {
        const days = renewal.days_until_renewal;
        const urgency = days <= 7
          ? { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', label: 'Urgent' }
          : days <= 30
            ? { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', label: 'Proche' }
            : { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', label: 'Planifie' };
        const progress = Math.max(0, Math.min(100, ((60 - days) / 60) * 100));

        return (
          <div key={renewal.id} style={{
            borderRadius: 12, overflow: 'hidden',
            background: days <= 7
              ? 'linear-gradient(135deg, rgba(239,68,68,0.04), rgba(255,255,255,0.025))'
              : 'rgba(255,255,255,0.025)',
            border: `1px solid ${urgency.border}`,
          }}>
            {days <= 7 && (
              <div style={{ height: 2, background: `linear-gradient(90deg, ${urgency.color} 0%, ${urgency.color}40 100%)` }} />
            )}

            <div className="flex items-center gap-4" style={{ padding: '14px 18px' }}>
              <div
                className="flex-shrink-0 flex flex-col items-center justify-center"
                style={{
                  width: 56, height: 56, borderRadius: 10,
                  background: urgency.bg, border: `1px solid ${urgency.border}`,
                }}
              >
                <div style={{ color: urgency.color, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{days}</div>
                <div style={{ color: urgency.color, fontSize: 8, fontWeight: 700, opacity: 0.7, marginTop: 2, letterSpacing: '0.06em' }}>JOURS</div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold" style={{ color: '#fff', fontSize: 13 }}>
                    Contrat #{renewal.contract_id?.slice(0, 8) ?? '--'}
                  </span>
                  <span style={{
                    background: urgency.bg, color: urgency.color,
                    borderRadius: 5, fontSize: 9, fontWeight: 700, padding: '1px 6px',
                  }}>
                    {urgency.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-2" style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={10} />
                    {new Date(renewal.renewal_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {renewal.last_contact_date && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={10} />
                      Dernier contact : {new Date(renewal.last_contact_date).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>

                <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{
                    height: '100%', borderRadius: 99, width: `${progress}%`,
                    background: `linear-gradient(90deg, ${urgency.color}80, ${urgency.color})`,
                    transition: 'width 0.5s',
                  }} />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onNavigate(`/backoffice/crm/lead/${renewal.lead_id}`)}
                  className="flex items-center justify-center transition-all hover:border-white/20"
                  style={{
                    width: 36, height: 36, borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={() => onContact(renewal)}
                  className="flex items-center gap-1.5 transition-all hover:brightness-110"
                  style={{
                    padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.1))',
                    border: '1px solid rgba(59,130,246,0.25)',
                    color: '#60a5fa', fontSize: 12, fontWeight: 600,
                  }}
                >
                  <Phone size={12} />
                  Contacter
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ icon, color, title, subtitle, features }: {
  icon: React.ReactNode; color: string; title: string; subtitle: string;
  features?: { icon: React.ReactNode; text: string }[];
}) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        padding: '48px 24px', borderRadius: 14,
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div
        className="flex items-center justify-center mb-4"
        style={{
          width: 64, height: 64, borderRadius: 16,
          background: `${color}10`,
        }}
      >
        <div style={{ color: `${color}50` }}>{icon}</div>
      </div>
      <h3 className="font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>
        {title}
      </h3>
      <p className="text-center" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, maxWidth: 420, lineHeight: 1.6 }}>
        {subtitle}
      </p>

      {features && features.length > 0 && (
        <div className="flex items-center gap-4 mt-5">
          {features.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5"
              style={{
                padding: '6px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.4)', fontSize: 11,
              }}
            >
              <div style={{ color: `${color}80` }}>{f.icon}</div>
              {f.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 90, borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ))}
    </div>
  );
}

function InfoBar() {
  return (
    <div
      className="flex items-start gap-3 mt-6"
      style={{
        padding: '14px 18px', borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(16,185,129,0.04), rgba(34,197,94,0.04))',
        border: '1px solid rgba(16,185,129,0.1)',
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 34, height: 34, borderRadius: 8,
          background: 'rgba(16,185,129,0.1)', color: '#10b981',
        }}
      >
        <Sparkles size={15} />
      </div>
      <div>
        <div className="font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12.5 }}>
          Retention Intelligente
        </div>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11.5, lineHeight: 1.6 }}>
          Les scores de retention sont calcules automatiquement par l'IA en analysant l'engagement, les paiements et les interactions.{' '}
          <span style={{ color: '#10b981', fontWeight: 600 }}>
            Intervenez rapidement sur les alertes critiques pour eviter les resiliations.
          </span>
        </p>
      </div>
    </div>
  );
}

export default CRMRetentionCenter;
