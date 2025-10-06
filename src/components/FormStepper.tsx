import React from 'react';
import { CheckCircle } from 'lucide-react';

interface FormStepperProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  className?: string;
}

const FormStepper: React.FC<FormStepperProps> = ({
  currentStep,
  totalSteps,
  stepLabels,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isUpcoming = stepNumber > currentStep;

        return (
          <div key={stepNumber} className="flex items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
                ${isCompleted 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' 
                  : isCurrent 
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg animate-pulse' 
                    : 'bg-gray-600 text-gray-600'
                }
              `}>
                {isCompleted ? (
                  <CheckCircle size={16} />
                ) : (
                  <span>{stepNumber}</span>
                )}
              </div>
              
              {/* Step Label */}
              <span className={`
                text-xs mt-1 font-medium transition-colors duration-300
                ${isCurrent ? 'text-amber-400' : isCompleted ? 'text-green-400' : 'text-gray-600'}
              `}>
                {stepLabels[index]}
              </span>
            </div>

            {/* Connector Line */}
            {stepNumber < totalSteps && (
              <div className={`
                w-12 h-1 mx-2 transition-all duration-300 rounded-full
                ${isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-600'}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FormStepper;