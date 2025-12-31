import { useState, useEffect } from 'react';
import { X, MessageCircle, Phone, Mail, ChevronRight } from 'lucide-react';

export default function SubtleConversionHelper() {
  const [showHelper, setShowHelper] = useState(false);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const shown = sessionStorage.getItem('helper_shown');
    const interacted = sessionStorage.getItem('helper_interacted');

    if (interacted) {
      setHasInteracted(true);
      return;
    }

    if (!shown) {
      const timer = setTimeout(() => {
        setShowHelper(true);
        sessionStorage.setItem('helper_shown', 'true');
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (hasInteracted) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !showExitIntent) {
        setShowExitIntent(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [showExitIntent, hasInteracted]);

  const handleAction = (action: string) => {
    setHasInteracted(true);
    sessionStorage.setItem('helper_interacted', 'true');

    if (action === 'form') {
      const formElement = document.getElementById('devis');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          const nameInput = document.getElementById('name') as HTMLInputElement;
          if (nameInput) nameInput.focus();
        }, 800);
      }
    } else if (action === 'phone') {
      window.location.href = 'tel:0180855786';
    }

    setShowHelper(false);
    setShowExitIntent(false);
  };

  const handleDismiss = () => {
    setShowHelper(false);
    setShowExitIntent(false);
  };

  if (hasInteracted) return null;

  return (
    <>
      {showHelper && (
        <div className="fixed bottom-6 right-6 z-40 animate-slide-in-right">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-black" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Besoin d'aide ?</div>
                  <div className="text-xs text-gray-500">Nous sommes là pour vous</div>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Obtenez votre devis personnalisé ou discutez avec un expert.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => handleAction('form')}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold py-2.5 px-4 rounded-lg transition-all text-sm flex items-center justify-center gap-2"
              >
                Devis gratuit
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => handleAction('phone')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-lg transition-all"
              >
                <Phone size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showExitIntent && !showHelper && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Vous partez déjà ?
                    </h3>
                    <p className="text-sm text-gray-600">
                      Nous pouvons vous aider
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-5">
                <p className="text-gray-700 mb-4">
                  Laissez-nous vous accompagner dans votre recherche d'assurance taxi.
                  Devis gratuit en 2 minutes.
                </p>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span>Comparaison des meilleures offres</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span>Conseils d'experts disponibles</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span>Sans engagement</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleAction('form')}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  Obtenir mon devis gratuit
                  <ChevronRight size={18} />
                </button>

                <button
                  onClick={() => handleAction('phone')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Phone size={18} />
                  Être rappelé
                </button>

                <button
                  onClick={handleDismiss}
                  className="w-full text-gray-500 hover:text-gray-700 text-sm py-2 transition-colors"
                >
                  Continuer ma navigation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </>
  );
}
