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
    <div className="fixed bottom-6 right-6 z-40 max-w-sm animate-slide-in-right">
      <div className="bg-white rounded-xl shadow-2xl border-2 border-orange-200 overflow-hidden">
        {/* Header compact */}
        <div className={`relative ${themeColors.header} text-white px-4 py-3`}>
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 text-white hover:text-gray-200 transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-white bg-opacity-20 rounded-lg">
              <IconComponent size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold">{config.content.title}</h3>
              <p className="text-xs text-white text-opacity-90">{config.content.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Content compact */}
        <div className="p-4">
          <p className="text-sm text-gray-700 mb-3">{config.content.description}</p>

          {/* Actions compactes */}
          <div className="space-y-2">
            <button
              onClick={handleClick}
              className={`w-full ${themeColors.button} text-white text-sm font-bold py-2.5 px-4 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg`}
            >
              {config.content.ctaText}
            </button>

            <button
              onClick={handleClose}
              className="w-full text-gray-500 hover:text-gray-700 text-xs transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicPopup;