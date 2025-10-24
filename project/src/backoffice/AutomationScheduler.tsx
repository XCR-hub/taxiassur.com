import { useState, useEffect } from 'react';
import { Calendar, Clock, Zap, Play, Pause, Settings, TrendingUp, FileText, HelpCircle, BarChart3, RefreshCw, Eye, Hash, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
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

interface ContentStats {
  total: number;
  published: number;
  draft: number;
  lastWeek: number;
}

interface RecentContent {
  id: string;
  title: string;
  type: string;
  published: boolean;
  created_at: string;
}

export default function AutomationScheduler() {
  const [schedules, setSchedules] = useState<ScheduleConfig[]>([]);
  const [stats, setStats] = useState<ContentStats>({ total: 0, published: 0, draft: 0, lastWeek: 0 });
  const [recentContent, setRecentContent] = useState<RecentContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleConfig | null>(null);
  const [showKeywordsModal, setShowKeywordsModal] = useState(false);
  const [newKeywords, setNewKeywords] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadSchedules(),
      loadStats(),
      loadRecentContent()
    ]);
    setLoading(false);
  };

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
    }
  };

  const loadStats = async () => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const [blogData, faqData] = await Promise.all([
        supabase.from('blog_posts').select('id, published, created_at'),
        supabase.from('faq').select('id, published, created_at')
      ]);

      const allContent = [
        ...(blogData.data || []),
        ...(faqData.data || [])
      ];

      const stats = {
        total: allContent.length,
        published: allContent.filter(c => c.published).length,
        draft: allContent.filter(c => !c.published).length,
        lastWeek: allContent.filter(c => new Date(c.created_at) > oneWeekAgo).length
      };

      setStats(stats);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadRecentContent = async () => {
    try {
      const { data: blogData } = await supabase
        .from('blog_posts')
        .select('id, title, published, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: faqData } = await supabase
        .from('faq')
        .select('id, question, published, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const recent: RecentContent[] = [
        ...(blogData || []).map(b => ({ ...b, title: b.title, type: 'blog' })),
        ...(faqData || []).map(f => ({ ...f, title: f.question, type: 'faq' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      setRecentContent(recent);
    } catch (err) {
      console.error('Error loading recent content:', err);
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

  const generateNow = async (schedule: ScheduleConfig) => {
    setGenerating(schedule.id);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase.functions.invoke('generate-seo-content', {
        body: {
          content_type: schedule.content_type,
          auto_publish: schedule.auto_publish,
          keywords: schedule.keywords
        }
      });

      if (error) throw error;

      setSuccess(`Contenu ${schedule.content_type} généré avec succès !`);
      await loadAllData();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error generating content:', err);
      setError('Erreur lors de la génération');
    } finally {
      setGenerating(null);
    }
  };

  const openKeywordsModal = (schedule: ScheduleConfig) => {
    setSelectedSchedule(schedule);
    setNewKeywords(schedule.keywords.join(', '));
    setShowKeywordsModal(true);
  };

  const saveKeywords = async () => {
    if (!selectedSchedule) return;

    const keywords = newKeywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    await updateSchedule(selectedSchedule.id, { keywords });
    setShowKeywordsModal(false);
    setSelectedSchedule(null);
  };

  const getNextRunDate = (schedule: ScheduleConfig) => {
    if (!schedule.is_active) return null;

    const daysUntilNext = Math.ceil(7 / schedule.frequency_per_week);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + daysUntilNext);

    return nextDate;
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Zap size={32} className="animate-pulse" />
              <h2 className="text-2xl font-bold">Planification Automatique</h2>
            </div>
            <p className="text-yellow-100">
              Configurez la génération automatique de contenu SEO chaque semaine
            </p>
          </div>
          <button
            onClick={() => loadAllData()}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center space-x-2"
          >
            <RefreshCw size={18} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Contenu</p>
              <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
            </div>
            <BarChart3 size={32} className="text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Publiés</p>
              <p className="text-3xl font-bold text-gray-800">{stats.published}</p>
            </div>
            <CheckCircle size={32} className="text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Brouillons</p>
              <p className="text-3xl font-bold text-gray-800">{stats.draft}</p>
            </div>
            <FileText size={32} className="text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Cette Semaine</p>
              <p className="text-3xl font-bold text-gray-800">{stats.lastWeek}</p>
            </div>
            <TrendingUp size={32} className="text-orange-500" />
          </div>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Planifications */}
        <div className="lg:col-span-2 space-y-4">
        {schedules.map((schedule) => {
          const Icon = getContentTypeIcon(schedule.content_type);

          return (
            <div
              key={schedule.id}
              className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-100 hover:border-orange-200 transition-colors"
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

                <div className="flex items-center space-x-2">
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
                        ? 'bg-orange-50 border-orange-500 text-orange-700'
                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {schedule.auto_publish ? '✅ Publication automatique' : '📝 Enregistrer en brouillon'}
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                {schedule.last_generated_at && (
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
                )}

                {schedule.is_active && getNextRunDate(schedule) && (
                  <p className="text-sm text-orange-600 font-medium">
                    <Sparkles size={14} className="inline mr-1" />
                    Prochain : {getNextRunDate(schedule)!.toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => generateNow(schedule)}
                    disabled={!schedule.is_active || generating === schedule.id}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
                  >
                    {generating === schedule.id ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Génération...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        <span>Générer maintenant</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => openKeywordsModal(schedule)}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Hash size={16} />
                    <span>Mots-clés</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        </div>

        {/* Contenu Récent */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Clock size={20} className="mr-2 text-orange-600" />
              Contenu Récent
            </h3>

            {recentContent.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-8">
                Aucun contenu généré récemment
              </p>
            ) : (
              <div className="space-y-3">
                {recentContent.map((content) => (
                  <div
                    key={content.id}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            content.type === 'blog'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {content.type === 'blog' ? '📝 Blog' : '❓ FAQ'}
                          </span>
                          {content.published ? (
                            <CheckCircle size={14} className="text-green-600" />
                          ) : (
                            <AlertCircle size={14} className="text-yellow-600" />
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-800 line-clamp-2">
                          {content.title}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(content.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prochaines Générations */}
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl shadow-lg p-6 border border-orange-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Calendar size={20} className="mr-2 text-orange-600" />
              Prochaines Générations
            </h3>

            <div className="space-y-3">
              {schedules
                .filter(s => s.is_active)
                .map((schedule) => {
                  const nextDate = getNextRunDate(schedule);
                  if (!nextDate) return null;

                  return (
                    <div
                      key={schedule.id}
                      className="p-3 bg-white rounded-lg border border-orange-200"
                    >
                      <p className="text-sm font-medium text-gray-800 mb-1">
                        {getContentTypeLabel(schedule.content_type)}
                      </p>
                      <p className="text-xs text-orange-600 font-medium">
                        {nextDate.toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  );
                })
              }
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-orange-50 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
          <Zap size={20} className="mr-2 text-orange-600" />
          Comment ça marche ?
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ <strong>Génération automatique</strong> : Le contenu est créé automatiquement selon la fréquence configurée</li>
          <li>✅ <strong>Publication intelligente</strong> : Choisissez entre publication immédiate ou brouillon pour relecture</li>
          <li>✅ <strong>Mots-clés optimisés</strong> : Utilise les mots-clés configurés pour un SEO optimal</li>
          <li>✅ <strong>Planification flexible</strong> : Activez/désactivez la génération selon vos besoins</li>
          <li>✅ <strong>Statistiques en temps réel</strong> : Suivez la performance de vos automatisations</li>
          <li>✅ <strong>Actions rapides</strong> : Générez du contenu à la demande en un clic</li>
        </ul>
      </div>

      {/* Modal Mots-clés */}
      {showKeywordsModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Hash size={24} className="mr-2 text-orange-600" />
              Gérer les Mots-clés - {getContentTypeLabel(selectedSchedule.content_type)}
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              Séparez les mots-clés par des virgules. Ces mots-clés seront utilisés pour optimiser le contenu généré automatiquement.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mots-clés SEO
              </label>
              <textarea
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="assurance taxi, taxi professionnel, RC taxi..."
              />
              <p className="text-xs text-gray-500 mt-1">
                {newKeywords.split(',').filter(k => k.trim()).length} mot(s)-clé(s)
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={saveKeywords}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all disabled:opacity-50 font-medium"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button
                onClick={() => {
                  setShowKeywordsModal(false);
                  setSelectedSchedule(null);
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
