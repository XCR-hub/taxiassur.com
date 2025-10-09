import React, { useState, useEffect } from 'react';
import { QrCode, Download, Copy, CheckCircle, Users, Link as LinkIcon } from 'lucide-react';
import Card from '../components/Card';
import { supabase } from '../lib/supabase';

interface Ambassador {
  id: string;
  name: string;
  code: string;
  phone: string;
  city: string;
  created_at: string;
}

const QRCodeGenerator: React.FC = () => {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [selectedAmbassador, setSelectedAmbassador] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [referralUrl, setReferralUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAmbassadors();
  }, []);

  const loadAmbassadors = async () => {
    try {
      const { data, error } = await supabase
        .from('ambassadors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAmbassadors(data || []);
    } catch (error) {
      console.error('Failed to load ambassadors:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = (ambassadorCode: string) => {
    const baseUrl = 'https://taxiassur.com/devis';
    const url = `${baseUrl}?ref=${ambassadorCode}&utm_source=qrcode&utm_medium=print`;
    setReferralUrl(url);

    // Utiliser l'API QR Code gratuite
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(url)}`;
    setQrCodeUrl(qrApiUrl);
  };

  const handleAmbassadorSelect = (code: string) => {
    setSelectedAmbassador(code);
    generateQRCode(code);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qrcode-${selectedAmbassador}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = async () => {
    // Génération batch de tous les QR codes
    for (const ambassador of ambassadors) {
      const url = `https://taxiassur.com/devis?ref=${ambassador.code}&utm_source=qrcode&utm_medium=print`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(url)}`;

      const link = document.createElement('a');
      link.href = qrUrl;
      link.download = `qrcode-${ambassador.code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Petit délai entre chaque téléchargement
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-700 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <QrCode className="w-8 h-8" />
              Générateur de QR Codes
            </h1>
            <p className="text-slate-300 mt-2">
              Créez des QR codes personnalisés pour vos ambassadeurs
            </p>
          </div>
          <button
            onClick={handleDownloadAll}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition"
          >
            <Download className="w-5 h-5" />
            Télécharger Tous
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Ambassadeurs</p>
                <p className="text-3xl font-bold mt-2">{ambassadors.length}</p>
              </div>
              <Users className="w-12 h-12 text-blue-200 opacity-50" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">QR Codes Générés</p>
                <p className="text-3xl font-bold mt-2">{selectedAmbassador ? 1 : 0}</p>
              </div>
              <QrCode className="w-12 h-12 text-purple-200 opacity-50" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">URLs Partagées</p>
                <p className="text-3xl font-bold mt-2">{copied ? 'Copié!' : '0'}</p>
              </div>
              <LinkIcon className="w-12 h-12 text-green-200 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sélection Ambassadeur */}
          <Card className="bg-slate-800 border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-6 h-6" />
              Sélectionner un Ambassadeur
            </h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {ambassadors.map((ambassador) => (
                <button
                  key={ambassador.id}
                  onClick={() => handleAmbassadorSelect(ambassador.code)}
                  className={`w-full p-4 rounded-lg text-left transition ${
                    selectedAmbassador === ambassador.code
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{ambassador.name}</p>
                      <p className="text-sm opacity-75">Code: {ambassador.code}</p>
                      <p className="text-sm opacity-75">{ambassador.city}</p>
                    </div>
                    {selectedAmbassador === ambassador.code && (
                      <CheckCircle className="w-6 h-6" />
                    )}
                  </div>
                </button>
              ))}

              {ambassadors.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun ambassadeur trouvé</p>
                  <p className="text-sm mt-2">Créez des ambassadeurs d'abord</p>
                </div>
              )}
            </div>
          </Card>

          {/* Prévisualisation QR Code */}
          <Card className="bg-slate-800 border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <QrCode className="w-6 h-6" />
              Prévisualisation QR Code
            </h2>

            {qrCodeUrl ? (
              <div className="space-y-4">
                {/* QR Code */}
                <div className="bg-white p-6 rounded-lg">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-full max-w-sm mx-auto"
                  />
                  <p className="text-center text-slate-600 mt-4 font-semibold">
                    Scannez pour un devis gratuit
                  </p>
                  <p className="text-center text-slate-500 text-sm">
                    Code: {selectedAmbassador}
                  </p>
                </div>

                {/* URL et Actions */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      URL de Parrainage
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={referralUrl}
                        readOnly
                        className="flex-1 bg-slate-700 border-slate-600 text-white px-4 py-2 rounded-lg text-sm"
                      />
                      <button
                        onClick={handleCopyUrl}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Copié!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copier
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadQR}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Télécharger QR Code (PNG)
                  </button>
                </div>

                {/* Instructions */}
                <Card className="bg-slate-700 border-slate-600">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Instructions d'Utilisation
                  </h3>
                  <ul className="space-y-2 text-slate-300 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>Imprimez le QR code en taille minimum 3x3 cm</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>Utilisez pour affichage sur véhicule (vitre arrière)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>Ajoutez sur cartes de visite, flyers, brochures</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>Affichez en station taxi pour visibilité maximale</span>
                    </li>
                  </ul>
                </Card>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400">
                <QrCode className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Sélectionnez un ambassadeur</p>
                <p className="text-sm mt-2">pour générer son QR code personnalisé</p>
              </div>
            )}
          </Card>
        </div>

        {/* Guide d'Impression */}
        <Card className="bg-slate-800 border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">
            📋 Guide d'Impression et de Partage
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">
                Spécifications Techniques
              </h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li>• Taille minimale: 3x3 cm</li>
                <li>• Format: PNG (512x512px)</li>
                <li>• Résolution: 300 DPI pour impression</li>
                <li>• Fond: Blanc recommandé</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-green-400">
                Lieux de Partage
              </h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li>• Vitre arrière du véhicule</li>
                <li>• Carte de visite ambassadeur</li>
                <li>• Flyers et brochures</li>
                <li>• Stations taxi (affichage)</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-purple-400">
                Outils Recommandés
              </h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li>• qrcode Python library</li>
                <li>• qr-code-generator.com</li>
                <li>• bit.ly pour URLs courtes</li>
                <li>• short.io pour redirects</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
