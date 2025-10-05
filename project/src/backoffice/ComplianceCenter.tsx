import React, { useState, useEffect } from 'react';
import { Shield, Download, Trash2, Eye, Calendar, Mail, AlertTriangle, CheckCircle, Home } from 'lucide-react';
import { GDPRCompliance, type DSRRequest, type ComplianceReport } from '../lib/compliance';
import { getConsents } from '../lib/partners';
import { Consent } from '../lib/schema';
import Card from '../components/Card';
import AuthGuard from '../components/AuthGuard';

const ComplianceCenter: React.FC = () => {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedConsent, setSelectedConsent] = useState<Consent | null>(null);
  const [showDSRModal, setShowDSRModal] = useState(false);
  const [dsrEmail, setDsrEmail] = useState('');
  const [dsrType, setDsrType] = useState<DSRRequest['type']>('access');

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    setLoading(true);
    try {
      const [consentsData, reportData] = await Promise.all([
        getConsents(),
        GDPRCompliance.generateComplianceReport()
      ]);
      
      setConsents(consentsData);
      setReport(reportData);
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDSRRequest = async () => {
    if (!dsrEmail) return;

    try {
      const personalData = await GDPRCompliance.exportPersonalData(dsrEmail);
      
      if (dsrType === 'access') {
        // Export data
        const dataBlob = new Blob([JSON.stringify(personalData, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taxiassur-data-${dsrEmail}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        alert('✅ Données exportées avec succès');
      } else if (dsrType === 'erasure') {
        if (confirm(`Confirmer la suppression de toutes les données pour ${dsrEmail} ?`)) {
          const success = await GDPRCompliance.deletePersonalData(dsrEmail);
          if (success) {
            alert('✅ Données supprimées avec succès');
            loadComplianceData(); // Refresh
          } else {
            alert('❌ Erreur lors de la suppression');
          }
        }
      }
      
      setShowDSRModal(false);
      setDsrEmail('');
    } catch (error) {
      console.error('DSR error:', error);
      alert('❌ Erreur lors du traitement de la demande');
    }
  };

  const exportConsentLedger = () => {
    const csvContent = [
      ['ID', 'Email', 'Base Légale', 'Collecté Le', 'Statut', 'Opt-out Le'].join(','),
      ...consents.map(consent => [
        consent.id,
        consent.email,
        consent.lawfulBasis,
        new Date(consent.collectedAt).toLocaleDateString('fr-FR'),
        consent.optedOutAt ? 'Opt-out' : 'Actif',
        consent.optedOutAt ? new Date(consent.optedOutAt).toLocaleDateString('fr-FR') : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consent-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 p-8">
        {/* Header with Home Button */}
        <header className="bg-white border-b-2 border-gray-200 shadow-sm mb-8">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Centre de Conformité RGPD
                  </h1>
                  <p className="text-sm text-gray-600">
                    Gestion des consentements et droits des personnes
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
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowDSRModal(true)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <Mail size={16} />
                <span>Traiter DSR</span>
              </button>
              
              <button
                onClick={exportConsentLedger}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Compliance Overview */}
          {report && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="text-center bg-gradient-to-br from-blue-50 to-indigo-50">
                <Shield className="mx-auto mb-2 text-blue-600" size={24} />
                <div className="text-2xl font-bold text-gray-900">{report.totalConsents}</div>
                <div className="text-sm text-gray-600">Consentements</div>
              </Card>

              <Card className="text-center bg-gradient-to-br from-green-50 to-emerald-50">
                <CheckCircle className="mx-auto mb-2 text-green-600" size={24} />
                <div className="text-2xl font-bold text-gray-900">{report.activeConsents}</div>
                <div className="text-sm text-gray-600">Actifs</div>
              </Card>

              <Card className="text-center bg-gradient-to-br from-red-50 to-pink-50">
                <Mail className="mx-auto mb-2 text-red-600" size={24} />
                <div className="text-2xl font-bold text-gray-900">{report.optOuts}</div>
                <div className="text-sm text-gray-600">Opt-outs</div>
              </Card>

              <Card className="text-center bg-gradient-to-br from-yellow-50 to-amber-50">
                <AlertTriangle className="mx-auto mb-2 text-yellow-600" size={24} />
                <div className="text-2xl font-bold text-gray-900">{report.retentionCompliance.expiredRecords}</div>
                <div className="text-sm text-gray-600">À supprimer</div>
              </Card>
            </div>
          )}

          {/* Consent Ledger */}
          <Card className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Registre des Consentements
              </h3>
              <div className="text-sm text-gray-600">
                {consents.length} enregistrements
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Base Légale</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Collecté Le</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Statut</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {consents.map(consent => (
                    <tr key={consent.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{consent.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          consent.lawfulBasis === 'consent' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {consent.lawfulBasis === 'consent' ? 'Consentement' : 'Intérêt légitime'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {new Date(consent.collectedAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-4">
                        {consent.optedOutAt ? (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                            Opt-out
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Actif
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedConsent(consent)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Eye size={16} />
                          </button>
                          {!consent.optedOutAt && (
                            <button
                              onClick={() => {
                                setDsrEmail(consent.email);
                                setDsrType('erasure');
                                setShowDSRModal(true);
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* GDPR Guidelines */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="mr-2 text-green-600" size={20} />
              Conformité RGPD
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Bases Légales Utilisées</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="text-green-600" size={16} />
                    <span><strong>Intérêt légitime :</strong> Contact B2B professionnel</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="text-green-600" size={16} />
                    <span><strong>Consentement :</strong> Newsletter et marketing</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="text-green-600" size={16} />
                    <span><strong>Opt-out :</strong> Lien dans chaque email</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Droits des Personnes</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center space-x-2">
                    <Eye className="text-blue-600" size={16} />
                    <span><strong>Accès :</strong> Export des données personnelles</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Trash2 className="text-red-600" size={16} />
                    <span><strong>Effacement :</strong> Suppression complète</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Download className="text-green-600" size={16} />
                    <span><strong>Portabilité :</strong> Export format standard</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* DSR Modal */}
        {showDSRModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Traiter une Demande DSR
                </h2>
                <button
                  onClick={() => setShowDSRModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email de la personne *
                  </label>
                  <input
                    type="email"
                    value={dsrEmail}
                    onChange={(e) => setDsrEmail(e.target.value)}
                    placeholder="contact@exemple.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de demande
                  </label>
                  <select
                    value={dsrType}
                    onChange={(e) => setDsrType(e.target.value as DSRRequest['type'])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="access">Accès aux données</option>
                    <option value="rectification">Rectification</option>
                    <option value="erasure">Effacement</option>
                    <option value="portability">Portabilité</option>
                    <option value="restriction">Limitation du traitement</option>
                  </select>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center space-x-2 text-yellow-800">
                    <AlertTriangle size={16} />
                    <span className="text-sm font-medium">
                      {dsrType === 'erasure' 
                        ? 'Cette action supprimera définitivement toutes les données.'
                        : 'Les données seront exportées au format JSON.'
                      }
                    </span>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowDSRModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDSRRequest}
                    disabled={!dsrEmail}
                    className={`px-4 py-2 text-white rounded-lg transition-colors ${
                      dsrType === 'erasure' 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    } disabled:bg-gray-400`}
                  >
                    {dsrType === 'erasure' ? 'Supprimer' : 'Exporter'}
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Consent Detail Modal */}
        {selectedConsent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Détail du Consentement
                </h2>
                <button
                  onClick={() => setSelectedConsent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{selectedConsent.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Base légale</label>
                    <p className="text-gray-900">
                      {selectedConsent.lawfulBasis === 'consent' ? 'Consentement' : 'Intérêt légitime'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Collecté le</label>
                    <p className="text-gray-900">
                      {new Date(selectedConsent.collectedAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Collecté par</label>
                    <p className="text-gray-900">{selectedConsent.collectedBy}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">URL de désinscription</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={selectedConsent.optOutUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(selectedConsent.optOutUrl)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                {selectedConsent.optedOutAt && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="flex items-center space-x-2 text-red-800">
                      <AlertTriangle size={16} />
                      <span className="font-medium">
                        Opt-out le {new Date(selectedConsent.optedOutAt).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </AuthGuard>
  );
};

export default ComplianceCenter;