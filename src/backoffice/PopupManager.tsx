import React, { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit, Trash2, Eye, EyeOff, Copy, Save, X, Monitor, Smartphone, Tablet, Home, TrendingUp, BarChart3 } from 'lucide-react';
import { PopupConfig, PopupConfigSchema, PopupManager } from '../lib/popup';
import Card from '../components/Card';

const PopupManagerBackoffice: React.FC = () => {
  const [popups, setPopups] = useState<PopupConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPopup, setEditingPopup] = useState<PopupConfig | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [analytics, setAnalytics] = useState<Record<string, any>>({});

  useEffect(() => {
    loadPopups();
    loadAnalytics();
  }, []);

  const loadPopups = async () => {
    setLoading(true);
    try {
      const configs = await PopupManager.loadConfigs();
      setPopups(configs);
    } catch (error) {
      console.error('Failed to load popups:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = () => {
    const data = JSON.parse(localStorage.getItem('popup_analytics') || '{}');
    setAnalytics(data);
  };

  const createNewPopup = () => {
    const newPopup: PopupConfig = {
      id: `popup-${Date.now()}`,
      name: 'Nouvelle Popup',
      enabled: false,
      type: 'exit-intent',
      trigger: {
        delay: 5000,
        scrollPercent: 70,
        exitSensitivity: 50
      },
      content: {
        title: 'Attendez ! Ne Partez Pas Sans Votre Devis',
        subtitle: 'Économisez jusqu\'à 35% sur votre assurance taxi',
        description: 'Obtenez votre devis gratuit en 30 secondes. Nos clients économisent en moyenne 580€/an !',
        ctaText: 'Obtenir Mon Devis Gratuit',
        ctaAction: 'form',
        urgencyText: 'Offre limitée aux 50 prochains clients',
        benefits: [
          'Devis 100% gratuit et sans engagement',
          'Réponse garantie sous 15 minutes',
          'Tarifs négociés exclusifs',
          'Courtier agréé ORIAS'
        ]
      },
      design: {
        theme: 'urgent',
        colors: {
          primary: '#ef4444',
          secondary: '#dc2626',
          text: '#ffffff',
          background: '#ffffff'
        },
        animation: 'bounce',
        size: 'md'
      },
      targeting: {
        pages: ['/'],
        devices: ['mobile', 'tablet', 'desktop'],
        newVisitors: true,
        returningVisitors: false,
        excludeConverted: true
      },
      analytics: {
        trackViews: true,
        trackClicks: true,
        trackConversions: true,
        goalValue: 50
      },
      schedule: {
        daysOfWeek: [0,1,2,3,4,5,6],
        hoursRange: { start: 0, end: 23 }
      },
      frequency: {
        maxPerSession: 1,
        maxPerDay: 1,
        cooldownHours: 24
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'Admin',
      status: 'draft'
    };

    setEditingPopup(newPopup);
  };

  const savePopup = async () => {
    if (!editingPopup) return;

    try {
      const updatedPopup = {
        ...editingPopup,
        updatedAt: new Date().toISOString()
      };

      const success = await PopupManager.saveConfig(updatedPopup);
      
      if (success) {
        setPopups(prev => {
          const index = prev.findIndex(p => p.id === updatedPopup.id);
          if (index >= 0) {
            return prev.map((p, i) => i === index ? updatedPopup : p);
          } else {
            return [...prev, updatedPopup];
          }
        });
        
        setEditingPopup(null);
        alert('✅ Popup sauvegardée avec succès !');
      } else {
        alert('❌ Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('❌ Erreur de connexion');
    }
  };

  const togglePopup = async (popupId: string) => {
    const popup = popups.find(p => p.id === popupId);
    if (!popup) return;

    const updatedPopup = {
      ...popup,
      enabled: !popup.enabled,
      status: !popup.enabled ? 'active' : 'paused',
      updatedAt: new Date().toISOString()
    };

    const success = await PopupManager.saveConfig(updatedPopup);
    
    if (success) {
      setPopups(prev => prev.map(p => p.id === popupId ? updatedPopup : p));
    }
  };

  const deletePopup = async (popupId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette popup ?')) return;

    try {
      const response = await fetch('/webhooks/make.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MAKE-SECRET': import.meta.env.VITE_MAKE_SECRET || 'change_me_secure_token_2024'
        },
        body: JSON.stringify({
          type: 'popup',
          action: 'delete',
          payload: { id: popupId }
        })
      });

      if (response.ok) {
        setPopups(prev => prev.filter(p => p.id !== popupId));
        alert('✅ Popup supprimée');
      } else {
        alert('❌ Erreur lors de la suppression');
      }
    } catch (error) {
      alert('❌ Erreur de connexion');
    }
  };

  const duplicatePopup = (popup: PopupConfig) => {
    const duplicated: PopupConfig = {
      ...popup,
      id: `popup-${Date.now()}`,
      name: `${popup.name} (Copie)`,
      enabled: false,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setEditingPopup(duplicated);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'exit-intent': return '🚪';
      case 'time-based': return '⏰';
      case 'scroll-based': return '📜';
      default: return '💬';
    }
  };

  const renderPopupEditor = () => {
    if (!editingPopup) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingPopup.id.startsWith('popup-') && editingPopup.name === 'Nouvelle Popup' ? 'Créer' : 'Modifier'} Popup
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Eye size={16} />
                  <span>{showPreview ? 'Masquer' : 'Aperçu'}</span>
                </button>
                <button
                  onClick={savePopup}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Save size={16} />
                  <span>Sauvegarder</span>
                </button>
                <button
                  onClick={() => setEditingPopup(null)}
                  className="text-gray-600 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Configuration générale */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration Générale</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de la popup
                  </label>
                  <input
                    type="text"
                    value={editingPopup.name}
                    onChange={(e) => setEditingPopup(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de déclenchement
                  </label>
                  <select
                    value={editingPopup.type}
                    onChange={(e) => setEditingPopup(prev => prev ? { ...prev, type: e.target.value as any } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="exit-intent">Exit Intent (sortie de souris)</option>
                    <option value="time-based">Temporisé (après X secondes)</option>
                    <option value="scroll-based">Scroll (après X% de page)</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingPopup.enabled}
                    onChange={(e) => setEditingPopup(prev => prev ? { ...prev, enabled: e.target.checked } : null)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Popup activée</span>
                </label>
              </div>
            </Card>

            {/* Contenu */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contenu de la Popup</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titre principal
                  </label>
                  <input
                    type="text"
                    value={editingPopup.content.title}
                    onChange={(e) => setEditingPopup(prev => prev ? {
                      ...prev,
                      content: { ...prev.content, title: e.target.value }
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sous-titre
                  </label>
                  <input
                    type="text"
                    value={editingPopup.content.subtitle}
                    onChange={(e) => setEditingPopup(prev => prev ? {
                      ...prev,
                      content: { ...prev.content, subtitle: e.target.value }
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editingPopup.content.description}
                    onChange={(e) => setEditingPopup(prev => prev ? {
                      ...prev,
                      content: { ...prev.content, description: e.target.value }
                    } : null)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Texte du bouton
                    </label>
                    <input
                      type="text"
                      value={editingPopup.content.ctaText}
                      onChange={(e) => setEditingPopup(prev => prev ? {
                        ...prev,
                        content: { ...prev.content, ctaText: e.target.value }
                      } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Action du bouton
                    </label>
                    <select
                      value={editingPopup.content.ctaAction}
                      onChange={(e) => setEditingPopup(prev => prev ? {
                        ...prev,
                        content: { ...prev.content, ctaAction: e.target.value as any }
                      } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="form">Aller au formulaire</option>
                      <option value="phone">Appeler</option>
                      <option value="email">Envoyer email</option>
                      <option value="url">Rediriger vers URL</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Texte d'urgence (optionnel)
                  </label>
                  <input
                    type="text"
                    value={editingPopup.content.urgencyText || ''}
                    onChange={(e) => setEditingPopup(prev => prev ? {
                      ...prev,
                      content: { ...prev.content, urgencyText: e.target.value }
                    } : null)}
                    placeholder="Ex: Plus que 5 minutes !"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </Card>

            {/* Design */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Design & Apparence</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thème
                  </label>
                  <select
                    value={editingPopup.design.theme}
                    onChange={(e) => setEditingPopup(prev => prev ? {
                      ...prev,
                      design: { ...prev.design, theme: e.target.value as any }
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="default">Par défaut</option>
                    <option value="urgent">Urgent (rouge)</option>
                    <option value="premium">Premium (or)</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Animation
                  </label>
                  <select
                    value={editingPopup.design.animation}
                    onChange={(e) => setEditingPopup(prev => prev ? {
                      ...prev,
                      design: { ...prev.design, animation: e.target.value as any }
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bounce">Rebond</option>
                    <option value="fade">Fondu</option>
                    <option value="slide">Glissement</option>
                    <option value="zoom">Zoom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Taille
                  </label>
                  <select
                    value={editingPopup.design.size}
                    onChange={(e) => setEditingPopup(prev => prev ? {
                      ...prev,
                      design: { ...prev.design, size: e.target.value as any }
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="sm">Petite</option>
                    <option value="md">Moyenne</option>
                    <option value="lg">Grande</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Ciblage */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ciblage & Déclenchement</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pages (une par ligne, * pour toutes)
                  </label>
                  <textarea
                    value={editingPopup.targeting.pages.join('\n')}
                    onChange={(e) => setEditingPopup(prev => prev ? {
                      ...prev,
                      targeting: { ...prev.targeting, pages: e.target.value.split('\n').filter(Boolean) }
                    } : null)}
                    rows={3}
                    placeholder="/"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appareils ciblés
                  </label>
                  <div className="flex space-x-4">
                    {['mobile', 'tablet', 'desktop'].map(device => (
                      <label key={device} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editingPopup.targeting.devices.includes(device as any)}
                          onChange={(e) => {
                            const devices = editingPopup.targeting.devices;
                            const newDevices = e.target.checked
                              ? [...devices, device as any]
                              : devices.filter(d => d !== device);
                            
                            setEditingPopup(prev => prev ? {
                              ...prev,
                              targeting: { ...prev.targeting, devices: newDevices }
                            } : null);
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 capitalize flex items-center">
                          {device === 'mobile' && <Smartphone size={14} className="mr-1" />}
                          {device === 'tablet' && <Tablet size={14} className="mr-1" />}
                          {device === 'desktop' && <Monitor size={14} className="mr-1" />}
                          {device}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editingPopup.targeting.newVisitors}
                        onChange={(e) => setEditingPopup(prev => prev ? {
                          ...prev,
                          targeting: { ...prev.targeting, newVisitors: e.target.checked }
                        } : null)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Nouveaux visiteurs</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editingPopup.targeting.returningVisitors}
                        onChange={(e) => setEditingPopup(prev => prev ? {
                          ...prev,
                          targeting: { ...prev.targeting, returningVisitors: e.target.checked }
                        } : null)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Visiteurs récurrents</span>
                    </label>
                  </div>
                </div>

                {editingPopup.type === 'time-based' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Délai d'affichage (secondes)
                    </label>
                    <input
                      type="number"
                      value={editingPopup.trigger.delay / 1000}
                      onChange={(e) => setEditingPopup(prev => prev ? {
                        ...prev,
                        trigger: { ...prev.trigger, delay: parseInt(e.target.value) * 1000 }
                      } : null)}
                      min="1"
                      max="300"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {editingPopup.type === 'scroll-based' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pourcentage de scroll (%)
                    </label>
                    <input
                      type="number"
                      value={editingPopup.trigger.scrollPercent}
                      onChange={(e) => setEditingPopup(prev => prev ? {
                        ...prev,
                        trigger: { ...prev.trigger, scrollPercent: parseInt(e.target.value) }
                      } : null)}
                      min="10"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* Fréquence */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Fréquence d'Affichage</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max par session
                  </label>
                  <input
                    type="number"
                    value={editingPopup.frequency.maxPerSession}
                    onChange={(e) => setEditingPopup(prev => prev ? {
                      ...prev,
                      frequency: { ...prev.frequency, maxPerSession: parseInt(e.target.value) }
                    } : null)}
                    min="1"
                    max="5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max par jour
                  </label>
                  <input
                    type="number"
                    value={editingPopup.frequency.maxPerDay}
                    onChange={(e) => setEditingPopup(prev => prev ? {
                      ...prev,
                      frequency: { ...prev.frequency, maxPerDay: parseInt(e.target.value) }
                    } : null)}
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cooldown (heures)
                  </label>
                  <input
                    type="number"
                    value={editingPopup.frequency.cooldownHours}
                    onChange={(e) => setEditingPopup(prev => prev ? {
                      ...prev,
                      frequency: { ...prev.frequency, cooldownHours: parseInt(e.target.value) }
                    } : null)}
                    min="1"
                    max="168"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Aperçu */}
          {showPreview && (
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Aperçu de la Popup</h3>
              <div className="bg-black bg-opacity-50 p-8 rounded-lg flex items-center justify-center">
                <div className={`bg-white rounded-2xl shadow-2xl max-w-md w-full ${
                  editingPopup.design.animation === 'bounce' ? 'animate-bounce' : ''
                }`}>
                  <div className={`p-6 rounded-t-2xl text-white ${
                    editingPopup.design.theme === 'urgent' ? 'bg-gradient-to-r from-red-500 to-pink-500' :
                    editingPopup.design.theme === 'premium' ? 'bg-gradient-to-r from-amber-500 to-yellow-500' :
                    'bg-gradient-to-r from-blue-500 to-indigo-500'
                  }`}>
                    <h3 className="text-xl font-bold mb-2">{editingPopup.content.title}</h3>
                    <p className="text-sm opacity-90">{editingPopup.content.subtitle}</p>
                  </div>
                  
                  <div className="p-6">
                    <p className="text-gray-700 mb-4">{editingPopup.content.description}</p>
                    
                    {editingPopup.content.urgencyText && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <p className="text-red-600 text-sm font-medium">{editingPopup.content.urgencyText}</p>
                      </div>
                    )}
                    
                    <button className={`w-full py-3 px-6 rounded-lg font-bold transition-colors ${
                      editingPopup.design.theme === 'urgent' ? 'bg-red-500 hover:bg-red-600 text-white' :
                      editingPopup.design.theme === 'premium' ? 'bg-amber-500 hover:bg-amber-600 text-black' :
                      'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}>
                      {editingPopup.content.ctaText}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
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
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Eye className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Gestion des Popups
                  </h1>
                  <p className="text-sm text-gray-600">
                    Configuration des popups d'exit intent et de conversion
                  </p>
                </div>
              </div>
              
              <a
                href="/backoffice"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Home size={16} />
                <span>Accueil Backoffice</span>
              </a>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            
            <button
              onClick={createNewPopup}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <Plus size={16} />
              <span>Nouvelle Popup</span>
            </button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="text-center bg-gradient-to-br from-blue-50 to-indigo-50">
              <Eye className="mx-auto mb-2 text-blue-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">
                {Object.values(analytics).reduce((sum, popup: any) => sum + (popup.view || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Vues totales</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-green-50 to-emerald-50">
              <Monitor className="mx-auto mb-2 text-green-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">
                {Object.values(analytics).reduce((sum, popup: any) => sum + (popup.click || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Clics totaux</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-purple-50 to-pink-50">
              <TrendingUp className="mx-auto mb-2 text-purple-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">
                {Object.values(analytics).reduce((sum, popup: any) => sum + (popup.convert || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Conversions</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-amber-50 to-yellow-50">
              <BarChart3 className="mx-auto mb-2 text-amber-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">
                {popups.filter(p => p.enabled).length}
              </div>
              <div className="text-sm text-gray-600">Popups actives</div>
            </Card>
          </div>

          {/* Popups List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popups.map(popup => {
              const popupAnalytics = analytics[popup.id] || {};
              const views = popupAnalytics.view || 0;
              const clicks = popupAnalytics.click || 0;
              const conversions = popupAnalytics.convert || 0;
              const conversionRate = views > 0 ? ((conversions / views) * 100).toFixed(1) : '0';

              return (
                <Card key={popup.id} hover className="group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getTypeIcon(popup.type)}</span>
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {popup.name}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(popup.status)}`}>
                        {popup.status}
                      </span>
                      <button
                        onClick={() => togglePopup(popup.id)}
                        className={`p-1 rounded ${popup.enabled ? 'text-green-600' : 'text-gray-600'}`}
                      >
                        {popup.enabled ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {popup.content.description}
                  </p>

                  {/* Analytics */}
                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-blue-600">{views}</div>
                      <div className="text-xs text-gray-600">Vues</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-600">{clicks}</div>
                      <div className="text-xs text-gray-600">Clics</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-purple-600">{conversionRate}%</div>
                      <div className="text-xs text-gray-600">Conv.</div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingPopup(popup)}
                      className="flex items-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex-1"
                    >
                      <Edit size={14} />
                      <span>Modifier</span>
                    </button>
                    
                    <button
                      onClick={() => duplicatePopup(popup)}
                      className="flex items-center space-x-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Copy size={14} />
                    </button>
                    
                    <button
                      onClick={() => deletePopup(popup.id)}
                      className="flex items-center space-x-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Empty State */}
          {popups.length === 0 && (
            <Card className="text-center py-12">
              <Eye className="mx-auto mb-4 text-gray-600" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune popup configurée
              </h3>
              <p className="text-gray-600 mb-4">
                Créez votre première popup pour améliorer vos conversions
              </p>
              <button
                onClick={createNewPopup}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Créer ma première popup
              </button>
            </Card>
          )}
        </div>

        {/* Editor Modal */}
        {renderPopupEditor()}
      </div>
    
  );
};

export default PopupManagerBackoffice;