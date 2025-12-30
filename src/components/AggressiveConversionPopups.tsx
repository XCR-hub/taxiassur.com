import React, { useState, useEffect } from 'react';
import { X, Zap, TrendingDown, Clock, Award, PhoneCall, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AggressiveConversionPopupsProps {
  onClose?: () => void;
}

const AggressiveConversionPopups: React.FC<AggressiveConversionPopupsProps> = ({ onClose }) => {
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const sessionId = sessionStorage.getItem('session_id') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('session_id', sessionId);

    const shown = {
      scroll: sessionStorage.getItem('popup_scroll_shown'),
      timer: sessionStorage.getItem('popup_timer_shown'),
      inactivity: sessionStorage.getItem('popup_inactivity_shown')
    };

    let scrollTimer: NodeJS.Timeout;
    let inactivityTimer: NodeJS.Timeout;
    let lastActivity = Date.now();

    const handleScroll = () => {
      lastActivity = Date.now();

      const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;

      if (scrollPercentage > 50 && !shown.scroll && !activePopup) {
        setActivePopup('scroll');
        sessionStorage.setItem('popup_scroll_shown', 'true');

        supabase.from('conversion_popups_tracking').insert({
          popup_type: 'scroll_50',
          action: 'shown',
          session_id: sessionId,
          page_url: window.location.href
        }).then();
      }
    };

    const checkInactivity = () => {
      const inactive = Date.now() - lastActivity;

      if (inactive > 15000 && !shown.inactivity && !activePopup) {
        setActivePopup('inactivity');
        sessionStorage.setItem('popup_inactivity_shown', 'true');

        supabase.from('conversion_popups_tracking').insert({
          popup_type: 'inactivity_15s',
          action: 'shown',
          session_id: sessionId,
          page_url: window.location.href
        }).then();
      }
    };

    scrollTimer = setTimeout(() => {
      if (!shown.timer && !activePopup) {
        setActivePopup('timer');
        sessionStorage.setItem('popup_timer_shown', 'true');

        supabase.from('conversion_popups_tracking').insert({
          popup_type: 'timer_10s',
          action: 'shown',
          session_id: sessionId,
          page_url: window.location.href
        }).then();
      }
    }, 10000);

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', () => { lastActivity = Date.now(); });
    window.addEventListener('keypress', () => { lastActivity = Date.now(); });

    inactivityTimer = setInterval(checkInactivity, 3000);

    return () => {
      clearTimeout(scrollTimer);
      clearInterval(inactivityTimer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activePopup]);

  const handleClose = () => {
    const sessionId = sessionStorage.getItem('session_id') || '';

    supabase.from('conversion_popups_tracking').insert({
      popup_type: activePopup || 'unknown',
      action: 'closed',
      session_id: sessionId,
      page_url: window.location.href
    }).then();

    setActivePopup(null);
    onClose?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const sessionId = sessionStorage.getItem('session_id') || '';

      await supabase.from('exit_intent_leads').insert({
        email,
        phone,
        session_id: sessionId,
        source_page: window.location.href,
        user_agent: navigator.userAgent
      });

      await supabase.from('conversion_popups_tracking').insert({
        popup_type: activePopup || 'unknown',
        action: 'converted',
        session_id: sessionId,
        page_url: window.location.href,
        converted_email: email
      });

      await supabase.from('leads').insert({
        email,
        phone,
        name: `${activePopup?.toUpperCase()} Lead`,
        city: 'Non renseignée',
        status: 'prospect',
        source: `popup_${activePopup}`
      });

      setIsSubmitted(true);

      setTimeout(() => {
        handleClose();
      }, 2500);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (!activePopup) return null;

  const popupConfig = {
    scroll: {
      icon: Zap,
      title: 'Vous êtes intéressé ?',
      subtitle: 'Recevez IMMÉDIATEMENT votre tarif personnalisé',
      color: 'from-yellow-600 to-orange-600',
      benefit: '-200€ de remise instantanée'
    },
    timer: {
      icon: TrendingDown,
      title: 'PROMO FLASH !',
      subtitle: 'Encore 10 minutes pour profiter de -35%',
      color: 'from-red-600 to-pink-600',
      benefit: 'Économisez jusqu\'à 580€/an'
    },
    inactivity: {
      icon: MessageSquare,
      title: 'Besoin d\'aide ?',
      subtitle: 'Un expert vous rappelle en 2 minutes',
      color: 'from-blue-600 to-indigo-600',
      benefit: 'Conseils gratuits par téléphone'
    }
  };

  const config = popupConfig[activePopup as keyof typeof popupConfig] || popupConfig.timer;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full m-4 animate-slideUp">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 z-10 bg-white/90 rounded-full p-1.5 shadow-lg"
        >
          <X size={24} />
        </button>

        {!isSubmitted ? (
          <>
            <div className={`bg-gradient-to-r ${config.color} text-white p-6 text-center rounded-t-2xl`}>
              <Icon className="mx-auto mb-3 animate-pulse" size={48} />
              <h2 className="text-2xl font-black mb-2">{config.title}</h2>
              <p className="text-sm opacity-90">{config.subtitle}</p>
            </div>

            <div className="p-6">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg mb-6">
                <div className="flex items-center">
                  <Award className="text-green-600 mr-3" size={28} />
                  <div>
                    <div className="font-black text-green-900">{config.benefit}</div>
                    <div className="text-xs text-gray-700">Offre limitée aux 20 prochains</div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Votre email professionnel"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-yellow-500 focus:outline-none"
                />

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="Votre téléphone (pour le rappel)"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-yellow-500 focus:outline-none"
                />

                <button
                  type="submit"
                  className={`w-full bg-gradient-to-r ${config.color} hover:opacity-90 text-white font-black py-4 px-6 rounded-lg transition-all text-lg shadow-lg`}
                >
                  {activePopup === 'inactivity' ? (
                    <span className="flex items-center justify-center">
                      <PhoneCall className="mr-2" size={20} />
                      Me faire rappeler MAINTENANT
                    </span>
                  ) : (
                    'Recevoir Mon Tarif IMMÉDIATEMENT →'
                  )}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-center text-xs text-gray-600">
                <Clock size={14} className="mr-1" />
                <span className="font-semibold">Cette offre expire dans 24h</span>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <div className="bg-green-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
              <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-black mb-2">Parfait !</h3>
            <p className="text-gray-700">Votre expert vous contacte dans 2 minutes.</p>
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
            transform: translateY(40px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
};

export default AggressiveConversionPopups;
