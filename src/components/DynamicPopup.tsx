import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Phone, Mail, Gift, Clock } from 'lucide-react';
import { PopupConfig, PopupManager } from '../lib/popup';
import { ConversionTracker } from '../lib/conversion';

interface DynamicPopupProps {
  config: PopupConfig;
  isVisible: boolean;
  onClose: () => void;
  onConvert: () => void;
}

const DynamicPopup: React.FC<DynamicPopupProps> = ({ 
  config, 
  isVisible, 
  onClose, 
  onConvert 
}) => {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes par défaut

  useEffect(() => {
    if (!isVisible) return;

    PopupManager.trackEvent(config.id, 'view');

    // Countdown timer si urgence
    if (config.content.urgencyText?.includes('minute')) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isVisible, config.id]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConvert = () => {
    PopupManager.trackEvent(config.id, 'convert');

    switch (config.content.ctaAction) {
      case 'form':
        const formElement = document.getElementById('devis');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth' });
        }
        onClose();
        break;
      case 'phone':
        window.open(`tel:${config.content.ctaValue || '0180855786'}`);
        onClose();
        break;
      case 'email':
        window.open(`mailto:${config.content.ctaValue || 'team@taxiassur.com'}`);
        onClose();
        break;
      case 'url':
        if (config.content.ctaValue) {
          window.open(config.content.ctaValue, '_blank');
        }
        onClose();
        break;
    }
    
    onConvert();
  };

  const handleClose = () => {
    PopupManager.trackEvent(config.id, 'close');
    onClose();
  };

  const handleClick = () => {
    PopupManager.trackEvent(config.id, 'click');
    handleConvert();
  };

  if (!isVisible) return null;

  const getThemeColors = () => {
    switch (config.design.theme) {
      case 'urgent':
        return {
          header: 'bg-gradient-to-r from-red-500 to-pink-500',
          button: 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600',
          accent: 'text-red-600'
        };
      case 'premium':
        return {
          header: 'bg-gradient-to-r from-amber-500 to-yellow-500',
          button: 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600',
          accent: 'text-amber-600'
        };
      case 'minimal':
        return {
          header: 'bg-gradient-to-r from-gray-700 to-gray-800',
          button: 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900',
          accent: 'text-gray-600'
        };
      default:
        return {
          header: 'bg-gradient-to-r from-yellow-400 to-yellow-500',
          button: 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600',
          accent: 'text-yellow-600'
        };
    }
  };

  const getAnimationClass = () => {
    switch (config.design.animation) {
      case 'bounce': return 'animate-bounce';
      case 'fade': return 'animate-fade-in-up';
      case 'slide': return 'animate-slide-in-right';
      case 'zoom': return 'animate-zoom-in';
      default: return '';
    }
  };

  const getSizeClass = () => {
    switch (config.design.size) {
      case 'sm': return 'max-w-sm';
      case 'lg': return 'max-w-2xl';
      default: return 'max-w-md';
    }
  };

  const themeColors = getThemeColors();
  const IconComponent = config.content.ctaAction === 'phone' ? Phone : 
                      config.content.ctaAction === 'email' ? Mail : Gift;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl ${getSizeClass()} w-full shadow-2xl transform ${getAnimationClass()}`}>
        {/* Header */}
        <div className={`relative ${themeColors.header} text-white p-6 rounded-t-2xl`}>
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
            <h3 className="text-xl font-bold mb-2">{config.content.title}</h3>
            <p className="text-white text-opacity-90">{config.content.subtitle}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-700 mb-4">{config.content.description}</p>
            
            {/* Countdown si urgence */}
            {config.content.urgencyText && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center space-x-2 text-red-600">
                  <Clock size={20} />
                  {config.content.urgencyText.includes('minute') ? (
                    <span className="font-bold text-lg">{formatTime(timeLeft)}</span>
                  ) : (
                    <span className="font-bold">{config.content.urgencyText}</span>
                  )}
                </div>
              </div>
            )}

            {/* Benefits */}
            {config.content.benefits.length > 0 && (
              <div className="space-y-2 mb-6">
                {config.content.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-gray-700">
                    <CheckCircle className="text-green-500" size={16} />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleClick}
              className={`w-full ${themeColors.button} text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg`}
            >
              {config.content.ctaText}
            </button>
            
            <button
              onClick={handleClose}
              className="w-full text-gray-600 hover:text-orange-600 text-sm transition-colors"
            >
              Non merci, je préfère payer plus cher
            </button>
          </div>

          {/* Social proof */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-600">
              Rejoint par 100+ chauffeurs satisfaits • Objectif excellence
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicPopup;