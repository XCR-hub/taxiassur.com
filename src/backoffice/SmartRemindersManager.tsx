import React, { useState, useEffect } from 'react';
import { Bell, Clock, CheckCircle, XCircle, Play, Pause, Mail, MessageSquare, Phone, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ReminderTemplate {
  id: string;
  name: string;
  reminder_type: string;
  trigger_condition: string;
  delay_hours: number;
  max_attempts: number;
  channel: string;
  active: boolean;
  content_template: string;
  subject_template: string;
}

const SmartRemindersManager: React.FC = () => {
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [automationDate, setAutomationDate] = useState<string>('04/01/2026');

  useEffect(() => {
    loadTemplates();
    loadAutomationDate();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('reminder_templates')
        .select('*')
        .order('name');

      if (error) throw error;

      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAutomationDate = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'automation_start_date')
        .single();

      if (data && data.value) {
        const date = new Date(data.value);
        setAutomationDate(date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }));
      }
    } catch (error) {
      console.error('Error loading date:', error);
    }
  };

  const toggleTemplate = async (templateId: string, currentStatus: boolean) => {
    try {
      const functionName = currentStatus ? 'deactivate_reminder_template' : 'activate_reminder_template';

      const { error } = await supabase.rpc(functionName, {
        p_template_id: templateId
      });

      if (error) throw error;

      await loadTemplates();
    } catch (error) {
      console.error('Error toggling template:', error);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'sms':
        return <MessageSquare className="w-5 h-5" />;
      case 'whatsapp':
        return <Phone className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      document_request: 'Demande Documents',
      review_request: 'Demande Avis',
      follow_up: 'Relance Lead',
      email: 'Email',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const activeCount = templates.filter(t => t.active).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-10 h-10 text-orange-600" />
          <div>
            <h1 className="text-3xl font-bold">Relances Intelligentes</h1>
            <p className="text-gray-600">Automation multi-canal (nouveaux leads uniquement)</p>
          </div>
        </div>

        <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg">
          <span className="font-bold">{activeCount}/{templates.length}</span> Templates Actifs
        </div>
      </div>

      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-blue-900">Filtre de Date Actif</h3>
        </div>
        <p className="text-blue-700 mb-2">
          Ces templates s'appliquent <strong>UNIQUEMENT</strong> aux leads créés depuis le <strong>{automationDate}</strong>.
        </p>
        <p className="text-sm text-blue-600">
          Les leads existants (créés avant cette date) ne recevront AUCUN email automatique.
        </p>
      </div>

      {activeCount === templates.length && templates.length > 0 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-bold text-green-900">Tous les Templates sont Actifs</h3>
          </div>
          <p className="text-green-700">
            Les relances automatiques sont configurées et actives pour tous les nouveaux leads.
            Vous pouvez désactiver individuellement celles dont vous n'avez pas besoin.
          </p>
        </div>
      )}

      <div className="grid gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`bg-white rounded-lg shadow-lg p-6 border-2 transition ${
              template.active
                ? 'border-green-300 bg-green-50/30'
                : 'border-gray-200 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${
                    template.active ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {getChannelIcon(template.channel)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{template.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        {getTypeLabel(template.reminder_type)}
                      </span>
                      <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {template.channel.toUpperCase()}
                      </span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Nouveaux leads uniquement
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Délai</div>
                    <div className="font-bold text-lg">
                      <Clock className="w-4 h-4 inline mr-1" />
                      {template.delay_hours}h
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Tentatives Max</div>
                    <div className="font-bold text-lg">{template.max_attempts}x</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Condition</div>
                    <div className="font-medium text-sm">{template.trigger_condition}</div>
                  </div>
                </div>

                {template.subject_template && (
                  <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                    <div className="text-xs text-blue-600 font-medium mb-1">SUJET</div>
                    <div className="text-sm text-blue-900">{template.subject_template}</div>
                  </div>
                )}

                <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="text-xs text-gray-600 font-medium mb-1">CONTENU</div>
                  <div className="text-sm text-gray-700 whitespace-pre-line line-clamp-3">
                    {template.content_template}
                  </div>
                </div>
              </div>

              <button
                onClick={() => toggleTemplate(template.id, template.active)}
                className={`ml-4 flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition ${
                  template.active
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {template.active ? (
                  <>
                    <Pause className="w-5 h-5" />
                    Désactiver
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Activer
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Bell className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Aucun template configuré</p>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-2">Fonctionnement des Relances (Nouveaux Leads Uniquement) :</h3>
        <ul className="space-y-2 text-blue-700">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span><strong>Demande Documents :</strong> Envoyée 24h après détection (nouveaux leads uniquement)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span><strong>Relance Lead :</strong> Envoyée 7j après dernière activité (nouveaux leads uniquement)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span><strong>Demande Avis :</strong> Envoyée 7j après conversion en client (nouveaux leads uniquement)</span>
          </li>
          <li className="flex items-start gap-2">
            <Calendar className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-600" />
            <span className="font-bold">Date de coupure : {automationDate} - Les leads avant cette date ne sont PAS traités</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SmartRemindersManager;
