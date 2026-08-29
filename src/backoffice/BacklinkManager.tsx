import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link, Plus, ExternalLink, CheckCircle, XCircle, Clock, Home } from 'lucide-react';
import { getBacklinks, addBacklink, verifyStoredBacklink, type Backlink } from '../lib/backlinks';
import Card from '../components/Card';
import { logger } from '@/lib/logger';
import { toast } from '@/lib/toast';

const BacklinkManager: React.FC = () => {
  const navigate = useNavigate();
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    url: '',
    domain: '',
    anchorText: '',
    type: 'directory' as const,
    status: 'pending' as const,
    notes: '',
    tags: ''
  });

  useEffect(() => {
    loadBacklinks();
  }, []);

  const loadBacklinks = async () => {
    setLoading(true);
    try {
      const data = await getBacklinks();
      setBacklinks(data);
    } catch (error) {
      logger.error('Failed to load backlinks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const success = await addBacklink({
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      });

      if (success) {
        setShowAddForm(false);
        setFormData({
          url: '',
          domain: '',
          anchorText: '',
          type: 'directory',
          status: 'pending',
          notes: '',
          tags: ''
        });
        loadBacklinks();
        toast.success('Backlink ajouté avec succès !');
      } else {
        toast.error('Erreur lors de l\'ajout du backlink');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    }
  };

  const handleVerifyBacklink = async (backlink: Backlink) => {
    setVerifying(backlink.id);
    try {
      const result = await verifyStoredBacklink(backlink.id);
      await loadBacklinks();
      // Ici on pourrait mettre à jour le statut du backlink
      toast.info(result.exists ? 'Backlink vérifié ✓' : 'Backlink non trouvé ✗');
    } catch (error) {
      toast.error('Erreur lors de la vérification');
    } finally {
      setVerifying(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="text-green-600" size={16} />;
      case 'lost':
        return <XCircle className="text-red-600" size={16} />;
      case 'pending':
        return <Clock className="text-yellow-600" size={16} />;
      default:
        return <Clock className="text-gray-600" size={16} />;
    }
  };

  const getTypeColor = (type: string) => {
    const colors = {
      directory: 'bg-orange-100 text-orange-800',
      partnership: 'bg-green-100 text-green-800',
      'guest-post': 'bg-orange-100 text-orange-800',
      forum: 'bg-orange-100 text-orange-800',
      social: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-8"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    
      <div className="min-h-screen bg-gray-50 p-8">
      {/* Header with Home Button */}
      <header className="bg-white border-b-2 border-gray-200 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <Link className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Gestion des Backlinks
                </h1>
                <p className="text-sm text-gray-600">
                  Suivi et gestion de vos liens entrants
                </p>
              </div>
            </div>
            
            <button onClick={() => navigate("/backoffice/crm-commercial")} className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center space-x-2">
              <Home size={16} />
              <span>Accueil CRM</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span>Ajouter Backlink</span>
          </button>
        </div>

        {/* Add Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Ajouter un Backlink
                </h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-600 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL *
                    </label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com/page"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Domaine *
                    </label>
                    <input
                      type="text"
                      value={formData.domain}
                      onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Texte d'ancrage *
                  </label>
                  <input
                    type="text"
                    value={formData.anchorText}
                    onChange={(e) => setFormData(prev => ({ ...prev, anchorText: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="assurance taxi"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="directory">Annuaire</option>
                      <option value="partnership">Partenariat</option>
                      <option value="guest-post">Article invité</option>
                      <option value="forum">Forum</option>
                      <option value="social">Réseau social</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Statut
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="pending">En attente</option>
                      <option value="active">Actif</option>
                      <option value="lost">Perdu</option>
                      <option value="nofollow">Nofollow</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="seo, annuaire, taxi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Notes sur ce backlink..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                  >
                    Ajouter
                  </button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Backlinks List */}
        <div className="space-y-4">
          {backlinks.map(backlink => (
            <Card key={backlink.id} hover>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Link className="text-orange-600" size={16} />
                    <a
                      href={backlink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:text-orange-800 font-medium"
                    >
                      {backlink.domain}
                    </a>
                    <ExternalLink size={14} className="text-gray-600" />
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>"{backlink.anchorText}"</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(backlink.type)}`}>
                      {backlink.type}
                    </span>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(backlink.status)}
                      <span className="capitalize">{backlink.status}</span>
                    </div>
                  </div>

                  {backlink.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {backlink.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleVerifyBacklink(backlink)}
                    disabled={verifying === backlink.id}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors disabled:opacity-50"
                  >
                    {verifying === backlink.id ? 'Vérification...' : 'Vérifier'}
                  </button>
                </div>
              </div>

              {backlink.notes && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{backlink.notes}</p>
                </div>
              )}
            </Card>
          ))}
        </div>

        {backlinks.length === 0 && (
          <Card className="text-center py-12">
            <Link className="mx-auto mb-4 text-gray-600" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun backlink enregistré
            </h3>
            <p className="text-gray-600 mb-4">
              Commencez par ajouter vos premiers backlinks pour suivre votre stratégie SEO.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Ajouter le premier backlink
            </button>
          </Card>
        )}
      </div>
      </div>
    
  );
};

export default BacklinkManager;
