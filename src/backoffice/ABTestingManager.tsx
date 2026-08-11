import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Beaker, Play, CheckCircle, TrendingUp, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/lib/toast';

interface ABTest {
  id: string;
  name: string;
  description: string;
  variant_a_subject: string;
  variant_b_subject: string;
  variant_a_content: string;
  variant_b_content: string;
  sample_size: number;
  winner_variant: string | null;
  status: 'draft' | 'running' | 'completed' | 'paused';
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

interface TestStats {
  variant_a_sent: number;
  variant_b_sent: number;
  variant_a_opens: number;
  variant_b_opens: number;
  variant_a_clicks: number;
  variant_b_clicks: number;
}

export default function ABTestingManager() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [stats, setStats] = useState<Record<string, TestStats>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    variant_a_subject: '',
    variant_b_subject: '',
    variant_a_content: '',
    variant_b_content: '',
    sample_size: 100
  });

  useEffect(() => {
    loadTests();
    const interval = setInterval(loadTests, 30000); // Refresh toutes les 30s
    return () => clearInterval(interval);
  }, []);

  const loadTests = async () => {
    const { data } = await supabase
      .from('email_ab_tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setTests(data);
      await loadStats(data);
    }
    setLoading(false);
  };

  const loadStats = async (tests: ABTest[]) => {
    const newStats: Record<string, TestStats> = {};

    for (const test of tests) {
      const { data: variants } = await supabase
        .from('email_ab_variants')
        .select('variant, email_send_id')
        .eq('ab_test_id', test.id);

      let variant_a_sent = 0;
      let variant_b_sent = 0;
      let variant_a_opens = 0;
      let variant_b_opens = 0;
      let variant_a_clicks = 0;
      let variant_b_clicks = 0;

      if (variants) {
        for (const variant of variants) {
          if (variant.variant === 'A') variant_a_sent++;
          else variant_b_sent++;

          const { count: opens } = await supabase
            .from('email_opens')
            .select('*', { count: 'exact', head: true })
            .eq('email_send_id', variant.email_send_id);

          const { count: clicks } = await supabase
            .from('email_clicks')
            .select('*', { count: 'exact', head: true })
            .eq('email_send_id', variant.email_send_id);

          if (variant.variant === 'A') {
            variant_a_opens += opens || 0;
            variant_a_clicks += clicks || 0;
          } else {
            variant_b_opens += opens || 0;
            variant_b_clicks += clicks || 0;
          }
        }
      }

      newStats[test.id] = {
        variant_a_sent,
        variant_b_sent,
        variant_a_opens,
        variant_b_opens,
        variant_a_clicks,
        variant_b_clicks
      };
    }

    setStats(newStats);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from('email_ab_tests')
      .insert([{ ...formData, status: 'draft' }]);

    if (!error) {
      toast.success('Test A/B créé ! Vous pouvez maintenant le lancer.');
      setFormData({
        name: '',
        description: '',
        variant_a_subject: '',
        variant_b_subject: '',
        variant_a_content: '',
        variant_b_content: '',
        sample_size: 100
      });
      setShowCreateForm(false);
      loadTests();
    } else {
      toast.error('Erreur : ' + error.message);
    }
  };

  const handleLaunch = async (testId: string) => {
    if (!confirm('Lancer ce test A/B maintenant ?')) return;

    try {
      const response = await supabase.functions.invoke('send-ab-test-email', {
        body: { ab_test_id: testId }
      });

      if (response.data?.success) {
        toast.success(`✅ Test lancé ! ${response.data.sent_a} variante A, ${response.data.sent_b} variante B envoyés.`);
        loadTests();
      } else {
        toast.error('Erreur lors du lancement : ' + (response.error?.message || 'Erreur inconnue'));
      }
    } catch (error) {
      toast.error('Erreur : ' + error.message);
    }
  };

  const handleComplete = async (testId: string, winner: string) => {
    const { error } = await supabase
      .from('email_ab_tests')
      .update({
        status: 'completed',
        winner_variant: winner,
        ended_at: new Date().toISOString()
      })
      .eq('id', testId);

    if (!error) {
      toast.success(`Test terminé ! Variante ${winner} déclarée gagnante.`);
      loadTests();
    }
  };

  const handleDelete = async (testId: string) => {
    if (!confirm('Supprimer ce test ? Cette action est irréversible.')) return;

    const { error } = await supabase
      .from('email_ab_tests')
      .delete()
      .eq('id', testId);

    if (!error) {
      toast.success('Test supprimé !');
      loadTests();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'running': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'running': return 'En cours';
      case 'completed': return 'Terminé';
      case 'paused': return 'En pause';
      default: return status;
    }
  };

  const calculateRate = (count: number, total: number) => {
    return total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Beaker className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Tests A/B</h1>
            </div>
            <p className="text-blue-100">Testez et optimisez vos emails automatiquement</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouveau Test A/B
          </button>
        </div>
      </div>

      {/* Formulaire création */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Créer un Test A/B</h2>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du test</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600"
                  placeholder="Test sujet - Janvier 2026"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taille échantillon</label>
                <input
                  type="number"
                  value={formData.sample_size}
                  onChange={(e) => setFormData({ ...formData, sample_size: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600"
                  min="10"
                  max="1000"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600"
                placeholder="Test pour améliorer le taux d'ouverture"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Variante A */}
              <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                <h3 className="font-bold text-blue-900 mb-3">🅰️ Variante A</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
                    <input
                      type="text"
                      value={formData.variant_a_subject}
                      onChange={(e) => setFormData({ ...formData, variant_a_subject: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Votre devis taxi est prêt"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contenu HTML</label>
                    <textarea
                      value={formData.variant_a_content}
                      onChange={(e) => setFormData({ ...formData, variant_a_content: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={6}
                      placeholder="<p>Bonjour,</p><p>Votre devis...</p>"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Variante B */}
              <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                <h3 className="font-bold text-purple-900 mb-3">🅱️ Variante B</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
                    <input
                      type="text"
                      value={formData.variant_b_subject}
                      onChange={(e) => setFormData({ ...formData, variant_b_subject: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Économisez sur votre assurance taxi"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contenu HTML</label>
                    <textarea
                      value={formData.variant_b_content}
                      onChange={(e) => setFormData({ ...formData, variant_b_content: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={6}
                      placeholder="<p>Bonjour,</p><p>Économisez jusqu'à...</p>"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Créer le Test
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des tests */}
      <div className="grid grid-cols-1 gap-6">
        {tests.map((test) => {
          const testStats = stats[test.id] || {
            variant_a_sent: 0,
            variant_b_sent: 0,
            variant_a_opens: 0,
            variant_b_opens: 0,
            variant_a_clicks: 0,
            variant_b_clicks: 0
          };

          const rateA = calculateRate(testStats.variant_a_opens, testStats.variant_a_sent);
          const rateB = calculateRate(testStats.variant_b_opens, testStats.variant_b_sent);
          const winner = parseFloat(rateA) > parseFloat(rateB) ? 'A' : 'B';

          return (
            <div key={test.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{test.name}</h3>
                    <span className={`px-3 py-1 text-xs rounded-full font-semibold ${getStatusColor(test.status)}`}>
                      {getStatusLabel(test.status)}
                    </span>
                    {test.winner_variant && (
                      <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 font-semibold">
                        🏆 Gagnant : {test.winner_variant}
                      </span>
                    )}
                  </div>
                  {test.description && (
                    <p className="text-sm text-gray-600 mb-2">{test.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Échantillon : {test.sample_size} leads</span>
                    {test.started_at && (
                      <span>Démarré : {new Date(test.started_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {test.status === 'draft' && (
                    <button
                      onClick={() => handleLaunch(test.id)}
                      className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition"
                      title="Lancer le test"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                  )}
                  {test.status === 'running' && (
                    <button
                      onClick={() => handleComplete(test.id, winner)}
                      className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition"
                      title="Terminer le test"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(test.id)}
                    className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition"
                    title="Supprimer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Statistiques */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Variante A */}
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-blue-900">🅰️ Variante A</h4>
                    {test.winner_variant === 'A' && <span className="text-2xl">🏆</span>}
                  </div>
                  <p className="text-sm text-gray-700 mb-2 font-medium">{test.variant_a_subject}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Envoyés:</span>
                      <span className="font-semibold text-blue-700">{testStats.variant_a_sent}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Ouvertures:</span>
                      <span className="font-semibold text-blue-700">{testStats.variant_a_opens} ({rateA}%)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Clics:</span>
                      <span className="font-semibold text-blue-700">{testStats.variant_a_clicks}</span>
                    </div>
                  </div>
                </div>

                {/* Variante B */}
                <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-purple-900">🅱️ Variante B</h4>
                    {test.winner_variant === 'B' && <span className="text-2xl">🏆</span>}
                  </div>
                  <p className="text-sm text-gray-700 mb-2 font-medium">{test.variant_b_subject}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Envoyés:</span>
                      <span className="font-semibold text-purple-700">{testStats.variant_b_sent}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Ouvertures:</span>
                      <span className="font-semibold text-purple-700">{testStats.variant_b_opens} ({rateB}%)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Clics:</span>
                      <span className="font-semibold text-purple-700">{testStats.variant_b_clicks}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Indicateur gagnant */}
              {test.status === 'running' && testStats.variant_a_sent > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-yellow-700" />
                    <span className="text-sm text-yellow-900">
                      <strong>Gagnant actuel:</strong> Variante {winner} avec {winner === 'A' ? rateA : rateB}% d'ouverture
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {tests.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Beaker className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun test A/B</h3>
          <p className="text-gray-600 mb-6">Créez votre premier test pour optimiser vos emails</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Créer un Test A/B
          </button>
        </div>
      )}
    </div>
  );
}
