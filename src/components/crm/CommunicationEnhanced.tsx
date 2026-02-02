import { useState, useEffect } from 'react';
import {
  Mail,
  MessageSquare,
  Phone,
  Send,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
  Zap,
  Copy,
  TrendingUp
} from 'lucide-react';
import AnimatedStatCard from '@/components/AnimatedStatCard';
import ContextualTooltip from '@/components/ContextualTooltip';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  type: 'email' | 'sms' | 'whatsapp';
  content: string;
  subject?: string;
  sent_at: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  direction: 'inbound' | 'outbound';
}

interface CommunicationEnhancedProps {
  leadId: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  onMessageSent?: () => void;
}

const SMART_TEMPLATES = {
  email: [
    {
      id: 'welcome',
      name: 'Bienvenue',
      subject: 'Bienvenue chez TaxiAssur',
      body: `Bonjour {{name}},

Merci pour votre confiance ! Nous sommes ravis de vous accompagner dans votre projet d'assurance taxi.

Un conseiller dédié va étudier votre dossier et vous recontacter sous 24h pour vous proposer les meilleures offres du marché.

En attendant, n'hésitez pas à nous contacter si vous avez la moindre question.

Cordialement,
L'équipe TaxiAssur`
    },
    {
      id: 'documents',
      name: 'Demande de documents',
      subject: 'Documents nécessaires pour votre dossier',
      body: `Bonjour {{name}},

Pour finaliser votre dossier et obtenir vos devis personnalisés, nous avons besoin des documents suivants :

• Licence de taxi
• Permis de conduire
• Pièce d'identité
• Carte grise du véhicule
• Relevé d'information
• RIB

Vous pouvez les envoyer par email ou directement via votre espace sécurisé.

Cordialement,
L'équipe TaxiAssur`
    },
    {
      id: 'quote_ready',
      name: 'Devis disponibles',
      subject: 'Vos devis personnalisés sont prêts !',
      body: `Bonjour {{name}},

Excellente nouvelle ! Nous avons reçu plusieurs devis personnalisés pour votre assurance taxi.

Vous pouvez les consulter dès maintenant depuis votre espace personnel sécurisé.

Nos conseillers restent à votre disposition pour vous aider à choisir l'offre la plus adaptée à vos besoins.

Cordialement,
L'équipe TaxiAssur`
    }
  ],
  sms: [
    {
      id: 'welcome',
      name: 'Bienvenue',
      body: 'Bonjour {{name}}, merci pour votre demande TaxiAssur ! Un conseiller vous contacte sous 24h.'
    },
    {
      id: 'reminder',
      name: 'Rappel RDV',
      body: 'Rappel : RDV téléphonique aujourd\'hui à {{time}}. À tout de suite ! TaxiAssur'
    },
    {
      id: 'documents_received',
      name: 'Documents reçus',
      body: 'Documents bien reçus ! Traitement en cours. Réponse sous 48h. TaxiAssur'
    }
  ],
  whatsapp: [
    {
      id: 'welcome',
      name: 'Bienvenue',
      body: 'Bonjour {{name}} 👋\n\nMerci pour votre confiance ! Je suis votre conseiller dédié TaxiAssur.\n\nComment puis-je vous aider aujourd\'hui ?'
    },
    {
      id: 'quote_ready',
      name: 'Devis prêts',
      body: 'Bonne nouvelle {{name}} ! ✨\n\nVos devis personnalisés sont disponibles.\n\nVoulez-vous que je vous les envoie par email ?'
    },
    {
      id: 'follow_up',
      name: 'Suivi dossier',
      body: 'Bonjour {{name}},\n\nJe voulais faire un point sur votre dossier.\n\nAvez-vous des questions ? 💬'
    }
  ]
};

