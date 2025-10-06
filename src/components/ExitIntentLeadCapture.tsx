import React, { useState, useEffect } from 'react';
import { X, AlertCircle, TrendingDown, Clock } from 'lucide-react';

interface ExitIntentLeadCaptureProps {
  onClose?: () => void;
}

const ExitIntentLeadCapture: React.FC<ExitIntentLeadCaptureProps> = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    let hasShown = sessionStorage.getItem('exitIntentShown');
    if (hasShown) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasShown) {
        setIsVisible(true);
        sessionStorage.setItem('exitIntentShown', 'true');
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);

    // Alternative: show after 30 seconds if not interacted
    const timer = setTimeout(() => {
      if (!hasShown && !isVisible) {
        setIsVisible(true);
        sessionStorage.setItem('exitIntentShown', 'true');
      }
    }, 30000);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(timer);
    };
  }, [isVisible]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // TODO: Envoyer à Supabase
    console.log('Exit intent lead:', { email, phone });

    setIsSubmitted(true);

    setTimeout(() => {
      handleClose();
    }, 3000);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full m-4 overflow-hidden animate-slideUp">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X size={24} />
        </button>

        {!isSubmitted ? (
          <>
            {/* Header with urgency */}
            <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 text-center">
              <AlertCircle className="mx-auto mb-3 animate-bounce" size={48} />
              <h2 className="text-3xl font-black mb-2">Attendez !</h2>
              <p className="text-xl">Ne partez pas sans votre tarif personnalisé</p>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-3xl font-black text-green-600 mb-1">-35%</div>
                  <div className="text-sm text-gray-600">Économie garantie</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-3xl font-black text-blue-600 mb-1">2 min</div>
                  <div className="text-sm text-gray-600">Devis gratuit</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-xl">
                  <div className="text-3xl font-black text-orange-600 mb-1">10 min</div>
                  <div className="text-sm text-gray-600">Attestation</div>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-xl mb-6">
                <div className="flex items-center">
                  <TrendingDown className="text-yellow-600 mr-3 flex-shrink-0" size={32} />
                  <div>
                    <div className="font-bold text-yellow-900">Offre Spéciale : -100€ supplémentaires</div>
                    <div className="text-sm text-gray-700">Pour les 50 prochaines souscriptions aujourd'hui</div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="votre@email.com"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none text-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="06 12 34 56 78"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none text-lg"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg"
                >
                  Recevoir Mon Tarif Préférentiel →
                </button>

                <p className="text-xs text-center text-gray-600">
                  Aucun engagement • Sans frais cachés • Désinscription possible
                </p>
              </form>

              <div className="mt-6 flex items-center justify-center text-sm text-gray-600">
                <Clock size={16} className="mr-2" />
                <span>Offre valable uniquement aujourd'hui</span>
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
