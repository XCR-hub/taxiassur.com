import React, { useEffect, useState } from 'react';
import { Mail, MessageSquare, Plus, Edit, Trash2, Copy, TrendingUp } from 'lucide-react';
import { templatesService, SmartTemplate, CommunicationChannel } from '@/lib/crm-templates';
import BackButton from './BackButton';

const CRMTemplatesManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<SmartTemplate[]>([]);
  const [abTests, setABTests] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<SmartTemplate | null>(null);
  const [channelFilter, setChannelFilter] = useState<CommunicationChannel | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<SmartTemplate['category'] | 'all'>('all');

  useEffect(() => {
    loadTemplates();
    loadABTests();
  }, [channelFilter, categoryFilter]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (channelFilter !== 'all') filters.channel = channelFilter;
      if (categoryFilter !== 'all') filters.category = categoryFilter;

      const data = await templatesService.getTemplates(filters);
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadABTests = async () => {
    try {
      const data = await templatesService.getABTests('running');
      setABTests(data);
    } catch (error) {
      console.error('Failed to load A/B tests:', error);
    }
  };

  const handleCloneTemplate = async (templateId: string) => {
    const newName = prompt('Nom du nouveau template:');
    if (!newName) return;

    try {
      await templatesService.cloneTemplate(templateId, newName);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to clone template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce template ?')) return;

    try {
      await templatesService.deleteTemplate(templateId);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const CATEGORIES = [
    { value: 'all', label: 'Toutes' },
    { value: 'sales', label: 'Ventes' },
    { value: 'support', label: 'Support' },
    { value: 'retention', label: 'Rétention' },
    { value: 'onboarding', label: 'Onboarding' },
    { value: 'renewal', label: 'Renouvellement' },
    { value: 'recovery', label: 'Récupération' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto animate-pulse">
          <div className="h-32 bg-gray-200 rounded-xl mb-6"></div>
          <div className="grid grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <BackButton />
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">Manager de Templates</h1>
              <p className="text-indigo-100">Templates multicanaux intelligents et A/B Testing</p>
            </div>
            <button className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2">
              <Plus size={20} />
              Nouveau Template
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {(['all', 'email', 'sms', 'whatsapp'] as const).map((channel) => (
                <button
                  key={channel}
                  onClick={() => setChannelFilter(channel)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    channelFilter === channel
                      ? 'bg-white text-indigo-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {channel === 'all' ? 'Tous' : channel}
                </button>
              ))}
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value} className="text-gray-900">
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {abTests.length > 0 && (
          <div className="mb-8 bg-white rounded-xl border-2 border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="text-green-600" size={28} />
              Tests A/B en Cours
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {abTests.map((test) => (
                <div key={test.id} className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                  <h3 className="font-bold text-green-900 mb-3">{test.name}</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-green-700 font-semibold mb-1">Variante A</div>
                      <div className="text-green-600">Open: {Math.round(test.results.variant_a.open_rate * 100)}%</div>
                      <div className="text-green-600">Reply: {Math.round(test.results.variant_a.reply_rate * 100)}%</div>
                    </div>
                    <div>
                      <div className="text-green-700 font-semibold mb-1">Variante B</div>
                      <div className="text-green-600">Open: {Math.round(test.results.variant_b.open_rate * 100)}%</div>
                      <div className="text-green-600">Reply: {Math.round(test.results.variant_b.reply_rate * 100)}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-indigo-300 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{template.name}</h3>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTemplate(template)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleCloneTemplate(template.id)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  template.channel === 'email' ? 'bg-blue-100 text-blue-700' :
                  template.channel === 'sms' ? 'bg-green-100 text-green-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {template.channel}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {template.category}
                </span>
                {template.ai_personalization_enabled && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-700">
                    IA
                  </span>
                )}
              </div>

              {template.subject && (
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">Sujet:</div>
                  <div className="text-sm text-gray-900 font-medium truncate">{template.subject}</div>
                </div>
              )}

              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-1">Corps:</div>
                <div className="text-sm text-gray-700 line-clamp-3">{template.body}</div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{template.performance.sent_count}</div>
                  <div className="text-xs text-gray-600">Envois</div>
                </div>
                {template.performance.open_rate !== undefined && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {Math.round(template.performance.open_rate * 100)}%
                    </div>
                    <div className="text-xs text-gray-600">Ouverture</div>
                  </div>
                )}
                {template.performance.reply_rate !== undefined && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">
                      {Math.round(template.performance.reply_rate * 100)}%
                    </div>
                    <div className="text-xs text-gray-600">Réponse</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            Aucun template trouvé
          </div>
        )}
      </div>

      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Éditer Template</h2>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={selectedTemplate.name}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {selectedTemplate.subject && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
                  <input
                    type="text"
                    value={selectedTemplate.subject}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Corps</label>
                <textarea
                  value={selectedTemplate.body}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
                <button className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMTemplatesManager;
