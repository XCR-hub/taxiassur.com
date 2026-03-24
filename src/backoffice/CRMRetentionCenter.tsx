import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Gift, RefreshCw, CheckCircle, XCircle,
  ChevronRight, Calendar, Phone, Zap, Shield, Activity,
  TrendingUp, Clock, Star, UserCheck, ArrowRight, Bell,
} from 'lucide-react';
import { retentionService, ChurnAlert, CrossSellOpportunity, RenewalReminder } from '@/lib/crm-retention';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

type Tab = 'alerts' | 'crosssell' | 'renewals';

const SEVERITY = {
  low:      { label: 'Faible',    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.2)',  bar: '#3b82f6' },
  medium:   { label: 'Moyen',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.2)',  bar: '#f59e0b' },
  high:     { label: 'Élevé',     color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.2)',  bar: '#f97316' },
  critical: { label: 'Critique',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.2)',   bar: '#ef4444' },
};

const ALERT_TYPE_LABEL: Record<ChurnAlert['alert_type'], string> = {
  low_engagement:     'Faible engagement',
  payment_issue:      'Problème paiement',
  negative_sentiment: 'Sentiment négatif',
  competitor_inquiry: 'Demande concurrent',
  renewal_risk:       'Risque renouvellement',
};

const PRODUCT_ICON: Record<CrossSellOpportunity['product_type'], string> = {
  rc_pro:                   'RC Pro',
  flotte:                   'Flotte',
  vtc:                      'VTC',
  garanties_supplementaires:'Garanties+',
  assistance_premium:       'Assistance',
};

