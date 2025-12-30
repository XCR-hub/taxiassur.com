import React, { useState, useEffect } from 'react';
import { X, AlertCircle, TrendingDown, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ExitIntentLeadCaptureProps {
  onClose?: () => void;
}

const ExitIntentLeadCapture: React.FC<ExitIntentLeadCaptureProps> = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let hasShown = sessionStorage.getItem('exitIntentShown');
    if (hasShown) return;

    const sessionId = sessionStorage.getItem('session_id') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('session_id', sessionId);

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasShown) {
        setIsVisible(true);
        sessionStorage.setItem('exitIntentShown', 'true');

        supabase.from('conversion_popups_tracking').insert({
          popup_type: 'exit_intent',
          action: 'shown',
          session_id: sessionId,
          page_url: window.location.href
        }).then();
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);

    const timer = setTimeout(() => {
      if (!hasShown && !isVisible) {
        setIsVisible(true);
        sessionStorage.setItem('exitIntentShown', 'true');

        supabase.from('conversion_popups_tracking').insert({
          popup_type: 'timer_30s',
          action: 'shown',
          session_id: sessionId,
          page_url: window.location.href
        }).then();
      }
    }, 30000);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(timer);
    };
  }, [isVisible]);

  const handleClose = () => {
    const sessionId = sessionStorage.getItem('session_id') || '';

    supabase.from('conversion_popups_tracking').insert({
      popup_type: 'exit_intent',
      action: 'closed',
      session_id: sessionId,
      page_url: window.location.href
    }).then();

    setIsVisible(false);
    onClose?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const sessionId = sessionStorage.getItem('session_id') || '';

      const { error } = await supabase.from('exit_intent_leads').insert({
        email,
        phone,
        session_id: sessionId,
        source_page: window.location.href,
        user_agent: navigator.userAgent
      });

      if (error) {
        console.error('Error saving exit intent lead:', error);
      } else {
        await supabase.from('conversion_popups_tracking').insert({
          popup_type: 'exit_intent',
          action: 'converted',
          session_id: sessionId,
          page_url: window.location.href,
          converted_email: email
        });

        await supabase.from('leads').insert({
          email,
          phone,
          name: 'Exit Intent Lead',
          city: 'Non renseignée',
          status: 'prospect',
          source: 'exit_intent'
        });
      }

      setIsSubmitted(true);

      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn" onClick={handleClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full m-4 overflow-hidden animate-slideUp max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Close button - ALWAYS VISIBLE */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-white hover:text-gray-200 z-[100] bg-black/30 hover:bg-black/50 rounded-full p-2 shadow-2xl transition-all"
          aria-label="Fermer"
          title="Fermer"
        >
          <X size={28} strokeWidth={3} />
        </button>

        {!isSubmitted ? (
          <>
            {/* Header with urgency */}
            <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-4 text-center relative">
              <AlertCircle className="mx-auto mb-2 animate-bounce" size={40} />
              <h2 className="text-2xl font-black mb-1">Attendez !</h2>
              <p className="text-base">Ne partez pas sans votre tarif personnalisé</p>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-black text-green-600 mb-1">-35%</div>
                  <div className="text-xs text-gray-600">Économie</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-black text-yellow-600 mb-1">2 min</div>
                  <div className="text-xs text-gray-600">Devis gratuit</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-black text-orange-600 mb-1">10 min</div>
                  <div className="text-xs text-gray-600">Attestation</div>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded-r-lg mb-4">
                <div className="flex items-center">
                  <TrendingDown className="text-yellow-600 mr-2 flex-shrink-0" size={24} />
                  <div>
                    <div className="font-bold text-yellow-900 text-sm">Offre : -100€ supplémentaires</div>
                    <div className="text-xs text-gray-700">50 prochaines souscriptions</div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="votre@email.com"
                    className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:border-yellow-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="06 12 34 56 78"
                    className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:border-yellow-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Envoi en cours...' : 'Recevoir Mon Tarif Préférentiel →'}
                </button>

                <p className="text-xs text-center text-gray-600">
                  Aucun engagement • Sans frais cachés • Désinscription possible
                </p>
              </form>

              <div className="mt-4 flex items-center justify-center text-xs text-gray-600">
                <Clock size={14} className="mr-1" />
                <span>Offre valable uniquement aujourd'hui</span>
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={handleClose}
                  className="text-sm text-gray-600 hover:text-orange-600 underline"
                >
                  Non merci, retourner au site
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-black mb-3">Merci !</h3>
            <p className="text-gray-700 mb-4">
              Votre tarif personnalisé arrive dans votre boîte mail dans 2 minutes.
            </p>
            <p className="text-sm text-gray-600">
              Vérifiez aussi vos spams si vous ne voyez rien.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ExitIntentLeadCapture;
