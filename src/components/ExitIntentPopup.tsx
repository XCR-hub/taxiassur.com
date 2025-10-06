import React, { useState, useEffect } from 'react';
import { X, Gift, Clock, CheckCircle, Phone } from 'lucide-react';
import { ConversionTracker } from '../lib/conversion';

interface ExitIntentPopupProps {
  isVisible: boolean;
  onClose: () => void;
  onConvert: () => void;
}

const ExitIntentPopup: React.FC<ExitIntentPopupProps> = ({ isVisible, onClose, onConvert }) => {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [currentOffer, setCurrentOffer] = useState(0);

  const offers = [
    {
      icon: Gift,
      title: "Offre Spéciale Limitée",
      subtitle: "Économisez 35% sur votre première année",
      description: "Devis gratuit + Réduction exclusive pour les 50 prochains clients",
      cta: "Réclamer Mon Offre",
      urgency: "Plus que 5 minutes !"
    },
    {
      icon: Phone,
      title: "Rappel Immédiat Gratuit",
      subtitle: "Votre expert vous rappelle en 2 minutes",
      description: "Analyse personnalisée de vos besoins + Devis sur-mesure",
      cta: "Demander un Rappel",
      urgency: "Service express disponible"
    }
  ];

  useEffect(() => {
    if (!isVisible) return;

    ConversionTracker.track('exit_intent_shown', { offer: currentOffer });

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Rotate offers every 10 seconds
    const offerRotation = setInterval(() => {
      setCurrentOffer(prev => (prev + 1) % offers.length);
    }, 10000);

    return () => {
      clearInterval(timer);
      clearInterval(offerRotation);
    };
  }, [isVisible, currentOffer]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConvert = () => {
    ConversionTracker.track('exit_intent_convert', { 
      offer: currentOffer,
      timeRemaining: timeLeft 
    });
    onConvert();
  };

  const handleClose = () => {
    ConversionTracker.track('exit_intent_dismiss', { 
      offer: currentOffer,
      timeRemaining: timeLeft 
    });
    onClose();
  };

  if (!isVisible) return null;

  const offer = offers[currentOffer];
  const IconComponent = offer.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl transform animate-bounce">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-red-500 to-pink-500 text-white p-6 rounded-t-2xl">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-4">
              <IconComponent size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">{offer.title}</h3>
            <p className="text-red-100">{offer.subtitle}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-700 mb-4">{offer.description}</p>
            
            {/* Countdown */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center space-x-2 text-red-600">
                <Clock size={20} />
                <span className="font-bold text-lg">{formatTime(timeLeft)}</span>
              </div>
              <p className="text-sm text-red-500 mt-1">{offer.urgency}</p>
            </div>

            {/* Benefits */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <CheckCircle className="text-green-500" size={16} />
                <span>Devis 100% gratuit et sans engagement</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <CheckCircle className="text-green-500" size={16} />
                <span>Réponse garantie sous 15 minutes</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <CheckCircle className="text-green-500" size={16} />
                <span>Tarifs négociés exclusifs</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleConvert}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              {offer.cta}
            </button>
            
            <button
              onClick={handleClose}
              className="w-full text-gray-600 hover:text-gray-700 text-sm transition-colors"
            >
              Non merci, je préfère payer plus cher
            </button>
          </div>

          {/* Social proof */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-600">
              Rejoint par 100+ chauffeurs satisfaits • Note 4.9/5
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExitIntentPopup;