import React, { useState } from 'react';
import { X, Send, Mail, Sparkles, FileText, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface EmailComposerProps {
  contact: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  onClose: () => void;
  onSent?: () => void;
}

const EmailComposer: React.FC<EmailComposerProps> = ({ contact, onClose, onSent }) => {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const TEMPLATES = [
    {
      id: 'welcome',
      name: 'Bienvenue',
      subject: 'Bienvenue chez TaxiAssur',
      content: `Bonjour ${contact.first_name || ''} ${contact.last_name || ''},\n\nNous sommes ravis de vous accueillir chez TaxiAssur.\n\nNotre équipe est à votre disposition pour vous accompagner dans votre projet d'assurance taxi.\n\nCordialement,\nL'équipe TaxiAssur`
    },
    {
      id: 'followup',
      name: 'Relance',
      subject: 'Votre projet d\'assurance taxi',
      content: `Bonjour ${contact.first_name || ''} ${contact.last_name || ''},\n\nJe me permets de revenir vers vous concernant votre projet d'assurance taxi.\n\nAvez-vous eu l'occasion de consulter notre offre ?\n\nJe reste à votre disposition pour toute question.\n\nCordialement,\nL'équipe TaxiAssur`
    },
    {
      id: 'quote',
      name: 'Envoi devis',
      subject: 'Votre devis d\'assurance taxi',
      content: `Bonjour ${contact.first_name || ''} ${contact.last_name || ''},\n\nComme convenu, vous trouverez ci-joint votre devis personnalisé pour votre assurance taxi.\n\nN'hésitez pas si vous avez des questions.\n\nCordialement,\nL'équipe TaxiAssur`
    },
    {
      id: 'documents',
      name: 'Demande de documents',
      subject: 'Documents nécessaires pour votre dossier',
      content: `Bonjour ${contact.first_name || ''} ${contact.last_name || ''},\n\nPour finaliser votre dossier, nous aurions besoin des documents suivants :\n\n- Copie de votre permis de conduire\n- Carte grise du véhicule\n- Justificatif de domicile\n\nVous pouvez les envoyer directement via votre espace client.\n\nCordialement,\nL'équipe TaxiAssur`
    }
  ];

  const handleTemplateSelect = (template: typeof TEMPLATES[0]) => {
    setSubject(template.subject);
    setContent(template.content);
  };

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      setError('Veuillez remplir le sujet et le contenu');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error: sendError } = await supabase.functions.invoke('ia-auto-executor', {
        body: {
          action: 'send_email',
          data: {
            lead_id: contact.id,
            to: contact.email,
            to_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email,
            subject: subject,
            html_content: content.replace(/\n/g, '<br>')
          }
        }
      });

      if (sendError) throw sendError;

      await supabase.from('crm_interactions').insert({
        lead_id: contact.id,
        type: 'email',
        direction: 'outbound',
        subject: subject,
        content: content,
        to_email: contact.email,
        from_email: 'contact@taxiassur.com',
        created_by: user?.id
      });

      setSent(true);
      setTimeout(() => {
        onSent?.();
        onClose();
      }, 1500);

    } catch (err) {
      logger.error('Erreur envoi email:', err);
      setError('Erreur lors de l\'envoi de l\'email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-purple-500/30 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-slate-900 via-purple-900/20 to-slate-900 border-b border-purple-500/30 p-6 flex items-center justify-between backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Envoyer un email</h2>
              <p className="text-purple-300 text-sm">
                À : {contact.first_name} {contact.last_name} ({contact.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors hover:bg-slate-800 p-2 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {sent ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Email envoyé !</h3>
              <p className="text-gray-400">L'email a été envoyé avec succès</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  Templates
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {TEMPLATES.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-4 text-left hover:border-purple-500/40 hover:bg-slate-800/70 transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
                        <span className="font-medium text-white">{template.name}</span>
                      </div>
                      <p className="text-sm text-gray-400 truncate">{template.subject}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">
                    Sujet
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                    placeholder="Objet de l'email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">
                    Message
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={12}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all resize-none"
                    placeholder="Contenu de l'email"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  disabled={sending}
                  className="px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !subject.trim() || !content.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-purple-500/30"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Envoyer
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailComposer;
