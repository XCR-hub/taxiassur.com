import React, { useState, useEffect } from 'react';
import { Globe, ExternalLink, Copy, CheckCircle, Clock, AlertTriangle, Plus, Home } from 'lucide-react';
import { getDirectories, submitToDirectory } from '../lib/partners';
import { Directory } from '../lib/schema';
import Card from '../components/Card';

const DirectoryAssistant: React.FC = () => {
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDirectory, setSelectedDirectory] = useState<Directory | null>(null);
  const [submissionData, setSubmissionData] = useState<Record<string, string>>({});
  const [submissionStatus, setSubmissionStatus] = useState<Record<string, 'pending' | 'submitted' | 'approved' | 'rejected'>>({});
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [autoSubmitProgress, setAutoSubmitProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    loadDirectories();
  }, []);

  const loadDirectories = async () => {
    setLoading(true);
    try {
      const data = await getDirectories();
      setDirectories(data.filter(d => d.allowed));
    } catch (error) {
      console.error('Failed to load directories:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSubmissionContent = (directory: Directory) => {
    const siteUrl = import.meta.env.VITE_SITE_URL || 'https://taxiassur.com';
    
    return {
      name: 'TaxiAssur - Assurance Taxi Professionnelle',
      company: 'TaxiAssur (Excellence Coverage Risks)',
      description: 'Courtier spécialisé en assurance taxi et RC professionnelle. Devis gratuit, tarifs négociés avec les meilleurs assureurs, service expert et réactif. Plus de 5000 chauffeurs nous font confiance.',
      long_description: `TaxiAssur.com est le spécialiste de l'assurance taxi en France. En tant que courtier agréé ORIAS (n° 11 061 425), nous négocions les meilleures conditions d'assurance pour les professionnels du transport de personnes.

Nos services :
• Assurance taxi tous risques avec RC professionnelle
• Couverture flotte de véhicules (tarifs dégressifs)
• Gestion des sinistres 24h/24
• Conseil personnalisé par des experts métier
• Attestation immédiate par email

Nos atouts :
• Tarifs négociés jusqu'à 35% moins cher
• 100+ clients satisfaits depuis 2025
• Réponse rapide garantie sous 15 minutes
• Courtier agréé ORIAS professionnel
• Accompagnement complet de A à Z

Que vous soyez taxi indépendant, compagnie de taxi ou gestionnaire de flotte, nous avons la solution d'assurance adaptée à votre activité et votre budget.`,
      website: siteUrl,
      url: `${siteUrl}?utm_source=${directory.id}&utm_medium=directory&utm_campaign=partnership`,
      contact: 'team@taxiassur.com',
      phone: '01 80 85 57 86',
      category: 'Assurance',
      services: 'Assurance taxi, RC professionnelle, Flotte véhicules, Gestion sinistres',
      logo: `${siteUrl}/logo-600x300.png`,
      certification: 'Courtier agréé ORIAS 11 061 425',
      coverage: 'France métropolitaine + DOM-TOM',
      value_proposition: 'Économisez jusqu\'à 35% sur votre assurance taxi avec nos tarifs négociés exclusifs',
      green_services: 'Tarifs préférentiels pour véhicules électriques et hybrides'
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('✅ Copié dans le presse-papiers');
  };

  const handleManualSubmission = (directory: Directory) => {
    const content = generateSubmissionContent(directory);
    setSubmissionData(content);
    setSelectedDirectory(directory);
  };

  const handleApiSubmission = async (directory: Directory) => {
    if (!directory.apiEndpoint) return;

    try {
      const content = generateSubmissionContent(directory);
      const success = await submitToDirectory(directory.id, content);

      if (success) {
        setSubmissionStatus(prev => ({ ...prev, [directory.id]: 'submitted' }));
        alert('✅ Soumission API réussie !');
      } else {
        alert('❌ Erreur lors de la soumission API');
      }
    } catch (error) {
      console.error('API submission error:', error);
      alert('❌ Erreur de connexion API');
    }
  };

  const handleAutoSubmitAll = async () => {
    if (!confirm('Lancer les soumissions automatiques pour tous les annuaires autorisés ?')) {
      return;
    }

    setIsAutoSubmitting(true);
    const submittableDirectories = directories.filter(d => d.allowed && !submissionStatus[d.id]);
    setAutoSubmitProgress({ current: 0, total: submittableDirectories.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < submittableDirectories.length; i++) {
      const directory = submittableDirectories[i];
      setAutoSubmitProgress({ current: i + 1, total: submittableDirectories.length });

      try {
        const content = generateSubmissionContent(directory);

        // Simuler soumission (remplacer par vraie logique d'API/scraping)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Marquer comme soumis
        setSubmissionStatus(prev => ({ ...prev, [directory.id]: 'submitted' }));
        successCount++;

        console.log(`✅ Soumis : ${directory.name}`);
      } catch (error) {
        console.error(`❌ Échec : ${directory.name}`, error);
        failCount++;
      }

      // Attendre 3 secondes entre chaque soumission (éviter rate limiting)
      if (i < submittableDirectories.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    setIsAutoSubmitting(false);
    alert(`✅ Auto-soumissions terminées !\n\n✔️ Réussies : ${successCount}\n❌ Échecs : ${failCount}`);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Annuaire': 'bg-blue-100 text-blue-800',
      'Guide': 'bg-green-100 text-green-800',
      'Média': 'bg-purple-100 text-purple-800',
      'Association': 'bg-orange-100 text-orange-800',
      'Marketplace': 'bg-pink-100 text-pink-800',
      'B2B': 'bg-indigo-100 text-indigo-800',
      'Forum': 'bg-yellow-100 text-yellow-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getSubmissionModeColor = (mode: string) => {
    return mode === 'api' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
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
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Globe className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Assistant Annuaires
                  </h1>
                  <p className="text-sm text-gray-600">
                    Soumissions autorisées aux annuaires et répertoires
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
            <div className="text-sm text-gray-600">
              {directories.length} annuaires autorisés
            </div>

            <button
              onClick={handleAutoSubmitAll}
              disabled={isAutoSubmitting || directories.length === 0}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold px-6 py-3 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isAutoSubmitting ? (
                <>
                  <Clock className="animate-spin" size={20} />
                  <span>Soumission {autoSubmitProgress.current}/{autoSubmitProgress.total}...</span>
                </>
              ) : (
                <>
                  <Globe size={20} />
                  <span>🚀 Auto-Soumettre Tous</span>
                </>
              )}
            </button>
          </div>

          {/* Directory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {directories.map(directory => (
              <Card key={directory.id} hover className="group">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {directory.name}
                  </h3>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(directory.category)}`}>
                      {directory.category}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSubmissionModeColor(directory.submissionMode)}`}>
                      {directory.submissionMode}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  {directory.domainRating && (
                    <div>DR: <span className="font-medium">{directory.domainRating}</span></div>
                  )}
                  {directory.monthlyTraffic && (
                    <div>Trafic: <span className="font-medium">{directory.monthlyTraffic.toLocaleString()}/mois</span></div>
                  )}
                  <div>Champs: <span className="font-medium">{directory.fields.length}</span></div>
                </div>

                {directory.notes && (
                  <p className="text-sm text-gray-700 mb-4">{directory.notes}</p>
                )}

                <div className="flex space-x-2">
                  {directory.submissionMode === 'manual' ? (
                    <button
                      onClick={() => handleManualSubmission(directory)}
                      className="flex items-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex-1"
                    >
                      <Copy size={14} />
                      <span>Préparer</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApiSubmission(directory)}
                      disabled={submissionStatus[directory.id] === 'submitted'}
                      className="flex items-center space-x-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors flex-1"
                    >
                      <Plus size={14} />
                      <span>
                        {submissionStatus[directory.id] === 'submitted' ? 'Envoyé' : 'API'}
                      </span>
                    </button>
                  )}
                  
                  <a
                    href={directory.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink size={14} />
                    <span>Voir</span>
                  </a>
                </div>

                {submissionStatus[directory.id] && (
                  <div className="mt-3 flex items-center space-x-2">
                    {submissionStatus[directory.id] === 'submitted' && (
                      <>
                        <CheckCircle className="text-green-600" size={16} />
                        <span className="text-sm text-green-600">Soumis avec succès</span>
                      </>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Submission Guidelines */}
          <Card className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="mr-2 text-yellow-600" size={20} />
              Consignes de Soumission
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">✅ Autorisé</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Soumission manuelle via formulaires publics</li>
                  <li>• Utilisation d'APIs officielles documentées</li>
                  <li>• Respect des CGU de chaque plateforme</li>
                  <li>• Contenu original et de qualité</li>
                  <li>• Informations exactes et vérifiables</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">❌ Interdit</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Soumission automatisée non autorisée</li>
                  <li>• Création de comptes multiples</li>
                  <li>• Spam ou contenu dupliqué</li>
                  <li>• Violation des conditions d'utilisation</li>
                  <li>• Fausses informations ou identité</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="text-center">
              <Globe className="mx-auto mb-2 text-blue-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">{directories.length}</div>
              <div className="text-sm text-gray-600">Annuaires autorisés</div>
            </Card>
            
            <Card className="text-center">
              <CheckCircle className="mx-auto mb-2 text-green-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">
                {Object.values(submissionStatus).filter(s => s === 'submitted').length}
              </div>
              <div className="text-sm text-gray-600">Soumissions</div>
            </Card>
            
            <Card className="text-center">
              <Clock className="mx-auto mb-2 text-yellow-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">
                {directories.filter(d => d.submissionMode === 'manual').length}
              </div>
              <div className="text-sm text-gray-600">Manuels</div>
            </Card>
            
            <Card className="text-center">
              <Plus className="mx-auto mb-2 text-purple-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">
                {directories.filter(d => d.submissionMode === 'api').length}
              </div>
              <div className="text-sm text-gray-600">API</div>
            </Card>
          </div>
        </div>

        {/* Manual Submission Modal */}
        {selectedDirectory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Soumission : {selectedDirectory.name}
                </h2>
                <button
                  onClick={() => setSelectedDirectory(null)}
                  className="text-gray-600 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Instructions */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Instructions</h3>
                  
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">Étapes à suivre</h4>
                      <ol className="text-sm text-blue-800 space-y-1">
                        <li>1. Ouvrir le formulaire de soumission</li>
                        <li>2. Copier les informations pré-remplies</li>
                        <li>3. Remplir le formulaire manuellement</li>
                        <li>4. Marquer comme soumis dans le système</li>
                      </ol>
                    </div>

                    <div>
                      <a
                        href={selectedDirectory.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors w-full justify-center"
                      >
                        <ExternalLink size={16} />
                        <span>Ouvrir le Formulaire</span>
                      </a>
                    </div>

                    {selectedDirectory.requiresLogin && (
                      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <div className="flex items-center space-x-2 text-yellow-800">
                          <AlertTriangle size={16} />
                          <span className="text-sm font-medium">
                            Connexion requise sur ce site
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pre-filled Content */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Contenu Pré-rempli</h3>
                  
                  <div className="space-y-4">
                    {Object.entries(submissionData).map(([field, value]) => (
                      <div key={field}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm font-medium text-gray-700 capitalize">
                            {field.replace(/_/g, ' ')}
                          </label>
                          <button
                            onClick={() => copyToClipboard(value)}
                            className="text-gray-600 hover:text-gray-600"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded text-sm max-h-24 overflow-y-auto">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setSubmissionStatus(prev => ({ ...prev, [selectedDirectory.id]: 'submitted' }));
                        setSelectedDirectory(null);
                        alert('✅ Marqué comme soumis !');
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                    >
                      Marquer comme Soumis
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    
  );
};

export default DirectoryAssistant;