const CRMRetentionCenter: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('alerts');
  const [churnAlerts, setChurnAlerts] = useState<ChurnAlert[]>([]);
  const [crossSellOps, setCrossSellOps] = useState<CrossSellOpportunity[]>([]);
  const [renewals, setRenewals] = useState<RenewalReminder[]>([]);
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
      const [alertsData, opsData, renewalsData, statsData] = await Promise.all([
        retentionService.getChurnAlerts({ status: 'new' }),
        retentionService.getCrossSellOpportunities(),
        retentionService.getRenewalReminders({ daysUntil: 60 }),
        retentionService.getRetentionStats(),
      ]);
      setChurnAlerts(alertsData);
      setCrossSellOps(opsData.filter(o => o.status === 'suggested'));
      setRenewals(renewalsData.filter(r => r.status === 'pending'));
      setStats(statsData);
    } catch {
      // silent fail - tables may not have data
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
      toast.success('Alerte résolue');
      await loadData(true);
    } catch { toast.error('Erreur lors de la résolution'); }
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
      toast.success('Opportunité convertie');
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

  const criticalCount  = churnAlerts.filter(a => a.severity === 'critical').length;
  const highCount      = churnAlerts.filter(a => a.severity === 'high').length;
  const urgentRenewals = renewals.filter(r => r.days_until_renewal <= 7).length;

  const statCards = [
    { label: 'À risque',       value: stats?.at_risk_count ?? 0,                                icon: <AlertTriangle size={16} />, color: '#ef4444' },
    { label: 'Score moyen',    value: stats ? `${Math.round(stats.avg_retention_score)}%` : '—', icon: <Shield size={16} />,        color: '#10b981' },
    { label: 'Taux fidélité',  value: stats ? `${Math.round(stats.renewal_rate * 100)}%` : '—', icon: <UserCheck size={16} />,     color: '#3b82f6' },
    { label: 'Cross-sell',     value: stats ? `${Math.round(stats.cross_sell_conversion_rate * 100)}%` : '—', icon: <TrendingUp size={16} />, color: '#f59e0b' },
  ];

  const tabs: { key: Tab; label: string; count: number; color: string }[] = [
    { key: 'alerts',    label: 'Alertes Churn',  count: churnAlerts.length,  color: '#ef4444' },
    { key: 'crosssell', label: 'Cross-sell',     count: crossSellOps.length, color: '#f59e0b' },
    { key: 'renewals',  label: 'Renouvellements',count: renewals.length,     color: '#3b82f6' },
  ];

  return (
    <div style={{ background: '#0f1117', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── HEADER ── */}
      <div style={{
        padding: '18px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.015)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={18} style={{ color: '#10b981' }} />
          </div>
          <div>
            <h1 style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>
              Centre de Rétention
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
              Anti-churn · Cross-sell · Renouvellements
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {criticalCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 8,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#ef4444', fontSize: 12, fontWeight: 600,
            }}>
              <Bell size={13} />
              {criticalCount} critique{criticalCount > 1 ? 's' : ''}
            </div>
          )}
          {urgentRenewals > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 8,
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
              color: '#f59e0b', fontSize: 12, fontWeight: 600,
            }}>
              <Clock size={13} />
              {urgentRenewals} renou. urgent{urgentRenewals > 1 ? 's' : ''}
            </div>
          )}
          <button
            onClick={() => loadData(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              color: refreshing ? '#10b981' : 'rgba(255,255,255,0.45)',
              fontSize: 12, cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px', flex: 1, overflow: 'auto' }}>

        {/* ── STAT CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {statCards.map((card, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 12,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: `${card.color}18`, color: card.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{card.icon}</div>
              <div>
                <div style={{ color: card.color, fontSize: 20, fontWeight: 700, lineHeight: 1.1 }}>
                  {loading ? '…' : card.value}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── TABS ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          {tabs.map(t => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
                  background: active ? `${t.color}20` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? `${t.color}40` : 'rgba(255,255,255,0.08)'}`,
                  color: active ? t.color : 'rgba(255,255,255,0.4)',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
                {t.count > 0 && (
                  <span style={{
                    background: active ? `${t.color}30` : 'rgba(255,255,255,0.07)',
                    color: active ? t.color : 'rgba(255,255,255,0.4)',
                    borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 6px',
                  }}>{t.count}</span>
                )}
              </button>
            );
          })}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontSize: 11 }}>
            <Activity size={11} />
            Temps réel
          </div>
        </div>

        {/* ── CONTENT ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{
                height: 96, borderRadius: 12,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                animation: 'pulse 1.5s infinite',
              }} />
            ))}
          </div>
        ) : (
          <>
            {/* CHURN ALERTS */}
            {tab === 'alerts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {churnAlerts.length === 0 ? (
                  <EmptyState icon={<CheckCircle size={24} />} color="#10b981"
                    title="Aucune alerte churn active"
                    subtitle="Tous vos clients présentent un risque de rétention sain" />
                ) : (
                  churnAlerts.map(alert => {
                    const sev = SEVERITY[alert.severity];
                    return (
                      <div key={alert.id} style={{
                        borderRadius: 12, overflow: 'hidden',
                        background: 'rgba(255,255,255,0.025)',
                        border: `1px solid ${sev.border}`,
                      }}>
                        {/* Top severity bar */}
                        <div style={{ height: 2, background: sev.bar }} />

                        <div style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            {/* Severity badge */}
                            <div style={{
                              padding: '5px 10px', borderRadius: 8, flexShrink: 0,
                              background: sev.bg, border: `1px solid ${sev.border}`,
                              color: sev.color, fontSize: 11, fontWeight: 700,
                              letterSpacing: '0.04em',
                            }}>
                              {sev.label.toUpperCase()}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
                                  {alert.title}
                                </span>
                                <span style={{
                                  background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)',
                                  borderRadius: 5, fontSize: 10, padding: '1px 7px',
                                }}>
                                  {ALERT_TYPE_LABEL[alert.alert_type]}
                                </span>
                              </div>
                              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 10 }}>
                                {alert.description}
                              </p>

                              {alert.suggested_actions.length > 0 && (
                                <div style={{
                                  padding: '10px 12px', borderRadius: 8,
                                  background: 'rgba(255,255,255,0.03)',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  marginBottom: 10,
                                }}>
                                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 6 }}>
                                    ACTIONS SUGGÉRÉES
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {alert.suggested_actions.map((action, idx) => (
                                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: sev.color, marginTop: 5, flexShrink: 0 }} />
                                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{action}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
                                  {new Date(alert.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              <button
                                onClick={() => navigate(`/backoffice/crm/lead/${alert.lead_id}`)}
                                style={{
                                  width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                  color: 'rgba(255,255,255,0.35)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                                title="Voir le lead"
                              >
                                <ChevronRight size={14} />
                              </button>
                              <button
                                onClick={() => resolveAlert(alert.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                                  background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)',
                                  color: '#10b981', fontSize: 12, fontWeight: 600,
                                }}
                              >
                                <CheckCircle size={12} />
                                Résolu
                              </button>
                              <button
                                onClick={() => dismissAlert(alert.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                  color: 'rgba(255,255,255,0.35)', fontSize: 12,
                                }}
                              >
                                <XCircle size={12} />
                                Ignorer
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {(highCount > 0 || criticalCount > 0) && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', borderRadius: 10, marginTop: 4,
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)',
                  }}>
                    <Zap size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>{criticalCount + highCount} alerte{criticalCount + highCount > 1 ? 's' : ''} haute priorité</span>
                      {' '}— Contactez ces clients au plus tôt pour réduire le risque de résiliation.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* CROSS-SELL */}
            {tab === 'crosssell' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {crossSellOps.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <EmptyState icon={<Gift size={24} />} color="#f59e0b"
                      title="Aucune opportunité détectée"
                      subtitle="L'IA analysera vos clients pour identifier des opportunités" />
                  </div>
                ) : (
                  crossSellOps.slice(0, 10).map(opp => {
                    const confidence = Math.round(opp.confidence_score * 100);
                    const confColor = confidence >= 80 ? '#10b981' : confidence >= 60 ? '#f59e0b' : '#3b82f6';
                    return (
                      <div key={opp.id} style={{
                        borderRadius: 12, padding: '16px',
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        display: 'flex', flexDirection: 'column', gap: 10,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{
                                background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                                borderRadius: 6, fontSize: 10, fontWeight: 700,
                                padding: '2px 8px', letterSpacing: '0.04em',
                              }}>
                                {PRODUCT_ICON[opp.product_type]}
                              </span>
                              <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
                                {opp.product_name}
                              </span>
                            </div>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1.5 }}>
                              {opp.reasoning}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ color: confColor, fontSize: 18, fontWeight: 700 }}>{confidence}%</div>
                            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>confiance</div>
                          </div>
                        </div>

                        {/* Confidence bar */}
                        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
                          <div style={{ height: '100%', borderRadius: 99, background: confColor, width: `${confidence}%`, transition: 'width 0.5s' }} />
                        </div>

                        <div style={{
                          padding: '9px 12px', borderRadius: 8,
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.055)',
                        }}>
                          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>APPROCHE</div>
                          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 1.5 }}>{opp.best_approach}</p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ color: '#10b981', fontWeight: 700, fontSize: 15 }}>
                            {opp.estimated_value.toLocaleString('fr-FR')}€
                            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 400, marginLeft: 4 }}>/an estimé</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => navigate(`/backoffice/crm/lead/${opp.lead_id}`)}
                              style={{
                                width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                color: 'rgba(255,255,255,0.35)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              <ChevronRight size={13} />
                            </button>
                            <button
                              onClick={() => declineOpp(opp.id)}
                              style={{
                                padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                color: 'rgba(255,255,255,0.35)', fontSize: 11,
                              }}
                            >
                              Plus tard
                            </button>
                            <button
                              onClick={() => convertOpp(opp.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)',
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
                  })
                )}
              </div>
            )}

            {/* RENEWALS */}
            {tab === 'renewals' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {renewals.length === 0 ? (
                  <EmptyState icon={<Calendar size={24} />} color="#3b82f6"
                    title="Aucun renouvellement dans les 60 jours"
                    subtitle="Les contrats à renouveler apparaîtront ici automatiquement" />
                ) : (
                  renewals.map(renewal => {
                    const days = renewal.days_until_renewal;
                    const urgency = days <= 7   ? { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Urgent' }
                                  : days <= 30  ? { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Proche' }
                                  : { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'Planifié' };
                    const progress = Math.max(0, Math.min(100, ((60 - days) / 60) * 100));

                    return (
                      <div key={renewal.id} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 16px', borderRadius: 12,
                        background: 'rgba(255,255,255,0.025)',
                        border: days <= 7 ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.07)',
                      }}>
                        {/* Days countdown */}
                        <div style={{
                          minWidth: 60, textAlign: 'center', flexShrink: 0,
                          padding: '8px', borderRadius: 10,
                          background: urgency.bg, border: `1px solid ${urgency.color}30`,
                        }}>
                          <div style={{ color: urgency.color, fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{days}</div>
                          <div style={{ color: urgency.color, fontSize: 9, fontWeight: 600, opacity: 0.7, marginTop: 2 }}>JOURS</div>
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>
                              Contrat #{renewal.contract_id?.slice(0, 8) ?? '—'}
                            </span>
                            <span style={{
                              background: urgency.bg, color: urgency.color,
                              borderRadius: 5, fontSize: 10, fontWeight: 700, padding: '1px 6px',
                            }}>
                              {urgency.label}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                              <Calendar size={11} />
                              {new Date(renewal.renewal_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                            {renewal.last_contact_date && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                                <Clock size={11} />
                                Dernier contact : {new Date(renewal.last_contact_date).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </div>

                          {/* Progress toward expiry */}
                          <div style={{ marginTop: 8, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
                            <div style={{
                              height: '100%', borderRadius: 99, width: `${progress}%`,
                              background: `linear-gradient(90deg, ${urgency.color}80, ${urgency.color})`,
                              transition: 'width 0.5s',
                            }} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => navigate(`/backoffice/crm/lead/${renewal.lead_id}`)}
                            style={{
                              width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                              color: 'rgba(255,255,255,0.35)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <Star size={13} />
                          </button>
                          <button
                            onClick={() => contactRenewal(renewal)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                              background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)',
                              color: '#60a5fa', fontSize: 12, fontWeight: 600,
                            }}
                          >
                            <Phone size={12} />
                            Contacter
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        {/* ── INFO BANNER ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, marginTop: 24,
          padding: '14px 18px', borderRadius: 12,
          background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: 'rgba(16,185,129,0.12)', color: '#10b981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={15} />
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
              Rétention Intelligente
            </div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, lineHeight: 1.6 }}>
              Les scores de rétention sont calculés automatiquement par l'IA en analysant l'engagement, les paiements et les interactions.
              {' '}<span style={{ color: '#34d399', fontWeight: 600 }}>Intervenez rapidement sur les alertes critiques pour éviter les résiliations.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle: string;
}> = ({ icon, color, title, subtitle }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '56px 24px', borderRadius: 14,
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.055)',
  }}>
    <div style={{
      width: 52, height: 52, borderRadius: 13, marginBottom: 14,
      background: `${color}12`, color: `${color}60`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {icon}
    </div>
    <div style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600, fontSize: 14, marginBottom: 5 }}>{title}</div>
    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', maxWidth: 320 }}>{subtitle}</div>
  </div>
);

export default CRMRetentionCenter;
