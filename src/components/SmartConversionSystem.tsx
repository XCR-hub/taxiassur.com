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
      .from('crm_leads')
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
      // Créer le lead avec tous les champs requis
      const { data: newLead, error: leadError } = await supabase
        .from('crm_leads')
        .insert({
          name: email.split('@')[0] || 'Prospect Popup',
          email,
          phone,
          city: 'Paris',
          status: 'nouveau_lead',
          source: `popup_${activeNotification}`,
          notes: `Lead capturé via popup intelligent: ${activeNotification}`
        })
        .select()
        .single();

      if (leadError) {
        console.error('Error creating lead:', leadError);
        throw leadError;
      }

      // Tracker la conversion
      await supabase.from('conversion_popups_tracking').insert({
        popup_type: activeNotification || 'unknown',
        action: 'converted',
        session_id: sessionId,
        page_url: window.location.href
      });

      setIsSubmitted(true);

      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (error) {
      logger.error('Error saving lead:', error);
      alert('Erreur lors de l\'envoi. Veuillez réessayer ou nous appeler au 01 80 85 57 86.');
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
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
            <button
              onClick={handleClose}
              className="float-right text-white/90 hover:text-white transition-colors bg-white/20 hover:bg-white/30 rounded-full p-1"
            >
              <X size={20} />
            </button>
            <div className="flex items-center space-x-3 mb-2">
              <Shield className="text-white drop-shadow-lg" size={32} />
              <h3 className="text-2xl font-black text-white drop-shadow-md">Attendez !</h3>
            </div>
            <p className="text-white drop-shadow-md">Ne partez pas sans votre tarif personnalisé</p>
          </div>

          <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50">
            <h4 className="text-xl font-bold text-gray-900 mb-4">
              Protégez votre activité dès aujourd'hui
            </h4>

            <div className="space-y-3 mb-6 bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-full p-1 mt-0.5 flex-shrink-0">
                  <Award className="text-green-600" size={16} />
                </div>
                <p className="text-sm text-gray-900">
                  <strong className="text-green-700">Devis instantané</strong> en moins de 2 minutes
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-amber-100 rounded-full p-1 mt-0.5 flex-shrink-0">
                  <TrendingUp className="text-amber-600" size={16} />
                </div>
                <p className="text-sm text-gray-900">
                  <strong className="text-amber-700">Économisez -35%</strong> sur votre prime d'assurance
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-orange-100 rounded-full p-1 mt-0.5 flex-shrink-0">
                  <Clock className="text-orange-600" size={16} />
                </div>
                <p className="text-sm text-gray-900">
                  <strong className="text-orange-700">Réponse sous 15min</strong> par nos experts
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre email professionnel"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-gray-900 bg-white placeholder-gray-500"
                required
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Votre téléphone"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-gray-900 bg-white placeholder-gray-500"
                required
              />
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 shadow-xl"
              >
                Recevoir Mon Tarif Préférentiel →
              </button>
            </form>

            <p className="text-xs text-gray-700 text-center mt-4 font-medium">
              ✓ Sans engagement • ✓ Réponse 15min • ✓ Courtier ORIAS
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (activeNotification === 'exitIntent' && !isSubmitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/90 hover:text-white transition-colors bg-white/20 hover:bg-white/30 rounded-full p-1.5"
            >
              <X size={24} />
            </button>
            <div className="flex items-center space-x-3 mb-2">
              <Phone className="text-white drop-shadow-lg" size={36} />
              <div>
                <h3 className="text-3xl font-black text-white drop-shadow-md">Attendez !</h3>
                <p className="text-white drop-shadow-md">Ne partez pas sans votre tarif personnalisé</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-orange-50 to-red-50">
            <h4 className="text-xl font-bold text-gray-900 mb-3">
              Réponse Expert sous 15 Minutes ⚡
            </h4>

            <p className="text-gray-900 mb-4">
              Nos conseillers spécialisés analysent votre dossier et vous proposent
              <strong className="text-orange-600"> les meilleurs tarifs du marché</strong>.
            </p>

            <div className="bg-white border-2 border-orange-400 rounded-lg p-4 mb-6 shadow-md">
              <p className="text-sm text-orange-900 font-bold">
                🎁 Offre Spéciale : Économisez -35% sur votre assurance taxi
              </p>
              <p className="text-xs text-orange-700 mt-1 font-medium">
                Tarifs négociés exclusifs • Réponse immédiate
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre email professionnel"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all text-gray-900 bg-white placeholder-gray-500"
                required
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Votre téléphone"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all text-gray-900 bg-white placeholder-gray-500"
                required
              />
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-black text-lg py-4 px-6 rounded-lg transition-all transform hover:scale-105 shadow-xl"
              >
                🚀 Recevoir Mon Tarif en 15min
              </button>
            </form>

            <button
              onClick={handleClose}
              className="w-full mt-3 text-gray-600 text-sm hover:text-gray-800 font-medium transition-colors"
            >
              Non merci, retourner au site
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
