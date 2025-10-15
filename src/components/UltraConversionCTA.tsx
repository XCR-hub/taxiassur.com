import React, { useState, useEffect } from 'react';
import { Phone, Clock, TrendingUp, Shield, CheckCircle, ArrowRight, Zap } from 'lucide-react';

interface UltraConversionCTAProps {
  variant?: 'primary' | 'urgency' | 'trust' | 'value';
  position?: 'hero' | 'inline' | 'sticky' | 'exit';
  city?: string;
  onCTAClick?: () => void;
}

const UltraConversionCTA: React.FC<UltraConversionCTAProps> = ({
  variant = 'primary',
  position = 'inline',
  city,
  onCTAClick
}) => {
  const [isVisible, setIsVisible] = useState(position !== 'exit');
  const [urgencyTimer, setUrgencyTimer] = useState(15);

  useEffect(() => {
    if (variant === 'urgency') {
      const interval = setInterval(() => {
        setUrgencyTimer(prev => (prev > 0 ? prev - 1 : 15));
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [variant]);

  useEffect(() => {
    if (position === 'exit') {
      const handleMouseLeave = (e: MouseEvent) => {
        if (e.clientY < 10) {
          setIsVisible(true);
        }
      };
      document.addEventListener('mouseleave', handleMouseLeave);
      return () => document.removeEventListener('mouseleave', handleMouseLeave);
    }
  }, [position]);

  const handleClick = () => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'cta_click', {
        variant,
        position,
        city: city || 'unknown'
      });
    }
    onCTAClick?.();
  };

  if (!isVisible) return null;

  if (variant === 'urgency') {
    return (
      <div className={`${position === 'sticky' ? 'fixed bottom-0 left-0 right-0 z-50' : ''} bg-gradient-to-r from-red-600 via-orange-600 to-red-600 shadow-2xl`}>
        <div className="container-max py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-white">
              <Zap className="w-6 h-6 animate-pulse" />
              <div>
                <p className="font-bold text-lg">
                  Offre Limitée {city ? `à ${city}` : ''} !
                </p>
                <p className="text-sm text-orange-100">
                  {urgencyTimer} personnes consultent cette page • Réponse sous 15min
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <a
                href="#devis"
                onClick={handleClick}
                className="btn-primary bg-white text-red-600 hover:bg-gray-100 shadow-lg transform hover:scale-105 transition-all"
              >
                <Zap className="w-5 h-5" />
                Je profite de l'offre maintenant
              </a>
              <a
                href="tel:0180855786"
                className="btn-outline border-white text-white hover:bg-white/10"
              >
                <Phone className="w-5 h-5" />
                01 80 85 57 86
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'trust') {
    return (
      <div className="ai-card p-8 bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-500/30">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-8 h-8 text-green-400" />
              <h3 className="text-2xl font-bold text-white">
                100+ chauffeurs nous font déjà confiance
              </h3>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span>Économie moyenne de 35% sur votre prime</span>
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span>Réponse garantie sous 15 minutes</span>
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span>Objectif satisfaction : excellence de service</span>
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span>Courtier agrégé ORIAS n°20008210</span>
              </li>
            </ul>
            <div className="flex gap-3">
              <a
                href="#devis"
                onClick={handleClick}
                className="btn-primary bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600"
              >
                <TrendingUp className="w-5 h-5" />
                Devis Gratuit en 2min
              </a>
              <a
                href="tel:0180855786"
                className="btn-outline border-green-400 text-green-400 hover:bg-green-400/10"
              >
                <Phone className="w-5 h-5" />
                Appel Direct
              </a>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="bg-gray-800/50 rounded-lg p-6 border border-green-500/30">
              <p className="text-green-400 text-sm font-semibold mb-2">TÉMOIGNAGE</p>
              <p className="text-white text-lg mb-4">
                "J'ai économisé 580€ dès la première année avec TaxiAssur. Service rapide et pro !"
              </p>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-400 rounded-full flex items-center justify-center text-white font-bold">
                  AK
                </div>
                <div>
                  <p className="text-white font-semibold">Ahmed K.</p>
                  <p className="text-gray-400 text-sm">Taxi Paris 16ème</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'value') {
    return (
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-xl p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-white">
            <h3 className="text-3xl font-bold mb-2">
              Économisez jusqu'à 35% sur votre assurance taxi
            </h3>
            <p className="text-lg text-orange-100 mb-4">
              Comparez gratuitement les meilleurs tarifs du marché en 2 minutes
            </p>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>Devis en 2min</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span>Sans engagement</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>100% Gratuit</span>
              </div>
            </div>
          </div>
          <a
            href="#devis"
            onClick={handleClick}
            className="btn-primary bg-white text-orange-600 hover:bg-gray-100 text-lg px-8 py-4 shadow-xl transform hover:scale-105 transition-all whitespace-nowrap"
          >
            <ArrowRight className="w-6 h-6" />
            Je Compare Maintenant
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`${position === 'hero' ? 'text-center' : 'flex flex-col sm:flex-row gap-4 justify-center'}`}>
      <a
        href="#devis"
        onClick={handleClick}
        className="btn-primary text-lg px-8 py-4 shadow-xl transform hover:scale-105 transition-all"
      >
        <CheckCircle className="w-6 h-6" />
        Devis Gratuit en 2min {city ? `à ${city}` : ''}
      </a>
      <a
        href="tel:0180855786"
        className="btn-outline text-lg px-8 py-4"
      >
        <Phone className="w-6 h-6" />
        Expert Taxi : 01 80 85 57 86
      </a>
    </div>
  );
};

export default UltraConversionCTA;
