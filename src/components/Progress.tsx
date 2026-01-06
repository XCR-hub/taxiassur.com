import { ReactNode } from 'react';

interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  striped?: boolean;
  className?: string;
}

export function Progress({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  animated = false,
  striped = false,
  className = ''
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const variantClasses = {
    default: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-purple-500'
  };

  return (
    <div className={className}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm text-gray-400">{label}</span>}
          {showLabel && <span className="text-sm font-semibold text-white">{percentage.toFixed(0)}%</span>}
        </div>
      )}
      <div className={`w-full bg-gray-800 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`
            ${sizeClasses[size]} ${variantClasses[variant]} rounded-full transition-all duration-500
            ${striped ? 'bg-striped' : ''}
            ${animated ? 'animate-pulse' : ''}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  showLabel?: boolean;
  label?: ReactNode;
  className?: string;
}

export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  variant = 'default',
  showLabel = true,
  label,
  className = ''
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const variantColors = {
    default: 'stroke-blue-500',
    success: 'stroke-green-500',
    warning: 'stroke-yellow-500',
    danger: 'stroke-red-500',
    info: 'stroke-purple-500'
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${variantColors[variant]} transition-all duration-500`}
          strokeLinecap="round"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-2xl font-bold text-white">{percentage.toFixed(0)}%</span>
          {label && <span className="text-sm text-gray-400 mt-1">{label}</span>}
        </div>
      )}
    </div>
  );
}

interface StepperProps {
  steps: Array<{
    label: string;
    description?: string;
    icon?: ReactNode;
  }>;
  currentStep: number;
  orientation?: 'horizontal' | 'vertical';
  onStepClick?: (step: number) => void;
  className?: string;
}

export function Stepper({
  steps,
  currentStep,
  orientation = 'horizontal',
  onStepClick,
  className = ''
}: StepperProps) {
  return (
    <div className={`${orientation === 'vertical' ? 'space-y-4' : 'flex items-center'} ${className}`}>
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const isClickable = onStepClick && (isCompleted || isActive);

        return (
          <div
            key={index}
            className={`
              ${orientation === 'horizontal' ? 'flex items-center flex-1' : 'flex items-start'}
            `}
          >
            <div
              className={`
                ${orientation === 'vertical' ? 'flex flex-col items-center mr-4' : 'flex flex-col items-center'}
              `}
            >
              <button
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all
                  ${isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-blue-500 text-white ring-4 ring-blue-500/20'
                    : 'bg-gray-800 text-gray-500'
                  }
                  ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                `}
              >
                {step.icon || (index + 1)}
              </button>
              <div
                className={`
                  ${orientation === 'horizontal' ? 'mt-2 text-center' : 'mt-2 text-left'}
                `}
              >
                <div
                  className={`
                    text-sm font-semibold
                    ${isActive ? 'text-blue-500' : isCompleted ? 'text-white' : 'text-gray-500'}
                  `}
                >
                  {step.label}
                </div>
                {step.description && (
                  <div className="text-xs text-gray-500 mt-1">{step.description}</div>
                )}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`
                  ${orientation === 'horizontal'
                    ? 'flex-1 h-0.5 mx-4 mb-8'
                    : 'w-0.5 h-12 ml-5'
                  }
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-800'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
