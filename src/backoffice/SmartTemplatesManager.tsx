import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Plus, Edit2, Trash2, Send, TrendingUp } from 'lucide-react';

interface SmartTemplate {
  id: string;
  name: string;
  description: string;
  engagement_level: 'low' | 'medium' | 'high';
  subject_template: string;
  content_template: string;
  usage_count: number;
  success_rate: number;
  is_active: boolean;
}

export default function SmartTemplatesManager() {
  const [templates, setTemplates] = useState<SmartTemplate[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmartTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    engagement_level: 'medium' as 'low' | 'medium' | 'high',
    subject_template: '',
    content_template: ''
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('email_templates_smart')
      .select('*')
      .order('engagement_level', { ascending: true })
      .order('success_rate', { ascending: false });

    if (data) setTemplates(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingTemplate) {
      const { error } = await supabase
        .from('email_templates_smart')
        .update(formData)
        .eq('id', editingTemplate.id);

      if (!error) {
        alert('Template mis à jour !');
        resetForm();
        loadTemplates();
      }
    } else {
      const { error } = await supabase
        .from('email_templates_smart')
        .insert([formData]);

      if (!error) {
        alert('Template créé !');
        resetForm();
        loadTemplates();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      engagement_level: 'medium',
      subject_template: '',
      content_template: ''
    });
    setShowAddForm(false);
    setEditingTemplate(null);
  };

  const handleEdit = (template: SmartTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      engagement_level: template.engagement_level,
      subject_template: template.subject_template,
      content_template: template.content_template
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce template ?')) return;

    const { error } = await supabase
      .from('email_templates_smart')
      .delete()
      .eq('id', id);

    if (!error) {
      alert('Template supprimé !');
      loadTemplates();
    }
  };

  const toggleActive = async (template: SmartTemplate) => {
    const { error } = await supabase
      .from('email_templates_smart')
      .update({ is_active: !template.is_active })
      .eq('id', template.id);

    if (!error) loadTemplates();
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'low': return 'Faible Engagement';
      case 'medium': return 'Engagement Moyen';
      case 'high': return 'Haute Engagement';
      default: return level;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Templates Intelligents</h1>
            </div>
            <p className="text-purple-100">Emails adaptatifs selon l'engagement des leads</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouveau Template
          </button>
        </div>
      </div>

      {/* Formulaire */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {editingTemplate ? 'Modifier le template' : 'Nouveau template'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Niveau d'engagement</label>
              <select
                value={formData.engagement_level}
                onChange={(e) => setFormData({ ...formData, engagement_level: e.target.value as any })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
              >
                <option value="low">Faible Engagement</option>
                <option value="medium">Engagement Moyen</option>
                <option value="high">Haute Engagement</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sujet (utilisez {`{{name}}`} pour personnaliser)
              </label>
              <input
                type="text"
                value={formData.subject_template}
                onChange={(e) => setFormData({ ...formData, subject_template: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
                placeholder="{{name}}, votre devis personnalisé"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contenu HTML (utilisez {`{{name}}`}, {`{{email}}`})
              </label>
              <textarea
                value={formData.content_template}
                onChange={(e) => setFormData({ ...formData, content_template: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
                rows={8}
                placeholder="<p>Bonjour {{name}},</p><p>...</p>"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition font-semibold"
              >
                {editingTemplate ? 'Mettre à jour' : 'Créer'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des templates */}
      <div className="grid grid-cols-1 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
              template.engagement_level === 'high' ? 'border-green-500' :
              template.engagement_level === 'medium' ? 'border-yellow-500' :
              'border-red-500'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
                  <span className={`px-3 py-1 text-xs rounded-full font-semibold ${getLevelColor(template.engagement_level)}`}>
                    {getLevelLabel(template.engagement_level)}
                  </span>
                  {template.is_active ? (
                    <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 font-semibold">
                      Actif
                    </span>
                  ) : (
                    <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                      Inactif
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                <div className="flex items-center gap-6 text-sm text-gray-700">
                  <div className="flex items-center gap-1">
                    <Send className="w-4 h-4" />
                    <span>{template.usage_count} envois</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>{template.success_rate.toFixed(1)}% succès</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleActive(template)}
                  className={`p-2 rounded-lg transition ${
                    template.is_active
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      : 'bg-green-100 hover:bg-green-200 text-green-700'
                  }`}
                  title={template.is_active ? 'Désactiver' : 'Activer'}
                >
                  {template.is_active ? '⏸️' : '▶️'}
                </button>
                <button
                  onClick={() => handleEdit(template)}
                  className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition"
                  title="Modifier"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition"
                  title="Supprimer"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div>
                <p className="text-xs text-gray-500 mb-1">Sujet:</p>
                <p className="text-sm font-medium text-gray-900">{template.subject_template}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Contenu (aperçu):</p>
                <p className="text-sm text-gray-700 line-clamp-2">{template.content_template.replace(/<[^>]*>/g, '')}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
