import React, { useState, useEffect } from 'react';
import { QrCode, Download, Copy, CheckCircle, Users, Link as LinkIcon, RefreshCw, Eye, Printer, FileImage, Sparkles, BarChart3, TrendingUp } from 'lucide-react';
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

interface QRStats {
  total_generated: number;
  total_scans: number;
  most_popular_code: string;
  last_generated: string | null;
}

type QRTemplate = 'basic' | 'business-card' | 'flyer' | 'sticker' | 'vehicle';

const QRCodeGenerator: React.FC = () => {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [selectedAmbassador, setSelectedAmbassador] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [referralUrl, setReferralUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<QRTemplate>('basic');
  const [qrSize, setQrSize] = useState(512);
  const [qrColor, setQrColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [showPreview, setShowPreview] = useState(false);
  const [stats, setStats] = useState<QRStats>({
    total_generated: 0,
    total_scans: 0,
    most_popular_code: '-',
    last_generated: null
  });
  const [generatingBatch, setGeneratingBatch] = useState(false);

  useEffect(() => {
    loadAmbassadors();
    loadStats();
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

  const loadStats = async () => {
    try {
      const { data } = await supabase
        .from('qr_code_usage')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (data) {
        const codeCounts: Record<string, number> = {};
        data.forEach(d => {
          codeCounts[d.ambassador_code] = (codeCounts[d.ambassador_code] || 0) + 1;
        });

        const mostPopular = Object.entries(codeCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

        setStats({
          total_generated: data.length,
          total_scans: data.filter(d => d.action === 'scan').length,
          most_popular_code: mostPopular,
          last_generated: data[0]?.created_at || null
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const generateQRCode = (ambassadorCode: string, template: QRTemplate = 'basic') => {
    const baseUrl = 'https://taxiassur.com/devis';
    const url = `${baseUrl}?ref=${ambassadorCode}&utm_source=qrcode&utm_medium=${template}&utm_campaign=ambassador`;
    setReferralUrl(url);

    // API QR Code avec personnalisation
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(url)}&color=${qrColor.replace('#', '')}&bgcolor=${bgColor.replace('#', '')}`;
    setQrCodeUrl(qrApiUrl);

    // Track génération
    trackQRGeneration(ambassadorCode, template);
  };

  const trackQRGeneration = async (code: string, template: string) => {
    try {
      await supabase.from('qr_code_usage').insert({
        ambassador_code: code,
        action: 'generate',
        template: template
      });
      await loadStats();
    } catch (error) {
      console.error('Error tracking generation:', error);
    }
  };

  const handleAmbassadorSelect = (code: string) => {
    setSelectedAmbassador(code);
    generateQRCode(code, selectedTemplate);
  };

  const handleTemplateChange = (template: QRTemplate) => {
    setSelectedTemplate(template);
    if (selectedAmbassador) {
      generateQRCode(selectedAmbassador, template);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qrcode-${selectedAmbassador}-${selectedTemplate}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = async () => {
    setGeneratingBatch(true);
    try {
      for (const ambassador of ambassadors) {
        const url = `https://taxiassur.com/devis?ref=${ambassador.code}&utm_source=qrcode&utm_medium=batch&utm_campaign=ambassador`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(url)}`;

        const link = document.createElement('a');
        link.href = qrUrl;
        link.download = `qrcode-${ambassador.code}-${selectedTemplate}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } finally {
      setGeneratingBatch(false);
    }
  };

  const generatePrintTemplate = () => {
    if (!selectedAmbassador) return;

    const ambassador = ambassadors.find(a => a.code === selectedAmbassador);
    if (!ambassador) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Code - ${ambassador.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            text-align: center;
          }
          .header {
            color: #EA580C;
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .qr-container {
            background: white;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            display: inline-block;
          }
          .qr-code {
            width: ${qrSize}px;
            height: ${qrSize}px;
            margin: 20px auto;
          }
          .ambassador-info {
            margin-top: 20px;
            font-size: 18px;
            color: #333;
          }
          .scan-text {
            margin-top: 15px;
            font-size: 24px;
            font-weight: bold;
            color: #EA580C;
          }
          .instructions {
            margin-top: 20px;
            font-size: 14px;
            color: #666;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">🚖 TaxiAssur</div>
        <div class="qr-container">
          <img src="${qrCodeUrl}" class="qr-code" alt="QR Code">
          <div class="scan-text">Scannez pour un devis gratuit</div>
          <div class="ambassador-info">
            <strong>${ambassador.name}</strong><br>
            Code: ${ambassador.code}<br>
            ${ambassador.city}
          </div>
          <div class="instructions">
            Obtenez votre assurance taxi en 1 minute<br>
            Avec le parrainage de votre ambassadeur
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const getTemplateInfo = (template: QRTemplate) => {
    const templates = {
      basic: { label: 'Basic', icon: '📱', desc: 'QR Code simple' },
      'business-card': { label: 'Carte Visite', icon: '💼', desc: 'Format carte de visite' },
      flyer: { label: 'Flyer', icon: '📄', desc: 'Format flyer A5' },
      sticker: { label: 'Sticker', icon: '🏷️', desc: 'Autocollant rond' },
      vehicle: { label: 'Véhicule', icon: '🚗', desc: 'Affichage véhicule' }
    };
    return templates[template];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <QrCode className="w-8 h-8" />
                Générateur de QR Codes
              </h1>
              <p className="text-orange-100 mt-2">
                Créez des QR codes personnalisés pour vos ambassadeurs
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => { loadAmbassadors(); loadStats(); }}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center space-x-2"
              >
                <RefreshCw size={18} />
                <span>Actualiser</span>
              </button>
              <button
                onClick={handleDownloadAll}
                disabled={generatingBatch || ambassadors.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {generatingBatch ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Télécharger Tous ({ambassadors.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Ambassadeurs</p>
                <p className="text-3xl font-bold text-gray-800">{ambassadors.length}</p>
              </div>
              <Users size={32} className="text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">QR Générés</p>
                <p className="text-3xl font-bold text-gray-800">{stats.total_generated}</p>
              </div>
              <QrCode size={32} className="text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Scans</p>
                <p className="text-3xl font-bold text-gray-800">{stats.total_scans}</p>
              </div>
              <BarChart3 size={32} className="text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Plus Populaire</p>
                <p className="text-lg font-bold text-gray-800 truncate">{stats.most_popular_code}</p>
              </div>
              <TrendingUp size={32} className="text-purple-500" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sélection Ambassadeur */}
          <Card className="bg-white shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-orange-600" />
              Sélectionner un Ambassadeur
            </h2>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {ambassadors.map((ambassador) => (
                <button
                  key={ambassador.id}
                  onClick={() => handleAmbassadorSelect(ambassador.code)}
                  className={`w-full p-4 rounded-lg text-left transition border-2 ${
                    selectedAmbassador === ambassador.code
                      ? 'bg-orange-50 border-orange-500 text-gray-800'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{ambassador.name}</p>
                      <p className="text-sm opacity-75">Code: {ambassador.code}</p>
                      <p className="text-sm opacity-75">{ambassador.city}</p>
                    </div>
                    {selectedAmbassador === ambassador.code && (
                      <CheckCircle className="w-6 h-6 text-orange-600" />
                    )}
                  </div>
                </button>
              ))}

              {ambassadors.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun ambassadeur trouvé</p>
                  <p className="text-sm mt-2">Créez des ambassadeurs d'abord</p>
                </div>
              )}
            </div>
          </Card>

          {/* Personnalisation */}
          <Card className="bg-white shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-orange-600" />
              Personnalisation
            </h2>

            <div className="space-y-4">
              {/* Templates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['basic', 'business-card', 'flyer', 'sticker', 'vehicle'] as QRTemplate[]).map((template) => {
                    const info = getTemplateInfo(template);
                    return (
                      <button
                        key={template}
                        onClick={() => handleTemplateChange(template)}
                        className={`p-3 rounded-lg border-2 transition text-left ${
                          selectedTemplate === template
                            ? 'bg-orange-50 border-orange-500'
                            : 'bg-gray-50 border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{info.icon}</div>
                        <div className="text-xs font-medium text-gray-800">{info.label}</div>
                        <div className="text-xs text-gray-600">{info.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Taille */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taille: {qrSize}px
                </label>
                <input
                  type="range"
                  min="256"
                  max="1024"
                  step="128"
                  value={qrSize}
                  onChange={(e) => {
                    setQrSize(parseInt(e.target.value));
                    if (selectedAmbassador) generateQRCode(selectedAmbassador, selectedTemplate);
                  }}
                  className="w-full"
                />
              </div>

              {/* Couleurs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Couleur QR
                  </label>
                  <input
                    type="color"
                    value={qrColor}
                    onChange={(e) => {
                      setQrColor(e.target.value);
                      if (selectedAmbassador) generateQRCode(selectedAmbassador, selectedTemplate);
                    }}
                    className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fond
                  </label>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => {
                      setBgColor(e.target.value);
                      if (selectedAmbassador) generateQRCode(selectedAmbassador, selectedTemplate);
                    }}
                    className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Prévisualisation QR Code */}
          <Card className="bg-white shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <QrCode className="w-6 h-6 text-orange-600" />
              Prévisualisation
            </h2>

            {qrCodeUrl ? (
              <div className="space-y-4">
                {/* QR Code */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-lg border-2 border-gray-200">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-full max-w-sm mx-auto rounded-lg shadow-md"
                  />
                  <div className="text-center mt-4">
                    <p className="text-gray-800 font-bold text-lg">
                      Scannez pour un devis gratuit
                    </p>
                    <p className="text-gray-600 text-sm mt-1">
                      Code: {selectedAmbassador}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {getTemplateInfo(selectedTemplate).label}
                    </p>
                  </div>
                </div>

                {/* URL et Actions */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL de Parrainage
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={referralUrl}
                        readOnly
                        className="flex-1 border-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm bg-gray-50"
                      />
                      <button
                        onClick={handleCopyUrl}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDownloadQR}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 transition font-medium"
                    >
                      <Download className="w-4 h-4" />
                      <span>PNG</span>
                    </button>

                    <button
                      onClick={generatePrintTemplate}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition font-medium"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Imprimer</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <QrCode className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Sélectionnez un ambassadeur</p>
                <p className="text-sm mt-2">pour générer son QR code personnalisé</p>
              </div>
            )}
          </Card>
        </div>

        {/* Guide d'Impression */}
        <Card className="bg-white shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            📋 Guide d'Impression et de Partage
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-orange-600">
                Spécifications Techniques
              </h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li>• Taille minimale: 3x3 cm</li>
                <li>• Format: PNG (configurable)</li>
                <li>• Résolution: 300 DPI recommandé</li>
                <li>• Fond: Personnalisable</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-green-600">
                Lieux de Partage
              </h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li>• Vitre arrière du véhicule</li>
                <li>• Carte de visite ambassadeur</li>
                <li>• Flyers et brochures</li>
                <li>• Stations taxi (affichage)</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-orange-600">
                Bonnes Pratiques
              </h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li>• Testez le scan avant impression</li>
                <li>• Évitez les surfaces réfléchissantes</li>
                <li>• Gardez un contraste élevé</li>
                <li>• Ajoutez un appel à l'action</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
