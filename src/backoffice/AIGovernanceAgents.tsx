import React from 'react';
import {
  Target, Mail, Briefcase, Search, AlertTriangle, Gift, Smile,
  MessageSquare, TrendingUp, CheckCircle, Clock, Activity,
  Zap, Award, Flame, Star
} from 'lucide-react';
import { AIAgent, AI_AGENTS, AIDecision, AI_AGENT_MODELS, AI_PROVIDERS } from '@/lib/crm-ai-governance';

interface AgentStats {
  agent: AIAgent;
  total: number;
  success: number;
  rejected: number;
  pending: number;
  avgConf: number;
  lastSeen?: string;
  recentActivity: number[];
}

interface AIGovernanceAgentsProps {
  decisions: AIDecision[];
  onToggleAgent?: (agent: AIAgent, enabled: boolean) => void;
}

const AGENT_ICON_MAP: Record<AIAgent, React.ReactNode> = {
  lead_scorer:            <Target size={20} />,
  email_composer:         <Mail size={20} />,
  negotiation_assistant:  <Briefcase size={20} />,
  risk_analyzer:          <Search size={20} />,
  churn_predictor:        <AlertTriangle size={20} />,
  cross_sell_recommender: <Gift size={20} />,
  sentiment_analyzer:     <Smile size={20} />,
  response_generator:     <MessageSquare size={20} />,
};

const AGENT_THEME: Record<AIAgent, {
  icon: string; bar: string; ring: string; gradient: string; border: string; glow: string
}> = {
  lead_scorer:            { icon: 'text-blue-400',   bar: 'bg-blue-500',   ring: '#3b82f6', gradient: 'from-blue-500/12 to-transparent',   border: 'border-blue-500/20', glow: 'shadow-blue-500/10' },
  email_composer:         { icon: 'text-sky-400',    bar: 'bg-sky-500',    ring: '#0ea5e9', gradient: 'from-sky-500/12 to-transparent',    border: 'border-sky-500/20',  glow: 'shadow-sky-500/10' },
  negotiation_assistant:  { icon: 'text-amber-400',  bar: 'bg-amber-500',  ring: '#f59e0b', gradient: 'from-amber-500/12 to-transparent',  border: 'border-amber-500/20',glow: 'shadow-amber-500/10' },
  risk_analyzer:          { icon: 'text-orange-400', bar: 'bg-orange-500', ring: '#f97316', gradient: 'from-orange-500/12 to-transparent', border: 'border-orange-500/20',glow: 'shadow-orange-500/10' },
  churn_predictor:        { icon: 'text-red-400',    bar: 'bg-red-500',    ring: '#ef4444', gradient: 'from-red-500/12 to-transparent',    border: 'border-red-500/20',  glow: 'shadow-red-500/10' },
  cross_sell_recommender: { icon: 'text-green-400',  bar: 'bg-green-500',  ring: '#22c55e', gradient: 'from-green-500/12 to-transparent',  border: 'border-green-500/20',glow: 'shadow-green-500/10' },
  sentiment_analyzer:     { icon: 'text-teal-400',   bar: 'bg-teal-500',   ring: '#14b8a6', gradient: 'from-teal-500/12 to-transparent',   border: 'border-teal-500/20', glow: 'shadow-teal-500/10' },
  response_generator:     { icon: 'text-cyan-400',   bar: 'bg-cyan-500',   ring: '#06b6d4', gradient: 'from-cyan-500/12 to-transparent',   border: 'border-cyan-500/20', glow: 'shadow-cyan-500/10' },
};

const normalizeConf = (v: number) => (v > 1 ? v / 100 : v);

