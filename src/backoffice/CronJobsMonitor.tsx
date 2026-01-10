import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, CheckCircle, XCircle, Clock, Zap, Activity } from 'lucide-react';
import BackButton from './BackButton';

interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  command: string;
}

interface CronStats {
  total: number;
  active: number;
  inactive: number;
}

export default function CronJobsMonitor() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [stats, setStats] = useState<CronStats>({ total: 0, active: 0, inactive: 0 });
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

  useEffect(() => {
    loadCronJobs();
  }, []);

  const loadCronJobs = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_cron_jobs_stats');

      if (error) {
        console.error('Error loading cron jobs:', error);
        const { data: jobsData } = await supabase
          .from('cron.job')
          .select('*')
          .order('jobname');

        if (jobsData) {
          setJobs(jobsData);
          const total = jobsData.length;
          const active = jobsData.filter((j: CronJob) => j.active).length;
          setStats({ total, active, inactive: total - active });
        }
      } else if (data) {
        setJobs(data.jobs || []);
        setStats(data.stats || { total: 0, active: 0, inactive: 0 });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (filter === 'active') return job.active;
    if (filter === 'inactive') return !job.active;
    return true;
  });

  const getCategoryFromName = (name: string): string => {
    if (name.includes('email') || name.includes('inbox') || name.includes('brevo')) return 'email';
    if (name.includes('ai') || name.includes('master')) return 'ai';
    if (name.includes('blog') || name.includes('city') || name.includes('seo')) return 'seo';
    if (name.includes('social') || name.includes('news')) return 'content';
    if (name.includes('backup') || name.includes('cleanup')) return 'maintenance';
    return 'other';
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      email: 'bg-blue-900/50 text-blue-300',
      ai: 'bg-purple-900/50 text-purple-300',
      seo: 'bg-green-900/50 text-green-300',
      content: 'bg-orange-900/50 text-orange-300',
      maintenance: 'bg-gray-900/50 text-gray-300',
      other: 'bg-slate-900/50 text-slate-300'
    };
    return colors[category] || colors.other;
  };

  const formatSchedule = (schedule: string): string => {
    const patterns: Record<string, string> = {
      '*/5 * * * *': 'Toutes les 5 minutes',
      '*/10 * * * *': 'Toutes les 10 minutes',
      '*/15 * * * *': 'Toutes les 15 minutes',
      '*/30 * * * *': 'Toutes les 30 minutes',
      '0 * * * *': 'Toutes les heures',
      '0 */2 * * *': 'Toutes les 2 heures',
      '0 */3 * * *': 'Toutes les 3 heures',
      '0 */6 * * *': 'Toutes les 6 heures',
      '0 0 * * *': 'Tous les jours à minuit',
      '0 9 * * *': 'Tous les jours à 9h',
      '0 18 * * *': 'Tous les jours à 18h'
    };
    return patterns[schedule] || schedule;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white flex items-center gap-3">
          <RefreshCw className="animate-spin" size={24} />
          Chargement des automatisations...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <BackButton />

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-3 flex items-center gap-3">
            <Activity className="text-blue-400" />
            Automatisations Système
          </h1>
          <p className="text-slate-300 text-lg">
            {stats.active} automatisations actives sur {stats.total} configurées
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="text-blue-400" size={24} />
              <span className="text-slate-400 text-sm">Total</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
          </div>

          <div className="bg-green-900/20 backdrop-blur-sm border border-green-800/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="text-green-400" size={24} />
              <span className="text-green-200 text-sm">Actives</span>
            </div>
            <div className="text-3xl font-bold text-green-300">{stats.active}</div>
          </div>

          <div className="bg-red-900/20 backdrop-blur-sm border border-red-800/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="text-red-400" size={24} />
              <span className="text-red-200 text-sm">Inactives</span>
            </div>
            <div className="text-3xl font-bold text-red-300">{stats.inactive}</div>
          </div>

          <div className="bg-purple-900/20 backdrop-blur-sm border border-purple-800/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-purple-400" size={24} />
              <span className="text-purple-200 text-sm">Taux d'activation</span>
            </div>
            <div className="text-3xl font-bold text-purple-300">
              {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Liste des automatisations</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Toutes ({stats.total})
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  filter === 'active'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Actives ({stats.active})
              </button>
              <button
                onClick={() => setFilter('inactive')}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  filter === 'inactive'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Inactives ({stats.inactive})
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredJobs.map((job) => {
              const category = getCategoryFromName(job.jobname);
              const categoryColor = getCategoryColor(category);

              return (
                <div
                  key={job.jobid}
                  className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-medium">{job.jobname}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${categoryColor}`}>
                          {category}
                        </span>
                        {job.active ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-900/50 text-green-300 flex items-center gap-1">
                            <CheckCircle size={12} />
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-900/50 text-red-300 flex items-center gap-1">
                            <XCircle size={12} />
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400 flex items-center gap-2">
                        <Clock size={14} />
                        {formatSchedule(job.schedule)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredJobs.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              Aucune automatisation trouvée
            </div>
          )}
        </div>

        <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-3">
            💡 À propos des automatisations
          </h3>
          <ul className="text-sm text-blue-200 space-y-2">
            <li>• Les automatisations s'exécutent automatiquement selon leur planning</li>
            <li>• Synchronisation emails : Toutes les heures</li>
            <li>• Génération de contenu : Toutes les 3 heures</li>
            <li>• Publication sociale : Quotidiennement</li>
            <li>• Backup : Tous les jours à minuit</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
