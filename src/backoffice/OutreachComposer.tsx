import React, { useState, useEffect } from 'react';
import { Send, Mail, Clock, AlertTriangle, CheckCircle, Eye, Copy, Home } from 'lucide-react';
import { getProspects, getOutreaches, saveOutreach, sendOutreach } from '../lib/partners';
import { getTemplates, renderTemplate, generateUnsubscribeToken, validateEmailContent } from '../lib/outreach';
import { Prospect, Outreach } from '../lib/schema';
import Card from '../components/Card';
import { logger } from '@/lib/logger';

const OutreachComposer: React.FC = () => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [outreaches, setOutreaches] = useState<Outreach[]>([]);
  const [templates] = useState(getTemplates());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [selectedProspects, setSelectedProspects] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]?.id || '');
  const [customVariables, setCustomVariables] = useState<Record<string, string>>({});
  const [previewProspect, setPreviewProspect] = useState<Prospect | null>(null);

  const [emailValidation, setEmailValidation] = useState<{
    valid: boolean;
    warnings: string[];
    spamScore: number;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prospectsData, outreachData] = await Promise.all([
        getProspects(),
        getOutreaches()
      ]);
      
      setProspects(prospectsData.filter(p => p.status === 'qualified' && p.publicEmail));
      setOutreaches(outreachData);
    } catch (error) {
      logger.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const qualifiedProspects = prospects.filter(p => 
    p.status === 'qualified' && 
    p.publicEmail &&
    !outreaches.some(o => o.prospectId === p.id && o.status !== 'optout')
  );

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    setEmailValidation(null);
  };

  const generatePreview = () => {
    if (!previewProspect || !selectedTemplate) return null;

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return null;

    const variables = {
      org: previewProspect.name || previewProspect.domain,
      domain: previewProspect.domain,
      exampleUrl: `${import.meta.env.VITE_SITE_URL}/blog/assurance-taxi-2024`,
      offerUrl: `${import.meta.env.VITE_SITE_URL}/offres`,
      resourceUrl: `${import.meta.env.VITE_SITE_URL}/guides`,
      siteUrl: import.meta.env.VITE_SITE_URL || 'https://taxiassur.com',
      ...customVariables
    };

    const rendered = renderTemplate(template, variables);
    
    // Validate email content
    const validation = validateEmailContent(rendered.subject, rendered.body);
    setEmailValidation(validation);
    
    return rendered;
  };

  const sendCampaign = async () => {
    if (selectedProspects.length === 0 || !selectedTemplate) {
      alert('Sélectionnez des prospects et un template');
      return;
    }

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    setSending(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const prospectId of selectedProspects) {
        const prospect = prospects.find(p => p.id === prospectId);
        if (!prospect || !prospect.publicEmail) continue;

        const variables = {
          org: prospect.name || prospect.domain,
          domain: prospect.domain,
          exampleUrl: `${import.meta.env.VITE_SITE_URL}/blog/assurance-taxi-2024`,
          offerUrl: `${import.meta.env.VITE_SITE_URL}/offres`,
          resourceUrl: `${import.meta.env.VITE_SITE_URL}/guides`,
          siteUrl: import.meta.env.VITE_SITE_URL || 'https://taxiassur.com',
          ...customVariables
        };

        const rendered = renderTemplate(template, variables);
        const unsubscribeToken = generateUnsubscribeToken(prospect.publicEmail);

        const outreach: Outreach = {
          id: `outreach-${prospect.id}-${Date.now()}`,
          prospectId: prospect.id,
          templateId: selectedTemplate,
          subject: rendered.subject,
          body: rendered.body,
          recipientEmail: prospect.publicEmail,
          provider: 'SMTP',
          status: 'scheduled',
          unsubscribeToken,
          variables
        };

        try {
          const result = await sendOutreach(outreach);
          if (result) {
            successCount++;
          } else {
            errorCount++;
          }
          
          // Wait between sends (rate limiting)
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          logger.error(`Failed to send to ${prospect.publicEmail}:`, error);
          errorCount++;
        }
      }

      alert(`✅ Campagne terminée !\n${successCount} envoyés, ${errorCount} erreurs`);
      setSelectedProspects([]);
      loadData(); // Refresh data
    } catch (error) {
      logger.error('Campaign error:', error);
      alert('❌ Erreur lors de la campagne');
    } finally {
      setSending(false);
    }
  };

  const preview = generatePreview();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="h-96 bg-gray-200 rounded"></div>
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
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Mail className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Compositeur d'Outreach
                  </h1>
                  <p className="text-sm text-gray-600">
                    Campagnes email conformes RGPD avec opt-out
                  </p>
                </div>
              </div>
              
              <a
                href="/backoffice"
                className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
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
              <div className="text-sm text-gray-600">
                {selectedProspects.length} sélectionnés
              </div>
              <button
                onClick={sendCampaign}
                disabled={sending || selectedProspects.length === 0 || !selectedTemplate}
                className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {sending ? (
                  <>
                    <Clock size={16} className="animate-spin" />
                    <span>Envoi...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Envoyer Campagne</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Prospects & Templates */}
            <div className="space-y-6">
              {/* Template Selection */}
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Template Email
                </h3>
                <div className="space-y-3">
                  {templates.map(template => (
                    <label key={template.id} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="template"
                        value={template.id}
                        checked={selectedTemplate === template.id}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                        className="text-orange-600"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{template.label}</div>
                        <div className="text-sm text-gray-600">{template.subject}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </Card>

              {/* Custom Variables */}
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Variables Personnalisées
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL d'exemple
                    </label>
                    <input
                      type="url"
                      value={customVariables.exampleUrl || ''}
                      onChange={(e) => setCustomVariables(prev => ({ ...prev, exampleUrl: e.target.value }))}
                      placeholder="https://taxiassur.com/blog/exemple"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL d'offre
                    </label>
                    <input
                      type="url"
                      value={customVariables.offerUrl || ''}
                      onChange={(e) => setCustomVariables(prev => ({ ...prev, offerUrl: e.target.value }))}
                      placeholder="https://taxiassur.com/offres/partenaires"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </Card>

              {/* Prospect Selection */}
              <Card>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Prospects Qualifiés ({qualifiedProspects.length})
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedProspects(qualifiedProspects.map(p => p.id))}
                      className="text-sm text-orange-600 hover:text-orange-800"
                    >
                      Tout sélectionner
                    </button>
                    <button
                      onClick={() => setSelectedProspects([])}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Tout désélectionner
                    </button>
                  </div>
                </div>
                
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {qualifiedProspects.map(prospect => (
                    <label key={prospect.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedProspects.includes(prospect.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProspects(prev => [...prev, prospect.id]);
                          } else {
                            setSelectedProspects(prev => prev.filter(id => id !== prospect.id));
                          }
                        }}
                        className="text-orange-600"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{prospect.name}</div>
                        <div className="text-sm text-gray-600">{prospect.domain}</div>
                      </div>
                      <button
                        onClick={() => setPreviewProspect(prospect)}
                        className="text-orange-600 hover:text-orange-800"
                      >
                        <Eye size={16} />
                      </button>
                    </label>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Column - Preview */}
            <div className="space-y-6">
              {/* Preview Controls */}
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Aperçu Email
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aperçu pour
                  </label>
                  <select
                    value={previewProspect?.id || ''}
                    onChange={(e) => {
                      const prospect = prospects.find(p => p.id === e.target.value);
                      setPreviewProspect(prospect || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un prospect</option>
                    {qualifiedProspects.map(prospect => (
                      <option key={prospect.id} value={prospect.id}>
                        {prospect.name} ({prospect.domain})
                      </option>
                    ))}
                  </select>
                </div>

                {preview && (
                  <div className="space-y-4">
                    {/* Email Validation */}
                    {emailValidation && (
                      <div className={`p-4 rounded-lg border ${
                        emailValidation.valid 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center space-x-2 mb-2">
                          {emailValidation.valid ? (
                            <CheckCircle className="text-green-600" size={16} />
                          ) : (
                            <AlertTriangle className="text-red-600" size={16} />
                          )}
                          <span className={`font-medium ${
                            emailValidation.valid ? 'text-green-900' : 'text-red-900'
                          }`}>
                            Score Spam: {emailValidation.spamScore}/100
                          </span>
                        </div>
                        
                        {emailValidation.warnings.length > 0 && (
                          <ul className="text-sm space-y-1">
                            {emailValidation.warnings.map((warning, index) => (
                              <li key={index} className="text-red-700">• {warning}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* Subject Preview */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Sujet</label>
                        <button
                          onClick={() => navigator.clipboard.writeText(preview.subject)}
                          className="text-gray-600 hover:text-gray-600"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg font-medium">
                        {preview.subject}
                      </div>
                    </div>

                    {/* Body Preview */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Corps du message</label>
                        <button
                          onClick={() => navigator.clipboard.writeText(preview.body)}
                          className="text-gray-600 hover:text-gray-600"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {preview.body}
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Campaign Stats */}
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Statistiques Campagne
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{selectedProspects.length}</div>
                    <div className="text-sm text-gray-600">Destinataires</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(selectedProspects.length * 2.5)}min
                    </div>
                    <div className="text-sm text-gray-600">Durée estimée</div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-yellow-800">
                    <Clock size={16} />
                    <span className="text-sm font-medium">
                      Limite: 30 emails/heure (respect des bonnes pratiques)
                    </span>
                  </div>
                </div>
              </Card>

              {/* Recent Outreach */}
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Derniers Envois
                </h3>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {outreaches
                    .filter(o => o.sentAt)
                    .sort((a, b) => new Date(b.sentAt!).getTime() - new Date(a.sentAt!).getTime())
                    .slice(0, 10)
                    .map(outreach => {
                      const prospect = prospects.find(p => p.id === outreach.prospectId);
                      return (
                        <div key={outreach.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <div className="text-sm font-medium">{prospect?.name || 'Prospect supprimé'}</div>
                            <div className="text-xs text-gray-600">
                              {new Date(outreach.sentAt!).toLocaleString('fr-FR')}
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            outreach.status === 'sent' ? 'bg-green-100 text-green-800' :
                            outreach.status === 'bounced' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {outreach.status}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    
  );
};

export default OutreachComposer;