function getPerformanceTier(successRate: number, total: number, avgConf: number): {
  label: string; color: string; bg: string; icon: React.ReactNode
} {
  if (total === 0) return { label: 'Inactif', color: 'text-gray-500', bg: 'bg-gray-500/10 border-gray-500/20', icon: <Clock size={10} /> };
  if (successRate >= 0.85 && avgConf >= 0.8 && total >= 5)
    return { label: 'Expert', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/25', icon: <Award size={10} /> };
  if (successRate >= 0.7 && avgConf >= 0.65)
    return { label: 'Actif', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/25', icon: <Flame size={10} /> };
  if (total >= 1)
    return { label: 'Apprentissage', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/25', icon: <Star size={10} /> };
  return { label: 'Inactif', color: 'text-gray-500', bg: 'bg-gray-500/10 border-gray-500/20', icon: <Clock size={10} /> };
}

function buildActivityBars(decisions: AIDecision[]): number[] {
  const bars = Array(7).fill(0);
  const now = Date.now();
  decisions.forEach(d => {
    const age = (now - new Date(d.created_at).getTime()) / 86400000;
    const idx = Math.floor(age);
    if (idx < 7) bars[6 - idx]++;
  });
  return bars;
}

function computeStats(decisions: AIDecision[]): AgentStats[] {
  return (Object.keys(AI_AGENTS) as AIAgent[]).map(agent => {
    const agentDecisions = decisions.filter(d => d.agent === agent);
    const success = agentDecisions.filter(d => d.status === 'approved' || d.status === 'auto_applied').length;
    const rejected = agentDecisions.filter(d => d.status === 'rejected').length;
    const pending = agentDecisions.filter(d => d.status === 'pending').length;
    const avgConf = agentDecisions.length
      ? agentDecisions.reduce((s, d) => s + normalizeConf(d.confidence_score), 0) / agentDecisions.length
      : 0;
    const sorted = [...agentDecisions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return {
      agent, total: agentDecisions.length, success, rejected, pending, avgConf,
      lastSeen: sorted[0]?.created_at,
      recentActivity: buildActivityBars(agentDecisions),
    };
  });
}

function formatRelative(dateStr?: string): string {
  if (!dateStr) return 'Jamais';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return 'À l\'instant';
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

const ConfidenceArc: React.FC<{ pct: number; color: string }> = ({ pct, color }) => {
  const size = 40;
  const sw = 3;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f2937" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
};

const AIGovernanceAgents: React.FC<AIGovernanceAgentsProps> = ({ decisions }) => {
  const stats = computeStats(decisions);
  const totalDecisions = decisions.length;
  const activeAgents = stats.filter(s => s.total > 0).length;
  const avgGlobalConf = decisions.length
    ? decisions.reduce((s, d) => s + normalizeConf(d.confidence_score), 0) / decisions.length
    : 0;
  const globalSuccessRate = decisions.length
    ? decisions.filter(d => d.status === 'approved' || d.status === 'auto_applied').length / decisions.length
    : 0;
  const maxActivity = Math.max(...stats.flatMap(s => s.recentActivity), 1);

  return (
    <div className="space-y-6">

      {/* ── Fleet KPIs ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: 'Agents déployés', value: `${activeAgents}/8`,
            icon: <Activity size={15} />, color: 'text-emerald-400',
            bg: 'bg-emerald-500/8 border-emerald-500/20',
            sub: activeAgents === 8 ? 'Flotte complète' : `${8 - activeAgents} en attente`,
          },
          {
            label: 'Décisions totales', value: totalDecisions,
            icon: <Zap size={15} />, color: 'text-blue-400',
            bg: 'bg-blue-500/8 border-blue-500/20',
            sub: `${decisions.filter(d => d.status === 'pending').length} en attente`,
          },
          {
            label: 'Taux de succès', value: `${Math.round(globalSuccessRate * 100)}%`,
            icon: <CheckCircle size={15} />, color: 'text-teal-400',
            bg: 'bg-teal-500/8 border-teal-500/20',
            sub: `${decisions.filter(d => d.status === 'approved' || d.status === 'auto_applied').length} approuvées`,
          },
          {
            label: 'Confiance globale', value: `${Math.round(avgGlobalConf * 100)}%`,
            icon: <TrendingUp size={15} />, color: 'text-amber-400',
            bg: 'bg-amber-500/8 border-amber-500/20',
            sub: avgGlobalConf >= 0.75 ? 'Excellente qualité' : avgGlobalConf >= 0.5 ? 'Bonne qualité' : 'En amélioration',
          },
        ].map((s, i) => (
          <div key={i} className={`border rounded-2xl p-5 ${s.bg}`}>
            <div className={`flex items-center gap-2 mb-3 ${s.color} opacity-80`}>
              {s.icon}
              <span className="text-xs font-medium text-gray-400">{s.label}</span>
            </div>
            <div className={`text-3xl font-bold ${s.color} mb-1`}>{s.value}</div>
            <div className="text-[11px] text-gray-600">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Multi-provider summary ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Providers IA</h3>
        <div className="grid grid-cols-4 gap-3">
          {(Object.entries(AI_PROVIDERS) as [string, typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS]][])
            .filter(([k]) => k !== 'openrouter')
            .map(([key, provider]) => {
              const agentCount = (Object.entries(AI_AGENT_MODELS) as [AIAgent, typeof AI_AGENT_MODELS[AIAgent]][])
                .filter(([, m]) => m.provider === key).length;
              const providerDecisions = decisions.filter(d => d.model_provider === key).length;
              return (
                <div key={key} className={`border rounded-xl p-3 ${provider.color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-bold">{provider.icon}</span>
                    <span className="text-sm font-semibold">{provider.name}</span>
                  </div>
                  <div className="text-[11px] opacity-70">
                    {agentCount} agent{agentCount > 1 ? 's' : ''} · {providerDecisions} decision{providerDecisions !== 1 ? 's' : ''}
                  </div>
                </div>
              );
          })}
        </div>
      </div>

      {/* ── Activity heatmap bar (7 days) ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Activité sur 7 jours</h3>
            <p className="text-[11px] text-gray-600 mt-0.5">Nombre de décisions générées par jour</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {stats.filter(s => s.total > 0).map(({ agent, recentActivity }) => {
            const theme = AGENT_THEME[agent];
            const info = AI_AGENTS[agent];
            const days = ['J-6','J-5','J-4','J-3','J-2','Hier','Auj'];
            return (
              <div key={agent} className="flex items-center gap-3">
                <div className={`w-5 h-5 flex items-center justify-center text-sm flex-shrink-0`}>
                  {info.icon}
                </div>
                <span className="text-[11px] text-gray-500 w-32 flex-shrink-0 truncate">{info.name}</span>
                <div className="flex items-end gap-1 flex-1">
                  {recentActivity.map((count, i) => {
                    const h = maxActivity === 0 ? 4 : Math.max(4, Math.round((count / maxActivity) * 28));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={`w-full rounded-sm transition-all ${count > 0 ? theme.bar : 'bg-gray-800'}`}
                          style={{ height: `${h}px`, opacity: count > 0 ? 0.7 + (count / maxActivity) * 0.3 : 1 }}
                          title={`${days[i]}: ${count} décision${count !== 1 ? 's' : ''}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <span className={`text-[11px] font-semibold w-6 text-right ${theme.icon}`}>
                  {recentActivity.reduce((a, b) => a + b, 0)}
                </span>
              </div>
            );
          })}
          {stats.filter(s => s.total > 0).length === 0 && (
            <p className="text-center text-sm text-gray-600 py-4">Aucune activité récente</p>
          )}
        </div>
      </div>

      {/* ── Agent cards grid ── */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map(({ agent, total, success, rejected, pending, avgConf, lastSeen, recentActivity }) => {
          const info = AI_AGENTS[agent];
          const theme = AGENT_THEME[agent];
          const successRate = total > 0 ? success / total : 0;
          const isActive = total > 0;
          const tier = getPerformanceTier(successRate, total, avgConf);
          const confPct = Math.round(avgConf * 100);
          const weekTotal = recentActivity.reduce((a, b) => a + b, 0);

          return (
            <div
              key={agent}
              className={`bg-gray-900 border rounded-2xl overflow-hidden transition-all group hover:shadow-lg ${
                isActive ? `${theme.border} hover:shadow-xl ${theme.glow}` : 'border-gray-800'
              }`}
            >
              {/* Gradient header */}
              <div className={`bg-gradient-to-r ${theme.gradient} px-5 pt-5 pb-4 border-b border-gray-800/60`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center ${theme.icon}`}>
                      {AGENT_ICON_MAP[agent]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{info.name}</span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 max-w-48 leading-tight">{info.description}</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tier.bg} ${tier.color}`}>
                      {tier.icon}
                      {tier.label}
                    </span>
                    {(() => {
                      const model = AI_AGENT_MODELS[agent];
                      if (!model) return null;
                      const providerInfo = AI_PROVIDERS[model.provider];
                      return (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${providerInfo.color}`}>
                          <span className="font-bold text-[9px]">{providerInfo.icon}</span>
                          {model.label}
                        </span>
                      );
                    })()}
                    {pending > 0 && (
                      <span className="text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full">
                        {pending} en attente
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* KPI row */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Total', value: total, color: 'text-white' },
                    { label: 'Succès', value: success, color: 'text-emerald-400' },
                    { label: 'Rejetées', value: rejected, color: rejected > 0 ? 'text-red-400' : 'text-gray-600' },
                    { label: 'Cette sem.', value: weekTotal, color: weekTotal > 0 ? theme.icon : 'text-gray-600' },
                  ].map((k, i) => (
                    <div key={i} className="bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-center">
                      <div className={`text-lg font-bold leading-tight ${k.color}`}>{k.value}</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">{k.label}</div>
                    </div>
                  ))}
                </div>

                {/* Confidence */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <ConfidenceArc pct={confPct} color={theme.ring} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-[11px] font-bold ${theme.icon}`}>{confPct}%</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-gray-500">Confiance moyenne</span>
                      <span className={`text-[11px] font-semibold ${theme.icon}`}>{confPct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${theme.bar}`}
                        style={{ width: `${confPct}%` }}
                      />
                    </div>
                    {total > 0 && (
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-gray-600">Taux succès</span>
                        <span className={`text-[10px] font-medium ${successRate >= 0.7 ? 'text-emerald-400' : successRate >= 0.4 ? 'text-amber-400' : 'text-gray-500'}`}>
                          {Math.round(successRate * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mini activity sparkline */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-gray-600 font-medium uppercase tracking-wider">Activité 7j</span>
                    <span className="text-[10px] text-gray-600">{formatRelative(lastSeen)}</span>
                  </div>
                  <div className="flex items-end gap-0.5 h-5">
                    {recentActivity.map((count, i) => {
                      const h = maxActivity === 0 ? 2 : Math.max(2, Math.round((count / maxActivity) * 20));
                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-sm ${count > 0 ? theme.bar : 'bg-gray-800'}`}
                          style={{ height: `${h}px`, opacity: count > 0 ? 0.6 + (count / maxActivity) * 0.4 : 1 }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AIGovernanceAgents;
