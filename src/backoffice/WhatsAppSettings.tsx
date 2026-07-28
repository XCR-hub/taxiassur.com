import { useState, useEffect } from 'react';
import { Settings, Check, AlertCircle, Copy, ExternalLink, MessageSquare, Phone, Key, Webhook, CheckCircle, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';

export default function WhatsAppSettings() {
  const navigate = useNavigate();
  const [config, setConfig] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
    whatsappNumber: '',
    webhookUrl: ''
  });
  const [sandboxCode, setSandboxCode] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = () => {
    setConfig({
      accountSid: import.meta.env.VITE_TWILIO_ACCOUNT_SID || 'Non configuré',
      authToken: '••••••••••••••••',
      phoneNumber: import.meta.env.VITE_TWILIO_PHONE_NUMBER || 'Non configuré',
      whatsappNumber: import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER || 'Non configuré',
      webhookUrl: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twilio-webhook`
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const testWebhook = async () => {
    setTestStatus('testing');
    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          From: 'whatsapp:+33612345678',
          To: config.whatsappNumber,
          Body: 'Test depuis les paramètres'
        })
      });

      if (response.ok) {
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 3000);
      } else {
        setTestStatus('error');
      }
    } catch (error) {
      setTestStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <MessageSquare className="text-green-600" size={32} />
              Configuration WhatsApp Business
            </h1>
            <p className="text-gray-600 mt-2">
              Paramétrez votre intégration Twilio WhatsApp
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/backoffice/crm-commercial')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
            >
              <Home size={20} />
              Accueil CRM
            </button>
            <a
              href="/backoffice/whatsapp"
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg transition-colors inline-flex items-center"
            >
              Accéder au Chat
            </a>
          </div>
        </div>

        {/* Status Card */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Statut de Configuration
              </h3>
              {config.accountSid !== 'Non configuré' ? (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle size={20} />
                  <span className="font-medium">Configuration détectée</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertCircle size={20} />
                  <span className="font-medium">Configuration manquante</span>
                </div>
              )}
            </div>
            <button
              onClick={testWebhook}
              disabled={testStatus === 'testing'}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                testStatus === 'success'
                  ? 'bg-green-600 text-white'
                  : testStatus === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-800 text-white'
              }`}
            >
              {testStatus === 'testing' && '⏳ Test...'}
              {testStatus === 'success' && '✅ Test OK'}
              {testStatus === 'error' && '❌ Erreur'}
              {testStatus === 'idle' && '🧪 Tester'}
            </button>
          </div>
        </Card>

        {/* Guide Quick Start */}
        <Card>
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="text-blue-600" size={24} />
            Guide de Configuration Rapide
          </h3>

          <div className="space-y-6">
            {/* Étape 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 mb-2">Compte Twilio</h4>
                <p className="text-gray-700 mb-3">
                  Créez ou connectez-vous à votre compte Twilio
                </p>
                <a
                  href="https://console.twilio.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <ExternalLink size={16} />
                  Ouvrir Twilio Console
                </a>
              </div>
            </div>

            {/* Étape 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 mb-2">Identifiants Twilio</h4>
                <p className="text-gray-700 mb-3">
                  Récupérez vos identifiants dans la Twilio Console
                </p>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-600">Account SID</span>
                      <button
                        onClick={() => copyToClipboard(config.accountSid, 'sid')}
                        className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                      >
                        <Copy size={14} />
                        {copied === 'sid' ? 'Copié !' : 'Copier'}
                      </button>
                    </div>
                    <code className="text-sm text-gray-900">{config.accountSid}</code>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-600">Auth Token</span>
                      <span className="text-amber-600 text-xs">⚠️ Gardez-le secret</span>
                    </div>
                    <code className="text-sm text-gray-900">{config.authToken}</code>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-600">Phone Number</span>
                      <button
                        onClick={() => copyToClipboard(config.phoneNumber, 'phone')}
                        className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                      >
                        <Copy size={14} />
                        {copied === 'phone' ? 'Copié !' : 'Copier'}
                      </button>
                    </div>
                    <code className="text-sm text-gray-900">{config.phoneNumber}</code>
                  </div>
                </div>
              </div>
            </div>

            {/* Étape 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 mb-2">Activer WhatsApp Sandbox</h4>
                <p className="text-gray-700 mb-3">
                  Dans Twilio : Messaging → Try it out → Send a WhatsApp message
                </p>
                <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg">
                  <p className="text-sm text-green-900 mb-2 font-medium">
                    📱 Envoyez ce message depuis votre WhatsApp au numéro Twilio :
                  </p>
                  <div className="bg-white p-3 rounded border border-green-200 flex items-center justify-between">
                    <code className="text-green-900 font-mono">join [votre-code]</code>
                    <button
                      onClick={() => copyToClipboard('join', 'join')}
                      className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1"
                    >
                      <Copy size={14} />
                      {copied === 'join' ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                  <p className="text-xs text-green-700 mt-2">
                    ℹ️ Le code exact est visible dans la Twilio Console
                  </p>
                </div>
              </div>
            </div>

            {/* Étape 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 mb-2">Configurer le Webhook</h4>
                <p className="text-gray-700 mb-3">
                  Dans Twilio : Messaging → WhatsApp Sandbox Settings
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      When a message comes in :
                    </label>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                      <code className="text-sm text-gray-900 break-all">{config.webhookUrl}</code>
                      <button
                        onClick={() => copyToClipboard(config.webhookUrl, 'webhook')}
                        className="ml-2 text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 flex-shrink-0"
                      >
                        <Copy size={14} />
                        {copied === 'webhook' ? 'Copié !' : 'Copier'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Méthode : HTTP POST</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Étape 5 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                5
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 mb-2">Test Final</h4>
                <p className="text-gray-700 mb-3">
                  Envoyez un message WhatsApp au numéro Twilio et vérifiez qu'il apparaît dans le backoffice
                </p>
                <div className="flex gap-3">
                  <a
                    href="/backoffice/whatsapp"
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                  >
                    <MessageSquare size={18} />
                    Ouvrir WhatsApp Manager
                  </a>
                  <button
                    onClick={testWebhook}
                    className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    🧪 Tester le Webhook
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Variables d'Environnement */}
        <Card className="bg-amber-50 border-amber-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Key className="text-amber-600" size={24} />
            Variables d'Environnement Required
          </h3>
          <p className="text-gray-700 mb-4">
            Ajoutez ces variables dans votre fichier <code className="bg-white px-2 py-1 rounded">.env</code> :
          </p>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
            <pre>{`# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER=+16058006320
TWILIO_WHATSAPP_NUMBER=whatsapp:+16058006320`}</pre>
          </div>
          <div className="mt-4 flex items-start gap-2 text-amber-800">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              <strong>Important :</strong> Après avoir modifié le fichier .env, redémarrez l'application pour que les changements prennent effet.
            </p>
          </div>
        </Card>

        {/* Resources */}
        <Card>
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            📚 Ressources Utiles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://www.twilio.com/docs/whatsapp"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="font-bold text-gray-900">Documentation Twilio</div>
                <div className="text-sm text-gray-600">Guide officiel WhatsApp Business API</div>
              </div>
              <ExternalLink size={20} className="text-gray-400 group-hover:text-blue-600" />
            </a>

            <a
              href="https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="font-bold text-gray-900">WhatsApp Sandbox</div>
                <div className="text-sm text-gray-600">Activer et configurer le sandbox</div>
              </div>
              <ExternalLink size={20} className="text-gray-400 group-hover:text-blue-600" />
            </a>

            <a
              href="https://console.twilio.com/us1/develop/sms/settings/whatsapp-sender-registration"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="font-bold text-gray-900">Mode Production</div>
                <div className="text-sm text-gray-600">Demander un numéro WhatsApp officiel</div>
              </div>
              <ExternalLink size={20} className="text-gray-400 group-hover:text-blue-600" />
            </a>

            <a
              href="https://www.twilio.com/console/sms/whatsapp/templates"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="font-bold text-gray-900">Message Templates</div>
                <div className="text-sm text-gray-600">Créer et soumettre des templates</div>
              </div>
              <ExternalLink size={20} className="text-gray-400 group-hover:text-blue-600" />
            </a>
          </div>
        </Card>

        {/* Help */}
        <Card className="bg-blue-50 border-blue-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            🆘 Besoin d'Aide ?
          </h3>
          <div className="space-y-3 text-gray-700">
            <div className="flex items-start gap-3">
              <Check className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <strong>Documentation complète :</strong> Consultez <code className="bg-white px-2 py-1 rounded">GUIDE_TWILIO_WHATSAPP_SETUP.md</code> pour un guide détaillé
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <strong>Quick Start :</strong> Voir <code className="bg-white px-2 py-1 rounded">TWILIO_WHATSAPP_QUICKSTART.md</code> pour une configuration en 10 minutes
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <strong>Support Twilio :</strong> <a href="https://support.twilio.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">support.twilio.com</a>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
