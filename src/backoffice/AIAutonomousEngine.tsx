import React, { useState, useEffect } from 'react';
import { Brain, Zap, TrendingUp, Clock, CheckCircle, AlertCircle, Play, Pause, Activity, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SystemStatus {
  config: {
    ai_engine_running: boolean;
    email_automation_enabled: boolean;
    sms_automation_enabled: boolean;
    review_requests_enabled: boolean;
    max_daily_actions: number;
    ai_learning_enabled: boolean;
    automation_start_date: string;
  };
  templates: {
    total: number;
    active: number;
    inactive: number;
  };
  stats: {
    pending_actions: number;
    scheduled_reminders: number;
    total_leads: number;
    eligible_leads: number;
    active_eligible_leads: number;
    automation_start_date: string;
  };
  checked_at: string;
}

const AIAutonomousEngine: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    loadStatus();
    autoStartIfNeeded();
  }, []);

  const loadStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_filtered_system_status');

      if (error) throw error;

      setStatus(data);
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setLoading(false);
    }
  };

  const autoStartIfNeeded = async () => {
    try {
      const { data: shouldStart } = await supabase.rpc('should_ai_auto_start');

      if (shouldStart) {
        await startAI();
      }
    } catch (error) {
      console.error('Auto-start error:', error);
    }
  };

  const startAI = async () => {
    setStarting(true);
    try {
      const { data, error } = await supabase.rpc('start_ai_engine');

      if (error) throw error;

      await loadStatus();
    } catch (error) {
      console.error('Error starting AI:', error);
    } finally {
      setStarting(false);
    }
  };

  const stopAI = async () => {
    setStarting(true);
    try {
      const { data, error } = await supabase.rpc('stop_ai_engine');

      if (error) throw error;

      await loadStatus();
    } catch (error) {
      console.error('Error stopping AI:', error);
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const isRunning = status?.config?.ai_engine_running;
  const automationDate = status?.stats?.automation_start_date
    ? new Date(status.stats.automation_start_date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : '04/01/2026';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain className="w-10 h-10 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold">IA Autonome & Apprenante</h1>
            <p className="text-gray-600">Système intelligent pour nouveaux leads uniquement</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isRunning ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="font-bold">{isRunning ? 'ACTIF' : 'ARRÊTÉ'}</span>
          </div>

          <button
            onClick={isRunning ? stopAI : startAI}
            disabled={starting}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition ${
              isRunning
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            } disabled:opacity-50`}
          >
            {starting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            ) : isRunning ? (
              <>
                <Pause className="w-5 h-5" />
                Arrêter
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Démarrer
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-blue-900">Filtre Activé : Nouveaux Leads Uniquement</h3>
        </div>
        <p className="text-blue-700 mb-2">
          L'IA et les automations traitent <strong>UNIQUEMENT</strong> les leads créés depuis le <strong>{automationDate}</strong>.
        </p>
        <p className="text-sm text-blue-600">
          Les leads existants (avant cette date) ne sont PAS touchés par les automations et n'ont reçu aucun email automatique.
        </p>
      </div>

      {isRunning && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-6 h-6 text-green-600 animate-pulse" />
            <h3 className="text-lg font-bold text-green-900">IA Active et en Fonctionnement</h3>
          </div>
          <p className="text-green-700">
            L'IA analyse continuellement les nouveaux leads, crée automatiquement des actions optimisées,
            et apprend de chaque interaction pour améliorer ses performances.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-8 h-8 text-blue-500" />
            <div className="text-2xl font-bold">{status?.stats?.pending_actions || 0}</div>
          </div>
          <div className="text-sm text-gray-600">Actions en Attente</div>
          <div className="text-xs text-gray-500 mt-1">(Nouveaux leads uniquement)</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-orange-500" />
            <div className="text-2xl font-bold">{status?.stats?.scheduled_reminders || 0}</div>
          </div>
          <div className="text-sm text-gray-600">Relances Programmées</div>
          <div className="text-xs text-gray-500 mt-1">(Nouveaux leads uniquement)</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <div className="text-2xl font-bold">{status?.stats?.active_eligible_leads || 0}</div>
          </div>
          <div className="text-sm text-gray-600">Leads Actifs Éligibles</div>
          <div className="text-xs text-gray-500 mt-1">
            {status?.stats?.eligible_leads || 0} éligibles / {status?.stats?.total_leads || 0} total
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-8 h-8 text-purple-500" />
            <div className="text-2xl font-bold">{status?.templates?.active || 0}/{status?.templates?.total || 0}</div>
          </div>
          <div className="text-sm text-gray-600">Templates Actifs</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Configuration du Système</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="font-medium">Automation Emails</span>
            {status?.config?.email_automation_enabled ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="font-medium">Automation SMS</span>
            {status?.config?.sms_automation_enabled ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="font-medium">Demandes Avis Auto</span>
            {status?.config?.review_requests_enabled ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="font-medium">Apprentissage IA</span>
            {status?.config?.ai_learning_enabled ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-2">Ce que l'IA fait automatiquement (nouveaux leads uniquement) :</h3>
        <ul className="space-y-2 text-blue-700">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>Analyse tous les nouveaux leads (créés après le {automationDate})</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>Envoie automatiquement les demandes de documents manquants</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>Relance les nouveaux leads inactifs au moment optimal</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>Demande des avis Google aux nouveaux clients satisfaits</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>Apprend continuellement pour améliorer les taux de succès</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-600" />
            <span className="font-bold text-red-700">N'envoie AUCUN email aux leads créés avant le {automationDate}</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AIAutonomousEngine;
