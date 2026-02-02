import { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info, AlertCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextualTooltipProps {
  content: string;
  type?: 'info' | 'help' | 'warning' | 'tip';
  position?: 'top' | 'bottom' | 'left' | 'right';
  children?: React.ReactNode;
  maxWidth?: string;
  showIcon?: boolean;
}

export default function ContextualTooltip({
  content,
  type = 'info',
  position = 'top',
  children,
  maxWidth = '300px',
  showIcon = true
}: ContextualTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const icons = {
    info: Info,
    help: HelpCircle,
    warning: AlertCircle,
    tip: Lightbulb
  };

  const colors = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    help: 'bg-purple-50 border-purple-200 text-purple-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    tip: 'bg-green-50 border-green-200 text-green-900'
  };

  const iconColors = {
    info: 'text-blue-600',
    help: 'text-purple-600',
    warning: 'text-amber-600',
    tip: 'text-green-600'
  };

  const Icon = icons[type];

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - 8;
          left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'bottom':
          top = triggerRect.bottom + 8;
          left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'left':
          top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
          left = triggerRect.left - tooltipRect.width - 8;
          break;
        case 'right':
          top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
          left = triggerRect.right + 8;
          break;
      }

      left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
      top = Math.max(8, Math.min(top, window.innerHeight - tooltipRect.height - 8));

      setTooltipPosition({ top, left });
    }
  }, [isVisible, position]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-flex items-center"
      >
        {children || (
          <button
            type="button"
            className={cn(
              'p-1 rounded-full hover:bg-gray-100 transition-colors',
              iconColors[type]
            )}
          >
            <Icon className="w-4 h-4" />
          </button>
        )}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            maxWidth,
            zIndex: 9999
          }}
          className={cn(
            'px-3 py-2 rounded-lg border shadow-lg animate-in fade-in zoom-in-95 duration-200',
            colors[type]
          )}
        >
          <div className="flex gap-2">
            {showIcon && <Icon className={cn('w-4 h-4 flex-shrink-0 mt-0.5', iconColors[type])} />}
            <p className="text-sm leading-relaxed">{content}</p>
          </div>
        </div>
      )}
    </>
  );
}