export default function CommunicationEnhanced({
  leadId,
  leadName,
  leadEmail,
  leadPhone,
  onMessageSent
}: CommunicationEnhancedProps) {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannel, setActiveChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [sending, setSending] = useState(false);

  // Form states
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [whatsappBody, setWhatsappBody] = useState('');

  useEffect(() => {
    loadMessages();
  }, [leadId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      // Load emails
      const { data: emails } = await supabase
        .from('email_messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(20);

      // Load interactions (SMS, WhatsApp, calls)
      const { data: interactions } = await supabase
        .from('crm_interactions')
        .select('*')
        .eq('lead_id', leadId)
        .in('interaction_type', ['sms', 'whatsapp'])
        .order('interaction_date', { ascending: false })
        .limit(20);

      const allMessages: Message[] = [];

      if (emails) {
        emails.forEach(email => {
          allMessages.push({
            id: `email-${email.id}`,
            type: 'email',
            content: email.preview || email.body_text || '',
            subject: email.subject,
            sent_at: email.sent_at || email.created_at,
            status: email.status || 'sent',
            direction: email.direction || 'outbound'
          });
        });
      }

      if (interactions) {
        interactions.forEach(interaction => {
          allMessages.push({
            id: `${interaction.interaction_type}-${interaction.id}`,
            type: interaction.interaction_type as 'sms' | 'whatsapp',
            content: interaction.notes || '',
            sent_at: interaction.interaction_date,
            status: 'sent',
            direction: interaction.direction || 'outbound'
          });
        });
      }

      allMessages.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());

      setMessages(allMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      alert('Veuillez remplir le sujet et le message');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-crm-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to: leadEmail,
          subject: emailSubject,
          body: emailBody,
          lead_id: leadId
        })
      });

      if (!response.ok) throw new Error('Erreur envoi email');

      setEmailSubject('');
      setEmailBody('');
      await loadMessages();
      onMessageSent?.();
      alert('✅ Email envoyé avec succès');
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const handleSendSMS = async () => {
    if (!smsBody.trim()) {
      alert('Veuillez saisir un message');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to: leadPhone,
          message: smsBody,
          lead_id: leadId
        })
      });

      if (!response.ok) throw new Error('Erreur envoi SMS');

      setSmsBody('');
      await loadMessages();
      onMessageSent?.();
      alert('✅ SMS envoyé avec succès');
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!whatsappBody.trim()) {
      alert('Veuillez saisir un message');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to: leadPhone,
          message: whatsappBody,
          lead_id: leadId
        })
      });

      if (!response.ok) throw new Error('Erreur envoi WhatsApp');

      setWhatsappBody('');
      await loadMessages();
      onMessageSent?.();
      alert('✅ Message WhatsApp envoyé');
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (template: any) => {
    const replacedBody = template.body.replace(/\{\{name\}\}/g, leadName);

    if (activeChannel === 'email') {
      setEmailSubject(template.subject || '');
      setEmailBody(replacedBody);
    } else if (activeChannel === 'sms') {
      setSmsBody(replacedBody);
    } else if (activeChannel === 'whatsapp') {
      setWhatsappBody(replacedBody);
    }
  };

  const stats = {
    total: messages.length,
    emails: messages.filter(m => m.type === 'email').length,
    sms: messages.filter(m => m.type === 'sms').length,
    whatsapp: messages.filter(m => m.type === 'whatsapp').length
  };

  const filteredMessages = messages.filter(m => m.type === activeChannel);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs Communication */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStatCard
          title="Total Messages"
          value={stats.total}
          icon={TrendingUp}
          color="blue"
          animationDuration={1000}
        />

        <AnimatedStatCard
          title="Emails"
          value={stats.emails}
          icon={Mail}
          color="purple"
          animationDuration={1000}
        />

        <AnimatedStatCard
          title="SMS"
          value={stats.sms}
          icon={MessageSquare}
          color="green"
          animationDuration={1000}
        />

        <AnimatedStatCard
          title="WhatsApp"
          value={stats.whatsapp}
          icon={Phone}
          color="emerald"
          animationDuration={1000}
        />
      </div>

      {/* Composer Unifié */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-sm border border-blue-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Send className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Composer un message</h3>
              <p className="text-sm text-gray-600">Choisissez votre canal de communication</p>
            </div>
          </div>
          <ContextualTooltip
            content="Envoyez un message personnalisé via email, SMS ou WhatsApp"
            type="info"
            position="left"
          />
        </div>

        {/* Sélecteur de canal */}
        <div className="flex gap-2 mb-6">
          <ContextualTooltip content="Envoyer un email" type="tip">
            <button
              onClick={() => setActiveChannel('email')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                activeChannel === 'email'
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              )}
            >
              <Mail className="w-4 h-4" />
              <span className="font-medium">Email</span>
            </button>
          </ContextualTooltip>

          <ContextualTooltip content="Envoyer un SMS" type="tip">
            <button
              onClick={() => setActiveChannel('sms')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                activeChannel === 'sms'
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="font-medium">SMS</span>
            </button>
          </ContextualTooltip>

          <ContextualTooltip content="Envoyer via WhatsApp" type="tip">
            <button
              onClick={() => setActiveChannel('whatsapp')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                activeChannel === 'whatsapp'
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              )}
            >
              <Phone className="w-4 h-4" />
              <span className="font-medium">WhatsApp</span>
            </button>
          </ContextualTooltip>
        </div>

        {/* Templates intelligents */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Templates intelligents</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SMART_TEMPLATES[activeChannel].map((template) => (
              <ContextualTooltip
                key={template.id}
                content={`Utiliser le template "${template.name}"`}
                type="tip"
              >
                <button
                  onClick={() => applyTemplate(template)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                >
                  <Zap className="w-3 h-3 text-blue-600" />
                  {template.name}
                </button>
              </ContextualTooltip>
            ))}
          </div>
        </div>

        {/* Formulaire Email */}
        {activeChannel === 'email' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="email-recipient" className="block text-sm font-medium text-gray-700 mb-2">
                Destinataire
              </label>
              <input
                id="email-recipient"
                name="email-recipient"
                type="email"
                value={leadEmail}
                disabled
                autoComplete="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label htmlFor="email-subject" className="block text-sm font-medium text-gray-700 mb-2">
                Sujet *
              </label>
              <input
                id="email-subject"
                name="email-subject"
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Objet de l'email..."
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="email-body" className="block text-sm font-medium text-gray-700 mb-2">
                Message *
              </label>
              <textarea
                id="email-body"
                name="email-body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={8}
                placeholder="Votre message..."
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSendEmail}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer l'email
                </>
              )}
            </button>
          </div>
        )}

        {/* Formulaire SMS */}
        {activeChannel === 'sms' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="sms-phone" className="block text-sm font-medium text-gray-700 mb-2">
                Numéro
              </label>
              <input
                id="sms-phone"
                name="sms-phone"
                type="tel"
                value={leadPhone}
                disabled
                autoComplete="tel"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label htmlFor="sms-body" className="block text-sm font-medium text-gray-700 mb-2">
                Message * <span className="text-xs text-gray-500">({smsBody.length}/160 caractères)</span>
              </label>
              <textarea
                id="sms-body"
                name="sms-body"
                value={smsBody}
                onChange={(e) => setSmsBody(e.target.value)}
                rows={4}
                maxLength={160}
                placeholder="Votre message SMS..."
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={handleSendSMS}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer le SMS
                </>
              )}
            </button>
          </div>
        )}

        {/* Formulaire WhatsApp */}
        {activeChannel === 'whatsapp' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="whatsapp-phone" className="block text-sm font-medium text-gray-700 mb-2">
                Numéro WhatsApp
              </label>
              <input
                id="whatsapp-phone"
                name="whatsapp-phone"
                type="tel"
                value={leadPhone}
                disabled
                autoComplete="tel"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label htmlFor="whatsapp-body" className="block text-sm font-medium text-gray-700 mb-2">
                Message *
              </label>
              <textarea
                id="whatsapp-body"
                name="whatsapp-body"
                value={whatsappBody}
                onChange={(e) => setWhatsappBody(e.target.value)}
                rows={6}
                placeholder="Votre message WhatsApp..."
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={handleSendWhatsApp}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer sur WhatsApp
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Messages envoyés */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Messages {activeChannel === 'email' ? 'Emails' : activeChannel === 'sms' ? 'SMS' : 'WhatsApp'} envoyés ({filteredMessages.length})
        </h3>

        <div className="space-y-3">
          {filteredMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "p-4 rounded-lg border",
                message.direction === 'inbound'
                  ? "bg-blue-50 border-blue-200"
                  : "bg-gray-50 border-gray-200"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {message.type === 'email' && <Mail className="w-4 h-4 text-blue-600" />}
                  {message.type === 'sms' && <MessageSquare className="w-4 h-4 text-green-600" />}
                  {message.type === 'whatsapp' && <Phone className="w-4 h-4 text-emerald-600" />}
                  <span className="text-sm font-medium text-gray-900">
                    {message.direction === 'inbound' ? 'Reçu' : 'Envoyé'}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs",
                    message.status === 'read' && "bg-green-100 text-green-700",
                    message.status === 'delivered' && "bg-blue-100 text-blue-700",
                    message.status === 'sent' && "bg-gray-100 text-gray-700",
                    message.status === 'failed' && "bg-red-100 text-red-700"
                  )}>
                    {message.status}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(message.sent_at).toLocaleString('fr-FR')}
                </span>
              </div>
              {message.subject && (
                <div className="text-sm font-medium text-gray-700 mb-1">
                  {message.subject}
                </div>
              )}
              <p className="text-sm text-gray-600 line-clamp-2">
                {message.content}
              </p>
            </div>
          ))}

          {filteredMessages.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">
                Aucun message {activeChannel === 'email' ? 'email' : activeChannel === 'sms' ? 'SMS' : 'WhatsApp'} pour le moment
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
