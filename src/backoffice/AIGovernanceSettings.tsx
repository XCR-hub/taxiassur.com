import React, { useEffect, useState } from 'react';
import {
  Shield, Scale, Briefcase, Zap, ToggleLeft, ToggleRight,
  ChevronRight, AlertTriangle, CheckCircle, Lock, Clock,
  Users, RefreshCw, Save
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface GovernanceRule {
  id: string;
  rule_name: string;
  rule_type: string;
  description: string;
  is_active: boolean;
  priority: number;
}

const RULE_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  COMPLIANCE: {
    label: 'Conformité',
    icon: <Shield size={15} />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/25',
  },
  ETHICAL: {
    label: 'Éthique',
    icon: <Scale size={15} />,
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/25',
  },
  BUSINESS: {
    label: 'Business',
    icon: <Briefcase size={15} />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/25',
  },
  PERFORMANCE: {
    label: 'Performance',
    icon: <Zap size={15} />,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/25',
  },
};

const RULE_NAME_LABELS: Record<string, string> = {
  gdpr_consent_check: 'Vérification consentement RGPD',
  max_daily_contacts_per_lead: 'Limite de contacts quotidiens',
  prevent_night_contact: 'Interdiction de contact nocturne',
  max_retries_failed_payment: 'Limite tentatives paiement',
  require_approval_high_value: 'Approbation humaine (haute valeur)',
  cross_sell_timing: 'Délai avant cross-sell',
  confidence_threshold: 'Seuil de confiance minimal',
};

const RULE_ICONS: Record<string, React.ReactNode> = {
  gdpr_consent_check: <Lock size={16} />,
  max_daily_contacts_per_lead: <Users size={16} />,
  prevent_night_contact: <Clock size={16} />,
  max_retries_failed_payment: <AlertTriangle size={16} />,
  require_approval_high_value: <CheckCircle size={16} />,
  cross_sell_timing: <RefreshCw size={16} />,
  confidence_threshold: <Zap size={16} />,
};

const AIGovernanceSettings: React.FC = () => {
  const [rules, setRules] = useState<GovernanceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(90);
  const [maxDecisionsPerDay, setMaxDecisionsPerDay] = useState(50);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('ai_governance_rules')
        .select('id, rule_name, rule_type, description, is_active, priority')
        .order('priority', { ascending: false });
      setRules((data as GovernanceRule[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (rule: GovernanceRule) => {
    setSaving(rule.id);
    try {
      await supabase
        .from('ai_governance_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id);
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
    } finally {
      setSaving(null);
    }
  };

  const saveThresholds = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const grouped = rules.reduce((acc, rule) => {
    const type = rule.rule_type || 'OTHER';
    if (!acc[type]) acc[type] = [];
    acc[type].push(rule);
    return acc;
  }, {} as Record<string, GovernanceRule[]>);

  const activeCount = rules.filter(r => r.is_active).length;

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-pulse">
            <div className="h-4 bg-gray-800 rounded w-1/4 mb-4" />
            <div className="space-y-3">
              {[...Array(2)].map((_, j) => <div key={j} className="h-12 bg-gray-800 rounded-xl" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Rule summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
          <div className="text-xs text-green-400 font-medium mb-1">Règles actives</div>
          <div className="text-3xl font-bold text-white">{activeCount}</div>
          <div className="text-xs text-gray-600 mt-1">sur {rules.length} règles</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          <div className="text-xs text-amber-400 font-medium mb-1">Règles suspendues</div>
          <div className="text-3xl font-bold text-white">{rules.length - activeCount}</div>
          <div className="text-xs text-gray-600 mt-1">désactivées</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
          <div className="text-xs text-blue-400 font-medium mb-1">Catégories</div>
          <div className="text-3xl font-bold text-white">{Object.keys(grouped).length}</div>
          <div className="text-xs text-gray-600 mt-1">types de règles</div>
        </div>
      </div>

      {/* Rules by category */}
      {Object.entries(grouped).map(([type, typeRules]) => {
        const typeConfig = RULE_TYPE_CONFIG[type] || {
          label: type,
          icon: <ChevronRight size={15} />,
          color: 'text-gray-400',
          bg: 'bg-gray-800 border-gray-700',
        };

        return (
          <div key={type} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className={`flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-800`}>
              <div className={`flex items-center gap-2 text-sm font-semibold ${typeConfig.color}`}>
                {typeConfig.icon}
                {typeConfig.label}
              </div>
              <span className="text-xs text-gray-600">
                {typeRules.filter(r => r.is_active).length}/{typeRules.length} actives
              </span>
            </div>

            <div className="divide-y divide-gray-800/60">
              {typeRules.map(rule => {
                const label = RULE_NAME_LABELS[rule.rule_name] || rule.rule_name.replace(/_/g, ' ');
                const icon = RULE_ICONS[rule.rule_name] || <ChevronRight size={16} />;
                const isSaving = saving === rule.id;

                return (
                  <div key={rule.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-800/30 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      rule.is_active ? typeConfig.bg + ' ' + typeConfig.color : 'bg-gray-800 text-gray-600 border border-gray-700'
                    }`}>
                      {icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${rule.is_active ? 'text-white' : 'text-gray-500'}`}>
                        {label}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">{rule.description}</div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-gray-600">Priorité {rule.priority}</span>
                      <button
                        onClick={() => toggleRule(rule)}
                        disabled={isSaving}
                        className="transition-opacity disabled:opacity-50"
                      >
                        {rule.is_active
                          ? <ToggleRight size={22} className="text-green-400 hover:text-green-300" />
                          : <ToggleLeft size={22} className="text-gray-600 hover:text-gray-400" />
                        }
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Thresholds */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
          <Zap size={16} className="text-blue-400" />
          Seuils automatiques
        </h3>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-xs text-gray-400 mb-2">
              Seuil d'auto-approbation
              <span className="ml-2 text-blue-400 font-bold">{autoApproveThreshold}%</span>
            </label>
            <input
              type="range"
              min={50}
              max={99}
              value={autoApproveThreshold}
              onChange={e => setAutoApproveThreshold(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>50%</span>
              <span className="text-gray-500">Les décisions au-dessus de ce seuil sont appliquées automatiquement</span>
              <span>99%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">
              Décisions max/jour
              <span className="ml-2 text-amber-400 font-bold">{maxDecisionsPerDay}</span>
            </label>
            <input
              type="range"
              min={10}
              max={200}
              step={10}
              value={maxDecisionsPerDay}
              onChange={e => setMaxDecisionsPerDay(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>10</span>
              <span className="text-gray-500">Limite de protection contre les surcharges</span>
              <span>200</span>
            </div>
          </div>
        </div>

        <button
          onClick={saveThresholds}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {saved ? <CheckCircle size={15} /> : <Save size={15} />}
          {saved ? 'Enregistré !' : 'Enregistrer les seuils'}
        </button>
      </div>
    </div>
  );
};

export default AIGovernanceSettings;
