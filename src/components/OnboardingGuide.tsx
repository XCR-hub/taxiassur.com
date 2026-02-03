import { useState, useEffect } from 'react';
import { X, Lightbulb, ArrowRight, Check } from 'lucide-react';

interface GuideStep {
  title: string;
  description: string;
  icon?: React.ElementType;
}

interface OnboardingGuideProps {
  storageKey: string;
  title: string;
  steps: GuideStep[];
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export default function OnboardingGuide({ storageKey, title, steps, primaryAction }: OnboardingGuideProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(`onboarding_dismissed_${storageKey}`);
    if (!dismissed) {
      setIsVisible(true);
    } else {
      setIsDismissed(true);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(`onboarding_dismissed_${storageKey}`, 'true');
    setIsVisible(false);
    setIsDismissed(true);
  };

  const handleShowAgain = () => {
    setIsVisible(true);
    setIsDismissed(false);
  };

  if (!isVisible && isDismissed) {
    return (
      <button
        onClick={handleShowAgain}
        className="fixed bottom-6 right-6 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all z-50 group"
        title="Afficher le guide"
      >
        <Lightbulb className="w-5 h-5" />
        <span className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Besoin d'aide ?
        </span>
      </button>
    );
  }

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 relative">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Lightbulb className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{title}</h2>
              <p className="text-blue-100 mt-1">Guide de démarrage rapide</p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="p-6 overflow-y-auto max-h-96">
          <div className="space-y-4">
            {steps.map((step, index) => {
              const Icon = step.icon || Check;
              return (
                <div
                  key={index}
                  className="flex gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {step.icon && <Icon className="w-5 h-5 text-blue-600" />}
                      <h3 className="font-semibold text-gray-900">{step.title}</h3>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Ne plus afficher
          </button>
          {primaryAction && (
            <button
              onClick={() => {
                primaryAction.onClick();
                handleDismiss();
              }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              {primaryAction.label}
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
