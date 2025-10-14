import { useState, useEffect } from 'react';
import { Calendar, Clock, Zap, Play, Pause, Settings, TrendingUp, FileText, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ScheduleConfig {
  id: string;
  content_type: 'blog' | 'faq' | 'review';
  frequency_per_week: number;
  auto_publish: boolean;
  keywords: string[];
  last_generated_at: string | null;
  is_active: boolean;
}

export default function AutomationScheduler() {
  const [schedules, setSchedules] = useState<ScheduleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('content_schedule')
        .select('*')
        .order('content_type');

      if (error) throw error;
      setSchedules(data || []);
    } catch (err) {
      console.error('Error loading schedules:', err);
      setError('Erreur de chargement des planifications');
    } finally {
      setLoading(false);
    }
  };

  const updateSchedule = async (id: string, updates: Partial<ScheduleConfig>) => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('content_schedule')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setSuccess('Configuration mise à jour !');
      await loadSchedules();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating schedule:', err);
      setError('Erreur de mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = (schedule: ScheduleConfig) => {
    updateSchedule(schedule.id, { is_active: !schedule.is_active });
  };

  const updateFrequency = (schedule: ScheduleConfig, frequency: number) => {
    updateSchedule(schedule.id, { frequency_per_week: frequency });
  };

  const toggleAutoPublish = (schedule: ScheduleConfig) => {
    updateSchedule(schedule.id, { auto_publish: !schedule.auto_publish });
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'blog':
        return 'Articles de Blog';
      case 'faq':
        return 'Questions/Réponses FAQ';
      case 'review':
        return 'Avis Clients';
      default:
        return type;
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'blog':
        return FileText;
      case 'faq':
        return HelpCircle;
      case 'review':
        return TrendingUp;
      default:
        return FileText;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center space-x-3 mb-2">
          <Zap size={32} className="animate-pulse" />
          <h2 className="text-2xl font-bold">Planification Automatique</h2>
        </div>
        <p className="text-indigo-100">
          Configurez la génération automatique de contenu SEO chaque semaine
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <div className="space-y-4">
        {schedules.map((schedule) => {
          const Icon = getContentTypeIcon(schedule.content_type);

          return (
            <div
              key={schedule.id}
              className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-100 hover:border-purple-200 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg ${schedule.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Icon size={24} className={schedule.is_active ? 'text-green-600' : 'text-gray-600'} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{getContentTypeLabel(schedule.content_type)}</h3>
                    <p className="text-sm text-gray-600">
                      {schedule.keywords.slice(0, 3).join(', ')}
                      {schedule.keywords.length > 3 && '...'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => toggleActive(schedule)}
                  disabled={saving}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                    schedule.is_active
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {schedule.is_active ? <Pause size={18} /> : <Play size={18} />}
                  <span>{schedule.is_active ? 'Actif' : 'Inactif'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock size={16} className="inline mr-1" />
                    Fréquence par semaine
                  </label>
                  <select
                    value={schedule.frequency_per_week}
                    onChange={(e) => updateFrequency(schedule, parseInt(e.target.value))}
                    disabled={saving || !schedule.is_active}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
                  >
                    <option value={1}>1 fois / semaine</option>
                    <option value={2}>2 fois / semaine</option>
                    <option value={3}>3 fois / semaine</option>
                    <option value={5}>5 fois / semaine</option>
                    <option value={7}>Tous les jours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Settings size={16} className="inline mr-1" />
                    Mode de publication
                  </label>
                  <button
                    onClick={() => toggleAutoPublish(schedule)}
                    disabled={saving || !schedule.is_active}
                    className={`w-full px-4 py-2 rounded-lg border-2 transition-colors font-medium disabled:opacity-50 ${
                      schedule.auto_publish
                        ? 'bg-purple-50 border-purple-500 text-purple-700'
                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {schedule.auto_publish ? '✅ Publication automatique' : '📝 Enregistrer en brouillon'}
                  </button>
                </div>
              </div>

              {schedule.last_generated_at && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <Calendar size={14} className="inline mr-1" />
                    Dernier contenu généré : {new Date(schedule.last_generated_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 bg-blue-50 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
          <Zap size={20} className="mr-2 text-blue-600" />
          Comment ça marche ?
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ <strong>Génération automatique</strong> : Le contenu est créé automatiquement selon la fréquence configurée</li>
          <li>✅ <strong>Publication intelligente</strong> : Choisissez entre publication immédiate ou brouillon pour relecture</li>
          <li>✅ <strong>Mots-clés optimisés</strong> : Utilise les mots-clés configurés pour un SEO optimal</li>
          <li>✅ <strong>Planification flexible</strong> : Activez/désactivez la génération selon vos besoins</li>
        </ul>
      </div>
    </div>
  );
}
