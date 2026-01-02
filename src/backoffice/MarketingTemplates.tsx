import React, { useState, useEffect } from 'react';
import { MessageSquare, Mail, FileText, Copy, CheckCircle, Download, ExternalLink, QrCode, Eye, Sparkles, TrendingUp, Link2, BarChart3, History, RefreshCw } from 'lucide-react';
import Card from '../components/Card';
import marketingTemplates from '../data/marketing-templates.json';
import HelpPanel from '../components/HelpPanel';
import { getHelpConfig } from '../lib/help-configs';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface CopyHistory {
  id: string;
  template_type: string;
  template_id: string;
  copied_at: string;
}

interface TemplateStats {
  total_copies: number;
  total_downloads: number;
  most_used: string;
  last_copy: string | null;
}

const MarketingTemplates: React.FC = () => {
  const [copied, setCopied] = useState<string>('');
  const [ambassadorCode, setAmbassadorCode] = useState<string>('AMB123');
  const [ambassadorName, setAmbassadorName] = useState<string>('Jean');
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'whatsapp' | 'email' | 'linkedin'>('whatsapp');
  const [copyHistory, setCopyHistory] = useState<CopyHistory[]>([]);
  const [stats, setStats] = useState<TemplateStats>({
    total_copies: 0,
    total_downloads: 0,
    most_used: '-',
    last_copy: null
  });
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [generatingQR, setGeneratingQR] = useState(false);
  const [shortUrl, setShortUrl] = useState<string>('');
  const [generatingVariant, setGeneratingVariant] = useState(false);
  const [aiVariant, setAiVariant] = useState<string>('');

  useEffect(() => {
    loadStats();
    loadCopyHistory();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await supabase
        .from('marketing_template_usage')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (data) {
        const totalCopies = data.filter(d => d.action === 'copy').length;
        const totalDownloads = data.filter(d => d.action === 'download').length;

        const templateCounts: Record<string, number> = {};
        data.forEach(d => {
          templateCounts[d.template_id] = (templateCounts[d.template_id] || 0) + 1;
        });

        const mostUsed = Object.entries(templateCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

        const lastCopy = data[0]?.created_at || null;

        setStats({ total_copies: totalCopies, total_downloads: totalDownloads, most_used: mostUsed, last_copy: lastCopy });
      }
    } catch (error) {
      logger.error('Error loading stats:', error);
    }
  };

  const loadCopyHistory = async () => {
    try {
      const { data } = await supabase
        .from('marketing_template_usage')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setCopyHistory(data.map(d => ({
          id: d.id,
          template_type: d.template_type,
          template_id: d.template_id,
          copied_at: d.created_at
        })));
      }
    } catch (error) {
      logger.error('Error loading history:', error);
    }
  };

  const trackUsage = async (templateType: string, templateId: string, action: 'copy' | 'download') => {
    try {
      await supabase.from('marketing_template_usage').insert({
        template_type: templateType,
        template_id: templateId,
        action: action,
        ambassador_code: ambassadorCode
      });
      await loadStats();
      await loadCopyHistory();
    } catch (error) {
      logger.error('Error tracking usage:', error);
    }
  };

  const handleCopy = async (text: string, id: string, type: string = 'whatsapp') => {
    const personalizedText = text
      .replace(/{CODE}/g, ambassadorCode)
      .replace(/{Prénom}/g, ambassadorName)
      .replace(/{{name}}/g, ambassadorName);

    navigator.clipboard.writeText(personalizedText);
    setCopied(id);
    await trackUsage(type, id, 'copy');
    setTimeout(() => setCopied(''), 2000);
  };

  const downloadTemplate = async (content: string, filename: string, type: string = 'presse', id: string = 'download') => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    await trackUsage(type, id, 'download');
  };

  const generateQRCode = async () => {
    setGeneratingQR(true);
    try {
      const url = `https://taxiassur.com/devis?ref=${ambassadorCode}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url)}`;
      setQrCodeUrl(qrUrl);
    } catch (error) {
      logger.error('Error generating QR code:', error);
    } finally {
      setGeneratingQR(false);
    }
  };

  const shortenUrl = async () => {
    const longUrl = `https://taxiassur.com/devis?ref=${ambassadorCode}`;
    setShortUrl(longUrl);
  };

  const generateAIVariant = async (originalText: string) => {
    setGeneratingVariant(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-seo-content', {
        body: {
          prompt: `Réécris ce message marketing de manière plus engageante et persuasive, en gardant le même sens : "${originalText}"`,
          max_length: 500
        }
      });

      if (error) throw error;
      setAiVariant(data?.content || 'Erreur de génération');
    } catch (error) {
      logger.error('Error generating variant:', error);
      setAiVariant('Erreur lors de la génération de variante');
    } finally {
      setGeneratingVariant(false);
    }
  };

  const openPreview = (text: string, type: 'whatsapp' | 'email' | 'linkedin') => {
    setShowPreview(text);
    setPreviewType(type);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <FileText className="w-8 h-8" />
                Templates Marketing
              </h1>
              <p className="text-orange-100 mt-2">
                Messages prêts à l'emploi pour WhatsApp, LinkedIn, Email et Presse
              </p>
            </div>
            <button
              onClick={() => { loadStats(); loadCopyHistory(); }}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center space-x-2"
            >
              <RefreshCw size={18} />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Copies</p>
                <p className="text-3xl font-bold text-gray-800">{stats.total_copies}</p>
              </div>
              <Copy size={32} className="text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Téléchargements</p>
                <p className="text-3xl font-bold text-gray-800">{stats.total_downloads}</p>
              </div>
              <Download size={32} className="text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Plus Utilisé</p>
                <p className="text-lg font-bold text-gray-800 truncate">{stats.most_used}</p>
              </div>
              <TrendingUp size={32} className="text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Dernier Usage</p>
                <p className="text-sm font-medium text-gray-800">
                  {stats.last_copy ? new Date(stats.last_copy).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                </p>
              </div>
              <BarChart3 size={32} className="text-purple-500" />
            </div>
          </div>
        </div>

        {/* Personnalisation */}
        <Card className="bg-slate-800 border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">
            🎯 Personnalisation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Code Ambassadeur
              </label>
              <input
                type="text"
                value={ambassadorCode}
                onChange={(e) => setAmbassadorCode(e.target.value)}
                className="w-full bg-slate-700 border-slate-600 text-white px-4 py-2 rounded-lg"
                placeholder="AMB123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Prénom du Contact
              </label>
              <input
                type="text"
                value={ambassadorName}
                onChange={(e) => setAmbassadorName(e.target.value)}
                className="w-full bg-slate-700 border-slate-600 text-white px-4 py-2 rounded-lg"
                placeholder="Jean"
              />
            </div>
          </div>
        </Card>

        {/* Messages WhatsApp */}
        <Card className="bg-slate-800 border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-green-400" />
            Messages WhatsApp
          </h2>

          <div className="space-y-4">
            {Object.entries(marketingTemplates.whatsapp).map(([key, template]) => (
              <div key={key} className="bg-slate-700 p-4 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{template.titre}</h3>
                    <p className="text-sm text-slate-400 mt-1">{template.usage}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(template.texte, `whatsapp-${key}`)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                  >
                    {copied === `whatsapp-${key}` ? (
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
                <pre className="bg-slate-800 p-4 rounded text-slate-300 text-sm whitespace-pre-wrap">
                  {template.texte
                    .replace(/{CODE}/g, ambassadorCode)
                    .replace(/{Prénom}/g, ambassadorName)}
                </pre>
              </div>
            ))}
          </div>
        </Card>

        {/* LinkedIn - Page Vitrine */}
        <Card className="bg-slate-800 border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <ExternalLink className="w-6 h-6 text-orange-400" />
            LinkedIn - Configuration Page Vitrine
          </h2>

          <div className="space-y-4">
            {/* Description Courte */}
            <div className="bg-slate-700 p-4 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">Description Courte</h3>
                <button
                  onClick={() => handleCopy(marketingTemplates.linkedin.showcase_description_courte, 'linkedin-short')}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  {copied === 'linkedin-short' ? (
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
              <p className="text-slate-300 text-sm">
                {marketingTemplates.linkedin.showcase_description_courte}
              </p>
            </div>

            {/* Description Longue */}
            <div className="bg-slate-700 p-4 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">Description Longue (À propos)</h3>
                <button
                  onClick={() => handleCopy(marketingTemplates.linkedin.showcase_description_longue, 'linkedin-long')}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  {copied === 'linkedin-long' ? (
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
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">
                {marketingTemplates.linkedin.showcase_description_longue}
              </pre>
            </div>

            {/* Lead Gen Form */}
            <div className="bg-slate-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">Formulaire Lead Gen</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-400">Titre (50 caractères max)</label>
                  <p className="text-slate-200 mt-1">{marketingTemplates.linkedin.lead_gen_form.titre}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">Corps de texte (200 caractères max)</label>
                  <p className="text-slate-200 mt-1">{marketingTemplates.linkedin.lead_gen_form.corps}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">CTA</label>
                  <p className="text-slate-200 mt-1">{marketingTemplates.linkedin.lead_gen_form.cta}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">URL Politique de Confidentialité</label>
                  <p className="text-orange-400 mt-1">{marketingTemplates.linkedin.lead_gen_form.privacy_url}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* LinkedIn - Posts */}
        <Card className="bg-slate-800 border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <ExternalLink className="w-6 h-6 text-orange-400" />
            LinkedIn - Posts Prêts à Publier
          </h2>

          <div className="space-y-4">
            {Object.entries(marketingTemplates.linkedin.posts).map(([key, post]) => (
              <div key={key} className="bg-slate-700 p-4 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{post.titre}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {post.hashtags.map((tag) => (
                        <span key={tag} className="text-xs bg-orange-600 text-white px-2 py-1 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(post.texte, `linkedin-post-${key}`)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    {copied === `linkedin-post-${key}` ? (
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
                <pre className="bg-slate-800 p-4 rounded text-slate-300 text-sm whitespace-pre-wrap mt-3">
                  {post.texte}
                </pre>
              </div>
            ))}
          </div>
        </Card>

        {/* Communiqué de Presse */}
        <Card className="bg-slate-800 border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-400" />
            Communiqué de Presse
          </h2>

          <div className="space-y-4">
            <div className="bg-slate-700 p-4 rounded-lg">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Template Complet</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(
                      `${marketingTemplates.presse.communique_template.objet}\n\n${marketingTemplates.presse.communique_template.intro}\n\nPoints clés :\n${marketingTemplates.presse.communique_template.points_cles.join('\n')}\n\n${marketingTemplates.presse.communique_template.contact.label}\n${marketingTemplates.presse.communique_template.contact.fields.join('\n')}\n\n${marketingTemplates.presse.communique_template.contact.note}`,
                      'presse'
                    )}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    {copied === 'presse' ? (
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
                  <button
                    onClick={() => downloadTemplate(
                      `${marketingTemplates.presse.communique_template.objet}\n\n${marketingTemplates.presse.communique_template.intro}\n\nPoints clés :\n${marketingTemplates.presse.communique_template.points_cles.join('\n')}\n\n${marketingTemplates.presse.communique_template.contact.label}\n${marketingTemplates.presse.communique_template.contact.fields.join('\n')}\n\n${marketingTemplates.presse.communique_template.contact.note}`,
                      'communique-presse-taxiassur.txt'
                    )}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger
                  </button>
                </div>
              </div>

              <div className="space-y-3 text-slate-300">
                <div>
                  <h4 className="font-semibold text-white mb-2">Objet :</h4>
                  <p>{marketingTemplates.presse.communique_template.objet}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Introduction :</h4>
                  <p className="whitespace-pre-wrap">{marketingTemplates.presse.communique_template.intro}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Points clés :</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {marketingTemplates.presse.communique_template.points_cles.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Email Templates */}
        <Card className="bg-slate-800 border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Mail className="w-6 h-6 text-red-400" />
            Email Templates
          </h2>

          <div className="space-y-4">
            <div className="bg-slate-700 p-4 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-white">Confirmation Lead LinkedIn</h3>
                  <p className="text-sm text-slate-400 mt-1">Email automatique après soumission formulaire</p>
                </div>
                <button
                  onClick={() => handleCopy(
                    `Objet: ${marketingTemplates.email.confirmation_lead_linkedin.objet}\n\n${marketingTemplates.email.confirmation_lead_linkedin.corps}`,
                    'email-confirm'
                  )}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  {copied === 'email-confirm' ? (
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
              <div className="space-y-2 mt-3">
                <div>
                  <span className="text-sm font-medium text-slate-400">Objet :</span>
                  <p className="text-slate-200">{marketingTemplates.email.confirmation_lead_linkedin.objet}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-400">Corps :</span>
                  <pre className="text-slate-200 whitespace-pre-wrap mt-1">
                    {marketingTemplates.email.confirmation_lead_linkedin.corps}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Instructions QR Codes */}
        <Card className="bg-slate-800 border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">
            📱 Instructions QR Codes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">Spécifications</h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li><strong>Taille minimale:</strong> {marketingTemplates.qr_code.instructions.specs.taille_minimale}</li>
                <li><strong>Format:</strong> {marketingTemplates.qr_code.instructions.specs.format}</li>
                <li><strong>Résolution:</strong> {marketingTemplates.qr_code.instructions.specs.resolution}</li>
                <li><strong>Texte:</strong> {marketingTemplates.qr_code.instructions.specs.texte_accompagnement}</li>
              </ul>
            </div>

            <div className="bg-slate-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">Outils Recommandés</h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                {marketingTemplates.qr_code.instructions.outils_recommandes.map((outil, index) => (
                  <li key={index}>• {outil}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>
      {/* Help Panel */}
      <HelpPanel
        {...getHelpConfig('marketing-templates')}
        quickActions={[
          {
            label: 'Générer QR Codes',
            action: () => window.location.href = '/backoffice/qr-codes',
            icon: <QrCode className="w-4 h-4" />
          },
          {
            label: 'Réseaux Sociaux',
            action: () => window.location.href = '/backoffice/social-media',
            icon: <MessageSquare className="w-4 h-4" />
          }
        ]}
      />
    </div>
  );
};

export default MarketingTemplates;
