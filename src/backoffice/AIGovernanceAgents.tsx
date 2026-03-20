import React from 'react';
import {
  Target, Mail, Briefcase, Search, AlertTriangle, Gift, Smile,
  MessageSquare, TrendingUp, CheckCircle, Clock, Activity,
  ToggleLeft, ToggleRight, Zap
} from 'lucide-react';
import { AIAgent, AI_AGENTS, AIDecision } from '@/lib/crm-ai-governance';

interface AgentStats {
  agent: AIAgent;
  total: number;
  success: number;
  avgConf: number;
  lastSeen?: string;
}

interface AIGovernanceAgentsProps {
  decisions: AIDecision[];
  onToggleAgent?: (agent: AIAgent, enabled: boolean) => void;
}

const AGENT_ICON_MAP: Record<AIAgent, React.ReactNode> = {
  lead_scorer: <Target size={22} />,
  email_composer: <Mail size={22} />,
  negotiation_assistant: <Briefcase size={22} />,
  risk_analyzer: <Search size={22} />,
  churn_predictor: <AlertTriangle size={22} />,
  cross_sell_recommender: <Gift size={22} />,
  sentiment_analyzer: <Smile size={22} />,
  response_generator: <MessageSquare size={22} />,
};

const AGENT_THEME: Record<AIAgent, { icon: string; bar: string; glow: string }> = {
  lead_scorer:           { icon: 'text-blue-400',   bar: 'bg-blue-500',   glow: 'shadow-blue-500/20' },
  email_composer:        { icon: 'text-sky-400',    bar: 'bg-sky-500',    glow: 'shadow-sky-500/20' },
  negotiation_assistant: { icon: 'text-amber-400',  bar: 'bg-amber-500',  glow: 'shadow-amber-500/20' },
  risk_analyzer:         { icon: 'text-orange-400', bar: 'bg-orange-500', glow: 'shadow-orange-500/20' },
  churn_predictor:       { icon: 'text-red-400',    bar: 'bg-red-500',    glow: 'shadow-red-500/20' },
  cross_sell_recommender:{ icon: 'text-green-400',  bar: 'bg-green-500',  glow: 'shadow-green-500/20' },
  sentiment_analyzer:    { icon: 'text-teal-400',   bar: 'bg-teal-500',   glow: 'shadow-teal-500/20' },
  response_generator:    { icon: 'text-cyan-400',   bar: 'bg-cyan-500',   glow: 'shadow-cyan-500/20' },
};

const normalizeConf = (v: number) => (v > 1 ? v / 100 : v);

function computeStats(decisions: AIDecision[]): AgentStats[] {
  return (Object.keys(AI_AGENTS) as AIAgent[]).map(agent => {
    const agentDecisions = decisions.filter(d => d.agent === agent);
    const successful = agentDecisions.filter(d => d.status === 'approved' || d.status === 'auto_applied').length;
    const avgConf = agentDecisions.length
      ? agentDecisions.reduce((s, d) => s + normalizeConf(d.confidence_score), 0) / agentDecisions.length
      : 0;
    const sorted = [...agentDecisions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return {
      agent,
      total: agentDecisions.length,
      success: successful,
      avgConf,
      lastSeen: sorted[0]?.created_at,
    };
  });
}

function formatRelative(dateStr?: string): string {
  if (!dateStr) return 'Jamais';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `il y a ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

const AIGovernanceAgents: React.FC<AIGovernanceAgentsProps> = ({ decisions, onToggleAgent }) => {
  const stats = computeStats(decisions);
  const totalDecisions = decisions.length;
  const activeAgents = stats.filter(s => s.total > 0).length;
  const avgGlobalConf = decisions.length
    ? decisions.reduce((s, d) => s + normalizeConf(d.confidence_score), 0) / decisions.length
    : 0;
  const globalSuccessRate = decisions.length
    ? decisions.filter(d => d.status === 'approved' || d.status === 'auto_applied').length / decisions.length
    : 0;

  return (
    <div className="space-y-6">

      {/* Fleet summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Agents actifs', value: `${activeAgents}/8`, icon: <Activity size={16} />, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
          { label: 'Décisions totales', value: totalDecisions, icon: <Zap size={16} />, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
          { label: 'Taux de succès', value: `${Math.round(globalSuccessRate * 100)}%`, icon: <CheckCircle size={16} />, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
          { label: 'Confiance globale', value: `${Math.round(avgGlobalConf * 100)}%`, icon: <TrendingUp size={16} />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
        ].map((s, i) => (
          <div key={i} className={`border rounded-2xl p-5 ${s.color}`}>
            <div className="flex items-center gap-2 mb-2 opacity-80">
              {s.icon}
              <span className="text-xs font-medium">{s.label}</span>
            </div>
            <div className="text-3xl font-bold text-white">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map(({ agent, total, success, avgConf, lastSeen }) => {
          const info = AI_AGENTS[agent];
          const theme = AGENT_THEME[agent];
          const successRate = total > 0 ? success / total : 0;
          const isActive = total > 0;
          const pendingCount = decisions.filter(d => d.agent === agent && d.status === 'pending').length;

          return (
            <div key={agent} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all group">

              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center ${theme.icon}`}>
                    {AGENT_ICON_MAP[agent]}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{info.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{info.description}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {pendingCount > 0 && (
                    <span className="text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full">
                      {pendingCount} en attente
                    </span>
                  )}
                  <button
                    onClick={() => onToggleAgent?.(agent, !isActive)}
                    className="text-gray-600 hover:text-gray-400 transition-colors"
                    title={isActive ? 'Désactiver' : 'Activer'}
                  >
                    {isActive
                      ? <ToggleRight size={20} className="text-green-400" />
                      : <ToggleLeft size={20} className="text-gray-600" />
                    }
                  </button>
                </div>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-950 rounded-xl p-3 text-center border border-gray-800">
                  <div className="text-xl font-bold text-white">{total}</div>
                  <div className="text-[11px] text-gray-600 mt-0.5">décisions</div>
                </div>
                <div className="bg-gray-950 rounded-xl p-3 text-center border border-gray-800">
                  <div className={`text-xl font-bold ${successRate >= 0.7 ? 'text-green-400' : successRate >= 0.4 ? 'text-amber-400' : 'text-gray-500'}`}>
                    {Math.round(successRate * 100)}%
                  </div>
                  <div className="text-[11px] text-gray-600 mt-0.5">succès</div>
                </div>
                <div className="bg-gray-950 rounded-xl p-3 text-center border border-gray-800">
                  <div className={`text-xl font-bold ${avgConf >= 0.8 ? 'text-green-400' : avgConf >= 0.6 ? 'text-amber-400' : 'text-gray-500'}`}>
                    {Math.round(avgConf * 100)}%
                  </div>
                  <div className="text-[11px] text-gray-600 mt-0.5">confiance</div>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1.5">
                  <span>Confiance moyenne</span>
                  <span className={theme.icon}>{Math.round(avgConf * 100)}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${theme.bar}`}
                    style={{ width: `${Math.round(avgConf * 100)}%` }}
                  />
                </div>
              </div>

              {/* Last activity */}
              <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                <Clock size={10} />
                <span>Dernière activité : {formatRelative(lastSeen)}</span>
                {isActive && (
                  <>
                    <span className="mx-1">·</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                    <span className="text-green-500">En ligne</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AIGovernanceAgents;
