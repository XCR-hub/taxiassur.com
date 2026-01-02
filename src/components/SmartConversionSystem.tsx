import React, { useState, useEffect } from 'react';
import { X, Shield, Award, TrendingUp, Users, Clock, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface SmartConversionSystemProps {
  onClose?: () => void;
}

const SmartConversionSystem: React.FC<SmartConversionSystemProps> = ({ onClose }) => {
  const [activeNotification, setActiveNotification] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [recentLeadsCount, setRecentLeadsCount] = useState(0);

  useEffect(() => {
    loadRecentLeadsCount();
  }, []);

  const loadRecentLeadsCount = async () => {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (data) {
      setRecentLeadsCount(data.length);
    }
  };

  useEffect(() => {
    const sessionId = sessionStorage.getItem('session_id') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('session_id', sessionId);

    const shown = {
      socialProof: sessionStorage.getItem('notification_social_proof'),
      valueReminder: sessionStorage.getItem('notification_value_reminder'),
      exitIntent: sessionStorage.getItem('notification_exit_intent')
    };

    let valueReminderTimer: NodeJS.Timeout;
    let exitIntentBound = false;

    const showSocialProof = () => {
      if (!shown.socialProof && !activeNotification) {
        setActiveNotification('socialProof');
        sessionStorage.setItem('notification_social_proof', 'true');

        supabase.from('conversion_popups_tracking').insert({
          popup_type: 'social_proof_subtle',
          action: 'shown',
          session_id: sessionId,
          page_url: window.location.href
        }).then();

        setTimeout(() => {
          setActiveNotification(null);
        }, 8000);
      }
    };

    const showValueReminder = () => {
      if (!shown.valueReminder && !activeNotification) {
        setActiveNotification('valueReminder');
        sessionStorage.setItem('notification_value_reminder', 'true');

        supabase.from('conversion_popups_tracking').insert({
          popup_type: 'value_reminder',
          action: 'shown',
          session_id: sessionId,
          page_url: window.location.href
        }).then();
      }
    };

    const handleExitIntent = (e: MouseEvent) => {
      if (e.clientY <= 0 && !shown.exitIntent && !activeNotification) {
        setActiveNotification('exitIntent');
        sessionStorage.setItem('notification_exit_intent', 'true');

        supabase.from('conversion_popups_tracking').insert({
          popup_type: 'exit_intent_gentle',
          action: 'shown',
          session_id: sessionId,
          page_url: window.location.href
        }).then();
      }
    };

    setTimeout(showSocialProof, 8000);

    valueReminderTimer = setTimeout(showValueReminder, 45000);

    if (!exitIntentBound) {
      document.addEventListener('mouseleave', handleExitIntent);
      exitIntentBound = true;
    }

    return () => {
      clearTimeout(valueReminderTimer);
      document.removeEventListener('mouseleave', handleExitIntent);
    };
  }, [activeNotification]);

  const handleClose = () => {
    const sessionId = sessionStorage.getItem('session_id') || '';

    supabase.from('conversion_popups_tracking').insert({
      popup_type: activeNotification || 'unknown',
      action: 'closed',
      session_id: sessionId,
      page_url: window.location.href
    }).then();

    setActiveNotification(null);
    onClose?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !phone) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    const sessionId = sessionStorage.getItem('session_id') || '';

    try {
      await Promise.all([
        supabase.from('exit_intent_leads').insert({
          email,
          phone,
          source_page: window.location.href,
          trigger_type: activeNotification || 'notification',
          session_id: sessionId
        }),
        supabase.from('leads').insert({
          email,
          phone,
          source: `notification_${activeNotification}`,
          message: 'Lead capturé via notification intelligente'
        }),
        supabase.from('conversion_popups_tracking').insert({
          popup_type: activeNotification || 'unknown',
          action: 'converted',
          session_id: sessionId,
          page_url: window.location.href
        })
      ]);

      setIsSubmitted(true);

      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (error) {
      logger.error('Error saving lead:', error);
      alert('Une erreur est survenue. Veuillez réessayer.');
    }
  };

  if (activeNotification === 'socialProof') {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
        <div className="bg-white rounded-xl shadow-2xl p-4 max-w-sm border-l-4 border-green-500">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 rounded-full p-2">
                <Users className="text-green-600" size={20} />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">
                  {recentLeadsCount > 0 ? `${recentLeadsCount} chauffeurs` : '12 chauffeurs'} ont demandé un devis aujourd'hui
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Rejoignez des professionnels qui nous font confiance
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeNotification === 'valueReminder' && !isSubmitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <button
              onClick={handleClose}
              className="float-right text-white/80 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center space-x-3 mb-2">
              <Shield className="text-white" size={32} />
              <h3 className="text-2xl font-black">TaxiAssur.com</h3>
            </div>
            <p className="text-blue-100">L'assurance taxi de confiance</p>
          </div>

          <div className="p-6">
            <h4 className="text-xl font-bold text-gray-900 mb-4">
              Protégez votre activité dès aujourd'hui
            </h4>

            <div className="space-y-3 mb-6">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <Award className="text-blue-600" size={16} />
                </div>
                <p className="text-sm text-gray-700">
                  <strong>Devis instantané</strong> en moins de 2 minutes
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-full p-1 mt-0.5">
                  <TrendingUp className="text-green-600" size={16} />
                </div>
                <p className="text-sm text-gray-700">
                  <strong>Économisez jusqu'à 30%</strong> sur votre assurance
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-purple-100 rounded-full p-1 mt-0.5">
                  <Clock className="text-purple-600" size={16} />
                </div>
                <p className="text-sm text-gray-700">
                  <strong>Souscription en ligne</strong> rapide et sécurisée
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre email professionnel"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900"
                required
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Votre téléphone"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900"
                required
              />
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                Recevoir mon devis gratuit
              </button>
            </form>

            <p className="text-xs text-gray-500 text-center mt-4">
              Sans engagement • Réponse rapide • 100% sécurisé
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (activeNotification === 'exitIntent' && !isSubmitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <div className="flex items-center space-x-3 mb-2">
              <Phone className="text-white" size={36} />
              <div>
                <h3 className="text-2xl font-black">Attendez !</h3>
                <p className="text-orange-100">Ne partez pas sans votre devis</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h4 className="text-xl font-bold text-gray-900 mb-3">
              Obtenez une réponse d'expert en 24h
            </h4>

            <p className="text-gray-700 mb-4">
              Nos conseillers spécialisés en assurance taxi analysent votre situation
              et vous proposent <strong>la meilleure offre du marché</strong>.
            </p>

            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6">
              <p className="text-sm text-orange-900 font-bold">
                🎁 Offre exclusive : -15% sur votre première année
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Valable uniquement pour les demandes d'aujourd'hui
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre email"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-gray-900"
                required
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Votre téléphone"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-gray-900"
                required
              />
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                Profiter de l'offre exclusive
              </button>
            </form>

            <button
              onClick={handleClose}
              className="w-full mt-3 text-gray-500 text-sm hover:text-gray-700 transition-colors"
            >
              Non merci, je préfère payer plus cher
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Award className="text-green-600" size={32} />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">
            Merci pour votre confiance !
          </h3>
          <p className="text-gray-700 mb-4">
            Un conseiller vous contactera dans les <strong>prochaines heures</strong>
            pour vous présenter votre devis personnalisé.
          </p>
          <p className="text-sm text-gray-600">
            Vous pouvez également nous joindre au <strong className="text-orange-600">01 80 85 57 86</strong>
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default SmartConversionSystem;
